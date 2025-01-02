import {
	createWebinar,
	getWebinar,
	getWebinarsByOnelink,
	deleteWebinar,
	createPaymentSession,
	verifyPayment,
} from "../services/webinarService.js";

export const createWebinarController = async (req, res) => {
	try {
		const { userId } = req;
		const response = await createWebinar(userId, req.body);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while creating webinar.",
		});
	}
};

export const getWebinarController = async (req, res) => {
	try {
		const { userId } = req;
		const response = await getWebinar(userId);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting webinars.",
		});
	}
};

export const getWebinarOnelinkIdController = async (req, res) => {
	try {
		const { onelinkId } = req.params;
		const response = await getWebinarsByOnelink(onelinkId);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting webinars.",
		});
	}
};

export const deleteWebinarController = async (req, res) => {
	try {
		const { userId } = req;
		const { id } = req.params;
		const response = await deleteWebinar(userId, id);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while deleting webinar.",
		});
	}
};

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
