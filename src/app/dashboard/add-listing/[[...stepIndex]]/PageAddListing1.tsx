// "use client";
// import React, { FC, useEffect, useState } from "react";
// import FormItem from "../FormItem";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { useSearchParams } from "next/navigation";

// export interface PageAddListing1Props {}

// interface Page1State {
//   propertyType: string;
//   placeName: string;
//   rentalForm: string;
//   numberOfPortions: number;
//   showPortionsInput: boolean;
//   rentalType: string;
// }

// const PageAddListing1: FC<PageAddListing1Props> = () => {
//   const params = useSearchParams();
//   const userId = params.get("userId");

//   const [propertyType, setPropertyType] = useState<string>(() => {
//     const savedPage = localStorage.getItem("page1") || "";
//     return savedPage ? JSON.parse(savedPage)["propertyType"] : "Hotel";
//   });

//   const [placeName, setPlaceName] = useState<string>(() => {
//     const savedPage = localStorage.getItem("page1") || "";
//     return savedPage ? JSON.parse(savedPage)["placeName"] : "";
//   });

//   const [rentalForm, setRentalForm] = useState<string>(() => {
//     const savedPage = localStorage.getItem("page1") || "";
//     return savedPage ? JSON.parse(savedPage)["rentalForm"] : "Private room";
//   });

//   const [numberOfPortions, setNumberOfPortions] = useState<number>(() => {
//     const savedPage = localStorage.getItem("page1") || "";
//     return savedPage
//       ? parseInt(JSON.parse(savedPage)["numberOfPortions"], 10)
//       : 1;
//   });

//   const [showPortionsInput, setShowPortionsInput] = useState<boolean>(() => {
//     const savedPage = localStorage.getItem("page1") || "";
//     return savedPage ? JSON.parse(savedPage)["showPortionsInput"] : false;
//   });

//   const [rentalType, setRentalType] = useState<string>(() => {
//     const savedRentalType = localStorage.getItem("page1") || "";
//     return savedRentalType
//       ? JSON.parse(savedRentalType)["rentalType"]
//       : "Short Term";
//   });

//   console.log(propertyType, placeName, rentalForm, numberOfPortions);

//   const [isFormComplete, setIsFormComplete] = useState<boolean>(false);
//   const handlePropertyTypeChange = (value: string) => setPropertyType(value);

//   const handlePlaceName = (e: React.ChangeEvent<HTMLInputElement>) => {
//     let value = e.target.value;
//     value = value.trimStart();
//     const formattedValue = value.replace(/\s{2,}/g, " ");
//     setPlaceName(formattedValue);
//   };

//   const handleRentalFormChange = (value: string) => {
//     setRentalForm(value);
//     if (value === "Private room by portion") {
//       setNumberOfPortions(2);
//       setShowPortionsInput(true);
//     } else {
//       setNumberOfPortions(1);
//       setShowPortionsInput(false);
//     }
//   };

//   const handleRentalTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setRentalType(e.target.id);
//   };

//   const handlePortionsInputChange = (
//     e: React.ChangeEvent<HTMLInputElement>
//   ) => {
//     const value = parseInt(e.target.value, 10);
//     if (value >= 2) {
//       setNumberOfPortions(value);
//     } else {
//       e.target.value = "2";
//     }
//   };

//   const checkFormCompletion = () => {
//     if (
//       propertyType &&
//       placeName &&
//       rentalForm &&
//       rentalType &&
//       (!showPortionsInput || numberOfPortions >= 2)
//     ) {
//       setIsFormComplete(true);
//     } else {
//       setIsFormComplete(false);
//     }
//   };

//   useEffect(() => {
//     const newPage1: Page1State = {
//       propertyType,
//       placeName,
//       rentalForm,
//       numberOfPortions,
//       showPortionsInput,
//       rentalType,
//     };
//     localStorage.setItem("page1", JSON.stringify(newPage1));
//     checkFormCompletion();
//   }, [
//     propertyType,
//     placeName,
//     rentalForm,
//     numberOfPortions,
//     showPortionsInput,
//     rentalType,
//   ]);

//   const handleNextClick = () => {
//     if (!isFormComplete) {
//       alert("Please fill out all fields before continuing.");
//     }
//   };

//   return (
//     <div>
//       <h2 className="text-2xl font-semibold border-b border-primary pb-2">
//         Choosing listing categories
//       </h2>
//       <div className="space-y-8">
//         <div className="mt-4 flex justify-between">
//           <div>
//             <label htmlFor="Short Term">Short Term</label>
//             <input
//               type="radio"
//               name="rentalType"
//               className="mx-2 p-2 cursor-pointer"
//               id="Short Term"
//               defaultChecked={rentalType === "Short Term"}
//               onChange={handleRentalTypeChange}
//             />
//           </div>
//           <div>
//             <label htmlFor="Long Term">Long Term</label>
//             <input
//               type="radio"
//               name="rentalType"
//               className="mx-2 p-2 cursor-pointer"
//               id="Long Term"
//               defaultChecked={rentalType === "Long Term"}
//               onChange={handleRentalTypeChange}
//             />
//           </div>
//           <div>
//             <label htmlFor="Both">Both</label>
//             <input
//               type="radio"
//               name="rentalType"
//               className="mx-2 p-2 cursor-pointer"
//               id="Both"
//               defaultChecked={rentalType === "Both"}
//               onChange={handleRentalTypeChange}
//             />
//           </div>
//         </div>

//         <FormItem
//           label="Choose a property type"
//           desc="Hotel: Professional hospitality businesses that usually have a unique style or theme defining their brand and decor"
//         >
//           <Select onValueChange={handlePropertyTypeChange} value={propertyType}>
//             <SelectTrigger>
//               <SelectValue placeholder="Select property type" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="Hotel">Hotel</SelectItem>
//               <SelectItem value="Cottage">Cottage</SelectItem>
//               <SelectItem value="Villa">Villa</SelectItem>
//               <SelectItem value="Cabin">Cabin</SelectItem>
//               <SelectItem value="Farm stay">Farm stay</SelectItem>
//               <SelectItem value="Houseboat">Houseboat</SelectItem>
//               <SelectItem value="Lighthouse">Lighthouse</SelectItem>
//               <SelectItem value="Studio">Studio</SelectItem>
//               <SelectItem value="Apartment">Apartment</SelectItem>
//               <SelectItem value="Condo">Condo</SelectItem>
//               <SelectItem value="Resort">Resort</SelectItem>
//               <SelectItem value="House">House</SelectItem>
//             </SelectContent>
//           </Select>
//         </FormItem>

//         <FormItem
//           label="Place name"
//           desc="A catchy name usually includes: House name + Room name + Featured property + Tourist destination"
//         >
//           <Input
//             placeholder="Place name"
//             onChange={handlePlaceName}
//             value={placeName}
//           />
//         </FormItem>

//         {rentalType === "Long Term" ? (
//           <></>
//         ) : (
//           <>
//             <FormItem
//               label="Rental form"
//               desc="Entire place: Guests have the whole place to themselves—there's a private entrance and no shared spaces. A bedroom, bathroom, and kitchen are usually included."
//             >
//               <Select onValueChange={handleRentalFormChange} value={rentalForm}>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select rental form" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="Private room">Private Area</SelectItem>
//                   <SelectItem value="Private room by portion">
//                     Private Area by portion
//                   </SelectItem>
//                   <SelectItem value="Shared Room">Shared Room</SelectItem>
//                   <SelectItem value="Hotel Room">Hotel Room</SelectItem>
//                 </SelectContent>
//               </Select>
//             </FormItem>
//           </>
//         )}

//         {showPortionsInput && (
//           <div className="mt-8">
//             <FormItem desc="The number of portions this place has. You have to fill it here.">
//               <Input
//                 type="number"
//                 value={numberOfPortions}
//                 onChange={handlePortionsInputChange}
//                 placeholder="Number of portions"
//                 min={2}
//                 title="Number of portions cannot be less than 2"
//               />
//             </FormItem>
//           </div>
//         )}
//       </div>

//       {isFormComplete ? (
//         <div className="mt-4 ml-2 mb-4">
//           <Link
//             href={{
//               pathname: `/dashboard/add-listing/2`,
//               query: { userId: userId },
//             }}
//             onClick={handleNextClick}
//           >
//             <Button disabled={!isFormComplete}>Continue</Button>
//           </Link>
//         </div>
//       ) : (
//         <div className="mt-4 ml-2 mb-4">
//           <Button disabled={!isFormComplete}>Continue</Button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PageAddListing1;
"use client";
import React, { FC, useEffect, useState } from "react";
import FormItem from "../FormItem";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

export interface PageAddListing1Props {}

interface Page1State {
  propertyType: string;
  placeName: string;
  rentalForm: string;
  numberOfPortions: number;
  showPortionsInput: boolean;
  rentalType: string;
}

const PageAddListing1: FC<PageAddListing1Props> = () => {
  const params = useSearchParams();
  const userId = params.get("userId");

  const [propertyType, setPropertyType] = useState<string>(() => {
    const savedPage = localStorage.getItem("page1") || "";
    return savedPage ? JSON.parse(savedPage)["propertyType"] : "Hotel";
  });

  const [placeName, setPlaceName] = useState<string>(() => {
    const savedPage = localStorage.getItem("page1") || "";
    return savedPage ? JSON.parse(savedPage)["placeName"] : "";
  });

  const [rentalForm, setRentalForm] = useState<string>(() => {
    const savedPage = localStorage.getItem("page1") || "";
    return savedPage ? JSON.parse(savedPage)["rentalForm"] : "Private room";
  });

  const [numberOfPortions, setNumberOfPortions] = useState<number>(() => {
    const savedPage = localStorage.getItem("page1") || "";
    return savedPage
      ? parseInt(JSON.parse(savedPage)["numberOfPortions"], 10)
      : 1;
  });

  const [showPortionsInput, setShowPortionsInput] = useState<boolean>(() => {
    const savedPage = localStorage.getItem("page1") || "";
    return savedPage ? JSON.parse(savedPage)["showPortionsInput"] : false;
  });

  const [rentalType, setRentalType] = useState<string>(() => {
    const savedRentalType = localStorage.getItem("page1") || "";
    return savedRentalType
      ? JSON.parse(savedRentalType)["rentalType"]
      : "Short Term";
  });

  console.log(propertyType, placeName, rentalForm, numberOfPortions);

  const [isFormComplete, setIsFormComplete] = useState<boolean>(false);
  const handlePropertyTypeChange = (value: string) => setPropertyType(value);

  const handlePlaceName = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.trimStart();
    const formattedValue = value.replace(/\s{2,}/g, " ");
    setPlaceName(formattedValue);
  };

  const handleRentalFormChange = (value: string) => {
    setRentalForm(value);
    if (value === "Private room by portion") {
      setNumberOfPortions(2);
      setShowPortionsInput(true);
    } else {
      setNumberOfPortions(1);
      setShowPortionsInput(false);
    }
  };

  const handleRentalTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedType = e.target.id;
    setRentalType(selectedType);

    if (selectedType === "Long Term") {
      setRentalForm("Private Area");
      setNumberOfPortions(1);
      setShowPortionsInput(false);
    } else {
      setShowPortionsInput(rentalForm === "Private room by portion");
    }
  };

  const handlePortionsInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value = parseInt(e.target.value, 10);

    if (value > 10) {
      value = 10; // Set the value to 10 if it exceeds 10
    } else if (value < 2) {
      value = 2; // Set the value to 2 if it's less than 2
    }

    setNumberOfPortions(value);
    e.target.value = value.toString(); // Update the input field value
  };

  const checkFormCompletion = () => {
    if (
      propertyType &&
      placeName &&
      rentalForm &&
      rentalType &&
      (!showPortionsInput || numberOfPortions >= 2)
    ) {
      setIsFormComplete(true);
    } else {
      setIsFormComplete(false);
    }
  };

  useEffect(() => {
    const newPage1: Page1State = {
      propertyType,
      placeName,
      rentalForm,
      numberOfPortions,
      showPortionsInput,
      rentalType,
    };
    localStorage.setItem("page1", JSON.stringify(newPage1));
    checkFormCompletion();
  }, [
    propertyType,
    placeName,
    rentalForm,
    numberOfPortions,
    showPortionsInput,
    rentalType,
  ]);

  const handleNextClick = () => {
    if (!isFormComplete) {
      alert("Please fill out all fields before continuing.");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold border-b border-primary pb-2">
        Choosing listing categories
      </h2>
      <div className="space-y-8">
        <div className="mt-4 flex justify-between">
          <div>
            <label htmlFor="Short Term">Short Term</label>
            <input
              type="radio"
              name="rentalType"
              className="mx-2 p-2 cursor-pointer"
              id="Short Term"
              defaultChecked={rentalType === "Short Term"}
              onChange={handleRentalTypeChange}
            />
          </div>
          <div>
            <label htmlFor="Long Term">Long Term</label>
            <input
              type="radio"
              name="rentalType"
              className="mx-2 p-2 cursor-pointer"
              id="Long Term"
              defaultChecked={rentalType === "Long Term"}
              onChange={handleRentalTypeChange}
            />
          </div>
          <div>
            <label htmlFor="Both">Both</label>
            <input
              type="radio"
              name="rentalType"
              className="mx-2 p-2 cursor-pointer"
              id="Both"
              defaultChecked={rentalType === "Both"}
              onChange={handleRentalTypeChange}
            />
          </div>
        </div>

        <FormItem
          label="Choose a property type"
          desc="Hotel: Professional hospitality businesses that usually have a unique style or theme defining their brand and decor"
        >
          <Select onValueChange={handlePropertyTypeChange} value={propertyType}>
            <SelectTrigger>
              <SelectValue placeholder="Select property type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Hotel">Hotel</SelectItem>
              <SelectItem value="Cottage">Cottage</SelectItem>
              <SelectItem value="Villa">Villa</SelectItem>
              <SelectItem value="Cabin">Cabin</SelectItem>
              <SelectItem value="Farm stay">Farm stay</SelectItem>
              <SelectItem value="Houseboat">Houseboat</SelectItem>
              <SelectItem value="Lighthouse">Lighthouse</SelectItem>
              <SelectItem value="Studio">Studio</SelectItem>
              <SelectItem value="Apartment">Apartment</SelectItem>
              <SelectItem value="Condo">Condo</SelectItem>
              <SelectItem value="Resort">Resort</SelectItem>
              <SelectItem value="House">House</SelectItem>
              <SelectItem value="Holiday homes">Holiday homes</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>

        <FormItem
          label="Place name"
          desc="A catchy name usually includes: House name + Room name + Featured property + Tourist destination"
        >
          <Input
            placeholder="Place name"
            onChange={handlePlaceName}
            value={placeName}
          />
        </FormItem>

        {rentalType === "Long Term" ? null : (
          <FormItem
            label="Rental form"
            desc="Entire place: Guests have the whole place to themselves—there's a private entrance and no shared spaces. A bedroom, bathroom, and kitchen are usually included."
          >
            <Select onValueChange={handleRentalFormChange} value={rentalForm}>
              <SelectTrigger>
                <SelectValue placeholder="Select rental form" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Private room">Private Area</SelectItem>
                <SelectItem value="Private room by portion">
                  Private Area by portion
                </SelectItem>
                <SelectItem value="Shared Room">Shared Room</SelectItem>
                <SelectItem value="Hotel Room">Hotel Room</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}

        {showPortionsInput && (
          <div className="mt-8">
            <FormItem desc="The number of portions this place has. You have to fill it here.">
              <Input
                type="number"
                value={numberOfPortions}
                onChange={handlePortionsInputChange}
                placeholder="Number of portions"
                min={2}
                max={10}
                inputMode="numeric"
                title="Number of portions cannot be less than 2"
              />
            </FormItem>
          </div>
        )}
      </div>

      {isFormComplete ? (
        <div className="mt-4 ml-2 mb-4">
          <Link
            href={{
              pathname: `/dashboard/add-listing/2`,
              query: { userId: userId },
            }}
            onClick={handleNextClick}
          >
            <Button disabled={!isFormComplete}>Continue</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-4 ml-2 mb-4">
          <Button disabled={!isFormComplete}>Continue</Button>
        </div>
      )}
    </div>
  );
};

export default PageAddListing1;
