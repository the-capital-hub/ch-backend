import { ScheduleModel } from "../models/Schedule.js";
import { UserModel } from "../models/User.js";
import { cloudinary } from "../utils/uploadImage.js";
import { google } from "googleapis";
import { addNotification, deleteNotification } from "./notificationService.js";

const { OAuth2 } = google.auth;
const CLIENT_ID = process.env.GOOGLE_MEET_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_MEET_CLIENT_SECRET;
const REDIRECT_URI = "https://thecapitalhub.in/investor/onelink"; // Update to match your authorized redirect URI

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const TOKEN_PATH = "token.json";
const oAuth2Client = new OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

export const createMeetingLink = async () => {
	try {
		const authUrl = oAuth2Client.generateAuthUrl({
			access_type: "offline",
			scope: SCOPES,
			prompt: "consent",
		});
		return {
			status: 200,
			message: "Meeting Auth url",
			data: authUrl,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while creating a meeting.",
		};
	}
};

export const validateAuth = async (code, userId) => {
	try {
		if (!code) {
			return res.send("No code provided");
		}

		const { tokens } = await oAuth2Client.getToken(code); // Await the token retrieval
		await UserModel.findOneAndUpdate({ _id: userId }, { meetingToken: tokens });
		oAuth2Client.setCredentials(tokens);
		const user = await UserModel.findOne({
			_id: userId,
		}).populate({
			path: "startUp",
			select: "company logo",
		});
		//fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens)); // Storing tokens in file
		return {
			status: 200,
			message: "Meeting Created",
			data: user,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while creating a meeting.",
		};
	}
};
export const createMeeting = async (userId, meetingData) => {
	try {
		const user = await UserModel.findOne({ _id: userId });
		oAuth2Client.setCredentials(user.meetingToken);
		const startDate = new Date(meetingData.start);
		const endDate = new Date(meetingData.end);
		const { _id } = await UserModel.findOne({
			oneLinkId: meetingData.oneLinkId,
		});

		const existingMeeting = await ScheduleModel.findOne({
			requesterId: userId,
			$or: [
				{
					$and: [{ start: { $lte: startDate } }, { end: { $gt: startDate } }],
				},
				{
					$and: [{ start: { $lt: endDate } }, { end: { $gte: endDate } }],
				},
				{
					$and: [{ start: { $gte: startDate } }, { end: { $lte: endDate } }],
				},
			],
		});

		if (existingMeeting) {
			return {
				status: 409,
				message: "Time is overlapping with existing meeting .",
				data: existingMeeting,
			};
		}
		const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
		const event = {
			summary: meetingData.title,
			description: meetingData.agenda,
			start: {
				dateTime: new Date(startDate).toISOString(),
				timeZone: "Asia/Kolkata",
			},
			end: {
				dateTime: new Date(endDate).toISOString(),
				timeZone: "Asia/Kolkata",
			},
			conferenceData: {
				createRequest: {
					requestId: Math.random().toString(36).substring(2, 12),
					conferenceSolutionKey: {
						type: "hangoutsMeet",
					},
				},
			},
		};
		let doc = "";
		if (meetingData?.doc) {
			const { secure_url } = await cloudinary.uploader.upload(
				meetingData?.doc,
				{
					folder: `${process.env.CLOUDIANRY_FOLDER}/schedule/doc`,
					format: "pdf",
					unique_filename: true,
				}
			);
			doc = secure_url;
		}
		const response = await calendar.events.insert({
			calendarId: "primary",
			requestBody: event,
			conferenceDataVersion: 1,
		});

		const meeting = new ScheduleModel({
			userId: _id,
			requesterId: userId,
			doc,
			agenda: meetingData.agenda,
			title: meetingData.title,
			start: response.data.start.dateTime,
			end: response.data.end.dateTime,
			meetingLink: response.data.hangoutLink,
		});
		await meeting.save();

		return {
			status: 200,
			message: "Meeting Created",
			data: meeting,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while creating a meeting.",
		};
	}
};

export const getAllMeetings = async (oneLinkId) => {
	try {
		const user = await UserModel.findOne({ oneLinkId });

		if (!user) {
			return {
				status: 404,
				message: "User not found with the provided oneLinkId.",
			};
		}

		const meetingsFrom = await ScheduleModel.find({ userId: user._id });
		const meetingsTo = await ScheduleModel.find({ requesterId: user._id });
		return {
			status: 200,
			message: "Meetings retrieved successfully",
			data: [...meetingsFrom, ...meetingsTo],
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while retrieving meetings.",
		};
	}
};

export const requestBookingSlotById = async (meetingId, requestData) => {
	try {
		const meeting = await ScheduleModel.findById(meetingId);
		if (!meeting) {
			return {
				status: 404,
				message: "Meeting not found with the provided ID.",
			};
		}
		if (meeting.bookedBy && meeting.bookedBy.name) {
			return {
				status: 400,
				message: "Meeting is already booked.",
			};
		}

		requestData.start = meeting.start;
		requestData.end = meeting.end;
		meeting.requestedBy.push(requestData);
		await meeting.save();
		const type = "meetingRequest";
		await addNotification(meeting.userId, null, type, null, null, meeting._id);
		return {
			status: 200,
			message: "Booking request added successfully",
			data: meeting,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while adding the booking request.",
		};
	}
};

export const deleteMeeting = async (meetingId, userId) => {
	try {
		const meeting = await ScheduleModel.findOneAndDelete({
			_id: meetingId,
			userId: userId,
		});
		const type = "meetingRequest";
		deleteNotification(meeting.userId, null, type, meetingId);
		if (!meeting) {
			return {
				status: 404,
				message: "Meeting not found with the provided ID.",
			};
		}

		return {
			status: 200,
			message: "Meeting deleted successfully",
			data: meeting,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while deleting the meeting.",
		};
	}
};

export const acceptRequestById = async (meetingId, requestId) => {
	try {
		const meeting = await ScheduleModel.findById(meetingId);
		if (!meeting) {
			return {
				status: 404,
				message: "Meeting not found with the provided ID.",
			};
		}
		const type = "meetingRequest";
		deleteNotification(meeting.userId, null, type, meetingId);
		const requestToAccept = meeting.requestedBy.find(
			(request) => request._id.toString() === requestId
		);
		if (!requestToAccept) {
			return {
				status: 404,
				message: "Request not found with the provided ID for this meeting.",
			};
		}
		meeting.requestedBy = [];
		meeting.bookedBy = {
			name: requestToAccept.name,
			companyName: requestToAccept.companyName,
			email: requestToAccept.email,
			phone: requestToAccept.phone,
			description: requestToAccept.description,
			oneLink: requestToAccept.oneLink,
			start: requestToAccept.start,
			end: requestToAccept.end,
		};
		await meeting.save();
		return {
			status: 200,
			message: "Request accepted successfully",
			data: meeting,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while accepting the request.",
		};
	}
};

export const getAllRequestedByForUser = async (userId) => {
	try {
		const userMeetingsFrom = await ScheduleModel.find({ userId: userId });
		const userMeetingTo = await ScheduleModel.find({ requesterId: userId });
		const meetingData = [...userMeetingsFrom, ...userMeetingTo];
		// const userRequestedBy = [];
		// meetingData?.forEach((meeting) => {
		//   meeting.requestedBy.forEach((request) => {
		//     userRequestedBy.push({
		//       _id: request._id,
		//       meetingId: meeting._id,
		//       name: request.name,
		//       companyName: request.companyName,
		//       email: request.email,
		//       phone: request.phone,
		//       agenda: request.description,
		//       oneLink: request.oneLink,
		//       start: request.start,
		//       end: request.end,
		//     });
		//   });
		// });

		return {
			status: 200,
			message: "All 'requested by' data for the user retrieved successfully",
			data: meetingData,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message:
				"An error occurred while retrieving 'requested by' data for the user.",
		};
	}
};

export const rejectRequestById = async (meetingId, requestId) => {
	try {
		const meeting = await ScheduleModel.findById(meetingId);
		if (!meeting) {
			return {
				status: 404,
				message: "Meeting not found with the provided ID.",
			};
		}
		const type = "meetingRequest";
		deleteNotification(meeting.userId, null, type, meetingId);
		const requestToRejectIndex = meeting.requestedBy.findIndex(
			(request) => request._id.toString() === requestId
		);
		if (requestToRejectIndex === -1) {
			return {
				status: 404,
				message: "Request not found with the provided ID for this meeting.",
			};
		}
		meeting.requestedBy.splice(requestToRejectIndex, 1);
		await meeting.save();
		return {
			status: 200,
			message: "Request rejected successfully",
			data: meeting,
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "An error occurred while rejecting the request.",
		};
	}
};
