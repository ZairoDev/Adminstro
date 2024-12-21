"use client";
import BreadCrumb from "@/components/BreadCrumb";
import { CommandDialogDemo } from "@/components/camanddialog/CammandDialog";
import ScrollToTopButton from "@/components/dragButton/ScrollToTop";
import { LogoutButton } from "@/components/logoutAlertBox";
import { Notifications } from "@/components/Notifications/Notifications";
import { Sidebar } from "@/components/sidebar";
import axios from "axios";
import { BellDot } from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setToken] = useState<any>();

  const getToken = async () => {
    try {
      const response = await axios.get("/api/user/getloggedinuser");
      console.log("response of token in layout:  ", response.data.user);
      setToken(response.data.user);
    } catch (err: any) {
      console.log("No token found in layout");
    }
  };

  useEffect(() => {
    getToken();
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <main className=" lg:ml-60 p-2 w-full ">
        <div className=" xs:flex  hidden items-center xs:justify-between  justify-end ">
          <div className="xs:block hidden">
            <BreadCrumb />
          </div>
          <div className=" flex items-center gap-x-2">
            {(token?.role === "SuperAdmin" || token?.role === "Sales") && (
              <Notifications />
            )}
            <nav className="flex  justify-between items-center  gap-x-2">
              <div className="">
                <CommandDialogDemo />
              </div>
              <div className=" ">
                <LogoutButton />
              </div>
            </nav>
          </div>
        </div>
        <div className="xs:hidden block">
          <nav className="absolute top-2 right-2">
            <div className="flex items-center gap-x-2 justify-center">
              <div className=" ">
                <LogoutButton />
              </div>
            </div>
          </nav>
        </div>
        <div>
          <div>
            <div className="pb-16 lg:pb-0">{children}</div>
          </div>
        </div>
      </main>
      <ScrollToTopButton />
    </div>
  );
}
