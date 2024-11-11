import { MongoClient } from "mongodb";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

async function watchRoomChanges() {
  try {
    const client = await MongoClient.connect(process.env.MONGO_DB_URL!);
    const db = client.db("rental-platform");
    const roomsCollection = db.collection("rooms");

    const changeStream = roomsCollection.watch();

    // Listen for change events
    changeStream.on("change", (change) => {
      console.log("Change detected in rooms collection:", change);

      if (change.operationType === "insert") {
        const newRoom = change.fullDocument;
        pusher.trigger(`room-${newRoom._id}`, "room-created", newRoom);
      } else if (change.operationType === "update") {
        const updatedRoomId = change.documentKey._id;
        pusher.trigger(`room-${updatedRoomId}`, "room-updated", {
          updatedRoomId,
          updateDescription: change.updateDescription,
        });
      } else if (change.operationType === "delete") {
        const deletedRoomId = change.documentKey._id;
        pusher.trigger(`room-${deletedRoomId}`, "room-deleted", {
          deletedRoomId,
        });
      }
    });

    console.log("Listening for changes in the rooms collection...");
  } catch (error) {
    console.error("Error setting up MongoDB change stream:", error);
  }
}

export default watchRoomChanges;
