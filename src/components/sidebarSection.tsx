import Link from "next/link"; // ✅ Correct import
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";

interface Route {
  path: string;
  label: string;
  Icon?: React.ReactNode;
}

function SidebarSection({ title, routes }: { title: string; routes: Route[] }) {
  const [open, setOpen] = useState(true);
  const currentPath = usePathname();

  if (routes.length === 0) return null;

  return (
    <li>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center text-sm justify-between w-full px-4 py-2 font-semibold text-white"
      >
        <span>{title}</span>
        <span>{open ? <IoChevronDown /> : <IoChevronUp />}</span>
      </button>
      {open && (
        <ul className="pl-4">
          {routes.map((route) => (
            <li key={route.path}>
              <Link
                href={route.path}
                className={`flex items-center text-sm gap-2 py-2 px-2 ${
                  currentPath === route.path
                    ? "bg-primary/30 border-r-4 border-primary"
                    : ""
                }`}
              >
                {route.Icon}
                <span>{route.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default SidebarSection;
