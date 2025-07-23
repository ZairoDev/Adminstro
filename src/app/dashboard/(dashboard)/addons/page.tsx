"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

const Addons = () => {
  return (
    <div>
      <h1 className=" text-2xl font-semibold">Add Ons</h1>

      {/*Add Agents*/}
      <section className=" border rounded-md w-36 flex flex-col items-center gap-2 mt-8">
        <h2>Add Agent</h2>
        <Link href={"/dashboard/add-agent"}>
          <Button>
            <Plus size={24} />
          </Button>
        </Link>
      </section>
    </div>
  );
};
export default Addons;
