export interface UserInterface {
  _id: string;
  address: string;
  bankDetails: string;
  createdAt: string;
  declinedRequests: any[];
  email: string;
  gender: string;
  isVerified: boolean;
  myRequests: any[];
  myUpcommingRequests: any[];
  name: string;
  nationality: string;
  password: string;
  phone: number;
  profilePic: string;
  role: string;
  spokenLanguage: string;
  updatedAt: string;
}

export interface Property {
  _id: string;
  id?: string;
  userId?: string;
  VSID?: string;

  propertyType?: string;
  placeName?: string;
  rentalForm?: string;
  numberOfPortions?: number;

  street?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
  center?: {
    lat: number;
    lng: number;
  };

  portionName?: string[];
  portionSize?: number[];
  guests?: number[];
  bedrooms: number[];
  beds?: number[];
  bathroom?: number[];
  kitchen?: number[];
  childrenAge?: number[];

  email?: string;
  lastUpdates?: string[][];
  longTermMonths?: number[];

  rentalType?: string;

  updatedAt?: string;

  weeklyDiscount?: number[];

  basePrice?: number[];
  weekendPrice?: number[];
  monthlyDiscount?: number[];
  currency?: string;

  basePriceLongTerm?: string[];

  generalAmenities?: object;
  otherAmenities?: object;
  safeAmenities?: object;

  smoking?: string;
  pet?: string;
  party?: string;
  cooking?: string;
  additionalRules?: string[];

  reviews?: string[];
  newReviews?: string[];

  propertyCoverFileUrl: string;
  propertyPictureUrls?: string[];
  portionCoverFileUrls?: string[];
  portionPictureUrls?: string[][];

  night?: number[];
  time?: number[];
  datesPerPortion?: number[][];

  isLive?: boolean;
}

export const propertyTypes: string[] = [
  "Hotel",
  "Cottage",
  "Villa",
  "Cabin",
  "Farm stay",
  "Houseboat",
  "Lighthouse",
  "Studio",
  "Apartment",
  "Penthouse",
  "Detached House",
  "Loft",
  "Maisonette",
  "Farmhouse",
  "Holiday Homes",
  "Farmstay",
  "Resort",
  "Lodge",
  "Apart Hotel",
];

export const rentalTypes: string[] = ["Short Term", "Long Term"];
