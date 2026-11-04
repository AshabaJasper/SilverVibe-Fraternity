import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Brand } from "./Brand";
import { container, focusRing } from "./styles";

export function Footer() {
  return (
    <footer className="border-t border-[#C0C0C0]/10 bg-[#0c0c0c]">
      <div className={cn(container, "flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between")}>
        <div className="space-y-3">
          <Brand size={32} />
          <p className="text-sm text-[#8a8a8a]">
            SilverVibe Fraternity Cooperative Society Ltd · Plot 22, Kampala Road, Kampala
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-[#737373] md:items-end">
          <a
            href="https://github.com/AshabaJasper/SilverVibe-Fraternity"
            target="_blank"
            rel="noopener noreferrer"
            className={cn("inline-flex items-center gap-1.5 rounded-md text-[#a3a3a3] transition-colors hover:text-[#f5f5f5]", focusRing)}
          >
            Source on GitHub
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <p>&copy; 2026 SilverVibe Fraternity Cooperative Society Ltd</p>
        </div>
      </div>
    </footer>
  );
}
