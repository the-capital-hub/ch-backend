import { AvailabilityModel } from "../models/Availability.js";
import { UserModel } from "../models/User.js";
import { EventModel } from "../models/Event.js";
import { BookingModel } from "../models/Bookings.js";
import { formatInTimeZone } from "date-fns-tz";
import { parse, isAfter, addMinutes } from "date-fns";
import { google } from "googleapis";

const { OAuth2 } = google.auth;
const oAuth2Client = new OAuth2(
	process.env.GOOGLE_MEET_CLIENT_ID,
	process.env.GOOGLE_MEET_CLIENT_SECRET,
	"https://thecapitalhub.in/investor/onelink"
);

export const updateAvailability = async (userId, data) => {
	console.log(userId);
	console.log(data);
	try {
		const user = await UserModel.findOne({ _id: userId });
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}
		console.log(user);

		// Convert day names to lowercase to match the schema
		const normalizedDayAvailability = data.dayAvailability.map((day) => ({
			day: day.day.toLowerCase(), // Normalize to lowercase
			startTime: day.start, // Change to match schema
			endTime: day.end, // Change to match schema
			enabled: day.enabled,
		}));

		const response = await AvailabilityModel.findOneAndUpdate(
			{ userId: user._id }, // Ensure you're querying with userId
			{
				$set: {
					userId: user._id,
					dayAvailability: normalizedDayAvailability,
					minimumGap: parseInt(data.minGap, 10), // Change to match schema
				},
			},
			{ upsert: true, new: true }
		);
		return {
			status: 200,
			message: "Availability updated successfully",
			data: response,
		};
	} catch (error) {
		console.error("Error updating availability:", error);
		return {
			status: 500,
			message: "An error occurred while updating availability.",
		};
	}
};

export const createEvent = async (userId, data) => {
	try {
		const user = await UserModel.findOne({ _id: userId });
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}

		const response = await EventModel.create({
			userId: user._id,
			title: data.title,
			description: data.description,
			duration: data.duration,
			isPrivate: data.isPrivate,
		});

		await UserModel.findByIdAndUpdate(user._id, {
			$push: { eventId: response._id },
		});

		console.log(response);

		if (!response) {
			return {
				status: 500,
				message: "An error occurred while creating event.",
			};
		}

		return {
			status: 200,
			message: "Event created successfully",
			data: response.data,
		};
	} catch (error) {
		console.error("Error creating event:", error);
		return {
			status: 500,
			message: "An error occurred while creating event.",
		};
	}
};

export const getEvents = async (userId) => {
	try {
		const user = await UserModel.findOne({ _id: userId });
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}

		const response = await EventModel.find({ userId: user._id });

		if (!response) {
			return {
				status: 500,
				message: "An error occurred while getting events.",
			};
		}

		return {
			status: 200,
			message: "Events retrieved successfully",
			data: response,
		};
	} catch (error) {
		console.error("Error getting events:", error);
		return {
			status: 500,
			message: "An error occurred while getting events.",
		};
	}
};

export const deleteEvent = async (userId, eventId) => {
	try {
		const user = await UserModel.findOne({ _id: userId });
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}
		await UserModel.findByIdAndUpdate(user._id, {
			$pull: { eventId: eventId },
		});

		const response = await EventModel.findOneAndDelete({
			userId: user._id,
			_id: eventId,
		});

		if (!response) {
			return {
				status: 500,
				message: "An error occurred while deleting event.",
			};
		}

		return {
			status: 200,
			message: "Event deleted successfully",
			data: response,
		};
	} catch (error) {
		console.error("Error deleting event:", error);
		return {
			status: 500,
			message: "An error occurred while deleting event.",
		};
	}
};

// Unauthenticated route for scheduling meetings
export const getSchedulePageData = async (username, eventId) => {
	try {
		// Find the user by username
		const user = await UserModel.findOne({ userName: username });

		// Check if user was found
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}

		// Find the user's availability
		const availability = await AvailabilityModel.findOne({ userId: user._id });

		// Check if availability was found
		if (!availability) {
			return {
				status: 404,
				message: "Availability not found for the user",
			};
		}

		// Find events associated with the user
		const events = await EventModel.find({ _id: eventId, userId: user._id });

		// Check if events were found
		if (!events || events.length === 0) {
			return {
				status: 404,
				message: "No events found for the user",
			};
		}

		// Return the gathered data
		return {
			status: 200,
			message: "Schedule page data retrieved successfully",
			data: {
				user: user,
				availability: availability,
				events: events,
			},
		};
	} catch (error) {
		console.error("Error getting schedule page data:", error);
		return {
			status: 500,
			message: "An error occurred while getting schedule page data.",
		};
	}
};

// Unauthenticated route for scheduling meetings
export const scheduleMeeting = async (data) => {
	try {
		// Fetch the event data from the database
		const eventData = await EventModel.find({ _id: data.eventId });
		// Fetch the user data from the database
		const user = await UserModel.findOne({ userName: data.username });

		// Get the current time
		const currentTime = new Date();
		// Get the user's meeting token information
		let accessToken = user.meetingToken?.access_token;
		let refreshToken = user.meetingToken?.refresh_token;
		let expireIn = user.meetingToken?.expire_in;

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

		// Get the current year
		const currentYear = new Date().getFullYear();

		// Helper function to create a full date string
		const createFullDateString = (dateString, timeString) => {
			return `${dateString} ${currentYear} ${timeString}`;
		};

		// Create full date strings for the start and end times
		const startDateFull = createFullDateString(data.date, data.startTime);
		const endDateFull = createFullDateString(data.date, data.endTime);

		// Parse the start and end date/time strings
		const parsedStartDate = parse(
			startDateFull,
			"MMMM dd yyyy HH:mm",
			new Date()
		);
		const parsedEndDate = parse(endDateFull, "MMMM dd yyyy HH:mm", new Date());

		// Format the start and end dates in the desired time zone
		const startDate = formatInTimeZone(
			parsedStartDate,
			"Asia/Kolkata",
			"yyyy-MM-dd'T'HH:mm:ss"
		);
		const endDate = formatInTimeZone(
			parsedEndDate,
			"Asia/Kolkata",
			"yyyy-MM-dd'T'HH:mm:ss"
		);

		// Create the event object for the Google Calendar API
		const event = {
			summary: eventData[0].title,
			description: data.additionalInfo,
			start: {
				dateTime: startDate,
				timeZone: "Asia/Kolkata",
			},
			end: {
				dateTime: endDate,
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
			requestBody: event,
			conferenceDataVersion: 1,
		});

		// Check if the hangout link is available in the response
		const hangoutLink = response.data.hangoutLink;
		if (!hangoutLink) {
			console.error("Hangout link not found in response.");
		}

		// Create a new meeting booking in the database
		const meeting = await BookingModel.create({
			userId: user._id,
			name: data.name,
			email: data.email,
			eventId: data.eventId,
			start: startDate,
			end: endDate,
			additionalInfo: data.additionalInfo,
			meetingLink: hangoutLink,
			googleEventId: response.data.id,
			title: eventData[0].title,
			date: data.date,
		});

		// Update the event model to include the new meeting ID in the bookings array
		await EventModel.findByIdAndUpdate(data.eventId, {
			$push: { bookings: meeting._id },
		});

		// Return the successful response
		return {
			status: 200,
			message: "Meeting scheduled successfully",
			data: meeting,
		};
	} catch (error) {
		console.error("Error scheduling meeting:", error);
		// Return an error response
		return {
			status: 500,
			message: "An error occurred while scheduling the meeting.",
		};
	}
};

// export const scheduleMeeting = async (data) => {
// 	try {
// 		const eventData = await EventModel.find({ _id: data.eventId });
// 		const user = await UserModel.findOne({ userName: data.username });
// 		// if (!user) {
// 		// 	return {
// 		// 		status: 404,
// 		// 		message: "User  not found",
// 		// 	};
// 		// }
// 		// Check if user has meeting token and if it is expired or not
// 		const currentTime = new Date();
// 		let accessToken = user.meetingToken?.access_token;
// 		let refreshToken = user.meetingToken?.refresh_token;
// 		let expireIn = user.meetingToken?.expire_in;

// 		if (expireIn && isAfter(currentTime, new Date(expireIn))) {
// 			// Token is expired, use refresh token to get a new access token
// 			const oAuth2Client = new google.auth.OAuth2(
// 				process.env.GOOGLE_CLIENT_ID,
// 				process.env.GOOGLE_CLIENT_SECRET,
// 				process.env.GOOGLE_REDIRECT_URI
// 			);

// 			oAuth2Client.setCredentials({ refresh_token: refreshToken });

// 			const { credentials } = await oAuth2Client.refreshAccessToken();
// 			accessToken = credentials.access_token;

// 			// Get the current time in the specified time zone
// 			const currentTime = new Date();
// 			const expireTime = addMinutes(currentTime, 50); // Add 50 minutes to current time

// 			// Format the expiration time in the desired time zone (Asia/Kolkata)
// 			const formattedExpireTime = formatInTimeZone(
// 				expireTime,
// 				"Asia/Kolkata",
// 				"yyyy-MM-dd'T'HH:mm:ss" // Format without offset
// 			);

// 			// Update the user's meeting token with the new access token and reset the expiration time
// 			user.meetingToken.access_token = accessToken;
// 			user.meetingToken.expire_in = formattedExpireTime;
// 			await user.save();
// 		}
// 		//  else if (!accessToken) {
// 		// 	return {
// 		// 		status: 401,
// 		// 		message: "No valid access token available.",
// 		// 	};
// 		// }

// 		// Set the credentials for the OAuth2 client
// 		oAuth2Client.setCredentials({ access_token: accessToken });
// 		console.log("Data from meeting service:", data);

// 		const currentYear = new Date().getFullYear();

// 		// Create a full date string
// 		const createFullDateString = (dateString, timeString) => {
// 			return `${dateString} ${currentYear} ${timeString}`;
// 		};

// 		// Parse the date
// 		const startDateFull = createFullDateString(data.date, data.startTime);
// 		const endDateFull = createFullDateString(data.date, data.endTime);

// 		// Use the correct format for parsing
// 		const parsedStartDate = parse(
// 			startDateFull,
// 			"MMMM dd yyyy HH:mm",
// 			new Date()
// 		);
// 		const parsedEndDate = parse(endDateFull, "MMMM dd yyyy HH:mm", new Date());

// 		const startDate = formatInTimeZone(
// 			parsedStartDate,
// 			"Asia/Kolkata",
// 			"yyyy-MM-dd'T'HH:mm:ss" // No offset
// 		);
// 		const endDate = formatInTimeZone(
// 			parsedEndDate,
// 			"Asia/Kolkata",
// 			"yyyy-MM-dd'T'HH:mm:ss" // No offset
// 		);

// 		console.log("Start Date:", startDate);
// 		console.log("End Date:", endDate);

// 		const event = {
// 			summary: eventData[0].title,
// 			description: data.additionalInfo,
// 			start: {
// 				dateTime: startDate,
// 				timeZone: "Asia/Kolkata",
// 			},
// 			end: {
// 				dateTime: endDate,
// 				timeZone: "Asia/Kolkata",
// 			},
// 			conferenceData: {
// 				createRequest: {
// 					requestId: Math.random().toString(36).substring(2, 12),
// 					conferenceSolutionKey: { type: "hangoutsMeet" },
// 				},
// 			},
// 		};

// 		const calendar = google.calendar({
// 			version: "v3",
// 			auth: oAuth2Client,
// 		});

// 		const response = await calendar.events.insert({
// 			calendarId: "primary",
// 			requestBody: event,
// 			conferenceDataVersion: 1,
// 		});

// 		// if (response.status === 401) {
// 		// 	return {
// 		// 		status: 401,
// 		// 		message: " Unathrized!, Please syn with Google",
// 		// 	};
// 		// }
// 		// console.log("status", response.status); // Log the response data for debugging
// 		// console.log("eventData", eventData);
// 		// console.log("title", eventData[0].title);

// 		// Check if hangoutLink exists in the response
// 		const hangoutLink = response.data.hangoutLink;
// 		// console.log("hangoutLink", hangoutLink);
// 		if (!hangoutLink) {
// 			console.error("Hangout link not found in response.");
// 			// Handle the case where the hangout link is not available
// 			// You might want to throw an error or set a default value
// 		}

// 		const meeting = await BookingModel.create({
// 			userId: user._id,
// 			name: data.name,
// 			email: data.email,
// 			eventId: data.eventId,
// 			start: startDate,
// 			end: endDate,
// 			additionalInfo: data.additionalInfo,
// 			meetingLink: hangoutLink,
// 			googleEventId: response.data.id,
// 			title: eventData[0].title,
// 			date: data.date,
// 		});

// 		// Update the EventModel to include the new meeting._id in the bookings array
// 		await EventModel.findByIdAndUpdate(data.eventId, {
// 			$push: { bookings: meeting._id }, // Push the new meeting ID into the bookings array
// 		});

// 		console.log("meeting", meeting);

// 		return {
// 			status: 200,
// 			message: "Meeting scheduled successfully",
// 			data: meeting,
// 		};
// 	} catch (error) {
// 		console.error("Error scheduling meeting:", error);
// 		// Check if the error is a GaxiosError and if it has a response with status 401
// 		// if (error.response && error.response.status === 401) {
// 		// 	return {
// 		// 		status: 401,
// 		// 		message: "Unauthorized! Please sync with Google.",
// 		// 	};
// 		// }
// 		return {
// 			status: 500,
// 			message: "An error occurred while scheduling the meeting.",
// 		};
// 	}
// };

export const cancelSheduledMeeting = async (userId, meetingId) => {
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

		const meeting = await BookingModel.findOne({
			_id: meetingId,
			userId: user._id,
		});
		const event = await EventModel.findOne({
			userId: user._id,
			bookings: meetingId,
		});
		if (!meeting) {
			return {
				status: 404,
				message: "Meeting not found",
			};
		}

		// Cancel the meeting in Google Calendar
		const calendar = google.calendar({
			version: "v3",
			auth: oAuth2Client,
		});

		await calendar.events.delete({
			calendarId: "primary",
			eventId: meeting.googleEventId,
		});

		// Delete the meeting from the database
		await EventModel.findByIdAndUpdate(event._id, {
			$pull: { bookings: meetingId },
		});
		const response = await BookingModel.findOneAndDelete({
			_id: meetingId,
			userId: user._id,
		});

		return {
			status: 200,
			message: "Scheduled meeting deleted successfully",
			data: response,
		};
	} catch (error) {
		console.error("Error cancelling scheduled meeting:", error);
		return {
			status: 500,
			message: "An error occurred while cancelling scheduled meeting.",
		};
	}
};

// export const cancelSheduledMeeting = async (userId, meetingId) => {
// 	try {
// 		const user = await UserModel.findOne({ _id: userId });
// 		oAuth2Client.setCredentials(user.meetingToken);
// 		const meeting = await BookingModel.findOne({
// 			_id: meetingId,
// 			userId: user._id,
// 		});
// 		const event = await EventModel.findOne({
// 			userId: user._id,
// 			bookings: meetingId,
// 		});
// 		if (!user || !meeting) {
// 			return {
// 				status: 404,
// 				message: "User or meeting not found",
// 			};
// 		}
// 		// Cancel the meeting in Google Calendar
// 		const calendar = google.calendar({
// 			version: "v3",
// 			auth: oAuth2Client,
// 		});

// 		await calendar.events.delete({
// 			calendarId: "primary",
// 			eventId: meeting.googleEventId,
// 		});

// 		// Delete the meeting from the database
// 		await EventModel.findByIdAndUpdate(event[0]._id, {
// 			$pull: { bookings: meetingId },
// 		});
// 		const response = await BookingModel.findOneAndDelete({
// 			_id: meetingId,
// 			userId: user._id,
// 		});

// 		return {
// 			status: 200,
// 			message: "scheduled meeting deleted successfully",
// 			data: response,
// 		};
// 	} catch (error) {
// 		console.error("Error cancelling scheduled meeting:", error);
// 		return {
// 			status: 500,
// 			message: "An error occurred while cancelling scheduled meeting.",
// 		};
// 	}
// };

export const getAllSheduledMeeting = async (userId) => {
	try {
		const user = await UserModel.findOne({ _id: userId });
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}
		// console.log("userId", user._id);
		const response = await BookingModel.find({ userId: user._id })
			.populate("userId")
			.populate("eventId");

		// console.log("meetings", response);

		return {
			status: 200,
			message: "Scheduled meetings retrieved successfully",
			data: response,
		};
	} catch (error) {
		console.error("Error getting scheduled meetings:", error);
		return {
			status: 500,
			message: "An error occurred while getting scheduled meetings.",
		};
	}
};

export const getEventsByUsername = async (username) => {
	try {
		const user = await UserModel.findOne({ userName: username });
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}
		const response = await EventModel.find({ userId: user._id });
		return {
			status: 200,
			message: "Events retrieved successfully",
			data: response,
		};
	} catch (error) {
		console.error("Error getting events by username:", error);
		return {
			status: 500,
			message: "An error occurred while getting events by username.",
		};
	}
};
