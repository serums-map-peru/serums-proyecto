import Image from "next/image";
import { Bird, BriefcaseBusiness, Camera, GitBranch } from "lucide-react";

type SocialType = "github" | "twitter" | "linkedin" | "instagram";

type Member = {
  name: string;
  role: string;
  photoSrc: string;
  social: { type: SocialType; href: string };
};

const SOCIAL_ICON: Record<SocialType, typeof GitBranch> = {
  github: GitBranch,
  twitter: Bird,
  linkedin: BriefcaseBusiness,
  instagram: Camera,
};

export function Team({
  eyebrow,
  title,
  titleHighlight,
  titleEnd,
  members,
}: {
  eyebrow: string;
  title: string;
  titleHighlight: string;
  titleEnd: string;
  members: [Member, Member, Member, Member, Member];
}) {
  return (
    <section id="team" className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {title} <span className="text-gradient-brand">{titleHighlight}</span> {titleEnd}
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {members.map((m) => {
            const Icon = SOCIAL_ICON[m.social.type];
            const socialLabel =
              m.social.type === "linkedin"
                ? "LinkedIn"
                : m.social.type === "github"
                  ? "GitHub"
                  : m.social.type === "twitter"
                    ? "Twitter"
                    : "Instagram";

            return (
              <div
                key={m.name}
                className="group rounded-3xl border border-border bg-card p-6 shadow-soft transition-transform hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full border border-border bg-secondary">
                    <Image src={m.photoSrc} alt={m.name} fill sizes="56px" className="object-cover" />
                  </div>
                  <a
                    href={m.social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${socialLabel} de ${m.name}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground/70 transition-colors hover:bg-white"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </a>
                </div>
                <div className="mt-4">
                  <div className="font-display text-base font-extrabold text-foreground">{m.name}</div>
                  <div className="mt-1 text-sm font-semibold text-muted-foreground">{m.role}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
