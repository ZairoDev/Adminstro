"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Train, Bus, BugPlay as Subway, Trash2, Edit2 } from "lucide-react";
import axios from "axios";
import TargetModal from "./target_model";


import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EditArea } from "./components/editArea";
import { AreaModel } from "./area-model";

export interface Area {
  _id?: string;
  city: string;
  name: string;
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
  areas: Area[];
}

export default function TargetPage() {
  const [data, setData] = useState<CityData[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [addCity, setAddCity] = useState(false);
  const [cityId, setCityId] = useState("");
  const [addArea,setAddArea] = useState(false);
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

  const getTargets = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/addons/target/getAllTargets");

      // response.data.data = list of targets with an areas[] array attached
      const sortedData: CityData[] = response.data.data.sort(
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
                            onClick={() => handleDeleteCity(c._id || "")}
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
                <button
                  onClick={() => setAddArea(true)}
                  className="ml-auto border px-4 py-2 text-sm"
                >
                  Add Area
                </button>
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
      {/* <AreaModel
                areaModel={addArea}
                setAreaModel={setAddArea}
                areaId={cityId}
                // getAllTargets={getTargets}
              /> */}
    </div>
  );
}
