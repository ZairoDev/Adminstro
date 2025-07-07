import { Suspense } from "react";

import RejectedLeads from "./lead-page";

const RolebasedLead = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RejectedLeads />
    </Suspense>
  );
};
export default RolebasedLead;
