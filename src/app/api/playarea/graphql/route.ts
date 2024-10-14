import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { gql } from "graphql-tag";
import Users from "@/models/user";
import { connectDb } from "@/util/db";

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    profilePic: String
    nationality: String
    gender: String!
    spokenLanguage: String
    bankDetails: String
    phone: String!
    myRequests: [String]
    myUpcommingRequests: [String]
    declinedRequests: [String]
    address: String
    role: String
    isVerified: Boolean
    createdAt: String
    updatedAt: String
  }

  type Query {
    hello: String
    users: [User!]!
    user(id: ID!): User
  }
`;
const resolvers = {
  Query: {
    hello: () => "Hello from GraphQL!",
    users: async () => {
      await connectDb();
      const users = await Users.find();

      return users.map((user) => {
        if (!user._id) {
          console.error("User without an ID found:", user);
          return {
            id: "N/A",
            name: user.name || "Unknown",
            email: user.email || "Unknown",
            phone: user.phone || "N/A",
            gender: user.gender || "N/A",
          };
        }
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone || "N/A",
          gender: user.gender,
        };
      });
    },
  },
};
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

export const POST = startServerAndCreateNextHandler(server);
