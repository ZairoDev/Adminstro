// "use client";
// import axios from "axios";
// import { SpreadsheetTable } from "./spreadsheetTable";
// import { useEffect, useRef, useState } from "react";
// import { unregisteredOwners } from "@/util/type";
// import { FilteredPropertiesInterface, FiltersInterface } from "../newproperty/filteredProperties/page";
// import FilterBar from "./FilterBar";
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "@/components/ui/tabs";


// const Spreadsheet = () => {
//     const [data, setData] = useState<unregisteredOwners[]>([]);
//     const [properties, setProperties] = useState<FilteredPropertiesInterface[]>([]);
//     const [isLoading, setIsLoading] = useState(false);
//     const [page, setPage] = useState(1);
//     const [totalProperties, setTotalProperties] = useState(1);
//     const [selectedTab , setSelectedTab] = useState("available");
//     const observerRef = useRef<HTMLDivElement | null>(null);

//     const [filters, setFilters] = useState<FiltersInterface>({
//       searchType: "",
//       searchValue: "",
//       propertyType: "",
//       place: "",
//       rentalType: "Short Term",
//       minPrice: 0,
//       maxPrice: 0,
//       beds: 0,
//       bedrooms: 0,
//       bathroom: 0,
//       dateRange: undefined,
//     });

//     const fetchProperties = async () => {
//       setIsLoading(true);
//       try {
//         const response = await axios.post("/api/property/filteredProperties", {
//           filters,
//           page,
//         });
//         // console.log("response of filtered data: ", response.data.filteredProperties);
//         setProperties(response.data.filteredProperties);
//         setTotalProperties(response.data.totalProperties);
//       } catch (error) {
//         console.error("Error fetching properties:", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     const handleSubmit = () => {
//       // console.log("clicked submit", filters);
//       // fetchProperties();
//       getData(selectedTab);
//     };

//     const handleClear = () => {
//       setFilters({
//         searchType: "",
//         searchValue: "",
//         propertyType: "",
//         place: "",
//         rentalType: "Short Term",
//         minPrice: 0,
//         maxPrice: 0,
//         beds: 0,
//         bedrooms: 0,
//         bathroom: 0,
//         dateRange: undefined,
//       });
//       fetchProperties();
//     };

//     useEffect(() => {
//       fetchProperties();
//     }, [page]);

//     const getData = async (tab:string , currentPage : number ) => {
//     try {
//       const endpoint = tab === "available" ? "/api/unregisteredOwners/getAvailableList" : "/api/unregisteredOwners/getNotAvailableList";

//       const response = await axios.post(endpoint,{
//         filters,
//          filters,
//         page: currentPage,
//         limit: LIMIT,
//       });
//       // console.log(response.data);
//       // ✅ make sure it's always an array
//       setData(
//         Array.isArray(response.data.data)
//           ? response.data.data
//           : [response.data.data]
//       );
//     } catch (error) {
//       console.error("Failed to fetch target:", error);
//     }
//   };

//     useEffect(() => {
//       getData(selectedTab);
//     }, [selectedTab]);

//   return (
//     <div>
//       <h1 className="text-xl font-bold mb-4">Spreadsheet</h1>

     
//       <Tabs
//         defaultValue="available"
//         value={selectedTab}
//         onValueChange={setSelectedTab}
//       >
//         <TabsList>
//           <TabsTrigger value="available">Available</TabsTrigger>
//           <TabsTrigger value="notAvailable">Not Available</TabsTrigger>
//         </TabsList>

       
//         <TabsContent value="available">
//             <FilterBar
//               filters={filters}
//               setFilters={setFilters}
//               handleSubmit={handleSubmit}
//               handleClear={handleClear}
//             />
//           <SpreadsheetTable tableData={data} setTableData={setData} />
//         </TabsContent>

//         {/* Not Available Tab */}
//         <TabsContent value="notAvailable">
//           <FilterBar
//             filters={filters}
//             setFilters={setFilters}
//             handleSubmit={handleSubmit}
//             handleClear={handleClear}
//           />
//           <SpreadsheetTable tableData={data} setTableData={setData} />
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// };
// export default Spreadsheet;

"use client";
import axios from "axios";
import { SpreadsheetTable } from "./spreadsheetTable";
import { useEffect, useState, useRef, useCallback } from "react";
import { unregisteredOwners } from "@/util/type";
import { FilteredPropertiesInterface, FiltersInterface } from "../newproperty/filteredProperties/page";
import FilterBar from "./FilterBar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const LIMIT = 50;

const Spreadsheet = () => {
  const [data, setData] = useState<unregisteredOwners[]>([]);
  const [properties, setProperties] = useState<FilteredPropertiesInterface[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedTab, setSelectedTab] = useState("available");
  const observerRef = useRef<HTMLDivElement | null>(null);
  const observerInstance = useRef<IntersectionObserver | null>(null);

  const [filters, setFilters] = useState<FiltersInterface>({
    searchType: "",
    searchValue: "",
    propertyType: "",
    place: "",
    area: "",
    zone: "",
    metroZone: "",
    rentalType: "Short Term",
    minPrice: 0,
    maxPrice: 0,
    beds: 0,
    bedrooms: 0,
    bathroom: 0,
    dateRange: undefined,
  });

  const getData = async (tab: string, currentPage: number) => {
    try {
      setIsLoading(true);
      const endpoint =
        tab === "available"
          ? "/api/unregisteredOwners/getAvailableList"
          : "/api/unregisteredOwners/getNotAvailableList";

      const response = await axios.post(endpoint, {
        filters,
        page: currentPage,
        limit: LIMIT,
      });

      const newData = Array.isArray(response.data.data)
        ? response.data.data
        : [response.data.data];

      setData((prev) => (currentPage === 1 ? newData : [...prev, ...newData]));
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    setPage(1);
    getData(selectedTab, 1);
  };

  const handleClear = () => {
    setFilters({
      searchType: "",
      searchValue: "",
      propertyType: "",
      place: "",
      area: "",
      zone: "",
      metroZone: "",
      rentalType: "Short Term",
      minPrice: 0,
      maxPrice: 0,
      beds: 0,
      bedrooms: 0,
      bathroom: 0,
      dateRange: undefined,
    });
    setPage(1);
    getData(selectedTab, 1);
  };

  useEffect(() => {
    setPage(1);
    getData(selectedTab, 1);
  }, [selectedTab]);

  const loadMore = useCallback(() => {
    if (isLoading || data.length >= total) return; 
    const nextPage = page + 1;
    setPage(nextPage);
    getData(selectedTab, nextPage);
  }, [isLoading, data, total, page, selectedTab]);

  useEffect(() => {
    if (!observerRef.current) return;

    if (observerInstance.current) {
      observerInstance.current.disconnect();
    }

    observerInstance.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          loadMore();
        }
      },
      {
        root: null, 
        rootMargin: "200px", 
        threshold: 0, 
      }
    );

    observerInstance.current.observe(observerRef.current);

    return () => {
      if (observerInstance.current) observerInstance.current.disconnect();
    };
  }, [loadMore, isLoading]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Spreadsheet</h1>

      <Tabs
        defaultValue="available"
        value={selectedTab}
        onValueChange={setSelectedTab}
      >
        <TabsList>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="notAvailable">Not Available</TabsTrigger>
        </TabsList>

        {/* Available Tab */}
        <TabsContent value="available">
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            handleSubmit={handleSubmit}
            handleClear={handleClear}
            selectedTab={selectedTab}
          />
          <SpreadsheetTable tableData={data} setTableData={setData} />
          {isLoading && <p className="text-center">Loading...</p>}
          <div ref={observerRef} className="h-10" />
        </TabsContent>

        {/* Not Available Tab */}
        <TabsContent value="notAvailable">
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            handleSubmit={handleSubmit}
            handleClear={handleClear}
            selectedTab={selectedTab}

          />
          <SpreadsheetTable tableData={data} setTableData={setData} />
          {isLoading && <p className="text-center">Loading...</p>}
          <div ref={observerRef} className="h-10" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Spreadsheet;

