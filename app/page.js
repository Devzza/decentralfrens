"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import BinaryCanvas from "@/components/BinaryCanvas";
import TerminalModal from "@/components/TerminalModal";
import WLModal from "@/components/WLModal";
import { supabase } from "@/lib/supabase";
import { usePrivyAvailable } from "@/app/providers";

// Black/green ENTER button, only rendered when the user is logged in.
function ProfileButton() {
  const privyAvailable = usePrivyAvailable();
  if (!privyAvailable) return null;
  return <ProfileButtonAuthenticated />;
}

function ProfileButtonAuthenticated() {
  const { ready, authenticated } = usePrivy();
  if (!ready || !authenticated) return null;
  return (
    <Link href="/profile" className="btnProfile">
      ENTER
    </Link>
  );
}

export default function HomePage() {
  const { ready, authenticated } = usePrivy();
  const [revealed, setRevealed] = useState(false);
  const [fading, setFading] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [wlModalOpen, setWlModalOpen] = useState(false);
  const [skipToSuccess, setSkipToSuccess] = useState(false);

  const handleWLSubmit = async (email) => {
    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([{ email }]);

      if (error) {
        console.error('Supabase error:', error.message);
        throw new Error(error.message);
      }
      
      console.log('WL Application successful for:', email);
      return Promise.resolve();
    } catch (err) {
      console.error('WL Submission failed:', err);
      throw err;
    }
  };

  // Auto-redirect to success screen if returning from login and PIN was passed
  useEffect(() => {
    if (ready && authenticated) {
      const pinPassed = sessionStorage.getItem("d3frens_pin_passed");
      if (pinPassed === "true") {
        setRevealed(true);
        setTerminalOpen(true);
        setSkipToSuccess(true);
      }
    }
  }, [ready, authenticated]);

  // Reveal the simulation
  const reveal = useCallback(() => {
    setFading(true);
    setTimeout(() => setRevealed(true), 700);
  }, []);

  // ESC: close the terminal first; otherwise hide the simulation
  useEffect(() => {
    function onKey(e) {
      if (e.key !== "Escape") return;
      if (terminalOpen) {
        setTerminalOpen(false);
        return;
      }
      setRevealed(false);
      setFading(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [terminalOpen]);

  // Fallback: any click on the landing (except header/footer/waitlist) reveals
  function onLandingClick(e) {
    if (e.target.closest("a, button, .landingHeader, .landingFooter")) return;
    reveal();
  }

  return (
    <>
      {/* The simulation behind: always mounted once revealed */}
      {revealed && (
        <div className="otherside">
          <BinaryCanvas />
          <div className="logoBurst" aria-hidden="true" />
          <div className="glitchOverlay" aria-hidden="true" />
          <div className="scanlines" aria-hidden="true" />
          <div className="vignette" aria-hidden="true" />
          <div className="content">
            <h1 style={{ display: 'none' }}>This website has been taken over</h1>
            <button
              className="btn"
              type="button"
              onClick={() => setTerminalOpen(true)}
            >
              Access Restricted
            </button>
          </div>
        </div>
      )}

      {terminalOpen && (
        <TerminalModal 
          onClose={() => setTerminalOpen(false)} 
          initialPhase={skipToSuccess ? "success" : "booting"}
        />
      )}

      {wlModalOpen && (
        <WLModal 
          isOpen={wlModalOpen} 
          onClose={() => setWlModalOpen(false)} 
          onSubmit={handleWLSubmit}
        />
      )}

      {/* The public landing (the "reality") */}
      <div
        className={`landing${fading && !revealed ? " fade" : ""}${
          revealed ? " hidden" : ""
        }`}
        onClick={onLandingClick}
      >
        <div className="landingBg">
          <Image
            src="/gif-defrens.gif"
            alt="Decentral Frens"
            fill
            priority
            quality={90}
            sizes="100vw"
          />
        </div>
        <div className="landingGrain" aria-hidden="true" />

        <header className="landingHeader">
          <Link href="/" className="logoText" aria-label="Decentral Frens home">
            DECENTRAL FRENS
          </Link>
          <div className="headerActions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link href="/" className="btnAbout" style={{ color: '#888', fontSize: '0.8rem', textDecoration: 'none', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); reveal(); }}>
              ABOUT
            </Link>
            <ProfileButton />
            <button 
              onClick={() => setWlModalOpen(true)} 
              className="btnWaitlist"
            >
              Waitlist
            </button>
          </div>
        </header>

        <div className="secretZone" aria-hidden="true" />

        <footer className="landingFooter">
          © 2026 Decentral Frens. All rights reserved.
        </footer>
      </div>
    </>
  );
}