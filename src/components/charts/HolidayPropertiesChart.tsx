"use client";

import React, { useEffect, useState } from "react";
import { ReusableLineChart } from "./VisitsLineChart";

interface Point {
  date: string;
  count: number;
}

export default function HolidayPropertiesChart() {
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch("/api/holidaysera/properties-stats")
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        if (json.success && Array.isArray(json.data)) {
          setData(json.data);
        } else {
          setData([]);
        }
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <ReusableLineChart
        title="Properties added (30 days)"
        description="Properties originating from HolidaySera"
        data={data.map((d) => ({ date: d.date, owners: d.count }))}
        dataKey="owners"
        label="Properties"
        color="hsl(var(--chart-3))"
      />
    </div>
  );
}

