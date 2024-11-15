import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		duration: {
			type: Number,
			required: true,
		},
		isPrivate: {
			type: Boolean,
			default: false,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Users",
		},
		bookings: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Bookings",
			},
		],
		price: {
			type: Number,
			default: 0,
		},
		discount: {
			type: Number,
			default: 0,
		},
	},
	{
		timestamps: true,
	}
);

export const EventModel = mongoose.model("Events", eventSchema);
