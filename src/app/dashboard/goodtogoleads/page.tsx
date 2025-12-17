import { Suspense } from "react";

import { GoodToGoLeads } from "./lead-page";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const RolebasedLead = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GoodToGoLeads />
    </Suspense>
  );
};
export default RolebasedLead;
