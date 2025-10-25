import { Suspense } from "react";
import BookingPage from "./booking-page";


const Bookings = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingPage />
    </Suspense>
  );
};
export default Bookings;
