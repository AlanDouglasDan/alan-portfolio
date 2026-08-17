import { Section, SectionHeading } from "@/components/primitives/Section";
import { profile } from "@/content/profile";

/**
 * Landing section 6. CLAUDE.md §6.1.
 *
 * No contact form. A form implies a queue; a CTO candidate should imply
 * availability.
 */
export function Contact() {
  return (
    <Section id="contact">
      <SectionHeading
        eyebrow="Contact"
        lede="If you are building payment infrastructure and need someone who has held the seat, the fastest route is email. No form, no queue."
      >
        Direct
      </SectionHeading>

      <ul className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
        {profile.links.map((link) => (
          <li key={link.href} className="bg-paper">
            <a
              href={link.href}
              {...(link.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="block h-full px-6 py-6 no-underline transition-colors hover:bg-paper-sunk"
            >
              <span className="label block text-ink-faint">{link.label}</span>
              <span className="mt-2 block font-sans text-body text-ink">
                {link.display}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-body-s text-ink-faint">
        Based in {profile.location}. Open to CTO and Head of Engineering roles in
        cross-border payments, wallets and payment infrastructure.
      </p>
    </Section>
  );
}
