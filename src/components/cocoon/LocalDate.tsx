import { useHydrated } from "@tanstack/react-router";

const OPTIONS: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/** Fixed locale/zone for server render and hydration; the reader's own format right after. */
export function formatStableDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { ...OPTIONS, timeZone: "UTC" });
}

export function LocalDate({
  iso,
  options = OPTIONS,
}: {
  iso: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const hydrated = useHydrated();
  const text = hydrated
    ? new Date(iso).toLocaleDateString(undefined, options)
    : formatStableDate(iso);
  return <time dateTime={iso}>{text}</time>;
}
