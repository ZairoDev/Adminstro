"use client";
import Animation from "@/components/animation";
import BreadCrumb from "@/components/BreadCrumb";
import { LogoutButton } from "@/components/logoutAlertBox";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className=" lg:ml-64 p-2 w-full">
        <div className=" flex  bg-background pb-1 mb-2 sm:justify-between justify-end ">
          <div className="sm:block hidden">
            <BreadCrumb />
          </div>
          <div className="">
            <LogoutButton />
          </div>
        </div>
        <div>
          <Animation>
            <div>
              <div>{children}</div>
            </div>
          </Animation>
        </div>
      </main>
    </div>
  );
}
