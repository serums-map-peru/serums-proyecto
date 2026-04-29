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

type TeamMember = {
  name: string;
  role: string;
  initials: string;
  hue: string;
  socials: Array<{ icon: LucideIcon; href: string; label: string }>;
};

const team: TeamMember[] = [
  {
    name: "Mateo Vargas",
    role: "Founder & AI Lead",
    initials: "MV",
    hue: "from-primary to-accent",
    socials: [
      { icon: Linkedin, href: "#", label: "LinkedIn" },
      { icon: Instagram, href: "#", label: "Instagram" },
      { icon: Github, href: "#", label: "GitHub" },
    ],
  },
  {
    name: "Lucía Rojas",
    role: "Product Designer",
    initials: "LR",
    hue: "from-accent to-[var(--primary-glow)]",
    socials: [
      { icon: Linkedin, href: "#", label: "LinkedIn" },
      { icon: Instagram, href: "#", label: "Instagram" },
    ],
  },
  {
    name: "Diego Quispe",
    role: "Geo Data Engineer",
    initials: "DQ",
    hue: "from-[var(--primary-glow)] to-primary",
    socials: [
      { icon: Linkedin, href: "#", label: "LinkedIn" },
      { icon: Instagram, href: "#", label: "Instagram" },
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
            El equipo detrás <span className="text-gradient-brand">de Lisa.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Médicos, ingenieros y diseñadores construyendo el futuro del SERUMS en Perú.
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
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-card font-display text-4xl font-bold text-gradient-brand">
                    {m.initials}
                  </div>
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
