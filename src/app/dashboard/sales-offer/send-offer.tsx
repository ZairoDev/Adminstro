"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import AddressDetails from "./address-details";
import { useSalesOfferStore } from "./useSalesOfferStore";

export default function SendOffer() {
  const { setField } = useSalesOfferStore();

  return (
    <div className=" border border-neutral-600 rounded-md p-2">
      <p className=" font-semibold text-xl">Send Offer</p>

      {/* Offer Details */}
      <div className=" grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-x-4">
        {/* Name */}
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            type="text"
            id="name"
            name="name"
            onChange={(e) => setField("name", e.target.value)}
          />
        </div>

        {/* Property Name */}
        <div>
          <Label htmlFor="propertyName">Property Name</Label>
          <Input
            type="text"
            id="propertyName"
            name="propertyName"
            onChange={(e) => setField("propertyName", e.target.value)}
          />
        </div>

        {/* Relation */}
        <div>
          <Label htmlFor="relation">Relation</Label>
          <Input
            type="text"
            id="relation"
            name="relation"
            onChange={(e) => setField("relation", e.target.value)}
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            name="email"
            onChange={(e) => setField("email", e.target.value)}
          />
        </div>

        {/* URL */}
        <div>
          <Label htmlFor="propertyUrl">URL</Label>
          <Input
            type="text"
            id="propertyUrl"
            name="propertyUrl"
            onChange={(e) => setField("propertyUrl", e.target.value)}
          />
        </div>
      </div>

      {/* Address Details */}
      <AddressDetails />
    </div>
  );
}
