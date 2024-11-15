import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Users",
		},
		eventId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Events",
		},
		name: {
			type: String,
		},
		email: {
			type: String,
		},
		additionalInfo: {
			type: String,
		},
		startTime: {
			type: String,
		},
		endTime: {
			type: String,
		},
		meetingLink: {
			type: String,
		},
		googleEventId: {
			type: String,
		},
		title: {
			type: String,
		},
		date: {
			type: String,
		},
	},
	{
		timestamps: true,
	}
);

export const BookingModel = mongoose.model("Bookings", bookingSchema);
