"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { E164Number } from "libphonenumber-js/core";

import { IQuery } from "@/util/type";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneInputLayout } from "@/components/PhoneInputLayout";

import { LeadCard } from "./lead-card";

const GuestWindow = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState<E164Number>();
  const [checking, setChecking] = useState(false);
  const [numberStatus, setNumberStatus] = useState("");
  const [availableLeads, setAvailableLeads] = useState<IQuery[]>([]);

  const handleNumberSearch = async () => {
    try {
      if (!phone) {
        setNumberStatus("Please enter a phone number.");
        return;
      }
      setChecking(true);
      const response = await axios.post("/api/sales/checkNumber", {
        phoneNo: phone,
      });
      if (response.data.success) {
        if (response.data.exists) {

          setAvailableLeads([response.data.data]);
          setNumberStatus("❌ Phone number already exists.");
        } else {
          setNumberStatus("✅ Phone number is available.");
          setAvailableLeads([]);
        }
        setChecking(false);
      } else {
        setNumberStatus("Error checking the phone number. Try again.");
      }
      setChecking(false);
    } catch (error) {
      console.error("Error:", error);
      setNumberStatus("Server error. Please try again later.");
      setChecking(false);
    }
  };

  const handleNameSearch = async () => {

    try {
      if (!name) return;
      const leads = await axios.post("/api/sales/checkName", { name });
      if (leads.data.exists) {
        setAvailableLeads(leads.data.data);
      } else {
        setAvailableLeads([]);
      }

    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast({
          title: "Unable to search name",
          variant: "destructive",
        });
      }
    } finally {
      setNumberStatus("");
    }
  };

  useEffect(() => {

  }, [availableLeads]);

  return (
    <div className=" w-full flex flex-col justify-start items-start">
      <div className=" flex flex-col gap-y-2">
        <div>
          <h2 className=" font-semibold text-xl">Check Lead</h2>
          <h3 className=" font-medium mt-2">Check the lead for uniqueness</h3>
        </div>
        <div className="flex justify-between w-full items-center gap-4">
          <div className=" flex gap-x-2 items-end">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Name of the guest"
                onChange={(e) => setName(e.target.value)}
                className=""
              />
            </div>
            <Button onClick={handleNameSearch} disabled={!name}>
              Check
            </Button>
          </div>
          <div>
            <div className=" flex gap-x-2 items-end">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <PhoneInputLayout
                  className=" border rounded-lg"
                  onChange={(phone) => setPhone(phone)}
                />
              </div>
              <Button onClick={handleNumberSearch} disabled={!phone || checking}>
                Check
              </Button>
            </div>
            {numberStatus && <div className="mt-2 text-sm">{numberStatus}</div>}
          </div>
        </div>
      </div>

      {/* Available Leads */}
      <div className=" mt-8 flex flex-col items-center w-full">
        {availableLeads.length > 0 &&
          availableLeads?.map((lead) => <LeadCard key={lead._id} lead={lead} />)}
        {availableLeads.length == 0 && <p> No Data</p>}
      </div>
    </div>
  );
};
export default GuestWindow;
