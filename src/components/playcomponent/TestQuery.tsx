"use client";
import { gql, useQuery } from "@apollo/client";
import Loader from "../loader";

const GET_USERS_QUERY = gql`
  query {
    users {
      id
      name
      email
      phone
      gender
    }
  }
`;
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
}
export default function TestQuery() {
  const { loading, error, data } = useQuery(GET_USERS_QUERY, {
    fetchPolicy: "cache-first", 
  });

  if (loading)
    return (
      <div>
        <Loader />
      </div>
    );
  if (error) return <p>Error: {error.message}</p>;

  console.log(data, "Data will print here");

  return (
    <div>
      <h2>User List</h2>
      <ul>
        {data?.users?.map((user: User) => (
          <li key={user.id}>
            <p>Name: {user.name}</p>
            <p>Email: {user.email}</p>
            <p>Phone: {user.phone}</p>
            <p>Gender{user.gender}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
