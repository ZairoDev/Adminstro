import mongoose, { Schema } from "mongoose";
import { DEFAULT_ORGANIZATION, ORGANIZATIONS } from "@/util/organizationConstants";

export const REJECTION_REASONS = [
  "Not Interested",
  "Language Barrier",
  "Not Connected",
  "Budget Issue",
  "Other",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

const validLeadStatus = [
  "Not Interested",
  "Language Barrier",
  "Call Back",
  "Not Connected",
  "Send Offer",
  "Reject Lead",
  "Blacklist Lead",
];

const validReminders = ["Reminder 1", "Reminder 2", "Reminder 3", "Last Reminder"];

const validOfferStatus = [
  "Draft",
  "Sent",
  "offer_sent",
  "Opened",
  "Replied",
  "Accepted",
  "Rejected",
  "Expired",
] as const;

const validLeadStages = ["pending", "assigned", "claimed", "converted", "rejected"] as const;

const offerSchema: Schema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"],
    },
    leadStatus: {
      type: String,
      required: [true, "Lead status is required"],
      enum: {
        values: validLeadStatus,
        message: "{VALUE} is not a valid lead status",
      },
    },
    note: {
      type: String,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    propertyName: {
      type: String,
      required: [true, "Property name is required"],
    },
    relation: {
      type: String,
      required: [true, "Relation is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      match: [/\S+@\S+\.\S+/, "Please enter a valid email address"],
    },
    propertyUrl: {
      type: String,
      required: [true, "Property URL is required"],
      // match: [/^https?:\/\/(?:www\.)?.+$/, "Please enter a valid URL"],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
    },
    state: {
      type: String,
    },
    city: {
      type: String,
    },
    plan: {
      type: String,
      required: [true, "Plan is required"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    pricePerProperty: {
      type: Number,
      min: [0, "Price per property cannot be negative"],
      default: 0,
    },
    propertiesAllowed: {
      type: Number,
      min: [1, "Properties allowed must be at least 1"],
      default: 1,
    },
    discountType: {
      type: String,
      enum: ["PER_PROPERTY", "TOTAL"],
      default: "TOTAL",
    },
    discountUnit: {
      type: String,
      enum: ["FIXED", "PERCENT"],
      default: "FIXED",
    },
    discountValue: {
      type: Number,
      min: [0, "Discount value cannot be negative"],
      default: 0,
    },
    totalPrice: {
      type: Number,
      min: [0, "Total price cannot be negative"],
      default: 0,
    },
    effectivePrice: {
      type: Number,
      required: [true, "Effective price is required"],
      min: [0, "Effective price cannot be negative"],
    },
    expiryDate: {
      type: Date,
      required: [false, "Expiry date is optional"],
    },
    callBackDate: {
      type: Date,
      required: [false, "Callback date is optional"],
    },
    callBackTime: {
      type: String,
      required: [false, "Callback time is optional"],
    },
    reminder: {
      type: [
        {
          reminderNo: {
            type: String,
            enum: {
              values: validReminders,
              message: "{VALUE} is not a valid reminder",
            },
            required: [true, "Reminder type is required"],
          },
          date: {
            type: Date,
            required: [true, "Reminder date is required"],
          },
        },
      ],
      validate: {
        validator: function (value: [{ reminderNo: string; date: Date }]) {
          const reminderNos = value.map((reminder) => reminder.reminderNo);
          return new Set(reminderNos).size === reminderNos.length;
        },
        message: "Reminder values must be unique.",
      },
    },
    platform: {
      type: String,
      enum: ["VacationSaga", "Holidaysera", "HousingSaga", "TechTunes"],
      required: [true, "Atleast one platform is required for sending Offer"],
    },
    availableOn: {
      type: ["VacationSaga", "Holidaysera", "HousingSaga", "TechTunes"],
      validate: {
        validator: function (value: string[]) {
          if (value.length === 0) {
            return true;
          }
          const validValues = ["VacationSaga", "Holidaysera", "HousingSaga", "TechTunes"];
          const isValid = value.every((v) => validValues.includes(v));
          return isValid;
        },
        message:
          'Array can only contain "VacationSaga" and/or "Holidaysera" and/or "HousingSaga" and/or "TechTunes"',
      },
      default: [],
    },
    services: {
      type: String,
    },
    sentBy: {
      type: {
        name: String,
        email: String,
        aliasName: String,
        aliasEmail: String,
      },
    },
    organization: {
      type: String,
      enum: [...ORGANIZATIONS],
      required: true,
      default: DEFAULT_ORGANIZATION,
      index: true,
    },
    leadStage: {
      type: String,
      enum: {
        values: [...validLeadStages],
        message: "{VALUE} is not a valid lead stage",
      },
      default: "pending",
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      default: null,
      index: true,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      enum: {
        values: ["manual", "excel_import"],
        message: "{VALUE} is not a valid source",
      },
      default: "manual",
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      default: null,
    },
    offerStatus: {
      type: String,
      enum: {
        values: [...validOfferStatus],
        message: "{VALUE} is not a valid offer status",
      },
      default: "Draft",
      index: true,
    },
    selectedByAdmin: {
      type: Boolean,
      default: false,
    },
    sentByEmployee: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      index: true,
    },
    aliasUsed: {
      type: Schema.Types.ObjectId,
      ref: "Aliases",
    },
    sentBySnapshot: {
      type: {
        name: String,
        email: String,
        aliasName: String,
        aliasEmail: String,
      },
    },
    emailContent: {
      type: String,
    },
    emailSubject: {
      type: String,
    },
    callbacks: {
      type: [
        {
          callbackNo: { type: Number, required: true },
          date: { type: Date, required: true },
          time: { type: String, default: "" },
          note: { type: String, default: "" },
          createdBy: { type: Schema.Types.ObjectId, ref: "Employees", default: null },
          createdByName: { type: String, default: "" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    rejectionReason: {
      type: String,
      enum: { values: [...REJECTION_REASONS, ""], message: "{VALUE} is not a valid rejection reason" },
      default: "",
    },
    rejectedAt: { type: Date, default: null },
    blacklistReason: { type: String, default: "" },
    blacklistedAt: { type: Date, default: null },
    emailEvents: {
      type: [
        {
          kind: {
            type: String,
            required: true,
          },
          category: {
            type: String,
            enum: ["REMINDER", "REBUTTAL"],
            required: true,
          },
          templateName: { type: String, default: "" },
          templateDisplayName: { type: String, default: "" },
          subjectSnapshot: { type: String, required: true },
          contentSnapshot: { type: String, required: true },
          sentAt: { type: Date, default: Date.now },
          sentBy: { type: Schema.Types.ObjectId, ref: "Employees", default: null },
          sentByName: { type: String, default: "" },
          templateId: { type: Schema.Types.ObjectId, ref: "EmailTemplates", default: null },
        },
      ],
      default: [],
    },
    history: {
      type: [
        {
          type: {
            type: String,
            enum: ["lead", "offer", "callback", "rejection", "blacklist", "reminder", "rebuttal"],
            required: true,
          },
          status: {
            type: String,
            required: true,
          },
          note: { type: String, default: "" },
          updatedBy: { type: Schema.Types.ObjectId, ref: "Employees", default: null },
          updatedByName: { type: String, default: "" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

offerSchema.index({ leadStatus: 1, organization: 1 });
offerSchema.index({ sentByEmployee: 1, organization: 1 });
offerSchema.index({ leadStage: 1, organization: 1 });
offerSchema.index({ assignedTo: 1, organization: 1 });
offerSchema.index({ organization: 1, rejectedAt: -1 });
offerSchema.index({ organization: 1, blacklistedAt: -1 });
offerSchema.index({ organization: 1, "callbacks.date": -1 });

export const Offer = mongoose.models.offer || mongoose.model("offer", offerSchema);
