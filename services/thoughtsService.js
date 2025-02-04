import { UserModel } from "../models/User.js";
import { ThoughtModel } from "../models/Thoughts.js";
import { PostModel } from "../models/Post.js";
import { populate } from "dotenv";

export const createQuestion = async (userId, data) => {
	try {
		const { question, industry } = data;
		const user = await UserModel.findOne({ _id: userId });

		const response = await ThoughtModel.create({
			question: question,
			industry: industry,
			user: user._id,
		});

		if (!response) {
			return {
				status: 500,
				message: "Something went wrong",
			};
		}

		return {
			status: 200,
			data: response,
			message: "Question created successfully",
		};
	} catch (error) {
		console.log(error);
		return {
			status: 500,
			message: "Something went wrong",
		};
	}
};

export const updateQuestion = async (userId, data, questionId) => {
	try {
		const { question, industry } = data;
		// first check, user associated with this userId is admin or not
		const user = await UserModel.findOne({ _id: userId });

		//  isAdmin(boolean state)
		if (user.isAdmin === false) {
			return {
				status: 403,
				message: "You are not authorized to update this question",
			};
		}

		const response = await ThoughtModel.findOneAndUpdate(
			{ _id: questionId },
			{
				question: question,
				industry: industry,
			},
			{ new: true }
		);

		if (!response) {
			return {
				status: 500,
				message: "Something went wrong",
			};
		}

		return {
			status: 200,
			data: response,
			message: "Question updated successfully",
		};
	} catch (error) {
		console.log(error);
		return {
			status: 500,
			message: "Something went wrong",
		};
	}
};

export const deleteQuestion = async (userId, questionId) => {
	try {
		// first check, user associated with this userId is admin or not
		const user = await UserModel.findOne({ _id: userId });

		//  isAdmin(boolean state)
		if (user.isAdmin === false) {
			return {
				status: 403,
				message: "You are not authorized to delete this question",
			};
		}

		const response = await ThoughtModel.findByIdAndDelete(questionId);

		if (!response) {
			return {
				status: 500,
				message: "Something went wrong",
			};
		}

		return {
			status: 200,
			data: response,
			message: "Question deleted successfully",
		};
	} catch (error) {
		console.log(error);
		return {
			status: 500,
			message: "Something went wrong",
		};
	}
};

export const upvoteDownvoteQuestion = async (userId, questionId) => {
	try {
		// Validate inputs
		if (!userId || !questionId) {
			return {
				status: 400,
				message: "User ID and Question ID are required",
			};
		}

		// Find user and question concurrently for better performance
		const [user, question] = await Promise.all([
			UserModel.findById(userId),
			ThoughtModel.findById(questionId),
		]);

		// Check if both user and question exist
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}

		if (!question) {
			return {
				status: 404,
				message: "Question not found",
			};
		}

		// Check if user has already upvoted
		const userAlreadyUpvoted = question.upvotes.includes(userId);

		// Update the question
		const updatedQuestion = await ThoughtModel.findByIdAndUpdate(
			questionId,
			{
				[userAlreadyUpvoted ? "$pull" : "$push"]: {
					upvotes: userId,
				},
			},
			{
				new: true,
				runValidators: true,
			}
		);

		if (!updatedQuestion) {
			return {
				status: 500,
				message: "Failed to update question",
			};
		}

		return {
			status: 200,
			data: updatedQuestion,
			message: userAlreadyUpvoted
				? "Question downvoted successfully"
				: "Question upvoted successfully",
		};
	} catch (error) {
		console.error("Error in upvoteDownvoteQuestion:", error);

		// Handle specific MongoDB errors
		if (error.name === "CastError") {
			return {
				status: 400,
				message: "Invalid ID format",
			};
		}

		if (error.name === "ValidationError") {
			return {
				status: 400,
				message: error.message,
			};
		}

		return {
			status: 500,
			message: "Internal server error",
			error: error.message,
		};
	}
};

export const getQuestions = async (req, res) => {
	try {
		const thoughts = await ThoughtModel.find()
			.populate("user")
			.populate("upvotes")
			.populate({
				path: "answer",
				populate: [
					{
						path: "user",
					},
					{
						path: "upvotes",
					},
					{
						path: "suggestions.user",
					},
					{
						path: "suggestions.likes",
					},
				],
			});

		if (!thoughts) {
			return {
				status: 500,
				message: "No questions found",
			};
		}

		return {
			status: 200,
			data: thoughts,
			message: "Questions fetched successfully",
		};
	} catch (error) {
		console.log(error);
		return {
			status: 500,
			message: "Something went wrong",
		};
	}
};

export const getQuestionById = async (questionId) => {
	try {
		const question = await ThoughtModel.findOne({ _id: questionId })
			.populate({
				path: "user",
				populate: {
					path: "startUp",
				},
			})
			.populate("upvotes")
			.populate({
				path: "answer",
				populate: [
					{
						path: "user",
					},
					{
						path: "upvotes",
					},
					{
						path: "suggestions.user",
					},
					{
						path: "suggestions.likes",
					},
				],
			});

		const posts = await PostModel.find({ user: question.user._id })
			.populate({
				path: "user",
				populate: {
					path: "startUp",
				},
			})
			.populate("likes")
			.populate("comments");

		const userThoughts = await ThoughtModel.find({ user: question.user._id })
			.populate("user")
			.populate("upvotes")
			.populate({
				path: "answer",
				populate: [
					{
						path: "user",
					},
					{
						path: "upvotes",
					},
					{
						path: "suggestions.user",
					},
					{
						path: "suggestions.likes",
					},
				],
			});

		if (!question) {
			return {
				status: 404,
				message: "Question not found",
			};
		}

		return {
			status: 200,
			data: { question, posts, userThoughts },
			message: "Question fetched successfully",
		};
	} catch (error) {
		console.log(error);
		return {
			status: 500,
			message: "Something went wrong",
		};
	}
};

export const addAnswerToQuestion = async (userId, questionId, data) => {
	try {
		const { answer } = data;
		const user = await UserModel.findOne({ _id: userId });
		const question = await ThoughtModel.findOne({ _id: questionId });

		const response = await ThoughtModel.findOneAndUpdate(
			{ _id: question._id },
			{
				$push: {
					answer: {
						answer: answer,
						user: user._id,
					},
				},
			},
			{ new: true }
		);

		if (!response) {
			return {
				status: 500,
				message: "Something went wrong",
			};
		}

		// Get the newly added answer from the response
		const newAnswer = response.answer[response.answer.length - 1];

		return {
			status: 200,
			data: newAnswer, // Return only the newly added answer
			message: "Answer added successfully",
		};
	} catch (error) {
		console.log(error);
		return {
			status: 500,
			message: "Something went wrong",
		};
	}
};

export const upvoteDownvoteAnswer = async (userId, questionId, answerId) => {
	try {
		if (!userId || !questionId || !answerId) {
			return {
				status: 400,
				message: "Missing required fields",
			};
		}

		// Find the question and check if user has already upvoted
		const question = await ThoughtModel.findOne({
			_id: questionId,
			"answer._id": answerId,
		});

		if (!question) {
			return {
				status: 404,
				message: "Question or answer not found",
			};
		}

		// Find the specific answer
		const answer = question.answer.find((a) => a._id.toString() === answerId);
		console.log(answer);
		const hasUpvoted = answer.upvotes.includes(userId);
		console.log(hasUpvoted);

		// Update the answer - remove upvote if exists, add if it doesn't
		const updatedQuestion = await ThoughtModel.findOneAndUpdate(
			{ _id: questionId, "answer._id": answerId },
			{
				[hasUpvoted ? "$pull" : "$push"]: {
					"answer.$.upvotes": userId,
				},
			},
			{ new: true }
		);

		return {
			status: 200,
			data: updatedQuestion,
			message: hasUpvoted
				? "Answer downvoted successfully"
				: "Answer upvoted successfully",
		};
	} catch (error) {
		console.error("Error in upvoteDownvoteAnswer:", error);
		return {
			status: 500,
			message: "Something went wrong",
		};
	}
};

export const addSuggestionsToAnswer = async (
	userId,
	questionId,
	answerId,
	data
) => {
	try {
		const { suggestion } = data;
		const user = await UserModel.findOne({ _id: userId });
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}

		const answer = await ThoughtModel.findOneAndUpdate(
			{ _id: questionId, "answer._id": answerId },
			{
				$push: {
					"answer.$.suggestions": {
						comment: suggestion,
						user: user._id,
					},
				},
			},
			{ new: true } // Return the updated document
		);

		if (!answer) {
			return {
				status: 404,
				message: "Answer not found",
			};
		}

		// Get the newly added suggestion from the answer
		const newSuggestion = answer.answer
			.find((a) => a._id.toString() === answerId)
			.suggestions.slice(-1)[0];

		return {
			status: 200,
			data: newSuggestion, // Return only the newly added suggestion
			message: "Suggestion added successfully",
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "Something went wrong",
		};
	}
};

export const likeUnlikeSuggestionOfAnswer = async (
	userId,
	questionId,
	answerId,
	suggestionId
) => {
	try {
		if (!userId || !questionId || !answerId || !suggestionId) {
			return {
				status: 400,
				message: "Missing required fields",
			};
		}

		// Find the question
		const question = await ThoughtModel.findOne({
			_id: questionId,
			"answer._id": answerId,
			"answer.suggestions._id": suggestionId,
		});

		if (!question) {
			return {
				status: 404,
				message: "Question, answer, or suggestion not found",
			};
		}

		// Find the specific answer and suggestion
		const answer = question.answer.find((a) => a._id.toString() === answerId);
		const suggestion = answer.suggestions.find(
			(s) => s._id.toString() === suggestionId
		);
		const hasLiked = suggestion.likes.includes(userId);

		// Update the suggestion - remove like if exists, add if it doesn't
		const updatedQuestion = await ThoughtModel.findOneAndUpdate(
			{
				_id: questionId,
				"answer._id": answerId,
				"answer.suggestions._id": suggestionId,
			},
			{
				[hasLiked ? "$pull" : "$addToSet"]: {
					"answer.$[ans].suggestions.$[sug].likes": userId,
				},
			},
			{
				arrayFilters: [{ "ans._id": answerId }, { "sug._id": suggestionId }],
				new: true,
			}
		);

		return {
			status: 200,
			data: updatedQuestion,
			message: hasLiked
				? "Suggestion unliked successfully"
				: "Suggestion liked successfully",
		};
	} catch (error) {
		console.error("Error in likeSuggestionOfAnswer:", error);
		return {
			status: 500,
			message: "Something went wrong",
		};
	}
};

export const deleteAnswer = async (userId, questionId, answerId) => {
	try {
		const response = await ThoughtModel.findOneAndUpdate(
			{ _id: questionId, "answer._id": answerId },
			{ $pull: { answer: { _id: answerId } } }
		);
		return {
			status: 200,
			data: response,
			message: "Answer deleted successfully",
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "Something went wrong",
		};
	}
};

export const updateAnswerOfQuestion = async (
	userId,
	questionId,
	answerId,
	data
) => {
	try {
		const { answer } = data;

		// first check, user associated with this userId is admin or not
		const user = await UserModel.findOne({ _id: userId });

		//  isAdmin(boolean state)
		if (user.isAdmin === false) {
			return {
				status: 403,
				message: "You are not authorized to update this answer of question",
			};
		}

		const response = await ThoughtModel.findOneAndUpdate(
			{ _id: questionId, "answer._id": answerId },
			{ $set: { "answer.$.answer": answer } }
		);
		return {
			status: 200,
			data: response,
			message: "Answer updated successfully",
		};
	} catch (error) {
		console.error(error);
		return {
			status: 500,
			message: "Something went wrong",
		};
	}
};
