import { Suspense } from "react";

import { VisitsPage } from "./visit-page";

const Visits = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VisitsPage />
    </Suspense>
  );
};
export default Visits;
