import express from "express";

import { authenticateToken } from "../middlewares/authenticateToken.js";

import {
	updateAvaibilityController,
	createEventController,
	getEventsController,
	disableEventController,
	getSchedulePageDataController,
	scheduleMeetingController,
	cancelSheduledMeetingController,
	getALLScheduledMeetings,
	getEventsByUsernameController,
	getEventsByOnelinkController,
	createPaymentSessionController,
	paymentVerifyController,
} from "../controllers/meetingController.js";

const router = express.Router();
// http://localhost:8080/meetings/
router.get("/getEvents/:username", getEventsByUsernameController);
router.get("/getEventsByOnelinkId/:onelinkId", getEventsByOnelinkController);
router.post("/scheduleMeeting", scheduleMeetingController);
router.post("/createPaymentSession", createPaymentSessionController);
router.post("/verifyPayment", paymentVerifyController);
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
router.patch("/disableEvent/:eventId", disableEventController);

// for fetching user, event and user availability

// for schedulling meeting
router.delete(
	"/cancelScheduledMeeting/:meetingId",
	cancelSheduledMeetingController
);
router.get("/getALLScheduledMeetings", getALLScheduledMeetings);

export default router;
