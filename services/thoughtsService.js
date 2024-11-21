import { UserModel } from "../models/User.js";
import { ThoughtModel } from "../models/Thoughts.js";

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

export const getQuestions = async (req, res) => {
	try {
		const thoughts = await ThoughtModel.find();

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
			data: question,
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
			}
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
