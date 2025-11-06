import { getReviews } from "@/actions/(VS)/queryActions";
import { useEffect, useState } from "react";

const useReview = ()=>{
   const [reviews, setReviews] = useState<any[]>([]);
   const [revLoading,setRevLoading] = useState(false);
   const [revError,setRevError] = useState(false);
   const [revErr,setRevErr] = useState("");
   const fetchReviews = async({days,location,createdBy}:{days?:string;location?:string;createdBy?:string})=>{
      try{
         setRevLoading(true);
         setRevError(false);
         setRevErr("");
         const response = await getReviews({days,location,createdBy});
         setReviews(response.reviews);
      }catch(err:any){
         const error = new Error(err);
         setRevError(true);
         setRevErr(error.message);
      }finally{
         setRevLoading(false);
      }
   }
   useEffect(()=>{
      fetchReviews({days:"this month"});
   },[])
   return{
      reviews,
      revLoading,
      setRevLoading,
      revError,
      setRevError,
      revErr,
      setRevErr,
      fetchReviews
   }

}
export default useReview;