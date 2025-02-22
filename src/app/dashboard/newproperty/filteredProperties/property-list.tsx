import { ExternalLink } from "lucide-react";

import { FilteredPropertiesInterface } from "./page";

const PropertyList = ({ properties }: { properties: FilteredPropertiesInterface[] }) => {
  return (
    <div className=" border border-neutral-700 rounded-md p-2">
      <h2 className=" text-xl font-semibold">Properties</h2>

      <div className=" w-full mt-2 flex flex-wrap justify-center md:justify-between gap-x-2 gap-y-4">
        {properties?.map((property) => (
          <div
            key={property._id.toString()}
            className=" border border-neutral-700 p-2 rounded-md"
          >
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
                  € {property.basePrice}
                </div>
                <div
                  className=" bg-white text-black font-semibold rounded-md text-center py-1 px-2"
                  onClick={() =>
                    // window.open(
                    //   `https://www.vacationsaga.com/listing-stay-detail/${property._id.toString()}`,
                    //   "_blank"
                    // )
                    {}
                  }
                >
                  <ExternalLink />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default PropertyList;
