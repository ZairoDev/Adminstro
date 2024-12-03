import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ContactRound,
  CornerLeftUp,
  BookPlus,
  PackagePlus,
  Smile,
  BookCheck,
  BadgeCheck,
  CalendarPlus,
  PencilLine,
  Speech,
  Check,
  MousePointerBan,
  ArrowUpLeft,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const routes = [
  { name: "Manage User", icon: ContactRound, path: "/dashboard/user" },
  { name: "Manage Employee", icon: Smile, path: "/dashboard/employee" },
  { name: "Manage Task", icon: BookCheck, path: "/dashboard/property" },

  {
    name: "Add Employee",
    icon: BookCheck,
    path: "/dashboard/createnewEmployee",
  },
  { name: "Create User", icon: BookCheck, path: "/dashboard/createnewuser" },

  {
    name: "Leftover Task",
    icon: ArrowUpLeft,
    path: "/dashboard/remainingproperties",
  },
  {
    name: "Completed Task",
    icon: BadgeCheck,
    path: "/dashboard/completedproperties",
  },
  {
    name: "Create Lead",
    icon: PencilLine,
    path: "/dashboard/createquery",
  },
  {
    name: "Created Lead",
    icon: CalendarPlus,
    path: "/dashboard/createdQuery",
  },

  { name: "Read Blogs", icon: BookPlus, path: "/dashboard/allblogs" },
  { name: "Create Blog", icon: PackagePlus, path: "/dashboard/createblog" },
  {
    name: "Register Candidate",
    icon: Speech,
    path: "/dashboard/candidatePortal",
  },
  {
    name: "Leftover Candidate",
    icon: ArrowUpLeft,
    path: "/dashboard/leftoverCandidate",
  },
  {
    name: "Attended Candidate",
    icon: Check,
    path: "/dashboard/attendedCandidate",
  },
];

export function CommandDialogDemo() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleNavigation = (path: string) => {
    router.push(path);
    setOpen(false);
  };
  return (
    <>
      <div className="border px-3 py-1 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Press
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘/Ctrl</span> + k
          </kbd>
        </p>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {routes.map((route) => (
              <CommandItem
                key={route.path}
                onSelect={() => handleNavigation(route.path)}
              >
                <route.icon className="mr-2 h-4 w-4" />
                <span>{route.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
