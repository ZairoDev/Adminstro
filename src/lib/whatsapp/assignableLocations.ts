import {
  locationKeyFromDisplay,
  type LocationAssignUser,
  type PhoneLocationOption,
} from "@/lib/whatsapp/areaTokenUtils";
import {
  getAllConfiguredLocationEntries,
  isLocationConfiguredForWhatsApp,
} from "@/lib/whatsapp/phoneAreaConfigService";
import { filterAssignableLocationsForUser } from "@/lib/whatsapp/participantLocationPrivileges";

export type { PhoneLocationOption };

/**
 * All cities available for participant location assignment (union of every phone line),
 * filtered by the user's role and allotedArea.
 */
export async function getAssignableLocationOptionsForUser(
  user: LocationAssignUser
): Promise<PhoneLocationOption[]> {
  const all = await getAllConfiguredLocationEntries();
  return filterAssignableLocationsForUser(all, user);
}

/** Validate location assignment (any configured city; not tied to conversation phone line). */
export async function assertParticipantLocationAssignable(
  user: LocationAssignUser,
  displayLocation: string
): Promise<void> {
  const configured = await isLocationConfiguredForWhatsApp(displayLocation);
  if (!configured) {
    const err: { message: string; status: number } = {
      message:
        "This city is not configured on any WhatsApp line. Add it in Phone locations (SuperAdmin).",
      status: 400,
    };
    throw err;
  }

  const allowed = filterAssignableLocationsForUser(
    [{ displayName: displayLocation, locationKey: locationKeyFromDisplay(displayLocation) }],
    user
  );
  if (allowed.length === 0) {
    const err: { message: string; status: number } = {
      message: "Participant location is outside your assigned areas",
      status: 403,
    };
    throw err;
  }
}
