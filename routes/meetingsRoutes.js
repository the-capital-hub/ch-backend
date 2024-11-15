import express from "express";

import { authenticateToken } from "../middlewares/authenticateToken.js";

import {
	updateAvaibilityController,
	createEventController,
	getEventsController,
	deleteEventController,
	getSchedulePageDataController,
	scheduleMeetingController,
	cancelSheduledMeetingController,
	getALLScheduledMeetings,
	getEventsByUsernameController,
} from "../controllers/meetingController.js";

const router = express.Router();
// http://localhost:8080/meetings/
router.get("/getEvents/:username", getEventsByUsernameController);
router.post("/scheduleMeeting", scheduleMeetingController);
router.get(
	"/getSchedulePageData/:username/:eventId",
	getSchedulePageDataController
);

// Authorized routes below
router.use(authenticateToken);
router.post("/updateAvailability", updateAvaibilityController);
router.post("/createEvent", createEventController);
// Foe getting user specific events
router.get("/getEvents", getEventsController);
router.delete("/deleteEvent/:eventId", deleteEventController);

// for fetching user, event and user availability

// for schedulling meeting
router.delete(
	"/cancelScheduledMeeting/:meetingId",
	cancelSheduledMeetingController
);
router.get("/getALLScheduledMeetings", getALLScheduledMeetings);

export default router;
