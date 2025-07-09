import { Suspense } from "react";

import { GoodToGoLeads } from "./lead-page";

const RolebasedLead = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GoodToGoLeads />
    </Suspense>
  );
};
export default RolebasedLead;
