import { Resource } from "../models/Resource.js";
import { UserModel } from "../models/User.js";
import { cloudinary } from "../utils/uploadImage.js";

// for payment integration
import crypto from "crypto";
import { Cashfree } from "cashfree-pg";
import { v4 as uuidv4 } from "uuid";

Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;

// Create a new resource
export const create = async (resourceData, files) => {
	try {
		const fileLinks = [];

		if (files && files.length > 0) {
			// Process each file
			const uploadPromises = files.map(async (file) => {
				try {
					// Determine folder and resource type based on mimetype
					const isVideo = file.mimetype.startsWith("video");
					const isImage = file.mimetype.startsWith("image");
					const isDocument = !isVideo && !isImage;

					const folder = isVideo
						? `${process.env.CLOUDIANRY_FOLDER}/resources/videos`
						: isImage
						? `${process.env.CLOUDIANRY_FOLDER}/resources/images`
						: `${process.env.CLOUDIANRY_FOLDER}/resources/documents`;

					const uploadOptions = {
						folder,
						resource_type: isVideo ? "video" : "auto",
						format: isImage ? "webp" : undefined,
						unique_filename: true,
					};

					const { secure_url } = await cloudinary.uploader.upload(
						file.path,
						uploadOptions
					);
					return secure_url;
				} catch (fileError) {
					console.error(
						`Error uploading file ${file.originalname}:`,
						fileError
					);
					return null;
				}
			});

			const uploadedLinks = await Promise.all(uploadPromises);
			fileLinks.push(...uploadedLinks.filter((link) => link !== null));

			if (fileLinks.length === 0) {
				throw new Error("Failed to upload any files");
			}
		}

		const resource = new Resource({
			...resourceData,
			link: fileLinks.map((link) => ({ url: link })),
		});

		const savedResource = await resource.save();
		return savedResource;
	} catch (error) {
		console.error("Error creating resource:", error);
		throw new Error(`Error creating resource: ${error.message}`);
	}
};

// Get all resources
export const getAll = async (query = {}) => {
	try {
		return await Resource.find(query);
	} catch (error) {
		throw new Error(`Error fetching resources: ${error.message}`);
	}
};

// Get a single resource by ID
export const getById = async (id) => {
	try {
		const resource = await Resource.findById(id);
		if (!resource) {
			throw new Error("Resource not found");
		}
		return resource;
	} catch (error) {
		throw new Error(`Error fetching resource: ${error.message}`);
	}
};

// Update a resource
export const update = async (id, updateData) => {
	try {
		const resource = await Resource.findByIdAndUpdate(id, updateData, {
			new: true,
			runValidators: true,
		});
		if (!resource) {
			throw new Error("Resource not found");
		}
		return resource;
	} catch (error) {
		throw new Error(`Error updating resource: ${error.message}`);
	}
};

// Delete a resource
export const remove = async (id) => {
	try {
		const resource = await Resource.findByIdAndDelete(id);
		if (!resource) {
			throw new Error("Resource not found");
		}
		return resource;
	} catch (error) {
		throw new Error(`Error deleting resource: ${error.message}`);
	}
};

// generate order id
async function generateOrderId() {
	try {
		const uniqueId = crypto.randomBytes(16).toString("hex");
		const hash = crypto.createHash("sha256");
		hash.update(uniqueId);
		return hash.digest("hex").substr(0, 12);
	} catch (error) {
		console.error("Error generating order ID:", error);
		throw new Error("Failed to generate order ID");
	}
}

export const createPaymentSession = async (data) => {
	console.log("payment data", data);
	try {
		// Generate order ID
		const orderId = await generateOrderId();
		// Generate a random customer ID
		const customerId = uuidv4();

		// Prepare request payload
		const request = {
			order_amount: parseFloat(data.order_amount).toFixed(2),
			order_currency: "INR",
			order_id: orderId,
			customer_details: {
				customer_id: customerId,
				customer_name: data.customer_name.trim(),
				customer_email: data.customer_email.toLowerCase().trim(),
				customer_phone: data.customer_phone.trim(),
				resource_id: data.resourceId,
			},
			order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes expiry
		};
		// Create order with Cashfree
		const response = await Cashfree.PGCreateOrder("2023-08-01", request);

		// Validate response
		if (!response?.data?.payment_session_id) {
			throw new Error("Invalid response from payment gateway");
		}

		// Return success response
		return {
			status: 200,
			data: response.data,
		};
	} catch (error) {
		console.error("Error creating payment session:", error);
		throw new Error(`Error creating payment session: ${error.message}`);
	}
};

// export const verifyPayment = async (userId, orderId) => {
// 	console.log("orderId", orderId);
// 	try {
// 		// Fetch user details
// 		const user = await UserModel.findById(userId);
// 		// Fetch payment details
// 		const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);

// 		// Validate response
// 		if (!response?.data) {
// 			throw new Error("Invalid response from payment gateway");
// 		}

// 		// Extract payment status
// 		const payment = response.data[0] || {};

// 		const paymentData = {
// 			paymentId: payment.cf_payment_id,
// 			resourceId: payment.resource_id,
// 			orderId: payment.order_id,
// 			amount: payment.order_amount,
// 			currency: payment.payment_currency,
// 			status: 200,
// 			paymentStatus: payment.payment_status,
// 			paymentMethod: payment.payment_method,
// 			paymentGroup: payment.payment_group,
// 			paymentTime: payment.payment_completion_time,
// 			refundStatus: payment.refund_status,
// 		};

// 		const resource = await Resource.findByIdAndUpdate(
// 			payment.resource_id,
// 			{
// 				purchased_users: [...user.purchased_resources, userId],
// 			},
// 			{
// 				new: true,
// 				runValidators: true,
// 			}
// 		);
//     console.log("resource", resource);
// 		console.log("payment verify response", paymentData);
// 		return paymentData;
// 	} catch (error) {
// 		throw new Error(`Error verifying payment: ${error.message}`);
// 	}
// };

export const verifyPayment = async (userId, orderId, resourceId) => {
	console.log("orderId", orderId);
	console.log("userId", userId);
	console.log("resourceId", resourceId);
	try {
		// Fetch user details
		const user = await UserModel.findOne({ _id: userId });
		if (!user) {
			throw new Error("User not found");
		}

		// Fetch payment details
		const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);

		// Validate response
		if (!response?.data) {
			throw new Error("Invalid response from payment gateway");
		}

		// Extract payment status
		const payment = response.data[0] || {};

		const paymentData = {
			paymentId: payment.cf_payment_id,
			resourceId: resourceId,
			orderId: payment.order_id,
			amount: payment.order_amount,
			currency: payment.payment_currency,
			status: 200,
			paymentStatus: payment.payment_status,
			paymentMethod: payment.payment_method,
			paymentGroup: payment.payment_group,
			paymentTime: payment.payment_completion_time,
			refundStatus: payment.refund_status,
		};

		const resource = await Resource.findByIdAndUpdate(
			{ _id: resourceId },
			{
				$addToSet: { purchased_users: userId },
			},
			{
				new: true,
				runValidators: true,
			}
		);

		if (!resource) {
			throw new Error("Resource not found");
		}

		console.log("resource", resource);
		console.log("payment verify response", paymentData);
		return paymentData;
	} catch (error) {
		throw new Error(`Error verifying payment: ${error.message}`);
	}
};
