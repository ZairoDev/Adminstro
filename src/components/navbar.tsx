"use client";
import Link from "next/link";

import { useAuthStore } from "@/AuthStore";

import FadeInBlur from "./FadeInBlur";
import { LogoutButton } from "./logoutAlertBox";
import { ModeToggle } from "./themeChangeButton";

export function Navbar() {
  const { token } = useAuthStore();

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
            {token && <LogoutButton />}
          </div>
        </div>
      </div>
    </div>
  );
}
