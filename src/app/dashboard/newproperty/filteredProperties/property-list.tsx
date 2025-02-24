import { ExternalLink } from "lucide-react";

import { FilteredPropertiesInterface } from "./page";

interface PropertyListProps {
  properties: FilteredPropertiesInterface[];
  isSearchTerm?: boolean;
}

const PropertyList = ({ properties, isSearchTerm = false }: PropertyListProps) => {
  return (
    <div className=" border border-neutral-700 rounded-md p-2">
      <h2 className=" text-xl font-semibold">Properties</h2>

      <div className=" w-full mt-2 flex flex-wrap gap-x-6 gap-y-4">
        {properties?.map((property) => (
          <div
            key={property._id.toString()}
            className=" border border-neutral-700 p-2 rounded-md"
          >
            {!isSearchTerm ? (
              <div className=" relative flex flex-col">
                <img
                  src={property.propertyCoverFileUrl}
                  className=" w-48 h-48 rounded-md"
                />
                <p className=" bg-white text-black font-semibold px-1 rounded-md text-center absolute top-1 left-1">
                  {property.VSID}
                </p>
                <div className=" flex justify-between mt-2">
                  <div className=" bg-white text-black font-semibold rounded-md text-center p-1">
                    €{" "}
                    {property.rentalType === "Short Term"
                      ? property.basePrice
                      : property.basePriceLongTerm}
                  </div>
                  <div
                    className=" bg-white cursor-pointer text-black font-semibold rounded-md text-center py-0.5 px-1"
                    onClick={() =>
                      window.open(
                        `https://www.vacationsaga.com/listing-stay-detail/${property._id.toString()}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink />
                  </div>
                </div>
              </div>
            ) : (
              <div className=" relative flex flex-col max-w-80">
                <img
                  src={property.propertyCoverFileUrl}
                  className=" w-32 h-32 md:w-80 md:h-80 rounded-md"
                />
                <p className=" bg-white text-black font-semibold px-1 rounded-md text-center absolute top-1 left-1">
                  {property.VSID}
                </p>
                <div className=" flex flex-col justify-between mt-2 gap-y-2 flex-wrap text-sm">
                  <div>
                    <span className=" bg-white p-0.5 text-black font-semibold rounded-md">
                      Email
                    </span>{" "}
                    {property.email}
                  </div>

                  <div className=" flex items-start gap-y-2">
                    <span className=" bg-white p-0.5 text-black font-semibold rounded-md">
                      Location
                    </span>
                    <div className=" ml-2">
                      {property.city}, {" "}
                      {property.state}, {" "}
                      {property.country}
                    </div>
                  </div>
                  <div className=" flex justify-between items-center">
                    <div>
                      {" "}
                      <span className=" bg-white p-0.5 text-black font-semibold rounded-md">
                        Base Price
                      </span>{" "}
                      € {property.basePrice}
                    </div>
                    <div
                      className=" bg-white cursor-pointer text-black font-semibold rounded-md text-center py-0.5 px-1"
                      onClick={() =>
                        window.open(
                          `https://www.vacationsaga.com/listing-stay-detail/${property._id.toString()}`,
                          "_blank"
                        )
                      }
                    >
                      <ExternalLink />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default PropertyList;
