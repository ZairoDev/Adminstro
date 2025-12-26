import { Schema, models, model } from "mongoose";

const querySchema = new Schema(
  {
    createdBy: {
      type: String,
      required: [false],
    },
    isViewed: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: String,
      require: [true, "Duration is Required"],
    },
    name: {
      type: String,
      require: [true, "Name must be provided"],
    },
    email: {
      type: String,
      require: [true, "Email must be provided"],
    },
    phoneNo: {
      type: String,
      required: [true, "Phone number must be provided"],
      unique: true,
    },
    area: {
      type: String,
    },
    guest: {
      type: Number,
      require: [true, "Guest number should be provided"],
    },
    startDate: {
      type: String,
      require: [true, "Start Date is required"],
    },
    endDate: {
      type: String,
      require: [true, "End date is required"],
    },
    minBudget: {
      type: Number,
      require: [true, "Minimum budget is required"],
    },
    maxBudget: {
      type: Number,
      require: [true, "Maximum budget is required"],
    },
    noOfBeds: {
      type: Number,
      require: [true, "Count of beds shoule be provided"],
    },
    location: {
      type: String,
      require: [true, "Location shoule be provided"],
    },
    bookingTerm: {
      type: String,
      enum: ["Short Term", "Long Term", "Mid Term"],
      require: [true, "bookingTerm shoule be provided"],
    },
    zone: {
      type: String,
      enum: [
        "",
        "North",
        "South",
        "East",
        "West",
        "Center",
        "North-East",
        "North-West",
        "South-East",
        "South-West",
        "Anywhere",
      ],
    },
    metroZone: {
      type: String,
      enum: [
        "",
        "Blue Line",
        "Red Line",
        "Green Line",
        "Yellow Line",
        "Anywhere",
      ],
    },
    billStatus: {
      type: String,
      enum: ["With Bill", "Without Bill"],
    },
    leadStatus: {
      type: String,
    },
    propertyShown: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
    },
    leadQualityByReviewer: {
      type: String,
      enum: ["Good", "Very Good", "Average", "Below Average"],
      default: null,
    },
    leadQualityByCreator: {
      type: String,
      enum: ["Good", "Very Good", "Average", "Below Average"],
    },
    leadQualityByTeamLead: {
      type: String,
      enum: ["Approved", "Not Approved"],
    },
    rejectionReason: {
      type: String,
      enum: [
        "Not on whatsapp",
        "Not Replying",
        "Low Budget",
        "Blocked on whatsapp",
        "Late Response",
        "Delayed the Traveling",
        "Off Location",
        "Number of people exceeded",
        "Already got it",
        "Different Area",
        "Agency Fees",
        "Didn't like the option",
        "Low Duration",
      ],
      default: null,
    },
    typeOfProperty: {
      type: String,
      enum: [
        "Apartment",
        "Studio / 1 bedroom",
        "1 Bedroom",
        "2 Bedroom",
        "3 Bedroom",
        "4 Bedroom",
        "Villa",
        "Pent House",
        "Detached House",
        "Loft",
        "Shared Apartment",
        "Maisotte",
        "Studio",
      ],
    },
    propertyType: {
      type: String,
      enum: ["Furnished", "Unfurnished", "Semi-furnished"],
      require: [true, "Property type must be provided"],
    },
    priority: {
      type: String,
      enum: ["ASAP", "High", "Low", "Medium"],
      require: [true, "Priority must be provided"],
    },
    messageStatus: {
      type: String,
      enum: ["First", "Second", "Third", "Fourth", "Options", "Visit", "None"],
      require: [true, "Status must be provided"],
      default: "None",
    },
    // Indicates whether the lead (customer) has sent their first reply via WhatsApp
    firstReply: {
      type: Boolean,
      default: false,
    },
    // =========================================================
    // WHATSAPP RETARGETING FIELDS (Strict & Minimal)
    // =========================================================
    // These fields enable safe, traceable, ban-resistant retargeting.
    // All fields have defaults for backward compatibility.
    
    // Explicit opt-in: true when lead replies to first WhatsApp message
    // WHY: Only message leads who have engaged (prevents spam reports)
    whatsappOptIn: {
      type: Boolean,
      default: false,
    },
    
    // RETARGET COUNT: How many WhatsApp retarget attempts were made
    // WHY: Limit retargeting to MAX 3 attempts per lead to prevent ban
    // Incremented ONLY when API accepts the message (not on failures)
    whatsappRetargetCount: {
      type: Number,
      default: 0,
    },
    
    // LAST RETARGET DATE: When the last retarget message was sent
    // WHY: Enforce 24h cooldown between retarget attempts
    whatsappLastRetargetAt: {
      type: Date,
      default: null,
    },
    
    // PERMANENT BLOCK: Once true, this lead is NEVER messaged again
    // WHY: Prevents messaging users who blocked us or don't have WhatsApp
    // CRITICAL: Never flip this back to false
    whatsappBlocked: {
      type: Boolean,
      default: false,
    },
    
    // BLOCK REASON: Human-readable reason for the block
    // Values: "ecosystem_protection" | "number_not_on_whatsapp" | 
    //         "groups_not_eligible" | "manual_block" | null
    // WHY: Helps team understand why a lead was blocked
    whatsappBlockReason: {
      type: String,
      default: null,
    },
    
    // LAST ERROR CODE: The most recent WhatsApp API error code
    // Known codes: 131049 (blocked), 131021 (not on WA), 131026 (rate limit)
    // WHY: Used to filter out problematic numbers from retargeting
    whatsappLastErrorCode: {
      type: Number,
      default: null,
    },
    
    // LAST MESSAGE DATE: When any WhatsApp message was last sent
    // WHY: General tracking, distinct from retarget-specific date
    whatsappLastMessageAt: {
      type: Date,
      default: null,
    },
    salesPriority: {
      type: String,
      enum: ["High", "Low", "Medium","NR", "None"],
      require: [true, "Priority must be provided"],
      default: "None",
    },
    note: {
      type: [Object],
      require: false,
    },
    reminder: {
      type: Date,
    },
    roomDetails: {
      type: Object,
    },
    BoostID: {
      type: String,
    },
    updatedBy: {
      type: [String],
      default: [],
    },
    updates: {
      type: [String],
      default: [],
    },
    idName:{
      type: String,
      default: "",
    }
  },
  { timestamps: true }
);

const Query = models.Query || model("Query", querySchema);
export default Query;

