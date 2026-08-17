/**
 * Identity and contact. Everything here comes from content/resume.md.
 * Nothing in this file may be invented. CLAUDE.md §7.
 */

export interface ProfileLink {
  readonly label: string;
  readonly href: string;
  readonly display: string;
}

export const profile = {
  name: "Alan Douglas",
  role: "Chief Technology Officer",
  discipline: "Payments & digital wallet infrastructure",
  location: "Lagos, Nigeria · Remote",

  /** Positioning, not a job title. Two lines maximum in the hero. */
  headline: "I build the systems that move money, and the teams that keep them honest.",

  lede:
    "Six years of payment infrastructure: cross-border remittance, digital wallets, " +
    "signed append-only ledgers and payout rails. Currently CTO at Lisah Technologies, " +
    "where I own architecture, governance and reliability. I set the architecture and " +
    "I still review the pull requests.",

  summary:
    "Engineering leader with 6+ years building and operating payment infrastructure, " +
    "digital wallets, and cross-border money movement systems. Hands-on across remittance " +
    "platforms, crypto and stablecoin wallet applications, append-only financial ledgers, " +
    "and payout rail integrations.",

  email: "aland6209@gmail.com",
  phone: "+234 813 381 4442",

  links: [
    { label: "Email", href: "mailto:aland6209@gmail.com", display: "aland6209@gmail.com" },
    {
      label: "LinkedIn",
      href: "https://linkedin.com/in/alandouglasdan",
      display: "linkedin.com/in/alandouglasdan",
    },
    {
      label: "GitHub",
      href: "https://github.com/AlanDouglasDan",
      display: "github.com/AlanDouglasDan",
    },
  ] satisfies readonly ProfileLink[],

  /** Where "Read the source" links point. */
  repositoryUrl: "https://github.com/AlanDouglasDan/alan-portfolio",
} as const;

export function sourceUrl(path: string): string {
  return `${profile.repositoryUrl}/blob/main/${path}`;
}
