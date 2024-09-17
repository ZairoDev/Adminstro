// components/PlacesAutocomplete.tsx
import React, { useState, useRef, useCallback } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  country: string;
  state: string;
  city: string;
  street: string;
  postalCode: string;
  lat: number;
  lng: number;
}

interface PlacesAutocompleteProps {
  onPlaceSelected: (place: PlaceDetails) => void;
  countryCode: string; // Add countryCode prop to limit search by country
}

const PlacesAutocomplete: React.FC<PlacesAutocompleteProps> = ({
  onPlaceSelected,
  countryCode,
}) => {
  const [address, setAddress] = useState<string>("");
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback(
    (autocomplete: google.maps.places.Autocomplete) => {
      autocompleteRef.current = autocomplete;
    },
    []
  );

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.place_id && place.name && place.formatted_address) {
        const addressComponents = place.address_components;
        const getComponent = (type: string) =>
          addressComponents?.find((component) => component.types.includes(type))
            ?.long_name || "";

        const lat = place.geometry?.location?.lat() || 0;
        const lng = place.geometry?.location?.lng() || 0;

        const selectedPlace = {
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address,
          country: getComponent("country"),
          state: getComponent("administrative_area_level_1"),
          city:
            getComponent("locality") ||
            getComponent("sublocality") ||
            getComponent("postal_town"),
          street: getComponent("route") + " " + getComponent("street_number"),
          postalCode: getComponent("postal_code"),
          lat,
          lng,
        };

        // Check if selected country matches countryCode prop
        // if (selectedPlace.country.toLowerCase() === countryCode.toLowerCase()) {
        onPlaceSelected(selectedPlace);
        setAddress(place.formatted_address);
        // } else {
        // alert(`Please select a location within ${countryCode}`);
        // }
      }
    }
  }, [onPlaceSelected, countryCode]);

  return (
    <div className="">
      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
        <Input
          type="text"
          placeholder="Enter a location"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </Autocomplete>
    </div>
  );
};

export default PlacesAutocomplete;
