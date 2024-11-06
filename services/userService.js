import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;
import { UserModel } from "../models/User.js";
import { PostModel } from "../models/Post.js";
import { UserAnalyticsModel } from "../models/UserAnalytics.js";
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

const adminMail = "learn.capitalhub@gmail.com";
import connectDB from "../constants/db.js";

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
		const existingUser = await UserModel.findOne({
			$or: [{ email: user.email }, { phoneNumber: user.phoneNumber }],
		});
		if (existingUser) {
			throw new Error("Existing user. Please log in");
		}
		const newUser = new UserModel(user);
		await newUser.save();
		return newUser;
	} catch (error) {
		throw error;
	}
};

export const getUserByUserName = async (username) => {
	try {
		if (!username) {
			// console.log("No username provided.");
			return {
				status: 404,
				message: "No user exists",
			};
		}

		// console.log(`Searching for user with username: ${username}`);
		const response = await UserModel.findOne({ userName: username })
			.populate("startUp")
			.populate("investor")
			.populate("connections")
			.populate("featuredPosts")
			.populate("achievements")
			.populate("savedPosts.posts");

		if (!response) {
			// console.log(`No user found with username: ${username}`);
			return {
				status: 404,
				message: "No user exists",
			};
		}

		// console.log(`User found: ${response}`);
		return {
			status: 200,
			message: response,
		};
	} catch (error) {
		// console.error("An error occurred while finding the user", error);
		return {
			status: 500,
			message: "Internal server error",
		};
	}
};

export const loginUserService = async ({ phoneNumber, password }) => {
	const user = await UserModel.findOne({
		phoneNumber,
		userStatus: "active",
	}).populate({
		path: "startUp",
		select: "company logo",
	});

	if (!user) {
		const existingUser = await UserModel.findOne({
			$or: [{ email: phoneNumber }, { userName: phoneNumber }],
		});
		console.log(existingUser);
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
		const data = await UserModel.findByIdAndUpdate(
			userId,
			{ ...newData },
			{ new: true }
		);
		return {
			status: 200,
			message: "User updated succesfully",
			data,
		};
	} catch (error) {
		console.log(error);
		return {
			status: 500,
			message: "An error occurred while updating the bio.",
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
			limit,
		} = filters;

		// for startups
		if (type === "startup") {
			const query = {};
			if (sector) {
				query.sector = sector;
			}
			if (city) {
				query.location = city;
			}
			if (size) {
				query.noOfEmployees = { $gte: size };
			}
			if (fundingRaised) {
				query.fundingRaised = fundingRaised;
			}
			if (productStage) {
				query.productStage = productStage;
			}
			if (stage) {
				query.stage = stage;
			}
			if (age) {
				query.age = age;
			}
			if (searchQuery) {
				query.company = { $regex: new RegExp(`^${searchQuery}`, "i") };
			}
			const startups = await StartUpModel.find(query)
				.populate("founderId")
				.limit(limit)
				.skip((page - 1) * limit);
			return {
				status: 200,
				message: "Startup data retrieved",
				data: startups,
			};

			// for investors
		} else if (type === "investor") {
			const query = {};
			if (sector) {
				query.sector = sector;
			}
			if (city) {
				query.location = city;
			}
			if (investmentStage) {
				query.stage = investmentStage;
			}
			const investors = await InvestorModel.find(query);
			const users = await UserModel.find();
			const filteredUsers = users.filter((user) => {
				return investors.some(
					(investor) => user?.investor?.toString() === investor._id.toString()
				);
			});
			const founderIds = filteredUsers.map((investor) => investor._id);
			const founderQuery = { userStatus: "active" };
			if (gender) {
				founderQuery.gender = gender;
			}
			if (sectorPreference) {
				founderQuery.sectorPreferences = { $in: [sectorPreference] };
			}
			if (investmentSize) {
				founderQuery.investmentSize = investmentSize;
			}

			if (searchQuery) {
				founderQuery.firstName = { $regex: new RegExp(`^${searchQuery}`, "i") };
			}
			const founders = await UserModel.find({
				_id: { $in: founderIds },
				...founderQuery,
			})
				.select("-password")
				.populate("investor")
				.limit(limit)
				.skip((page - 1) * limit);
			return {
				status: 200,
				message: "Investors data retrieved",
				data: founders,
			};

			// for founder
		} else if (type === "founder") {
			const query = {};
			if (sector) {
				query.sector = sector;
			}
			if (city) {
				query.location = city;
			}
			const startups = await StartUpModel.find(query);
			const founderIds = startups.map((startup) => startup.founderId);
			const founderQuery = {};
			if (gender) {
				founderQuery.gender = gender;
			}
			if (previousExits) {
				founderQuery.previousExits = previousExits;
			}
			if (yearsOfExperience) {
				founderQuery.yearsOfExperience = yearsOfExperience;
			}
			if (education) {
				founderQuery.education = education;
			}
			if (diversityMetrics) {
				founderQuery.diversityMetrics = { $in: [diversityMetrics] };
			}
			if (searchQuery) {
				founderQuery.firstName = { $regex: new RegExp(`^${searchQuery}`, "i") };
			}
			const founders = await UserModel.find({
				_id: { $in: founderIds },
				...founderQuery,
				userStatus: "active",
			})
				.select("-password")
				.populate("startUp")
				.limit(limit)
				.skip((page - 1) * limit);
			return {
				status: 200,
				message: "Founder data retrieved",
				data: founders,
			};

			// for VC
		} else if (type === "vc") {
			const query = {};
			if (sector_focus) {
				query.sector_focus = sector_focus;
			}
			if (stage_focus) {
				query.stage_focus = stage_focus;
			}
			if (ticket_size) {
				query.ticket_size = { $gte: size };
			}

			if (searchQuery) {
				query.name = { $regex: new RegExp(`^${searchQuery}`, "i") };
			}
			const VC = await VCModel.find(query)
				.limit(limit)
				.skip((page - 1) * limit);
			console.log(VC);
			return {
				status: 200,
				message: "VC data retrieved",
				data: VC,
			};
		} else {
			return {
				status: 400,
				message: "Invalid 'type' parameter",
			};
		}
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

export const googleLogin = async (credential) => {
	try {
		const { email } = jwt.decode(credential);
		const user = await UserModel.findOne({ email: email });
		if (!user) {
			return {
				status: 202,
				message: "User not found.",
			};
		}
		const token = jwt.sign({ userId: user._id, email: user.email }, secretKey);
		user.password = undefined;
		return {
			status: 200,
			message: "Google Login successfull",
			user: user,
			token: token,
		};
	} catch (error) {
		console.error("Error login:", error);
		return {
			status: 500,
			message: "An error occurred while login using google.",
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

// export const getUserProfileViews = async (userId) => {
// 	try {
// 		const userAnalytics = await UserAnalyticsModel.findOne({
// 			userId: ObjectId(userId),
// 		});

// 		if (!userAnalytics) {
// 			return {
// 				status: 404,
// 				message: "User analytics not found",
// 			};
// 		}

// 		return {
// 			status: 200,
// 			message: "User profile views retrieved",
// 			data: userAnalytics,
// 		};
// 	} catch (error) {
// 		console.error("Error getting user profile views:", error);
// 		return {
// 			status: 500,
// 			message: "An error occurred while getting user profile views.",
// 		};
// 	}
// };
