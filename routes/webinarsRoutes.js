import express from "express";

import { authenticateToken } from "../middlewares/authenticateToken.js";

import {
	createWebinarController,
	getWebinarController,
	getWebinarOnelinkIdController,
	deleteWebinarController,
} from "../controllers/webinarController.js";

const router = express.Router();

// http://localhost:8080/webinars
// Unauthorized routes
router.get("/getWebinarsByOnelinkId/:onelinkId", getWebinarOnelinkIdController);

// Authorized routes below
router.use(authenticateToken);
router.post("/createWebinar", createWebinarController);
router.get("/getWebinars", getWebinarController);
router.delete("/deleteWebinar/:id", deleteWebinarController);

export default router;
