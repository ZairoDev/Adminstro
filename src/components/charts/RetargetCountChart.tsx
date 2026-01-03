"use client";

import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";

interface RetargetCounts {
  pending: number;
  retargeted: number;
  blocked: number;
  total: number;
}

interface RetargetCountDisplayProps {
  owners: RetargetCounts;
  guests: RetargetCounts;
  loading?: boolean;
}

export function RetargetCountDisplay({
  owners,
  guests,
  loading,
}: RetargetCountDisplayProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[150px]">
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate combined totals
  const totalPending = (owners?.pending || 0) + (guests?.pending || 0);
  const totalRetargeted = (owners?.retargeted || 0) + (guests?.retargeted || 0);
  const totalBlocked = (owners?.blocked || 0) + (guests?.blocked || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Pending Block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending</CardTitle>
          <CardDescription>Owners and Guests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{totalPending}</div>
          <div className="text-sm text-muted-foreground mt-2">
            Owners: {owners?.pending || 0} | Guests: {guests?.pending || 0}
          </div>
        </CardContent>
      </Card>

      {/* Retargeted Block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Retargeted</CardTitle>
          <CardDescription>Owners and Guests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{totalRetargeted}</div>
          <div className="text-sm text-muted-foreground mt-2">
            Owners: {owners?.retargeted || 0} | Guests: {guests?.retargeted || 0}
          </div>
        </CardContent>
      </Card>

      {/* Blocked Block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Blocked</CardTitle>
          <CardDescription>Owners and Guests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{totalBlocked}</div>
          <div className="text-sm text-muted-foreground mt-2">
            Owners: {owners?.blocked || 0} | Guests: {guests?.blocked || 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

