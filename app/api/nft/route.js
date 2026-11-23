import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  console.log(`\n--- DEBUG NFT REQUEST ---`);
  console.log(`Address received: ${address}`);

  if (!address) {
    console.log(`Error: No address provided.`);
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();

  try {
    const rpcUrl = process.env.RPC_URL;
    const contractAddr = process.env.CONTRACT_ADDRESS;

    console.log(`Using RPC: ${rpcUrl ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`Using Contract: ${contractAddr ? 'CONFIGURED' : 'MISSING'}`);

    if (!rpcUrl || !contractAddr) {
      throw new Error("Missing RPC_URL or CONTRACT_ADDRESS in environment variables");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    try {
      await provider.getNetwork();
      console.log(`RPC Connection: OK`);
    } catch (rpcErr) {
      console.error(`RPC Connection failed: ${rpcErr.message}`);
      throw new Error(`RPC Provider connection failed: ${rpcErr.message}`);
    }

    const abi = [
      "function tokenURI(uint256 tokenId) view returns (string)",
      "function balanceOf(address owner) view returns (uint256)",
      "function ownerOf(uint256 tokenId) view returns (address)"
    ];

    const contract = new ethers.Contract(contractAddr, abi, provider);

    console.log(`Checking balance for ${normalizedAddress}...`);
    const balance = await contract.balanceOf(normalizedAddress);
    
    console.log(`Balance: ${balance.toString()}`);
    
    if (balance === 0n) {
      console.log(`Result: User owns 0 tokens.`);
      return NextResponse.json({ error: 'No NFT owned by this address' }, { status: 404 });
    }

    let tokenId = null;
    console.log(`Scanning for tokenId (0-1000)...`);
    for (let i = 0; i <= 1000; i++) {
      try {
        const owner = await contract.ownerOf(i);
        if (owner.toLowerCase() === normalizedAddress) {
          tokenId = i;
          console.log(`FOUND MATCH: Token #${tokenId}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (tokenId === null) {
      console.log(`Result: Balance > 0 but no TokenId found in scan.`);
      return NextResponse.json({ error: 'Token ID not found' }, { status: 404 });
    }

    const tokenUri = await contract.tokenURI(tokenId); 
    console.log(`Original URI: ${tokenUri}`);
    
    // FALLBACK STRATEGY: In case of IPFS gateway failure (429), 
    // we return a a synthetic metadata object to avoid the 500 error
    // and show the user that their identity exists, even if the gateway is down.
    
    let finalUri = tokenUri;
    if (tokenUri.startsWith('ipfs://')) {
      const ipfsHash = tokenUri.replace('ipfs://', '');
      finalUri = `https://ipfs.io/ipfs/${ipfsHash}`;
    }

    try {
      const metadataResponse = await fetch(finalUri);
      if (!metadataResponse.ok) {
        throw new Error(`Gateway failed with status ${metadataResponse.status}`);
      }
      const metadata = await metadataResponse.json();

      if (metadata.image && metadata.image.startsWith('ipfs://')) {
        const imgHash = metadata.image.replace('ipfs://', '');
        metadata.image = `https://ipfs.io/ipfs/${imgHash}`;
      }
      return NextResponse.json(metadata);

    } catch (fetchError) {
      console.error(`Metadata fetch failed: ${fetchError.message}. Returning fallback identity.`);
      
      // Return a "Ghost Identity" so the UI doesn't crash and the user sees their success
      return NextResponse.json({
        name: "Verified Identity",
        description: "Identity confirmed on-chain. Metadata gateway is currently experiencing high traffic.",
        image: "/devs-symbol.jpg" // Use the project symbol as a fallback
      });
    }

  } catch (error) {
    console.error(`CRITICAL ERROR: ${error.message}`);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
