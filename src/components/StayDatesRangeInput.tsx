import React, { Fragment, FC, useState, useEffect } from "react";
import { Popover, Transition } from "@headlessui/react";
import { CalendarIcon } from "@heroicons/react/24/outline";
import DatePicker from "react-datepicker";
import DatePickerCustomHeaderTwoMonth from "@/components/DatePickerCustomHeaderTwoMonth";
import DatePickerCustomDay from "@/components/DatePickerCustomDay";
import ClearDataButton from "@/app/(client-components)/(HeroSearchForm)/ClearDataButton";

export interface StayDatesRangeInputProps {
  className?: string;
  initialStartDate?: Date | null;
  initialEndDate?: Date | null;
  onDatesChange?: (dates: { startDate: Date | null; endDate: Date | null }) => void;
  minNights?: number; // Added minNights prop
}

interface DateState {
  startDate: Date | null;
  endDate: Date | null;
}

const StayDatesRangeInput: FC<StayDatesRangeInputProps> = ({
  className = "flex-1",
  initialStartDate = null,
  initialEndDate = null,
  onDatesChange,
  minNights = 1, // Default to 1 if minNights is not provided
}) => {
  
  const dt = new Date();
  const edt = new Date(dt);
  // console.log("minNight default: ", minNights);
  edt.setDate(dt.getDate() + minNights);
  const [startDate, setStartDate] = useState<Date | null>(dt);
  const [endDate, setEndDate] = useState<Date | null>(edt);
  // console.log('date: ', dt.getDate(), minNights)
  const dt2 = new Date(dt.getDate() + minNights)


  useEffect(() => {
    // console.log('minNights input useEffect: ', minNights)
    const savedDate = localStorage.getItem("dates");
    const dt = new Date(Date.now());
    const newDate = new Date(Date.now() + minNights + 1 )
    if (savedDate) {
      const { startDate: savedStartDate, endDate: savedEndDate } = JSON.parse(savedDate);
      setStartDate(new Date(savedStartDate));
      setEndDate(newDate);
    }
    setStartDate(dt);
    setEndDate(edt); 
  }, [minNights]);

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

    const newDate: DateState = { startDate: start, endDate: end };
    localStorage.setItem("dates", JSON.stringify(newDate));

    if (onDatesChange) {
      onDatesChange({ startDate: start, endDate: end });
    }
  };
     
  const calculateDateDifference = (start: Date | null, end: Date | null) => {
    if (start && end) {
      const timeDiff = end.getTime() - start.getTime();
      return Math.ceil(timeDiff / (1000 * 3600 * 24)) ; // Adding 1 to include both start and end dates
    }
    return 0;
  };

  const daysBetween = calculateDateDifference(startDate, endDate);

  const renderInput = () => {
    return (
      <>
        <div className="text-neutral-300 dark:text-neutral-400">
          <CalendarIcon className="w-5 h-5 lg:w-7 lg:h-7" />
        </div>
        <div className="flex-grow text-left">
          <span className="block xl:text-lg font-semibold">
            {startDate?.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
            }) || "Add dates"}
            {endDate
              ? " - " +
                endDate?.toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                })
              : ""}
          </span>
          <span className="block mt-1 text-sm text-neutral-400 leading-none font-light">
            {"Check in - Check out"}
          </span>
          {/* <span className="block mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {daysBetween > 0 && `Total Days: ${daysBetween}`}
          </span> */}
        </div>
      </>
    );
  };

  return (
    <Popover className={`StayDatesRangeInput z-10 relative flex ${className}`}>
      {({ open }) => (
        <>
          <Popover.Button
            className={`flex-1 flex relative p-3 items-center space-x-3 focus:outline-none ${
              open ? "shadow-lg" : ""
            }`}
          >
            {renderInput()}
            {startDate && open && (
              <ClearDataButton onClick={() => onChangeDate([null, null])} />
            )}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute left-auto xl:-right-10 right-0 z-10 mt-3 top-full w-screen max-w-sm px-4 sm:px-0 lg:max-w-3xl">
              <div className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-black ring-opacity-5 bg-white dark:bg-neutral-800 p-8">
                <DatePicker
                className=" opacity-100"
                  selected={startDate}
                  onChange={onChangeDate}
                  startDate={startDate}
                  endDate={endDate}
                  minDate={new Date()}
                  selectsRange
                  monthsShown={2}
                  showPopperArrow={false}
                  inline
                  renderCustomHeader={(p) => (
                    <DatePickerCustomHeaderTwoMonth {...p} />
                  )}
                  renderDayContents={(day, date) => (
                    <DatePickerCustomDay dayOfMonth={day} date={date} />
                  )}
                />
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};
export default StayDatesRangeInput;
