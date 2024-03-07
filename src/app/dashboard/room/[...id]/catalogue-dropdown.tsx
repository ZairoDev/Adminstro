import { useEffect, useState } from "react";

import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { CatalogueInterface, CategoryInterface } from "../../catalogue/page";

const CatalogueDropdown = ({
  catalogueList,
  onAddCatalogue,
}: {
  catalogueList: CatalogueInterface[];
  onAddCatalogue: (categoryList: string[]) => void;
}) => {
  const [selectedCatalogueName, setSelectedCatalogueName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [categoryList, setCategoryList] = useState<string[]>([]);

  useEffect(() => {
    console.log("selectedCatalogue: ", selectedCatalogueName);
    const selectedCatalogue = catalogueList.find((c) => c.name === selectedCatalogueName);
    const categories = catalogueList.find(
      (c) => c.name === selectedCatalogueName
    )?.categories;
    const categoriesName = categories?.map((c) => c.name);
    setCategoryList(categoriesName || []);
    console.log("selectedCategory: ", selectedCategory);
  }, [selectedCatalogueName, selectedCategory]);

  const selectCatalogue = () => {
    if (!selectedCatalogueName || !selectedCategory) return;
    const selectedCatalogue: CatalogueInterface = catalogueList.find(
      (c) => c.name === selectedCatalogueName
    )!;
    const categories: CategoryInterface = selectedCatalogue?.categories.find(
      (c) => c.name === selectedCategory
    )!;
    const properties = categories?.properties.map((p: any) => p.VSID);
    console.log("clicked");
    onAddCatalogue(properties || []);
  };

  return (
    <div className=" flex gap-x-2">
      <Select onValueChange={setSelectedCatalogueName}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a Catalogue" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Catalogue</SelectLabel>
            {catalogueList.map((catalogue, index: number) => (
              <SelectItem key={index} value={catalogue.name}>
                {catalogue.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select onValueChange={setSelectedCategory}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Category</SelectLabel>
            {categoryList.map((category, index: number) => (
              <SelectItem key={index} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Button onClick={selectCatalogue}>Add</Button>
    </div>
  );
};
export default CatalogueDropdown;
