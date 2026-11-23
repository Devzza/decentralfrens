"use client";

import { useCallback, useEffect, useState } from "react";

const TOKEN_KEY = "d3frens_admin_token";

const GREEN = "#22ff66";
const RED = "#ff3333";
const AMBER = "#ffb020";
const mono = "monospace";

const CHAINS = {
  33139: { name: "APECHAIN MAINNET", mainnet: true },
  33111: { name: "APECHAIN CURTIS (TESTNET)", mainnet: false },
};

function NetworkBadge({ chainId }) {
  if (chainId == null) return null;
  const info = CHAINS[chainId] || { name: `CHAIN ${chainId}`, mainnet: null };
  const color = info.mainnet === true ? RED : info.mainnet === false ? AMBER : "#888";
  return (
    <span
      style={{
        border: `1px solid ${color}`,
        color,
        padding: "0.2rem 0.6rem",
        fontSize: "0.65rem",
        letterSpacing: "0.15em",
        whiteSpace: "nowrap",
      }}
    >
      {info.mainnet === true ? "⚠ " : ""}
      {info.name}
    </span>
  );
}

function RelayerBalance({ balance }) {
  if (balance == null) return <Field label="RELAYER GAS" value="—" />;
  const n = Number(balance);
  const low = n < 1;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        padding: "0.75rem 1rem",
        border: `1px solid ${low ? RED : "rgba(34,255,102,0.2)"}`,
        backgroundColor: low ? "rgba(255,51,51,0.08)" : "transparent",
      }}
    >
      <span style={{ fontSize: "0.65rem", opacity: 0.5, letterSpacing: "0.15em" }}>
        RELAYER GAS
      </span>
      <span style={{ fontSize: "0.85rem", color: low ? RED : GREEN, wordBreak: "break-all" }}>
        {n.toFixed(4)} APE
        {low && n === 0 ? "  ⚠ MINTS WILL FAIL" : low ? "  ⚠ LOW" : ""}
      </span>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        padding: "0.75rem 1rem",
        border: "1px solid rgba(34,255,102,0.2)",
      }}
    >
      <span style={{ fontSize: "0.65rem", opacity: 0.5, letterSpacing: "0.15em" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>
        {value || "—"}
      </span>
    </div>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState(null);
  const [data, setData] = useState(null);
  const [holdersData, setHoldersData] = useState(null);
  const [privyInput, setPrivyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState([]);

  const pushLog = useCallback((msg) => {
    const stamp = new Date().toLocaleTimeString();
    setLog((prev) => [`[${stamp}] ${msg}`, ...prev].slice(0, 12));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/admin";
  }, []);

  const loadHolders = useCallback(
    async (currentToken, privyAddresses = "") => {
      try {
        const qs = privyAddresses ? `?privy=${encodeURIComponent(privyAddresses)}` : "";
        const res = await fetch(`/api/admin/holders${qs}`, {
          headers: { Authorization: `Bearer ${currentToken}` },
          cache: "no-store",
        });
        const json = await res.json();
        if (res.status === 401) {
          logout();
          return;
        }
        if (!res.ok) throw new Error(json.details || json.error || "Holders request failed.");
        setHoldersData(json);
        pushLog(
          `Holders loaded: ${json.uniqueHolders} unique / ${json.contract.totalSupply} minted.`
        );
      } catch (err) {
        pushLog(`Holders error: ${err.message}`);
      }
    },
    [logout, pushLog]
  );

  const load = useCallback(
    async (currentToken, manual = false) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/collection", {
          headers: { Authorization: `Bearer ${currentToken}` },
          cache: "no-store",
        });
        const json = await res.json();

        if (res.status === 401) {
          logout();
          return;
        }
        if (!res.ok) throw new Error(json.details || json.error || "Request failed.");

        setData(json);
        pushLog(
          manual
            ? "Collection metadata refreshed."
            : `Collection loaded (chain ${json.contract.chainId}).`
        );
        if (json.collection.error) {
          pushLog(`Metadata warning: ${json.collection.error}`);
        }
      } catch (err) {
        setError(err.message);
        pushLog(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [logout, pushLog]
  );

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      window.location.href = "/admin";
      return;
    }
    setToken(stored);
    load(stored);
    loadHolders(stored);
  }, [load, loadHolders]);

  if (!token) return null;

  const c = data?.contract;
  const col = data?.collection;
  const colData = col?.data;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000",
        color: GREEN,
        fontFamily: mono,
        padding: "2rem",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            borderBottom: `1px solid ${GREEN}`,
            paddingBottom: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.65rem", opacity: 0.5, letterSpacing: "0.2em" }}>
              ROOT@NONAME: ~
            </div>
            <h1 style={{ margin: 0, fontSize: "1.2rem", letterSpacing: "0.15em" }}>
              ADMIN CONSOLE
            </h1>
          </div>
          <NetworkBadge chainId={c?.chainId} />
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => load(token, true)}
              disabled={loading}
              style={{
                background: "transparent",
                border: `1px solid ${GREEN}`,
                color: GREEN,
                padding: "0.5rem 1rem",
                fontFamily: mono,
                letterSpacing: "0.1em",
                cursor: loading ? "wait" : "pointer",
                fontSize: "0.75rem",
              }}
            >
              {loading ? "REFRESHING..." : "REFRESH METADATA"}
            </button>
            <button
              onClick={logout}
              style={{
                background: "transparent",
                border: `1px solid ${RED}`,
                color: RED,
                padding: "0.5rem 1rem",
                fontFamily: mono,
                letterSpacing: "0.1em",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              LOGOUT
            </button>
          </div>
        </header>

        {error && (
          <div style={{ border: `1px solid ${RED}`, color: RED, padding: "0.75rem 1rem" }}>
            ! {error}
          </div>
        )}

        {/* Contract */}
        <section>
          <h2 style={{ fontSize: "0.8rem", letterSpacing: "0.2em", opacity: 0.7, marginBottom: "0.75rem" }}>
            / CONTRACT
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "0.5rem",
            }}
          >
            <Field label="NAME" value={c?.name} />
            <Field label="SYMBOL" value={c?.symbol} />
            <Field label="ADDRESS" value={c?.address} />
            <Field label="CHAIN ID" value={c?.chainId} />
            <Field label="OWNER" value={c?.owner} />
            <Field label="RELAYER" value={c?.relayer} />
            <RelayerBalance balance={c?.relayerBalance} />
            <Field label="TOTAL SUPPLY" value={c?.totalSupply} />
            <Field label="MAX SUPPLY" value={c?.maxSupply} />
            <Field label="NEXT TOKEN ID" value={c?.nextTokenIdToClaim} />
            <Field label="BASE URIS" value={c?.baseUris?.join(" | ")} />
          </div>
        </section>

        {/* Collection metadata */}
        <section>
          <h2 style={{ fontSize: "0.8rem", letterSpacing: "0.2em", opacity: 0.7, marginBottom: "0.75rem" }}>
            / COLLECTION METADATA
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <Field label="URI (ON-CHAIN)" value={col?.onchainUri} />
            <Field label="RESOLVED GATEWAY" value={col?.resolvedGateway} />
            <Field label="LOADED FROM" value={col?.source} />
            <Field
              label="FETCH TIME"
              value={col?.fetchMs != null ? `${col.fetchMs} ms` : null}
            />
            <Field label="LAST FETCH" value={data?.fetchedAt} />
          </div>

          {colData ? (
            <div style={{ border: "1px solid rgba(34,255,102,0.3)", padding: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ minWidth: "160px" }}>
                {col?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={col.imageUrl}
                    alt="Collection"
                    style={{ width: "160px", height: "160px", objectFit: "cover", border: "1px solid rgba(34,255,102,0.4)" }}
                  />
                ) : (
                  <div style={{ width: "160px", height: "160px", border: "1px dashed rgba(34,255,102,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", opacity: 0.5 }}>
                    NO IMAGE
                  </div>
                )}
              </div>
              <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <Field label="COLLECTION NAME" value={colData.name} />
                <Field label="DESCRIPTION" value={colData.description} />
                <Field label="EXTERNAL LINK" value={colData.external_link} />
                <Field label="IMAGE (IPFS)" value={colData.image} />
              </div>
              <pre
                style={{
                  flex: "1 1 100%",
                  margin: 0,
                  fontSize: "0.7rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  opacity: 0.8,
                  background: "rgba(34,255,102,0.05)",
                  padding: "0.75rem",
                }}
              >
{JSON.stringify(colData, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{ border: "1px solid rgba(255,51,51,0.5)", color: RED, padding: "0.75rem 1rem" }}>
              {col?.error || "No metadata loaded."}
            </div>
          )}
        </section>

        {/* Holders */}
        <section>
          <h2 style={{ fontSize: "0.8rem", letterSpacing: "0.2em", opacity: 0.7, marginBottom: "0.75rem" }}>
            / HOLDERS
          </h2>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <input
              value={privyInput}
              onChange={(e) => setPrivyInput(e.target.value)}
              placeholder="privy addresses (comma separated) 0xabc..., 0xdef..."
              style={{
                flex: "1 1 320px",
                background: "#000",
                border: "1px solid rgba(34,255,102,0.4)",
                color: GREEN,
                padding: "0.6rem 0.75rem",
                fontFamily: mono,
                fontSize: "0.75rem",
                outline: "none",
              }}
            />
            <button
              onClick={() => {
                loadHolders(token, privyInput.replace(/\s+/g, ""));
                pushLog("Cross-referencing Privy addresses...");
              }}
              style={{
                background: "transparent",
                border: `1px solid ${GREEN}`,
                color: GREEN,
                padding: "0.6rem 1rem",
                fontFamily: mono,
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              COMPARE
            </button>
          </div>

          {holdersData ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <Field
                  label="MINTED"
                  value={`${holdersData.contract.totalSupply} / ${holdersData.contract.maxSupply}`}
                />
                <Field label="UNIQUE HOLDERS" value={String(holdersData.uniqueHolders)} />
                <Field
                  label="PRIVY ADDRESSES"
                  value={String(holdersData.summary.privyAddressesProvided)}
                />
                <Field
                  label="REGISTERED HOLDERS"
                  value={String(holdersData.summary.registeredHolders)}
                />
              </div>

              <div style={{ overflowX: "auto", border: "1px solid rgba(34,255,102,0.3)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                  <thead>
                    <tr style={{ textAlign: "left", opacity: 0.6, letterSpacing: "0.12em" }}>
                      <th style={{ padding: "0.5rem 0.75rem" }}>#</th>
                      <th style={{ padding: "0.5rem 0.75rem" }}>TOKEN</th>
                      <th style={{ padding: "0.5rem 0.75rem" }}>OWNER</th>
                      <th style={{ padding: "0.5rem 0.75rem" }}>PRIVY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdersData.holders.map((h) => (
                      <tr key={h.address} style={{ borderTop: "1px solid rgba(34,255,102,0.12)" }}>
                        <td style={{ padding: "0.5rem 0.75rem", opacity: 0.5 }}>
                          {holdersData.holders.indexOf(h) + 1}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          {h.tokenIds.map((id) => `#${id}`).join(", ")}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", fontFamily: mono }}>
                          {h.address}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem 0.75rem",
                            color: h.registered ? GREEN : "rgba(255,255,255,0.35)",
                          }}
                        >
                          {holdersData.summary.privyAddressesProvided === 0
                            ? "—"
                            : h.registered
                            ? "✓ REGISTERED"
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {holdersData.summary.privyAddressesProvided > 0 && (
                <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
                  {holdersData.summary.holdersNotRegistered.length > 0 && (
                    <Field
                      label="HOLDERS NOT REGISTERED (ON-CHAIN ONLY)"
                      value={holdersData.summary.holdersNotRegistered.join(", ")}
                    />
                  )}
                  {holdersData.summary.registeredWithoutToken.length > 0 && (
                    <Field
                      label="REGISTERED BUT NO TOKEN"
                      value={holdersData.summary.registeredWithoutToken.join(", ")}
                    />
                  )}
                  {holdersData.summary.holdersNotRegistered.length === 0 &&
                    holdersData.summary.registeredWithoutToken.length === 0 && (
                      <Field label="MATCH" value="All provided addresses own a token." />
                    )}
                </div>
              )}
            </>
          ) : (
            <div style={{ border: "1px solid rgba(34,255,102,0.2)", padding: "0.75rem 1rem", fontSize: "0.72rem", opacity: 0.6 }}>
              Loading holders...
            </div>
          )}
        </section>

        {/* Log */}
        <section>
          <h2 style={{ fontSize: "0.8rem", letterSpacing: "0.2em", opacity: 0.7, marginBottom: "0.75rem" }}>
            / LOG
          </h2>
          <div
            style={{
              border: "1px solid rgba(34,255,102,0.2)",
              padding: "0.75rem 1rem",
              fontSize: "0.7rem",
              opacity: 0.8,
              minHeight: "80px",
            }}
          >
            {log.length === 0 ? (
              <span style={{ opacity: 0.5 }}>—</span>
            ) : (
              log.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
