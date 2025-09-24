import { Suspense } from "react";
import { ReviewLeads } from "./lead-page";

const ReviewPage = ()=>{
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <ReviewLeads />
      </Suspense>
    );
}

export default ReviewPage;