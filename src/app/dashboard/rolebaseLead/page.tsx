import { Suspense } from "react";

import { LeadPage } from "./lead-page";

const RolebasedLead = () => {

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LeadPage />
    </Suspense>
  );
};
export default RolebasedLead;
