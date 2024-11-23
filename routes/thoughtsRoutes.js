import express from "express";
import { authenticateToken } from "../middlewares/authenticateToken.js";

import {
	createQuestionController,
	upvoteQuestionController,
	getQuestionsController,
	getQuestionByIdController,
	addAnswerToQuestionController,
	upvoteDownvoteAnswerController,
	addSuggestionsToAnswerController,
	likeUnlikeSuggestionOfAnswerController,
} from "../controllers/ThoughtsController.js";

const router = express.Router();

// Unauthorized access
router.get("/get-questions", getQuestionsController);
router.get("/getQuestionById/:questionId", getQuestionByIdController);

// Authorized access
router.use(authenticateToken);
router.post("/create-question", createQuestionController);
router.post("/addAnswerToQuestion/:questionId", addAnswerToQuestionController);

router.patch("/upvoteDownvoteQuestion/:questionId", upvoteQuestionController);

router.patch(
	"/upvoteDownvoteAnswer/:questionId/:answerId",
	upvoteDownvoteAnswerController
);
router.post(
	"/addSuggestionsToAnswer/:questionId/:answerId",
	addSuggestionsToAnswerController
);

router.patch(
	"/upvoteDownvoteComment/:questionId/:answerId/:suggestionId",
	likeUnlikeSuggestionOfAnswerController
);

export default router;
