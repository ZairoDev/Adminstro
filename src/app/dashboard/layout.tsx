"use client";
import BreadCrumb from "@/components/BreadCrumb";
import { LogoutButton } from "@/components/logoutAlertBox";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex  ">
      <Sidebar />

      <main className=" lg:ml-64 p-2 w-full">
        <BreadCrumb />
        <div>{children}</div>
      </main>
    </div>
  );
}
