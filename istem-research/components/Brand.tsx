import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="ISTEM RESEARCH, inicio">
      <span className="brand-mark" aria-hidden="true">IR</span>
      <span>
        ISTEM RESEARCH
        <small>Inteligencia · Investigación · Opinión</small>
      </span>
    </Link>
  );
}
