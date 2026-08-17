"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMotionSafe } from "./useMotionSafe";

/**
 * Scroll reveal that fires exactly once. CLAUDE.md §5.3 — nothing on this site
 * re-animates on scroll-back; a reader on their second pass should not be made
 * to wait for the same fade twice.
 *
 * Deliberately built on IntersectionObserver and a CSS transition rather than
 * on Motion. This component is used on almost every section of the site, and a
 * one-shot opacity-and-translate fade needs no spring solver — pulling the
 * animation library into a route for this alone is weight with nothing to show
 * for it. Motion is still used where physics genuinely matters: the odometer,
 * the stamp-in rows, the money arc.
 *
 * The `noscript` rule in app/layout.tsx makes these visible with JS disabled,
 * so the content is never hidden behind a script that did not run.
 */

type Element = "div" | "li" | "tr" | "section";

export interface RevealProps {
  children: ReactNode;
  /** Seconds. Keep staggers between 0.05 and 0.08. CLAUDE.md §5.4. */
  delay?: number;
  className?: string;
  as?: Element;
}

export function Reveal({ children, delay = 0, className = "", as = "div" }: RevealProps) {
  const motionSafe = useMotionSafe();
  const ref = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setEntered(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Reduced motion still reveals the content — it simply arrives already there.
  const visible = entered || !motionSafe.enabled;
  const Component = as;

  return (
    <Component
      // @ts-expect-error one ref type across four intrinsic elements
      ref={ref}
      data-reveal={visible ? "in" : "out"}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: motionSafe.enabled && !visible ? "translateY(12px)" : "none",
        transition: motionSafe.enabled
          ? `opacity 520ms cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 520ms cubic-bezier(0.16,1,0.3,1) ${delay}s`
          : "none",
        willChange: visible ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </Component>
  );
}
