"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoadingPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/profile");
    }, 3000); // 3 seconds loading for metadata propagation
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{ 
      backgroundColor: '#000', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      color: '#22ff66', 
      fontFamily: '"Courier New", Courier, monospace',
      gap: '2rem'
    }}>
      <div className="loader" style={{ 
        width: '50px', 
        height: '50px', 
        border: '3px solid #1a3322', 
        borderTop: '3px solid #22ff66', 
        borderRadius: '50%', 
        animation: 'spin 1s linear infinite' 
      }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '1.2rem', letterSpacing: '2px' }}>PROVISIONING IDENTITY...</p>
        <p style={{ fontSize: '0.8rem', color: '#5b7a62', marginTop: '0.5rem' }}>Syncing with the otherside</p>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
