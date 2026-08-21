"use client";

import { useState } from "react";
import {
  Users,
  ClipboardList,
  CalendarClock,
  Star,
  GraduationCap,
  Ban,
  Upload,
  Briefcase,
  UserMinus,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PeopleListShell,
  type PeopleListTab,
} from "@/features/people/components/PeopleListShell";

const PEOPLE_TABS: {
  value: PeopleListTab;
  label: string;
  icon: typeof Users;
}[] = [
  { value: "pipeline", label: "Pipeline", icon: ClipboardList },
  { value: "interview", label: "Interviews", icon: CalendarClock },
  { value: "shortlisted", label: "Shortlisted", icon: Star },
  { value: "selected", label: "Selected for Training", icon: GraduationCap },
  { value: "rejected", label: "Rejected", icon: Ban },
  { value: "onboarding", label: "Onboarding", icon: Users },
  { value: "active", label: "Employed", icon: Briefcase },
  { value: "exited", label: "Exited", icon: UserMinus },
];

export default function PeoplePage() {
  const [tab, setTab] = useState<PeopleListTab>("pipeline");

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as PeopleListTab)}
    >
      <TabsList className="mb-6 h-auto flex-wrap gap-1">
        {PEOPLE_TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="flex items-center gap-1.5 px-3 py-1.5"
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <PeopleListShell tab={tab} />
    </Tabs>
  );
}
