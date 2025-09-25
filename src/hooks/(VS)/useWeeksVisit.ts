import { getGoodVisitsCount, getUnregisteredOwners, getVisitsToday, getWeeksVisit, OwnersCount } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react"
import { Week } from "react-big-calendar";
import { DateRange } from "react-day-picker";

interface VisitInterface {
   _id: string;
   propertyShown: number;
   count: number;
}

interface GoodVisitsInterface {
   _id: string;
   propertyShown: number;
   count: number;
}

interface UnregisteredOwnersInterface {
  ownerName: string;
  ownerPhone: string;
}

interface CityData {
  city: string;
  registeredCount: number;
  unregisteredCount: number;

  // extra breakdown for unregistered
  unregisteredWithImages: number;
  unregisteredWithReferenceLink: number;
  unregisteredWithBoth: number;
  unregisteredWithNone: number;
}

interface TotalsData {
  totalRegistered: number;
  totalUnregistered: number;

  // extra breakdown for unregistered
  totalUnregisteredWithImages: number;
  totalUnregisteredWithReferenceLink: number;
  totalUnregisteredWithBoth: number;
  totalUnregisteredWithNone: number;
}

export interface RegistrationData {
  byCity: CityData[];
  totals: TotalsData[];
}
 

const WeeksVisit = ()=>{
   const [loading,setloading] = useState(false);
   const [isError,setIsError] = useState(false);
   const [error,setError] = useState("");
   const [visits,setVisits] = useState<any[]>([]);
   const [goodVisits1, setGoodVisits] = useState<GoodVisitsInterface[]>([]);
   const [visitsToday,setVisitsToday] = useState<any[]>([]);
   const [unregisteredOwners,setUnregisteredOwners] = useState<UnregisteredOwnersInterface[]>([]);
   const [ownersCount, setOwnersCount] = useState<RegistrationData>({
     byCity: [],
     totals: [
       {
         totalRegistered: 0,
         totalUnregistered: 0,
         totalUnregisteredWithImages: 0,
         totalUnregisteredWithReferenceLink: 0,
         totalUnregisteredWithBoth: 0,
         totalUnregisteredWithNone: 0,
       },
     ],
   });

   const goodVisits:{[key:string]:number} = {
     total: 0,
     "0": 0,
     "1": 0,
     "2": 0,
     "3": 0,
     "4": 0,
     "5+": 0,
   };

goodVisits1.forEach(item=>{
   const shown = typeof item.propertyShown === 'number'? item.propertyShown : 0;
   const count = item.count || 0;
   goodVisits.total += count;

   if (shown >= 5) {
     goodVisits["5+"] += count;
   } else {
      const key:string = shown.toString();
     goodVisits[key] += count;
   }
})


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

   const fetchGoodVisitsCount = async({days}:{days?:string})=>{
      try{
         setloading(true);
         setIsError(false);
         setError("");
         const response =await getGoodVisitsCount({days});
         setGoodVisits(response.count);
      }catch(err:any){
         const error = new Error(err);
         setIsError(true);
         setError(error.message);
      }
      finally{
         setloading(false);
      }
   }
   const fetchUnregisteredVisits = async () => {
     try {
       setloading(true);
       setIsError(false);
       setError("");

       const [response, responseCount] = await Promise.all([
         getUnregisteredOwners(),
         OwnersCount(),
       ]);

       setUnregisteredOwners(response.unregisteredOwners || []);
       setOwnersCount(responseCount);
     } catch (err: any) {
       console.error(err);
       setIsError(true);
       setError(err instanceof Error ? err.message : String(err));
     } finally {
       setloading(false);
     }
   };
    
   useEffect(()=>{
      fetchVisits({days:"Today"});
      fetchVisitsToday({days:"Today"});
      fetchGoodVisitsCount({days:"Today"});
      fetchUnregisteredVisits();
   },[])
   return {
      loading,
      setloading,
      isError,
      error,
      visits,
      fetchVisits,
      visitsToday,
      fetchVisitsToday,
      goodVisits,
      fetchGoodVisitsCount,
      unregisteredOwners,
      fetchUnregisteredVisits
      ,ownersCount
   }

}
export default WeeksVisit;