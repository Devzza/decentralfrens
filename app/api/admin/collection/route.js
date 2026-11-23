import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { isAuthorized } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ERC-7572 (contractURI) + ERC-721 metadata helpers from ERC721Drop.
// Some helpers (contractMetadata, getBaseURICount) revert on this deployment,
// so every call is isolated and returns null on failure instead of 500ing.
const CONTRACT_ABI = [
  "function contractURI() view returns (string)",
  "function owner() view returns (address)",
  "function relayer() view returns (address)",
  "function maxSupply() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function nextTokenIdToClaim() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function getBaseURICount() view returns (uint256)",
  "function getBaseURIByIndex(uint256 _index) view returns (string)",
];

const GATEWAYS = [
  process.env.PINATA_GATEWAY,
  "https://gateway.pinata.cloud/ipfs/",
  "https://dweb.link/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
].filter(Boolean);

function resolveToGateway(uri, gatewayIndex = 0) {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    const gw = GATEWAYS[Math.min(gatewayIndex, GATEWAYS.length - 1)];
    return gw + uri.slice("ipfs://".length);
  }
  return uri;
}

async function fetchJsonWithFailover(uri) {
  if (!uri) throw new Error("No URI provided.");

  const urls =
    uri.startsWith("ipfs://")
      ? GATEWAYS.map((_, i) => resolveToGateway(uri, i))
      : [uri];

  const errors = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      return { json, source: url };
    } catch (err) {
      errors.push(`${url.split("/ipfs/")[0]}: ${err.message}`);
    }
  }
  throw new Error(`Metadata unreachable. ${errors.join(" | ")}`);
}

async function safe(fn) {
  try {
    const v = await fn();
    return v === undefined ? null : v;
  } catch {
    return null;
  }
}

export async function GET(req) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { RPC_URL, CONTRACT_ADDRESS } = process.env;
    if (!RPC_URL || !CONTRACT_ADDRESS) {
      return NextResponse.json(
        { error: "RPC_URL and CONTRACT_ADDRESS must be configured." },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const network = await provider.getNetwork();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const [
      contractURI,
      name,
      symbol,
      owner,
      relayer,
      maxSupply,
      totalSupply,
      nextTokenId,
    ] = await Promise.all([
      safe(() => contract.contractURI()),
      safe(() => contract.name()),
      safe(() => contract.symbol()),
      safe(() => contract.owner()),
      safe(() => contract.relayer()),
      safe(() => contract.maxSupply()),
      safe(() => contract.totalSupply()),
      safe(() => contract.nextTokenIdToClaim()),
    ]);

    const baseUris = [];
    const baseCount = Number((await safe(() => contract.getBaseURICount())) ?? 0n);
    for (let i = 0; i < baseCount; i++) {
      const uri = await safe(() => contract.getBaseURIByIndex(i));
      if (uri) baseUris.push(uri);
    }

    let collection = null;
    let collectionError = null;
    let collectionSource = null;
    let collectionFetchMs = null;

    if (contractURI) {
      const started = Date.now();
      try {
        const result = await fetchJsonWithFailover(contractURI);
        collection = result.json;
        collectionSource = result.source;
      } catch (err) {
        collectionError = err.message;
      }
      collectionFetchMs = Date.now() - started;
    } else {
      collectionError = "Contract does not expose contractURI().";
    }

    // Relayer gas balance — if this hits 0 every mint silently fails.
    let relayerBalance = null;
    if (relayer) {
      relayerBalance = await safe(async () =>
        ethers.formatEther(await provider.getBalance(relayer))
      );
    }

    return NextResponse.json({
      contract: {
        address: CONTRACT_ADDRESS,
        chainId: Number(network.chainId),
        name,
        symbol,
        owner,
        relayer,
        relayerBalance,
        maxSupply: maxSupply?.toString() ?? null,
        totalSupply: totalSupply?.toString() ?? null,
        nextTokenIdToClaim: nextTokenId?.toString() ?? null,
        baseUris,
      },
      collection: {
        onchainUri: contractURI,
        resolvedGateway: resolveToGateway(contractURI),
        source: collectionSource,
        fetchMs: collectionFetchMs,
        data: collection,
        error: collectionError,
        imageUrl: collection?.image ? resolveToGateway(collection.image) : null,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Admin collection error:", err);
    // Always return JSON so the client never chokes on an empty body.
    return NextResponse.json(
      { error: "Failed to load collection.", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
