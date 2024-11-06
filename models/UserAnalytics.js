import mongoose, { Schema, model } from "mongoose";

const userAnalyticsSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "Users",
		},
		publicProfileViews: {
			type: Number,
			default: 0,
		},
		detailedProfileViews: {
			type: Number,
			default: 0,
		},
	},
	{
		timestamps: true,
	}
);

export const UserAnalyticsModel = model("UserAnalytics", userAnalyticsSchema);
