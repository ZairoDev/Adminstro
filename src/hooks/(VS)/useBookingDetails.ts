import { getAmountDetails } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

interface BookingDetailsIn {
  totalAmount: number;
  ownerAmount: number;
  totalOwnerReceived: number;
  travellerAmount: number;
  totalTravellerReceived: number;
  totalAgentCommission: number;
  totalDocumentationCommission: number;
}

const BookingDetails = ()=>{
  const [bookingDetails, setBookingDetails] = useState<BookingDetailsIn | null>(
    null
  );
  const [bookingLoading,setBookingLoading] = useState(false);
  

  const fetchBookingDetails = async({days}:{days?:string})=>{
    setBookingLoading(true);
    try {
      const response = await getAmountDetails({ days });
      setBookingDetails(response.amountDetails[0]);
    } catch (err: any) {
      console.log(err);
    } finally {
      setBookingLoading(false);
    }
  }

  useEffect(()=>{
    fetchBookingDetails({days:"today"});
  },[])
  return {bookingDetails,bookingLoading,fetchBookingDetails};
}
export default BookingDetails;