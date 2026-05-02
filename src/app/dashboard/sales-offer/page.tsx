"use client";

import { z } from "zod";
import axios from "@/util/axios";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Check, CircleX, RotateCw, Save } from "lucide-react";

import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Input } from "@/components/ui/input";
import { SalesOfferInterface } from "@/util/type";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { PhoneInputLayout as PhoneInput } from "@/components/PhoneInputLayout";

import SendOffer from "./send-offer";
import PlanDetails from "./plan-details";
import { useSalesOfferStore } from "./useSalesOfferStore";
import EmailPreview from "./email-preview";
import { useOrgSelectionStore } from "./useOrgSelectionStore";
import { parseOfferPlan, serializeOfferPlan } from "@/util/offerPlan";

const FormSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((value) => value && isValidPhoneNumber(value), {
      message: "Invalid phone number",
    }),
});
type FormData = z.infer<typeof FormSchema>;
type LookupMatch = Partial<SalesOfferInterface> & {
  _id?: string;
  leadStatus?: string;
  offerStatus?: string;
  organization?: string;
  createdAt?: string;
  updatedAt?: string;
};

const SalesOffer = () => {
  const { toast } = useToast();
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);
  const [showAvailability, setShowAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState({
    Holidaysera: false,
    VacationSaga: false,
    HousingSaga: false,
  });

  const { leadStatus, setField, resetForm } = useSalesOfferStore();
  const [saveOfferLoading, setSaveOfferLoading] = useState(false);
  const [emailLookup, setEmailLookup] = useState("");
  const [matchedLead, setMatchedLead] = useState<LookupMatch | null>(null);

  useEffect(() => {
    if (!selectedOrg) return;
    setField("platform", selectedOrg);
    setField("availableOn", [selectedOrg]);
  }, [selectedOrg, setField]);

  useEffect(() => { 
    let mounted = true;
    async function loadLead() {
      if (typeof window === "undefined") return;
      const sp = new URLSearchParams(window.location.search);
      const leadId = sp.get("leadId");
      if (!leadId) return;

      const res = await axios.get(`/api/offers/${leadId}`);
      const lead = res.data?.offer as Partial<SalesOfferInterface> | undefined;
      if (!lead || !mounted) return;

      useSalesOfferStore.getState().setField("leadId", leadId);
      // useSalesOfferStore.getState().setField("leadStatus", "Send Offer");
      if (lead.phoneNumber) useSalesOfferStore.getState().setField("phoneNumber", lead.phoneNumber);
      if (lead.name) useSalesOfferStore.getState().setField("name", lead.name);
      if (lead.email) useSalesOfferStore.getState().setField("email", lead.email);
      if (lead.propertyUrl) useSalesOfferStore.getState().setField("propertyUrl", lead.propertyUrl);
      if (lead.country) useSalesOfferStore.getState().setField("country", lead.country);
      if (lead.city) useSalesOfferStore.getState().setField("city", lead.city);
      if (lead.state) useSalesOfferStore.getState().setField("state", lead.state);
      if (lead.propertyName) useSalesOfferStore.getState().setField("propertyName", lead.propertyName);
      if (lead.relation) useSalesOfferStore.getState().setField("relation", lead.relation);
    }
    loadLead().catch(() => {}); 
    return () => {
      mounted = false;
    };
  }, []);

  // Select Lead Status
  // const leadStatusSelector = () => {
  //   return (
  //     <div>
  //       <Label htmlFor="leadStatus">Lead Status</Label>
  //       <Select onValueChange={(value) => setField("leadStatus", value)}>
  //         <SelectTrigger className="w-[180px]">
  //           <SelectValue placeholder="Select Lead Status" />
  //         </SelectTrigger>
  //         <SelectContent>
  //           <SelectGroup>
  //             <SelectLabel>Status</SelectLabel>
  //             {leadStatuses.map((status, index) => (
  //               <SelectItem key={index} value={status}>
  //                 <div>{status}</div>
  //               </SelectItem>
  //             ))}
  //           </SelectGroup>
  //         </SelectContent>
  //       </Select>
  //     </div>
  //   );
  // };

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: { phone: "" },
  });

  const applyMatchedOffer = (matched: LookupMatch | null) => {
    if (!matched) return;

    if (matched._id) setField("leadId", matched._id);
    if (matched.phoneNumber) setField("phoneNumber", matched.phoneNumber);
    if (matched.name) setField("name", matched.name);
    if (matched.email) setField("email", matched.email);
    if (matched.propertyUrl) setField("propertyUrl", matched.propertyUrl);
    if (matched.country) setField("country", matched.country);
    if (matched.city) setField("city", matched.city);
    if (matched.state) setField("state", matched.state);
    if (matched.propertyName) setField("propertyName", matched.propertyName);
    if (matched.relation) setField("relation", matched.relation);
  };

  // check lead by phone/email for availability + prefill
  const checkLead = async (params: { phoneNumber?: string; email?: string; source: "phone" | "email" }) => {
    try {
      const response = await axios.post("/api/sales-offer/checkNumberInOffers", {
        phoneNumber: params.phoneNumber,
        email: params.email,
      });
      // Keep send-offer form visible after a successful lookup.
      setField("leadStatus", "Send Offer");
      if (params.phoneNumber) setField("phoneNumber", params.phoneNumber);
      if (params.email) setField("email", params.email);
      setIsAvailable((prev) => {
        const avail = { ...prev };
        avail.Holidaysera = !response.data.availableOnTT;
        avail.VacationSaga = !response.data.availableOnVS;
        avail.HousingSaga = !response.data.availableOnHS;
        return avail;
      });
      setShowAvailability(true);
      const matched = (response.data?.matchedOffer ?? null) as LookupMatch | null;
      setMatchedLead(matched);
      applyMatchedOffer(matched);
      if (matched) {
        toast({
          title: "Existing lead found",
          description:
            params.source === "phone"
              ? "Form was prefilled from the latest matching phone record."
              : "Form was prefilled from the latest matching email record.",
        });
      }
    } catch (error) {
      console.error("error in checking number: ", error);
      setMatchedLead(null);
      toast({
        title: "Lookup failed",
        description: "Could not search existing leads right now.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: FormData) => {
    checkLead({ phoneNumber: data.phone, source: "phone" });
    setField("phoneNumber", data.phone);
  };

  const handleEmailLookup = () => {
    const email = emailLookup.trim().toLowerCase();
    if (!email) {
      toast({
        title: "Email is required",
        description: "Enter an email before searching.",
        variant: "destructive",
      });
      return;
    }
    const emailValidation = z.string().email().safeParse(email);
    if (!emailValidation.success) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    setField("email", email);
    checkLead({ email, source: "email" });
  };

  {
    /*Save Offer*/
  }
  // const offerData = getSalesOfferStoreData();
  const handleSaveOffer = async () => {
    const offerData = useSalesOfferStore.getState();
    // console.log("offer Data: ", offerData);
    const requiredForSend: (keyof SalesOfferInterface)[] = [
      "phoneNumber",
      "leadStatus",
      "name",
      "propertyName",
      "relation",
      "email",
      "propertyUrl",
      "country",
      "plan",
      "platform",
    ];
    const emptyFields = requiredForSend.filter((key) => {
      const value = offerData[key];
      return value === "" || value === null || value === undefined;
    });
    if (emptyFields.length > 0 && offerData.leadStatus === "Send Offer") {
      toast({
        variant: "destructive",
        title: "Error in saving Offer",
        description: `Please fill all the fields - ${emptyFields.join(", ")}`,
      });
      return;
    }

    const isFreshForSelectedOrg =
      selectedOrg === "VacationSaga"
        ? isAvailable.VacationSaga
        : selectedOrg === "Holidaysera"
          ? isAvailable.Holidaysera
          : isAvailable.HousingSaga;
    if (offerData.leadStatus === "Send Offer" && showAvailability && selectedOrg && !isFreshForSelectedOrg) {
      toast({
        variant: "destructive",
        title: "Lead already exists",
        description: `This phone/email already exists for ${selectedOrg}. You cannot send a fresh offer.`,
      });
      return;
    }

    try {
      setSaveOfferLoading(true);
      if (offerData.leadStatus === "Send Offer") {
        const parsedPlan = parseOfferPlan(offerData.plan);
        const normalizedPlan = parsedPlan ? serializeOfferPlan(parsedPlan) : offerData.plan.trim();
        if (!normalizedPlan) {
          toast({
            title: "Plan is required",
            description: "Please select a valid plan before sending offer.",
            variant: "destructive",
          });
          return;
        }

        const orgForSend =
          selectedOrg ??
          (offerData.platform === "VacationSaga" ||
          offerData.platform === "Holidaysera" ||
          offerData.platform === "HousingSaga"
            ? offerData.platform
            : undefined);
        const payload = {
          leadId: offerData.leadId,
          aliasId: offerData.aliasId,
          organization: orgForSend,
          phoneNumber: offerData.phoneNumber,
          leadStatus: offerData.leadStatus,
          note: offerData.note,
          name: offerData.name,
          propertyName: offerData.propertyName,
          relation: offerData.relation,
          email: offerData.email,
          propertyUrl: offerData.propertyUrl,
          country: offerData.country,
          state: offerData.state,
          city: offerData.city,
          plan: normalizedPlan,
          pricePerProperty: offerData.pricePerProperty,
          propertiesAllowed: offerData.propertiesAllowed,
          discountType: offerData.discountType,
          discountUnit: offerData.discountUnit,
          discountValue: offerData.discountValue,
          totalPrice: offerData.totalPrice,
          discount: offerData.discount,
          effectivePrice: offerData.effectivePrice,
          expiryDate: offerData.expiryDate,
          services: offerData.services,
          platform: offerData.platform,
        };
        await axios.post("/api/offers/send", payload);
      } else {
        await axios.post("/api/sales-offer/addSalesOffer", offerData);
      }
      toast({
        title: "Success",
        description:
          leadStatus === "Send Offer" ? "Offer sent successfully" : "Offer submitted",
      });
      resetForm();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to save offer";
      console.log("error in frontend: ", message);
      toast({
        title: "Error in saving Offer",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaveOfferLoading(false);
      reset({
        phone: "",
      });
      setEmailLookup("");
      setShowAvailability(false);
      setMatchedLead(null);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-y-4">
      <Toaster />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex items-end gap-x-6 space-y-3 p-2 border border-neutral-600 rounded-md"
      >
        {/* Phone Input Field */}{" "}
        <div className="flex flex-col items-start ">
          <label htmlFor="phone" className="text-left font-medium">
            Phone Number
          </label>
          <div className=" flex items-center gap-x-8 py-2">
            <div className=" flex flex-col">
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    {...field}
                    id="phone"
                    placeholder="Enter a phone number"
                    className="w-full border rounded-lg"
                  />
                )}
              />
              <div>
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="p-2 bg-primary text-background rounded-md text-sm"
            >
              Submit
            </button>
          </div>
        </div>
        <div className="flex flex-col items-start">
          <label htmlFor="emailLookup" className="text-left font-medium">
            Email
          </label>
          <div className="flex items-center gap-x-2 py-2">
            <Input
              id="emailLookup"
              type="email"
              value={emailLookup}
              onChange={(e) => setEmailLookup(e.target.value)}
              placeholder="Enter an email"
              className="w-[240px]"
            />
            <button
              type="button"
              onClick={handleEmailLookup}
              className="p-2 bg-primary text-background rounded-md text-sm"
            >
              Search
            </button>
          </div>
        </div>
        {/* Availability */}
        {showAvailability && selectedOrg && (
          <div>
            <div
              className={`flex items-center gap-x-2 text-sm font-semibold ${
                (selectedOrg === "VacationSaga"
                  ? isAvailable.VacationSaga
                  : selectedOrg === "Holidaysera"
                    ? isAvailable.Holidaysera
                    : isAvailable.HousingSaga)
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {(selectedOrg === "VacationSaga"
                ? isAvailable.VacationSaga
                : selectedOrg === "Holidaysera"
                  ? isAvailable.Holidaysera
                  : isAvailable.HousingSaga) ? (
                <Check size={16} />
              ) : (
                <CircleX size={16} />
              )}
              <p>
                {(selectedOrg === "VacationSaga"
                  ? isAvailable.VacationSaga
                  : selectedOrg === "Holidaysera"
                    ? isAvailable.Holidaysera
                    : isAvailable.HousingSaga)
                  ? "Fresh Lead"
                  : "Used Lead"}{" "}
                for {selectedOrg}
              </p>
            </div>
          </div>
        )}
      </form>

      {matchedLead && (
        <div className="border border-neutral-600 rounded-md p-3">
          <p className="font-semibold text-base">Matched Lead Information</p>
          <div className="mt-2 text-sm grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            <p><span className="text-muted-foreground">Name:</span> {matchedLead.name || "—"}</p>
            <p><span className="text-muted-foreground">Email:</span> {matchedLead.email || "—"}</p>
            <p><span className="text-muted-foreground">Phone:</span> {matchedLead.phoneNumber || "—"}</p>
            <p><span className="text-muted-foreground">Property:</span> {matchedLead.propertyName || "—"}</p>
            <p><span className="text-muted-foreground">Lead Status:</span> {matchedLead.leadStatus || "—"}</p>
            <p><span className="text-muted-foreground">Offer Status:</span> {matchedLead.offerStatus || "—"}</p>
            <p><span className="text-muted-foreground">Organization:</span> {matchedLead.organization || "—"}</p>
            <p>
              <span className="text-muted-foreground">Last Updated:</span>{" "}
              {matchedLead.updatedAt ? format(new Date(matchedLead.updatedAt), "dd MMM yyyy, HH:mm") : "—"}
            </p>
          </div>
        </div>
      )}

      <div>{leadStatus === "Send Offer" && <SendOffer />}</div>
      <div>{leadStatus === "Send Offer" && <PlanDetails />}</div>
      <div>{leadStatus === "Send Offer" && <EmailPreview />}</div>

      <div className={`flex gap-x-4 mx-auto`}>
        <Button onClick={resetForm}>
          Reset <RotateCw className=" ml-1" size={16} />
        </Button>
        <Button onClick={handleSaveOffer} disabled={saveOfferLoading}>
          {saveOfferLoading ? "Saving..." : "Submit"} <Save className=" ml-1" size={16} />
        </Button>
      </div>
    </div>
  );
};
export default SalesOffer;
