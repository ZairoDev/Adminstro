"use client";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { formatDate } from "@fullcalendar/core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ical from "ical";
import axios from "axios";
import { toast, useToast } from "@/hooks/use-toast";
import dateParser from "@/helper/dateParser";
import { Pencil } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/DateRangePicker";

interface PageProps {
  params: {
    id: string[];
  };
}

interface EventInterface {
  title: string;
  date?: string;
  start?: string;
  end?: string; // if End is not given then the duration will be the same day as start
  bookedFrom?: string;
}

const EditDates = ({ params }: PageProps) => {
  const pId = params.id[0];
  const portionIndex = params.id[1];
  const inputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const [icalLink, setIcalLink] = useState<string>("");
  const { toast } = useToast();

  const [bookedDates, setBookedDates] = useState<EventInterface[]>([
    // { start: "2024-10-07", end: "2024-10-09", title: "Booked" }
  ]); //! {start: "YYYY-MM-DD"}

  //! Array of dates that are already booked
  const [alreadyBookedDates, setAlreadyBookedDates] = useState<string[]>([]);
  const [datesBookedFromHere, setDatesBookedFromHere] = useState<string[]>([]);
  const [portionPrice, setPortionPrice] = useState<number[][]>([[]]);
  const [renderSheet, setRenderSheet] = useState<boolean>(false);

  //! method called when only date is clicked and not the event - adds the date to the alreadyBookedDates array
  const handleDateClick = (arg: any) => {
    const clickedDate = dateParser(arg.date);

    if (alreadyBookedDates.includes(clickedDate)) {
      if (!datesBookedFromHere.includes(clickedDate)) return;
      // arg.dayEl.style.backgroundColor = "yellow";
      const dateIndex = alreadyBookedDates.indexOf(clickedDate);
      setAlreadyBookedDates((prev) => {
        const newState = [...prev];
        newState.splice(dateIndex, 1);
        return newState;
      });
      const dateIndex2 = datesBookedFromHere.indexOf(clickedDate);
      setDatesBookedFromHere((prev) => {
        const newState = [...prev];
        newState.splice(dateIndex2, 1);
        return newState;
      });

      let ind = -1;
      for (let i = 0; i < bookedDates.length; i++) {
        if (bookedDates[i].start === clickedDate) {
          ind = i;
          break;
        }
      }
      setBookedDates((prev) => {
        const newState = [...prev];
        newState.splice(ind, 1);
        console.log("newState");
        return newState;
      });
      return;
    } else {
      const newDates = [...alreadyBookedDates, clickedDate];
      setAlreadyBookedDates(newDates);
      setDatesBookedFromHere((prev) => [...prev, clickedDate]); //! dates booked from this platform
    }
    const newEvent = [...bookedDates, { title: "Booked", start: arg.dateStr }];
    setBookedDates(newEvent);
  };

  //! method called when an already set event is clicked
  const handleEventClick = (info: any) => {
    console.log("info: ", info);
    if (info.event.title === "Booked") {
      info.jsEvent.preventDefault();
      alert("This date is blocked.");
    }
  };

  const fetchAndParseICal = async (url: string) => {
    try {
      const response = await axios.post("/api/ical", { url });
      const parsedData = response.data.data;
      const bookings = [];
      for (const eventId in parsedData) {
        const event = parsedData[eventId];
        if (event.type === "VEVENT") {
          const startDate = event.start ? new Date(event.start) : undefined;
          const endDate = event.end ? new Date(event.end) : undefined;

          bookings.push({
            startDate,
            endDate,
          });
        }
      }
      // console.log("bookings: ", bookings);
      return bookings;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Wrror!",
        description: "Error Fetching Bookings from Airbnb",
      });
    }
  };

  const handleUrlSubmit = async () => {
    const url = inputRef.current?.value;
    if (!url) return;
    setIcalLink(url);
    if (inputRef.current?.value) {
      inputRef.current.value = "";
    }

    const bookedDatesinAirbnb = await fetchAndParseICal(url);

    const eventsFromAirbnb: EventInterface[] = [];
    bookedDatesinAirbnb?.forEach((event) => {
      const stdt = dateParser(event.startDate?.toLocaleString() || "");
      const nddt = dateParser(event.endDate?.toLocaleString() || "");

      const newObj: EventInterface = {
        start: stdt,
        end: nddt,
        title: "Booked",
        bookedFrom: url.includes("airbnb") ? "Airbnb" : "Booking.com",
      };
      eventsFromAirbnb.push(newObj);
    });

    setBookedDates(eventsFromAirbnb);

    //! adding events from airbnb to already booked dates
    eventsFromAirbnb.forEach((event) => {
      const newDates: string[] = [];
      let currDt = new Date(event.start!);
      while (currDt < new Date(event.end!)) {
        newDates.push(dateParser(currDt));
        currDt.setDate(currDt.getDate() + 1);
      }

      setAlreadyBookedDates((prev) => [...prev, ...newDates]);
    });
  };

  const fetchPropertyPrice = async () => {
    try {
      const response = await axios.post("/api/singleproperty/getproperty", {
        propertyId: params.id,
      });
      setPortionPrice(response.data.pricePerDay[portionIndex]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Problem in fetching Prices",
      });
    }
  };

  useEffect(() => {
    fetchPropertyPrice();
  }, []);

  const renderPriceEditDrawer = () => {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Edit Prices</Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Edit Prices</DrawerTitle>
              <DrawerDescription>
                Set specific prices for your property.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-0">
              <div className="flex items-center justify-center space-x-2">
                <DateRangePicker />
              </div>
              <div className="mt-3 ">
                <Label htmlFor="price" className="text-right">
                  Enter Price
                </Label>
                <Input type="number" id="price" className="col-span-3" ref={priceInputRef} placeholder="€" />
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={handleChangePrice} className=" hover:bg-white/60">Submit</Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    );
  };

  const handleChangePrice = () => {
    console.log("input price: ", priceInputRef.current?.value);
  }

  return (
    <div>
      <div className=" flex gap-x-2 my-4">
        <Input
          type="text"
          placeholder="Enter the Url from Airbnb & Booking.com"
          ref={inputRef}
        />
        <Button onClick={handleUrlSubmit}>Submit</Button>
      </div>
      {icalLink && (
        <div className=" p-2 text-gray-600">iCal Url: {icalLink}</div>
      )}
      {renderPriceEditDrawer()}
      {portionPrice[0].length > 0 && (
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={bookedDates}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDidMount={(info) => {
            if (info.event.title === "Booked") {
              info.el.style.backgroundColor = "gray"; // Change color of blocked dates
              info.el.style.borderColor = "white"; // Optional: change border color
              info.el.style.display = "flex";
              info.el.style.justifyContent = "center";
            }
          }}
          dayCellDidMount={(info) => {
            const monthNo = info.date.getMonth();
            const dayNo = parseInt(info.dayNumberText);
            info.el.style.position = "relative";
            info.el.style.width = "100%";
            const priceDiv = document.createElement("div");
            priceDiv.innerHTML = `€ ${portionPrice[monthNo][dayNo - 1]}`;
            priceDiv.style.fontSize = "15px";
            priceDiv.style.color = "gray";
            priceDiv.style.position = "absolute";
            priceDiv.style.bottom = "3px";

            info.el.appendChild(priceDiv);
            priceDiv.style.columnGap = "5px";

            priceDiv.style.left = "50%";
            priceDiv.style.transform = "translateX(-50%)";

            const dt = new Date(info.date);
            const isBooked = alreadyBookedDates.includes(dt.toLocaleString());

            if (isBooked) {
              info.el.style.pointerEvents = "none"; // Disable clicking on the cell
              info.el.style.color = "#232023"; // Make the text red or any distinct color
            }
          }}
        />
      )}
    </div>
  );
};

export default EditDates;
