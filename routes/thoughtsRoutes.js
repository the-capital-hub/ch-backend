import express from "express";
import { authenticateToken } from "../middlewares/authenticateToken.js";

import {
	createQuestionController,
	getQuestionsController,
	getQuestionByIdController,
	addAnswerToQuestionController,
} from "../controllers/ThoughtsController.js";

const router = express.Router();

// Unauthorized access
router.get("/get-questions", getQuestionsController);
router.get("/getQuestionById/:questionId", getQuestionByIdController);

router.use(authenticateToken);
router.post("/create-question", createQuestionController);
router.post("/addAnswerToQuestion/:questionId", addAnswerToQuestionController);


export default router;
