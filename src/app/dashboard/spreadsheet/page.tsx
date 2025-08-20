"use client";
import axios from "axios";
import { SpreadsheetTable } from "./spreadsheetTable";
import { useEffect, useState } from "react";
import { unregisteredOwners } from "@/util/type";

const Spreadsheet = () => {
  const [data, setData] = useState<unregisteredOwners[]>([]);

  const getData = async () => {
    try {
      const response = await axios.get(`/api/unregisteredOwners/getList`);
      console.log(response.data);
      // ✅ make sure it's always an array
      setData(
        Array.isArray(response.data.data)
          ? response.data.data
          : [response.data.data]
      );
    } catch (error) {
      console.error("Failed to fetch target:", error);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <div>
      Spreadsheet
      <div>
        <SpreadsheetTable tableData={data} setTableData={setData} />
      </div>
    </div>
  );
};
export default Spreadsheet;
