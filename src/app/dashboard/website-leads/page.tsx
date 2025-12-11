import { Suspense } from "react";

import WebsiteLeadsPage from "./website-leads-page";

const WebsiteLeads = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WebsiteLeadsPage />
    </Suspense>
  );
};
export default WebsiteLeads;

