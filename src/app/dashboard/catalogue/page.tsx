"use client";

import { FolderOpen } from "lucide-react";

import AddCatalogue from "./add-catalogue";
import CatalogueList from "./catalogue-list";
import useCatalogueStore from "./CatalogueStore";

const Catalogue = () => {
  const { addCatalogueModal, setField } = useCatalogueStore();

  return (
    <div className=" w-full flex flex-col gap-y-4">
      <h1 className=" text-2xl font-semibold">Property Catalogues</h1>

      <div
        onClick={() => setField("addCatalogueModal", true)}
        className=" flex flex-col items-center border-2 border-neutral-700 rounded-md p-2 cursor-pointer hover:bg-neutral-500/50 w-32"
      >
        <FolderOpen size={36} />
        <h2 className=" text-sm">Add Catalogue</h2>
      </div>

      <hr />

      {addCatalogueModal && (
        <div className=" border border-neutral-600 rounded-md p-2">
          <AddCatalogue />
        </div>
      )}

      <div className=" border border-neutral-600 rounded-md p-2">
        <CatalogueList />
      </div>
    </div>
  );
};
export default Catalogue;
