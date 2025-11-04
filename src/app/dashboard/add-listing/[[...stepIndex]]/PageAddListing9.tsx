"use client";
import NcInputNumber from "@/components/NcInputNumber";
import React, { FC, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MONTHS } from "../[[...stepIndex]]/PageAddListing8";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import Heading from "@/components/Heading";

export interface PageAddListing9Props {}

interface Page9State {
  night: number[];
  month: number[];
  time: number[];
  datesPerPortion: number[][];
}

const CustomDayPicker = dynamic(() => import("@/components/CustomDayPicker"), {
  ssr: false,
});

const PageAddListing9: FC<PageAddListing9Props> = () => {
  const params = useSearchParams();
  const userId = params.get("userId");


  const [portions, setPortions] = useState<number>(() => {
    const savedPage = localStorage.getItem("page1") || "";
    if (!savedPage) {
      return 0;
    }
    const savedPortions = JSON.parse(savedPage)["numberOfPortions"];
    return savedPortions || 0;
  });

  const emptyStringArrayGenerator = (size: number) => {
    const emptyStringArray = Array.from({ length: size }, () => "");
    return emptyStringArray;
  };

  const [myArray, setMyArray] = useState<number[]>(Array(portions).fill(1));

  const [datesPerPortion, setDatesPerPortion] = useState<number[][]>(() => {
    const savedPage = localStorage.getItem("page9") || "";
    if (!savedPage) {
      return Array.from({ length: portions }, () => []);
    }
    const value = JSON.parse(savedPage)["datesPerPortion"];
    if (value.length !== portions) {
      return Array.from({ length: portions }, () => []);
    }
    return value || Array.from({ length: portions }, () => []);
  });

  const [night, setNight] = useState<number[]>(() => {
    const savedPage = localStorage.getItem("page9") || "";
    if (!savedPage) {
      return [3, 21];
    }
    const value = JSON.parse(savedPage)["night"];
    return value || [3, 21];
  });

  const [month, setMonth] = useState<number[]>(() => {
    const savedPage = localStorage.getItem("page9") || "";
    if (!savedPage) {
      return [1, 12];
    }
    const value = JSON.parse(savedPage)["month"];
    return value || [1, 12];
  });

  const [time, setTime] = useState<number[]>(() => {
    const savedPage = localStorage.getItem("page9") || "";
    if (!savedPage) {
      return [10, 12];
    }
    const value = JSON.parse(savedPage)["time"];
    return value || [10, 12];
  });

  const [page9, setPage9] = useState<Page9State>({
    night: night,
    month: month,
    time: time,
    datesPerPortion: datesPerPortion,
  });

  useEffect(() => {
    const newPage9: Page9State = {
      night: night,
      month: month,
      time: time,
      datesPerPortion: datesPerPortion,
    };
    setPage9(newPage9);
    localStorage.setItem("page9", JSON.stringify(newPage9));
  }, [night, month, time, datesPerPortion, portions]);

  const handleDateChange = (dates: number[], portionIndex: number) => {
    setDatesPerPortion((prevDates) => {
      const updatedDates = [...prevDates];
      updatedDates[portionIndex] = dates;
      return updatedDates;
    });
  };

  const getAllSelectedDates = () => {
    return datesPerPortion.flat();
  };

  const [rentalType, setRentalType] = useState<string>(() => {
    const savedPage = localStorage.getItem("page1") || "";
    if (!savedPage) {
      return "Short Term";
    }
    const type = JSON.parse(savedPage)["rentalType"];
    return type || "Short Term";
  });

  const [longTermMonths, setLongTermMonths] = useState<string[]>(() => {
    const savedLongTermMonths = localStorage.getItem("page8") || "";
    if (!savedLongTermMonths) {
      return emptyStringArrayGenerator(portions);
    }
    const value = JSON.parse(savedLongTermMonths)["longTermMonths"];
    return value || emptyStringArrayGenerator(portions);
  });

  const dt = new Date();
  const edt = new Date(dt);
  const minNights = 1;
  const [startDate, setStartDate] = useState<Date | null>(dt);
  const [endDate, setEndDate] = useState<Date | null>(edt);

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    if (start && end) {
      const adjustedEndDate = new Date(start);
      adjustedEndDate.setDate(start.getDate() + minNights - 1);

      if (end < adjustedEndDate) {
        // Adjust end date if it is less than the minimum nights requirement
        alert(`Minimum stay is ${minNights} nights. Adjusting your end date.`);
        setEndDate(adjustedEndDate);
      } else {
        setStartDate(start);
        setEndDate(end);
      }
    } else {
      setStartDate(start);
      setEndDate(end);
    }
  };

  return (
    <>
      <Heading
        heading="Select appropriate days"
        subheading="Select the appropriate days when the property is available for booking"
      />
      <div>
        <Heading
          heading="How long guest can stay"
          subheading="Shorter trips can mean more reservations, but you'll turn over your
            space more often"
        />
      </div>

      {rentalType && (rentalType == "Short Term" || rentalType == "Both") && (
        <div className="space-y-7">
          {/* ITEM */}
          <div>
            <h1 className=" sm:text-xl text-lg font-semibold ">
              Short Term Rental
            </h1>
            <p className=" flex flex-wrap gap-2 sm:text-sm text-xs text-muted-foreground">
              (
              {MONTHS.filter((m) => !longTermMonths.includes(m)).map(
                (month, index) => (
                  <p key={index}> {month}, </p>
                )
              )}{" "}
              )
            </p>
          </div>
          <NcInputNumber
            label="Nights min"
            defaultValue={night[0]}
            onChange={(value) => setNight([value, night[1]])}
            min={1}
            max={30}
          />
          <NcInputNumber
            label="Nights max"
            defaultValue={night[1]}
            onChange={(value) => setNight([night[0], value])}
            min={1}
            max={30}
          />
        </div>
      )}

      {rentalType && (rentalType == "Long Term" || rentalType == "Both") && (
        <div className="space-y-7">
          <div>
            <h1 className=" font-medium text-lg ">Long Term Rental</h1>
            <p className=" flex flex-wrap gap-2">
              (
              {MONTHS.filter((m) => longTermMonths.includes(m)).map(
                (month, index) => (
                  <p key={index}> {month}, </p>
                )
              )}{" "}
              )
            </p>
          </div>
          <NcInputNumber
            label="Months min"
            defaultValue={month[0]}
            onChange={(value) => setMonth([value, month[1]])}
            min={1}
            max={12}
          />
          <NcInputNumber
            label="Months max"
            defaultValue={month[1]}
            onChange={(value) => setMonth([month[0], value])}
            min={1}
            max={12}
          />
        </div>
      )}

      <div className="mt-4">
        <div className="flex justify-between rounded-md items-center">
          <label htmlFor="">Check-in Time</label>
          <Input
            className="w-1/2"
            type="number"
            value={time[0]}
            onChange={(e) => setTime([parseInt(e.target.value), time[1]])}
          />
        </div>
        <div className="flex justify-between rounded-md items-center mt-2">
          <label htmlFor="">Check-out Time</label>
          <Input
            type="number"
            className="w-1/2"
            value={time[1]}
            onChange={(e) => setTime([time[0], parseInt(e.target.value)])}
          />
        </div>
      </div>

      {/*  */}
      <div className="my-4">
        <h2 className="text-xl font-semibold">Set your availability</h2>
        <span className="block mt-2 text-xs ">
          Editing your calendar is easy—just select a date to block or unblock
          it. You can always make changes after you publish.
        </span>
      </div>
      {myArray.map((dates, index) => (
        <div
          className="border  rounded-lg flex flex-col gap-x-2 mb-4 p-2"
          key={index}
        >
          <span className="text-2xl m-4 font-medium">Portion {index + 1}</span>
          <div className=" min-w-screen" key={index}>
            {rentalType &&
              (rentalType == "Short Term" || rentalType == "Both") && (
                <CustomDayPicker
                  key={index}
                  index={index}
                  datesPerPortion={datesPerPortion}
                  setDatesPerPortion={setDatesPerPortion}
                />
              )}
          </div>
        </div>
      ))}
      {rentalType && (rentalType == "Long Term" || rentalType == "Both") && (
        <div className=" flex gap-2 flex-wrap">
          <h1 className=" text-2xl text-white font-semibold w-full">
            Long Term Months
          </h1>
          {longTermMonths.map((m, i) => (
            <p key={i}>{m}, </p>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-x-4 ml-2 mb-4">
        <Link
          href={{
            pathname: `/dashboard/add-listing/8`,
            query: { userId: userId },
          }}
        >
          <Button>Go back</Button>
        </Link>
        <Link
          href={{
            pathname: `/dashboard/add-listing/10`,
            query: { userId: userId },
          }}
        >
          <Button>Continue</Button>
        </Link>
      </div>
    </>
  );
};

export default PageAddListing9;
