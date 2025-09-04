"use client";

import { useEffect, useState } from "react";
import { InvoiceTable } from "./invoiceTable";
import { InvoiceData } from "../page";


const InvoiceList = () =>{
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<InvoiceData[]>([]);
  const getInvoices = async ()=>{
    try{
      const response = await fetch('/api/invoice/getInvoices');
      const data = await response.json();
      console.log(data);
      setTableData(data);
    }
    catch(err){
      console.log(err);
    }
  }
  useEffect(()=>{
    getInvoices();
  },[])
  return (
    <div>
      <InvoiceTable tableData={tableData} setTableData={setTableData}/>
    </div>
  )
}
export default InvoiceList;