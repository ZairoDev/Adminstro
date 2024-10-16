"use client";
import React, { useEffect, useState } from "react";
import Pusher from "pusher-js";
interface IQuery {
  name: string;
  email: string;
  price: string;
  intrest: string;
  about: string;
}
const SalesDashboard = () => {
  const [queries, setQueries] = useState<IQuery[]>([]);
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    const channel = pusher.subscribe("queries");
    channel.bind("new-query", (data: any) => {
      setQueries((prevQueries) => [...prevQueries, data]);
    });
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  return (
    <div>
      <h1>Sales Dashboard</h1>
      {queries.map((query, index) => (
        <div key={index} className="p-4 border">
          <h2>{query?.name}</h2>
          <p>Email: {query?.email}</p>
          <p>Price: {query?.price}</p>
          <p>Intrest: {query?.intrest}</p>
          <p>About: {query?.about}</p>
        </div>
      ))}
    </div>
  );
};

export default SalesDashboard;
