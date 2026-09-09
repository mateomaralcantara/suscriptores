import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Growth Reseller Lab">
      <span className="brand-mark">GR</span>
      <span>Growth Reseller Lab</span>
    </Link>
  );
}
