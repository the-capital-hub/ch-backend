import {
	createPaymentSession,
	verifyPayment,
	getPriorityDMForUser,
	getPriorityDMForFounder,
	updatePriorityDM,
} from "../services/priorityDMService.js";

export const createPaymentSessionController = async (req, res) => {
	try {
		const response = await createPaymentSession(req.body);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while intiating payment.",
		});
	}
};

export const paymentVerifyController = async (req, res) => {
	try {
		const response = await verifyPayment(req, res);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while verifying payment.",
		});
	}
};

export const getPriorityDMForUserController = async (req, res) => {
	try {
		const { userId } = req;
		const response = await getPriorityDMForUser(userId);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting priority DM.",
		});
	}
};

export const getPriorityDMForFounderController = async (req, res) => {
	try {
		const { userId } = req;
		const response = await getPriorityDMForFounder(userId);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting priority DM.",
		});
	}
};

export const updatePriorityDMController = async (req, res) => {
	try {
		const { priorityDMId } = req.params;
		const { userId } = req;
		const response = await updatePriorityDM(priorityDMId, userId, req.body);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting priority DM.",
		});
	}
};
