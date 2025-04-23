"use client";

import { useEffect, useState } from "react";
import { Country, State, City, IState, ICity } from "country-state-city";

import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useOwnerStore } from "./owner-store";

const OwnerAddress = () => {
  const [cities, setCities] = useState<ICity[]>();
  const [states, setStates] = useState<IState[]>();
  const countries = Country.getAllCountries();

  const [selectedState, setSelectedState] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");

  const { setField } = useOwnerStore();

  useEffect(() => {
    setStates(State.getStatesOfCountry(selectedCountry));
  }, [selectedCountry]);

  useEffect(() => {
    setCities(City.getCitiesOfState(selectedCountry, selectedState));
  }, [selectedState]);

  return (
    <div>
      <p className=" font-semibold text-xl mt-8">Address Details</p>
      <div className=" grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-x-4 p-2">
        {/* Country */}
        <div>
          <Label htmlFor="country">Country</Label>
          <Select
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
  );
};
export default OwnerAddress;
