import { Suspense } from "react"
import { LeadPage } from "./LeadPage"


const page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
          <LeadPage />
        </Suspense>
  )
}
export default page