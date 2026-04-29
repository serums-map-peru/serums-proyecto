import * as React from "react";
import { createLucideIcon, type LucideIcon } from "lucide-react";

const Github = createLucideIcon("Github", [
  [
    "path",
    {
      d: "M9 19c-4 1.5-4-2-5-2m10 4v-3.5c0-1 .1-1.4-.5-2 2.2-.2 4.5-1 4.5-5a4 4 0 0 0-1-3c.1-.3.5-1.6-.1-3.3 0 0-1-.3-3.3 1.2a11 11 0 0 0-6 0C5.3 3.1 4.3 3.4 4.3 3.4c-.6 1.7-.2 3-.1 3.3a4 4 0 0 0-1 3c0 4 2.3 4.8 4.5 5-.6.6-.6 1.2-.5 2V21",
      key: "gh1",
    },
  ],
]);

const Linkedin = createLucideIcon("Linkedin", [
  ["path", { d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v2", key: "li1" }],
  ["rect", { x: "2", y: "9", width: "4", height: "12", key: "li2" }],
  ["circle", { cx: "4", cy: "4", r: "2", key: "li3" }],
]);

const Instagram = createLucideIcon("Instagram", [
  ["rect", { x: "2", y: "2", width: "20", height: "20", rx: "5", ry: "5", key: "ig1" }],
  ["path", { d: "M16 11.37a4 4 0 1 1-7.9 1.26 4 4 0 0 1 7.9-1.26", key: "ig2" }],
  ["line", { x1: "17.5", y1: "6.5", x2: "17.51", y2: "6.5", key: "ig3" }],
]);

const ResearchGate = createLucideIcon("ResearchGate", [
  ["circle", { cx: "12", cy: "12", r: "9", key: "rg0" }],
  ["path", { d: "M9 16V8h3.4a2.3 2.3 0 0 1 0 4.6H9", key: "rg1" }],
  ["path", { d: "M12.2 12.6 15 16", key: "rg2" }],
  ["path", { d: "M14.6 12.7a2.8 2.8 0 1 0 0 5.6c.8 0 1.5-.2 2.1-.6", key: "rg3" }],
]);

const Orcid = createLucideIcon("Orcid", [
  ["circle", { cx: "12", cy: "12", r: "9", key: "or0" }],
  ["path", { d: "M8.6 9.8v5.8", key: "or1" }],
  ["path", { d: "M8.6 8.1h.01", key: "or2" }],
  ["path", { d: "M11.2 9.8h2.1a3 3 0 0 1 0 6h-2.1z", key: "or3" }],
]);

type TeamMember = {
  name: string;
  role: string;
  initials: string;
  photoSrc?: string;
  hue: string;
  socials: Array<{ icon: LucideIcon; href: string; label: string }>;
};

const team: TeamMember[] = [
  {
    name: "Dr. Nair Javier Murillo",
    role: "Médico de la UDEP",
    initials: "NJ",
    hue: "from-primary to-accent",
    photoSrc: "/NairJavier.png",
    socials: [
      
    ],
  },
  {
    name: "Mathias Javier Murillo",
    role: "Dev de LISA",
    initials: "MJ",
    hue: "from-accent to-[var(--primary-glow)]",
    photoSrc: "/Ing. Mathias Javier.jpeg",
    socials: [
      { icon: Linkedin, href: "https://www.linkedin.com/in/mathias-javier-murillo-744508350", label: "LinkedIn" },
      { icon: Instagram, href: "https://www.instagram.com/mjavierm_?igsh=MWx6ZGMyZnpyanF1Zg%3D%3D&utm_source=qr", label: "Instagram" },
      { icon: Github, href: "https://github.com/K1ngHulk", label: "GitHub" },
    ],
  },
  {
    name: "Dr. André Lapeyre Rivera",
    role: "Médico de la UNMSM",
    initials: "AL",
    hue: "from-[var(--primary-glow)] to-primary",
    photoSrc: "/Dr.André Lapeyre.jpeg",
    socials: [
      { icon: Linkedin, href: "https://www.linkedin.com/in/andre-lapeyre/", label: "LinkedIn" },
      { icon: ResearchGate, href: "https://www.researchgate.net/profile/Andre-Lapeyre-Rivera-2", label: "ResearchGate" },
      { icon: Orcid, href: "#", label: "ORCID" },
    ],
  },
];

export function Team() {
  return (
    <section id="team" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Créditos</span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            El equipo detrás <span className="text-gradient-brand">de LISA</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Médicos e ingenieros se juntaron para mejorar el futuro del SERUMS en Perú.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m) => (
            <article
              key={m.name}
              className="group relative rounded-3xl bg-card p-8 border border-border/60 shadow-card hover:-translate-y-2 hover:shadow-glow transition-all duration-500"
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

              <div className="relative mx-auto h-36 w-36">
                <div
                  className={[
                    "absolute inset-0 rounded-full bg-gradient-to-br blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-500",
                    m.hue,
                  ].join(" ")}
                />
                <div className={["relative h-36 w-36 rounded-full bg-gradient-to-br p-[3px] shadow-glow", m.hue].join(" ")}>
                  {m.photoSrc ? (
                    <img
                      src={m.photoSrc}
                      alt={m.name}
                      className="h-full w-full rounded-full bg-card object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-card font-display text-4xl font-bold text-gradient-brand">
                      {m.initials}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 text-center">
                <h3 className="font-display text-xl font-bold">{m.name}</h3>
                <div className="mt-1 text-sm text-muted-foreground">{m.role}</div>

                <div className="mt-5 flex items-center justify-center gap-3">
                  {m.socials.map((s) => {
                    const Icon = s.icon;
                    return (
                      <a
                        key={s.label}
                        href={s.href}
                        aria-label={s.label}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/40 text-muted-foreground hover:text-primary-foreground hover:bg-gradient-brand hover:border-transparent hover:shadow-glow transition-all duration-300"
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
