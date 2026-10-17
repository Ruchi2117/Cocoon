import { countryByCode } from "./locale";
export interface SafetyCardInput {
  country: string | null;
  securityName: string;
  securityNumber: string;
  trustedName: string;
  trustedNumber: string;
  date?: Date;
}
/** User-downloaded plain text card, readable offline without loading the web app. */
export function buildSafetyCard(p: SafetyCardInput) {
  const country = countryByCode(p.country);
  const numbers = country?.authorities
    .map(
      (a) =>
        `${a.name}: ${a.number}\n${a.what}\nVerified ${a.verifiedOn}. Source: ${a.sources[0]?.url ?? ""}`,
    )
    .join("\n\n");
  const contact = (name: string, number: string, fallback: string) =>
    number.trim() ? `${name.trim() || fallback}: ${number.trim()}` : `${fallback}: not added`;
  return [
    "COCOON / MY TRAVEL SAFETY CARD",
    `Saved ${(p.date ?? new Date()).toLocaleDateString()}`,
    `Country: ${country?.name ?? "Not selected — confirm your current country's emergency number"}`,
    "",
    "AUTHORITY CONTACTS",
    numbers ||
      "No verified directory for this selection. Check the local government's official emergency guidance before travelling.",
    "",
    "MY PEOPLE",
    contact(p.trustedName, p.trustedNumber, "Trusted person"),
    contact(p.securityName, p.securityNumber, "Campus / building security"),
    "",
    "BEFORE LEAVING",
    "Charge phone; carry power bank/cable, water, necessary medication and backup fare. Write down important contacts. Review the route and identify staffed public places. Consider sharing your plan with someone you trust.",
    "",
    "IF YOU FEEL UNSAFE",
    "If possible, move toward a staffed, public, well-lit place. Contact a trusted person. For immediate danger, call the local emergency service, state your location and follow the operator's instructions. Avoid confrontation if possible. Choose what is feasible for your circumstances.",
    "",
    "A CALMER MOMENT",
    "Only if you are somewhere comfortable: soften your shoulders and breathe gently in, then a little more slowly out. No breath holds. Stop if uncomfortable. Prioritize reaching help if there is immediate danger.",
    "",
    "Cocoon does not guarantee safety or contact emergency services. This file is a static copy and does not update. Keep it private if it includes personal numbers.",
  ].join("\n");
}
