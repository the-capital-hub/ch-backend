import {
	updateAvailability,
	createEvent,
	getEvents,
	deleteEvent,
	getSchedulePageData,
	scheduleMeeting,
	cancelSheduledMeeting,
	getAllSheduledMeeting,
	getEventsByUsername,
} from "../services/meetingService.js";

export const updateAvaibilityController = async (req, res) => {
	try {
		const { userId } = req;
		const response = await updateAvailability(userId, req.body);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating availability.",
		});
	}
};

export const createEventController = async (req, res) => {
	try {
		const { userId } = req;
		const response = await createEvent(userId, req.body);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating availability.",
		});
	}
};

export const getEventsController = async (req, res) => {
	try {
		const { userId } = req;
		const response = await getEvents(userId);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating availability.",
		});
	}
};

export const deleteEventController = async (req, res) => {
	try {
		const { userId } = req;
		const { eventId } = req.params;
		const response = await deleteEvent(userId, eventId);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating availability.",
		});
	}
};

export const getSchedulePageDataController = async (req, res) => {
	try {
		const { username, eventId } = req.params;
		// console.log(username, eventId);
		const response = await getSchedulePageData(username, eventId);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating availability.",
		});
	}
};

export const scheduleMeetingController = async (req, res) => {
	try {
		// console.log(userId, req.body);
		const response = await scheduleMeeting(req.body);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating availability.",
		});
	}
};

export const cancelSheduledMeetingController = async (req, res) => {
	try {
		const { userId } = req;
		const { meetingId } = req.params;
		const response = await cancelSheduledMeeting(userId, meetingId);
		res.status(response.status).send(response);
	} catch (error) {
		if (error.response && error.response.status === 401) {
			res.status(401).send({
				status: 401,
				message: "Unauthorized! Please sync with Google.",
			});
		}
		res.status(500).send({
			status: 500,
			message: "An error occurred while cancelling scheduled meeting.",
		});
	}
};

export const getALLScheduledMeetings = async (req, res) => {
	try {
		const { userId } = req;
		const response = await getAllSheduledMeeting(userId);
		res.status(response.status).send(response);
	} catch (error) {
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting scheduled meeting.",
		});
	}
};

export const getEventsByUsernameController = async (req, res) => {
	try {
		const { username } = req.params;
		const response = await getEventsByUsername(username);
		res.status(response.status).send(response);
	} catch (error) {
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting events by username.",
		});
	}
};
