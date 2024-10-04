"use client";
import React, { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { formatDate } from "@fullcalendar/core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ical from "ical";
import axios from "axios";
import { toast, useToast } from "@/hooks/use-toast";

interface PageProps {
  params: {
    id: string[];
  };
}

interface EventInterface {
  title: string;
  date?: string;
  start?: string;
  end?: string; // if End is not given then the duration will be the same day only as start
}

const EditDates = ({ params }: PageProps) => {
  const pId = params.id[0];
  const portionIndex = params.id[1];
  const inputRef = useRef<HTMLInputElement>(null);
  const [icalLink, setIcalLink] = useState<string>("");
  const { toast } = useToast();

  const [bookedDates, setBookedDates] = useState<EventInterface[]>([
    // { start: "2024-10-07", end: "2024-10-09", title: "Booked" }
  ]); //! {start: "year-moth-day"}

  //! Array of dates that are already booked
  const [alreadyBookedDates, setAlreadyBookedDates] = useState<string[]>([]);

  //! method called when only date is clicked and not the event - adds the date to the alreadyBookedDates array
  const handleDateClick = (arg: any) => {
    const clickedDate = new Date(arg.date).toLocaleDateString();
    console.log("clickedDate: ", clickedDate, alreadyBookedDates);
    if (alreadyBookedDates.includes(clickedDate)) return;
    else {
      const newDates = [...alreadyBookedDates, clickedDate];
      setAlreadyBookedDates(newDates);
    }
    const newEvent = [...bookedDates, { title: "Booked", start: arg.dateStr }];
    // console.log('newEvent: ', newEvent);
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
      console.log("bookings: ", bookings);
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
    console.log("url: ", url);
    setIcalLink(url);
    if (inputRef.current?.value) {
      inputRef.current.value = "";
    }

    const bookedDatesinAirbnb = await fetchAndParseICal(url);

    console.log(
      "bookedDatesinAirbnb: ",
      bookedDatesinAirbnb?.[0]?.startDate?.toLocaleString()
    );
    const eventsFromAirbnb: EventInterface[] = [];
    bookedDatesinAirbnb?.forEach((event) => {
      const st = event.startDate?.toLocaleString().split(",")[0].split("/");
      const stdt = `${st?.[2]}-${st?.[0]}-${st?.[1]}`;

      const nd = event.endDate?.toLocaleString().split(",")[0].split("/");
      const nddt = `${nd?.[2]}-${nd?.[0]}-${nd?.[1]}`;

      const newObj: EventInterface = {
        start: stdt,
        end: nddt,
        title: "Booked",
      };
      eventsFromAirbnb.push(newObj);
    });
    console.log("events from airbnb: ", eventsFromAirbnb);
    setBookedDates(eventsFromAirbnb);

    console.log("fetched");
  };

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
            info.el.style.padding = "5px";
          }
        }}
        dayCellDidMount={(info) => {
          const calendarDate = formatDate(info.date, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });

          // const isBooked = bookedDates.some((event) => {
          //   const eventStartDate = formatDate(new Date(event.start), { year: 'numeric', month: '2-digit', day: '2-digit' });
          //   const eventEndDate = event.end ? formatDate(new Date(event.end), { year: 'numeric', month: '2-digit', day: '2-digit' }) : eventStartDate;

          //   return calendarDate >= eventStartDate && calendarDate <= eventEndDate;
          // });

          const dt = new Date(info.date);
          const isBooked = alreadyBookedDates.includes(dt.toLocaleString());

          if (isBooked) {
            info.el.style.pointerEvents = "none"; // Disable clicking on the cell
            info.el.style.color = "#232023"; // Make the text red or any distinct color
          }
        }}
      />
    </div>
  );
};

export default EditDates;
