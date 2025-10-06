"use server";

import { connectDb } from "@/util/db";
import { Owners } from "@/models/owner";
import { OwnerInterface } from "@/util/type";

connectDb();

export const addDisposition = async (id: string, disposition: string) => {
  try {
    await Owners.findOneAndUpdate({ _id: id }, { $set: { disposition } });
    // console.log("Disposition updated successfully");
  } catch (error) {
    console.error("Error updating disposition:", error);
  }
};

export const addEmail = async (id: string, email: string) => {
  try {
    await Owners.findByIdAndUpdate({ _id: id }, { $set: { email } });
    // console.log("Email updated successfully");
  } catch (error) {
    console.error("Error updating email:", error);
  }
};

export const addNote = async (id: string, note: string) => {
  // console.log("note in addNote: ", note);
  try {
    await Owners.findByIdAndUpdate({ _id: id }, { $set: { note } });
    // console.log("Note updated successfully");
  } catch (error) {
    console.error("Error updating note:", error);
  }
};

export const addCallback = async (id: string, callback: string) => {
  try {
    await Owners.findByIdAndUpdate({ _id: id }, { $set: { callback } });
    // console.log("Callback updated successfully");
  } catch (error) {
    console.error("Error updating callback:", error);
  }
};

export const editOwnerDetails = async (id: string, data: OwnerInterface) => {
  try {
    await Owners.findByIdAndUpdate({ _id: id }, { $set: { ...data } });
    // console.log("Owner details updated successfully");
  } catch (error) {
    console.error("Error updating owner details:", error);
  }
};
