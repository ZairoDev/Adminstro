import axios from "axios";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";

import {
  Select,
  SelectItem,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InfinityLoader } from "@/components/Loaders";
import { Textarea } from "@/components/ui/textarea";
import { set } from "mongoose";
import { VisitInterface } from "@/util/type";

interface BookingFormSchema {
  lead: string;
  visit: string;
  checkIn: {
    date: Date;
    time: string;
  };
  checkOut: {
    date: Date;
    time: string;
  };
  paymentStatus: string;
  finalAmount: number;
  contract?: string;
  closingBy?: string;
  ownerPayment: {
    finalAmount: number;
    amountRecieved: number;
  };
  travellerPayment: {
    finalAmount: number;
    amountRecieved: number;
  };
  payment: {
    orderId: string;
    paymentId: string;
    status: string;
    remainingAmount: number;
    paidAt: Date;
  };
  note?: string;
}

interface PageProps {
  lead: string;
  visit: string;
  onOpenChange: () => void;
}

const BookingModal = ({ lead, visit, onOpenChange }: PageProps) => {
  
  const [bookingFormValues, setBookingFormValues] = useState<BookingFormSchema>(
    {
      lead: lead,
      visit: visit,
      checkIn: {
        date: new Date(),
        time: "",
      },
      checkOut: {
        date: new Date(),
        time: "",
      },
      paymentStatus: "",
      finalAmount: 0,
      contract: "",
      closingBy:"",
      ownerPayment: {
        finalAmount: 0,
        amountRecieved: 0,
      },
      travellerPayment: {
        finalAmount: 0,
        amountRecieved: 0,
      },
      payment: {
        orderId: "",
        paymentId: "",
        status: "pending",
        remainingAmount: 0,
        paidAt: new Date(),
      },
      note: "",
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [contractStatus, setContractStatus] = useState(false);
  const [visits, setVisits] = useState<VisitInterface | null>(null)
  const [employees, setEmployees] = useState<any[]>([]);

  const getVisitData = async()=>{
    try {
      const response = await axios.post(`/api/visits/getVisitById`, {visitId: visit});

      setVisits(response.data.data);
    } catch (error) {
      console.log(error);
    }
  }
  const getEmpData = async()=>{
    try {
      const response = await axios.get(`/api/employee/getSalesEmployee`);
      setEmployees(response.data.emp);

    } catch (error) {
      console.log(error);
    }
  }
  useEffect(() => {
    getVisitData();
    getEmpData();
  }, []);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await axios.post("/api/bookings/addBooking", bookingFormValues);
      toast({
        title: "Booking scheduled successfully",
      });
    } catch (err) {
      toast({
        title: "Unable to schedule booking",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      onOpenChange();
    }
  };

  const handleChange = (
    key: keyof BookingFormSchema,
    value: string | number
  ) => {
    setBookingFormValues((prev) => ({
      ...prev,
      [key]: typeof value === "string" ? value.trim() : value,
    }));
  };


  return (
    <div className=" flex flex-col gap-y-2">
      <div className=" flex justify-between items-center mb-2">
        <h2 className=" font-semibold text-lg">Booking Modal</h2>
        <Button variant={"outline"} onClick={onOpenChange}>
          <X />
        </Button>
      </div>

      {/* CheckIn-CheckOut */}
      <div className=" flex justify-between items-center gap-x-2">
        <div>
          <Label>Check In</Label>
          <Input
            type="datetime-local"
            onChange={(e) => {
              const date = format(e.target.value.split("T")[0], "MM/dd/yyyy");
              const time = e.target.value.split("T")[1];
              setBookingFormValues((prev) => ({
                ...prev,
                checkIn: {
                  date: new Date(date),
                  time: time,
                },
              }));
            }}
          />
        </div>
        <div>
          <Label>Check Out</Label>
          <Input
            type="datetime-local"
            onChange={(e) => {
              const date = format(e.target.value.split("T")[0], "MM/dd/yyyy");
              const time = e.target.value.split("T")[1];
              setBookingFormValues((prev) => ({
                ...prev,
                checkOut: {
                  date: new Date(date),
                  time: time,
                },
              }));
            }}
          />
        </div>
      </div>

      {/* Payment Status */}
      <div className=" flex justify-between items-center gap-x-2">
        <Label>Payment Status</Label>
        <Select
          onValueChange={(value) => {
            setBookingFormValues((prev) => ({
              ...prev,
              payment: {
                ...prev.payment,
                status: value,
              },
            }));
          }}
        >
          <SelectTrigger>Payment Status</SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="pending">pending</SelectItem>
              <SelectItem value="paid">paid</SelectItem>
              <SelectItem value="partial">partial</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className=" flex justify-between items-center gap-x-2">
        <Label>Lead Closing By </Label>
        <Select
          onValueChange={(value) => {
            setBookingFormValues((prev) => ({
              ...prev,
              leadClosingBy: value,
            }));
          }}
        >
          <SelectTrigger>Select Employee</SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {
                employees.map((emp: any) => (
                  <SelectItem key={emp._id} value={emp.name}>{emp.name}</SelectItem>
                ))
              }
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Negotiated Amount */}
      <div className=" grid grid-cols-2 items-center gap-x-2">
        <div>
          <Label>Pitched Amount</Label>
          <Input type="number" value={visits?.pitchAmount} disabled />
        </div>
        <div>
          <Label>Final Amount</Label>
          <Input
            type="number"
            value={bookingFormValues.finalAmount}
            onChange={(e) => handleChange("finalAmount", e.target.value)}
          />
        </div>
      </div>

      {/* Contract */}
      <div className=" grid grid-cols-2 gap-x-2">
        <div>
          <Label>Contract Signed ?</Label>
          <Select
            onValueChange={(value) => {
              if (value === "yes") setContractStatus(true);
              else setContractStatus(false);
            }}
          >
            <SelectTrigger>Contract Status</SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {contractStatus && (
          <div>
            <Label>Contract Date</Label>
            <Input
              type="date"
              onChange={(e) => handleChange("contract", e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Owner Payment */}
      <div className=" grid grid-cols-4 gap-x-2 items-center">
        <p>Owner</p>
        <div>
          <Label>Pitched Amt.</Label>
          <Input type="number" value={visits?.ownerCommission} disabled />
        </div>
        <div>
          <Label>Final Amt.</Label>
          <Input
            type="number"
            value={bookingFormValues.ownerPayment.finalAmount}
            onChange={(e) =>
              setBookingFormValues((prev) => ({
                ...prev,
                ownerPayment: {
                  ...prev.ownerPayment,
                  finalAmount: Number(e.target.value),
                },
              }))
            }
          />
        </div>
        <div>
          <Label>Recieved Amt.</Label>
          <Input
            type="number"
            value={bookingFormValues.ownerPayment.amountRecieved}
            onChange={(e) =>
              setBookingFormValues((prev) => ({
                ...prev,
                ownerPayment: {
                  ...prev.ownerPayment,
                  amountRecieved: Number(e.target.value),
                },
              }))
            }
          />
        </div>
      </div>

      {/* Traveller Payment */}
      <div className=" grid grid-cols-4 gap-x-2 items-center">
        <p>Traveller</p>
        <div>
          <Label>Pitched Amt.</Label>
          <Input type="number" value={visits?.travellerCommission} disabled />
        </div>
        <div>
          <Label>Final Amt.</Label>
          <Input
            type="number"
            value={bookingFormValues.travellerPayment.finalAmount}
            onChange={(e) =>
              setBookingFormValues((prev) => ({
                ...prev,
                travellerPayment: {
                  ...prev.travellerPayment,
                  finalAmount: Number(e.target.value),
                },
              }))
            }
          />
        </div>
        <div>
          <Label>Recieved Amt.</Label>
          <Input
            type="number"
            value={bookingFormValues.travellerPayment.amountRecieved}
            onChange={(e) =>
              setBookingFormValues((prev) => ({
                ...prev,
                travellerPayment: {
                  ...prev.travellerPayment,
                  amountRecieved: Number(e.target.value),
                },
              }))
            }
          />
        </div>
      </div>

      <div>
        <Label>Note</Label>
        <Textarea onChange={(e) => handleChange("note", e.target.value)} />
      </div>

      <Button onClick={handleSubmit} className=" mt-1">
        {isLoading ? (
          <InfinityLoader className=" h-12 w-16" strokeColor="black" />
        ) : (
          "Create Booking"
        )}
      </Button>
    </div>
  );
};
export default BookingModal;
