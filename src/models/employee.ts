import mongoose, { Schema, Document } from "mongoose";

import { EmployeeSchema } from "@/schemas/employee.schema";
import { DEFAULT_ORGANIZATION, ORGANIZATIONS } from "@/util/organizationConstants";

interface IEmployee extends Document, EmployeeSchema {
  pricingRule: {
    enabled: boolean;
    min: number | null;
    max: number | null;
  };
  organization: (typeof ORGANIZATIONS)[number];
  pricingRules: {
    all: { enabled: boolean; min: number | null; max: number | null };
    byLocation: Record<string, { enabled: boolean; min: number | null; max: number | null }>;
  };
  ownerPricingRules: {
    all: { enabled: boolean; min: number | null; max: number | null };
    byLocation: Record<string, { enabled: boolean; min: number | null; max: number | null }>;
  };
  propertyVisibilityRule: {
    enabled: boolean;
    allowedFurnishing: string[];
    allowedTypeOfProperty: string[];
  };
  propertyVisibilityRules: {
    all: { enabled: boolean; allowedFurnishing: string[]; allowedTypeOfProperty: string[] };
    byLocation: Record<
      string,
      { enabled: boolean; allowedFurnishing: string[]; allowedTypeOfProperty: string[] }
    >;
  };
  ownerVisibilityRules: {
    all: {
      enabled: boolean;
      allowedInteriorStatus: string[];
      allowedPropertyType: string[];
      allowedPetStatus: string[];
    };
    byLocation: Record<
      string,
      {
        enabled: boolean;
        allowedInteriorStatus: string[];
        allowedPropertyType: string[];
        allowedPetStatus: string[];
      }
    >;
  };
  guestLeadLocationBlock: {
    all: string[];
    byLocation: Record<string, { blocked: string[] }>;
  };
  ownerLocationBlock: {
    all: string[];
  };
}
export const employeeRoles = [
  "HR",
  "Admin",
  "Sales",
  "Sales-TeamLead",
  "hSale",
  "Guest",
  "Intern",
  "Advert",
  "LeadGen",
  "LeadGen-TeamLead",
  "Content",
  "Developer",
  "Subscription-Sales",
  "HAdmin",
] as const;

const employeeSchema = new Schema<IEmployee>(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
    },
    profilePic: {
      type: String,
      default: "",
    },
    nationality: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },
    spokenLanguage: {
      type: String,
      default: "English",
    },
    accountNo: {
      type: String,
      default: "",
    },
    ifsc: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      required: true,
    },
    aadhar: {
      type: String,
      default: "",
    },
    dateOfJoining: {
      type: Date,
      default: new Date(),
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    experience: {
      type: Number,
      default: 0,
    },
    alias: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },
    allotedArea: {
      type: [String],
      required: false,
    },
    assignedCountry: {
      type: String,
      default: "",
    },
    empType: {
      type: String,
      default: "",
    },
    salary: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: [
        "Intern",
        "Admin",
        "Advert",
        "LeadGen",
        "LeadGen-TeamLead",
        "Content",
        "Sales",
        "hSale",
        "Sales-TeamLead",
        "HR",
        "Developer",
        "Guest",
        "Subscription-Sales",
        "HAdmin",
      ],
      default: "Advert",
    },
    organization: {
      type: String,
      enum: [...ORGANIZATIONS],
      required: true,
      default: DEFAULT_ORGANIZATION,
    },
    duration: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    inactiveReason: {
      type: String,
      enum: ["terminated", "suspended", "abscond", null],
      default: null,
    },
    inactiveDate: {
      type: Date,
      default: null,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    isfeatured: {
      type: Boolean,
      default: false,
    },
    extras: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    passwordExpiresAt: {
      type: Date,
      default: () => {
        const now = new Date();
        now.setHours(now.getHours() + 24);
        return now;
      },
    },
    forgotPasswordToken: String,
    forgotPasswordTokenExpiry: Date,
    verifyToken: String,
    verifyTokenExpiry: Date,
    otpToken: Number,
    otpTokenExpiry: Date,
    warnings: {
      type: [
        {
          warningType: {
            type: String,
            enum: [
              "disciplineIssue",
              "lateAttendance",
              "unplannedLeaves",
              "poshWarning",
              "combinedWarning",
            ],
            required: true,
          },
          reason: { type: String, required: true },
          department: { type: String, required: true },
          reportingManager: { type: String, required: true },
          issuedBy: { type: String, required: true },
          issuedAt: { type: Date, default: Date.now },
          emailSent: { type: Boolean, default: false },
          notes: { type: String, default: "" },
        },
      ],
      default: [],
    },
    pips: {
      type: [
        {
          pipLevel: {
            type: String,
            enum: ["level1", "level2", "level3"],
            required: true,
          },
          startDate: { type: String, required: true },
          endDate: { type: String, required: true },
          concerns: { type: [String], default: [] },
          issuedBy: { type: String, required: true },
          issuedAt: { type: Date, default: Date.now },
          emailSent: { type: Boolean, default: false },
          status: {
            type: String,
            enum: ["active", "completed", "failed"],
            default: "active",
          },
          notes: { type: String, default: "" },
        },
      ],
      default: [],
    },
    appreciations: {
      type: [
        {
          appreciationType: {
            type: String,
            enum: [
              "outstandingContribution",
              "outstandingAchievement",
              "excellentAttendance",
            ],
            required: true,
          },
          reason: { type: String, required: true },
          issuedBy: { type: String, required: true },
          issuedAt: { type: Date, default: Date.now },
          emailSent: { type: Boolean, default: false },
          notes: { type: String, default: "" },
        },
      ],
      default: [],
    },
    uiRuleIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "EmployeeUiRule",
        },
      ],
      default: [],
    },
    pricingRule: {
      enabled: { type: Boolean, default: false },
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },
    pricingRules: {
      all: {
        enabled: { type: Boolean, default: false },
        min: { type: Number, default: null },
        max: { type: Number, default: null },
      },
      byLocation: {
        type: Map,
        of: new Schema(
          {
            enabled: { type: Boolean, default: false },
            min: { type: Number, default: null },
            max: { type: Number, default: null },
          },
          { _id: false },
        ),
        default: {},
      },
    },
    ownerPricingRules: {
      all: {
        enabled: { type: Boolean, default: false },
        min: { type: Number, default: null },
        max: { type: Number, default: null },
      },
      byLocation: {
        type: Map,
        of: new Schema(
          {
            enabled: { type: Boolean, default: false },
            min: { type: Number, default: null },
            max: { type: Number, default: null },
          },
          { _id: false },
        ),
        default: {},
      },
    },
    propertyVisibilityRule: {
      enabled: { type: Boolean, default: false },
      allowedFurnishing: { type: [String], default: [] }, // Furnished/Semi-furnished/Unfurnished
      allowedTypeOfProperty: { type: [String], default: [] }, // Studio/1 Bedroom/...
    },
    propertyVisibilityRules: {
      all: {
        enabled: { type: Boolean, default: false },
        allowedFurnishing: { type: [String], default: [] },
        allowedTypeOfProperty: { type: [String], default: [] },
      },
      byLocation: {
        type: Map,
        of: new Schema(
          {
            enabled: { type: Boolean, default: false },
            allowedFurnishing: { type: [String], default: [] },
            allowedTypeOfProperty: { type: [String], default: [] },
          },
          { _id: false },
        ),
        default: {},
      },
    },
    ownerVisibilityRules: {
      all: {
        enabled: { type: Boolean, default: false },
        allowedInteriorStatus: { type: [String], default: [] }, // Furnished/Semi-furnished/Unfurnished
        allowedPropertyType: { type: [String], default: [] }, // Studio/1 Bedroom/...
        allowedPetStatus: { type: [String], default: [] }, // Allowed/Not Allowed/None
      },
      byLocation: {
        type: Map,
        of: new Schema(
          {
            enabled: { type: Boolean, default: false },
            allowedInteriorStatus: { type: [String], default: [] },
            allowedPropertyType: { type: [String], default: [] },
            allowedPetStatus: { type: [String], default: [] },
          },
          { _id: false },
        ),
        default: {},
      },
    },
    guestLeadLocationBlock: {
      all: { type: [String], default: [] }, // if empty => allow all
      byLocation: {
        // reserved for future; keep structure consistent with other rule objects
        type: Map,
        of: new Schema(
          {
            blocked: { type: [String], default: [] },
          },
          { _id: false },
        ),
        default: {},
      },
    },
    ownerLocationBlock: {
      all: { type: [String], default: [] }, // if empty => allow all
    },
    isLoggedIn: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    lastLogout: {
      type: Date,
      default: null,
    },
    sessionId: {
      type: String,
      default: null,
    },

    sessionStartedAt: {
      type: Number,
      default: null,
    },

    tokenValidAfter: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const Employees =
  mongoose.models?.Employees ||
  mongoose.model<IEmployee>("Employees", employeeSchema);
export default Employees;
