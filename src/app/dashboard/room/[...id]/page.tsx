"use client";

import axios from "axios";
import Link from "next/link";
import Pusher from "pusher-js";
import debounce from "lodash.debounce";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { FaRegStar, FaStar } from "react-icons/fa6";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Plus,
  House,
  Undo2,
  Trash2,
  Clock4,
  CheckCheck,
  CalendarDays,
  LucideLoader2,
} from "lucide-react";
import {
  Sheet,
  SheetTitle,
  SheetClose,
  SheetFooter,
  SheetHeader,
  SheetContent,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import CustomTooltip from "@/components/CustomToolTip";
import { CustomDialog } from "@/components/CustomDialog";
import { PropertiesDataType, QuickListingInterface } from "@/util/type";

import CatalogueDropdown from "./catalogue-dropdown";

interface pageProps {
  params: {
    id: string;
  };
}

interface PropertyObject extends PropertiesDataType {
  isFavourite: boolean;
}

interface quickListingShowcase extends PropertyObject {
  QID: string;
  ownerName: string;
  ownerMobile: string;
  description: string;
  address: string;
  isVisit: boolean;
  visitSchedule: {
    visitDate: string;
    visitTime: string;
    visitType: string;
    visitAgentName: string;
  };
  isViewed: boolean;
}

const Page = ({ params }: pageProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPropertyLoading, setIspropertyLoading] = useState(false);
  const [isUpdateVisitLoading, setIsUpdateVisitLoading] = useState(false);
  const roomId = params.id[0].split("-")[0];
  const propertyIdRef = useRef<HTMLInputElement>(null);
  const [showcaseProperties, setShowcaseProperties] = useState<
    Partial<quickListingShowcase>[]
  >([]);
  const [rejectedProperties, setRejectedProperties] = useState<
    Partial<quickListingShowcase>[]
  >([]);
  const [favouriteProperties, setFavouriteProperties] = useState<string[]>([]);
  const [removedPropertyIndex, setRemovedPropertyIndex] = useState(-1);
  const [retractedPropertyIndex, setRetractedPropertyIndex] = useState(-1);
  const [alreadyAddedProperty, setAlreadyAddedProperty] = useState<string>("");
  const [favouriteUpdatedProperties, setFavouriteUpdatedProperties] = useState<string[]>(
    []
  );
  const [role, setRole] = useState("");
  const [quickListingProp, setQuickListingProp] = useState<QuickListingInterface>();

  const [dt, setDt] = useState<Date | undefined>(undefined);
  const visitTimeRef = useRef<HTMLInputElement>(null);
  const agentNameRef = useRef<HTMLInputElement>(null);
  const [visitType, setVisitType] = useState("Physical");
  const [customerName, setCustomerName] = useState("");
  const [catalogueList, setCatalogueList] = useState([]);

  const router = useRouter();

  const addProperty = async (propertyId: string) => {
    if (!propertyId) return;

    if (
      showcaseProperties.filter((item) => item._id === propertyIdRef?.current?.value)
        .length
    ) {
      setAlreadyAddedProperty(propertyId);
      toast("Property Already Added", {
        icon: "❗",
      });
      setTimeout(() => {
        setAlreadyAddedProperty("");
      }, 3000);
      return;
    }

    try {
      setIspropertyLoading(true);
      const response = await axios.post("/api/room/addPropertyInRoom", {
        // propertyId: propertyIdRef?.current?.value,
        propertyId,
        roomId: roomId,
      });
    } catch (err: any) {
      toast.error("Unable to add property");
    } finally {
      setIspropertyLoading(false);
      if (propertyIdRef.current) propertyIdRef.current.value = "";
    }
  };

  const removeProperty = async (index: number, propertyId: string) => {
    setRemovedPropertyIndex(index);
    try {
      const response = await axios.patch("/api/room/removePropertyFromRoom", {
        roomId: roomId,
        propertyId: propertyId,
      });
    } catch (err: any) {
      console.error("Error in removing property: ", err);
    }
    setRemovedPropertyIndex(-1);
  };

  const retractProperty = async (index: number, propertyId: string) => {
    setRetractedPropertyIndex(index);
    try {
      const response = await axios.post("/api/room/retractPropertyFromRejected", {
        roomId,
        propertyId,
      });
    } catch (err: unknown) {
      console.log("err: ", err);
    } finally {
      setRetractedPropertyIndex(-1);
    }
  };
  const debouncedAddToFavourite = useCallback(
    debounce(async (favouriteProperties: string[]) => {
      try {
        const response = await axios.patch("/api/room/addPropertyToFavourite", {
          roomId,
          propertyIds: favouriteProperties,
          client: role,
        });
        setFavouriteProperties([]);
      } catch (err: unknown) {
        toast.error("Error in adding to favourite");
      }
    }, 5000),
    []
  );

  const scheduleVisit = async (index: number, propertyId: string) => {
    setIsUpdateVisitLoading(true);
    try {
      const response = await axios.post("/api/room/scheduleVisit", {
        roomId,
        propertyId,
        client: role,
      });
    } catch (err: any) {
      console.log("error in scheduling visit: ", err);
    } finally {
      setIsUpdateVisitLoading(false);
    }
  };

  const updateVisit = async (index: number, propertyId: string) => {
    if (!visitTimeRef?.current?.value || !dt || !visitType) return;
    setIsUpdateVisitLoading(true);
    try {
      const response = await axios.post("/api/room/updateVisit", {
        roomId,
        propertyId,
        visitTime: visitTimeRef?.current?.value,
        visitDate: dt,
        visitType,
        agentName: agentNameRef?.current?.value,
        client: role,
      });
    } catch (err: any) {
      console.log("error in updating visit: ", err);
    } finally {
      setIsUpdateVisitLoading(false);
    }
  };

  const addSeenToProperty = async (index: number, propertyId: string) => {
    try {
      const response = await axios.post("/api/room/addSeenToProperty", {
        roomId,
        propertyId,
        client: role,
      });
    } catch (err: any) {
      console.log("error in updating seen: ", err);
    }
  };

  useEffect(() => {
    if (favouriteProperties.length > 0) {
      debouncedAddToFavourite(favouriteProperties);
    }

    return () => debouncedAddToFavourite.cancel();
  }, [favouriteProperties]);

  useEffect(() => {
    const pusher = new Pusher("1725fd164206c8aa520b", {
      cluster: "ap2",
    });

    const channel = pusher.subscribe(`room-${roomId}`);

    channel.bind("showcasePropertyAdded", (data: any) => {
      console.log("data in showcase: ", data);
      setShowcaseProperties((prev) => {
        const newProperties = [...prev];
        newProperties.push(data.data);
        return newProperties;
      });
      toast("New Property Added!", {
        icon: "🏠",
      });
    });

    channel.bind("propertyRemoved", (data: any) => {
      const propertyId = data._id;
      setShowcaseProperties((prev) => {
        const newProperties = prev.filter((property) => property._id !== propertyId);
        return newProperties;
      });
      setRejectedProperties((prev) => {
        const newRemovedProperties = [...prev];
        const isAlreadyPresent = newRemovedProperties?.find(
          (item) => item?._id === propertyId
        );
        if (!isAlreadyPresent) newRemovedProperties.push(data);
        return newRemovedProperties;
      });
      toast.success("Property Removed!");
    });

    channel.bind("retractedProperty", (data: any) => {
      setShowcaseProperties((prev) => [...prev, data]);
      setRejectedProperties((prev) => {
        const newRemovedProperties = prev.filter((item) => item._id! !== data._id);
        return newRemovedProperties;
      });
      toast.success("Property Retracted!");
    });

    channel.bind("updateFavourites", (data: any) => {
      const favPropertyIds = data.propertyIds;
      const client = data.client;
      if (client !== role) {
        setShowcaseProperties((prev) => {
          const newProperties = [...prev];
          prev.forEach((item, index: number) => {
            if (favPropertyIds.includes(item._id!)) {
              const propertyObject = { ...newProperties[index] };
              propertyObject.isFavourite = !propertyObject.isFavourite;
              newProperties.splice(index, 1, propertyObject);
            }
          });
          return newProperties;
        });
      }
      setFavouriteUpdatedProperties(favPropertyIds);
      toast("Favourites Updated", {
        icon: "🌟",
      });
    });

    channel.bind("visitApplied", (data: any) => {
      const propertyToVisit = data.propertyId;
      const client = data.client;
      setShowcaseProperties((prev) => {
        const newProperties = [...prev];
        prev.forEach((item, index: number) => {
          if (item._id === propertyToVisit) {
            const propertyObject = { ...newProperties[index] };
            propertyObject.isVisit = true;
            newProperties.splice(index, 1, propertyObject);
          }
        });
        return newProperties;
      });
      toast.success("Applied for visit");
    });

    channel.bind("visitUpdated", (data: any) => {
      const visitUpdatedProperty = data.propertyId;
      const client = data.client;
      setShowcaseProperties((prev) => {
        const newProperties = [...prev];
        prev.forEach((item, index: number) => {
          if (item._id === visitUpdatedProperty) {
            const propertyObject = { ...newProperties[index] };
            propertyObject.visitSchedule = data.visitSchedule;
            newProperties.splice(index, 1, propertyObject);
          }
        });
        return newProperties;
      });
      toast.success("Visit Updated");
    });

    channel.bind("addedSeenToProperty", (data: any) => {
      const client = data.client;
      const seenPropertyId = data.data._id;
      setShowcaseProperties((prev) => {
        const newProperties = [...prev];
        prev.forEach((item, index: number) => {
          if (item._id === seenPropertyId) {
            const propertyObject = { ...newProperties[index] };
            propertyObject.isViewed = true;
            newProperties.splice(index, 1, propertyObject);
          }
        });
        return newProperties;
      });
    });

    return () => {
      pusher.unsubscribe(`room-${roomId}`);
    };
  }, [roomId]);

  const getAllCatalogues = async () => {
    try {
      const response = await axios.get("/api/catalogue/getAllCatalogues");
      setCatalogueList(response.data.allCatalogues);
    } catch (err: any) {}
  };

  const addPropertiesFromCatalogue = async (propertyIds: string[]) => {
    if (!propertyIds.length) return;
    propertyIds.forEach((propertyId: string) => {
      try {
        addProperty(propertyId);
      } catch (err: any) {
        console.error("Error in adding property: ", err);
      }
    });
  };

  // Verify Room Credentials & Fetch Room Properties & Load All Catalogues
  useEffect(() => {
    const roomDetails = params.id[0].split("-");
    const roomId = roomDetails[0];
    const roomPassword = roomDetails[1];

    {
      /*Room Properties*/
    }
    const fetchRoomProperties = async (roomId: string) => {
      try {
        const response = await axios.post("/api/room/getPropertiesFromRoom", {
          roomId,
        });
        setShowcaseProperties(response.data.showcaseProperties);
        setRejectedProperties(response.data.rejectedProperties);
      } catch (err: any) {
        console.error("Error in fetching room properties: ", err);
      }
    };

    {
      /*Verify Room Credentials*/
    }
    const checkRoomCredentials = async (roomId: string, roomPassword: string) => {
      try {
        setIsLoading(true);
        // console.log("roomId: ", roomId, "roomPassword: ", roomPassword);
        const response = await axios.post("/api/room/joinRoom", {
          roomId,
          roomPassword,
        });
        // console.log("room join response: ", response);
        setRole(response.data.role);
        setCustomerName(response.data.customerName);
        setIsLoading(false);
        fetchRoomProperties(roomId);
      } catch (err: any) {
        const previousPath = sessionStorage.getItem("previousPath");
        if (previousPath) {
          router.push(previousPath);
        } else {
          router.push("/dashboard/room/joinroom");
        }
      }
      setIsLoading(false);
    };

    checkRoomCredentials(roomId, roomPassword);
    getAllCatalogues();
  }, []);

  return (
    <div className=" w-full h-full p-2">
      <Toaster position="top-right" reverseOrder={true} />{" "}
      {isLoading ? (
        <div className=" w-full h-full flex justify-center items-center">
          <LucideLoader2 className=" animate-spin" size={48} />
        </div>
      ) : (
        <div className=" relative">
          {role !== "Visitor" && (
            <div className=" flex gap-x-8 items-end">
              <div>
                <Label>
                  Enter Property Id
                  <Input
                    type="text"
                    ref={propertyIdRef}
                    placeholder="Enter Property Id"
                    className=" w-60"
                  />
                </Label>
              </div>
              <Button
                className=" font-semibold text-base flex items-center gap-x-2 "
                onClick={() => addProperty(propertyIdRef?.current?.value!)}
              >
                <House /> {isPropertyLoading ? "Adding..." : "Add Property"}
              </Button>

              {/* CatalogueDropdown */}
              {catalogueList && (
                <CatalogueDropdown
                  catalogueList={catalogueList}
                  onAddCatalogue={addPropertiesFromCatalogue}
                />
              )}
            </div>
          )}
          {/* VISITS */}
          <div className=" absolute right-4 top-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Visits</Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Scheduled Visits</SheetTitle>
                  <SheetDescription>The list of scheduled visits</SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4 overflow-auto">
                  {showcaseProperties
                    .filter((el) => el?.isVisit === true)
                    .map((item, index) => (
                      <div
                        className=" border rounded-lg p-2 flex items-center gap-x-4 grow"
                        key={index}
                      >
                        <img
                          src={item?.propertyImages?.[0]}
                          alt="Visit"
                          className=" rounded-lg w-24 h-24"
                        />
                        <div className=" text-base">
                          <div className=" flex items-center flex-wrap gap-x-2">
                            <div className=" flex flex-col justify-center text-sm sm:text-md ">
                              <p className=" text-xs whitespace-nowrap">
                                <span className=" text-sm">Visit Date: </span>{" "}
                                {item?.visitSchedule?.visitDate}
                              </p>
                              <p className=" text-xs whitespace-nowrap">
                                <span className=" text-sm">Visit Time: </span>{" "}
                                {item?.visitSchedule?.visitTime}
                              </p>
                              <p className=" text-xs whitespace-nowrap">
                                <span className=" text-sm">Visit Type: </span>{" "}
                                {item?.visitSchedule?.visitType}
                              </p>
                              <p className=" text-xs whitespace-nowrap">
                                <span className=" text-sm">Agent Name: </span>{" "}
                                {item?.visitSchedule?.visitAgentName}
                              </p>
                            </div>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost">
                                  {role !== "Visitor" && <CalendarDays />}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[350px]">
                                <DialogHeader>
                                  <DialogTitle>Select Date</DialogTitle>
                                  <DialogDescription>
                                    Select Date For Visit
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-center">
                                  <Calendar
                                    mode="single"
                                    selected={dt}
                                    onSelect={setDt}
                                    className="rounded-md"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="visitTime">Enter Time</Label>
                                  <Input
                                    placeholder={item?.visitSchedule?.visitTime}
                                    ref={visitTimeRef}
                                    id="visitTime"
                                  />
                                </div>
                                <div className=" flex gap-x-2 items-center">
                                  <p className=" text-sm">Type of Visit :</p>{" "}
                                  <Select onValueChange={setVisitType}>
                                    <SelectTrigger className="w-[180px]">
                                      <SelectValue placeholder="Select Interaction" />
                                    </SelectTrigger>
                                    <SelectContent id="interaction">
                                      <SelectGroup>
                                        <SelectLabel>Visit Medium</SelectLabel>
                                        <SelectItem value="Physical">Physical</SelectItem>
                                        <SelectItem value="Virtual">Virtual</SelectItem>
                                      </SelectGroup>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="agentName">Agent Name</Label>
                                  <Input
                                    placeholder={item?.visitSchedule?.visitAgentName}
                                    ref={agentNameRef}
                                    id="agentName"
                                  />
                                </div>
                                <DialogFooter>
                                  <Button
                                    type="submit"
                                    onClick={() => updateVisit(index, item._id!)}
                                  >
                                    {isUpdateVisitLoading
                                      ? "Updating..."
                                      : "Save Schedule"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button type="submit">Save changes</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
          {removedPropertyIndex !== -1 && (
            <div className=" mt-4 flex justify-center">
              Removing Property <LucideLoader2 className=" animate-spin" />
            </div>
          )}{" "}
          {showcaseProperties?.length > 0 && (
            <p className=" dark:text-white text-2xl font-medium mt-2 text-[#FC941E]">
              {role === "Visitor"
                ? `Hi ${customerName}, Here are some Recommendations for you!`
                : "Showcase Properties"}
            </p>
          )}
          <div className=" flex flex-wrap justify-center md:justify-normal gap-x-8 md:gap-x-4 mt-4">
            {role !== "Visitor" && (
              <div className=" h-44 w-44 md:h-36 md:w-36 border-2 border-dotted border-neutral-700 hover:bg-neutral-800 cursor-pointer rounded-lg flex flex-col justify-center items-center">
                <Plus size={32} />
                {roomId && (
                  <CustomDialog
                    roomId={roomId}
                    setQuickListingProp={setQuickListingProp}
                  />
                )}
              </div>
            )}
            {showcaseProperties?.map(
              (item, index: number) =>
                item?._id && (
                  <div
                    className={` my-1 flex flex-col items-center relative ${
                      index === removedPropertyIndex && "opacity-20"
                    } `}
                    key={index}
                  >
                    <Link
                      href={{
                        pathname:
                          item?.VSID === "xxxx"
                            ? `https://www.vacationsaga.com/roomListing/${item._id}`
                            : `https://www.vacationsaga.com/listing-stay-detail/${item._id}`,
                      }}
                      target="_blank"
                      className=" relative"
                      onClick={() => addSeenToProperty(index, item._id!)}
                    >
                      <img
                        src={item?.propertyImages?.[0]}
                        alt="PropertyImage"
                        className={` h-44 w-44  md:w-36 md:h-36 rounded-md border border-neutral-700 ${
                          item._id === alreadyAddedProperty &&
                          "border-2 border-pink-600 shadow-2xl"
                        } ${
                          (favouriteUpdatedProperties.includes(item._id!) ||
                            item.isFavourite) &&
                          "border-2 border-yellow-400 shadow-2xl"
                        }`}
                      />
                      <div
                        className=" badge w-full flex justify-end mt-2 absolute right-1 bottom-1"
                        onClick={(e) => e.preventDefault()}
                      >
                        <p className=" bg-orange-500 text-white px-2 rounded-3xl text-sm">
                          {item?.VSID !== "xxxx" ? item?.VSID : item?.QID}
                        </p>
                      </div>
                      <div className=" absolute left-1 bottom-1 p-1 rounded-full bg-white/60 flex justify-center items-center">
                        <CheckCheck
                          size={22}
                          className={`font-semibold ${
                            item?.isViewed && "text-orange-600"
                          }`}
                        />
                      </div>
                    </Link>
                    <Button
                      variant={"secondary"}
                      onClick={() => {
                        setShowcaseProperties((prev) => {
                          const newObject = {
                            ...prev[index],
                          };
                          newObject.isFavourite = !newObject.isFavourite;
                          prev[index] = newObject;
                          return [...prev];
                        });
                        if (favouriteProperties.indexOf(item._id!) === -1) {
                          setFavouriteProperties((prev) => [...prev, item._id!]);
                        } else {
                          setFavouriteProperties((prev) =>
                            prev.filter((id) => id !== item._id!)
                          );
                        }
                      }}
                      className=" box-border absolute rounded-full top-1 left-1 border-none px-3 py-1 bg-black/50 text-white"
                    >
                      {showcaseProperties[index].isFavourite ? (
                        <FaStar className=" text-lg text-[#FC941E]" />
                      ) : (
                        <FaRegStar className=" text-lg" />
                      )}
                    </Button>

                    <div className=" flex gap-x-2 my-2">
                      <Button
                        variant="secondary"
                        onClick={() => scheduleVisit(index, item._id!)}
                        disabled={item?.isVisit}
                      >
                        <CustomTooltip
                          icon={
                            item?.isVisit ? (
                              <CheckCheck size={18} />
                            ) : (
                              <Clock4 size={18} />
                            )
                          }
                          desc={
                            showcaseProperties?.[index]?.isViewed
                              ? "Already Applied"
                              : "Apply for Visit"
                          }
                        />
                      </Button>
                      <Button
                        variant={"secondary"}
                        onClick={() => removeProperty(index, item._id!)}
                      >
                        <CustomTooltip
                          icon={<Trash2 size={18} />}
                          desc="Remove Property"
                        />
                      </Button>
                    </div>
                  </div>
                )
            )}

            {isPropertyLoading && (
              <div className=" flex flex-col items-center">
                <div className="w-32 h-32 rounded-lg bg-neutral-600 animate-pulse "></div>
                <div className=" flex gap-x-2 my-2">
                  <div className=" h-8 w-8 rounded-lg bg-neutral-600 animate-pulse"></div>
                  <div className=" h-8 w-8 rounded-lg bg-neutral-600 animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
          <div className=" my-2 h-1 bg-neutral-400 dark:bg-neutral-800 rounded-lg "></div>
          <div className=" mt-2">
            {rejectedProperties?.length > 0 && (
              <p className=" dark:text-white text-2xl font-medium text-[#FC941E]">
                Rejected Properties
              </p>
            )}
            <div className=" flex flex-wrap justify-center md:justify-normal gap-4 mt-4">
              {rejectedProperties?.map(
                (item, index: number) =>
                  item?._id && (
                    <div
                      className={` my-1 flex flex-col items-center ${
                        item._id === alreadyAddedProperty && " opacity-20"
                      } ${index === retractedPropertyIndex && "opacity-20"} `}
                      key={index}
                    >
                      <Link
                        href={{
                          pathname: `https://www.vacationsaga.com/listing-stay-detail/${item._id}`,
                        }}
                        target="_blank"
                        className="relative"
                      >
                        <img
                          src={item?.propertyImages?.[0]}
                          alt="PropertyImage"
                          className=" h-44 w-44 md:w-36 md:h-36 rounded-lg border border-neutral-700"
                        />
                        <div
                          className=" w-full flex justify-end mt-2 absolute right-1 bottom-1"
                          onClick={(e) => e.preventDefault()}
                        >
                          <p className=" badge bg-orange-600 text-white px-2 rounded-3xl text-sm">
                            {item?.VSID !== "xxxx" ? item?.VSID : item?.QID}
                          </p>
                        </div>
                        <div className=" absolute left-1 bottom-1 p-1 rounded-full bg-white/60 flex justify-center items-center">
                          <CheckCheck
                            size={22}
                            className={`  font-semibold ${
                              rejectedProperties?.[index]?.isViewed && "text-orange-600"
                            } `}
                          />
                        </div>
                      </Link>
                      <div className=" flex justify-center mt-2">
                        <Button
                          variant={"secondary"}
                          onClick={() => retractProperty(index, item._id!)}
                        >
                          <CustomTooltip
                            icon={<Undo2 size={18} />}
                            desc="Add to showcase again"
                          />{" "}
                        </Button>
                      </div>
                    </div>
                  )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
