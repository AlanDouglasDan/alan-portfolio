"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

/**
 * The command palette is opened by a keystroke and by nothing else, so there is
 * no reason for its code to be in the first-load bundle of every route. This
 * mount is a keyboard listener and nothing more; the palette itself arrives on
 * the first Cmd/Ctrl+K.
 *
 * Without this, the palette sitting in the root layout put the whole animation
 * feature set on pages that have no animation at all — /about was paying for a
 * dialog nobody on that page had opened.
 */
const CommandPalette = dynamic(
  () => import("./CommandPalette").then((module) => module.CommandPalette),
  { ssr: false },
);

export function CommandPaletteMount() {
  const [requested, setRequested] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setRequested(true);
        setOpen((previous) => !previous);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  if (!requested) return null;
  return <CommandPalette open={open} onClose={close} />;
}
