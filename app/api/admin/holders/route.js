import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { isAuthorized } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOLDERS_ABI = [
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
];

async function safe(fn) {
  try {
    const v = await fn();
    return v === undefined ? null : v;
  } catch {
    return null;
  }
}

export async function GET(req) {
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

  const { searchParams } = new URL(req.url);
  const privyList = (searchParams.get("privy") || "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.length > 0);
  const privySet = new Set(privyList);
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const network = await provider.getNetwork();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, HOLDERS_ABI, provider);

    const totalSupply = Number((await safe(() => contract.totalSupply())) ?? 0n);
    const maxSupply = Number((await safe(() => contract.maxSupply())) ?? 0n);

    const tokens = [];
    const byOwner = new Map();

    for (let tokenId = 0; tokenId < totalSupply; tokenId++) {
      const owner = await safe(() => contract.ownerOf(tokenId));
      const uri = await safe(() => contract.tokenURI(tokenId));

      if (!owner) {
        // Burned or non-existent token slot — skip but record it.
        tokens.push({ tokenId, owner: null, uri: null, burned: true });
        continue;
      }

      const normalized = owner.toLowerCase();
      const entry = { tokenId, owner: normalized, uri };
      tokens.push(entry);

      const existing = byOwner.get(normalized) || {
        address: normalized,
        tokenIds: [],
        registered: privySet.has(normalized),
      };
      existing.tokenIds.push(tokenId);
      byOwner.set(normalized, existing);
    }

    const holders = Array.from(byOwner.values()).sort(
      (a, b) => b.tokenIds.length - a.tokenIds.length
    );

    // If the caller supplied a Privy list, also report which of those addresses
    // do NOT own a token (useful for spotting registered-but-unminted users).
    const registeredWithoutToken = privyList.filter((addr) => !byOwner.has(addr));
    const holdersNotRegistered = privyList.length
      ? holders.filter((h) => !h.registered).map((h) => h.address)
      : [];

    return NextResponse.json({
      contract: {
        address: CONTRACT_ADDRESS,
        chainId: Number(network.chainId),
        totalSupply,
        maxSupply,
      },
      tokens,
      holders,
      uniqueHolders: holders.length,
      summary: {
        privyAddressesProvided: privyList.length,
        registeredHolders: holders.filter((h) => h.registered).length,
        holdersNotRegistered,
        registeredWithoutToken,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Admin holders error:", err);
    return NextResponse.json(
      { error: "Failed to load holders.", details: err.message },
      { status: 500 }
    );
  }
}
