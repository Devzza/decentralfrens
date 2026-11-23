"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PrivyLogin from "@/components/PrivyLogin";
import { usePrivyAvailable } from "@/app/providers";

const BOOT_LINES = [
  "gnu/linux 01.23.0-noname",
  "Booting secure shell...",
  "SELinux: Loaded policy",
  "Network secured: tun0 11.0.2.3/26",
  "Enabling hardware random gen...",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function TerminalModal({ onClose, initialPhase = "booting" }) {
  const privyAvailable = usePrivyAvailable();
  // "booting" -> "prompt" -> "success"
  const [phase, setPhase] = useState(initialPhase);
  const [input, setInput] = useState("");
  const [log, setLog] = useState([]);
  const logRef = useRef(null);
  const captureRef = useRef(false);
  const inputRef = useRef("");
  const busyRef = useRef(false);
  const hiddenInputRef = useRef(null);

  const addLine = useCallback((html) => {
    setLog((prev) => [...prev, html]);
  }, []);

  // Auto-scroll to bottom whenever the log grows
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  // Boot sequence
  useEffect(() => {
    if (initialPhase === "success") return;
    let cancelled = false;
    async function boot() {
      for (const line of BOOT_LINES) {
        if (cancelled) return;
        addLine(`<span class="dim">[ 0.${Math.floor(Math.random() * 1e8)
          .toString(16)
          .padStart(8, "0")}] </span>${line}`);
        await sleep(380);
      }
      if (cancelled) return;
      addLine('guest@noname:~$ <span class="acc">ls -la</span>');
      await sleep(380);
      if (cancelled) return;
      addLine(
        '<span class="dim">drwxr-xr-x  guest guest  4096  secrets/</span>\n' +
          '<span class="dim">-rw-r--r--  root  root    128  access.key</span>\n' +
          '<span class="dim">-rw-------  root  root      0  .denied</span>'
      );
      await sleep(380);
      if (cancelled) return;
      addLine('guest@noname:~$ <span class="acc">sudo authenticate</span>');
      await sleep(380);
      if (cancelled) return;
      addLine('<span class="dim">[sudo] password for guest:</span>');
      setPhase("prompt");
      captureRef.current = true;
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [addLine, initialPhase]);

  const authenticate = useCallback(async () => {
    captureRef.current = false;
    busyRef.current = true;
    const code = inputRef.current;
    addLine("");

    if (code.length !== 4) {
      addLine(
        '<span class="err">Error:</span> authentication token malformed (expected 4 digits)'
      );
      inputRef.current = "";
      setInput("");
      captureRef.current = true;
      busyRef.current = false;
      return;
    }

    addLine('<span class="dim">checking token...</span>');
    await sleep(700);

    const envPins = process.env.NEXT_PUBLIC_VALID_PINS?.split(",") || [];
    const isStandard = envPins.includes(code) && !process.env.NEXT_PUBLIC_MINT_PINS?.split(",").includes(code);
    const isMint = process.env.NEXT_PUBLIC_MINT_PINS?.split(",").includes(code);

    if (isStandard || isMint) {
      addLine('<span class="ok">[ OK ]</span> Token accepted. Redirecting...');
      await sleep(700);
      setPhase("success");
      // Store the mint intent in sessionStorage to let PrivyLogin know
      if (isMint) {
        sessionStorage.setItem("d3frens_mint_intent", "true");
      } else {
        sessionStorage.removeItem("d3frens_mint_intent");
      }
    } else {
      addLine('<span class="err">Authentication failure — access denied.</span>');
      addLine('<span class="dim">Useful tip: try a numeric token like 0000.</span>');
      inputRef.current = "";
      setInput("");
      captureRef.current = true;
    }
    busyRef.current = false;
  }, [addLine]);

  // Key capture while prompt is active
  useEffect(() => {
    function onKey(e) {
      if (!captureRef.current || busyRef.current) return;

      const mod = e.ctrlKey || e.metaKey;
      const isPrint =
        /^[0-9]$/.test(e.key) ||
        e.key === "Backspace" ||
        e.key === "Enter" ||
        e.key === "Escape";
      if (!mod && isPrint) e.preventDefault();
      if (mod) return;

      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Backspace") {
        inputRef.current = inputRef.current.slice(0, -1);
        setInput(inputRef.current);
      } else if (/^[0-9]$/.test(e.key)) {
        if (inputRef.current.length < 4) {
          inputRef.current += e.key;
          setInput(inputRef.current);
        }
      } else if (e.key === "Enter") {
        authenticate();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authenticate, onClose]);

  // Reset capture when entering success
  useEffect(() => {
    if (phase === "success") captureRef.current = false;
  }, [phase]);

  // Mobile: the hidden input is the only way to raise the on-screen keyboard.
  useEffect(() => {
    if (phase === "prompt") {
      // Defer so the element is mounted before focusing.
      const t = setTimeout(() => hiddenInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Value change handler shared by the hidden input (mobile) and typing (desktop).
  function applyInput(raw) {
    const digits = String(raw).replace(/[^0-9]/g, "").slice(0, 4);
    inputRef.current = digits;
    setInput(digits);
  }

  // Keep a real input mounted so tapping anywhere on the terminal opens the
  // numeric keyboard on touch devices.
  function focusHiddenInput() {
    if (phase === "prompt" && !busyRef.current) {
      hiddenInputRef.current?.focus();
    }
  }

  function onOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  const pinMask = "\u2588".repeat(input.length);

  return (
    <div className="modalOverlay" onClick={onOverlayClick} role="dialog" aria-modal="true">
      {phase !== "success" ? (
        <div className="terminal">
          <div className="termHead">
            <span className="termDots">
              <span />
              <span />
              <span />
            </span>
            <span className="termTitle">root@noname: ~</span>
            <button
              className="termClose"
              type="button"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="termScreen" onClick={focusHiddenInput}>
            <div className="termLog" ref={logRef}>
              {log.map((html, i) => (
                <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
              ))}
            </div>
            {phase === "prompt" && (
              <input
                ref={hiddenInputRef}
                className="termHiddenInput"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                maxLength={4}
                aria-label="PIN"
                value={input}
                onChange={(e) => applyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    authenticate();
                  }
                }}
              />
            )}
            {phase === "prompt" && (
              <div className="termLine" onClick={focusHiddenInput}>
                <span
                  className="termPrompt"
                  dangerouslySetInnerHTML={{
                    __html: `<span class="dim">PIN (4 digits): </span>${pinMask}`,
                  }}
                />
                <span className="termCaret" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="success">
          <div className="successHead">
            <span className="termDots">
              <span />
              <span />
              <span />
            </span>
            <span className="termTitle">access.granted</span>
            <button
              className="termClose"
              type="button"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="successBody">
            {privyAvailable ? (
              <PrivyLogin onClose={onClose} />
            ) : (
              <>
                <span className="hl">Access granted.</span>{" "}
                <span className="hl">Identify yourself.</span>
                {"\n\n"}
                <span className="err">
                  Privy is not configured. Set NEXT_PUBLIC_PRIVY_APP_ID in
                  .env.local to enable login.
                </span>
                <button
                  className="successBtn"
                  type="button"
                  disabled
                >
                  Login with Privy
                </button>
                <button
                  className="successBtn ghost"
                  type="button"
                  onClick={onClose}
                >
                  Back to terminal
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
