import { Suspense } from "react";
import { CompareLeadsPage } from "./compare-page";

const CompareLeads = ()=>{
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompareLeadsPage />
    </Suspense>
  );
}
export default CompareLeads;