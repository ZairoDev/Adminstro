import mongoose, { ObjectId } from "mongoose";

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
  phone: string;
  aadhar: string;
  dateOfJoining: string;
  experience: string;
  alias: string;
  country: string;
  address: string;
  isVerified: boolean;
  isActive?: boolean;
  role: [string];
  createdAt: string;
  updatedAt: string;
}

export interface PropertiesDataType {
  _id: string;
  VSID: string;
  commonId: string;
  email: string;
  userID: string;
  portionNo: string;
  rentalType: string;
  isInstantBooking: boolean;
  propertyType: string;
  rentalForm: string;
  propertyName: string;
  placeName: string;
  newPlaceName: string;
  street: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
  center: object;
  size: number;
  guests: number;
  bedrooms: number;
  beds: number;
  bathroom: number;
  kitchen: number;
  childrenAge: number;
  basePrice: number;
  weekendPrice: number;
  weeklyDiscount: number;
  pricePerDay: number[][];
  basePriceLongTerm: number;
  monthlyDiscount: number;
  currency: string;
  icalLinks: object;
  generalAmenities: object;
  otherAmenities: object;
  safeAmenities: object;
  smoking: string;
  pet: string;
  party: string;
  cooking: string;
  additionalRules: string[];
  reviews: string;
  newReviews: string;
  propertyImages: string[];
  propertyCoverFileUrl: string;
  propertyPictureUrls: string[];
  night: number[];
  time: number[];
  datesPerPortion: [];
  area?: string;
  subarea?: string;
  neighbourhood?: string;
  floor?: string;
  isTopFloor?: boolean;
  orientation?: string;
  levels?: number;
  zones?: string;
  propertyStyle?: string;
  constructionYear?: number;
  isSuitableForStudents?: boolean;
  monthlyExpenses?: number;
  heatingType?: string;
  heatingMedium?: string;
  energyClass?: string;
  nearbyLocations: nearbyLocationInterface;
  hostedFrom?: string;
  hostedBy?: string;
  listedOn?: string[];
  lastUpdatedBy?: string[];
  lastUpdates?: string[];
  isLive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export interface QuickListingInterface {
  QID: string;
  ownerName: string;
  ownerMobile: string;
  propertyName: string;
  propertyImages: string[];
  description: string;
  basePrice: number;
  address: string;
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

export interface IQuery {
  _id?: string;
  isViewed?: boolean;
  leadQualityByReviewer?: string;
  rejectionReason?: string | null;
  budgetFrom?: string;
  budgetTo?: string;
  leadQualityByCreator?: string;
  name: string;
  email: string;
  duration: string;
  startDate: string;
  endDate: string;
  phoneNo: number;
  area: string;
  guest: number;
  budget: string;
  noOfBeds: number;
  location: string;
  bookingTerm: string;
  zone: string;
  billStatus: string;
  typeOfProperty: string;
  propertyType: string;
  priority: string;
  salesPriority: string;
  leadStatus?: string;
  note?: NotesInterface[];
  reminder: Date;
  roomDetails: {
    roomId: string;
    roomPassword: string;
  };
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface imageInterface {
  propertyCoverFileUrl: number[];
  propertyPictureUrls: number[];
  portionCoverFileUrls: number[];
  portionPictureUrls: string[];
}

export interface NotesInterface {
  noteData: string;
  createdBy: string;
  createOn: string;
}

export interface TokenInterface {
  id: string;
  name: string;
  email: string;
  role: string;
  allotedArea?: string;
}

export interface SalesOfferInterface {
  phoneNumber: string;
  leadStatus: string;
  note: string;
  name: string;
  propertyName: string;
  relation: string;
  email: string;
  propertyUrl: string;
  services: string;
  country: string;
  state: string;
  city: string;
  plan: string;
  discount: number;
  effectivePrice: number;
  expiryDate: Date | null;
  callBackDate: Date | null;
  callBackTime: string | null;
  platform: "VacationSaga" | "TechTunes";
  availableOn?: ("VacationSaga" | "TechTunes")[] | [];
  setField: (field: keyof SalesOfferInterface, value: any) => void;
  resetForm: () => void;
}

export interface OwnerInterface {
  _id?: string;
  phoneNumber: number;
  email?: string;
  propertyName: string;
  propertyUrl: string;
  propertyAlreadyAvailableOn: string[];
  country: string;
  state: string;
  city: string;
  area: string;
  disposition?: string;
  note?: string;
  callback?: string;
}

export interface CatalogueInterface {
  addCatalogueModal: boolean;
  setField: (field: keyof CatalogueInterface, value: any) => void;
}

export interface AliasInterface {
  aliasName: string;
  aliasEmail: string;
  aliasEmailPassword: string;
  status: "Active" | "Inactive";
  assignedTo: string;
  createdAt: Date;
}
export interface RoomInterface {
  _id: string;
  name: string;
  lead: mongoose.Types.ObjectId;
  participants: [string];
  showcaseProperties: [];
  favouriteProperties: [];
  rejectedProperties: [];
  isActive: boolean;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilterInterface {
  guest: number;
  noOfBeds: number;
  propertyType: "Un-furnished" | "Semi-furnished" | "Furnished";
  billStatus: "With Bill" | "Without Bill";
  budgetFrom: number;
  budgetTo: number;
  from: string;
  to: string;
  leadQualityByCreator?: "Very Good" | "Good" | "Average" | "Below Average";
  leadQualityByReviewer?: "Very Good" | "Good" | "Average" | "Below Average";
}

export const rentalTypes: string[] = ["Short Term", "Long Term"];
