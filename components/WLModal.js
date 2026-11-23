"use client";

import { useState } from "react";

export default function WLModal({ isOpen, onClose, onSubmit }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle', 'loading', 'success', 'error'

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      await onSubmit(email);
      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        setEmail("");
        onClose();
      }, 3000);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose} style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)', // Soft dark overlay
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(12px)', // Apple-style Gaussian blur
      transition: 'all 0.3s ease'
    }}>
      <div className="modalContent" onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Translucent white
        border: '1px solid rgba(255, 255, 255, 0.3)',
        padding: '2.5rem',
        borderRadius: '24px', // Soft rounded corners
        width: '100%',
        maxWidth: '380px',
        textAlign: 'center',
        color: '#1d1d1f', // Apple's standard dark grey
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)', // Soft deep shadow
        backdropFilter: 'blur(20px)',
        animation: 'modalScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <h2 style={{ 
          marginBottom: '0.5rem', 
          fontSize: '1.5rem', 
          fontWeight: '600', 
          letterSpacing: '-0.022em'
        }}>
          Waitlist
        </h2>
        <p style={{ 
          marginBottom: '2rem', 
          fontSize: '0.95rem', 
          color: '#86868b',
          fontWeight: '400'
        }}>
          Enter your email to get early access.
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              padding: '1rem',
              borderRadius: '12px',
              color: '#1d1d1f',
              fontFamily: 'inherit',
              outline: 'none',
              textAlign: 'center',
              fontSize: '1rem',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.08)'}
            onBlur={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
          />
          <button 
            type="submit" 
            disabled={status === 'loading'}
            style={{ 
              backgroundColor: status === 'success' ? '#34c759' : '#0071e3', // Apple Blue or Success Green
              color: '#fff',
              border: 'none',
              padding: '1rem',
              borderRadius: '12px',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            {status === 'loading' ? 'Processing...' : status === 'success' ? 'Confirmed' : 'Join Waitlist'}
          </button>
        </form>
        
        {status === 'error' && <p style={{ color: '#ff3b30', marginTop: '1rem', fontSize: '0.8rem' }}>Something went wrong. Please try again.</p>}
        
        <button 
          onClick={onClose} 
          style={{ 
            marginTop: '1.5rem', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: '0.9rem', 
            color: '#0066cc',
            fontWeight: '400'
          }}
        >
          Cancel
        </button>
      </div>
      <style jsx>{`
        @keyframes modalScale {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
