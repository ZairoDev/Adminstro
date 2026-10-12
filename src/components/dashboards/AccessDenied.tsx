"use client";

import React from "react";
import { ShieldX, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  variant?: "full" | "inline" | "card";
}

export function AccessDenied({
  title = "Access Denied",
  message = "You don't have permission to view this content.",
  showBackButton = true,
  variant = "full",
}: AccessDeniedProps) {
  const router = useRouter();

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
        <span className="text-yellow-800 dark:text-yellow-200">{message}</span>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Lock className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-red-500 dark:text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>

        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            If you believe this is an error, please contact your administrator.
          </p>

          {showBackButton && (
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="mt-4"
            >
              Go Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Component to wrap content that requires specific role access
 */
interface RoleGateProps {
  allowedRoles: string[];
  userRole: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({
  allowedRoles,
  userRole,
  children,
  fallback,
}: RoleGateProps) {
  if (!allowedRoles.includes(userRole)) {
    return fallback || <AccessDenied variant="card" />;
  }

  return <>{children}</>;
}

/**
 * Component to wrap content that requires location access
 */
interface LocationGateProps {
  requiredLocation: string;
  userLocations: string[];
  isAdmin: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LocationGate({
  requiredLocation,
  userLocations,
  isAdmin,
  children,
  fallback,
}: LocationGateProps) {
  // Admin can access all locations
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check if user has access to the required location
  const hasAccess = userLocations.some(
    (loc) => loc.toLowerCase() === requiredLocation.toLowerCase()
  );

  if (!hasAccess) {
    return (
      fallback || (
        <AccessDenied
          variant="inline"
          message={`You don't have access to data for ${requiredLocation}.`}
        />
      )
    );
  }

  return <>{children}</>;
}

export default AccessDenied;

