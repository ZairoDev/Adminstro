"use client";
import Animation from "@/components/animation";
import BreadCrumb from "@/components/BreadCrumb";
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
        <div className="sm:block hidden">
          <BreadCrumb />
        </div>
        <div>
          <Animation>{children}</Animation>
        </div>
      </main>
    </div>
  );
}
