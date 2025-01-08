import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;
import { UserModel } from "../models/User.js";
import { PostModel } from "../models/Post.js";
import { EventModel } from "../models/Event.js";
import { ThoughtModel } from "../models/Thoughts.js";
import { BookingModel } from "../models/Bookings.js";
import { UserAnalyticsModel } from "../models/UserAnalytics.js";
import { AvailabilityModel } from "../models/Availability.js";
import { ConnectionModel } from "../models/Connection.js";
//import { comparePassword } from "../utils/passwordManager.js";
import { StartUpModel } from "../models/startUp.js";
import { InvestorModel } from "../models/Investor.js";
import { VCModel } from "../models/VC.js";
import { cloudinary } from "../utils/uploadImage.js";
import jwt from "jsonwebtoken";
import { secretKey } from "../constants/config.js";
import { sendMail } from "../utils/mailHelper.js";
import bcrypt from "bcrypt";
import { comparePassword, hashPassword } from "../utils/passwordManager.js";
import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
import { formatInTimeZone } from "date-fns-tz";
import { addMinutes } from "date-fns";
import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { Cashfree } from "cashfree-pg";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const adminMail = "learn.capitalhub@gmail.com";
import connectDB from "../constants/db.js";

const transporter = nodemailer.createTransport({
	service: "gmail",
	secure: false,
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

export const getUsersService = async (info) => {
	try {
		const products = await UserModel.find({}).toArray();
		return products;
	} catch (error) {
		console.error("Failed to fetch data:", error);
		return [];
	}
};

export const registerUserService = async (user) => {
	try {
		console.log(user);
		const existingUser = await UserModel.findOne({
			$or: [{ email: user.email }, { phoneNumber: user.phoneNumber }],
		});
		if (existingUser) {
			throw new Error("Existing user. Please log in");
		}
		const newUser = new UserModel(user);
		await newUser.save();


		const targetUserId = "66823fc5e233b21acca0b471";
		const targetUser = await UserModel.findById(targetUserId);

		if (targetUser) {
			targetUser.connections.push(newUser._id);
			await targetUser.save();
		} else {
			throw new Error(`User with ID ${targetUserId} not found`);
		}

		newUser.connections.push(targetUserId);
		await newUser.save();

		// Send welcome email
		const emailContent = await ejs.renderFile("./public/welcomeEmail.ejs", {
			firstName: user.firstName,
		});

		await transporter.sendMail({
			from: `"The Capital Hub" <${process.env.EMAIL_USER}>`,
			to: user.email,
			subject: "Welcome to CapitalHub!",
			html: emailContent,
		});

		return newUser;
	} catch (error) {
		throw error;
	}
};

export const getUserAnalyticsDataByUserName = async (username) => {
	try {
		if (!username) {
			return {
				status: 404,
				message: "No user exists",
			};
		}

		const user = await UserModel.findOne({ userName: username })
			.populate("startUp")
			.populate("investor")
			.populate("connections")
			.populate("featuredPosts")
			.populate("achievements")
			.populate("savedPosts.posts")
			.populate("eventId")
			.populate("Availability");

		if (!user) {
			return {
				status: 404,
				message: "No user exists",
			};
		}

		const post = await PostModel.find({ user: user._id });
		// .populate("user")
		// .populate("comments")
		// .populate("resharedPostId")
		// .populate("resharedPostId.user")
		// .populate("likes");

		// Fetch or create analytics for the user
		let userAnalytics = await UserAnalyticsModel.findOne({ userId: user._id });

		if (!userAnalytics) {
			// If no analytics exist, create a new document
			userAnalytics = new UserAnalyticsModel({
				userId: user._id,
				publicProfileViews: 1, // Initialize to 1 for the first view
				detailedProfileViews: 0,
			});
		} else {
			// Increment the publicProfileViews
			userAnalytics.publicProfileViews += 1;
		}

		// Save the user analytics
		await userAnalytics.save();

		// Log the updated publicProfileViews
		// console.log(
		// 	`Current publicProfileViews for user ${user._id}: ${userAnalytics.publicProfileViews}`
		// );

		return {
			status: 200,
			message: { user, post },
		};
	} catch (error) {
		console.error("An error occurred while finding the user", error);
		return {
			status: 500,
			message: "Internal server error",
		};
	}
};

export const getUserByUsername = async (username) => {
	try {
		const user = await UserModel.findOne({ userName: username })
			.populate("startUp")
			.populate("investor")
			.populate("connections")
			.populate("featuredPosts")
			.populate("achievements")
			.populate("savedPosts.posts")
			.populate("eventId")
			.populate("Availability");

		if (!user) {
			return {
				status: 404,
				message: "No user exists",
			};
		}

		return {
			status: 200,
			user: user,
			message: "User found successfully",
		};
	} catch (error) {
		console.error("An error occurred while finding the user", error);
		return {
			status: 500,
			message: "An error occurred while finding the user",
		};
	}
};

export const loginUserService = async ({ phoneNumber, password }) => {
	if (!phoneNumber) {
		throw new Error("PhoneNumber, Email or Username is required");
	}
	const user = await UserModel.findOne({
		phoneNumber,
		userStatus: "active",
	}).populate({
		path: "startUp",
		select: "company logo",
	});

	if (!user) {
		const existingUser = await UserModel.findOne({
			$or: [
				{ email: phoneNumber.toLowerCase() },
				{ userName: phoneNumber.toLowerCase() },
			],
		});
		if (!existingUser) throw new Error("Invalid credentials");
		await comparePassword(password, existingUser.password);
		return existingUser;
	} else {
		return user;
	}
	//await comparePassword(password, user.password);
};

//get User by id
export const getUserById = async (userId) => {
	try {
		let user = await UserModel.findOne({ oneLinkId: userId }).populate(
			"startUp"
		);
		if (!user) {
			user = await UserModel.findById(userId).populate(["startUp", "investor"]);
		}
		if (!user) {
			return {
				status: 404,
				message: "User not found.",
			};
		}
		user.password = undefined;
		user.email = undefined;
		return {
			status: 200,
			message: "User details retrieved successfully.",
			data: user,
		};
	} catch (error) {
		console.error("Error getting user:", error);
		return {
			status: 500,
			message: "An error occurred while getting the user.",
		};
	}
};

// get User email by id
export const getUserEmailById = async (userId) => {
	try {
		const user = await UserModel.findById(userId);
		const userData = {
			email: user.email,
			_id: user._id,
			investorIdCount: user.investorIdCount,
		};
		return userData;
	} catch (error) {
		console.error("Error getting user email:", error);
		throw error;
	}
};

// Update User
export const updateUserData = async ({ userId, newData }) => {
	try {
		// Handle profile picture upload
		if (newData?.profilePicture) {
			const { secure_url } = await cloudinary.uploader.upload(
				newData.profilePicture,
				{
					folder: `${process.env.CLOUDIANRY_FOLDER}/startUps/logos`,
					format: "webp",
					unique_filename: true,
				}
			);
			newData.profilePicture = secure_url;
		}

		// Handle experience logos
		if (newData?.recentExperience && newData.recentExperience.length > 0) {
			for (let i = 0; i < newData.recentExperience.length; i++) {
				const exp = newData.recentExperience[i];
				if (exp.logo && exp.logo.startsWith("data:image")) {
					// Check if it's a new image upload
					const { secure_url } = await cloudinary.uploader.upload(exp.logo, {
						folder: `${process.env.CLOUDIANRY_FOLDER}/startUps/logos`,
						format: "webp",
						unique_filename: true,
					});
					newData.recentExperience[i].logo = secure_url;
				}
			}
		}

		// Handle education logos
		if (newData?.recentEducation && newData.recentEducation.length > 0) {
			for (let i = 0; i < newData.recentEducation.length; i++) {
				const edu = newData.recentEducation[i];
				if (edu.logo && edu.logo.startsWith("data:image")) {
					// Check if it's a new image upload
					const { secure_url } = await cloudinary.uploader.upload(edu.logo, {
						folder: `${process.env.CLOUDIANRY_FOLDER}/startUps/logos`,
						format: "webp",
						unique_filename: true,
					});
					newData.recentEducation[i].logo = secure_url;
				}
			}
		}

		const data = await UserModel.findByIdAndUpdate(
			userId,
			{ ...newData },
			{ new: true }
		);

		return {
			status: 200,
			message: "User updated successfully",
			data,
		};
	} catch (error) {
		console.log(error);
		return {
			status: 500,
			message: "An error occurred while updating the user data.",
		};
	}
};

//blockuser
export const blockUser = async (userId, blockedUserId) => {
	try {
		// Find the user who wants to block another user
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}

		// Check if the user is trying to block themselves
		if (userId === blockedUserId) {
			return {
				status: 400,
				message: "Cannot block yourself",
			};
		}

		// Add the blockedUserId to the user's blocked list
		if (!user.blockedUsers.includes(blockedUserId)) {
			user.blockedUsers.push(blockedUserId);
			await user.save();
		}

		return {
			status: 200,
			message: "User blocked successfully",
		};
	} catch (error) {
		console.error("Error blocking user:", error);
		return {
			status: 500,
			message: "An error occurred while blocking the user.",
		};
	}
};

export const unblockUser = async (userId, unblockUserId) => {
	try {
		// Find the user who wants to unblock the blocked user
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}

		// Check if the user is trying to unblock themselves
		if (userId === unblockUserId) {
			return {
				status: 400,
				message: "Cannot unblock yourself",
			};
		}

		// Check if the id belongs to the blocked list
		if (!user.blockedUsers.includes(unblockUserId)) {
			return {
				status: 404,
				message: "The user is already unblocked",
			};
		}

		// Remove unblockUserId from blockedUsers array and update the document
		await UserModel.findByIdAndUpdate(
			userId,
			{ $pull: { blockedUsers: unblockUserId } },
			{ new: true }
		);

		return {
			status: 200,
			message: "User unblocked successfully",
		};
	} catch (error) {
		console.error("Error unblocking user:", error);
		return {
			status: 500,
			message: "An error occurred while unblocking the user.",
		};
	}
};

//get User by id with request body
export const getUserByIdBody = async (userId) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		return {
			status: 200,
			message: "User details retrieved successfully.",
			data: user,
		};
	} catch (error) {
		console.error("Error getting user:", error);
		return {
			status: 500,
			message: "An error occurred while getting the user.",
		};
	}
};

// Start up data

export const getStartUpData = async (userId) => {
	try {
		const startUp = await StartUpModel.findOne({ founderId: userId });
		if (!startUp) {
			return {
				status: 404,
				message: "StartUp not found.",
			};
		}
		return {
			status: 200,
			message: "StartUp details retrieved successfully.",
			data: startUp,
		};
	} catch (error) {
		console.error("Error getting StartUp:", error);
		return {
			status: 500,
			message: "An error occurred while getting the StartUp.",
		};
	}
};

export const updateUserById = async (userId, newData) => {
	try {
		const _id = new mongoose.Types.ObjectId(userId);

		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return { status: 400, message: "Invalid userId" };
		}

		let data;

		if (newData.investorId) {
			// Append investorId to investorIdCount array
			data = await UserModel.findByIdAndUpdate(
				_id,
				{ $push: { investorIdCount: newData.investorId } }, // Append to array
				{ new: true } // Return the updated document
			);
		} else {
			// Update other fields in newData
			data = await UserModel.findByIdAndUpdate(
				_id,
				{ $set: newData }, // Use $set to update the fields in newData
				{ new: true } // Return the updated document
			);
		}

		console.log("Updated data:", data);
		return { status: 200, message: "User updated successfully", data };
	} catch (error) {
		console.error("Error updating user:", error.message);
		return {
			status: 500,
			message: "An error occurred while updating the user.",
		};
	}
};

export const changePassword = async (userId, { newPassword, oldPassword }) => {
	try {
		const user = await UserModel.findById(userId);
		const checkPassword = bcrypt.compare(oldPassword, user.password);
		if (!checkPassword) {
			return {
				status: 401,
				message: "Invalid Password",
			};
		}
		user.password = await hashPassword(newPassword);
		await user.save();
		return {
			status: 200,
			message: "Password Changed Successfully",
		};
	} catch (error) {
		return {
			status: 500,
			message: "An error occurred while updating the password.",
		};
	}
};

export const requestPasswordReset = async (email) => {
	try {
		const user = await UserModel.findOne({ email });
		if (!user) {
			return {
				status: 404,
				message: "User Not Found",
			};
		}
		const payload = {
			userId: user._id.toString(),
		};
		const resetToken = jwt.sign(payload, secretKey, {
			expiresIn: "1h",
		});
		const resetLink = `${process.env.BASE_URL}/reset-password?token=${resetToken}`;
		const resetPasswordMessage = `
      <p>You've requested to reset your password. If you didn't make this request, please ignore this email.</p>
  
      <p>To reset your password, click the button below:</p>
      <p style="text-align: center;"> 
      <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Reset Password</a>
    </p>
      <p>If the above button doesn't work, copy and paste the following URL into your browser:</p>
      <p>${resetLink}</p>
    
      <p>This link will expire in 1 hour for security reasons.</p>
    
      <p>If you have any questions or need further assistance, please contact our support team.</p>
    
      <p>Regards,<br>The Capital Hub</p>
    `;
		const subject = "Password Reset Request";
		const response = await sendMail(
			"The Capital Hub",
			user.email,
			adminMail,
			subject,
			resetPasswordMessage
		);
		if (response.status === 200) {
			return {
				status: 200,
				message: "Password reset email sent successfully",
			};
		} else {
			return {
				status: 500,
				message: "Error sending password reset email",
			};
		}
	} catch (error) {
		console.log(error);
		return {
			status: 500,
			message: "Error requesting password reset",
		};
	}
};

export const resetPassword = async (token, newPassword) => {
	console.log("token, newPassword", token, newPassword);
	try {
		const decodedToken = jwt.verify(token, secretKey);
		if (!decodedToken || !decodedToken.userId) {
			return {
				status: 400,
				message: "Invalid or expired reset token",
			};
		}
		const user = await UserModel.findById(decodedToken.userId);
		if (!user) {
			return {
				status: 400,
				message: "User not found",
			};
		}
		user.password = newPassword;
		await user.save();
		return {
			status: 200,
			message: "Password reset successfully",
		};
	} catch (error) {
		console.log(error);
		return {
			status: 500,
			message: "Error resetting password",
		};
	}
};

//search user/ company
export const searchUsers = async (searchQuery) => {
	const regex = new RegExp(`^${searchQuery}`, "i");
	try {
		const users = await UserModel.find({
			$and: [
				{
					$or: [
						{ firstName: { $regex: regex } },
						{ lastName: { $regex: regex } },
					],
				},
				{ userStatus: "active" },
			],
		});

		const companyIds = users.map((user) => user.startUp);
		const company = await StartUpModel.find({
			$or: [
				{ company: { $regex: regex } },
				{ oneLink: { $regex: regex } },
				{ _id: { $in: companyIds } },
			],
		});

		const investorCompanyIds = users.map((user) => user.investor);
		const investor = await InvestorModel.aggregate([
			{
				$match: {
					$or: [
						{ companyName: { $regex: regex } },
						{ oneLink: { $regex: regex } },
						{ _id: { $in: investorCompanyIds } },
					],
				},
			},
			{
				$addFields: {
					company: "$companyName",
					isInvestor: true,
				},
			},
		]);

		return {
			status: 200,
			data: {
				users: users,
				company: company.concat(investor),
			},
		};
	} catch (error) {
		console.error("Error searching for users:", error);
		return {
			status: 500,
			message: "Error searching for users",
		};
	}
};

// add education
export const addEducation = async (userId, educationData) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		if (educationData?.logo) {
			const { secure_url } = await cloudinary.uploader.upload(
				educationData.logo,
				{
					folder: `${process.env.CLOUDIANRY_FOLDER}/startUps/logos`,
					format: "webp",
					unique_filename: true,
				}
			);
			educationData.logo = secure_url;
		}
		user.recentEducation.push(educationData);
		await user.save();
		return {
			status: 200,
			message: "Education added",
			data: user,
		};
	} catch (error) {
		console.error("Error adding recent education:", error);
		return {
			status: 500,
			message: "An error occurred while adding education.",
		};
	}
};

// add experince
export const addExperience = async (userId, experienceData) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		if (experienceData?.logo) {
			const { secure_url } = await cloudinary.uploader.upload(
				experienceData.logo,
				{
					folder: `${process.env.CLOUDIANRY_FOLDER}/startUps/logos`,
					format: "webp",
					unique_filename: true,
				}
			);
			experienceData.logo = secure_url;
		}
		user.recentExperience.push(experienceData);
		await user.save();
		return {
			status: 200,
			message: "Experience added",
			data: user,
		};
	} catch (error) {
		console.error("Error adding recent experience:", error);
		return {
			status: 500,
			message: "An error occurred while adding experience.",
		};
	}
};

export const addStartupToUser = async (userId, startUpId) => {
	try {
		const user = await UserModel.findOneAndUpdate(
			{ _id: userId },
			{ $set: { startUp: startUpId } },
			{ new: true }
		);
		if (!user) {
			return {
				status: 404,
				message: "User not found.",
			};
		}

		let isFirst = false;
		const achievementId = "6564687349186bca517cd0cd";
		if (!user.achievements.includes(achievementId)) {
			user.achievements.push(achievementId);
			await user.save();
			isFirst = true;
		}

		return {
			status: 200,
			message: "Startup added to user successfully.",
			data: user,
			isFirst,
		};
	} catch (error) {
		console.error("Error adding startups to user:", error);
		return {
			status: 500,
			message: "An error occurred while adding startups to user.",
		};
	}
};

export const addUserAsInvestor = async (userId, investorId) => {
	try {
		const user = await UserModel.findOneAndUpdate(
			{ _id: userId },
			{ $set: { investor: investorId } },
			{ new: true }
		);
		if (!user) {
			return {
				status: 404,
				message: "User not found.",
			};
		}
		return {
			status: 200,
			message: "Investor added to user successfully.",
			data: user,
		};
	} catch (error) {
		console.error("Error adding user as investor:", error);
		return {
			status: 500,
			message: "An error occurred while adding user as investor.",
		};
	}
};

export const getExplore = async (filters) => {
	try {
		const {
			type,
			sector,
			gender,
			city,
			size,
			yearsOfExperience,
			previousExits,
			diversityMetrics,
			sectorPreference,
			investmentSize,
			investmentStage,
			fundingRaised,
			productStage,
			stage,
			age,
			education,
			searchQuery,
			sector_focus,
			stage_focus,
			ticket_size,
			page = 1,
			limit = 10,
		} = filters;

		// Convert pagination parameters to numbers
		const pageNum = parseInt(page, 10);
		const limitNum = parseInt(limit, 10);
		const skip = (pageNum - 1) * limitNum;

		// For startups
		if (type === "startup") {
			const query = {};
			if (sector) query.sector = sector;
			if (city) query.location = city;
			if (size) query.noOfEmployees = { $gte: parseInt(size, 10) };
			if (fundingRaised) query.fundingRaised = fundingRaised;
			if (productStage) query.productStage = productStage;
			if (stage) query.stage = stage;
			if (age) query.age = age;
			if (searchQuery)
				query.company = { $regex: new RegExp(`^${searchQuery}`, "i") };

			const startups = await StartUpModel.find(query)
				.populate("founderId")
				.limit(limitNum)
				.skip(skip)
				.lean();

			return {
				status: 200,
				message: "Startup data retrieved",
				data: startups,
			};

			// Optimized investors query
		} else if (type === "investor") {
			const matchStage = {};
			if (sector) matchStage["investor.sector"] = sector;
			if (city) matchStage["investor.location"] = city;
			if (investmentStage) matchStage["investor.stage"] = investmentStage;
			if (gender) matchStage.gender = gender;
			if (sectorPreference)
				matchStage.sectorPreferences = { $in: [sectorPreference] };
			if (investmentSize) matchStage.investmentSize = investmentSize;
			if (searchQuery)
				matchStage.firstName = { $regex: new RegExp(`^${searchQuery}`, "i") };

			const pipeline = [
				{
					$match: {
						userStatus: "active",
						investor: { $exists: true },
					},
				},
				{
					$lookup: {
						from: "investors",
						localField: "investor",
						foreignField: "_id",
						as: "investor",
					},
				},
				{
					$unwind: "$investor",
				},
				{
					$match: matchStage,
				},
				{
					$skip: skip,
				},
				{
					$limit: limitNum,
				},
				{
					$project: {
						password: 0,
					},
				},
			];

			const investors = await UserModel.aggregate(pipeline);

			return {
				status: 200,
				message: "Investors data retrieved",
				data: investors,
			};

			// For founders
		} else if (type === "founder") {
			const matchStage = {};
			if (sector) matchStage["startup.sector"] = sector;
			if (city) matchStage["startup.location"] = city;
			if (gender) matchStage.gender = gender;
			if (previousExits) matchStage.previousExits = previousExits;
			if (yearsOfExperience) matchStage.yearsOfExperience = yearsOfExperience;
			if (education) matchStage.education = education;
			if (diversityMetrics)
				matchStage.diversityMetrics = { $in: [diversityMetrics] };
			if (searchQuery)
				matchStage.firstName = { $regex: new RegExp(`^${searchQuery}`, "i") };

			const pipeline = [
				{
					$match: {
						userStatus: "active",
					},
				},
				{
					$lookup: {
						from: "startups",
						localField: "_id",
						foreignField: "founderId",
						as: "startup",
					},
				},
				{
					$unwind: "$startup",
				},
				{
					$match: matchStage,
				},
				{
					$skip: skip,
				},
				{
					$limit: limitNum,
				},
				{
					$project: {
						password: 0,
					},
				},
			];

			const founders = await UserModel.aggregate(pipeline);

			return {
				status: 200,
				message: "Founder data retrieved",
				data: founders,
			};

			// For VC
		} else if (type === "vc") {
			const query = {};
			if (sector_focus) query.sector_focus = sector_focus;
			if (stage_focus) query.stage_focus = stage_focus;
			if (ticket_size) query.ticket_size = { $gte: parseInt(ticket_size, 10) };
			if (searchQuery)
				query.name = { $regex: new RegExp(`^${searchQuery}`, "i") };

			const VC = await VCModel.find(query).limit(limitNum).skip(skip).lean();

			return {
				status: 200,
				message: "VC data retrieved",
				data: VC,
			};
		}

		return {
			status: 400,
			message: "Invalid 'type' parameter",
		};
	} catch (error) {
		console.error("Error getting explore results:", error);
		return {
			status: 500,
			message: "An error occurred while getting explore results.",
		};
	}
};

export const getExploreFilters = async (type) => {
	try {
		if (type === "startup") {
			// const startupSectors = await StartUpModel.distinct("sector");
			const startupCities = await StartUpModel.distinct("location");
			return {
				status: 200,
				message: "Startup filters retrieved",
				data: {
					// sectors: startupSectors,
					cities: startupCities,
				},
			};
		} else if (type === "investor") {
			// const investorSectors = await InvestorModel.distinct("sector");
			const investorCities = await InvestorModel.distinct("location");
			return {
				status: 200,
				message: "Investor filters retrieved",
				data: {
					// sectors: investorSectors,
					cities: investorCities,
				},
			};
		} else if (type === "founder") {
			// const founderSectors = await StartUpModel.distinct("sector");
			const founderCities = await StartUpModel.distinct("location");
			return {
				status: 200,
				message: "Founder filters retrieved",
				data: {
					// sectors: founderSectors,
					cities: founderCities,
				},
			};
		} else if (type === "vc") {
			// const founderSectors = await StartUpModel.distinct("sector");
			const founderCities = await StartUpModel.distinct("location");
			return {
				status: 200,
				message: "Founder filters retrieved",
				data: {
					// sectors: founderSectors,
					cities: founderCities,
				},
			};
		} else {
			return {
				status: 400,
				message: "Invalid 'type' parameter",
			};
		}
	} catch (error) {
		console.error("Error getting explore filters:", error);
		return {
			status: 500,
			message: "An error occurred while getting explore filters.",
		};
	}
};

export const validateSecretKey = async ({ oneLinkId, secretOneLinkKey }) => {
	try {
		const user = await UserModel.findOne({ oneLinkId });

		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}

		if (!user.secretKey) {
			const token = jwt.sign({}, secretKey, { expiresIn: "1h" });
			return {
				status: 200,
				message: "Secret key is valid",
				token,
			};
		}

		if (secretOneLinkKey === user.secretKey) {
			const token = jwt.sign({}, secretKey, { expiresIn: "1h" });
			return {
				status: 200,
				message: "Secret key is valid",
				token,
			};
		} else {
			return {
				status: 401,
				message: "Invalid secret key",
			};
		}
	} catch (error) {
		console.error("Error validating secret key:", error);
		return {
			status: 500,
			message: "An error occurred while validating the secret key.",
		};
	}
};

export const createSecretKey = async (userId, secretOneLinkKey) => {
	try {
		// const hashedSecretKey = await hashPassword(secretOneLinkKey);
		const user = await UserModel.findByIdAndUpdate(
			userId,
			{ secretKey: secretOneLinkKey },
			{ new: true }
		);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		return {
			status: 200,
			message: "Secret key created and stored successfully",
			user: user,
		};
	} catch (error) {
		console.error("Error creating and storing secret key:", error);
		return {
			status: 500,
			message: "An error occurred while creating and storing the secret key.",
		};
	}
};

// export const googleLogin = async (credential) => {
// 	try {
// 		const { email } = jwt.decode(credential);
// 		const user = await UserModel.findOne({ email: email });
// 		if (!user) {
// 			return {
// 				status: 202,
// 				message: "User not found.",
// 			};
// 		}
// 		const token = jwt.sign({ userId: user._id, email: user.email }, secretKey);
// 		user.password = undefined;
// 		return {
// 			status: 200,
// 			message: "Google Login successfull",
// 			user: user,
// 			token: token,
// 		};
// 	} catch (error) {
// 		console.error("Error login:", error);
// 		return {
// 			status: 500,
// 			message: "An error occurred while login using google.",
// 		};
// 	}
// };

export const googleLogin = async ({
	access_token,
	refresh_token,
	id_token,
}) => {
	try {
		// Verify id_token and get user info from Google
		const ticket = await client.verifyIdToken({
			idToken: id_token,
			audience: process.env.REACT_APP_GOOGLE_CLIENT_ID,
		});
		const payload = ticket.getPayload();
		const { email } = payload;

		// Find user by email
		let user = await UserModel.findOne({ email });

		if (!user) {
			return {
				status: 202,
				message: "User not found.",
			};
		}

		// Get the current time in the specified time zone
		const currentTime = new Date();
		const expireTime = addMinutes(currentTime, 50); // Add 50 minutes to current time

		// Format the expiration time in the desired time zone (Asia/Kolkata)
		const formattedExpireTime = formatInTimeZone(
			expireTime,
			"Asia/Kolkata",
			"yyyy-MM-dd'T'HH:mm:ss" // Format without offset
		);

		// Update user's meeting tokens
		user.meetingToken = {
			access_token,
			refresh_token,
			id_token,
			expire_in: formattedExpireTime,
		};
		await user.save();

		// Create JWT token
		const token = jwt.sign({ userId: user._id, email: user.email }, secretKey);

		// Remove password from response
		user = user.toObject();
		delete user.password;

		return {
			status: 200,
			message: "Google Login successful",
			user,
			token,
		};
	} catch (error) {
		console.error("Error login:", error);
		return {
			status: 500,
			message: "An error occurred while login using google.",
			error: error.message,
		};
	}
};

export const googleRegister = async (data) => {
	try {
		const user = await UserModel.findOne({ email: data.email });
		if (user) {
			return {
				status: 202,
				message: "User already exists.",
			};
		}
		const newUser = new UserModel(data);
		await newUser.save();
		const token = jwt.sign(
			{ userId: newUser._id, email: newUser.email },
			secretKey
		);
		newUser.password = undefined;
		return {
			status: 200,
			message: "Google Register successfull",
			user: newUser,
			token: token,
		};
	} catch (error) {
		console.error("Error Register:", error);
		return {
			status: 500,
			message: "An error occurred while registering using google.",
		};
	}
};

// Update Education
export const updateEducation = async (userId, educationId, updatedData) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		const education = user.recentEducation.id(educationId);
		if (!education) {
			return {
				status: 404,
				message: "Education entry not found",
			};
		}
		if (updatedData?.logo) {
			const { secure_url } = await cloudinary.uploader.upload(
				updatedData.logo,
				{
					folder: `${process.env.CLOUDIANRY_FOLDER}/startUps/logos`,
					format: "webp",
					unique_filename: true,
				}
			);
			updatedData.logo = secure_url;
		}

		education.set(updatedData);
		await user.save();

		return {
			status: 200,
			message: "Education updated",
			data: user.recentEducation,
		};
	} catch (error) {
		console.error("Error updating education:", error);
		return {
			status: 500,
			message: "An error occurred while updating education.",
		};
	}
};

// Delete Education
export const deleteEducation = async (userId, educationId) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		user.recentEducation = user.recentEducation.filter(
			(education) => education._id.toString() !== educationId
		);
		await user.save();
		return {
			status: 200,
			message: "Education deleted",
			data: user.recentEducation,
		};
	} catch (error) {
		console.error("Error deleting education:", error);
		return {
			status: 500,
			message: "An error occurred while deleting education.",
		};
	}
};

// Update Experience
export const updateExperience = async (userId, experienceId, updatedData) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		const experience = user.recentExperience.id(experienceId);
		if (!experience) {
			return {
				status: 404,
				message: "Experience entry not found",
			};
		}
		if (updatedData?.logo) {
			const { secure_url } = await cloudinary.uploader.upload(
				updatedData.logo,
				{
					folder: `${process.env.CLOUDIANRY_FOLDER}/startUps/logos`,
					format: "webp",
					unique_filename: true,
				}
			);
			updatedData.logo = secure_url;
		}

		experience.set(updatedData);
		await user.save();

		return {
			status: 200,
			message: "Experience updated",
			data: user.recentExperience,
		};
	} catch (error) {
		console.error("Error updating experience:", error);
		return {
			status: 500,
			message: "An error occurred while updating experience.",
		};
	}
};

export const deleteExperience = async (userId, experienceId) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		user.recentExperience = user.recentExperience.filter(
			(experience) => experience._id.toString() !== experienceId
		);
		await user.save();
		return {
			status: 200,
			message: "Experience deleted",
			data: user.recentExperience,
		};
	} catch (error) {
		console.error("Error deleting experience:", error);
		return {
			status: 500,
			message: "An error occurred while deleting experience.",
		};
	}
};

export const getUserAnalytics = async (userId) => {
	try {
		const userAnalytics = await connectDB.useranalytics
			.aggregate([
				{
					$match: { userId: ObjectId(userId) },
				},
				{
					$lookup: {
						from: "PostModel", // Assuming this is the name of the posts collection
						localField: "userId", // Match the userId from the User Analytics collection
						foreignField: "userId", // Match against the user field in the posts collection
						as: "posts",
					},
				},
				{
					$lookup: {
						from: "ConnectionModel", // Assuming this is the name of the users collection
						localField: "userId", // Match the userId from the User Analytics collection
						foreignField: "receiver", // Assuming connections are stored in an array
						as: "connections",
					},
				},
				{
					$project: {
						userId: 1,
						publicProfileViews: 1,
						detailedProfileViews: 1,
						posts: 1,
						connections: 1, // Include connections in the final output
					},
				},
			])
			.toArray(); // Convert the cursor to an array

		return {
			status: 200,
			message: "User  analytics retrieved",
			data: userAnalytics, // Return the result of the aggregation
		};
	} catch (error) {
		console.error("Error getting user analytics:", error);
		return {
			status: 500,
			message: "An error occurred while getting user analytics.",
		};
	}
};

export const getUserProfileViews = async (userId) => {
	try {
		const userAnalytics = await UserAnalyticsModel.findOne({
			userId: new ObjectId(userId),
		}); // Use new ObjectId

		if (!userAnalytics) {
			return {
				status: 404,
				message: "User  analytics not found",
			};
		}

		return {
			status: 200,
			message: "User  profile views retrieved",
			data: userAnalytics,
		};
	} catch (error) {
		console.error("Error getting user profile views:", error.message); // Log the error message
		return {
			status: 500,
			message: "An error occurred while getting user profile views.",
		};
	}
};

export const saveMeetingToken = async (userId, token) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}

		console.log("token", token);
		// Save the access token and other relevant fields
		// user.meetingToken = {
		// 	access_token: token.access_token,
		// 	token_type: token.token_type,
		// 	expires_in: token.expires_in,
		// 	scope: token.scope,
		// };

		// await user.save();
		return {
			status: 200,
			message: "Meeting token saved",
		};
	} catch (error) {
		console.error("Error saving meeting token:", error);
		return {
			status: 500,
			message: "An error occurred while saving meeting token.",
		};
	}
};

export const getUserMilestones = async (userId) => {
	try {
		// Validate userId
		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return {
				status: 400,
				message: "Invalid user ID",
			};
		}

		// Fetch all data concurrently
		const [user, posts, thoughts, bookings, events] = await Promise.all([
			UserModel.findById(userId),
			PostModel.find({ user: userId }),
			ThoughtModel.find({ "answer.user": userId }),
			BookingModel.find({ userId }),
			EventModel.find({ userId }),
		]);

		// If user doesn't exist, return early
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}

		// Filter polls from posts
		const userPolls = posts.filter(
			(post) =>
				post.pollOptions &&
				Array.isArray(post.pollOptions) &&
				post.pollOptions.length > 1
		);

		return {
			status: 200,
			message: "User milestones retrieved",
			data: {
				user,
				userPosts: posts,
				userPolls,
				userThoughts: thoughts,
				userBookings: bookings,
				events,
			},
		};
	} catch (error) {
		console.error("Error getting user milestones:", error);
		return {
			status: 500,
			message: "Error fetching user data",
		};
	}
};

export const updateTopVoice = async (userId) => {
	try {
		const today = new Date();
		const expiryDate = new Date(today);
		expiryDate.setDate(today.getDate() + 30); // Set expiry to today's date + 30 days

		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User  not found",
			};
		}

		let updatedUser;
		if (user.isTopVoice) {
			// Update expiry date
			updatedUser = await UserModel.updateOne(
				{ _id: new ObjectId(userId) },
				{
					$set: {
						"isTopVoice.status": true,
						"isTopVoice.expiry": expiryDate,
					},
				}
			);
		} else {
			// User is not a top voice, create it
			updatedUser = await UserModel.updateOne(
				{ _id: new ObjectId(userId) },
				{
					$set: {
						isTopVoice: {
							status: true,
							expiry: expiryDate,
						},
					},
				},
				{ upsert: true }
			);
		}

		if (updatedUser.modifiedCount > 0 || updatedUser.upsertedCount > 0) {
			const updatedUserData = await UserModel.findById(userId); // Fetch the updated user data
			return {
				status: 200,
				message: "Top voice updated",
				user: updatedUserData,
			};
		} else {
			return {
				status: 400,
				message: "No changes made",
			};
		}
	} catch (error) {
		console.error("Error updating top voice:", error);
		return {
			status: 500,
			message: "Error updating top voice",
		};
	}
};

export const getInactiveFounders = async () => {
	try {
		const currentDate = new Date();
		const sevenDaysAgo = new Date(currentDate);
		sevenDaysAgo.setDate(currentDate.getDate() - 7);
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(new Date().getDate() - 30);

		// Get all startups with their founders
		const startups = await StartUpModel.find().populate({
			path: "founderId",
			select: "email firstName lastName"
		});

		const inactiveFounders7Days = [];
		const inactiveFounders30Days = [];

		// Process each startup/founder
		for (const startup of startups) {
			if (!startup.founderId) continue;

			const founder = startup.founderId;

			// Get founder's posts
			const founderPosts = await PostModel.find({
				user: founder._id
			}).sort({ createdAt: -1 });

			if (founderPosts.length > 0) {
				const latestPostDate = new Date(founderPosts[0].createdAt);
				const isActiveIn7Days = latestPostDate >= sevenDaysAgo;
				const isActiveIn30Days = latestPostDate >= thirtyDaysAgo;

				// Add to 7-day inactive list if no posts in last 7 days but has posts in last 30 days
				if (!isActiveIn7Days && isActiveIn30Days) {
					inactiveFounders7Days.push({
						user_first_name: founder.firstName,
						user_last_name: founder.lastName,
						user_email: founder.email
					});
				}

				// Add to 30-day inactive list if no posts in last 30 days
				if (!isActiveIn30Days) {
					inactiveFounders30Days.push({
						user_first_name: founder.firstName,
						user_last_name: founder.lastName,
						user_email: founder.email
					});
				}
			} else {
				// No posts at all - add to 30-day inactive list
				inactiveFounders30Days.push({
					user_first_name: founder.firstName,
					user_last_name: founder.lastName,
						user_email: founder.email
				});
			}
		}

		return {
			inactiveFounders7Days,
			inactiveFounders30Days
		};
	} catch (error) {
		console.error("Error fetching inactive founders:", error);
		return {
			status: 500,
			message: "Error fetching inactive founders"
		};
	}
};

export const sendMailtoInactiveFounders = async () => {
	try {
		const { inactiveFounders7Days, inactiveFounders30Days } =
			await getInactiveFounders();

		for (const founder of inactiveFounders7Days) {
			console.log("sending mail to 7 day inactive user");
			const emailContent = await ejs.renderFile("./public/7dayemail.ejs", {
				firstName: founder.user_first_name,
				lastName: founder.user_last_name,
				dashboardLink: "https://thecapitalhub.in/home",
			});

			// Send email using Nodemailer
			await transporter.sendMail({
				from: `"The Capital Hub" <${process.env.EMAIL_USER}>`,
				to: founder.user_email,
				subject: "Inactive Reminder",
				html: emailContent,
			});
		}

		for (const founder of inactiveFounders30Days) {
			console.log("sending mail to 30 days inactive users");
			const emailContent = await ejs.renderFile("./public/30dayemail.ejs", {
				firstName: founder.user_first_name,
				lastName: founder.user_last_name,
				dashboardLink: "https://thecapitalhub.in/home",
			});

			// Send email using Nodemailer
			await transporter.sendMail({
				from: `"The Capital Hub" <${process.env.EMAIL_USER}>`,
				to: founder.user_email,
				subject: "Re-engagement Reminder",
				html: emailContent,
			});
		}

		return "Emails sent";
	} catch (error) {
		console.error("Error sending emails:", error);
		return error;
	}
};

export const getUserAvaibility = async (userId) => {
	try {
		const user = await UserModel.findById(userId);
		if (!user) {
			return {
				status: 404,
				message: "User not found",
			};
		}
		const availability = await AvailabilityModel.findOne({
			userId: user._id,
		}).populate("userId");
		// console.log("availability", availability);
		return {
			status: 200,
			message: "User availability fetched successfully",
			availability,
		};
	} catch (error) {
		console.error("Error getting user availability:", error);
		return {
			status: 500,
			message: "Error getting user availability",
		};
	}
};

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

export const createSubscriptionPayment = async (userData) => {
	try {
		const orderId = await generateOrderId();
		const mobileNumber = userData.mobileNumber.replace('+91', '');
		const request = {
			order_amount: 1999.00, 
			order_currency: "INR",
			order_id: orderId,
			customer_details: {
				customer_id: userData.firstName + (mobileNumber? mobileNumber : userData.mobileNumber),
				customer_name: `${userData.firstName} ${userData.lastName}`.trim(),
				customer_email: userData.email.toLowerCase().trim(),
				customer_phone: userData.mobileNumber.trim(),
			},
			order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		};

		const response = await Cashfree.PGCreateOrder("2023-08-01", request);

		return {
			status: 200,
			data: {
				orderId: response.data.order_id,
				paymentSessionId: response.data.payment_session_id,
			},
		};
	} catch (error) {
		console.error("Error in creating subscription payment:", error);
		throw new Error(error.message);
	}
};

export const verifySubscriptionPayment = async (orderId, userId) => {
	try {
		const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);
		
		if (!response?.data) {
			throw new Error("Invalid response from payment gateway");
		}

		const paymentStatus = response.data[0].payment_status;

		if (paymentStatus === "SUCCESS") {
			await UserModel.findByIdAndUpdate(userId, {
				isSubscribed: true,
				subscriptionType: "Pro",
				trialStartDate: new Date(),
			});
		}

		return {
			status: 200,
			data: {
				orderId,
				paymentId: response.data[0].cf_payment_id,
				amount: response.data[0].payment_amount,
				currency: response.data[0].payment_currency,
				status: paymentStatus,
				isPaymentSuccessful: paymentStatus === "SUCCESS",
				paymentMethod: response.data[0].payment_group,
				paymentTime: response.data[0].payment_completion_time,
			},
		};
	} catch (error) {
		throw new Error(error.message);
	}
};

export const createUserAndInitiatePayment = async (userData) => {
	try {
		const { firstName, lastName, email, mobileNumber, userType } = userData;

		// Create new user
		const user = new UserModel({
			firstName,
			lastName,
			email,
			phoneNumber: mobileNumber,
			userType,
			isInvestor: userType === 'investor',
			userName: `${firstName}.${lastName}`,
			userStatus: "active"
		});

		await user.save();

		// Create payment session
		const paymentResponse = await createSubscriptionPayment(userData);
		
		return {
			status: 200,
			data: {
				...paymentResponse.data,
				userId: user._id
			}
		};
	} catch (error) {
		console.error(error);
		throw new Error(error.message);
	}
};
