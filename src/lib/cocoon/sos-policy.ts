import { z } from "zod";
import type { DemoState } from "./types";
export const sosPreferencesSchema = z.object({
  guardianIds: z.array(z.string()).nullable(),
  responders: z.boolean(),
  authorities: z.boolean(),
  nearby: z.boolean(),
});
export type SosPreferences = z.infer<typeof sosPreferencesSchema>;
export const DEFAULT_SOS_PREFERENCES: SosPreferences = {
  guardianIds: null,
  responders: false,
  authorities: false,
  nearby: false,
};
export function selectedSosGuardians(s: DemoState, ids: string[] | null | undefined) {
  const accepted = s.contacts.filter(
    (c) => c.travellerId === s.actorIds.traveller && c.status === "accepted",
  );
  return [
    ...new Set(
      accepted.filter((c) => ids == null || ids.includes(c.guardianId)).map((c) => c.guardianId),
    ),
  ];
}
