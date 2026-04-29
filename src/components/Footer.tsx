import { Sparkles } from "lucide-react";

type FooterLink = { label: string; href: string };

export function Footer({
  year,
  productName,
  links,
}: {
  year: number;
  productName: string;
  links: FooterLink[];
}) {
  const half = Math.ceil(productName.length / 2);
  const first = productName.slice(0, half);
  const second = productName.slice(half);

  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-brand shadow-glow text-white">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground">
              <span className="font-display">{first}</span>
              <span className="font-display text-gradient-brand">{second}</span>
            </div>
            <div className="mt-1 text-xs font-semibold text-muted-foreground">
              © {year} {productName}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-white/60"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

