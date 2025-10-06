import { Properties } from "@/models/property";
import { quicklisting } from "@/models/quicklisting";
import Rooms from "@/models/room";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";

connectDb();

const pusher = new Pusher({
	appId: process.env.PUSHER_APP_ID!,
	key: process.env.PUSHER_KEY!,
	secret: process.env.PUSHER_SECRET!,
	cluster: process.env.PUSHER_CLUSTER!,
	useTLS: true,
});

export async function POST(req: NextRequest) {
	const { roomId, propertyId } = await req.json();


	let quickListing = false;

	try {
		let property = await Properties.findById(propertyId);

		if (!property) {
			quickListing = true;
			property = await quicklisting.findById(propertyId);
		}

		if (!property) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 }
			);
		}

		const Images = [
			property.propertyCoverFileUrl,
			...(property.pictures ? property.propertyPictures : []),
			...(property.propertyImages ? property.propertyImages : []),
		]
			.filter((item) => item != "")
			.slice(0, 5);

		const propertyObject = {
			_id: property._id,
			propertyImages: Images,
			VSID: property?.VSID ? property.VSID : "xxxx",
			QID: property?.QID ? property?.QID : "xxxx",
			price: property.basePrice,
			postalCode: property?.postalCode ? property?.postalCode : "xxxx",
			city: property?.city ? property?.city : "xxxx",
			state: property?.state ? property?.state : "xxxx",
			country: property?.country ? property?.country : "xxxx",
			isVisit: property?.isVisit ? property?.isVisit : false,
			isViewed: property?.isViewed ? property.isViewed : false,
			visitSchedule: property?.visitSchedule
				? property?.visitSchedule
				: "",
		};

		const room = await Rooms.findById(roomId);
		if (!room) {
			return NextResponse.json(
				{ error: "Room not found" },
				{ status: 404 }
			);
		}

		room.showcaseProperties = room.showcaseProperties.map(
			(property: any) => {
				if (property._id.toString() === propertyId) {
					return {
						...property,
						isViewed: true,
					};
				} else {
					return property;
				}
			}
		);

		await room.save();

		await pusher.trigger(`room-${roomId}`, "addedSeenToProperty", {
			data: propertyObject,
		});
		return NextResponse.json(
			{ message: "Added seen to property" },
			{ status: 201 }
		);
	} catch (err: any) {
		return NextResponse.json(
			{ error: "Unable to add Property in Room" },
			{ status: 400 }
		);
	}
}
