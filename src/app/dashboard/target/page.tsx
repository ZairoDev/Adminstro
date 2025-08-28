"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Train, Bus, BugPlay as Subway, Trash2 } from "lucide-react";
import axios from "axios";
import TargetModal from "./target_model";
import { AreaModel } from "./area-model";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Area {
  name: string;
  zone: string;
  transportation: {
    metroZone?: string;
    tram?: string;
    subway?: string;
    bus?: string;
  };
  price?: {
    studio?: number;
    sharedSpot?: number;
    sharedRoom?: number;
    apartment?: {
      oneBhk?: number;
      twoBhk?: number;
      threeBhk?: number;
    };
  };
}

interface CityData {
  _id?: string;
  country: string;
  state?: string;
  city: string;
  area: Area[];
}

export default function TargetPage() {
  const [data, setData] = useState<CityData[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [addCity, setAddCity] = useState(false);
  const [cityId, setCityId] = useState("");
  const [addArea,setAddArea] = useState(false)

  const getTargets = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/addons/target/getAllTargets");
      const sortedData: CityData[] = response.data.data.sort(
        (a: CityData, b: CityData) => a.country.localeCompare(b.country)
      );
      setData(sortedData);

      // Initialize defaults
      const firstCountry = sortedData[0]?.country || "";
      setSelectedCountry(firstCountry);

      const firstCity =
        sortedData.find((d) => d.country === firstCountry)?.city || "";
      setSelectedCity(firstCity);

      setLoading(false);
    } catch (err) {
      console.log(err);
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
        data:{areaName,cityId}
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
        <div className="container mx-auto px-6 py-8">
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

      <div className="container mx-auto p-6">
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
                {selectedCityData?.area?.length || 0}
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
              {selectedCityData?.area?.length ? (
                <Accordion type="single" collapsible className="w-full">
                  {selectedCityData.area.map((area: any) => (
                    <AccordionItem key={area.name} value={area.name}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2 w-full">
                          <MapPin className="h-4 w-4 text-primary" />
                          {area.name}
                          <Badge variant="outline" className="ml-2">
                            Zone {area.zone}
                          </Badge>
                          <button
                            className="ml-auto"
                            onClick={(e) => {
                              e.stopPropagation(); // prevents accordion toggle when clicking delete
                              handleDeleteArea(area.name || "");
                            }}
                          >
                            <Trash2 className="h-6 w-5" />
                          </button>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Card className="border-none shadow-none">
                          <CardHeader className="pb-3"></CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                Transportation
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                {area.transportation?.metroZone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Train className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium">Metro:</span>
                                    <span>{area.transportation.metroZone}</span>
                                  </div>
                                )}
                                {area.transportation?.subway && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Subway className="h-4 w-4 text-green-500" />
                                    <span className="font-medium">Subway:</span>
                                    <span>{area.transportation.subway}</span>
                                  </div>
                                )}
                                {area.transportation?.tram && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Train className="h-4 w-4 text-orange-500" />
                                    <span className="font-medium">Tram:</span>
                                    <span>{area.transportation.tram}</span>
                                  </div>
                                )}
                                {area.transportation?.bus && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Bus className="h-4 w-4 text-purple-500" />
                                    <span className="font-medium">Bus:</span>
                                    <span>{area.transportation.bus}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {area.price && (
                              <>
                                <Separator />
                                <div className="space-y-3">
                                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                    Pricing
                                  </h4>
                                  <div className="grid grid-cols-1 gap-2 text-sm">
                                    {area.price.studio && (
                                      <div className="flex justify-between">
                                        <span>Studio:</span>
                                        <span className="font-medium">
                                          ${area.price.studio}
                                        </span>
                                      </div>
                                    )}
                                    {area.price.sharedSpot && (
                                      <div className="flex justify-between">
                                        <span>Shared Spot:</span>
                                        <span className="font-medium">
                                          ${area.price.sharedSpot}
                                        </span>
                                      </div>
                                    )}
                                    {area.price.sharedRoom && (
                                      <div className="flex justify-between">
                                        <span>Shared Room:</span>
                                        <span className="font-medium">
                                          ${area.price.sharedRoom}
                                        </span>
                                      </div>
                                    )}
                                    {area.price.apartment?.oneBhk && (
                                      <div className="flex justify-between">
                                        <span>1 BHK:</span>
                                        <span className="font-medium">
                                          ${area.price.apartment.oneBhk}
                                        </span>
                                      </div>
                                    )}
                                    {area.price.apartment?.twoBhk && (
                                      <div className="flex justify-between">
                                        <span>2 BHK:</span>
                                        <span className="font-medium">
                                          ${area.price.apartment.twoBhk}
                                        </span>
                                      </div>
                                    )}
                                    {area.price.apartment?.threeBhk && (
                                      <div className="flex justify-between">
                                        <span>3 BHK:</span>
                                        <span className="font-medium">
                                          ${area.price.apartment.threeBhk}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
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
          areaId={cityId}
          // getAllTargets={getTargets}
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
