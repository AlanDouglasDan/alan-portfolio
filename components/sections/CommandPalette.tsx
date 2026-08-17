"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { caseStudies } from "@/content/work";
import { profile } from "@/content/profile";
import { useMotionSafe } from "@/components/motion/useMotionSafe";

interface Command {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly href: string;
  readonly external?: boolean;
}

const COMMANDS: readonly Command[] = [
  { id: "home", label: "Home", group: "Pages", href: "/" },
  { id: "ledger", label: "Ledger playground", group: "Pages", href: "/ledger" },
  { id: "work", label: "Selected work", group: "Pages", href: "/work" },
  { id: "approach", label: "How I run engineering", group: "Pages", href: "/approach" },
  { id: "about", label: "About", group: "Pages", href: "/about" },
  { id: "resume", label: "Resume", group: "Pages", href: "/resume" },
  ...caseStudies.map((study) => ({
    id: study.slug,
    label: `${study.title} · ${study.company}`,
    group: "Case studies",
    href: `/work/${study.slug}`,
  })),
  ...profile.links.map((link) => ({
    id: link.href,
    label: link.display,
    group: "Contact",
    href: link.href,
    external: true,
  })),
];

/**
 * Cmd/Ctrl+K navigation. CLAUDE.md §6.
 *
 * Keyboard-complete: arrows move, Enter opens, Escape closes and returns focus
 * to whatever had it before. The listbox carries the ARIA wiring so a screen
 * reader announces the active option as it changes.
 */
export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const motionSafe = useMotionSafe();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const listboxId = useId();

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return COMMANDS;
    return COMMANDS.filter((command) =>
      `${command.label} ${command.group}`.toLowerCase().includes(needle),
    );
  }, [query]);

  const close = useCallback(() => {
    onClose();
    setQuery("");
    setActive(0);
    restoreFocusTo.current?.focus();
  }, [onClose]);

  const run = useCallback(
    (command: Command) => {
      close();
      if (command.external) {
        window.open(command.href, "_blank", "noopener,noreferrer");
      } else {
        // `typedRoutes` cannot verify a route assembled from case-study slugs.
        // The slugs come from content/work, and generateStaticParams builds a
        // page for each, so every entry here resolves.
        router.push(command.href as Route);
      }
    },
    [close, router],
  );

  useEffect(() => {
    if (!open) return;
    // Remember where focus was so Escape can put it back. CLAUDE.md §8.
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
  }, [open]);

  function onQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    // Reset the highlight here rather than in an effect: the results list has
    // already changed by the time an effect would run, so the active index
    // would briefly point at the wrong row.
    setActive(0);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (results.length === 0 ? 0 : (current + 1) % results.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) =>
        results.length === 0 ? 0 : (current - 1 + results.length) % results.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const command = results[active];
      if (command !== undefined) run(command);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 p-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionSafe.enabled ? 0.15 : 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label="Navigate"
            className="w-full max-w-xl overflow-hidden rounded-md border border-rule bg-paper-raised shadow-[var(--shadow-lift)]"
            initial={{ opacity: 0, ...motionSafe.transform({ y: -8, scale: 0.98 }) }}
            animate={{ opacity: 1, ...motionSafe.transform({ y: 0, scale: 1 }) }}
            exit={{ opacity: 0, ...motionSafe.transform({ y: -8, scale: 0.98 }) }}
            transition={motionSafe.spring}
          >
            <div className="border-b border-rule px-4 py-3">
              <label htmlFor={`${listboxId}-input`} className="sr-only">
                Search pages
              </label>
              <input
                id={`${listboxId}-input`}
                ref={inputRef}
                value={query}
                onChange={onQueryChange}
                onKeyDown={onInputKeyDown}
                placeholder="Jump to…"
                autoComplete="off"
                role="combobox"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-activedescendant={
                  results[active] ? `${listboxId}-${results[active]?.id}` : undefined
                }
                className="w-full bg-transparent font-sans text-body-l text-ink outline-none placeholder:text-ink-faint"
              />
            </div>

            <ul
              id={listboxId}
              role="listbox"
              aria-label="Pages"
              className="max-h-[50vh] overflow-y-auto py-2"
            >
              {results.length === 0 ? (
                <li className="px-4 py-3 text-body-s text-ink-faint">Nothing matches.</li>
              ) : (
                results.map((command, index) => (
                  <li
                    key={command.id}
                    id={`${listboxId}-${command.id}`}
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => run(command)}
                    className={`flex cursor-pointer items-center justify-between gap-4 px-4 py-2.5 text-body-s ${
                      index === active ? "bg-paper-sunk text-ink" : "text-ink-soft"
                    }`}
                  >
                    <span>{command.label}</span>
                    <span className="label text-ink-faint">{command.group}</span>
                  </li>
                ))
              )}
            </ul>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
