import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import Link from "next/link";
import { LogoutButton } from "./logoutAlertBox";
import { CiMenuBurger } from "react-icons/ci";
import { ModeToggle } from "./themeChangeButton";

export function Navbar() {
  return (
    <div className="  ">
      <div className="max-w-7xl m-auto">
        <div className="flex items-center justify-between p-4 ">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="https://www.vacationsaga.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo2.1244b764.png&w=640&q=75"
              alt="/"
              className="max-w-[170px]"
            />
          </Link>
          <div className="flex items-center gap-4">
            <ModeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
