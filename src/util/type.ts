export interface MiddlweareInterface {
  name: string;
  email: string;
  role?: string;
  id: string;
  exp: Date;
  iat: Date;
}

export interface EmployeeInterface {
  _id: string;
  name: string;
  email: string;
  profilePic: string;
  nationality: string;
  gender: string;
  spokenLanguage: string;
  accountNo: string;
  ifsc: string;
  phone:string;
  aadhar:string;
  dateOfJoining:string;
  experience:string;
  alias:string;
  country: string;
  address: string;
  isVerified:boolean;
  role: [string];
  createdAt: string;
  updatedAt: string;
}




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

export interface nearbyLocationInterface {
  nearbyLocationName: string[];
  nearbyLocationDistance: number[];
  nearbyLocationTag: string[];
  nearbyLocationUrl?: string[];
}

export interface Property {
  _id: string;
  id?: string;
  userId?: string;
  VSID?: string;
  email?: string;

  propertyType?: string;
  placeName?: string;
  newPlaceName?: string;
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

  phone?: string;
  name?: string;
  portionName?: string[];
  portionSize?: number[];
  guests?: number[];
  bedrooms: number[];
  beds?: number[];
  bathroom?: number[];
  kitchen?: number[];
  childrenAge?: number[];

  longTermMonths?: number[];

  rentalType?: string;

  updatedAt?: string;

  weeklyDiscount?: number[];

  basePrice?: number[];
  weekendPrice?: number[];
  monthlyDiscount?: number[];
  currency?: string;
  pricePerDay?: number[][][];
  icalLinks?: object;

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
  newReviews?: string;

  propertyCoverFileUrl: string;
  propertyPictureUrls?: string[];
  portionCoverFileUrls?: string[];
  portionPictureUrls?: string[][];

  monthlyDiscountLongTerm?: [Number];
  night?: number[];
  time?: number[];
  datesPerPortion?: number[][];

  area: string;
  subarea?: string;
  neighbourhood?: string;
  floor?: number;
  isTopFloor?: boolean;
  orientation?: string;
  levels?: number;
  zones?: string;
  propertyStyle?: string;
  isSuitableForStudents?: boolean;
  monthlyExpenses?: string;
  heatingMedium?: string;
  energyClass?: string;
  heatingType?: string;
  constructionYear?: string;

  nearbyLocations: nearbyLocationInterface;

  hostedFrom?: string;
  hostedBy?: string;
  listedOn?: string[];
  lastUpdatedBy?: string[];
  lastUpdates?: string[][];

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

export interface imageInterface {
  propertyCoverFileUrl: number[];
  propertyPictureUrls: number[];
  portionCoverFileUrls: number[];
  portionPictureUrls: string[];
}

export const rentalTypes: string[] = ["Short Term", "Long Term"];
