import axios from "axios";
import { useEffect, useState } from "react";

import { EmployeeInterface } from "@/util/type";

export const useEmployees = () => {
  const [employees, setEmployees] = useState<EmployeeInterface[]>([]);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const getAllEmployees = async () => {
      setIsPending(true);
      try {
        const response = await axios.get("/api/employee/getAllEmployee");
        // console.log("all employees: ", response.data.allEmployees.length);
        setEmployees(response.data.allEmployees);
      } catch (err) {
        console.log("error in getting aliases: ", err);
        setError(err as string);
      } finally {
        setIsPending(false);
      }
    };

    getAllEmployees();
  }, []);

  return { employees, setEmployees, error, isPending };
};
