import * as resourceService from "../services/resourceService.js";
import multer from "multer";
import fs from "fs/promises";

// Configure multer with improved file size limits and error handling
const upload = multer({
	dest: "uploads/",
	limits: {
		fileSize: 100 * 1024 * 1024, // 100MB limit
		files: 10, // Maximum 10 files
	},
	fileFilter: (req, file, cb) => {
		const allowedImageTypes = [
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
		];
		const allowedVideoTypes = ["video/mp4", "video/mpeg", "video/quicktime"];
		const allowedDocTypes = [
			"application/pdf",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		];

		const allowedMimes = [
			...allowedImageTypes,
			...allowedVideoTypes,
			...allowedDocTypes,
		];

		if (allowedMimes.includes(file.mimetype)) {
			// Add a type property to help with processing
			file.resourceType = allowedImageTypes.includes(file.mimetype)
				? "image"
				: allowedVideoTypes.includes(file.mimetype)
				? "video"
				: "document";
			cb(null, true);
		} else {
			cb(
				new Error(
					`Invalid file type. Allowed types are: ${allowedMimes.join(", ")}`
				)
			);
		}
	},
});

// Create a new resource with improved error handling
export const createResource = [
	upload.array("files", 10),
	async (req, res) => {
		try {
			// Validate request
			if (!req.files || req.files.length === 0) {
				throw new Error("No files uploaded");
			}

			// Group files by type for better organization
			const filesByType = req.files.reduce((acc, file) => {
				acc[file.resourceType] = acc[file.resourceType] || [];
				acc[file.resourceType].push(file);
				return acc;
			}, {});

			// Create resource with metadata about file types
			const resourceData = {
				...req.body,
				fileTypes: Object.keys(filesByType), // Add information about types of files included
				totalFiles: req.files.length,
			};

			const resource = await resourceService.create(resourceData, req.files);

			// Cleanup uploaded files after successful processing
			await Promise.all(
				req.files.map((file) =>
					fs
						.unlink(file.path)
						.catch((err) =>
							console.error(`Error deleting temporary file ${file.path}:`, err)
						)
				)
			);

			res.status(201).json({
				message: "Resource created successfully",
				data: resource,
				fileTypes: resourceData.fileTypes,
			});
		} catch (error) {
			// Cleanup uploaded files on error
			if (req.files) {
				await Promise.all(
					req.files.map((file) => fs.unlink(file.path).catch(console.error))
				);
			}

			// Handle specific error types
			if (error.message.includes("Invalid file type")) {
				return res.status(415).json({
					message: "Unsupported Media Type",
					error: error.message,
				});
			}

			if (error.message.includes("File too large")) {
				return res.status(413).json({
					message: "File Too Large",
					error: "One or more files exceed the size limit of 100MB",
				});
			}

			res.status(400).json({
				message: "Error creating resource",
				error: error.message,
			});
		}
	},
];

// Get all resources
export const getAllResources = async (req, res) => {
	try {
		const resources = await resourceService.getAll(req.query);
		res.status(200).json(resources);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

// Get a single resource by ID
export const getResourceById = async (req, res) => {
	try {
		const resource = await resourceService.getById(req.params.id);
		res.status(200).json(resource);
	} catch (error) {
		res.status(404).json({ message: error.message });
	}
};

// Update a resource
export const updateResource = async (req, res) => {
	try {
		const resource = await resourceService.update(req.params.id, req.body);
		res.status(200).json(resource);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

// Delete a resource
export const deleteResource = async (req, res) => {
	try {
		const resource = await resourceService.remove(req.params.id);
		res
			.status(200)
			.json({ message: "Resource deleted successfully", resource });
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

export const createPaymentSessionController = async (req, res) => {
	try {
		const session = await resourceService.createPaymentSession(req.body);
		res.status(200).json(session);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

export const paymentVerifyController = async (req, res) => {
	try {
		const { userId } = req;
		const orderId = req.body.orderId;
    const resourceId = req.body.resourceId;
		const session = await resourceService.verifyPayment(userId, orderId, resourceId);
		res.status(200).json(session);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: error.message });
	}
};
