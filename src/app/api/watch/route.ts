// pages/api/watchChanges.ts
import { MongoClient } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";

const watchChanges = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const client = await MongoClient.connect(process.env.MONGO_DB_URL!);
    const db = client.db();
    const collection = db.collection("rooms"); // Replace with your collection name

    // Create a change stream to listen for all changes
    const changeStream = collection.watch(); // Optional filter to match specific changes (e.g., $match)

    res.setHeader("Content-Type", "application/json");
    res.status(200);

    // Stream changes to the client
    changeStream.on("change", (change) => {
      // Send the change as a stream to the client
      res.write(JSON.stringify(change) + "\n");
    });

    // Cleanup when the connection is closed
    req.on("close", () => {
      changeStream.close();
    });
  } catch (error) {
    console.error("Error in change stream:", error);
    res.status(500).json({ error: "Error watching collection" });
  }
};

export default watchChanges;
