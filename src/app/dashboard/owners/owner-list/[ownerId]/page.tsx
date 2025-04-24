import { OwnerInterface } from "@/util/type";

import OwnerClient from "./client";
import { fetchOwnerById } from "../../fetchOwners";

const OwnerPage = async ({ params }: { params: { ownerId: string } }) => {
  const owner = (await fetchOwnerById(params.ownerId)) as OwnerInterface;

  return <OwnerClient owner={owner} />;
};
export default OwnerPage;
