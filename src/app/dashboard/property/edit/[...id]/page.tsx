"use client";
import { useState, useEffect, ChangeEvent, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MdAdsClick, MdCancel } from "react-icons/md";
import axios from "axios";
import { HiArrowNarrowLeft } from "react-icons/hi";
import { MdArrowDropDown, MdArrowRight } from "react-icons/md";
import { imageInterface, Property, propertyTypes } from "@/util/type";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IoRemoveSharp } from "react-icons/io5";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import Loader from "@/components/loader";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, UploadIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ScreenLoader from "@/components/ScreenLoader";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Img from "@/components/Img";
import CustomTooltip from "@/components/CustomToolTip";
import { FaBath, FaEuroSign, FaUser } from "react-icons/fa6";
import { IoIosBed } from "react-icons/io";
import { SlSizeFullscreen } from "react-icons/sl";
import { FaCalendarAlt } from "react-icons/fa";
import { Label } from "@/components/ui/label";
import Heading from "@/components/Heading";

interface PageProps {
  params: {
    id: string;
  };
}

// TODO : Generate Lat-Lng from pincode
const getCoordinatesFromPincode = async (pincode: any) => {
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&format=json&limit=1`;
  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data.length > 0) {
      const { lat, lon } = data[0];
      return { lat: parseFloat(lat), lon: parseFloat(lon) };
    } else {
      throw new Error("No results found");
    }
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
};

const EditPropertyPage = ({ params }: PageProps) => {
  const { toast } = useToast();
  let portions = 0;
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [numberOfPortions, setNumberOfPortions] = useState<number>(1);

  const [propertyCoverFileUrl, setPropertyCoverFileUrl] = useState<string>("");

  const [propertyPictureUrls, setPropertyPictureUrls] = useState<string[]>(
    () => {
      const savedUrls = localStorage.getItem("propertyPictureUrls");
      return savedUrls ? JSON.parse(savedUrls) : Array(5).fill("");
    }
  );

  const [portionCoverFileUrls, setPortionCoverFileUrls] = useState<string[]>(
    []
  );

  const [portionPictureUrls, setPortionPictureUrls] = useState<string[][]>(
    () => {
      const savedUrls = localStorage.getItem("portionPictureUrls");
      const arrayOf5 = Array(5).fill("");

      return savedUrls ? JSON.parse(savedUrls) : Array(portions).fill(arrayOf5);
    }
  );

  // ! Array to delete images from bunny
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [imageDeleteObject, setImageDeleteObj] =
    useState<Partial<imageInterface>>();
  const [refreshFetchProperty, setRefreshFetchProperty] =
    useState<boolean>(false);
  const [icalPlatform, setIcalPlatform] = useState<string>("");
  const icalLinkRef = useRef<HTMLInputElement>(null);
  // this state is used to re-fetch the property when a user clicks on 'save changes' or 'delete images' button

  // ! FormData
  const [formData, setFormData] = useState<Partial<Property>>({
    VSID: property?.VSID,
    rentalType: property?.rentalType,
    _id: property?._id,
    propertyType: property?.propertyType,
    placeName: property?.placeName,
    rentalForm: property?.rentalForm,
    numberOfPortions: property?.numberOfPortions,

    street: property?.street,
    postalCode: property?.postalCode,
    city: property?.city,
    state: property?.state,
    country: property?.country,

    portionName: property?.portionName,
    portionSize: property?.portionSize,
    guests: property?.guests,
    bedrooms: property?.bedrooms,
    beds: property?.beds,
    bathroom: property?.bathroom,
    kitchen: property?.kitchen,
    childrenAge: property?.childrenAge,

    basePrice: property?.basePrice,
    weekendPrice: property?.weekendPrice,
    monthlyDiscount: property?.monthlyDiscount,
    icalLinks: property?.icalLinks,

    email: property?.email,
    generalAmenities: property?.generalAmenities,
    otherAmenities: property?.otherAmenities,
    safeAmenities: property?.safeAmenities,

    smoking: property?.smoking,
    pet: property?.pet,
    party: property?.party,
    cooking: property?.cooking,
    additionalRules: property?.additionalRules,

    center: property?.center,

    reviews: property?.reviews,

    propertyCoverFileUrl: property?.propertyCoverFileUrl,
    propertyPictureUrls: property?.propertyPictureUrls,
    portionCoverFileUrls: property?.portionCoverFileUrls,
    portionPictureUrls: property?.portionPictureUrls,

    time: property?.time,
    weeklyDiscount: property?.weeklyDiscount,
    night: property?.night,
    datesPerPortion: property?.datesPerPortion,

    isLive: property?.isLive,
  });

  // TODO: Fetching Property
  useEffect(() => {
    if (params.id) {
      const fetchProperty = async () => {
        setLoading(true);
        try {
          const response = await axios.post("/api/singleproperty/getproperty", {
            propertyId: params.id,
          });
          console.log(response.data);
          setProperty(response.data);
          setNumberOfPortions(response.data.numberOfPortions);
          setPropertyPictureUrls(response.data.propertyPictureUrls);
          setPropertyCoverFileUrl(response.data.propertyCoverFileUrl);
          setPortionCoverFileUrls(response.data.portionCoverFileUrls);
          setPortionPictureUrls(response.data.portionPictureUrls);
          const imgDeleteObj = {
            propertyCoverFileUrl: [],
            propertyPictureUrls: [],
            portionCoverFileUrls: [],
            portionPictureUrls: Array(
              response.data.portionCoverFileUrls.length
            ).fill("00000"),
          };
          setImageDeleteObj(imgDeleteObj);

          setLoading(false);
        } catch (error: any) {
          console.error("Error fetching property:", error);
          setLoading(false);
        } finally {
          setLoading(false);
        }
      };

      fetchProperty();
    }
  }, [params.id, refreshFetchProperty]);

  useEffect(() => {
    if (property) {
      setFormData({
        VSID: property.VSID,
        rentalType: property.rentalType,

        _id: property._id,
        propertyType: property.propertyType,
        placeName: property.placeName,
        rentalForm: property.rentalForm,
        numberOfPortions: property.numberOfPortions,

        email: property?.email,
        street: property.street,
        postalCode: property.postalCode,
        city: property.city,
        state: property.state,
        country: property.country,

        portionName: property.portionName,
        portionSize: property.portionSize,
        guests: property.guests,
        bedrooms: property.bedrooms,
        beds: property.beds,
        bathroom: property.bathroom,
        kitchen: property.kitchen,
        childrenAge: property.childrenAge,

        center: property.center,
        basePrice: property.basePrice,
        weekendPrice: property.weekendPrice,
        monthlyDiscount: property.monthlyDiscount,

        icalLinks: property.icalLinks,

        generalAmenities: property.generalAmenities,
        otherAmenities: property.otherAmenities,
        safeAmenities: property.safeAmenities,

        smoking: property.smoking,
        pet: property.pet,
        party: property.party,
        cooking: property.cooking,
        additionalRules: property.additionalRules,

        propertyCoverFileUrl: property?.propertyCoverFileUrl,
        propertyPictureUrls: property?.propertyPictureUrls,
        portionCoverFileUrls: property?.portionCoverFileUrls,
        portionPictureUrls: property?.portionPictureUrls,

        reviews: property.reviews,

        weeklyDiscount: property.weeklyDiscount,
        night: property.night,
        time: property.time,
        datesPerPortion: property.datesPerPortion,

        isLive: property.isLive,
      });
    }
  }, [property]);

  const data = localStorage.getItem("page1") || "";
  if (data) {
    const value = JSON.parse(data)["numberOfPortions"];
    if (value) {
      portions = parseInt(value, 10);
    }
  }

  useEffect(() => {
    localStorage.setItem("propertyCoverFileUrl", propertyCoverFileUrl);
  }, [propertyCoverFileUrl]);

  useEffect(() => {
    localStorage.setItem(
      "portionPictureUrls",
      JSON.stringify(portionPictureUrls)
    );
  }, [portionPictureUrls]);

  useEffect(() => {
    localStorage.setItem(
      "propertyPictureUrls",
      JSON.stringify(propertyPictureUrls)
    );
  }, [propertyPictureUrls]);

  useEffect(() => {
    console.log("use effect");
    localStorage.setItem(
      "portionCoverFileUrls",
      JSON.stringify(portionCoverFileUrls)
    );
  }, [portionCoverFileUrls]);

  let placeName: string | undefined = formData?.placeName;
  placeName = placeName?.toLowerCase();
  const placeNameSplitArray: string[] | undefined = placeName?.split(" ");
  placeName = placeNameSplitArray?.join("_");

  const [loadingProperty, setLoadingproperty] = useState(false);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    const trimmedValue = value.trim();
    setFormData((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : trimmedValue,
    }));
  };

  // TODO Additional Rules
  const handleAddRule = () => {
    setFormData((prevState) => ({
      ...prevState,
      additionalRules: [...(prevState.additionalRules || []), ""],
    }));
  };

  const handleAddIcalLink = () => {
    const newObj = {
      [icalPlatform]: icalLinkRef.current?.value,
    };
    setFormData((prevState) => ({
      ...prevState,
      icalLinks: { ...(prevState.icalLinks || {}), ...newObj },
    }));
    if (icalLinkRef.current) {
      icalLinkRef.current.value = "";
    }
  };

  const handleRemoveIcalLink = (platform: string) => {
    const newObj = { ...formData?.icalLinks } as { [key: string]: string };
    delete newObj[platform];

    setFormData((prevState) => ({
      ...prevState,
      icalLinks: newObj,
    }));
  };

  //! Update a specific rule
  const handleRuleChange = (index: number, value: string) => {
    const updatedRules = [...(formData.additionalRules || [])];
    updatedRules[index] = value;
    setFormData((prevState) => ({
      ...prevState,
      additionalRules: updatedRules,
    }));
  };

  //! Remove a rule from additionalRules array
  const handleRemoveRule = (index: number) => {
    const updatedRules = [...(formData.additionalRules || [])];
    updatedRules.splice(index, 1);
    setFormData((prevState) => ({
      ...prevState,
      additionalRules: updatedRules,
    }));
  };

  const handlePostalCode = async (e: any) => {
    const { name, value } = e.target;

    // If the postal code changes, fetch coordinates
    if (name === "postalCode") {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));

      if (value) {
        const coordinates = await getCoordinatesFromPincode(value);
        if (coordinates) {
          setFormData((prevData) => ({
            ...prevData,
            center: {
              lat: coordinates.lat,
              lng: coordinates.lon,
            },
          }));
        }
      }
    } else {
      // Handle other input changes
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  // ! state to open the dropdown on clicking on portion number
  const [isPortionOpen, setIsPortionOpen] = useState<boolean[]>(() =>
    Array.from({ length: numberOfPortions }, () => false)
  );

  // TODO: portionContent - render portion content only if numberOfPortions is greater than 1
  const portionContent = (index: number) => {
    return (
      <>
        {/* // ! portion name */}
        <div>
          <label className="text-xs" htmlFor="portionName">
            Portion&apos;s Name
            <Input
              type="text"
              name="cooking"
              value={formData?.portionName?.at(index) || ""}
              onChange={(e) => {
                const newFormData = { ...formData };
                newFormData?.portionName?.splice(index, 1, e.target.value);
                setFormData(newFormData);
              }}
            />
          </label>
        </div>

        {/* // ! portionSize, guests, bedrooms, beds, bathrooms */}
        <div className=" flex  md:flex-row flex-col  space-x-4">
          <div>
            <label className="text-xs" htmlFor="portionSize">
              Portion&apos;s Size
              <Input
                type="number"
                min={0}
                name="portionSize"
                value={formData?.portionSize?.at(index) || ""}
                onChange={(e) => {
                  const newFormData = { ...formData };
                  newFormData?.portionSize?.splice(
                    index,
                    1,
                    parseInt(e.target.value)
                  );
                  setFormData(newFormData);
                }}
              />
            </label>
          </div>

          <div>
            <label className="text-xs" htmlFor="guests">
              Number Of Guests
              <Input
                type="number"
                name="guests"
                min={0}
                value={formData?.guests?.at(index) || ""}
                onChange={(e) => {
                  const newFormData = { ...formData };
                  newFormData?.guests?.splice(
                    index,
                    1,
                    parseInt(e.target.value)
                  );
                  setFormData(newFormData);
                }}
              />
            </label>
          </div>

          <div>
            <label className="text-xs" htmlFor="bedrooms">
              Number Of Bedrooms
              <Input
                type="number"
                name="bedrooms"
                min={0}
                value={formData?.bedrooms?.at(index) || ""}
                onChange={(e) => {
                  const newFormData = { ...formData };
                  newFormData?.bedrooms?.splice(
                    index,
                    1,
                    parseInt(e.target.value)
                  );
                  setFormData(newFormData);
                }}
              />
            </label>
          </div>

          <div>
            <label className="text-xs" htmlFor="beds">
              Number Of Beds
              <Input
                type="number"
                name="beds"
                min={0}
                value={formData?.beds?.at(index) || ""}
                onChange={(e) => {
                  const newFormData = { ...formData };
                  newFormData?.beds?.splice(index, 1, parseInt(e.target.value));
                  setFormData(newFormData);
                }}
              />
            </label>
          </div>

          <div>
            <label className="text-xs" htmlFor="bathroom">
              Number Of Bathrooms
              <Input
                type="number"
                name="bathroom"
                min={0}
                value={formData?.bathroom?.at(index) || ""}
                onChange={(e) => {
                  const newFormData = { ...formData };
                  newFormData?.bathroom?.splice(
                    index,
                    1,
                    parseInt(e.target.value)
                  );
                  setFormData(newFormData);
                }}
              />
            </label>
          </div>
        </div>

        {/* // ! number of kitchen, base price, children's age */}
        <div className=" flex  md:flex-row flex-col  space-x-4">
          <label
            className="text-xs mt-2 line-clamp-1"
            htmlFor="monthlyDiscount"
          >
            Weekly Discount {numberOfPortions > 1 ? `Portion ${index + 1}` : ""}
            <Input
              type="number"
              min={0}
              name="weeklyDiscount"
              value={formData?.weeklyDiscount?.at(index) || ""}
              onChange={(e) => {
                const newFormData = { ...formData };
                newFormData?.weeklyDiscount?.splice(
                  index,
                  1,
                  parseInt(e.target.value)
                );
                setFormData(newFormData);
              }}
            />
          </label>

          <div>
            <label className="text-xs" htmlFor="kitchen">
              Number Of Kitchen
              <Input
                type="number"
                name="kitchen"
                min={0}
                value={formData?.kitchen?.at(index) || ""}
                onChange={(e) => {
                  const newFormData = { ...formData };
                  newFormData?.kitchen?.splice(
                    index,
                    1,
                    parseInt(e.target.value)
                  );
                  setFormData(newFormData);
                }}
              />
            </label>
          </div>

          <div>
            <label className="text-xs" htmlFor="childrenAge">
              Children&apos;s Age
              <Input
                type="number"
                name="childrenAge"
                min={0}
                value={formData?.childrenAge?.at(index) || ""}
                onChange={(e) => {
                  const newFormData = { ...formData };
                  newFormData?.childrenAge?.splice(
                    index,
                    1,
                    parseInt(e.target.value)
                  );
                  setFormData(newFormData);
                }}
              />
            </label>
          </div>

          <div>
            <label className="text-xs" htmlFor="basePrice">
              Base Price of{" "}
              {numberOfPortions > 1 ? `Portion ${index + 1}` : "Property"}
              <Input
                type="number"
                name="basePrice"
                min={0}
                value={formData?.basePrice?.at(index) || ""}
                onChange={(e) => {
                  const newFormData = { ...formData };
                  newFormData?.basePrice?.splice(
                    index,
                    1,
                    parseInt(e.target.value)
                  );
                  setFormData(newFormData);
                }}
              />
            </label>
          </div>

          <div>
            <label className="text-xs" htmlFor="weekendPrice">
              Weekend Price of{" "}
              {numberOfPortions > 1 ? `Portion ${index + 1}` : "Property"}
              <Input
                type="number"
                min={0}
                name="weekendPrice"
                value={formData?.weekendPrice?.at(index) || ""}
                onChange={(e) => {
                  const newFormData = { ...formData };
                  newFormData?.weekendPrice?.splice(
                    index,
                    1,
                    parseInt(e.target.value)
                  );
                  setFormData(newFormData);
                }}
              />
            </label>
          </div>
        </div>

        {/* // ! monthly discount */}
        <div className=" flex  md:flex-row flex-col  space-x-4">
          <label className="text-xs line-clamp-1" htmlFor="monthlyDiscount">
            Monthly Discount For{" "}
            {numberOfPortions > 1 ? `Portion ${index + 1}` : "Property"}
            <Input
              type="number"
              min={0}
              name="monthlyDiscount"
              value={formData?.monthlyDiscount?.at(index) || ""}
              onChange={(e) => {
                const newFormData = { ...formData };
                newFormData?.monthlyDiscount?.splice(
                  index,
                  1,
                  parseInt(e.target.value)
                );
                setFormData(newFormData);
              }}
            />
          </label>
        </div>

        {/* // ! description */}
        <label className="" htmlFor={`description-${index}`}>
          Description of{" "}
          {numberOfPortions > 1 ? `Portion ${index + 1}` : "Property"}
          <Textarea
            className="h-32"
            name="review"
            value={formData?.reviews?.[index] || ""}
            onChange={(e) => {
              const updatedReviews = [...(formData.reviews || [])];
              updatedReviews[index] = e.target.value;
              setFormData({
                ...formData,
                reviews: updatedReviews,
              });
            }}
          />
        </label>
      </>
    );
  };

  //TODO: Image Upload Part
  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    imageType: string,
    index: number,
    portionIndex: number
  ) => {
    const files = event?.target?.files;
    const fileArr = Array.from(files || []);

    // * checking file type
    for (const file of fileArr) {
      if (
        !file ||
        !(
          file.type === "image/jpeg" ||
          file.type === "image/png" ||
          file.type === "image/webp"
        )
      ) {
        toast({
          variant: "destructive",
          title: "Type Mismatch",
          description:
            "We only accept jpeg , png , webp for now try to upload this format",
        });
        return;
      }
    }
    console.log("files: ", files);
    // * intitalizing Bunny
    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL;

    const formData = new FormData();
    const savedUrls: string[] = [];

    // setLoading(true);
    setLoadingproperty(true);

    for (const file of fileArr) {
      formData.append("file", file);
      console.log("formdata: ", formData);
      try {
        const dt = Date.now();

        const response = await axios.put(
          `${storageUrl}/${storageZoneName}/${placeName}/${dt}${file.name}`,
          file,
          {
            headers: {
              AccessKey: accessKey,
              "Content-Type": file.type,
            },
          }
        );
        console.log("response: ", response);

        const imageUrl = `https://vacationsaga.b-cdn.net/${placeName}/${dt}${file.name}`;
        console.log("savedUrls: ", savedUrls);
        savedUrls.push(imageUrl);
        console.log("savedUrls: ", savedUrls);
      } catch (error) {
        console.error("Error uploading image to Bunny CDN:", error);
        toast({
          variant: "destructive",
          title: "Upload Error",
          description:
            "An error occurred while uploading the image. Please try again later.",
        });
        break;
      }
    }

    if (imageType === "propertyCoverFileUrl") {
      setPropertyCoverFileUrl(savedUrls[0]);
    } else if (imageType === "propertyPictureUrls") {
      setPropertyPictureUrls((prev) => [...prev, ...savedUrls]);
    } else if (imageType === "portionCoverFileUrls") {
      setPortionCoverFileUrls((prev) => [
        ...prev.slice(0, index),
        savedUrls[0],
        ...prev.slice(index + 1),
      ]);
    } else if (imageType === "portionPictureUrls") {
      setPortionPictureUrls((prev) => {
        const newUrls: string[][] = [...prev];
        newUrls[index] = newUrls[index].filter((item) => item != "");
        newUrls[index] = [
          ...savedUrls,
          ...newUrls[index].slice(savedUrls.length),
        ];
        return newUrls;
      });
    }

    // setLoading(false);
    setLoadingproperty(false);
  };

  // TODO: Image deletion part
  const handleImageSelect = (
    checked: string | boolean,
    imageType: string,
    imageUrl: string,
    index: number,
    portionIndex: number
  ) => {
    // * addding & deleting the images from the state array
    const newArr = [...imagesToDelete];
    if (newArr.includes(imageUrl)) {
      const indexToRemove = newArr.indexOf(imageUrl);
      newArr.splice(indexToRemove, 1);
    } else {
      newArr.push(imageUrl);
    }
    setImagesToDelete(newArr);

    const newObj = { ...imageDeleteObject };

    if (imageType === "portionPictureUrls") {
      if (checked) {
        newObj["portionPictureUrls"]![portionIndex] =
          newObj["portionPictureUrls"]?.[portionIndex]?.slice(0, index) +
          "1" +
          newObj["portionPictureUrls"]?.[portionIndex]?.slice(index + 1);
      } else {
        newObj["portionPictureUrls"]![portionIndex] =
          newObj["portionPictureUrls"]?.[portionIndex]?.slice(0, index) +
          "0" +
          newObj["portionPictureUrls"]?.[portionIndex]?.slice(index + 1);
      }
    } else {
      // ! for imageType propertyCoverFileUrl, propertyPictureUrls and portionCoverFileUrls
      if (checked) {
        (newObj as any)[imageType]?.push(index);
      } else {
        const indexToRemove = (newObj as any)[imageType]!.indexOf(index);
        (newObj as any)[imageType]!.splice(indexToRemove, 1);
      }
    }

    setImageDeleteObj(newObj);
  }; // ! create an array of urls of all the selected images

  const bunnyImageDelete = async (imageUrl: string) => {
    try {
      const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
      const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
      const filePath = imageUrl.split("https://vacationsaga.b-cdn.net/")[1];

      const deleteOptions = {
        method: "DELETE",
        url: `https://storage.bunnycdn.com/${storageZoneName}/${filePath}`,
        headers: { AccessKey: accessKey },
      };

      const bunnyDeleteResponse = await axios(deleteOptions);
      console.log("Bunny CDN file deleted:", bunnyDeleteResponse.data);
    } catch (bunnyError) {
      console.error("Error deleting file from Bunny CDN:", bunnyError);
      toast({
        variant: "destructive",
        title: "Bunny CDN Deletion failed",
        description:
          "Some error occurred while deleting the image from Bunny CDN. Please try again later.",
      });
      return;
    }
  }; // ! delete the images from bunny storage by running a loop on handleImageSelect

  const handleImageDelete = async () => {
    try {
      const response = await axios.post("/api/editproperty/deleteImages", {
        pId: params.id,
        data: imageDeleteObject,
      });
      toast({
        title: "Success",
        description: "Images deleted successfully",
      });
      setRefreshFetchProperty((prev) => !prev);

      try {
        imagesToDelete.forEach((imageUrl) => {
          bunnyImageDelete(imageUrl);
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error deleting image from bunny",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `${err.response.data.error}`,
      });
    }
  }; // ! deletes the images from database and then from bunny

  // TODO: Submit Function
  const handleSubmit = async () => {
    const newFormData = { ...formData };
    newFormData["propertyCoverFileUrl"] = propertyCoverFileUrl;
    newFormData["propertyPictureUrls"] = propertyPictureUrls;
    newFormData["portionCoverFileUrls"] = portionCoverFileUrls;
    newFormData["portionPictureUrls"] = portionPictureUrls;
    setLoadingproperty(true);
    try {
      const response = await axios.post("/api/editproperty/editpropertydata", {
        propertyId: params.id,
        updatedData: newFormData,
      });

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Property updated successfully!",
        });
        setRefreshFetchProperty((prev) => !prev);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update property. Please try again.",
        });
      }
      setLoadingproperty(false);
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while updating the property.",
      });
      setLoadingproperty(false);
    }
  };

  return (
    <>
     
        <div className="max-w-6xl  mx-auto ">
          {loading ? (
            <div className="flex items-center justify-center  w-full">
              <Loader />
            </div>
          ) : (
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="flex sm:p-4 flex-col gap-x-2">
                <Heading
                  heading="Edit property details"
                  subheading="You can edit property details from here."
                />

                <div>
                  <div className="flex  rounded-lg sm:p-2  flex-col ">
                    <div className="">
                      <h1>Cover Image</h1>
                      <div className="border min-h-60 pb-2 rounded-lg flex items-center justify-center relative overflow-hidden">
                        <div className=" absolute bottom-0 right-0 z-50">
                          <label htmlFor={`file-upload-propertyCoverFile`}>
                            <div
                              className="text-xs  flex flex-col-reverse items-center hover:bg-white/50 dark:hover:bg-white/10 border rounded-lg py-4 px-2 cursor-pointer
                                "
                            >
                              <span>Upload Cover </span>{" "}
                              <UploadIcon className="animate-bounce" />
                            </div>
                            <input
                              id={`file-upload-propertyCoverFile`}
                              name={`file-upload-propertyCoverFile`}
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              // onChange={(e) => uploadPropertyCoverFile(e)}
                              onChange={(e) =>
                                handleImageUpload(
                                  e,
                                  "propertyCoverFileUrl",
                                  0,
                                  -1
                                )
                              }
                            />
                          </label>
                        </div>
                        {propertyCoverFileUrl ||
                        formData?.propertyCoverFileUrl ? (
                          <AspectRatio
                            ratio={16 / 9}
                            className=" flex justify-center items-center z-0"
                          >
                            <Img
                              src={
                                propertyCoverFileUrl ||
                                formData?.propertyCoverFileUrl ||
                                "/replacer.jpg"
                              }
                              className=" w-full rounded-lg px-2 py-2 max-w-4xl max-h-[600px]  object-contain"
                              alt="coverimage"
                            />
                          </AspectRatio>
                        ) : (
                          <div className="">
                            <p className="text-center flex items-center justify-center ">
                              No image found
                            </p>
                          </div>
                        )}

                        {formData?.propertyCoverFileUrl && (
                          <Checkbox
                            className="cursor-pointer absolute left-4 top-4 bg-neutral-900 border border-primary"
                            key="propertyCoverFileUrl"
                            name="propertyCoverFileUrl"
                            onCheckedChange={(checked) =>
                              handleImageSelect(
                                checked,
                                "propertyCoverFileUrl",
                                formData.propertyCoverFileUrl!,
                                0,
                                -1
                              )
                            }
                          />
                        )}
                      </div>

                      <div>
                        <h1 className="mt-4">Property Pictures</h1>
                      </div>

                      <div className="space-x-2 overflow-x-auto overflow-y-hidden">
                        <div className="flex space-x-4">
                          <label htmlFor={`file-upload-propertyPictureUrls`}>
                            <div className="flex items-center h-40 border hover:cursor-pointer  hover:bg-white/50 dark:hover:bg-white/10 w-40 mt-2 rounded-lg justify-center flex-col">
                              <UploadIcon className=" animate-bounce z-10 text-xs  cursor-pointer" />
                              <p> Upload Pictures</p>
                            </div>

                            <input
                              id={`file-upload-propertyPictureUrls`}
                              name={`file-upload-propertyPictureUrls`}
                              type="file"
                              className="sr-only"
                              multiple
                              accept="image/*"
                              // onChange={(e) => uploadPropertyPictures(e)}
                              onChange={(e) =>
                                handleImageUpload(
                                  e,
                                  "propertyPictureUrls",
                                  0,
                                  -1
                                )
                              }
                            />
                          </label>
                          {propertyPictureUrls
                            ?.filter((url) => url)
                            ?.map((url, index) => (
                              <div
                                key={index}
                                className="relative flex-shrink-0 m-2"
                              >
                                {propertyPictureUrls[index] ||
                                formData?.propertyPictureUrls?.[index] ? (
                                  <Img
                                    src={
                                      propertyPictureUrls[index] ||
                                      formData?.propertyPictureUrls?.[index] ||
                                      "/replacer.jpg"
                                    }
                                    alt="property"
                                    className="w-40 h-40 object-cover rounded-md"
                                  />
                                ) : (
                                  <p className="text-center text-gray-500">
                                    No image found
                                  </p>
                                )}

                                <Checkbox
                                  className="cursor-pointer absolute left-2 top-2 bg-neutral-900 border-primary"
                                  key={`propertyPictureUrls-${index}`}
                                  name={`propertyPictureUrls-${index}`}
                                  onCheckedChange={(checked) =>
                                    handleImageSelect(
                                      checked,
                                      "propertyPictureUrls",
                                      formData.propertyPictureUrls?.[index]!,
                                      index,
                                      -1
                                    )
                                  }
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="">
                  <label>
                    VSID
                    <Input
                      type="text"
                      name="VSID"
                      value={formData?.VSID || ""}
                      onChange={handleChange}
                      disabled
                    />
                  </label>
                </div>

                <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                  <div className="w-full">
                    <label>
                      <h1 className="">Owner email</h1>
                      <Input
                        type="text"
                        name="email"
                        value={formData?.email || "Not Found"}
                        disabled
                      />
                    </label>
                  </div>
                  <div className="w-full">
                    <h1 className="">Property Id</h1>
                    <Input
                      type="text"
                      name="_id"
                      value={formData?._id || "Not Found"}
                      onChange={handleChange}
                      disabled
                    />
                  </div>
                </div>

                <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                  <div className="w-full">
                    <label>
                      <h1 className="">Rental Form</h1>
                      <Input
                        type="text"
                        name="rentalType"
                        value={formData?.rentalForm || "Not Found"}
                        onChange={handleChange}
                        disabled
                      />
                    </label>
                  </div>
                  <div className="w-full">
                    <h1 className="">Rental Type</h1>
                    <Input
                      type="text"
                      name=""
                      value={formData?.rentalType || "Not Found"}
                      onChange={handleChange}
                      disabled
                    />
                  </div>
                </div>
                <p className="text-xs">
                  Above data it read only no need to change
                </p>
                <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full">
                  <div className="w-full">
                    <h1 className="">Property Type</h1>
                    <Select
                      name="propertyType"
                      value={formData.propertyType}
                      onValueChange={(value) =>
                        handleChange({
                          target: { name: "propertyType", value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full">
                    <label className=" ">
                      Place Name
                      <Input
                        type="text"
                        name="placeName"
                        value={formData?.placeName || ""}
                        onChange={handleChange}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                  <div className="w-full">
                    <label>
                      <h1 className="">State</h1>
                      <Input
                        type="text"
                        name="state"
                        value={formData?.state || ""}
                        onChange={handleChange}
                      />
                    </label>
                  </div>
                  <div className="w-full">
                    <label>
                      Country
                      <Input
                        type="text"
                        name="country"
                        value={formData?.country || ""}
                        onChange={handleChange}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                  <div className="w-full">
                    <label>
                      <h1 className="">Street</h1>
                      <Input
                        type="text"
                        name="street"
                        value={formData?.street || ""}
                        onChange={handleChange}
                      />
                    </label>
                  </div>
                  <div className="w-full">
                    <label>
                      <h1 className="">Pet Friendly</h1>
                      <Input
                        type="text"
                        name="pet"
                        value={formData?.pet || ""}
                        onChange={handleChange}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                  <div className="w-full">
                    <label>
                      <h1 className="">Party Friendly</h1>
                      <Input
                        type="text"
                        name="party"
                        value={formData?.party || ""}
                        onChange={handleChange}
                      />
                    </label>
                  </div>
                  <div className="w-full">
                    <label>
                      <h1 className="">Cooking</h1>
                      <Input
                        type="text"
                        name="cooking"
                        value={formData?.cooking || ""}
                        onChange={handleChange}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full">
                  <div className="w-full">
                    <label>
                      <h1>Check-in Time</h1>
                      <Input
                        type="number"
                        name="checkinTime"
                        value={(formData?.time && formData.time[0]) || ""}
                        onChange={(e) => {
                          const newTime = [...(formData?.time || [])];
                          newTime[0] = parseInt(e.target.value, 10);
                          const newObj = { ...formData, time: newTime };
                          setFormData(newObj);
                        }}
                      />
                    </label>
                  </div>
                  <div className="w-full">
                    <label>
                      <h1>Check-out Time</h1>
                      <Input
                        type="number"
                        name="checkoutTime"
                        value={(formData?.time && formData.time[1]) || ""}
                        onChange={(e) => {
                          const newTime = [...(formData?.time || [])];
                          newTime[1] = parseInt(e.target.value, 10);
                          const newObj = { ...formData, time: newTime };
                          setFormData(newObj);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className=" flex items-center flex-col gap-x-2 md:flex-row ">
                  <label className="text-xs w-full" htmlFor="monthlyDiscount">
                    Min Nights
                    <Input
                      type="number"
                      min={0}
                      name="night"
                      value={formData?.night?.[0] || ""}
                      onChange={(e) => {
                        const updatedNights = [...(formData.night || [])];
                        updatedNights[0] = parseInt(e.target.value);
                        setFormData({
                          ...formData,
                          night: updatedNights,
                        });
                      }}
                    />
                  </label>

                  <label className="text-xs w-full" htmlFor="monthlyDiscount">
                    Max Nights
                    <Input
                      type="number"
                      min={0}
                      name="monthlyDiscount"
                      value={formData?.night?.[1] || ""}
                      onChange={(e) => {
                        const updatedNights = [...(formData.night || [])];
                        updatedNights[1] = parseInt(e.target.value);
                        setFormData({
                          ...formData,
                          night: updatedNights,
                        });
                      }}
                    />
                  </label>
                  <div className="w-full">
                    <label>
                      <h1 className="text-xs">City</h1>
                      <Input
                        type="text"
                        name="city"
                        value={formData?.city || ""}
                        onChange={handleChange}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                  <div className="w-full">
                    {formData?.center && (
                      <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full">
                        <label className="w-full">
                          <h1 className="">Postal Code</h1>
                          <Input
                            type="text"
                            name="postalCode"
                            value={formData?.postalCode || ""}
                            onChange={handlePostalCode}
                          />
                        </label>

                        <div className="w-full">
                          <label>Latitude</label>
                          <Input
                            type="text"
                            name="lat"
                            value={formData?.center?.lat || ""}
                            disabled
                            className="cursor-not-allowed"
                          />
                        </div>

                        <div className="w-full ">
                          <label>Longitude</label>
                          <Input
                            type="text"
                            name="lng"
                            value={formData?.center?.lng || ""}
                            disabled
                            className="cursor-not-allowed"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full my-4 pb-4 border-b bg-transparent">
                  <h1 className="text-xl mb-2 font-medium bg-background">
                    Ical links
                  </h1>

                  <div className=" w-full flex gap-x-2">
                    <div className=" w-3/12">
                      <Select
                        name="icalLinks"
                        value={icalPlatform}
                        onValueChange={(value) => setIcalPlatform(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Airbnb", "Booking"].map((key) => (
                            <SelectItem key={key} value={key}>
                              {key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Input
                      type="text"
                      name="icalLink"
                      ref={icalLinkRef}
                      className=" w-8/12"
                    />

                    <Button className=" w-1/12" onClick={handleAddIcalLink}>
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>

                  {formData?.icalLinks &&
                    Object.entries(formData?.icalLinks)?.map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 my-2">
                        <Label className=" w-3/12 text-base ml-1">{key}</Label>
                        <input
                          type="text"
                          value={value || ""}
                          className=" w-8/12 p-2 text-base bg-background border rounded-lg disabled:cursor-not-allowed"
                          disabled
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => handleRemoveIcalLink(key)}
                          className=" w-1/12"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                </div>

                <div className="w-full my-4 pb-4 border-b bg-transparent">
                  <h1 className="text-xl mb-2 font-medium bg-background">
                    Additional Rules
                  </h1>

                  {/* Render each additional rule with a remove button */}
                  {formData.additionalRules?.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) =>
                          handleRuleChange(index, e.target.value)
                        }
                        className="w-full p-2 text-base bg-background border rounded-lg "
                        placeholder={`Rule ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => handleRemoveRule(index)}
                        className=""
                      >
                        <IoRemoveSharp />
                      </Button>
                    </div>
                  ))}

                  <Button type="button" onClick={handleAddRule} className="">
                    Add section <Plus className="h-5 w-5" />
                  </Button>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger className="flex px-3 py-2 bg-background  rounded-lg border items-start">
                    <div className="flex items-center justify-between gap-2">
                      Edit the amenties <MdAdsClick />
                    </div>
                  </AlertDialogTrigger>

                  <AlertDialogContent className="w-full ">
                    <AlertDialogHeader className="sm:block hidden  ">
                      <h1 className="text-2xl font-semibold mb-4">
                        Edit Amenities
                      </h1>
                    </AlertDialogHeader>
                    <AlertDialogTitle>
                      <p className="text-xs font-thin">
                        You can edit the amenties via a just tap or untap , no
                        need to save
                      </p>
                    </AlertDialogTitle>
                    <ScrollArea className="h-[580px]">
                      <div>
                        {/* General Amenities */}
                        <h1 className="text-2xl font-semibold mb-4 border-b">
                          General Amenities
                        </h1>
                        <div className="grid sm:grid-cols-3 grid-cols-2 text-xs gap-x-2 sm:gap-y-4 gap-y-2">
                          {formData?.generalAmenities &&
                            Object.entries(formData?.generalAmenities)?.map(
                              ([key, value]) => (
                                <div
                                  key={key}
                                  className="flex items-center gap-x-1"
                                >
                                  <h1>{key}</h1>
                                  <Checkbox checked={value} />
                                </div>
                              )
                            )}
                        </div>

                        {/* Other Amenities */}
                        <h1 className="text-2xl font-semibold mb-4 border-b mt-6">
                          Other Amenities
                        </h1>
                        <div className="grid sm:grid-cols-3 grid-cols-2 text-xs gap-x-2 sm:gap-y-4 gap-y-2">
                          {formData?.otherAmenities &&
                            Object.entries(formData?.otherAmenities)?.map(
                              ([key, value]) => (
                                <div
                                  key={key}
                                  className="flex items-center gap-x-1"
                                >
                                  <h1>{key}</h1>
                                  <Checkbox checked={value} />
                                </div>
                              )
                            )}
                        </div>

                        {/* Safe Amenities */}
                        <h1 className="text-2xl font-semibold mb-4 border-b mt-6">
                          Safe Amenities
                        </h1>
                        <div className="grid sm:grid-cols-3 text-xs grid-cols-2 gap-x-4 sm:gap-y-2 ">
                          {formData?.safeAmenities &&
                            Object.entries(formData?.safeAmenities)?.map(
                              ([key, value]) => (
                                <div
                                  key={key}
                                  className="flex items-center gap-x-1"
                                >
                                  <h1>{key}</h1>
                                  <Checkbox checked={value} />
                                </div>
                              )
                            )}
                        </div>
                      </div>
                    </ScrollArea>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="border-t pt-4">
                  <label>
                    <h1 className="">Smoking</h1>
                    <Input
                      type="text"
                      name="smoking"
                      value={formData?.smoking || ""}
                      onChange={handleChange}
                    />
                  </label>
                </div>

                <div>
                  <label className="flex border px-4 py-2 rounded-lg items-center space-x-4">
                    <div className="flex items-center justify-between  w-full">
                      <h1 className="">Tap to live/Hide</h1>
                      <div className="relative hover:cursor-pointer block">
                        <input
                          type="checkbox"
                          name="isLive"
                          checked={formData.isLive || false}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500    transition duration-300 ease-in-out"></div>
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 peer-checked:translate-x-full transition-transform duration-300 ease-in-out"></div>
                      </div>
                    </div>
                  </label>
                </div>

                {numberOfPortions == 1 && portionContent(0)}

                {numberOfPortions > 1 &&
                  Array.from({
                    length: numberOfPortions,
                  }).map((item, index) => {
                    return (
                      <div
                        className=" flex  flex-col space-y-4 my-4"
                        key={index}
                      >
                        <div
                          className="  flex items-center transition-transform duration-300 ease-in-out cursor-pointer  border px-4 py-2 rounded-lg "
                          onClick={() =>
                            setIsPortionOpen((prev) => {
                              const newIsPortionOpen = [...prev];
                              newIsPortionOpen[index] =
                                !newIsPortionOpen[index];
                              return newIsPortionOpen;
                            })
                          }
                        >
                          Portion no {index + 1}{" "}
                          {isPortionOpen[index] ? (
                            <MdArrowDropDown className="text-2xl" />
                          ) : (
                            <MdArrowRight className="text-2xl" />
                          )}
                          {isPortionOpen[index] && (
                            <div className=" flex flex-wrap md:flex-nowrap gap-x-4 xs:ml-8 justify-center gap-y-2">
                              <CustomTooltip
                                icon={<FaUser />}
                                content={formData?.guests?.[index]}
                                desc="No. Of Guests"
                              />
                              <CustomTooltip
                                icon={<IoIosBed />}
                                content={formData?.beds?.[index]}
                                desc="No. Of beds"
                              />
                              <CustomTooltip
                                icon={<FaBath />}
                                content={formData?.bathroom?.[index]}
                                desc="No. Of bathroom"
                              />
                              <CustomTooltip
                                icon={<SlSizeFullscreen />}
                                content={formData?.portionSize?.[index]}
                                desc="Portion's size"
                              />
                              <CustomTooltip
                                icon={<FaEuroSign />}
                                content={formData?.basePrice?.[index]}
                                desc="Price of Portion"
                              />
                              <Link
                                href={`/dashboard/property/edit/availability/${params.id}/${index}`}
                                className=" flex items-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {" "}
                                <CustomTooltip
                                  icon={<FaCalendarAlt />}
                                  desc="Calendar"
                                />
                              </Link>
                              <CustomTooltip
                                text={formData?.portionName?.[index]}
                                desc="Name of Portion"
                                className=" xs:text-nowrap"
                              />
                            </div>
                          )}
                        </div>
                        {isPortionOpen[index] && (
                          <>
                            <div className=" flex flex-col space-y-2">
                              <h1>Portion Cover Image</h1>
                              <div className="border min-h-60 rounded-lg flex items-center justify-center relative">
                                <div className=" absolute bottom-0 right-0 ">
                                  <label
                                    htmlFor={`file-upload-portionCoverFiles-${index}`}
                                  >
                                    <div
                                      className="text-xs  flex flex-col-reverse items-center hover:bg-white/50 dark:hover:bg-white/10 border rounded-lg py-4 px-2 cursor-pointer
                                "
                                    >
                                      <span>Upload Cover </span>{" "}
                                      <UploadIcon className="animate-bounce" />
                                    </div>
                                    <input
                                      id={`file-upload-portionCoverFiles-${index}`}
                                      name={`file-upload-portionCoverFiles-${index}`}
                                      type="file"
                                      className="sr-only"
                                      accept="image/*"
                                      // onChange={(e) => uploadFile(e, index)}
                                      onChange={(e) =>
                                        handleImageUpload(
                                          e,
                                          "portionCoverFileUrls",
                                          index,
                                          -1
                                        )
                                      }
                                    />
                                  </label>
                                </div>
                                {portionCoverFileUrls[index] ||
                                formData?.portionCoverFileUrls?.[index] ? (
                                  <Img
                                    src={
                                      portionCoverFileUrls[index] ||
                                      formData?.portionCoverFileUrls?.[index] ||
                                      "/replacer.png"
                                    }
                                    alt="portionCover"
                                    className="max-w-4xl max-h-[600px] w-full rounded-lg px-2 py-2 h-full object-contain"
                                  />
                                ) : (
                                  <p className="text-center ">No image found</p>
                                )}

                                {formData?.portionCoverFileUrls?.[index] && (
                                  <Checkbox
                                    className="cursor-pointer absolute left-4 top-4 bg-neutral-900 border-primary"
                                    key={`portionCoverFileUrls-${index}`}
                                    name={`portionCoverFileUrls-${index}`}
                                    onCheckedChange={(checked) =>
                                      handleImageSelect(
                                        checked,
                                        "portionCoverFileUrls",
                                        formData.portionCoverFileUrls?.[index]!,
                                        index,
                                        -1
                                      )
                                    }
                                  />
                                )}
                              </div>
                              {/* Portion Pictures Section */}
                              <h1 className="">Portion Picture</h1>

                              {/* // ! upload portion pictures */}
                              <div className="space-x-2 overflow-x-auto overflow-y-hidden">
                                <div className="flex space-x-4">
                                  <label
                                    htmlFor={`file-upload-portionPictureUrls-${index}`}
                                  >
                                    <div className="flex items-center h-40 border hover:cursor-pointer  hover:bg-white/50 dark:hover:bg-white/10 w-40 rounded-lg justify-center flex-col">
                                      <UploadIcon className=" animate-bounce z-10 text-xs  cursor-pointer" />
                                      <p> Upload Pictures</p>
                                    </div>

                                    <input
                                      id={`file-upload-portionPictureUrls-${index}`}
                                      name={`file-upload-portionPictureUrls-${index}`}
                                      type="file"
                                      className="sr-only"
                                      multiple
                                      accept="image/*"
                                      onChange={(e) =>
                                        handleImageUpload(
                                          e,
                                          "portionPictureUrls",
                                          index,
                                          index
                                        )
                                      }
                                    />
                                  </label>
                                  {portionPictureUrls[index]
                                    ?.filter((url) => url)
                                    ?.map((url, ind) => (
                                      <div
                                        key={ind}
                                        className="relative flex-shrink-0"
                                      >
                                        {portionPictureUrls[index]?.[ind] ||
                                        formData?.portionPictureUrls?.[index]?.[
                                          ind
                                        ] ? (
                                          <Img
                                            src={
                                              portionPictureUrls[index][ind] ||
                                              formData?.portionPictureUrls?.[
                                                index
                                              ][ind] ||
                                              "/replacer.jpg"
                                            }
                                            alt="not found"
                                            className="w-40 h-40 object-cover rounded-md"
                                          />
                                        ) : (
                                          <p className="text-center text-gray-500">
                                            No image found
                                          </p>
                                        )}

                                        <Checkbox
                                          className="cursor-pointer absolute left-2 top-2 bg-neutral-900 border-primary"
                                          key={`portionPictureUrls-${ind}${index}`}
                                          name={`portionPictureUrls-${ind}${index}`}
                                          onCheckedChange={(checked) =>
                                            handleImageSelect(
                                              checked,
                                              "portionPictureUrls",
                                              formData?.portionPictureUrls![
                                                index
                                              ][ind],
                                              ind,
                                              index
                                            )
                                          }
                                        />
                                      </div>
                                    ))}
                                </div>
                              </div>

                              {portionContent(index)}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>

              {loadingProperty ? (
                <ScreenLoader />
              ) : (
                <div className=" flex sm:flex-row flex-col gap-y-2 mt-4 gap-x-8">
                  <Button
                    className="w-full"
                    onClick={handleSubmit}
                    type="submit"
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleImageDelete}
                    className="w-full "
                  >
                    Delete Images
                  </Button>
                </div>
              )}
            </form>
          )}
        </div>
      
    </>
  );
};

export default EditPropertyPage;
