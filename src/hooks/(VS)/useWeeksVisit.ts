import { getVisitsToday, getWeeksVisit } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react"
import { Week } from "react-big-calendar";
import { DateRange } from "react-day-picker";

const WeeksVisit = ()=>{
   const [loading,setloading] = useState(false);
   const [isError,setIsError] = useState(false);
   const [error,setError] = useState("");
   const [visits,setVisits] = useState<any[]>([]);
   const [visitsToday,setVisitsToday] = useState<any[]>([]);

   const fetchVisits = async({days}:{days?:string})=>{
      try{
         setloading(true);
         setIsError(false);
         setError("");
         const response =await getWeeksVisit({days});
         setVisits(response.visits);
      }catch(err:any){
         const error = new Error(err);
         setIsError(true);
         setError(error.message);
      }finally{
         setloading(false);
      }
   }
   const fetchVisitsToday = async({days}:{days?:string})=>{
      try{
         setloading(true);
         setIsError(false);
         setError("");
         const response =await getVisitsToday({days});
         setVisitsToday(response.count);
      }catch(err:any){
         const error = new Error(err);
         setIsError(true);
         setError(error.message);
      }finally{
         setloading(false);
      }
   }
   useEffect(()=>{
      fetchVisits({days:"Today"});
      fetchVisitsToday({days:"Today"});
   },[])
   return {
      loading,
      isError,
      error,
      visits,
      fetchVisits,
      visitsToday,
      fetchVisitsToday,
   }

}
export default WeeksVisit;