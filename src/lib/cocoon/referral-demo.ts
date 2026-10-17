export interface ReferralDemo {
  code: string;
  joins: string[];
}
export const REFERRAL_KEY = "cocoon-referral-demo-v1";
export function readReferral(raw: string | null): ReferralDemo {
  try {
    const value = JSON.parse(raw || "{}");
    return {
      code:
        typeof value?.code === "string" && /^COCOON-[A-Z0-9]{8}$/.test(value.code)
          ? value.code
          : "",
      joins: Array.isArray(value?.joins)
        ? [
            ...new Set<string>(
              value.joins.filter(
                (v: unknown) => typeof v === "string" && /^preview-[1-3]$/.test(v),
              ),
            ),
          ].slice(0, 3)
        : [],
    };
  } catch {
    return { code: "", joins: [] };
  }
}
export function previewReferral(value: ReferralDemo): ReferralDemo {
  if (!value.code) return value;
  const id = ["preview-1", "preview-2", "preview-3"].find((id) => !value.joins.includes(id));
  return id ? { ...value, joins: [...value.joins, id] } : value;
}
export const referralCredits = (value: ReferralDemo) => value.joins.length * 10;
