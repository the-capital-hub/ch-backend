import express from "express";
import { authenticateToken } from "../middlewares/authenticateToken.js";

import {
	createQuestionController,
	updateQuestionController,
	deleteQuestionController,
	upvoteQuestionController,
	getQuestionsController,
	getQuestionByIdController,
	addAnswerToQuestionController,
	upvoteDownvoteAnswerController,
	addSuggestionsToAnswerController,
	likeUnlikeSuggestionOfAnswerController,
	deleteAnswerController,
	updateAnswerOfQuestionController,
} from "../controllers/thoughtsController.js";

const router = express.Router();

// Unauthorized access
router.get("/get-questions", getQuestionsController);
router.get("/getQuestionById/:questionId", getQuestionByIdController);

// Authorized access
router.use(authenticateToken);

// Create a question
router.post("/create-question", createQuestionController);

// Update a question (only admin)
router.patch("/update-question/:questionId", updateQuestionController);

// Delete a question (only admin)
router.delete("/delete-question/:questionId", deleteQuestionController);

// Add an answer
router.post("/addAnswerToQuestion/:questionId", addAnswerToQuestionController);

// Like and unlike a question
router.patch("/upvoteDownvoteQuestion/:questionId", upvoteQuestionController);

// Like and unlike an answer
router.patch(
	"/upvoteDownvoteAnswer/:questionId/:answerId",
	upvoteDownvoteAnswerController
);

// Add comment to a question
router.post(
	"/addSuggestionsToAnswer/:questionId/:answerId",
	addSuggestionsToAnswerController
);

// Like and unlike a comment
router.patch(
	"/upvoteDownvoteComment/:questionId/:answerId/:suggestionId",
	likeUnlikeSuggestionOfAnswerController
);

// Delete an answer
router.delete(
	"/deleteAnswerOfQuestion/:questionId/:answerId",
	deleteAnswerController
);

// Update an answer (only admin)
router.patch(
	"/updateAnswerOfQuestion/:questionId/:answerId",
	updateAnswerOfQuestionController
);

export default router;
