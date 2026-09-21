"use client";
import Link from "next/link";

import { useAuthStore } from "@/AuthStore";

import FadeInBlur from "./FadeInBlur";
import { LogoutButton } from "./logoutAlertBox";

export function Navbar() {
  const { token } = useAuthStore();

  return (
    <div className="  ">
      <div className="max-w-7xl m-auto px-2">
        <div className="flex items-center justify-between ">
          <Link href="/" className="flex z-50 items-center gap-2">
            <FadeInBlur>
              <h1 className="px-2 py-4 text-2xl font-bold">Adminstro.in</h1>
            </FadeInBlur>
          </Link>
          {token ? (
            <div className="flex items-center gap-4">
              <LogoutButton />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
