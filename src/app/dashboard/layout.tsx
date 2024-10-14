"use client";
import BreadCrumb from "@/components/BreadCrumb";
import ScrollToTopButton from "@/components/dragButton/ScrollToTop";
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
      <main className=" lg:ml-60 p-2 w-full">
        <div className="  ">
          <div className="xs:block hidden">
            <BreadCrumb />
          </div>
        </div>
        <div>
          <div>
            <div className="pb-16 lg:pb-0">{children}</div>
          </div>

          <nav className="flex flex-col  justify-between ">
            <div className=" absolute top-2 right-2">
              <LogoutButton />
            </div>
          </nav>
        </div>
      </main>
      <ScrollToTopButton />
    </div>
  );
}
