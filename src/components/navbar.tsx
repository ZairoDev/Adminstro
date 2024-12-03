import Link from "next/link";

import { ModeToggle } from "./themeChangeButton";
import FadeInBlur from "./FadeInBlur";
import { LogoutButton } from "./logoutAlertBox";
import { useUserRole } from "@/context/UserRoleContext";

export function Navbar() {
  const { userRole, currentUser, userEmail, isLoading, refreshUserRole } =
    useUserRole();

  return (
    <div className="  ">
      <div className="max-w-7xl m-auto px-2">
        <div className="flex items-center justify-between ">
          <Link href="/" className="flex z-50 items-center gap-2">
            <FadeInBlur>
              <h1 className="font-semibold py-4 px-2">Adminstro.in</h1>
            </FadeInBlur>
          </Link>
          <div className="flex items-center gap-4">
            <ModeToggle />
            {userRole && (
              <>
                <LogoutButton />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
