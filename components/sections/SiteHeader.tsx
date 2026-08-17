"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
import { profile } from "@/content/profile";

const NAV = [
  { href: "/ledger", label: "Ledger demo" },
  { href: "/work", label: "Work" },
  { href: "/approach", label: "Approach" },
  { href: "/about", label: "About" },
  { href: "/resume", label: "Resume" },
] as const;

export interface SiteHeaderProps {
  initialTheme: "dark" | "light" | null;
}

export function SiteHeader({ initialTheme }: SiteHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-6 px-6 py-3">
        <Link
          href="/"
          className="group flex items-baseline gap-3 no-underline"
          aria-label={`${profile.name}, home`}
        >
          <span className="font-display text-body-l text-ink">{profile.name}</span>
          <span className="label hidden text-ink-faint sm:inline">
            {profile.role}
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1">
          <ul className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`label rounded-sm px-3 py-2 no-underline transition-colors ${
                      active
                        ? "text-signal"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <ThemeToggle initialTheme={initialTheme} />
        </nav>
      </div>

      {/* Mobile nav: a ruled strip rather than a hamburger, because five links
          do not need a menu. It wraps instead of scrolling sideways — a link
          sliced in half at the edge of the screen reads as a broken layout,
          not as an invitation to swipe. */}
      <ul className="flex flex-wrap items-center gap-x-1 gap-y-0.5 border-t border-rule px-3 py-1.5 md:hidden">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`label block rounded-sm px-2.5 py-1.5 no-underline ${
                  active ? "text-signal" : "text-ink-soft"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </header>
  );
}

/**
 * The system colour-scheme preference, read through the API React provides for
 * exactly this: an external store with a subscription and a server snapshot.
 * Mirroring it into state via an effect would render one frame with the wrong
 * label.
 */
function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia("(prefers-color-scheme: dark)");
      query.addEventListener("change", onStoreChange);
      return () => query.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
}

function ThemeToggle({ initialTheme }: { initialTheme: "dark" | "light" | null }) {
  const [theme, setTheme] = useState<"dark" | "light" | null>(initialTheme);
  const systemDark = useSystemPrefersDark();

  const isDark = theme === null ? systemDark : theme === "dark";

  const toggle = useCallback(() => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    // Fire and forget: the visual change has already happened, and the cookie
    // only matters for the next server render.
    void fetch("/api/theme", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme: next }),
    });
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      className="label ml-2 rounded-sm border border-rule px-3 py-2 text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
    >
      <span aria-hidden="true">{isDark ? "Light" : "Dark"}</span>
      <span className="sr-only">
        Switch to {isDark ? "light" : "dark"} theme
      </span>
    </button>
  );
}
