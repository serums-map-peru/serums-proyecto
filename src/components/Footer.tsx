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
  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <a href="#top" className="flex items-center gap-3">
          <div className="flex h-10 items-center" style={{ gap: "8px" }}>
            <img
              src="/Lisa%20personaje.png"
              alt="LISA"
              width={64}
              height={64}
              className="h-9 w-auto origin-left scale-125 object-contain"
              loading="lazy"
            />
            <img
              src="/lisafinal.png"
              alt={productName}
              width={220}
              height={64}
              className="h-9 w-auto object-contain"
              loading="lazy"
            />
          </div>
          <div className="min-w-0">
            <div className="mt-1 text-xs font-semibold text-muted-foreground">
              © {year} {productName}
            </div>
          </div>
        </a>

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
