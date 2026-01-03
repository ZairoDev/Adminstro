"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Circle } from "lucide-react";

interface LoggedEmployee {
  _id: string;
  name: string;
  email: string;
  role: string;
  lastActive?: string;
}

export function LoggedInEmployeesList() {
  const [employees, setEmployees] = useState<LoggedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLoggedInEmployees = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/employee/getLoggedInEmployees");
        if (response.data.success) {
          setEmployees(response.data.employees || []);
        }
      } catch (err: any) {
        console.error("Error fetching logged in employees:", err);
        setError(err.message || "Failed to fetch employees");
      } finally {
        setLoading(false);
      }
    };

    fetchLoggedInEmployees();
    // Refresh every 5 minutes
    const interval = setInterval(fetchLoggedInEmployees, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Circle className="h-3 w-3 fill-green-500 text-green-500 animate-pulse" />
            Online Employees
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Circle className="h-3 w-3 fill-green-500 text-green-500" />
            Online Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Circle className="h-3 w-3 fill-green-500 text-green-500 animate-pulse" />
          Online Employees
          <Badge variant="secondary" className="ml-auto">
            {employees.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {employees.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No employees currently online
          </p>
        ) : (
          employees.map((employee) => (
            <div
              key={employee._id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{employee.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {employee.role}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

