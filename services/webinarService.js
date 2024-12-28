import { WebinarModel } from "../models/Webinars.js";
import { UserModel } from "../models/User.js";
import { google } from "googleapis";
import { parse, isAfter, addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

const { OAuth2 } = google.auth;
const oAuth2Client = new OAuth2(
	process.env.GOOGLE_MEET_CLIENT_ID,
	process.env.GOOGLE_MEET_CLIENT_SECRET,
	"https://thecapitalhub.in/investor/onelink"
);

export const createWebinar = async (userId, data) => {
	try {
		const user = await UserModel.findOne({ _id: userId });
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}

		// Get the current time
		const currentTime = new Date();
		// Get the user's meeting token information
		let accessToken = user.meetingToken?.access_token;
		let refreshToken = user.meetingToken?.refresh_token;
		let expireIn = user.meetingToken?.expire_in;

		// console.log("Meeting Token", accessToken, refreshToken, expireIn);
		// If the access token is expired, use the refresh token to get a new access token
		if (expireIn && isAfter(currentTime, new Date(expireIn))) {
			const oAuth2Client = new google.auth.OAuth2(
				process.env.GOOGLE_CLIENT_ID,
				process.env.GOOGLE_CLIENT_SECRET,
				process.env.GOOGLE_REDIRECT_URI
			);

			oAuth2Client.setCredentials({ refresh_token: refreshToken });
			const { credentials } = await oAuth2Client.refreshAccessToken();
			accessToken = credentials.access_token;

			// Update the user's meeting token with the new access token and reset the expiration time
			const currentTime = new Date();
			const expireTime = addMinutes(currentTime, 50);
			const formattedExpireTime = formatInTimeZone(
				expireTime,
				"Asia/Kolkata",
				"yyyy-MM-dd'T'HH:mm:ss"
			);

			user.meetingToken.access_token = accessToken;
			user.meetingToken.expire_in = formattedExpireTime;
			await user.save();
		}

		// Set the credentials for the OAuth2 client
		oAuth2Client.setCredentials({ access_token: accessToken });

		// Create the webinar object for the Google Calendar API
		const webinarData = {
			summary: data.title,
			description: data.description,
			start: {
				dateTime: data.startTime,
				timeZone: "Asia/Kolkata",
			},
			end: {
				dateTime: data.endTime,
				timeZone: "Asia/Kolkata",
			},
			conferenceData: {
				createRequest: {
					requestId: Math.random().toString(36).substring(2, 12),
					conferenceSolutionKey: { type: "hangoutsMeet" },
				},
			},
		};

		// Create a Google Calendar API client
		const calendar = google.calendar({
			version: "v3",
			auth: oAuth2Client,
		});

		// Insert the event into the user's primary calendar
		const response = await calendar.events.insert({
			calendarId: "primary",
			requestBody: webinarData,
			conferenceDataVersion: 1,
		});
		// Check if the hangout link is available in the response
		const hangoutLink = response.data.hangoutLink;
		if (!hangoutLink) {
			console.error("Hangout link not found in response.");
		}
		const webinar = await WebinarModel.create({
			userId: user._id,
			link: hangoutLink,
			googleWebinarId: response.data.id,
			...data,
		});
		await UserModel.findByIdAndUpdate(user._id, {
			$push: { webinars: webinar._id },
		});
		return {
			status: 200,
			message: "Webinar created successfully",
			data: webinar,
		};
	} catch (error) {
		throw new Error(error.message);
	}
};

export const getWebinar = async (userId) => {
	try {
		const user = await UserModel.findOne({ _id: userId });
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}
		const webinars = await WebinarModel.find({ userId: user._id }).populate(
			"userId"
		);
		return {
			status: 200,
			message: "Webinars fetched successfully",
			data: webinars,
		};
	} catch (error) {
		throw new Error(error.message);
	}
};

export const getWebinarsByOnelink = async (onelinkId) => {
	try {
		const user = await UserModel.findOne({ oneLinkId: onelinkId });
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}
		console.log("userId in getWebinarsByOnelink", user._id);
		const webinars = (await WebinarModel.find({ userId: user._id })).filter(
			(webinar) => webinar.webinarType === "Pitch Day"
		);
		console.log("Pitch Day Webinars", webinars);
		return {
			status: 200,
			message: "Webinars fetched successfully",
			data: webinars,
		};
	} catch (error) {
		throw new Error(error.message);
	}
};

export const deleteWebinar = async (userId, webinarId) => {
	try {
		const user = await UserModel.findOne({ _id: userId });
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		// Check if user has meeting token and if it is expired or not
		const currentTime = new Date();
		let accessToken = user.meetingToken?.access_token;
		let refreshToken = user.meetingToken?.refresh_token;
		let expireIn = user.meetingToken?.expire_in;

		if (expireIn && isAfter(currentTime, new Date(expireIn))) {
			// Token is expired, use refresh token to get a new access token
			const oAuth2Client = new google.auth.OAuth2(
				process.env.GOOGLE_CLIENT_ID,
				process.env.GOOGLE_CLIENT_SECRET,
				process.env.GOOGLE_REDIRECT_URI
			);

			oAuth2Client.setCredentials({ refresh_token: refreshToken });

			const { credentials } = await oAuth2Client.refreshAccessToken();
			accessToken = credentials.access_token;

			// Get the current time in the specified time zone
			const expireTime = addMinutes(currentTime, 50); // Add 50 minutes to current time

			// Format the expiration time in the desired time zone (Asia/Kolkata)
			const formattedExpireTime = formatInTimeZone(
				expireTime,
				"Asia/Kolkata",
				"yyyy-MM-dd'T'HH:mm:ss" // Format without offset
			);

			// Update the user's meeting token with the new access token and reset the expiration time
			user.meetingToken.access_token = accessToken;
			user.meetingToken.expire_in = formattedExpireTime; // Store the formatted expiration time
			await user.save();
		}

		// Set the credentials for the OAuth2 client
		oAuth2Client.setCredentials({ access_token: accessToken });
		const webinar = await WebinarModel.findOne({
			_id: webinarId,
			userId: user._id,
		});

		if (!webinar) {
			return {
				status: 404,
				message: "Webinar not found",
			};
		}

		// Cancel the webinar in Google Calendar
		const calendar = google.calendar({
			version: "v3",
			auth: oAuth2Client,
		});

		await calendar.events.delete({
			calendarId: "primary",
			eventId: webinar.googleWebinarId,
		});

		// Delete the meeting from the database
		// await UserModel.findByIdAndUpdate(user._id, {
		// 	$pull: { webinars: webinar._id },
		// });

		const webinarResponse = await WebinarModel.findOneAndDelete({
			_id: webinarId,
			userId: user._id,
		});
		return {
			status: 200,
			message: "Webinar deleted successfully",
			data: webinarResponse,
		};
	} catch (error) {
		throw new Error(error.message);
	}
};
