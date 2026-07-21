export type TravellerBookingStatus = "pending" | "confirmed" | "cancelled";
export type TravellerPaymentStatus = "pending" | "paid" | "refunded";

export type TravellerBookingListItem = {
  _id: string;
  primaryGuestName: string;
  propertyLabel: string;
  startDate: string;
  endDate: string;
  totalNights: number;
  price: number;
  bookingStatus: TravellerBookingStatus;
  paymentStatus: TravellerPaymentStatus;
  guests?: { adults: number; children: number; infants: number };
  travellers?: Array<{
    name: string;
    age: string;
    gender: string;
    nationality: string;
    type: string;
  }>;
  traveller?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  property?: {
    _id?: string;
    placeName?: string;
    propertyName?: string;
    city?: string;
    country?: string;
    VSID?: string;
    propertyCoverFileUrl?: string;
  } | null;
  owner?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type TravellerBookingsLatestResponse = {
  bookings: TravellerBookingListItem[];
  totalCount: number;
  latestId: string | null;
  latestCreatedAt: string | null;
  polledAt: string;
};

export const TRAVELLER_BOOKINGS_SEEN_KEY = "adminstro:traveller-bookings:last-seen-id";
export const TRAVELLER_BOOKINGS_POLL_MS = 5_000;
