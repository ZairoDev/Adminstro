"use server";

import { connectDb } from "@/util/db";
import { Owners } from "@/models/owner";

connectDb();

export const addDisposition = async (id: string, disposition: string) => {
  try {
    await Owners.findOneAndUpdate({ _id: id }, { $set: { disposition } });
    console.log("Disposition updated successfully");
  } catch (error) {
    console.error("Error updating disposition:", error);
  }
};

export const addEmail = async (id: string, email: string) => {
  try {
    await Owners.findByIdAndUpdate({ _id: id }, { $set: { email } });
    console.log("Email updated successfully");
  } catch (error) {
    console.error("Error updating email:", error);
  }
};

export const addNote = async (id: string, note: string) => {
  try {
    await Owners.findByIdAndUpdate({ _id: id }, { $set: { note } });
    console.log("Note updated successfully");
  } catch (error) {
    console.error("Error updating note:", error);
  }
};
