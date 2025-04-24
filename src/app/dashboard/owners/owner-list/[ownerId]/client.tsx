"use client";

import { useEffect, useState, useTransition } from "react";
import { Country, State, City, IState, ICity } from "country-state-city";

import {
  Card,
  CardTitle,
  CardFooter,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { OwnerInterface } from "@/util/type";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useOwnerStore } from "../../owner-store";
import { editOwnerDetails } from "../../ownerActions";

const OwnerClient = ({ owner }: { owner: OwnerInterface }) => {
  const [cities, setCities] = useState<ICity[]>();
  const [states, setStates] = useState<IState[]>();
  const countries = Country.getAllCountries();

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const { setField, resetForm } = useOwnerStore();

  useEffect(() => {
    setField("propertyName", owner.propertyName);
    setField("propertyUrl", owner.propertyUrl);
    setField("country", owner.country);
    setField("state", owner.state);
    setField("city", owner.city);
    setField("area", owner.area);
    setField("email", owner.email);
  }, []);

  useEffect(() => {
    setStates(State.getStatesOfCountry(selectedCountry));
  }, [selectedCountry]);

  useEffect(() => {
    setCities(City.getCitiesOfState(selectedCountry, selectedState));
  }, [selectedState]);

  const [isPending, startTransition] = useTransition();

  const handleUpdateOwner = async () => {
    const payload: OwnerInterface = {
      propertyName: useOwnerStore.getState().propertyName,
      phoneNumber: useOwnerStore.getState().phoneNumber,
      propertyUrl: useOwnerStore.getState().propertyUrl,
      country: useOwnerStore.getState().country,
      state: useOwnerStore.getState().state,
      city: useOwnerStore.getState().city,
      area: useOwnerStore.getState().area,
      email: useOwnerStore.getState().email,
    };
    startTransition(() => {
      editOwnerDetails(owner._id!, payload);
      // addNote(owner._id!, "jsfhjsd");
    });
  };

  return (
    <Card className="max-w-[450px]">
      <CardHeader>
        <CardTitle>Edit Details</CardTitle>
        <CardDescription>Edit Details of owner before sending contarct</CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4 justify-center">
            <div className=" flex justify-center gap-x-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="propertyName">Property Name</Label>
                <Input
                  id="propertyName"
                  placeholder="Name of your project"
                  value={useOwnerStore.getState().propertyName}
                  onChange={(e) => setField("propertyName", e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="propertyUrl">Property URL</Label>
                <Input
                  id="propertyUrl"
                  placeholder="Enter url of property"
                  value={useOwnerStore.getState().propertyUrl}
                  onChange={(e) => setField("propertyUrl", e.target.value)}
                />
              </div>
            </div>

            {/* Address Details */}
            <div>
              <p className=" font-semibold text-xl mt-8">Address Details</p>
              <div className=" grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-x-4 p-2">
                {/* Country */}
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    // value={useOwnerStore.getState().country}
                    onValueChange={(value) => {
                      setSelectedCountry(value);
                      setField("country", Country.getCountryByCode(value)?.name);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Countries</SelectLabel>
                        {countries.map((country) => (
                          <SelectItem key={country.isoCode} value={country.isoCode}>
                            <div>{country.name}</div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* State */}
                <div>
                  <Label htmlFor="state">State</Label>
                  <Select
                    onValueChange={(value) => {
                      setSelectedState(value);
                      setField("state", State.getStateByCode(value)?.name);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>States</SelectLabel>
                        {states?.map((state) => (
                          <SelectItem key={state.isoCode} value={state.isoCode}>
                            <div>{state.name}</div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                <div>
                  <Label htmlFor="city">City</Label>
                  <Select
                    // value={useOwnerStore.getState().city}
                    onValueChange={(value) => {
                      // setSelectedCity(value);
                      setField("city", value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Cities</SelectLabel>
                        {cities?.map((city) => (
                          <SelectItem key={city.name} value={city.name}>
                            <div>{city.name}</div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                type="text"
                value={useOwnerStore.getState().area}
                onChange={(e) => setField("area", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="area"
                type="text"
                value={useOwnerStore.getState().email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => resetForm()}>
          Cancel
        </Button>
        <Button onClick={handleUpdateOwner}>Save</Button>
      </CardFooter>
    </Card>
  );
};
export default OwnerClient;
