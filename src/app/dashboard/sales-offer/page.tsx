"use client";

import { z } from "zod";
import axios from "@/util/axios";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { isValidPhoneNumber } from "react-phone-number-input";
import { Check, CircleX, RotateCw, Save } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="mx-auto mt-2  flex flex-col gap-6 pb-10">
      <Toaster />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Sales offer</h1>
        <p className="text-sm text-muted-foreground">
          Look up a lead by phone or email, then send or save the offer.
        </p>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-4 space-y-1">
          <CardTitle className="text-base font-semibold">Lead lookup</CardTitle>
          <CardDescription className="text-xs">
            Validates freshness for the selected organization before you compose the offer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end"
          >
            <div className="flex flex-col gap-2 min-w-[200px] flex-1">
              <Label htmlFor="phone">Phone number</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      {...field}
                      id="phone"
                      placeholder="Enter phone number"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  )}
                />
                <Button type="submit" size="sm" className="shrink-0 sm:h-10">
                  Search
                </Button>
              </div>
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 min-w-[220px] flex-1">
              <Label htmlFor="emailLookup">Email</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="emailLookup"
                  type="email"
                  value={emailLookup}
                  onChange={(e) => setEmailLookup(e.target.value)}
                  placeholder="name@example.com"
                  className="h-10 sm:flex-1"
                />
                <Button type="button" variant="secondary" size="sm" className="shrink-0 sm:h-10" onClick={handleEmailLookup}>
                  Search
                </Button>
              </div>
            </div>

            {showAvailability && selectedOrg && (
              <div
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  (selectedOrg === "VacationSaga"
                    ? isAvailable.VacationSaga
                    : selectedOrg === "Holidaysera"
                      ? isAvailable.Holidaysera
                      : isAvailable.HousingSaga)
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                    : "border-destructive/30 bg-destructive/5 text-destructive"
                }`}
              >
                {(selectedOrg === "VacationSaga"
                  ? isAvailable.VacationSaga
                  : selectedOrg === "Holidaysera"
                    ? isAvailable.Holidaysera
                    : isAvailable.HousingSaga) ? (
                  <Check size={16} aria-hidden />
                ) : (
                  <CircleX size={16} aria-hidden />
                )}
                <span className="font-medium">
                  {(selectedOrg === "VacationSaga"
                    ? isAvailable.VacationSaga
                    : selectedOrg === "Holidaysera"
                      ? isAvailable.Holidaysera
                      : isAvailable.HousingSaga)
                    ? "Fresh lead"
                    : "Existing lead"}{" "}
                  · {selectedOrg}
                </span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {matchedLead && (
        <Card className="border-border/80 bg-muted/30 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Matched lead</CardTitle>
            <CardDescription className="text-xs">
              Latest record for this phone or email — sending may be blocked if not fresh.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm md:grid-cols-2">
              <p><span className="text-muted-foreground">Name</span> · {matchedLead.name || "—"}</p>
              <p><span className="text-muted-foreground">Email</span> · {matchedLead.email || "—"}</p>
              <p><span className="text-muted-foreground">Phone</span> · {matchedLead.phoneNumber || "—"}</p>
              <p><span className="text-muted-foreground">Property</span> · {matchedLead.propertyName || "—"}</p>
              <p><span className="text-muted-foreground">Lead status</span> · {matchedLead.leadStatus || "—"}</p>
              <p><span className="text-muted-foreground">Offer status</span> · {matchedLead.offerStatus || "—"}</p>
              <p><span className="text-muted-foreground">Organization</span> · {matchedLead.organization || "—"}</p>
              <p>
                <span className="text-muted-foreground">Last updated</span> ·{" "}
                {matchedLead.updatedAt ? format(new Date(matchedLead.updatedAt), "dd MMM yyyy, HH:mm") : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {leadStatus === "Send Offer" && <SendOffer />}
        {leadStatus === "Send Offer" && <PlanDetails />}
        {leadStatus === "Send Offer" && <EmailPreview />}
      </div>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Button type="button" variant="outline" onClick={resetForm}>
          Reset <RotateCw className="ml-1 h-4 w-4" aria-hidden />
        </Button>
        <Button type="button" onClick={handleSaveOffer} disabled={saveOfferLoading}>
          {saveOfferLoading ? "Saving…" : "Submit"} <Save className="ml-1 h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
};
export default SalesOffer;
