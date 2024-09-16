"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { GiHamburgerMenu } from "react-icons/gi";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { ModeToggle } from "./themeChangeButton";

// Function to determine if a route is active
const isActive = (currentPath: string, path: string): boolean =>
  currentPath === path;

export function Sidebar() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const currentPath = usePathname();

  return (
    <>
      {/* Sidebar for large screens */}
      <div className="hidden lg:block w-64 bg-black text-white/80 fixed h-screen">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold p-4">Dashboard</h2>
          <div className="mr-1">
            <ModeToggle />
          </div>
        </div>
        <div>
          <nav>
            <ul>
              <li
                className={`${
                  isActive(currentPath, "/dashboard/user")
                    ? "bg-white rounded-l-xl text-black/80"
                    : ""
                }`}
              >
                <Link
                  href="/dashboard/user"
                  className="block rounded-l-xl px-4 py-2 hover:bg-white/10"
                >
                  Manage User
                </Link>
              </li>
              <li
                className={`${
                  isActive(currentPath, "/dashboard/property")
                    ? "bg-white rounded-l-xl text-black/80"
                    : ""
                }`}
              >
                <Link
                  href="/dashboard/property"
                  className="block rounded-l-xl px-4 py-2 hover:bg-white/10"
                >
                  Manage Property
                </Link>
              </li>
              <li
                className={`${
                  isActive(currentPath, "/dashboard/createnewEmployee")
                    ? "bg-white rounded-l-xl text-black/80"
                    : ""
                }`}
              >
                <Link
                  href="/dashboard/createnewEmployee"
                  className="block rounded-l-xl px-4 py-2 hover:bg-white/10"
                >
                  Manage Employee
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Sidebar for smaller screens */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <div className="lg:hidden ">
            <GiHamburgerMenu className="text-2xl  z-50 ml-2 mt-1 fixed top-0 left-0 cursor-pointer text-black dark:text-white" />
          </div>
        </SheetTrigger>

        <SheetContent
          side="left"
          className="bg-black text-white/80 w-64 fixed inset-y-0 left-0 z-50"
        >
          <div className="flex items-center mb-2 justify-between">
            <h2 className="text-2xl font-bold ">Dashboard</h2>
            <div className="-mr-3">
              <ModeToggle />
            </div>
          </div>
          <div className="flex items-center  justify-between flex-col">
            <nav>
              <ul className="w-full">
                <li
                  className={`py-2 ${
                    isActive(currentPath, "/dashboard/user")
                      ? "bg-white w-[230px] rounded-l-xl text-black"
                      : ""
                  }`}
                >
                  <Link href="/dashboard/user" className="ml-2">
                    Manage User
                  </Link>
                </li>

                <li
                  className={`py-2 ${
                    isActive(currentPath, "/dashboard/property")
                      ? "bg-white w-[230px] rounded-l-xl text-black"
                      : ""
                  }`}
                >
                  <Link href="/dashboard/property" className="block ml-2">
                    Manage Property
                  </Link>
                </li>
                <li
                  className={`py-2 ${
                    isActive(currentPath, "/dashboard/createnewEmployee")
                      ? "bg-white w-[230px] rounded-l-xl text-black"
                      : ""
                  }`}
                >
                  <Link
                    href="/dashboard/createnewEmployee"
                    className="block ml-2"
                  >
                    Manage Employee
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
