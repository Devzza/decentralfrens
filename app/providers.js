"use client";

import { createContext, useContext } from "react";
import { PrivyProvider } from "@privy-io/react-auth";

const PrivyAvailableContext = createContext(false);

export function usePrivyAvailable() {
  return useContext(PrivyAvailableContext);
}

export default function Providers({ children }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // If no app id is configured yet, render children without Privy so the
  // rest of the app still works. The login UI shows a friendly message.
  if (!appId) {
    return children;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Create an embedded EVM wallet for users who don't have one
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        // Show all login methods enabled in the Privy Dashboard
        // (email, Google, X, external wallets)
        appearance: {
          theme: "dark",
          accentColor: "#22ff66",
          logo: "/dfrns-moon.jpg",
        },
      }}
    >
      <PrivyAvailableContext.Provider value={true}>
        {children}
      </PrivyAvailableContext.Provider>
    </PrivyProvider>
  );
}
