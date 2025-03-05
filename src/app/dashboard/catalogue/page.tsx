"use client";

import axios from "axios";
import type React from "react";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import CatalogueList from "./catalogue-list";
import { FormValidator } from "@/util/formValidator";

export interface CategoryInterface {
  name: string;
  description: string;
  properties: string[];
}

export interface CatalogueInterface {
  _id?: string;
  name: string;
  location: string;
  description: string;
  categories: CategoryInterface[];
}

export default function AddCatalogue() {
  const [categories, setCategories] = useState<CategoryInterface[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueInterface>({
    name: "",
    location: "",
    description: "",
    categories: [],
  });
  const [catalogues, setCatalogues] = useState<CatalogueInterface[]>([]);

  const getAllCatalogues = async () => {
    try {
      const response = await axios.get("/api/catalogue/getAllCatalogues");
      // console.log("response of catalogue: ", response.data.allCatalogues);
      setCatalogues(response.data.allCatalogues);
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Unable to fetch catalogues",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    getAllCatalogues();
  }, []);

  const updateCatalogue = (field: keyof CatalogueInterface, value: string) => {
    setCatalogue({ ...catalogue, [field]: value });
  };

  const addCategory = () => {
    setCategories([...categories, { name: "", description: "", properties: [] }]);
  };

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const addProperty = (categoryIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].properties.push("");
    setCategories(newCategories);
  };

  const removeProperty = (categoryIndex: number, propertyIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].properties.splice(propertyIndex, 1);
    setCategories(newCategories);
  };

  const updateCategory = (
    index: number,
    field: keyof CategoryInterface,
    value: string
  ) => {
    const newCategories = [...categories];
    if (field === "properties") {
      newCategories[index].properties = [value];
    } else {
      newCategories[index][field] = value;
    }
    setCategories(newCategories);
  };

  const updateProperty = (
    categoryIndex: number,
    propertyIndex: number,
    value: string
  ) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].properties[propertyIndex] = value;
    setCategories(newCategories);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCatalogue = { ...catalogue, categories: categories };
    const val = FormValidator(newCatalogue);
    if (val) return;
    try {
      const response = await axios.post("/api/catalogue/addCatalogue", newCatalogue);
      toast({
        title: "Success",
        description: "Catalogue added successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Error in adding catalogue",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <Toaster />
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Add Catalogue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Catalogue Name</Label>
              <Input
                id="name"
                placeholder="Enter catalogue name"
                onChange={(e) => updateCatalogue("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Catalogue Location</Label>
              <Input
                id="location"
                placeholder="Enter catalogue location"
                onChange={(e) => updateCatalogue("location", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Catalogue Description</Label>
              <Textarea
                id="description"
                placeholder="Enter catalogue description"
                onChange={(e) => updateCatalogue("description", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Categories</h3>
            <Button type="button" onClick={addCategory} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>

          {categories.map((category, categoryIndex) => (
            <Card key={categoryIndex}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-base font-medium">
                  Category {categoryIndex + 1}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeCategory(categoryIndex)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Category Name</Label>
                  <Input
                    value={category.name}
                    onChange={(e) =>
                      updateCategory(categoryIndex, "name", e.target.value)
                    }
                    placeholder="Enter category name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category Description</Label>
                  <Textarea
                    value={category.description}
                    onChange={(e) =>
                      updateCategory(categoryIndex, "description", e.target.value)
                    }
                    placeholder="Enter category description"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Property IDs</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addProperty(categoryIndex)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Property
                    </Button>
                  </div>

                  {category.properties.map((property, propertyIndex) => (
                    <div key={propertyIndex} className="flex gap-2">
                      <Input
                        value={property}
                        onChange={(e) =>
                          updateProperty(categoryIndex, propertyIndex, e.target.value)
                        }
                        placeholder="Enter property ID"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => removeProperty(categoryIndex, propertyIndex)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button type="submit" className="w-full">
          Save Catalogue
        </Button>
      </form>

      {/* All Catalogues */}
      <CatalogueList catalogues={catalogues} />
    </div>
  );
}
