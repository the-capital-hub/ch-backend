import {
	createQuestion,
	upvoteDownvoteQuestion,
	getQuestions,
	getQuestionById,
	addAnswerToQuestion,
	upvoteDownvoteAnswer,
	addSuggestionsToAnswer,
	likeUnlikeSuggestionOfAnswer,
} from "../services/thoughtsService.js";

export const createQuestionController = async (req, res) => {
	try {
		const { userId } = req;
		const response = await createQuestion(userId, req.body);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating availability.",
		});
	}
};

export const upvoteQuestionController = async (req, res) => {
	try {
		const { userId } = req;
		const { questionId } = req.params;
		const response = await upvoteDownvoteQuestion(userId, questionId);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating availability.",
		});
	}
};

export const getQuestionsController = async (req, res) => {
	try {
		const response = await getQuestions();
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating availability.",
		});
	}
};

export const getQuestionByIdController = async (req, res) => {
	try {
		const { questionId } = req.params;
		const response = await getQuestionById(questionId);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred fetching question by id.",
		});
	}
};

export const addAnswerToQuestionController = async (req, res) => {
	try {
		const { userId } = req;
		const { questionId } = req.params;
		const response = await addAnswerToQuestion(userId, questionId, req.body);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while answering questions.",
		});
	}
};

export const upvoteDownvoteAnswerController = async (req, res) => {
	try {
		const { userId } = req;
		const { questionId } = req.params;
		const { answerId } = req.params;
		const response = await upvoteDownvoteAnswer(userId, questionId, answerId);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while answering questions.",
		});
	}
};

export const addSuggestionsToAnswerController = async (req, res) => {
	try {
		const { userId } = req;
		const { answerId } = req.params;
		const { questionId } = req.params;
		const response = await addSuggestionsToAnswer(
			userId,
			questionId,
			answerId,
			req.body
		);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while answering questions.",
		});
	}
};

export const likeUnlikeSuggestionOfAnswerController = async (req, res) => {
	try {
		const { userId } = req;
		const { answerId } = req.params;
		const { questionId } = req.params;
		const { suggestionId } = req.params;
		console.log(answerId, questionId);
		const response = await likeUnlikeSuggestionOfAnswer(
			userId,
			questionId,
			answerId,
			suggestionId
		);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while answering questions.",
		});
	}
};
