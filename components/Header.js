import Link from "next/link";

export default function Header() {
  return (
    <header className="header">
      <div className="headerContainer">
        <Link href="/" className="logo" aria-label="Decentral Frens home">
          DECENTRAL FRENS
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/waitlist" className="btnWaitlist">
            Waitlist
          </Link>
        </nav>
      </div>
    </header>
  );
}
