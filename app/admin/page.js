"use client";

import { useEffect, useState } from "react";

const TOKEN_KEY = "d3frens_admin_token";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // If already logged in, go straight to the dashboard
  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY)) {
      window.location.href = "/admin/dashboard";
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      localStorage.setItem(TOKEN_KEY, data.token);
      window.location.href = "/admin/dashboard";
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000",
        color: "#22ff66",
        fontFamily: "monospace",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          width: "100%",
          maxWidth: "360px",
          border: "1px solid #22ff66",
          padding: "2rem",
          boxShadow: "0 0 30px rgba(34,255,102,0.25)",
        }}
      >
        <div style={{ letterSpacing: "0.2em", fontSize: "0.75rem", opacity: 0.7 }}>
          ROOT@NONAME: ~
        </div>
        <h1 style={{ fontSize: "1.1rem", letterSpacing: "0.15em", margin: 0 }}>
          ADMIN CONSOLE
        </h1>

        <input
          type="password"
          placeholder="access token"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          style={{
            background: "#000",
            border: "1px solid #22ff66",
            color: "#22ff66",
            padding: "0.75rem",
            fontFamily: "monospace",
            letterSpacing: "0.1em",
            outline: "none",
          }}
        />

        {error && (
          <div style={{ color: "#ff3333", fontSize: "0.8rem" }}>
            [!] {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !password}
          style={{
            background: busy ? "#1a1a1a" : "#22ff66",
            color: "#000",
            border: "none",
            padding: "0.75rem",
            fontFamily: "monospace",
            fontWeight: "bold",
            letterSpacing: "0.15em",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "AUTHENTICATING..." : "UNLOCK"}
        </button>
      </form>
    </div>
  );
}
