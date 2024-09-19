// UserRoleContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axios from "axios";

interface UserRoleContextType {
  userRole: string | null;
  currentUser: string | null;
  isLoading: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(
  undefined
);

export const UserRoleProvider = ({ children }: { children: ReactNode }) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getUserRole = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/user/getloggedinuser");
      if (response.data && response.data.user && response.data.user.role) {
        setUserRole(response.data.user.role);
        setCurrentUser(response.data.user.name);
      } else {
        console.error("No role found in the response.");
      }
    } catch (error: any) {
      console.error("Error fetching user role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getUserRole();
  }, []);

  return (
    <UserRoleContext.Provider value={{ userRole, currentUser, isLoading }}>
      {children}
    </UserRoleContext.Provider>
  );
};

// Custom hook to use the UserRole context
export const useUserRole = () => {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }
  return context;
};
