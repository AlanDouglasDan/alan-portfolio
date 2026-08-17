import Link from "next/link";
import { profile } from "@/content/profile";

export function SiteFooter() {
  return (
    <footer className="rule-t mt-8">
      <div className="mx-auto w-full max-w-[1240px] px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-display-m text-ink">{profile.name}</p>
            <p className="label mt-2 text-ink-faint">
              {profile.role} · {profile.discipline}
            </p>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {profile.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="label text-ink-soft underline decoration-rule underline-offset-4 transition-colors hover:text-signal hover:decoration-signal"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/ledger"
                className="label text-ink-soft underline decoration-rule underline-offset-4 transition-colors hover:text-signal hover:decoration-signal"
              >
                Ledger demo
              </Link>
            </li>
          </ul>
        </div>

        <p className="label mt-8 text-ink-faint">
          Built with Next.js and a hand-written double-entry ledger. Press{" "}
          <kbd className="rounded-sm border border-rule px-1.5 py-0.5">⌘K</kbd> to
          navigate.
        </p>
      </div>
    </footer>
  );
}
