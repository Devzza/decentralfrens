
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import Image from "next/image";
import { ethers } from "ethers";

const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export default function PrivyLogin({ onClose }) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const router = useRouter();

  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isMinting, setIsMinting] = useState(false);
  const holdTimerRef = useRef(null);
  const mintStartedRef = useRef(false);

  useEffect(() => {
    sessionStorage.setItem("d3frens_pin_passed", "true");
    return () => clearInterval(holdTimerRef.current);
  }, []);

  const isMintIntent = sessionStorage.getItem("d3frens_mint_intent") === "true";

  const handleHoldEnd = () => {
    setIsHolding(false);
    clearInterval(holdTimerRef.current);
    setHoldProgress(0);
  };

  const handleMint = async () => {
    if (mintStartedRef.current || !authenticated || !user) return;

    const embeddedWallet = wallets.find(
      (w) =>
        w.walletClientType === "privy" &&
        w.address?.toLowerCase() === user.wallet?.address?.toLowerCase()
    );

    if (!embeddedWallet) {
      alert("No s'ha trobat la wallet embedded de Privy.");
      return;
    }

    mintStartedRef.current = true;
    setIsMinting(true);
    setIsHolding(false);
    clearInterval(holdTimerRef.current);

    try {
      const receiver = embeddedWallet.address;
      const prepareResponse = await fetch(
        `/api/mint?receiver=${encodeURIComponent(receiver)}`,
        { method: "GET", cache: "no-store" }
      );
      const prepared = await prepareResponse.json();
      if (!prepareResponse.ok) throw new Error(prepared.details || prepared.error || "Error preparing mint.");

      const quantity = "1";
      const currency = NATIVE_TOKEN;
      const pricePerToken = "0";
      const data = "0x";
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const proof = { proof: [], quantityLimitPerWallet: "0", pricePerToken: "0", currency: NATIVE_TOKEN };
      const coder = ethers.AbiCoder.defaultAbiCoder();
      const proofHash = ethers.keccak256(coder.encode(["bytes32[]", "uint256", "uint256", "address"], [proof.proof, proof.quantityLimitPerWallet, proof.pricePerToken, proof.currency]));
      const dataHash = ethers.keccak256(data);
      const structHash = ethers.keccak256(coder.encode(["bytes32", "uint256", "address", "address", "address", "uint256", "address", "uint256", "bytes32", "bytes32", "uint256", "uint256"], [ethers.keccak256(ethers.toUtf8Bytes("REDPILL_CLAIM_V1")), prepared.chainId, prepared.contractAddress, prepared.relayer, receiver, quantity, currency, pricePerToken, proofHash, dataHash, prepared.nonce, deadline]));

      const provider = await embeddedWallet.getEthereumProvider();
      const signature = await provider.request({ method: "personal_sign", params: [structHash, receiver] });

      const response = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver, signature, quantity, currency, pricePerToken, proof, data, deadline, nonce: prepared.nonce, chainId: prepared.chainId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details || result.error || "Relayer error.");
      router.push("/loading");
    } catch (error) {
      console.error("Mint Flow Error:", error);
      alert(`The red pill failed to dissolve: ${error.message}`);
      mintStartedRef.current = false;
      setIsMinting(false);
      setHoldProgress(0);
    }
  };

  const handleHoldStart = () => {
    if (isMinting || mintStartedRef.current) return;
    clearInterval(holdTimerRef.current);
    setIsHolding(true);
    let progress = 0;
    holdTimerRef.current = setInterval(() => {
      progress = Math.min(progress + 100 / (3000 / 16), 100);
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(holdTimerRef.current);
        handleMint();
      }
    }, 16);
  };

  const renderContent = () => {
    if (!ready) return <span className="dim">initializing secure channel...</span>;

    if (!authenticated) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
          <Image 
            src={isMintIntent ? "/zz-redpill.jpg" : "/devs-symbol.jpg"} 
            alt="Symbol" 
            width={200} 
            height={200} 
            style={{ borderRadius: '50%', objectFit: 'cover', width: '100px', height: '100px' }}
          />
          <span className="hl">{isMintIntent ? "Welcome to /d3frens." : "Welcome Initiate"}</span>
          <button
            className="successBtn"
            type="button"
            onClick={login}
            style={{ width: "auto", padding: "0.6rem 2rem" }}
          >
            IDENTIFY
          </button>
        </div>
      );
    }

    if (isMintIntent) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
          <Image src="/zz-redpill.jpg" alt="Red Pill" width={100} height={100} style={{ borderRadius: '50%' }} />
          <span className="hl">Welcome to /d3frens.</span>
          
          <button
            className="successBtn"
            type="button"
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            disabled={isMinting}
            style={{ 
              width: "240px", 
              height: "60px",
              padding: "0",
              position: "relative", 
              overflow: "hidden", 
              backgroundColor: isMinting ? "#555" : "#22ff66",
              border: "2px solid #22ff66",
              cursor: isMinting ? "not-allowed" : "pointer",
              transition: "background-color 0.3s ease"
            }}
          >
            <div 
              style={{ 
                position: "absolute", 
                left: 0, 
                top: 0, 
                bottom: 0, 
                width: `${holdProgress}%`, 
                backgroundColor: "#ff0000", 
                transition: "width 0.1s linear",
                zIndex: 1 
              }} 
            />
            <span style={{ position: "relative", zIndex: 2, fontWeight: "bold", color: isHolding ? "#fff" : "#000" }}>
              {isMinting ? "DISSOLVING..." : isHolding ? `HOLD... ${Math.ceil(3 - (holdProgress * 3) / 100)}s` : "Take the red pill"}
            </span>
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <Image src="/devs-symbol.jpg" alt="Devs Symbol" width={200} height={200} style={{ borderRadius: '50%', objectFit: 'cover', width: '100px', height: '100px' }} />
        <span className="hl">Welcome Initiate</span>
        <div style={{ color: '#fff', fontFamily: 'monospace', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: '1rem', letterSpacing: '1px' }}>
          DEVS HAS BIG PLANS FOR YOU.<br/>
          WAIT FOR MORE INSTRUCTIONS.
        </div>
      </div>
    );
  };

  return (
    <div className="pill-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", textAlign: "center" }}>
      {renderContent()}
      {ready && authenticated && (
        <button className="successBtn ghost" type="button" onClick={logout} style={{ width: "auto", padding: "0.4rem 1rem" }}>
          Log out
        </button>
      )}
      <button className="successBtn ghost" type="button" onClick={onClose} style={{ width: "auto", padding: "0.4rem 1rem" }}>
        Back to terminal
      </button>
    </div>
  );
}
