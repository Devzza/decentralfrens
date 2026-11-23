"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { usePrivyAvailable } from "@/app/providers";
import BinaryCanvas from "@/components/BinaryCanvas";

export default function ProfilePage() {
  const privyAvailable = usePrivyAvailable();
  const router = useRouter();
  const { ready, authenticated, user } = usePrivy();
  const [accessStatus, setAccessStatus] = useState('validating'); // 'validating', 'authorized', 'unauthorized'

  useEffect(() => {
    async function validateAccess() {
      if (!ready) return;

      if (!authenticated) {
        setAccessStatus('unauthorized');
        return;
      }

      if (user?.wallet?.address) {
        try {
          const res = await fetch(`/api/nft?address=${user.wallet.address}`);
          if (res.ok) {
            setAccessStatus('authorized');
          } else {
            setAccessStatus('unauthorized');
            router.push("/");
          }
        } catch (e) {
          setAccessStatus('unauthorized');
          router.push("/");
        }
      } else {
        setAccessStatus('unauthorized');
      }
    }
    validateAccess();
  }, [ready, authenticated, user, router]);

  if (!privyAvailable || !ready || accessStatus === 'validating') {
    return <div style={{ backgroundColor: '#000', height: '100vh', width: '100vw' }} />;
  }

  if (accessStatus === 'unauthorized') {
    if (!authenticated) {
      return (
        <main style={{ 
          position: 'relative', 
          width: '100vw', 
          height: '100vh', 
          overflow: 'hidden',
          backgroundColor: '#000',
          margin: 0,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <button 
            onClick={() => router.push("/")} 
            style={{ 
              backgroundColor: 'transparent', 
              color: '#aaa', 
              border: '1px solid #444', 
              padding: '0.6rem 2rem', 
              fontFamily: 'monospace', 
              cursor: 'pointer',
              fontSize: '1rem',
              textTransform: 'uppercase'
            }}
          >
            Identify
          </button>
        </main>
      );
    }
    // If authenticated but no NFT, we just show black screen and let the useEffect handle the push
    return <div style={{ backgroundColor: '#000', height: '100vh', width: '100vw' }} />;
  }

  // Only reached if accessStatus === 'authorized'
  return (
    <main style={{ 
      position: 'relative', 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      backgroundColor: '#000',
      margin: 0,
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        zIndex: 1, 
        filter: 'hue-rotate(140deg) saturate(2) brightness(0.8)' 
      }}>
        <BinaryCanvas />
      </div>
<div style={{
  position: 'relative',
  zIndex: 2,
  color: '#fff',
  fontSize: '1.2rem',
  fontFamily: 'monospace',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  fontWeight: '300',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75em'
}}>
  <p style={{ margin: 0 }}>WELCOME TO THE OTHERSIDE</p>
  <p style={{ margin: 0 }}>AWAIT FOR MORE INFORMATION</p>
  <p style={{ margin: 0 }}>- ZZ</p>
</div>
    </main>
  );
}
