
import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const runtime = "nodejs";

const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const READ_ABI = [
  "function nonces(address) view returns (uint256)",
  "function relayer() view returns (address)",
];

const CLAIM_ABI = [
  "function claimRelayer(address receiver,uint256 quantity,address currency,uint256 pricePerToken,tuple(bytes32[] proof,uint256 quantityLimitPerWallet,uint256 pricePerToken,address currency) allowlistProof,bytes data,uint256 deadline,bytes signature) payable",
];

function getConfig() {
  const { RPC_URL, RELAYER_PRIVATE_KEY, CONTRACT_ADDRESS } = process.env;

  if (!RPC_URL || !RELAYER_PRIVATE_KEY || !CONTRACT_ADDRESS) {
    throw new Error("Falten RPC_URL, RELAYER_PRIVATE_KEY o CONTRACT_ADDRESS.");
  }

  if (!ethers.isAddress(CONTRACT_ADDRESS)) {
    throw new Error("CONTRACT_ADDRESS no és una adreça vàlida.");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

  return { provider, wallet, contractAddress: CONTRACT_ADDRESS };
}

function buildHashes({
  chainId,
  contractAddress,
  relayer,
  receiver,
  quantity,
  currency,
  pricePerToken,
  proof,
  data,
  nonce,
  deadline,
}) {
  const coder = ethers.AbiCoder.defaultAbiCoder();

  const proofHash = ethers.keccak256(
    coder.encode(
      ["bytes32[]", "uint256", "uint256", "address"],
      [
        proof.proof,
        proof.quantityLimitPerWallet,
        proof.pricePerToken,
        proof.currency,
      ]
    )
  );

  const dataHash = ethers.keccak256(data);

  const structHash = ethers.keccak256(
    coder.encode(
      [
        "bytes32",
        "uint256",
        "address",
        "address",
        "address",
        "uint256",
        "address",
        "uint256",
        "bytes32",
        "bytes32",
        "uint256",
        "uint256",
      ],
      [
        ethers.keccak256(ethers.toUtf8Bytes("REDPILL_CLAIM_V1")),
        chainId,
        contractAddress,
        relayer,
        receiver,
        quantity,
        currency,
        pricePerToken,
        proofHash,
        dataHash,
        nonce,
        deadline,
      ]
    )
  );

  return structHash;
}

export async function GET(req) {
  try {
    const receiver = new URL(req.url).searchParams.get("receiver");

    if (!receiver || !ethers.isAddress(receiver)) {
      return NextResponse.json(
        { error: "Falta una adreça receiver vàlida." },
        { status: 400 }
      );
    }

    const { provider, contractAddress } = getConfig();
    const network = await provider.getNetwork();
    const contract = new ethers.Contract(contractAddress, READ_ABI, provider);

    const [nonce, relayer] = await Promise.all([
      contract.nonces(receiver),
      contract.relayer(),
    ]);

    return NextResponse.json({
      contractAddress,
      chainId: network.chainId.toString(),
      relayer,
      nonce: nonce.toString(),
    });
  } catch (error) {
    console.error("Mint prepare error:", error);
    return NextResponse.json(
      { error: "No s'ha pogut preparar el mint.", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      receiver,
      signature,
      quantity,
      currency,
      pricePerToken,
      proof,
      data,
      deadline,
      nonce,
      chainId,
    } = body;

    if (!receiver || !ethers.isAddress(receiver)) {
      throw new Error("Receiver invàlid.");
    }

    if (!signature || !ethers.isHexString(signature, 65)) {
      throw new Error("Falta una signatura ECDSA vàlida.");
    }

    if (!proof || !Array.isArray(proof.proof)) {
      throw new Error("El camp proof ha de contindre un array de hashes.");
    }

    for (const item of proof.proof) {
      if (!ethers.isHexString(item, 32)) {
        throw new Error("Cada element de proof ha de ser un bytes32 vàlid.");
      }
    }

    if (!ethers.isHexString(data ?? "0x")) {
      throw new Error("El camp data no és bytes hexadecimal vàlid.");
    }

    const { provider, wallet, contractAddress } = getConfig();
    const network = await provider.getNetwork();

    if (BigInt(chainId) !== network.chainId) {
      throw new Error("La xarxa indicada no coincideix amb la xarxa del contracte.");
    }

    const readContract = new ethers.Contract(
      contractAddress,
      READ_ABI,
      provider
    );

    const [currentNonce, relayer] = await Promise.all([
      readContract.nonces(receiver),
      readContract.relayer(),
    ]);

    if (BigInt(nonce) !== currentNonce) {
      return NextResponse.json(
        {
          error: "Nonce desactualitzat. Torna a intentar el mint.",
          details: "La signatura ja no correspon al nonce actual.",
        },
        { status: 409 }
      );
    }

    if (wallet.address.toLowerCase() !== relayer.toLowerCase()) {
      throw new Error("La clau RELAYER_PRIVATE_KEY no correspon al relayer del contracte.");
    }

    if (BigInt(deadline) < BigInt(Math.floor(Date.now() / 1000))) {
      throw new Error("La signatura ha caducat.");
    }

    const claim = {
      receiver,
      quantity: BigInt(quantity),
      currency: currency || NATIVE_TOKEN,
      pricePerToken: BigInt(pricePerToken ?? 0),
      proof: {
        proof: proof.proof,
        quantityLimitPerWallet: BigInt(proof.quantityLimitPerWallet),
        pricePerToken: BigInt(proof.pricePerToken),
        currency: proof.currency,
      },
      data: data ?? "0x",
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
    };

    if (
      !ethers.isAddress(claim.currency) ||
      !ethers.isAddress(claim.proof.currency)
    ) {
      throw new Error("L'adreça de currency no és vàlida.");
    }

    const structHash = buildHashes({
      chainId: network.chainId,
      contractAddress,
      relayer,
      ...claim,
    });

    const recovered = ethers.verifyMessage(
      ethers.getBytes(structHash),
      signature
    );

    if (recovered.toLowerCase() !== receiver.toLowerCase()) {
      throw new Error("La signatura no correspon a la wallet receiver.");
    }

    const contract = new ethers.Contract(contractAddress, CLAIM_ABI, wallet);

    const tx = await contract.claimRelayer(
      claim.receiver,
      claim.quantity,
      claim.currency,
      claim.pricePerToken,
      claim.proof,
      claim.data,
      claim.deadline,
      signature
    );

    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error("La transacció no s'ha completat correctament.");
    }

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
    });
  } catch (error) {
    console.error("Relayer Error:", error);

    return NextResponse.json(
      { error: "Minting failed", details: error.shortMessage || error.message },
      { status: 500 }
    );
  }
}
