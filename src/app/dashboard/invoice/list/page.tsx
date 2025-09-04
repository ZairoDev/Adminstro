"use client";

import { useEffect, useState } from "react";
import { InvoiceTable } from "./invoiceTable";

export interface Invoice {
  _id?: string; // MongoDB ID

  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;

  property?: string; // Property ID (ObjectId ref)

  invoiceNo: string; // required

  amount?: number;
  sgst?: number;
  igst?: number;
  cgst?: number;
  totalAmount?: number;
  sacCode?: number;

  status?: "paid" | "unpaid" | "partially_paid" | "cancelled";

  checkIn?: string; // ISO Date string
  checkOut?: string; // ISO Date string

  bookingType?: "Booking Commission" | "Listing Subscription";

  companyAddress?: string;
  invoiceNumber?: string;

  createdAt?: string; // ISO Date string
  updatedAt?: string; // ISO Date string
}


const InvoiceList = () =>{
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<Invoice[]>([]);
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