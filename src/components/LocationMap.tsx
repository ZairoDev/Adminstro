// components/Map.tsx
import React from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

interface MapProps {
  latitude: number;
  longitude: number;
}

const containerStyle = {
  width: "100%",
  height: "400px",
};

const Map: React.FC<MapProps> = ({ latitude, longitude }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const center = {
    lat: latitude,
    lng: longitude,
  };

  return isLoaded ? (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={15}>
      <Marker position={center} />
    </GoogleMap>
  ) : (
    <div>Loading...</div>
  );
};

export default React.memo(Map);
