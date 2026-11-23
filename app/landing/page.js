
"use client";

import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="landing">
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
      </header>

      <footer className="landingFooter">
        © 2026 Decentral Frens. All rights reserved.
      </footer>
    </div>
  );
}
