"use client";
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
        <div>{children}</div>
      </main>
    </div>
  );
}
