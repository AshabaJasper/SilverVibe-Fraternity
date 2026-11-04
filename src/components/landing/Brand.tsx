import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { focusRing } from "./styles";

/** Logo + wordmark, linking back to the top of the landing page. */
export function Brand({ size = 36, priority = false, className }: { size?: number; priority?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="SilverVibe Fraternity home"
      className={cn("flex shrink-0 items-center gap-2.5 rounded-lg", focusRing, className)}
    >
      <Image
        src="/logo.jpg"
        alt=""
        width={size}
        height={size}
        priority={priority}
        className="rounded-full border border-[#C0C0C0]/30 object-cover"
        style={{ width: size, height: size }}
      />
      <span className="font-[family-name:var(--font-heading)] text-base font-bold tracking-tight text-[#f5f5f5] sm:text-lg">
        SilverVibe <span className="silver-text-gradient">Fraternity</span>
      </span>
    </Link>
  );
}
