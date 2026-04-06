import type { OwnerJourneyPayload } from "@/lib/owner-journey/types";
import type { VsIdRef } from "@/lib/owner-journey/types";

export interface HolidaySeraGuestListItem {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  profilePic: string;
  role: string;
  firstName?: string;
  lastName?: string;
  isVerified: boolean;
  isActive?: boolean;
  vsids?: VsIdRef[];
  vsids2?: VsIdRef[];
  ownerJourney?: OwnerJourneyPayload;
  createdAt?: string;
  updatedAt?: string;
}
