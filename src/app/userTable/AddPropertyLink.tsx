"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "@/util/axios";

export function AddPropertyLink({ userId }: { userId: string }) {
  const [href, setHref] = useState(
    `/dashboard/add-listing/1?userId=${encodeURIComponent(userId)}`,
  );

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`/api/unregisteredOwnersShortTerm/by-owner/${userId}`)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.shortTermDraft && res.data?.ownerSheetId) {
          setHref(
            `/dashboard/add-listing/1?userId=${encodeURIComponent(userId)}&ownerSheetId=${encodeURIComponent(res.data.ownerSheetId)}&shortTermDraft=1`,
          );
        }
      })
      .catch(() => {
        // keep default href
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return <Link href={href}>Add Property</Link>;
}
