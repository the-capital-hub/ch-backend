import mongoose from "mongoose";

const thoughtSchema = new mongoose.Schema(
	{
		question: {
			type: String,
			required: true,
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Users",
		},
		industry: {
			type: String,
		},
		upvotes: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Users",
			},
		],
		answer: [
			{
				answer: {
					type: String,
				},
				user: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Users",
				},
				likes: [
					{
						type: mongoose.Schema.Types.ObjectId,
						ref: "Users",
					},
				],
				comments: [
					{
						comment: {
							type: String,
						},
						user: {
							type: mongoose.Schema.Types.ObjectId,
							ref: "Users",
						},
						likes: [
							{
								type: mongoose.Schema.Types.ObjectId,
								ref: "Users",
							},
						],
					},
				],
			},
		],
	},
	{
		timestamps: true,
	}
);

export const ThoughtModel = mongoose.model("Thoughts", thoughtSchema);
