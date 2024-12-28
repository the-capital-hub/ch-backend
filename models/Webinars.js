import mongoose from "mongoose";

const webinarSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Users",
		},
		// Make it an object type field and add a default value
		webinarType: {
			type: String,
			enum: ["Public", "Private", "Pitch Day"],
			default: "Public",
		},
		// Conditional field for private webinars
		community: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Communities",
			required: function () {
				return this.webinarType === "Private";
			},
		},
		title: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		date: {
			type: Date,
			required: true,
		},
		startTime: {
			type: String,
			required: true,
		},
		endTime: {
			type: String,
			required: true,
		},
		duration: {
			type: Number,
			required: true,
		},
		link: {
			type: String,
			required: true,
		},
		googleWebinarId: {
			type: String,
			required: true,
		},
		// price related fields
		price: {
			type: Number,
			default: 0,
		},
		discount: {
			type: Number,
			default: 0,
		},
		// Make it an array of objects, set when the user joins the webinar
		joinedUsers: [
			{
				userId: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Users",
				},
				paymentStatus: {
					type: String,
					enum: ["Paid", "Failed", "Not Required", "Cancelled"],
					default: "Not Required",
				},
				paymentId: {
					type: String,
					default: null,
				},
				paymentAmount: {
					type: Number,
					default: 0,
				},
			},
		],
	},
	{ timestamps: true }
);

export const WebinarModel = mongoose.model("Webinars", webinarSchema);
