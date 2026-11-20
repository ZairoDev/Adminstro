"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import axios from "@/util/axios";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type AttendanceNotice = {
  id: string;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  readAt: string | null;
};

type NoticeList = {
  notices: AttendanceNotice[];
  unreadCount: number;
};

const queryKey = ["attendance-notices"] as const;

async function fetchNotices(): Promise<NoticeList> {
  const response = await axios.get<{ success: boolean; data: NoticeList }>("/api/attendance/notices");
  return response.data.data ?? { notices: [], unreadCount: 0 };
}

function isNotice(value: unknown): value is AttendanceNotice {
  if (!value || typeof value !== "object") return false;
  const notice = value as Partial<AttendanceNotice>;
  return (
    typeof notice.id === "string" &&
    typeof notice.title === "string" &&
    typeof notice.message === "string" &&
    typeof notice.href === "string"
  );
}

export function AttendanceNoticeBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const query = useQuery({
    queryKey,
    queryFn: fetchNotices,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const openNotice = useCallback(
    async (notice: AttendanceNotice) => {
      if (!notice.readAt) {
        try {
          await axios.post("/api/attendance/notices/read", { id: notice.id });
        } catch {
          // The list refreshes on the next poll if marking read fails.
        }
      }
      await queryClient.invalidateQueries({ queryKey });
      router.push(notice.href);
    },
    [queryClient, router],
  );

  useEffect(() => {
    if (!socket) return;
    const onNotice = (payload: unknown) => {
      if (!isNotice(payload)) return;
      void queryClient.invalidateQueries({ queryKey });
      toast(payload.title, {
        description: payload.message,
        action: {
          label: "Open",
          onClick: () => {
            void openNotice(payload);
          },
        },
      });
    };
    socket.on("attendance-notice", onNotice);
    return () => {
      socket.off("attendance-notice", onNotice);
    };
  }, [openNotice, queryClient, socket]);

  const notices = query.data?.notices ?? [];
  const unreadCount = query.data?.unreadCount ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-9 w-9 cursor-pointer p-0"
          aria-label={
            unreadCount > 0
              ? `Attendance notices, ${unreadCount} unread`
              : "Attendance notices"
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">Attendance</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notices.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">No attendance notices</p>
          ) : (
            <ul>
              {notices.map((notice) => (
                <li key={notice.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    className="w-full cursor-pointer px-3 py-2 text-left hover:bg-muted/60"
                    onClick={() => {
                      void openNotice(notice);
                    }}
                  >
                    <p className={notice.readAt ? "text-sm" : "text-sm font-medium"}>
                      {notice.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {notice.message}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
