import { Suspense } from "react";


import { NotReplyingLeads } from "./lead-page";

const RolebasedLead = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotReplyingLeads />
    </Suspense>
  );
};
export default RolebasedLead;
