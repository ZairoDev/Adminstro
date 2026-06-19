import { getAmountDetails } from "@/actions/(VS)/queryActions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface BookingDetailsIn {
  totalAmount: number;
  ownerAmount: number;
  totalOwnerReceived: number;
  travellerAmount: number;
  totalTravellerReceived: number;
  totalAgentCommission: number;
  totalDocumentationCommission: number;
}

const BookingDetails = () => {
  const [filters, setFilters] = useState<{ days?: string }>({ days: "today" });

  const { data: bookingDetails = null, isLoading: bookingLoading } = useQuery({
      queryKey: ["bookingDetails", filters.days],
      queryFn: async () => {
        const response = await getAmountDetails({ days: filters.days });
        return (response.amountDetails[0] ?? null) as BookingDetailsIn | null;
      },
    });

  const fetchBookingDetails = ({ days }: { days?: string }) => {
    setFilters((prev) => ({ ...prev, days }));
  };

  return { bookingDetails, bookingLoading, fetchBookingDetails };
};

export default BookingDetails;
