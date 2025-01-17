import express from "express";

import {
	getUsersController,
	getUserByUsernameController,
	getUserAnalyticsDataByUserNameController,
	registerUserController,
	loginUserController,
	getUserByIdController,
	updateUser,
	updateUserByIdController,
	changePasswordController,
	requestPasswordResetController,
	resetPasswordController,
	searchUsersController,
	addEducationController,
	addExperienceController,
	addStartupToUserController,
	getExploreController,
	getExploreFiltersController,
	addUserAsInvestorController,
	validateSecretKeyController,
	createSecretKeyController,
	googleLoginController,
	googleRegisterController,
	linkedInLoginController,
	updateEducationController,
	updateExperienceController,
	deleteEducationController,
	deleteExperienceController,
	sendOTP,
	verifyOtp,
	createUser,
	addInvestor,
	addStartUp_data,
	getLinkedInProfile,
	handelLinkedin,
	blockUserController,
	getUserByIdBodyController,
	unblockUserController,
	getUserEmailByIdController,
	getUserAnalyticsController,
	getUserProfileViewsController,
	saveMeetingTokenController,
	getUserMilestonesController,
	updateTopVoiceController,
	getInactiveFounderController,
	getUserAvaibilityController,
	sendReportEmail,
	createSubscriptionPaymentController,
	verifySubscriptionPaymentController,
	createUserAndInitiatePaymentController,
	registerWithPaymentController,
	createUserController,
	sendMailOTP,
	verifyMailOTP,
	getRawUsersController,
	getRawUserByIdController
} from "../controllers/userData.js";

import { authenticateToken } from "../middlewares/authenticateToken.js";
import { update_all } from "../controllers/postController.js";
import multer from "multer";
const router = express.Router();

const storage = multer.diskStorage({
	destination: "./uploads",
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	},
});

const upload = multer({ storage });
// http://localhost:8080/users/
router.post("/add_user", upload.single("file"), createUser);
router.post("/create-subscription-payment", createSubscriptionPaymentController);
router.post("/verify-subscription-payment", verifySubscriptionPaymentController);
router.post("/register-with-payment", registerWithPaymentController);
router.post("/send_otp", sendOTP);
router.post("/verify_otp", verifyOtp);
router.post("/add_investor", upload.single("file"), addInvestor);
router.post("/add_startup_data", upload.single("file"), addStartUp_data);
router.post("/update_all", update_all);
router.post("/login", loginUserController);
router.post("/linkdin_login", handelLinkedin);
router.post("/getLinkedInProfile", getLinkedInProfile);
router.post("/createUser", registerUserController);
router.post("/registerUser", createUserController);
router.post("/send-mail-otp", sendMailOTP);
router.post("/verify-mail-otp", verifyMailOTP);
router.get("/getUserById/:id", getUserByIdController);
router.get("/getUserEmail/:userId", getUserEmailByIdController);
router.get("/getRawUsers", getRawUsersController);
router.get("/getRawUserById/:userId", getRawUserByIdController);
router.patch("/updateUserById/:userId", updateUserByIdController);

router.post("/requestPasswordReset", requestPasswordResetController);

router.patch("/resetPassword", resetPasswordController);

//validate onelink secret key
router.post("/validateSecretKey", validateSecretKeyController);

router.post("/googleLogin", googleLoginController);
router.post("/googleRegister", googleRegisterController);
router.post("/linkedInLogin", linkedInLoginController);

// User Analytics route - corrently not in use(will be used in future bcz not working properly)
router.get("/getUserAnalytics/:userId", getUserAnalyticsController);
router.get("/getUserProfileViews/:userId", getUserProfileViewsController);

router.post("/getUserByUserName", getUserAnalyticsDataByUserNameController);
router.get("/getUserByUsername/:username", getUserByUsernameController);


// Authorized routes below
router.use(authenticateToken);

// Profile Page
router.patch("/updateFounder", updateUser);

router.get("/getUser", getUsersController);
router.patch("/changePassword", changePasswordController);

router.get("/search", searchUsersController);

router.patch("/addEducation/:userId", addEducationController);
router.patch("/addExperience/:userId", addExperienceController);
router.patch("/updateEducation/:educationId", updateEducationController);
router.delete("/deleteEducation/:educationId", deleteEducationController);
router.patch("/updateExperience/:experienceId", updateExperienceController);
router.delete("/deleteExperience/:experienceId", deleteExperienceController);

//add existing startups to user
router.patch("/addStartUpToUser", addStartupToUserController);
router.patch("/addUserAsInvestor", addUserAsInvestorController);

// get explore
router.get("/explore", getExploreController);
router.get("/exploreFilters", getExploreFiltersController);

//block user
router.post("/blockuser", blockUserController);
//unblock user
router.post("/unblockuser", unblockUserController);
//getuserbyidbody
router.post("/getUserByIdBody", getUserByIdBodyController);

//create secret key
router.post("/createSecretKey", createSecretKeyController);

router.post("/saveMeetingToken", saveMeetingTokenController);

// for user milestones
router.get("/getUserMilestones", getUserMilestonesController);

// update top voice
router.patch("/updateTopVoice", updateTopVoiceController);

//getInactive founders

router.get("/inactive-founders", getInactiveFounderController);

// get user availability
router.get("/getUserAvailability", getUserAvaibilityController);

//send report email
router.post("/report", sendReportEmail);


export default router;
