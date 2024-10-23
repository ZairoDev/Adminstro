"use client";
import React, { useState, useEffect } from "react";
import Heading from "@/components/Heading";
import axios from "axios";

interface PageProps {
  params: {
    id: string;
  };
}

const PortionDetailsPage: React.FC<PageProps> = ({ params }) => {
  const [propertyData, setPropertyData] = useState<any[]>([]);
  const [selectedPortion, setSelectedPortion] = useState<number | null>(null);

  // Fetch properties by commonId
  const fetchProperties = async () => {
    try {
      const response = await axios.post("/api/property/gerPropertyByCommonId", {
        commonId: params.id,
      });

      console.log("Above the api call", response.data.data.properties);

      setPropertyData(response.data.data.properties);

      console.log("Below the api call ", response.data.data.properties);

      setSelectedPortion(0);
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return (
    <div className="flex flex-col md:flex-row items-start justify-between w-full">
      <div className="md:w-3/10 w-full md:border-r-2 md:pr-4">
        <Heading
          heading="Portions"
          subheading="Select a portion to view details"
        />
        <div className="mt-4">
          {propertyData.map((portion: any, index: number) => (
            <button
              key={portion.commonId}
              className={`w-full text-left py-2 px-3 mb-2 rounded-lg border ${
                selectedPortion === index
                  ? "bg-primary text-white"
                  : "bg-gray-100"
              } hover:bg-gray-200`}
              onClick={() => setSelectedPortion(index)}
            >
              Portion {index + 1}: {portion.commonId}
            </button>
          ))}
        </div>
      </div>

      <div className="md:w-7/10 w-full mt-4 md:mt-0">
        <Heading
          heading="Portion Details"
          subheading="Details of the selected portion"
        />
        <div className="mt-4">
          {selectedPortion !== null && propertyData[selectedPortion] ? (
            <div>
              <p>
                <strong>Common ID:</strong>{" "}
                {propertyData[selectedPortion].commonId}
              </p>
              {/* Display portion-specific details */}
              {propertyData[selectedPortion].commonProperties.length > 0 ? (
                <>
                  <p>
                    <strong>VSID:</strong>{" "}
                    {propertyData[selectedPortion].commonProperties[0]?.VSID ||
                      "N/A"}
                  </p>
                  <p>
                    <strong>Base Price:</strong> €{" "}
                    {propertyData[selectedPortion].commonProperties[0]
                      ?.basePrice || "N/A"}
                  </p>
                  <p>
                    <strong>Hosted By:</strong>{" "}
                    {propertyData[selectedPortion].commonProperties[0]
                      ?.hostedBy || "N/A"}
                  </p>
                  <p>
                    <strong>Hosted From:</strong>{" "}
                    {propertyData[selectedPortion].commonProperties[0]
                      ?.hostedFrom || "N/A"}
                  </p>
                </>
              ) : (
                <p>No common properties available for this portion.</p>
              )}
            </div>
          ) : (
            <p>Select a portion to view its details.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortionDetailsPage;
