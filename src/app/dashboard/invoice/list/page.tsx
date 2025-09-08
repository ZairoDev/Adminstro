"use client";

import { useEffect, useState } from "react";
import { InvoiceTable } from "./invoiceTable";
import { InvoiceData } from "../page";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import BulkPdfButton from "./buttonBulk";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterProps {
  month: string; // 01-12
  year: string; // YYYY
}

const InvoiceList = () => {
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<InvoiceData[]>([]);
  const [filter, setFilter] = useState<FilterProps>({
    month: "",
    year: "",
  });

  const getInvoices = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/invoice/getInvoices", {
        params: filter, // send month & year
      });
      const data = response.data.data;
      setTableData(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getInvoices();
  }, []);

  // 🔥 Generate months
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    const label = new Date(0, i).toLocaleString("default", { month: "long" });
    return { value: month, label };
  });

  // 🔥 Generate years (last 10 years + current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => {
    const year = String(currentYear - i);
    return { value: year, label: year };
  });

  return (
    <div>
      <div className="flex justify-between items-center my-4">
        {/* Month + Year Filter */}
        <div className="flex items-center gap-2">
          {/* Month Select */}
          <Select
            onValueChange={(val) =>
              setFilter((prev) => ({ ...prev, month: val }))
            }
            value={filter.month}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Select */}
          <Select
            onValueChange={(val) =>
              setFilter((prev) => ({ ...prev, year: val }))
            }
            value={filter.year}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={getInvoices} disabled={loading}>
            {loading ? "Loading..." : "Filter"}
          </Button>
          {(filter.month || filter.year) && (
            <Button
              variant="outline"
              onClick={() => {
                setFilter({ month: "", year: "" });
                getInvoices();
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              window.location.href = "/dashboard/invoices/create";
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Invoice
          </Button>
          <BulkPdfButton invoices={tableData} />
        </div>
      </div>

      <InvoiceTable tableData={tableData} setTableData={setTableData} />
    </div>
  );
};

export default InvoiceList;
