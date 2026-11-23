import Link from "next/link";

export const metadata = {
  title: "Waitlist",
  description: "Join the Decentral Frens waitlist.",
};

export default function WaitlistPage() {
  return (
    <section className="page">
      <h1 className="pageTitle">Join the Waitlist</h1>
      <p className="pageText">
        Sign-up is coming soon. Create an account with your email and we will
        set up your wallet automatically.
      </p>
      <p style={{ marginTop: "2rem" }}>
        <Link href="/" className="btnWaitlist">
          Back to home
        </Link>
      </p>
    </section>
  );
}
