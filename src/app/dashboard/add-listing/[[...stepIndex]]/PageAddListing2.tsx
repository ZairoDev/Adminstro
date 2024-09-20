// "use client";

// // PageAddListing2.tsx
// import React, { FC, useEffect, useState } from "react";
// import FormItem from "../FormItem";
// import dynamic from "next/dynamic";
// import { LoadScript } from "@react-google-maps/api";
// import PlacesAutocomplete from "@/components/PlacesAutocomplete";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
// } from "@/components/ui/select";

// import { Input } from "@/components/ui/input";
// import LocationMap from "@/components/LocationMap";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { useSearchParams } from "next/navigation";

// const Map = dynamic(() => import("@/components/LocationMap"), { ssr: false });

// interface Page2State {
//   country: string;
//   street: string;
//   city: string;
//   state: string;
//   postalCode: string;
//   center: { lat: number; lng: number };
// }

// const PageAddListing2: FC = () => {
//   const params = useSearchParams();
//   const userId = params.get("userId");
//   console.log(userId);

//   const [address, setAddress] = useState(() => {
//     const saved = localStorage.getItem("page2");
//     if (!saved) {
//       return "";
//     } else return JSON.parse(saved)["address"];
//   });

//   const [country, setCountry] = useState(() => {
//     const saved = localStorage.getItem("page2");
//     if (!saved) {
//       return "";
//     } else return JSON.parse(saved)["country"];
//   });

//   const [state, setState] = useState(() => {
//     const saved = localStorage.getItem("page2");
//     if (!saved) {
//       return "";
//     } else return JSON.parse(saved)["state"];
//   });

//   const [city, setCity] = useState(() => {
//     const saved = localStorage.getItem("page2");
//     if (!saved) {
//       return "";
//     } else return JSON.parse(saved)["city"];
//   });

//   const [street, setStreet] = useState(() => {
//     const saved = localStorage.getItem("page2");
//     if (!saved) {
//       return "";
//     } else return JSON.parse(saved)["street"];
//   });

//   const [postalCode, setPostalCode] = useState(() => {
//     const saved = localStorage.getItem("page2");
//     if (!saved) {
//       return "";
//     } else return JSON.parse(saved)["postalCode"];
//   });

//   const [center, setCenter] = useState<{ lat: number; lng: number }>({
//     lat: 0,
//     lng: 0,
//   });

//   const handlePlaceSelected = (place: any) => {
//     setAddress(place.address);
//     setCountry(place.country);
//     setState(place.state);
//     setCity(place.city);
//     setStreet(place.street);
//     setPostalCode(place.postalCode);
//     setCenter({ lat: place.lat, lng: place.lng });
//   };

//   const [page2, setPage2] = useState<Page2State>({
//     country,
//     street,
//     city,
//     state,
//     postalCode,
//     center,
//   });

//   useEffect(() => {
//     const newPage2: Page2State = {
//       country,
//       street,
//       city,
//       state,
//       postalCode,
//       center,
//     };
//     setPage2(newPage2);
//     localStorage.setItem("page2", JSON.stringify(newPage2));
//   }, [country, street, city, state, postalCode, center]);

//   return (
//     <div>
//       <FormItem label="Country/Region">
//         <Select value={country} onValueChange={(value) => setCountry(value)}>
//           <SelectTrigger>
//             <span>{country}</span>
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="Greece">Greece</SelectItem>
//             <SelectItem value="Italy">Italy</SelectItem>
//             <SelectItem value="Cyprus">Cyprus</SelectItem>
//             <SelectItem value="US">US</SelectItem>
//             <SelectItem value="Netherlands">Netherlands</SelectItem>
//             <SelectItem value="UK">UK</SelectItem>
//             <SelectItem value="Hungary">Hungary</SelectItem>
//             <SelectItem value="Turkey">Turkey</SelectItem>
//             <SelectItem value="Bulgaria">Bulgaria</SelectItem>
//             <SelectItem value="Lithuania">Lithuania</SelectItem>
//             <SelectItem value="Malta">Malta</SelectItem>
//             <SelectItem value="Romania">Romania</SelectItem>
//             <SelectItem value="Spain">Spain</SelectItem>
//             <SelectItem value="Croatia">Croatia</SelectItem>
//             <SelectItem value="Portugal">Portugal</SelectItem>
//             <SelectItem value="Slovenia">Slovenia</SelectItem>
//             <SelectItem value="Slovakia">Slovakia</SelectItem>
//             <SelectItem value="Viet Nam">Viet Nam</SelectItem>
//             <SelectItem value="Thailand">Thailand</SelectItem>
//             <SelectItem value="France">France</SelectItem>
//             <SelectItem value="Singapore">Singapore</SelectItem>
//             <SelectItem value="Japan">Japan</SelectItem>
//             <SelectItem value="Korea">Korea</SelectItem>
//           </SelectContent>
//         </Select>
//       </FormItem>

//       {/* <h2 className="">Your place location</h2> */}
//       <div className="flex flex-col   my-4">
//         <div className="ml-2 ">
//           <LoadScript
//             googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
//             libraries={["places"]}
//           >
//             <div className="mt-2 mb-2">
//               <PlacesAutocomplete
//                 onPlaceSelected={handlePlaceSelected}
//                 countryCode={country}
//               />
//             </div>
//           </LoadScript>
//         </div>
//         <div className="w-full">
//           <FormItem label="Street">
//             <Input
//               placeholder="..."
//               value={street}
//               onChange={(e) => setStreet(e.target.value.trim())}
//             />
//           </FormItem>
//         </div>
//       </div>

//       <div className="space-y-8">
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-5">
//           <FormItem label="City">
//             <Input
//               value={city}
//               onChange={(e) => setCity(e.target.value.trim())}
//             />
//           </FormItem>
//           <FormItem label="State">
//             <Input
//               value={state}
//               onChange={(e) => setState(e.target.value.trim())}
//             />
//           </FormItem>
//           <FormItem label="Postal code">
//             <Input
//               value={postalCode}
//               onChange={(e) => setPostalCode(e.target.value.trim())}
//             />
//           </FormItem>
//           <div>
//             <h1>Coordinates</h1>
//             <div className="flex gap-32 w-full mt-2">
//               <div className="flex gap-2">
//                 <h4 className=" text-sm">Latitude: </h4>
//                 <h4 className=" text-sm">{center.lat}</h4>
//               </div>
//               <div className="flex gap-2">
//                 <h4 className="text-sm">Longitude: </h4>
//                 <h4 className="text-sm">{center.lng}</h4>
//               </div>
//             </div>
//           </div>
//         </div>
//         <div>
//           <label htmlFor="">Detailed Address</label>
//           <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 flex gap-1">
//             <h2>{street} </h2>
//             <h2>{city} </h2>
//             <h2>{state} </h2>
//             <h2>{country}</h2>
//           </div>
//           <div className="mt-4">
//             <div className="aspect-w-5 aspect-h-5 sm:aspect-h-3">
//               <LocationMap latitude={center.lat} longitude={center.lng} />
//             </div>
//           </div>
//         </div>
//       </div>
//       <div className="mt-4 flex gap-x-4 ml-2 mb-4">
//         <Link
//           href={{
//             pathname: `/dashboard/add-listing/1`,
//             query: { userId: userId },
//           }}
//         >
//           <Button>Go Back</Button>
//         </Link>
//         <Link
//           href={{
//             pathname: `/dashboard/add-listing/3`,
//             query: { userId: userId },
//           }}
//         >
//           <Button>Continue</Button>
//         </Link>
//       </div>
//     </div>
//   );
// };

// export default PageAddListing2;

"use client";

import React, { FC, useEffect, useState } from "react";
import FormItem from "../FormItem";
import dynamic from "next/dynamic";
import { LoadScript } from "@react-google-maps/api";
import { useToast } from "@/hooks/use-toast";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import LocationMap from "@/components/LocationMap";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

const Map = dynamic(() => import("@/components/LocationMap"), { ssr: false });

interface Page2State {
  country: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  center: { lat: number; lng: number };
}

const PageAddListing2: FC = () => {
  const { toast } = useToast();
  const params = useSearchParams();
  const userId = params.get("userId");
  console.log(userId);

  const [address, setAddress] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else return JSON.parse(saved)["address"];
  });

  const [country, setCountry] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else return JSON.parse(saved)["country"];
  });

  const [state, setState] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else return JSON.parse(saved)["state"];
  });

  const [city, setCity] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else return JSON.parse(saved)["city"];
  });

  const [street, setStreet] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else return JSON.parse(saved)["street"];
  });

  const [postalCode, setPostalCode] = useState(() => {
    const saved = localStorage.getItem("page2");
    if (!saved) {
      return "";
    } else return JSON.parse(saved)["postalCode"];
  });

  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: 0,
    lng: 0,
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePlaceSelected = (place: any) => {
    setAddress(place.address);
    setCountry(place.country);
    setState(place.state);
    setCity(place.city);
    setStreet(place.street);
    setPostalCode(place.postalCode);
    setCenter({ lat: place.lat, lng: place.lng });
  };

  const [page2, setPage2] = useState<Page2State>({
    country,
    street,
    city,
    state,
    postalCode,
    center,
  });

  useEffect(() => {
    const newPage2: Page2State = {
      country,
      street,
      city,
      state,
      postalCode,
      center,
    };
    setPage2(newPage2);
    localStorage.setItem("page2", JSON.stringify(newPage2));
  }, [country, street, city, state, postalCode, center]);

  // Validation function
  const [isValidForm, setIsValidForm] = useState(false);
  const validateForm = () => {
    const missingFields: string[] = [];

    if (!country) missingFields.push("Country");
    if (!street) missingFields.push("Street");
    if (!city) missingFields.push("City");
    if (!state) missingFields.push("State");
    if (!postalCode) missingFields.push("Postal Code");

    if (missingFields.length > 0) {
      setIsValidForm(false);
      return false;
    }
    setIsValidForm(true);
    return true;
  };

  useEffect(() => {
    validateForm();
  }, [country, street, city, state, postalCode]);

  return (
    <div>
      <h2 className="text-2xl mb-2 font-semibold border-b border-primary pb-2">
        Choose the country
      </h2>
      <FormItem label="Country/Region">
        <Select value={country} onValueChange={(value) => setCountry(value)}>
          <SelectTrigger>
            <span>{country}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Greece">Greece</SelectItem>
            <SelectItem value="Italy">Italy</SelectItem>
            <SelectItem value="Cyprus">Cyprus</SelectItem>
            <SelectItem value="US">US</SelectItem>
            <SelectItem value="Netherlands">Netherlands</SelectItem>
            <SelectItem value="UK">UK</SelectItem>
            <SelectItem value="Hungary">Hungary</SelectItem>
            <SelectItem value="Turkey">Turkey</SelectItem>
            <SelectItem value="Bulgaria">Bulgaria</SelectItem>
            <SelectItem value="Lithuania">Lithuania</SelectItem>
            <SelectItem value="Malta">Malta</SelectItem>
            <SelectItem value="Romania">Romania</SelectItem>
            <SelectItem value="Spain">Spain</SelectItem>
            <SelectItem value="Croatia">Croatia</SelectItem>
            <SelectItem value="Portugal">Portugal</SelectItem>
            <SelectItem value="Slovenia">Slovenia</SelectItem>
            <SelectItem value="Slovakia">Slovakia</SelectItem>
            <SelectItem value="Viet Nam">Viet Nam</SelectItem>
            <SelectItem value="Thailand">Thailand</SelectItem>
            <SelectItem value="France">France</SelectItem>
            <SelectItem value="Singapore">Singapore</SelectItem>
            <SelectItem value="Japan">Japan</SelectItem>
            <SelectItem value="Korea">Korea</SelectItem>{" "}
          </SelectContent>{" "}
        </Select>{" "}
      </FormItem>

      <div className="flex flex-col my-4">
        <div className="ml-2 ">
          <LoadScript
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
            libraries={["places"]}
          >
            <div className="mt-2 mb-2">
              <PlacesAutocomplete
                onPlaceSelected={handlePlaceSelected}
                countryCode={country}
              />
            </div>
          </LoadScript>
        </div>
        <div className="w-full">
          <FormItem label="Street">
            <Input
              placeholder="..."
              value={street}
              onChange={(e) => setStreet(e.target.value.trim())}
            />
          </FormItem>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-5">
          <FormItem label="City">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value.trim())}
            />
          </FormItem>
          <FormItem label="State">
            <Input
              value={state}
              onChange={(e) => setState(e.target.value.trim())}
            />
          </FormItem>
          <FormItem label="Postal code">
            <Input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value.trim())}
            />
          </FormItem>
          <div>
            <h1>Coordinates</h1>
            <div className="flex gap-32 w-full mt-2">
              <div className="flex gap-2">
                <h4 className=" text-sm">Latitude: </h4>
                <h4 className=" text-sm">{center.lat}</h4>
              </div>
              <div className="flex gap-2">
                <h4 className="text-sm">Longitude: </h4>
                <h4 className="text-sm">{center.lng}</h4>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="">Detailed Address</label>
          <div className="mt-1 text-sm  text-neutral-500 dark:text-neutral-400 flex gap-x-3">
            <h2 className="flex gap-x-1">
              Street:<span>{street}</span>{" "}
            </h2>
            <h2 className="flex gap-x-1">
              City:<span>{city}</span>{" "}
            </h2>
            <h2 className="flex gap-x-1">
              State: <span>{state}</span>{" "}
            </h2>
            <h2 className="flex gap-x-1">
              Country:<span>{country}</span>
            </h2>
          </div>
          <div className="mt-4">
            <div className="aspect-w-5 aspect-h-5 sm:aspect-h-3">
              <LocationMap latitude={center.lat} longitude={center.lng} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-x-4 ml-2 mb-4">
        <Link
          href={{
            pathname: `/dashboard/add-listing/1`,
            query: { userId: userId },
          }}
        >
          <Button>Go Back</Button>
        </Link>

        <Button disabled={!isValidForm}>
          <Link
            href={{
              pathname: `/dashboard/add-listing/3`,
              query: { userId: userId },
            }}
          >
            Continue
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default PageAddListing2;
