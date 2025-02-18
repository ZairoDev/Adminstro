import mongoose, { Schema } from "mongoose";

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
      required: [true, "State is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
    },
    plan: {
      type: String,
      required: [true, "Plan is required"],
    },
    discount: {
      type: Number,
      required: [true, "Discount is required"],
      min: [0, "Discount cannot be negative"],
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
      enum: ["VacationSaga", "TechTunes"],
      required: [true, "Atleast one platform is required for sending Offer"],
    },
    availableOn: {
      type: ["VacationSaga", "TechTunes"],
      validate: {
        validator: function (value: string[]) {
          if (value.length === 0) {
            return true;
          }
          const validValues = ["VacationSaga", "TechTunes"];
          const isValid = value.every((v) => validValues.includes(v));
          return isValid;
        },
        message: 'Array can only contain "VacationSaga" and/or "TechTunes"',
      },
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Offer = mongoose.models.offer || mongoose.model("offer", offerSchema);
