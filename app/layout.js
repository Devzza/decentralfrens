import "./globals.css";
import { Dela_Gothic_One } from "next/font/google";
import Providers from "./providers";

const delaGothic = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-logo",
  display: "swap",
});

const siteUrl = "https://decentralfrens.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Decentral Frens",
    template: "%s | Decentral Frens",
  },
  description:
    "Decentral Frens — a decentralized community of friends. Join the waitlist.",
  keywords: ["Decentral Frens", "web3", "community", "waitlist"],
  openGraph: {
    title: "Decentral Frens",
    description:
      "Decentral Frens — a decentralized community of friends. Join the waitlist.",
    url: siteUrl,
    siteName: "Decentral Frens",
    images: [{ url: "/home-bg.jpg", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Decentral Frens",
    description:
      "Decentral Frens — a decentralized community of friends. Join the waitlist.",
    images: ["/home-bg.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={delaGothic.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
