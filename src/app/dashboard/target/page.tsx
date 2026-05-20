"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Train, Bus, BugPlay as Subway, Trash2, Edit2, ToggleLeft, ToggleRight, ChevronDown } from "lucide-react";
import axios from "@/util/axios";
import TargetModal from "./target_model";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { extractAreaNamesForCurrentCityUpload } from "./utils/bulkAreaParser";
import { readSpreadsheetFileAsCsvText } from "./utils/bulkAreaFileImport";


import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EditArea } from "./components/editArea";
import { AreaModel } from "./area-model";
import { TargetEditModal } from "./target-edit-model";
import { BulkFullAreasUploadDialog } from "./components/BulkFullAreasUploadDialog";

export interface Area {
  _id?: string;
  city: string;
  name: string;
  isActive?: boolean;
  zone?: string;
  subUrban?: boolean;
  town?: boolean;
  village?: boolean;
  municipality?: boolean;
  district?: boolean;
  districtOf?: string;

  // transportation
  metroZone?: string;
  extension?: boolean;
  tram?: boolean;
  subway?: boolean;

  // price
  studio?: number;
  sharedApartment?: number;
  oneBhk?: number;
  twoBhk?: number;
  threeBhk?: number;
}


interface CityData {
  _id?: string;
  country: string;
  state?: string;
  city: string;
  isActive?: boolean;
  leads?: number;
  visits?: number;
  sales?: number;
  areas: Area[];
}

/** Example for “this city” bulk — header recommended */
const BULK_CITY_CSV_EXAMPLE = `name
Al Barsha
Jumeirah Village Circle
Dubai Marina`;

const BULK_CITY_SIMPLE_LIST_EXAMPLE = `Al Barsha
JVC
Dubai Marina`;

export default function TargetPage() {
  const [data, setData] = useState<CityData[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [addCity, setAddCity] = useState(false);
  const [cityId, setCityId] = useState("");
  const [addArea,setAddArea] = useState(false);
  const [editCityOpen, setEditCityOpen] = useState(false);
  const [editCityData, setEditCityData] = useState<CityData | null>(null);
  const [editArea, setEditArea] = useState<Area>({
    city: "",
    name: "",
    zone: "",

    subUrban: false,
    town: false,
    village: false,
    municipality: false,
    district: false,
    districtOf: "",

    // transportation
    metroZone: "",
    extension: false,
    tram: false,
    subway: false,

    // price
    studio: undefined,
    sharedApartment: undefined,
    oneBhk: undefined,
    twoBhk: undefined,
    threeBhk: undefined,
  });
  
  const [editBox,setEditBoxOpen] = useState(false);

  const [bulkCityAreasOpen, setBulkCityAreasOpen] = useState(false);
  const [bulkAllAreasOpen, setBulkAllAreasOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkIsSubmitting, setBulkIsSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  const cityBulkFileRef = useRef<HTMLInputElement>(null);

  const targetsByCountryCity = useMemo(() => {
    const map = new Map<string, CityData>();
    for (const t of data) {
      const key = `${String(t.country).toLowerCase()}::${String(t.city).toLowerCase()}`;
      map.set(key, t);
    }
    return map;
  }, [data]);

  const bulkReset = () => {
    setBulkText("");
    setBulkErrors([]);
    setBulkProgress(null);
    setBulkIsSubmitting(false);
    if (cityBulkFileRef.current) cityBulkFileRef.current.value = "";
  };

  const runBulkAddAreasToSelectedCity = async () => {
    if (!selectedCity || !cityId) return;
    const names = extractAreaNamesForCurrentCityUpload(bulkText);
    if (names.length === 0) {
      setBulkErrors([
        "No area names found. Upload a .csv / .xlsx / .xls file, or paste text: one name per line; or a CSV with a name column; or a single-column CSV.",
      ]);
      return;
    }

    const existing = new Set(
      (selectedCityData?.areas ?? []).map((a) => String(a.name).toLowerCase()),
    );
    const toCreate = names.filter((n) => !existing.has(n.toLowerCase()));
    if (toCreate.length === 0) {
      setBulkErrors(["All pasted areas already exist in this city."]);
      return;
    }

    setBulkIsSubmitting(true);
    setBulkErrors([]);
    setBulkProgress({ done: 0, total: toCreate.length });
    try {
      for (let i = 0; i < toCreate.length; i++) {
        const name = toCreate[i];
        await axios.put(`/api/addons/target/updateTarget/${cityId}`, {
          city: selectedCity,
          name,
        });
        setBulkProgress({ done: i + 1, total: toCreate.length });
      }
      await getTargets();
      setBulkCityAreasOpen(false);
      bulkReset();
    } catch (err) {
      console.error(err);
      setBulkErrors((prev) => [...prev, "Failed while uploading areas. Check console for details."]);
    } finally {
      setBulkIsSubmitting(false);
    }
  };

  const handleCityBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await readSpreadsheetFileAsCsvText(file);
      setBulkText(text);
      setBulkErrors([]);
    } catch (err) {
      setBulkErrors([err instanceof Error ? err.message : String(err)]);
    }
  };

  const getTargets = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/addons/target/getAllTargets");

      // response.data.data = list of targets with an areas[] array attached
      console.log(response?.data?.data);  
      const sortedData: CityData[] = (response?.data?.data ?? []).sort(
        (a: CityData, b: CityData) => a.country.localeCompare(b.country)
      );

      setData(sortedData);

      // Default: pick the first country
      const firstCountry = sortedData[0]?.country || "";
      setSelectedCountry(firstCountry);

      // Default: pick the first city in that country
      const firstCity =
        sortedData.find((d) => d.country === firstCountry)?.city || "";
      setSelectedCity(firstCity);

      // Default: pick the first area for that city
      const firstAreas =
        sortedData.find((d) => d.city === firstCity)?.areas || [];
      if (firstAreas.length > 0) {

      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };
  
  
  const handleDeleteCity = async (cityId: string) => {
    try {
      await axios.delete(`/api/addons/target/deleteCity/${cityId}`);
      getTargets();
    } catch (err) {
      console.log(err);
    }
  };

  const handleToggleCityStatus = async (targetId: string) => {
    try {
      await axios.put(`/api/addons/target/toggle-city-status/${targetId}`);
      getTargets();
    } catch (err) {
      console.log(err);
    }
  };

  const handleDeleteArea = async (areaName: string) => {
    try {
      await axios.delete(`/api/addons/target/deleteArea`,{
        data:{areaName}
      });
      getTargets();
    } catch (err) {
      console.log(err);
    }
  };

  const handleToggleAreaStatus = async (areaId: string) => {
    try {
      await axios.put(`/api/addons/target/toggle-area-status/${areaId}`);
      getTargets();
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    getTargets();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">
            Loading target data...
          </p>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <MapPin className="h-16 w-16 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">No Data Available</h2>
            <p className="text-muted-foreground">
              No target locations have been configured yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const countries = Array.from(new Set(data.map((d) => d.country)));
  const cities = data.filter((d) => d.country === selectedCountry);
  const selectedCityData = cities.find((c) => c.city === selectedCity);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container  px-6 py-8">
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">
              Target Locations
            </h1>
            <p className="text-muted-foreground text-sm">
              Explore areas across different countries and cities
            </p>
          </div>
        </div>
      </div>

      <div className="container  p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Countries Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Countries</h2>
              <Badge variant="secondary">{countries.length}</Badge>
            </div>
            <Card>
              <CardContent className="p-4">
                <Tabs
                  value={selectedCountry}
                  onValueChange={(country) => {
                    setSelectedCountry(country);
                    setSelectedCity(""); // reset city when switching country
                    setCityId("");
                  }}
                >
                  <TabsList className="grid w-full grid-cols-1 gap-2 h-auto bg-transparent p-0">
                    {countries.map((country) => (
                      <TabsTrigger
                        key={country}
                        value={country}
                        className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        {country}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Cities Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Cities</h2>
              <Badge variant="secondary">{cities.length}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkAllAreasOpen(true)}
              >
                Bulk Areas Upload
              </Button>
              <button
                onClick={() => setAddCity(true)}
                className="ml-auto border px-4 py-2 text-sm"
              >
                Add City
              </button>
            </div>
            <Card>
              <CardContent className="p-4">
                {cities.length > 0 ? (
                  <Tabs
                    value={selectedCity}
                    onValueChange={(cityName) => {
                      setSelectedCity(cityName);
                      const city = cities.find((c) => c.city === cityName);
                      setCityId(city?._id || "");
                    }}
                  >
                    <TabsList className="grid w-full grid-cols-1 gap-2 h-auto bg-transparent p-0">
                      {cities.map((c) => (
                        <TabsTrigger
                          key={c._id}
                          value={c.city}
                          // onClick={() => setCityId(c._id || "")}
                          className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          {c.city}
                          {c.state && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {c.state}
                            </span>
                          )}
                          <button
                            className="ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditCityData(c);
                              setEditCityOpen(true);
                            }}
                            title="Edit City"
                          >
                            <Edit2 className="h-6 w-5" />
                          </button>
                          <button
                            className="ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (c._id) handleToggleCityStatus(c._id);
                            }}
                            title={
                              c.isActive === false
                                ? "Mark Active"
                                : "Mark Inactive"
                            }
                          >
                            {c.isActive === false ? (
                              <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                            ) : (
                              <ToggleRight className="h-6 w-6 text-green-600" />
                            )}
                          </button>
                          <button
                            className="ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCity(c._id || "");
                            }}
                          >
                            <Trash2 className="h-6 w-5 mr-0" />
                          </button>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No cities available for selected country
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Areas Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold flex justify-center items-center gap-2">
                Areas{" "}
                <p className="text-sm">{selectedCity.toLocaleUpperCase()}</p>
              </h2>
              <Badge variant="secondary">
                {selectedCityData?.areas?.length || 0}
              </Badge>
              {selectedCity && cityId && (
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkCityAreasOpen(true)}
                  >
                    Bulk Areas (this city)
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddArea(true)}
                  >
                    Add Area
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {selectedCityData?.areas?.length ? (
                <Accordion type="single" collapsible className="w-full">
                  {selectedCityData.areas.map((areas: Area) => (
                    <AccordionItem key={areas.name} value={areas.name}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2 w-full">
                          <MapPin className="h-4 w-4 text-primary" />
                          {areas.name}
                          {areas.zone && (
                            <Badge variant="outline" className="ml-2">
                              Zone {areas.zone}
                            </Badge>
                          )}
                          <button
                            className="ml-auto"
                            onClick={(e) => {
                              e.stopPropagation(); // prevent toggle
                              setEditArea(areas);
                              setEditBoxOpen(true);
                            }}
                          >
                            <Edit2 className="h-6 w-5" />
                          </button>
                          <button
                            className="ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (areas._id) handleToggleAreaStatus(areas._id);
                            }}
                            title={
                              areas.isActive === false
                                ? "Mark Active"
                                : "Mark Inactive"
                            }
                          >
                            {areas.isActive === false ? (
                              <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                            ) : (
                              <ToggleRight className="h-6 w-6 text-green-600" />
                            )}
                          </button>
                          <button
                            className="ml-auto"
                            onClick={(e) => {
                              e.stopPropagation(); // prevents accordion toggle
                              handleDeleteArea(areas._id || "");
                            }}
                          >
                            <Trash2 className="h-6 w-5" />
                          </button>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Card className="border-none shadow-none">
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                Area Details
                              </h4>
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                {areas.subUrban && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <Train className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">
                                      SubUrban
                                    </span>
                                  </div>
                                )}
                                {areas.town && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">Town</span>
                                  </div>
                                )}
                                {areas.village && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">Village</span>
                                  </div>
                                )}
                                {areas.municipality && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">
                                      Municipality
                                    </span>
                                  </div>
                                )}
                                {areas.district && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">
                                      District Of: {areas.districtOf}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Separator />
                            {/* Transportation */}
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                Transportation
                              </h4>
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                {areas.metroZone !== null && (
                                  <div className="flex items-center gap-2">
                                    <Train className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium">
                                      Metro Zone:
                                    </span>
                                    <span>{areas.metroZone}</span>
                                  </div>
                                )}
                                {areas.subway !== null && (
                                  <div className="flex items-center gap-2">
                                    <Subway className="h-4 w-4 text-green-500" />
                                    <span className="font-medium">Subway:</span>
                                    <span>
                                      {areas.subway
                                        ? "Available"
                                        : "Not Available"}
                                    </span>
                                  </div>
                                )}
                                {areas.tram !== null && (
                                  <div className="flex items-center gap-2">
                                    <Train className="h-4 w-4 text-orange-500" />
                                    <span className="font-medium">Tram:</span>
                                    <span>
                                      {" "}
                                      {areas.tram
                                        ? "Available"
                                        : "Not Available"}
                                    </span>
                                  </div>
                                )}
                                {areas.extension !== null && (
                                  <div className="flex items-center gap-2">
                                    <Bus className="h-4 w-4 text-purple-500" />
                                    <span className="font-medium">
                                      Extension:
                                    </span>
                                    <span>
                                      {" "}
                                      {areas.extension
                                        ? "Available"
                                        : "Not Available"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Pricing */}
                            <Separator />
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                Pricing
                              </h4>
                              <div className="grid grid-cols-1 gap-2 text-sm">
                                {areas.studio && (
                                  <div className="flex justify-between">
                                    <span>Studio:</span>
                                    <span className="font-medium">
                                      ${areas.studio}
                                    </span>
                                  </div>
                                )}
                                {areas.sharedApartment && (
                                  <div className="flex justify-between">
                                    <span>Shared Apartment:</span>
                                    <span className="font-medium">
                                      ${areas.sharedApartment}
                                    </span>
                                  </div>
                                )}
                                {areas.oneBhk && (
                                  <div className="flex justify-between">
                                    <span>1 BHK:</span>
                                    <span className="font-medium">
                                      ${areas.oneBhk}
                                    </span>
                                  </div>
                                )}
                                {areas.twoBhk && (
                                  <div className="flex justify-between">
                                    <span>2 BHK:</span>
                                    <span className="font-medium">
                                      ${areas.twoBhk}
                                    </span>
                                  </div>
                                )}
                                {areas.threeBhk && (
                                  <div className="flex justify-between">
                                    <span>3 BHK:</span>
                                    <span className="font-medium">
                                      ${areas.threeBhk}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No areas available for selected city
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <TargetModal
        open={addCity}
        onOpenChange={setAddCity}
        getAllTargets={getTargets}
      />
      <Dialog
        open={bulkCityAreasOpen}
        onOpenChange={(open) => {
          setBulkCityAreasOpen(open);
          if (!open) bulkReset();
        }}
      >
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk add areas — {selectedCity || "city"}</DialogTitle>
            <DialogDescription>
              Areas are added to the city currently selected in the Target page.
              You do not need country or city columns. Upload a{" "}
              <strong>.csv</strong> or <strong>.xlsx / .xls</strong> file, or
              paste text below.
            </DialogDescription>
          </DialogHeader>

          <Collapsible defaultOpen className="group rounded-md border">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between px-3 py-2 h-auto font-normal"
              >
                <span className="text-sm font-medium">
                  How your file should look
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t px-3 pb-3 pt-2 space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Compulsory</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>
                    <strong>Area names only</strong> — as a plain list (one per
                    line), or as a CSV/Excel table with a{" "}
                    <code className="text-xs bg-muted px-1 rounded">name</code>{" "}
                    column (recommended).
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Optional / accepted variants
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>
                    Name column headers also accepted:{" "}
                    <code className="text-xs bg-muted px-1 rounded">area</code>,{" "}
                    <code className="text-xs bg-muted px-1 rounded">
                      area name
                    </code>
                    .
                  </li>
                  <li>
                    Single-column CSV/Excel: first row is the header; all
                    following rows are read as names.
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">
                  Example — CSV with header (recommended)
                </p>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto text-foreground whitespace-pre">
                  {BULK_CITY_CSV_EXAMPLE}
                </pre>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">
                  Example — plain list (no header)
                </p>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto text-foreground whitespace-pre">
                  {BULK_CITY_SIMPLE_LIST_EXAMPLE}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="space-y-2 min-w-[220px] flex-1">
                <Label htmlFor="city-bulk-file">Upload CSV or Excel</Label>
                <Input
                  id="city-bulk-file"
                  ref={cityBulkFileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleCityBulkFile}
                  disabled={bulkIsSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  For Excel, the <strong>first sheet</strong> is imported (saved
                  as CSV in the preview).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setBulkText(BULK_CITY_CSV_EXAMPLE)}
                  disabled={bulkIsSubmitting}
                >
                  Load name-column example
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setBulkText(BULK_CITY_SIMPLE_LIST_EXAMPLE)}
                  disabled={bulkIsSubmitting}
                >
                  Load plain list example
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city-bulk-text">Or paste CSV / TSV / list</Label>
              <Textarea
                id="city-bulk-text"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Example:\nAl Barsha\nJVC\nDubai Marina"}
                className="min-h-[200px] font-mono text-xs"
              />
            </div>

            {bulkProgress && (
              <p className="text-xs text-muted-foreground">
                Uploading {bulkProgress.done}/{bulkProgress.total}…
              </p>
            )}
            {bulkErrors.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm font-medium text-destructive">Errors</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-destructive">
                  {bulkErrors.slice(0, 8).map((e, idx) => (
                    <li key={`${idx}-${e}`}>{e}</li>
                  ))}
                </ul>
                {bulkErrors.length > 8 && (
                  <p className="text-xs text-destructive mt-2">
                    Showing 8 of {bulkErrors.length} errors.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkCityAreasOpen(false)}
              disabled={bulkIsSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={runBulkAddAreasToSelectedCity}
              disabled={bulkIsSubmitting || !bulkText.trim()}
            >
              {bulkIsSubmitting ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkFullAreasUploadDialog
        open={bulkAllAreasOpen}
        onOpenChange={setBulkAllAreasOpen}
        targetsByCountryCity={targetsByCountryCity}
        onSuccess={getTargets}
      />

      {addArea && cityId && (
        <AreaModel
          areaModel={addArea}
          setAreaModel={setAddArea}
          areaName={selectedCity}
          areaId={cityId}
          getAllTargets={getTargets}
          // getAllTargets={getTargets}
        />
      )}
      {editBox && editArea && (
        <EditArea
          open={editBox}
          setOpen={setEditBoxOpen}
          areaData={editArea}
          getAllTargets={getTargets}
        />
      )}
      {editCityOpen && editCityData && (
        <TargetEditModal
          open={editCityOpen}
          onOpenChange={setEditCityOpen}
          targetData={{
            _id: editCityData._id || "",
            country: editCityData.country,
            city: editCityData.city,
            state: editCityData.state || "",
            sales: Number(editCityData.sales || 0),
            visits: Number(editCityData.visits || 0),
            leads: Number(editCityData.leads || 0),
            area: editCityData.areas || [],
          }}
          getAllTargets={getTargets}
        />
      )}
      {/* <AreaModel
                areaModel={addArea}
                setAreaModel={setAddArea}
                areaId={cityId}
                // getAllTargets={getTargets}
              /> */}
    </div>
  );
}
