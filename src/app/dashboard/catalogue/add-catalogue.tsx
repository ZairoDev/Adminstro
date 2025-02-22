import { Label } from "@/components/ui/label";
import useCatalogueStore from "./CatalogueStore";
import { Input } from "@/components/ui/input";

const AddCatalogue = () => {
  const { setField } = useCatalogueStore();

  return (
    <div>
      <div className=" flex gap-x-8 justify-between">
        <p className=" text-xl font-medium"> AddCatalogue</p>
        <p onClick={() => setField("addCatalogueModal", false)}>X</p>
      </div>

      {/* Catalogue Details */}
      <div className=" grid-cols-1 md:grid-cols-2">
        <div className=" flex flex-col gap-y-2">
          {/* Catalogue Name */}
          <div>
            <Label htmlFor="catalogueName">Catalogue Name</Label>
            <Input
              id="catalogueName"
              type="text"
              placeholder="Enter a name for catalogue"
            />
          </div>

          {/* Catalogue Description */}
          <div>
            <Label htmlFor="catalogueDescription">Catalogue Description</Label>
            <Input
              id="catalogueDescription"
              type="text"
              placeholder="Enter description for catalogue"
            />
          </div>

          {/* Catalogue Category */}
          <div>
            <Label htmlFor="catalogueCategory">Catalogue Category</Label>
            <Input
              id="catalogueCategory"
              type="text"
              placeholder="Enter category for catalogue"
            />
          </div>
        </div>

        {/* Add Property*/}
        <div className=" border border-neutral-700 rounded-md"></div>
      </div>
    </div>
  );
};
export default AddCatalogue;
