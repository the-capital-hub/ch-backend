import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import ejs from "ejs";
import {
	getUserByUsernameOrOneLinkId,
	registerUserService,
	getUsersService,
	getUserAnalyticsDataByUserName,
	loginUserService,
	getUserById,
	updateUserData,
	updateUserById,
	changePassword,
	requestPasswordReset,
	resetPassword,
	searchUsers,
	addEducation,
	addExperience,
	addStartupToUser,
	addUserAsInvestor,
	getExplore,
	getExploreFilters,
	validateSecretKey,
	createSecretKey,
	googleLogin,
	googleRegister,
	updateEducation,
	updateExperience,
	deleteEducation,
	deleteExperience,
	blockUser,
	getUserByIdBody,
	unblockUser,
	getUserEmailById,
	getUserAnalytics,
	getUserProfileViews,
	saveMeetingToken,
	getUserMilestones,
	updateTopVoice,
	getInactiveFounders,
	sendMailtoInactiveFounders,
	getUserAvaibility,
	createSubscriptionPayment,
	verifySubscriptionPayment,
	createUserAndInitiatePayment,
	getRawUsers,
	getRawUserById,
	getUserByPhoneNumber,
	getUserByEmail,
} from "../services/userService.js";

import { sendMail } from "../utils/mailHelper.js";
import { secretKey } from "../constants/config.js";
import { UserModel } from "../models/User.js";
import { StartUpModel } from "../models/startUp.js";
import bcrypt from "bcrypt";
import xlsx from "xlsx";
import axios from "axios";
import { InvestorModel } from "../models/Investor.js";
import { UserAnalyticsModel } from "../models/UserAnalytics.js";
import { get } from "mongoose";
import fetch from "node-fetch";
import moment from "moment";

//transporter for nodemailer
const transporter = nodemailer.createTransport({
	service: "gmail",
	secure: false,
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

export const createUser = async (req, res) => {
	try {
		const file = req.file;

		if (!file) {
			return res.status(400).send("No file uploaded.");
		}
		const generateUniqueOneLink = async (baseLink, model) => {
			let uniqueLink = baseLink;
			let count = 1;
			while (await model.countDocuments({ oneLink: uniqueLink })) {
				uniqueLink = baseLink + count++;
			}
			return uniqueLink;
		};
		// Read the file from disk using xlsx.readFile
		const workbook = xlsx.readFile(file.path);

		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const jsonData = xlsx.utils.sheet_to_json(sheet);
		const addUser = async (user) => {
			const userData = await UserModel.create({
				firstName: user.firstname,
				lastName: user.lastName,
				email: user.email,
				phoneNumber: user.mobileNumber,
				bio: user.bio,
				gender: user.gender === "M" ? "Male" : "Female",
				isInvestor: user.userType === "Investor" ? true : false,
				linkedin: user.user_inkedin,
				location: user.location,
				userName:
					user.firstname +
					"_" +
					Math.floor(Math.random() * Math.pow(10, 4)).toString(),
				userStatus: "active",
				registeredFrom: user.registeredFrom,
			});
			if (userData._id) {
				if (user.userType === "Investor") {
					let existingCompany = await InvestorModel.findOne({
						founderId: userData._id,
					});
					let baseOneLink = user.companyName.split(" ").join("").toLowerCase();
					const uniqueOneLink = await generateUniqueOneLink(
						baseOneLink,
						InvestorModel
					);

					if (existingCompany) {
						existingCompany.set({
							companyName: user.companyName,
							industry: user.industry,
							description: user.pcomany_bio,
							oneLink: uniqueOneLink,
						});
						await existingCompany.save();
					} else {
						const newInvestor = await InvestorModel.create({
							companyName: user.companyName,
							industry: user.industry,
							description: user.pcomany_bio,
							oneLink: uniqueOneLink,
							founderId: userData._id,
							linkedin: user.company_inkedin,
							logo: user.logo,
						});
						const { founderId } = newInvestor;
						await UserModel.findOneAndUpdate(
							{ _id: founderId },
							{
								investor: newInvestor._id,
								location: user.location,
							}
						);
					}
				} else {
					let existingCompany = await StartUpModel.findOne({
						founderId: userData._id,
					});
					let baseOneLink = user.companyName.split(" ").join("").toLowerCase();
					const uniqueOneLink = await generateUniqueOneLink(
						baseOneLink,
						StartUpModel
					);

					if (existingCompany) {
						existingCompany.set({
							location: user.location,
							company: user.companyName,
							industry: user.industry,
							designation: user.designation,
							oneLink: uniqueOneLink,
							description: user.pcomany_bio,
						});
						await existingCompany.save();
					} else {
						const newStartUp = new StartUpModel({
							companyName: user.companyName,
							industry: user.industry,
							description: user.pcomany_bio,
							founderId: userData._id,
							oneLink: uniqueOneLink,
							linkedin: user.company_inkedin,
							logo: user.logo,
						});

						await newStartUp.save();
						const { founderId } = newStartUp;
						await UserModel.findOneAndUpdate(
							{ _id: founderId },
							{
								startUp: newStartUp._id,
							}
						);
					}
				}
			}
		};
		jsonData.forEach((item) => {
			addUser(item);
		});

		return res.status(200).send(jsonData);
	} catch (err) {
		return res.status(200).send(err.message);
	}
};

export const getUserAnalyticsDataByUserNameController = async (req, res) => {
	//getUserAnalyticsDataByUserName
	try {
		const { username } = req.params;

		if (!username) {
			console.log("Username not provided in the request body.");
			return res.status(200).send({ message: "User not found" });
		}

		// console.log(`Received request to get user by username: ${username}`);

		const getUser = await getUserAnalyticsDataByUserName(username);

		if (getUser.status === 404) {
			return res.status(404).send({ message: "User not found" });
		}

		return res.status(200).send(getUser.message);
	} catch (error) {
		console.error("Error in getUsersByUserNameController:", error);
		return res.status(500).send({ message: "Internal server error" });
	}
};

export const getUserByUsernameOrOneLinkIdController = async (req, res) => {
	try {
		const { username } = req.params;
		const { onelinkId } = req.params;
		const response = await getUserByUsernameOrOneLinkId(username, onelinkId);
		return res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		return res.status(500).send({ message: "Internal server error" });
	}
};

export const addInvestor = async (req, res) => {
	try {
		const file = req.file;

		if (!file) {
			return res.status(400).send("No file uploaded.");
		}
		const generateUniqueOneLink = async (baseLink, model) => {
			let uniqueLink = baseLink;
			let count = 1;
			while (await model.countDocuments({ oneLink: uniqueLink })) {
				uniqueLink = baseLink + count++;
			}
			return uniqueLink;
		};
		// Read the file from disk using xlsx.readFile
		const workbook = xlsx.readFile(file.path);

		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const jsonData = xlsx.utils.sheet_to_json(sheet);
		const addUser = async (user) => {
			const userData = await UserModel.create({
				firstName: user.firstname,
				lastName: user.lastname,
				email: user.email,
				//phoneNumber: user.mobileNumber,
				bio: user.notes,
				//gender: user.gender === "M"? "Male":"Female",
				isInvestor: true,
				linkedin: user.urls,
				//location:user.location,
				userName:
					user.firstname +
					"_" +
					Math.floor(Math.random() * Math.pow(10, 4)).toString(),
				userStatus: "active",
				designation: user.jobTitle,
			});
			if (userData._id && user.companies) {
				let existingCompany = await InvestorModel.findOne({
					founderId: userData._id,
				});
				let baseOneLink = user.companies.split(" ").join("").toLowerCase();
				const uniqueOneLink = await generateUniqueOneLink(
					baseOneLink,
					InvestorModel
				);

				if (existingCompany) {
					existingCompany.set({
						companyName: user.companies,
						// industry:user.industry,
						// description: user.pcomany_bio,
						oneLink: uniqueOneLink,
					});
					await existingCompany.save();
				} else {
					const newInvestor = await InvestorModel.create({
						companyName: user.companies,
						//industry:user.industry,
						//description: user.pcomany_bio,
						oneLink: uniqueOneLink,
						founderId: userData._id,
						//linkedin:user.company_inkedin,
						//logo:user.logo,
					});
					const { founderId } = newInvestor;
					await UserModel.findOneAndUpdate(
						{ _id: founderId },
						{
							investor: newInvestor._id,
							//location:user.location,
						}
					);
				}
			}
		};
		jsonData.forEach((item) => {
			addUser(item);
		});

		return res.status(200).send(jsonData);
	} catch (err) {
		return res.status(200).send(err.message);
	}
};

export const addStartUp_data = async (req, res) => {
	try {
		const file = req.file;

		if (!file) {
			return res.status(400).send("No file uploaded.");
		}
		const generateUniqueOneLink = async (baseLink, model) => {
			let uniqueLink = baseLink;
			let count = 1;
			while (await model.countDocuments({ oneLink: uniqueLink })) {
				uniqueLink = baseLink + count++;
			}
			return uniqueLink;
		};
		// Read the file from disk using xlsx.readFile
		const workbook = xlsx.readFile(file.path);

		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const jsonData = xlsx.utils.sheet_to_json(sheet);
		const addUser = async (user) => {
			const userData = await UserModel.create({
				firstName: user.firstname,
				lastName: user.lastName,
				email: user.email,
				//phoneNumber: user.mobileNumber,
				//bio: user.notes,
				//gender: user.gender === "M"? "Male":"Female",
				isInvestor: true,
				linkedin: user.luser_inkedin,
				//location:user.location,
				userName:
					user.firstname +
					"_" +
					Math.floor(Math.random() * Math.pow(10, 4)).toString(),
				userStatus: "active",
				designation: user.bio,
			});
			if (userData._id && user.pcompany_bio) {
				let baseOneLink = user.pcompany_bio.split(" ").join("").toLowerCase();
				const uniqueOneLink = await generateUniqueOneLink(
					baseOneLink,
					StartUpModel
				);
				const isExist = await StartUpModel.findOne({ oneLink: uniqueOneLink });
				console.log(isExist?._id);
				if (isExist) {
					await UserModel.findOneAndUpdate(
						{ _id: userData._id },
						{
							startUp: isExist._id,
						}
					);
				} else {
					const newStartUp = new StartUpModel({
						company: user.pcompany_bio,
						//industry: user.industry,
						//description: user.pcomany_bio,
						founderId: userData._id,
						oneLink: uniqueOneLink,
						//linkedin: user.company_inkedin,
						//logo: user.logo,
					});

					await newStartUp.save();
					const { founderId } = newStartUp;
					await UserModel.findOneAndUpdate(
						{ _id: founderId },
						{
							startUp: newStartUp._id,
						}
					);
				}
			}
		};
		jsonData.forEach((item) => {
			addUser(item);
		});
		return res.status(200).send(jsonData);
	} catch (err) {
		return res.status(200).send(err.message);
	}
};
export const getUsersController = async (req, res, next) => {
	try {
		const getUser = await getUsersService();
		return res.status(200).json(getUser);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Failed to fetch data" });
	}
};
export const sendOTP = async (req, res) => {
	try {
		const response = await axios.post(
			"https://auth.otpless.app/auth/otp/v1/send",
			{
				phoneNumber: req.body.phoneNumber,
				otpLength: 6,
				channel: "SMS",
				expiry: 600,
			},
			{
				headers: {
					clientId: process.env.CLIENT_ID,
					clientSecret: process.env.CLIENT_SECRET,
					"Content-Type": "application/json",
				},
			}
		);
		return res.status(200).send({
			orderId: response.data.orderId,
			message: "OTP Send successfully",
		});
	} catch (err) {
		console.log(err);
		return res.status(500).json({ error: "Failed to fetch data" });
	}
};
export const verifyOtp = async (req, res) => {
	try {
		const response = await axios.post(
			"https://auth.otpless.app/auth/otp/v1/verify",
			{
				orderId: req.body.orderId,
				otp: req.body.otp,
				phoneNumber: req.body.phoneNumber,
			},
			{
				headers: {
					clientId: process.env.CLIENT_ID,
					clientSecret: process.env.CLIENT_SECRET,
					"Content-Type": "application/json",
				},
			}
		);
		if (response.data.isOTPVerified) {
			return res.status(200).send({
				isOTPVerified: response.data.isOTPVerified,
				message: "OTP verified",
			});
		} else {
			throw new Error("OTP Verification failed");
		}
	} catch (err) {
		console.log(err);
		return res.status(500).json({ error: "Failed to fetch data" });
	}
};

export const blockUserController = async (req, res) => {
	try {
		const { userId, blockedUserId } = req.body;
		const response = await blockUser(userId, blockedUserId);
		return res.status(response.status).send(response);
	} catch (error) {
		console.error(
			"Error during blocking users",
			error.response ? error.response.data : error.message
		);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const unblockUserController = async (req, res) => {
	try {
		const { userId, unblockUserId } = req.body;
		const response = await unblockUser(userId, unblockUserId);
		return res.status(response.status).send(response);
	} catch (error) {
		console.error(
			"Error during unblocking users",
			error.response ? error.response.data : error.message
		);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

// get user by id from body
export const getUserByIdBodyController = async (req, res) => {
	try {
		const { userId } = req.body;
		const response = await getUserByIdBody(userId);
		return res.status(response.status).send(response);
	} catch (error) {
		console.error(
			"Error",
			error.response ? error.response.data : error.message
		);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const registerUserController = async (req, res, next) => {
	try {
		const {
			firstName,
			lastName,
			email,
			password,
			phoneNumber,
			designation,
			gender,
			isInvestor,
			company,
			industry,
			location,
			foundingAsk,
			previousFounding,
			fundedTillDate,
			portfolio,
			chequeSize,
			linkedin,
			userType,
		} = req.body;

		const newUser = await registerUserService({
			firstName,
			lastName,
			email,
			password,
			phoneNumber,
			isInvestor,
			gender,
			linkedin,
			userType,
		});

		const generateUniqueOneLink = async (baseLink, model) => {
			let uniqueLink = baseLink;
			let count = 1;
			while (await model.countDocuments({ oneLink: uniqueLink })) {
				uniqueLink = baseLink + count++;
			}
			return uniqueLink;
		};

		if (isInvestor) {
			let existingCompany = await InvestorModel.findOne({
				founderId: newUser._id,
			});
			let baseOneLink = company.split(" ").join("").toLowerCase();
			const uniqueOneLink = await generateUniqueOneLink(
				baseOneLink,
				InvestorModel
			);

			if (existingCompany) {
				existingCompany.set({
					companyName: company,
					industry,
					description: portfolio,
					oneLink: uniqueOneLink,
				});
				await existingCompany.save();
				return res
					.status(200)
					.json({ message: "Investor Updated", data: existingCompany });
			}
			const newInvestor = await InvestorModel.create({
				companyName: company,
				industry,
				description: portfolio,
				oneLink: uniqueOneLink,
				founderId: newUser._id,
				linkedin,
			});
			//await newInvestor.save();
			const { founderId } = newInvestor;
			const user = await UserModel.findOneAndUpdate(
				{ _id: founderId },
				{
					investor: newInvestor._id,
					location,
				}
			);
			return res
				.status(201)
				.json({ message: "User added successfully", data: newUser });
		} else {
			let existingCompany = await StartUpModel.findOne({
				founderId: newUser._id,
			});
			let baseOneLink = company.split(" ").join("").toLowerCase();
			const uniqueOneLink = await generateUniqueOneLink(
				baseOneLink,
				StartUpModel
			);

			if (existingCompany) {
				existingCompany.set({
					location,
					foundingAsk,
					company,
					industry,
					designation,
					oneLink: uniqueOneLink,
					founderId: newUser._id,
				});
				await existingCompany.save();
				return res
					.status(200)
					.json({ message: "Startup Updated", data: existingCompany });
			}

			const newStartUp = new StartUpModel({
				...req.body,
				oneLink: uniqueOneLink,
			});

			await newStartUp.save();
			const { founderId } = newStartUp;
			await UserModel.findOneAndUpdate(
				{ _id: founderId },
				{
					startUp: newStartUp._id,
				}
			);
			const token = jwt.sign(
				{ userId: newUser._id, phoneNumber: newUser.phoneNumber },
				secretKey
			);
			return res
				.status(201)
				.json({ message: "User added successfully", data: newUser, token });
		}
	} catch ({ message }) {
		console.log(message);
		res.status(409).json({
			success: false,
			operational: true,
			message,
		});
	}
};

export const createUserController = async (req, res, next) => {
	try {
		const {
			firstName,
			lastName,
			email,
			phoneNumber,
			userType,
			isInvestor,
			registeredFrom,
		} = req.body;

		const newUser = await registerUserService({
			firstName,
			lastName,
			email,
			phoneNumber,
			userType,
			isInvestor,
			registeredFrom,
		});

		return res
			.status(201)
			.json({ message: "User added successfully", data: newUser });
	} catch ({ message }) {
		console.log(message);
		res.status(409).json({
			success: false,
			operational: true,
			message,
		});
	}
};

export const handelLinkedin = async (req, res) => {
	try {
		const response = await axios.post(
			"https://www.linkedin.com/oauth/v2/accessToken",
			null,
			{
				params: {
					grant_type: "authorization_code",
					code: req.body.code,
					redirect_uri: "http://localhost:3000/linkedin",
					client_id: process.env.LINKEDIN_CLIENT_ID, // Set these in your environment
					client_secret: process.env.LINKEDIN_CLIENT_SECRET,
				},
			}
		);
		return res.status(200).json({ access_token: response.data.access_token });
	} catch (error) {
		return res
			.status(500)
			.json({ error: error.response ? error.response.data : "Server error" });
	}
};

export const getLinkedInProfile = async (req, res) => {
	try {
		const { accessToken } = req.body;
		console.log(accessToken);
		const response = await axios.get("https://api.linkedin.com/v2/userinfo", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		const api_url = "https://api.linkedin.com/v2/";

		const data = axios.get(
			api_url +
				"me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))",
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);
		const ress = json.loads(data.text);
		console.log(ress);
		return res.status(200).json(response.data);
	} catch (error) {
		console.log(error.message);
		res
			.status(500)
			.json({ error: error.response ? error.response.data : "Server error" });
	}
};
export const loginUserController = async (req, res, next) => {
	try {
		const { phoneNumber, password } = req.body;
		const user = await loginUserService({
			phoneNumber,
			password,
		});

		user.password = undefined;

		const token = jwt.sign(
			{ userId: user._id, phoneNumber: user.phoneNumber },
			secretKey
		);

		return res
			.cookie("token", token)
			.status(200)
			.json({ message: "Login successful", user, token });
	} catch (error) {
		return res
			.status(401)
			.json({ operational: true, success: false, message: error.message });
	}
};

// get user by id
export const getUserByIdController = async (req, res) => {
	try {
		const response = await getUserById(req.params.id);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while creating the company.",
		});
	}
};
export const getUserEmailByIdController = async (req, res) => {
	try {
		const userData = await getUserEmailById(req.params.userId);
		res.status(200).json(userData);
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ message: "An error occurred while getting the user email." });
	}
};

// Update User
export const updateUser = async (req, res) => {
	try {
		const { userId, body: newData } = req;
		const { status, message, data } = await updateUserData({
			userId,
			newData,
		});
		res.status(status).json({ message, data });
	} catch (error) {}
};

export const updateUserByIdController = async (req, res) => {
	try {
		const { userId } = req.params;
		const { status, message, data } = await updateUserById(userId, req.body);
		res.status(status).json({ message, data });
	} catch (error) {}
};

export const changePasswordController = async (req, res) => {
	try {
		const { userId } = req;
		const { newPassword, oldPassword } = req.body;
		const response = await changePassword(userId, { newPassword, oldPassword });
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating password.",
		});
	}
};

export const requestPasswordResetController = async (req, res) => {
	try {
		console.log(req.body);
		const existingUser = await UserModel.findOne({
			$or: [
				{ email: req.body.usernameOrEmail },
				{ userName: req.body.usernameOrEmail },
			],
		});
		if (!existingUser) {
			return res.status(400).send({ message: "User dose not exist" });
		}
		//const response = await requestPasswordReset(email);
		const salt = await bcrypt.genSalt(10);
		const password = await bcrypt.hash(req.body.password.toString(), salt);

		await UserModel.findOneAndUpdate(
			{
				$or: [
					{ email: req.body.usernameOrEmail },
					{ userName: req.body.usernameOrEmail },
				],
			},
			{ password: password }
		);
		return res.status(200).send({ user: existingUser, status: "200" });
	} catch (error) {
		console.error(error);
		return res
			.status(500)
			.json({ message: "An error occurred while requesting a password reset" });
	}
};

export const resetPasswordController = async (req, res) => {
	try {
		const { token, newPassword } = req.body;
		const response = await resetPassword(token, newPassword);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		return res
			.status(500)
			.json({ message: "An error occurred while resetting the password" });
	}
};

export const searchUsersController = async (req, res) => {
	try {
		const { searchQuery } = req.query;
		const response = await searchUsers(searchQuery);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		return res
			.status(500)
			.json({ message: "An error occurred while resetting the password" });
	}
};

// add education
export const addEducationController = async (req, res) => {
	try {
		const { userId } = req.params;
		const response = await addEducation(userId, req.body);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while adding education.",
		});
	}
};

//add experience
export const addExperienceController = async (req, res) => {
	try {
		const { userId } = req.params;
		const response = await addExperience(userId, req.body);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while adding experience.",
		});
	}
};

//add startup to user
export const addStartupToUserController = async (req, res) => {
	try {
		const { userId, startUpId } = req.body;
		const response = await addStartupToUser(userId, startUpId);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while adding startups to user.",
		});
	}
};

export const addUserAsInvestorController = async (req, res) => {
	try {
		const { userId, investorId } = req.body;
		const response = await addUserAsInvestor(userId, investorId);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while adding user as investor.",
		});
	}
};

export const getExploreController = async (req, res) => {
	try {
		const response = await getExplore(req.query);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting explore results.",
		});
	}
};

export const getExploreFiltersController = async (req, res) => {
	try {
		const { type } = req.query;
		const response = await getExploreFilters(type);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting explore results.",
		});
	}
};

export const validateSecretKeyController = async (req, res) => {
	try {
		const { oneLinkId, secretOneLinkKey } = req.body;
		const response = await validateSecretKey({
			oneLinkId,
			secretOneLinkKey,
		});
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while vaidating secret key.",
		});
	}
};

export const createSecretKeyController = async (req, res) => {
	try {
		const { secretOneLinkKey } = req.body;
		const userId = req.userId;
		const response = await createSecretKey(userId, secretOneLinkKey);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while creating secret key.",
		});
	}
};

// export const googleLoginController = async (req, res) => {
// 	try {
// 		const { credential } = req.body;
// 		const response = await googleLogin(credential);
// 		res.status(response.status).send(response);
// 	} catch (error) {
// 		console.error(error);
// 		res.status(500).send({
// 			status: 500,
// 			message: "An error occurred while login.",
// 		});
// 	}
// };
export const googleLoginController = async (req, res) => {
	try {
		console.log("Body", req.body);
		const { credential } = req.body;
		const access_token = credential.access_token;
		const refresh_token = credential.refresh_token;
		const id_token = credential.id_token;
		// console.log("access_token", access_token);
		// console.log("refresh_token", refresh_token);
		// console.log("id_token", id_token);

		if (!access_token || !refresh_token || !id_token) {
			return res.status(400).send({
				status: 400,
				message: "Missing required tokens",
			});
		}

		const response = await googleLogin({
			access_token,
			refresh_token,
			id_token,
		});

		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while login.",
			error: error.message,
		});
	}
};

export const googleRegisterController = async (req, res) => {
	try {
		const { credential } = req.body;
		const response = await googleRegister(credential);
		res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while registering using google.",
		});
	}
};

export const linkedInLoginController = async (req, res) => {
	try {
		const { code, REDIRECT_URI } = req.body;
		const redirectUri = REDIRECT_URI;
		// Exchange code for token
		const tokenResponse = await fetch(
			"https://www.linkedin.com/oauth/v2/accessToken",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code,
					redirect_uri: redirectUri,
					client_id: process.env.REACT_APP_LINKEDIN_CLIENT_ID,
					client_secret: process.env.REACT_APP_LINKEDIN_CLIENT_SECRET,
				}),
			}
		);

		const tokenData = await tokenResponse.json();
		const linkedinToken = tokenData.access_token;
		if (!tokenResponse.ok) {
			throw new Error(tokenData.error || "Failed to exchange code for token");
		}

		// Fetch user profile
		const profileResponse = await fetch(
			"https://api.linkedin.com/v2/userinfo",
			{
				headers: {
					Authorization: `Bearer ${tokenData.access_token}`,
				},
			}
		);

		const profileData = await profileResponse.json();

		const email = profileData.email;
		const linkedinId = profileData.sub;

		// Find or create user
		let user = await UserModel.findOne({ email });

		if (!user) {
			throw new Error("User Does Not Exist");
		}

		const expiryDate = moment().add(30, "days").toISOString(); // 30 days from now

		// Update user with linkedinId
		user.linkedinId = linkedinId; // Set the linkedinId
		user.linkedinTokenExpiryDate = expiryDate;
		user.linkedinToken = linkedinToken;
		await user.save(); // Save the updated user record

		const token = jwt.sign(
			{ userId: user._id, email: user.email },
			process.env.JWT_SECRET_KEY
		);
		user.password = undefined;

		res.json({
			status: 200,
			success: true,
			message: "LinkedIn Login successful",
			user,
			token,
			linkedinToken,
		});
	} catch (error) {
		console.error("LinkedIn authentication error:", error);
		res.status(400).json({
			success: false,
			error: error.message || "Authentication failed",
		});
	}
};

export const updateEducationController = async (req, res) => {
	try {
		const userId = req.userId;
		const { educationId } = req.params;
		const response = await updateEducation(userId, educationId, req.body);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating education.",
		});
	}
};

export const deleteEducationController = async (req, res) => {
	try {
		const userId = req.userId;
		const { educationId } = req.params;
		const response = await deleteEducation(userId, educationId);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while deleting education.",
		});
	}
};

export const updateExperienceController = async (req, res) => {
	try {
		const userId = req.userId;
		const { experienceId } = req.params;
		const response = await updateExperience(userId, experienceId, req.body);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating experience.",
		});
	}
};

export const deleteExperienceController = async (req, res) => {
	try {
		const userId = req.userId;
		const { experienceId } = req.params;
		const response = await deleteExperience(userId, experienceId);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while deleting experience.",
		});
	}
};

export const getUserAnalyticsController = async (req, res) => {
	try {
		const userId = req.params.userId;
		const response = await getUserAnalytics(userId);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting user analytics.",
		});
	}
};

export const getUserProfileViewsController = async (req, res) => {
	try {
		const userId = req.params.userId;
		console.log("userId from getUserProfileViewsController: ", userId);
		const response = await getUserProfileViews(userId);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting user profile views.",
		});
	}
};

export const saveMeetingTokenController = async (req, res) => {
	try {
		const userId = req.userId;
		// const { token } = req.body;
		const response = await saveMeetingToken(userId, req.body);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while saving meeting token.",
		});
	}
};

export const getUserMilestonesController = async (req, res) => {
	try {
		const { userId } = req;
		const response = await getUserMilestones(userId);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting user milestones.",
		});
	}
};

export const updateTopVoiceController = async (req, res) => {
	try {
		const { userId } = req;
		const response = await updateTopVoice(userId);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating top voice.",
		});
	}
};

export const getInactiveFounderController = async (req, res) => {
	try {
		const response = await getInactiveFounders();
		res.send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while updating top voice.",
		});
	}
};

export const getUserAvaibilityController = async (req, res) => {
	try {
		const { userId } = req;
		const response = await getUserAvaibility(userId);
		res.status(response.status).send(response);
		return response;
	} catch (error) {
		console.error(error);
		res.status(500).send({
			status: 500,
			message: "An error occurred while getting user milestones.",
		});
	}
};

// New function to send report email
export const sendReportEmail = async (req, res) => {
	try {
		const {
			postPublicLink,
			postId,
			reportReason,
			reporterEmail,
			reporterId,
			reportTime,
			email,
		} = req.body;

		// Validate required fields
		if (
			!postPublicLink ||
			!postId ||
			!reportReason ||
			!reporterEmail ||
			!reporterId ||
			!reportTime
		) {
			return res.status(400).send("All fields are required.");
		}

		// Prepare email content
		const emailContent = await ejs.renderFile("./public/reportmail.ejs", {
			postPublicLink,
			postId,
			reportReason,
			reporterEmail,
			reporterId,
			reportTime,
		});

		// Send email using the nodemailer function
		const response = await transporter.sendMail({
			from: `"The Capital Hub" <${process.env.EMAIL_USER}>`,
			to: email,
			subject: "Post Reported on The Capital Hub",
			html: emailContent,
		});

		return res.status(200).send("Report email sent successfully.");
	} catch (error) {
		console.error("Error sending report email:", error);
		return res
			.status(500)
			.send("An error occurred while sending the report email.");
	}
};

export const createSubscriptionPaymentController = async (req, res) => {
	try {
		const response = await createSubscriptionPayment(req.body);
		return res.status(response.status).send(response);
	} catch (error) {
		console.log(error);
		return res.status(500).send({
			status: 500,
			message: error.message,
		});
	}
};

export const verifySubscriptionPaymentController = async (req, res) => {
	try {
		const { orderId } = req.body;
		const userId = req.userId;
		const response = await verifySubscriptionPayment(orderId, userId);
		return res.status(response.status).send(response);
	} catch (error) {
		console.log(error);
		return res.status(500).send({
			status: 500,
			message: error.message,
		});
	}
};

export const createUserAndInitiatePaymentController = async (req, res) => {
	try {
		const response = await createUserAndInitiatePayment(req.body);
		return res.status(response.status).send(response);
	} catch (error) {
		console.error(error);
		return res.status(500).send({
			status: 500,
			message: error.message,
		});
	}
};

export const registerWithPaymentController = async (req, res) => {
	try {
		const { orderId, ...userData } = req.body;

		// Verify payment first
		const paymentVerification = await verifySubscriptionPayment(orderId);

		if (!paymentVerification.data.isPaymentSuccessful) {
			return res.status(400).send({
				status: 400,
				message: "Payment verification failed",
			});
		}

		// Create user only after payment verification
		const user = new UserModel({
			firstName: userData.firstName,
			lastName: userData.lastName,
			email: userData.email.toLowerCase(),
			phoneNumber: userData.mobileNumber,
			userType: userData.userType,
			isInvestor: userData.userType === "investor",
			userName: `${userData.firstName}.${userData.lastName}`,
			userStatus: "active",
			isSubscribed: true,
			subscriptionType: "Pro",
			trialStartDate: new Date(),
		});

		await user.save();

		// Generate token
		const token = jwt.sign({ userId: user._id, email: user.email }, secretKey);

		// Send welcome email
		const emailContent = await ejs.renderFile("./public/welcomeEmail.ejs", {
			firstName: userData.firstName,
		});

		await transporter.sendMail({
			from: `"The Capital Hub" <${process.env.EMAIL_USER}>`,
			to: userData.email,
			subject: "Welcome to CapitalHub!",
			html: emailContent,
		});

		return res.status(200).send({
			status: 200,
			message: "Registration successful",
			data: {
				user,
				token,
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).send({
			status: 500,
			message: error.message,
		});
	}
};

export const sendMailOTP = async (req, res) => {
	try {
		const { email } = req.body;
		const otp = Math.floor(100000 + Math.random() * 900000).toString();

		// Create a token with OTP and expiry (e.g., 5 minutes)
		const token = jwt.sign({ otp, email }, process.env.JWT_SECRET_KEY, {
			expiresIn: "5m",
		});

		// Send email
		const emailContent = await ejs.renderFile("./public/otpEmail.ejs", {
			otp,
		});

		await transporter.sendMail({
			from: `"The Capital Hub" <${process.env.EMAIL_USER}>`,
			to: email,
			subject: "Email Verification OTP",
			html: emailContent,
		});

		res.status(200).json({
			message: "OTP sent successfully",
			orderId: token, // Send the token as orderId
		});
	} catch (error) {
		console.error("Error sending mail OTP:", error);
		res.status(500).json({ message: "Error sending OTP" });
	}
};

export const verifyMailOTP = async (req, res) => {
	try {
		const { otp, orderId } = req.body;

		// Verify the token
		const decoded = jwt.verify(orderId, process.env.JWT_SECRET_KEY);

		if (decoded.otp === otp) {
			return res
				.status(200)
				.json({ message: "OTP verified successfully", success: true });
		} else {
			return res.status(400).json({ message: "Invalid OTP", success: false });
		}
	} catch (error) {
		console.error("Error verifying mail OTP:", error);
		res.status(500).json({ message: "Error verifying OTP", success: false });
	}
};

export const getRawUsersController = async (req, res) => {
	try {
		const response = await getRawUsers();
		return res.status(200).send(response);
	} catch (error) {
		console.error(error);
		return res.status(500).send({ status: 500, message: error.message });
	}
};

export const getRawUserByIdController = async (req, res) => {
	try {
		const { userId } = req.params;
		const response = await getRawUserById(userId);
		return res.status(200).send(response);
	} catch (error) {
		console.error(error);
		return res.status(500).send({ status: 500, message: error.message });
	}
};

export const getUserByPhoneNumberController = async (req, res) => {
	try {
		const { phoneNumber } = req.body;
		const response = await getUserByPhoneNumber(phoneNumber);
		return res.status(200).send(response);
	} catch (error) {
		console.error(error);
		return res.status(500).send({ status: 500, message: error.message });
	}
};

export const getUserByEmailController = async (req, res) => {
	try {
		const { email } = req.body;
		const response = await getUserByEmail(email);
		return res.status(200).send(response);
	} catch (error) {
		console.error(error);
		return res.status(500).send({ status: 500, message: error.message });
	}
};
