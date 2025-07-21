import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneInputWithCountrySelect from "react-phone-number-input";
import { E164Number } from "libphonenumber-js/core";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/phone-input";
import { CheckCheckIcon } from "lucide-react";
import axios from "axios";

interface VisitFromSchema {
  phone: string;
}

const VisitModal = () => {
  const [visitFormValues, setVisitFormValues] = useState<VisitFromSchema>({
    phone: "",
  });

  const [numberStatus, setNumberStatus] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = () => {
    console.log("phone: ", visitFormValues.phone);
  };

  const handleNumberSearch = async () => {
    try {
      // if (!phone) {
      //   setNumberStatus("Please enter a phone number.");
      //   return;
      // }
      setChecking(true);
      // console.log("handle search: ", phone);
      const response = await axios.post("/api/sales/checkNumber", {
        phoneNo: String(visitFormValues.phone).replace(/\D/g, ""),
      });
      if (response.data.success) {
        if (response.data.exists) {
          setNumberStatus("❌ Phone number already exists.");
        } else {
          setNumberStatus("✅ Phone number is available.");
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

  return (
    <div>
      <h2>Visit Modal</h2>
      <div className=" flex justify-between gap-x-2">
        <div className="w-full py-2">
          <Label htmlFor="phone">Phone Number</Label>
          <PhoneInput
            // {...register("phone")}
            className="phone-input border-red-500"
            placeholder="Enter phone number"
            type="text"
            value={visitFormValues.phone}
            international
            countryCallingCodeEditable={false}
            // error={"Phone number required"}
            onChange={(value) =>
              setVisitFormValues((prev) => ({
                ...prev,
                phone: value as string,
              }))
            }
          />
          {numberStatus && <div className="mt-2 text-sm">{numberStatus}</div>}
        </div>
        <div className="mt-6 ml-1">
          <Button
            type="button"
            onClick={handleNumberSearch}
            // disabled={!phone || checking}
          >
            <CheckCheckIcon size={18} />
          </Button>
        </div>
      </div>
      <Button onClick={handleSubmit}>Click</Button>
    </div>
  );
};
export default VisitModal;
