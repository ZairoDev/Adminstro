import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  RECURRING_FREQUENCIES,
  type ExpenseCategory,
  type ExpenseStatus,
  type RecurringFrequency,
} from "@/modules/finance/expense-sheet";

export type RecurringAmountEntry = {
  /** First month (YYYY-MM) this amount applies to. */
  fromMonth: string;
  amount: number;
};

export type RecurringExpenseDoc = {
  _id: Types.ObjectId;
  title: string;
  category: ExpenseCategory;
  vendor: string;
  notes: string;
  frequency: RecurringFrequency;
  startMonth: string;
  endMonth: string | null;
  isActive: boolean;
  amountHistory: RecurringAmountEntry[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RecurringExpenseMonthDoc = {
  _id: Types.ObjectId;
  recurringExpenseId: string;
  monthKey: string;
  skipped: boolean;
  amountOverride: number | null;
  status: ExpenseStatus;
  paidOn: Date | null;
  invoiceUrl: string;
  invoiceName: string;
};

export type ExpenseDoc = {
  _id: Types.ObjectId;
  monthKey: string;
  title: string;
  category: ExpenseCategory;
  vendor: string;
  notes: string;
  amount: number;
  status: ExpenseStatus;
  paidOn: Date | null;
  invoiceUrl: string;
  invoiceName: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const recurringExpenseSchema = new Schema<RecurringExpenseDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    vendor: { type: String, default: "", trim: true, maxlength: 120 },
    notes: { type: String, default: "", trim: true, maxlength: 500 },
    frequency: { type: String, enum: RECURRING_FREQUENCIES, required: true },
    startMonth: { type: String, required: true, match: MONTH_KEY_PATTERN },
    endMonth: { type: String, default: null, match: MONTH_KEY_PATTERN },
    isActive: { type: Boolean, default: true },
    amountHistory: {
      type: [
        new Schema(
          {
            fromMonth: { type: String, required: true, match: MONTH_KEY_PATTERN },
            amount: { type: Number, required: true, min: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    createdBy: { type: String, default: null },
  },
  { timestamps: true },
);

recurringExpenseSchema.index({ isActive: 1, startMonth: 1 });

const recurringExpenseMonthSchema = new Schema<RecurringExpenseMonthDoc>(
  {
    recurringExpenseId: { type: String, required: true },
    monthKey: { type: String, required: true, match: MONTH_KEY_PATTERN },
    skipped: { type: Boolean, default: false },
    amountOverride: { type: Number, default: null, min: 0 },
    status: { type: String, enum: EXPENSE_STATUSES, default: "pending" },
    paidOn: { type: Date, default: null },
    invoiceUrl: { type: String, default: "", trim: true, maxlength: 500 },
    invoiceName: { type: String, default: "", trim: true, maxlength: 180 },
  },
  { timestamps: true },
);

recurringExpenseMonthSchema.index({ recurringExpenseId: 1, monthKey: 1 }, { unique: true });
recurringExpenseMonthSchema.index({ monthKey: 1 });

const expenseSchema = new Schema<ExpenseDoc>(
  {
    monthKey: { type: String, required: true, match: MONTH_KEY_PATTERN },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    vendor: { type: String, default: "", trim: true, maxlength: 120 },
    notes: { type: String, default: "", trim: true, maxlength: 500 },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: EXPENSE_STATUSES, default: "pending" },
    paidOn: { type: Date, default: null },
    invoiceUrl: { type: String, default: "", trim: true, maxlength: 500 },
    invoiceName: { type: String, default: "", trim: true, maxlength: 180 },
    createdBy: { type: String, default: null },
  },
  { timestamps: true },
);

expenseSchema.index({ monthKey: 1, createdAt: 1 });

export const RecurringExpense: Model<RecurringExpenseDoc> =
  (mongoose.models?.RecurringExpense as Model<RecurringExpenseDoc> | undefined) ??
  mongoose.model<RecurringExpenseDoc>("RecurringExpense", recurringExpenseSchema, "recurringExpenses");

export const RecurringExpenseMonth: Model<RecurringExpenseMonthDoc> =
  (mongoose.models?.RecurringExpenseMonth as Model<RecurringExpenseMonthDoc> | undefined) ??
  mongoose.model<RecurringExpenseMonthDoc>(
    "RecurringExpenseMonth",
    recurringExpenseMonthSchema,
    "recurringExpenseMonths",
  );

export const Expense: Model<ExpenseDoc> =
  (mongoose.models?.Expense as Model<ExpenseDoc> | undefined) ??
  mongoose.model<ExpenseDoc>("Expense", expenseSchema, "expenses");
