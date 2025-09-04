"use client";

import { useState, type ChangeEvent } from "react";
// import type { InvoiceData, ComputedTotals } from "./types";
import { eur } from "./format";
import type { ComputedTotals, InvoiceData } from "../page";

type Props = {
  value: InvoiceData;
  computed: ComputedTotals;
  onChange: (patch: Partial<InvoiceData>) => void;
};
type AddonType = "Listing Subscription" | "Booking Commission";
export function InvoiceForm({ value, onChange, computed }: Props) {
  const [addonType, setAddonType] = useState<AddonType>("Listing Subscription");
  const [sacCode, setSacCode] = useState("9983");

  const handleAddonChange = (value: AddonType) => {
    setAddonType(value);

    if (value === "Listing Subscription") {
      setSacCode("9983");
    } else if (value === "Booking Commission") {
      setSacCode("9985");
      // you can also trigger additional booking-commission logic here
    }
    onChange({
      bookingType: value,
      sacCode: value === "Listing Subscription" ? 9983 : 9985,
    });
  };
  const handle =
    (key: keyof InvoiceData) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const isNumber = [
        "amount",
        "sgst",
        "igst",
        "cgst",
        "persons",
        "unitPrice",
      ].includes(key as string);
      const val = isNumber ? Number(e.target.value || 0) : e.target.value;
      onChange({ [key]: val } as Partial<InvoiceData>);
    };

  return (
    <form className="grid grid-cols-1 gap-4">
      {/* Customer */}
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-muted-foreground">
          Bill To
        </legend>
        <label className="grid gap-1">
          <span className="text-sm">Name</span>
          <input
            className="h-9 rounded-md border bg-background px-3"
            value={value.name}
            onChange={handle("name")}
            placeholder="Customer name"
            required
          />
        </label>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm">Email</span>
            <input
              className="h-9 rounded-md border bg-background px-3"
              value={value.email || ""}
              onChange={handle("email")}
              placeholder="name@example.com"
              type="email"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Phone</span>
            <input
              className="h-9 rounded-md border bg-background px-3"
              value={value.phoneNumber || ""}
              onChange={handle("phoneNumber")}
              placeholder="+00 000 000 0000"
            />
          </label>
        </div>
        <label className="grid gap-1">
          <span className="text-sm">Address</span>
          <input
            className="h-9 rounded-md border bg-background px-3"
            value={value.address || ""}
            onChange={handle("address")}
            placeholder="Street, City, Postal"
          />
        </label>
      </fieldset>

      {/* Invoice meta */}
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-muted-foreground">
          Invoice Meta
        </legend>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm">Date</span>
            <input
              type="date"
              className="h-9 rounded-md border bg-background px-3"
              value={value.invoiceDate || ""}
              onChange={handle("invoiceDate")}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Status</span>
            <select
              className="h-9 rounded-md border bg-background px-3"
              value={value.status}
              onChange={handle("status")}
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
      </fieldset>

      {/* Booking details */}
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-muted-foreground">
          Booking
        </legend>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm">Type</span>
            <select
              className="h-9 rounded-md border bg-background px-3"
              value={value.bookingType}
              onChange={(e) => {
                handleAddonChange(e.target.value as AddonType);
              }}
            >
              <option value="Booking Commission">Booking Commission</option>
              <option value="Listing Subscription">Listing Subscription</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Check In</span>
            <input
              type="date"
              className="h-9 rounded-md border bg-background px-3"
              value={value.checkIn || ""}
              onChange={handle("checkIn")}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Check Out</span>
            <input
              type="date"
              className="h-9 rounded-md border bg-background px-3"
              value={value.checkOut || ""}
              onChange={handle("checkOut")}
            />
          </label>
        </div>
      </fieldset>

      {/* Line item */}
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-muted-foreground">
          Line Item
        </legend>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm">Description</span>
            <input
              className="h-9 rounded-md border bg-background px-3"
              value={value.description}
              onChange={handle("description")}
              placeholder="Service description"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">SAC Code</span>
            <input
              type="number"
              min={1}
              className="h-9 rounded-md border bg-background px-3"
              value={sacCode}
              readOnly
              // onChange={handle("sacCode")}
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm">Amount</span>
            <input
              type="number"
              step="0.01"
              className="h-9 rounded-md border bg-background px-3"
              value={value.amount}
              onChange={handle("amount")}
              placeholder="If set, used as base amount"
            />
          </label>
          <div className="grid gap-1">
            <span className="text-sm">Line Amount</span>
            <div className="h-9 rounded-md border bg-muted px-3 leading-9">
              {eur(computed.total)}
            </div>
          </div>
        </div>
      </fieldset>

      {/* Taxes */}
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-muted-foreground">
          Taxes
        </legend>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm">SGST</span>
            <input
              type="number"
              step="0.01"
              className="h-9 rounded-md border bg-background px-3"
              value={value.sgst}
              onChange={handle("sgst")}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">IGST</span>
            <input
              type="number"
              step="0.01"
              className="h-9 rounded-md border bg-background px-3"
              value={value.igst}
              onChange={handle("igst")}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">CGST</span>
            <input
              type="number"
              step="0.01"
              className="h-9 rounded-md border bg-background px-3"
              value={value.cgst}
              onChange={handle("cgst")}
            />
          </label>
        </div>
      </fieldset>

      {/* Summary preview */}
      <div className="grid grid-cols-1 gap-2 rounded-md border p-3 text-sm">
        <div className="flex items-center justify-between">
          <span>Sub Total</span>
          <span>{eur(computed.subTotal)}</span>
        </div>
        {/* <div className="flex items-center justify-between">
          <span>Discount</span>
          <span>{eur(computed.discount)}</span>
        </div> */}
        <div className="flex items-center justify-between">
          <span>IGST</span>
          <span>{eur(computed.taxes.igst)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>SGST</span>
          <span>{eur(computed.taxes.sgst)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>CGST</span>
          <span>{eur(computed.taxes.cgst)}</span>
        </div>
        <div className="border-t pt-2 font-medium">
          <div className="flex items-center justify-between">
            <span>Total</span>
            <span>{eur(computed.total)}</span>
          </div>
        </div>
      </div>

      {/* Company address */}
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-muted-foreground">
          Company Address
        </legend>
        <input
          className="h-9 rounded-md border bg-background px-3"
          value={value.companyAddress || ""}
          onChange={handle("companyAddress")}
          placeholder="Company address"
        />
      </fieldset>
    </form>
  );
}
