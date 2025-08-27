"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../../../components/ui/tabs";

type Area = {
  name: string;
  metroLane?: string;
  zone?: string;
};

type City = {
  city: string;
  state?: string;
  area: Area[];
};

type Target = {
  country: string;
  cities: City[];
};

export default function CountryCityAreaTabs({ data }: { data: Target[] }) {
  return (
    <Tabs defaultValue={data[0]?.country} className="w-full">
      {/* Country Tabs */}
      <TabsList>
        {data.map((country) => (
          <TabsTrigger key={country.country} value={country.country}>
            {country.country}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Country Content */}
      {data.map((country) => (
        <TabsContent key={country.country} value={country.country}>
          <Tabs defaultValue={country.cities[0]?.city} className="mt-4">
            {/* City Tabs */}
            <TabsList>
              {country.cities.map((city) => (
                <TabsTrigger key={city.city} value={city.city}>
                  {city.city}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* City Content */}
            {country.cities.map((city) => (
              <TabsContent key={city.city} value={city.city}>
                <div className="grid gap-2 mt-4">
                  {city.area.map((a) => (
                    <div
                      key={a.name}
                      className="rounded-lg border p-3 shadow-sm hover:bg-accent"
                    >
                      <p className="font-semibold">{a.name}</p>
                      {a.zone && (
                        <p className="text-sm text-muted-foreground">
                          Zone: {a.zone}
                        </p>
                      )}
                      {a.metroLane && (
                        <p className="text-sm text-muted-foreground">
                          Metro: {a.metroLane}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      ))}
    </Tabs>
  );
}
