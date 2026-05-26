"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { normalizeCityKey, toDisplayCity } from "@/lib/city-normalizer";
import { toast } from "sonner";

type PhoneLocationEntry = {
  displayName: string;
  locationKey: string;
};

type PhoneRow = {
  phoneNumberId: string;
  displayName: string;
  displayNumber: string;
  locations: PhoneLocationEntry[];
};

export function WhatsAppPhoneLocationsManager() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingPhoneId, setSavingPhoneId] = useState<string | null>(null);
  const [phones, setPhones] = useState<PhoneRow[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PhoneLocationEntry[]>>({});
  const [configuringFromEnv, setConfiguringFromEnv] = useState(false);

  const loadPhones = useCallback(async () => {
    setLoading(true);
    try {
      const phonesRes = await axios.get("/api/whatsapp/admin/phone-locations?seed=true");
      const rows = (phonesRes.data.phones || []) as PhoneRow[];
      setPhones(rows);
      const nextDrafts: Record<string, PhoneLocationEntry[]> = {};
      for (const row of rows) {
        nextDrafts[row.phoneNumberId] = [...(row.locations || [])];
      }
      setDrafts(nextDrafts);
      // Cities from MonthlyTarget (returned by admin API + same as getLocations)
      setCityOptions(
        (phonesRes.data.availableCities || phonesRes.data.locations || []) as string[]
      );
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to load phone locations";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadPhones();
    }
  }, [open, loadPhones]);

  const configureFromEnv = async () => {
    const ok = window.confirm(
      "Load all phone lines from .env and assign locations from config.ts?\n\nThis overwrites existing DB mappings.",
    );
    if (!ok) return;
    setConfiguringFromEnv(true);
    try {
      const res = await axios.post("/api/whatsapp/admin/phone-locations", {
        configureFromEnv: true,
      });
      toast.success(
        `Configured ${res.data.updated?.length ?? 0} phone line(s) from env`,
      );
      await loadPhones();
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Configure from env failed";
      toast.error(message);
    } finally {
      setConfiguringFromEnv(false);
    }
  };

  const addLocation = (phoneNumberId: string, city: string) => {
    if (!city.trim()) return;
    setDrafts((prev) => {
      const current = prev[phoneNumberId] || [];
      if (current.some((l) => l.displayName.toLowerCase() === city.toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        [phoneNumberId]: [
          ...current,
          {
            displayName: toDisplayCity(city),
            locationKey: normalizeCityKey(city),
          },
        ],
      };
    });
  };

  const removeLocation = (phoneNumberId: string, locationKey: string) => {
    setDrafts((prev) => ({
      ...prev,
      [phoneNumberId]: (prev[phoneNumberId] || []).filter(
        (l) => l.locationKey !== locationKey
      ),
    }));
  };

  const savePhone = async (phoneNumberId: string) => {
    const locations = drafts[phoneNumberId] || [];
    if (locations.length === 0) {
      toast.error("Add at least one location for this phone line");
      return;
    }
    setSavingPhoneId(phoneNumberId);
    try {
      await axios.put("/api/whatsapp/admin/phone-locations", {
        phoneNumberId,
        locations: locations.map((l) => ({ displayName: l.displayName })),
      });
      toast.success("Phone locations saved");
      await loadPhones();
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Save failed";
      toast.error(message);
    } finally {
      setSavingPhoneId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start border-emerald-300 text-emerald-900 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
        >
          <MapPin className="h-4 w-4 mr-2" />
          Phone locations
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Allot locations to WhatsApp phone lines</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Pick cities from <strong>Monthly Targets</strong> and assign them to each phone line.
          SuperAdmin can only assign these saved locations when clearing the Admin Queue.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={configuringFromEnv || loading}
          onClick={() => void configureFromEnv()}
        >
          {configuringFromEnv ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 mr-2" />
          )}
          Configure from .env + config
        </Button>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {phones.map((phone) => {
              const draft = drafts[phone.phoneNumberId] || [];
              const availableCities = cityOptions.filter(
                (c) => !draft.some((d) => d.displayName.toLowerCase() === c.toLowerCase())
              );
              return (
                <div
                  key={phone.phoneNumberId}
                  className="rounded-lg border p-3 space-y-3"
                >
                  <div>
                    <p className="font-medium text-sm">{phone.displayName}</p>
                    <p className="text-xs text-muted-foreground">{phone.displayNumber}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {draft.map((loc) => (
                      <span
                        key={loc.locationKey}
                        className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full"
                      >
                        {loc.displayName}
                        <button
                          type="button"
                          onClick={() => removeLocation(phone.phoneNumberId, loc.locationKey)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${loc.displayName}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {draft.length === 0 && (
                      <span className="text-xs text-amber-600">No locations assigned</span>
                    )}
                  </div>
                  {availableCities.length > 0 ? (
                    <div className="flex gap-2">
                      <Select onValueChange={(v) => addLocation(phone.phoneNumberId, v)}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Add city from Monthly Targets…" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Plus className="h-4 w-4 self-center text-muted-foreground shrink-0" />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No cities in Monthly Targets — add locations there first.
                    </p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={savingPhoneId === phone.phoneNumberId}
                    onClick={() => void savePhone(phone.phoneNumberId)}
                  >
                    {savingPhoneId === phone.phoneNumberId ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Save line
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
