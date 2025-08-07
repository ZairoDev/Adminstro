import { Suspense } from "react";
import UnregisteredOwnersTable from "./unregisteredTable";


export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UnregisteredOwnersTable />
    </Suspense>
  );
}
