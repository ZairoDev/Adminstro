import { FetchOwners } from "../fetchOwners";
import { OwnerTable } from "./owner-table";

const OwnerList = async ({ searchParams }: { searchParams: { page?: string } }) => {
  const page = Number(searchParams.page || 1);
  const { owners, totalPages } = await FetchOwners(page);

  return (
    <div>
      <h1 className=" font-semibold text-2xl">Owner List</h1>
      <OwnerTable owners={owners} totalPages={totalPages} page={page} />
    </div>
  );
};
export default OwnerList;
