import { Suspense } from "react";

import { DeclinedLeads } from "./lead-page";

const RolebasedLead = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DeclinedLeads />
    </Suspense>
  );
};
export default RolebasedLead;
