import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import multer from "multer";
import connectDB from "./constants/db.js";
import xlsx from "xlsx";
import cron from "node-cron";
import moment from "moment";
import nodemailer from "nodemailer";
import ejs from "ejs";
import responseTime from "response-time";
//routes
import usersData from "./routes/usersData.js";
import postData from "./routes/postData.js";
import documentData from "./routes/documentData.js";
import globalErrorHandler from "./error/AppError.js";
import startUpData from "./routes/startUpData.js";
import contactUsData from "./routes/contactUsData.js";
import connectionData from "./routes/connectionRoutes.js";
import investorData from "./routes/investorRoutes.js";
import chatData from "./routes/chatRoutes.js";
import messageData from "./routes/messageRoutes.js";
import communityData from "./routes/communityRoutes.js";
import notificationData from "./routes/notificationRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import questionsRoutes from "./routes/questionsRoute.js";
import achievementRoutes from "./routes/achievementRoutes.js";
import liveDealRoutes from "./routes/liveDealRoutes.js";
import articleRoutes from "./routes/articleRoute.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import vcRoutes from "./routes/vcRoute.js";
import newsRouter from "./routes/newsRoutes.js";
import meetingsRoutes from "./routes/meetingsRoutes.js";
import ResourceRouter from "./routes/resourceRoute.js";
import ThoughtsRoutes from "./routes/thoughtsRoutes.js";
import newCommunityRoutes from "./routes/NewCommunityRoutes.js";
import WebinarsRoutes from "./routes/webinarsRoutes.js";
import priorityDMRoutes from "./routes/priorityDMRoutes.js";

//inactive users mail function
import { sendMailtoInactiveFounders } from "./services/userService.js";

//model import for cron
import { UserModel } from "./models/User.js";

// Custom middleware for logging response time and URL
const logResponseTime = responseTime((req, res, time) => {
	const timeInSeconds = (time / 1000).toFixed(2); // Convert ms to seconds with 2 decimal places
	const status = res.statusCode;
	const logMessage = `${req.method} ${req.url} - Status: ${status} - Response Time: ${timeInSeconds}s`;

	// Color coding based on response time
	if (time < 100) {
		console.log("\x1b[32m%s\x1b[0m", logMessage); // Green for fast responses
	} else if (time < 500) {
		console.log("\x1b[33m%s\x1b[0m", logMessage); // Yellow for medium responses
	} else {
		console.log("\x1b[31m%s\x1b[0m", logMessage); // Red for slow responses
	}
});

const allowedOrigins = [
	"http://localhost:3000",
	"https://www.thecapitalhub.in",
];

dotenv.config();

// Add response time middleware before other middleware
// app.use(logResponseTime);
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(express.static("public"));
app.use(cors());

app.use("/users", usersData);
app.use("/api/posts", postData);
app.use("/documentation", documentData);
app.use("/startup", startUpData);
app.use("/contactUs", contactUsData);
app.use("/connections", connectionData);
app.use("/investor", investorData);
app.use("/chat", chatData);
app.use("/message", messageData);
app.use("/community", communityData);
app.use("/notificaton", notificationData);
app.use("/schedule", scheduleRoutes);
app.use("/question", questionsRoutes);
app.use("/achievement", achievementRoutes);
app.use("/live_deals", liveDealRoutes);
app.use("/article", articleRoutes);
app.use("/subscription", subscriptionRoutes);
app.use("/vc", vcRoutes);
app.use("/news", newsRouter);
app.use("/meetings", meetingsRoutes);
app.use("/resources", ResourceRouter);
app.use("/thoughts", ThoughtsRoutes);
app.use("/Communities", newCommunityRoutes);
app.use("/webinars", WebinarsRoutes);
app.use("/priorityDM", priorityDMRoutes);
// documentation upload

const storage = multer.diskStorage({
	destination: "./uploads",
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	},
});

const upload = multer({ storage });

app.post("/upload", upload.single("file"), (req, res) => {
	const file = req.file;
	console.log(file);
	console.log(`File uploaded: ${file.originalname}`);

	// Return JSON response with the thumbnail URL or other relevant data
	res.status(200).json({
		message: "File uploaded successfully",
		thumbnailUrl: `/uploads/${file.originalname}`,
	});
});
app.use(globalErrorHandler);

connectDB();

const server = app.listen(process.env.PORT, () => {
	console.log(`Listening on ${process.env.PORT}`);
});

const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

// Cron job to remove expired LinkedIn tokens
cron.schedule("0 0 * * *", async () => {
	try {
		// setting up time of the moment, to validate the expiry time of linkedin token
		const now = moment().toISOString();
		const result = await UserModel.updateMany(
			{ linkedinTokenExpiryDate: { $lt: now } }, // Find users with expired tokens
			{ $unset: { linkedinId: "", linkedinTokenExpiryDate: "", linkedinToken: "" } } // Remove the fields from the document
		);
		console.log(`Expired tokens removed from ${result.modifiedCount} users.`);

		//sending mails to every inactive user, for 7 and 30 days
		//await sendMailtoInactiveFounders();
	} catch (error) {
		console.error("Error removing expired tokens:", error);
	}
});

let activeUsers = [];
io.on("connection", (socket) => {
	socket.on("new-user-add", (newUserId) => {
		if (newUserId !== null) {
			const existingUserIndex = activeUsers.findIndex(
				(user) => user.userId === newUserId
			);
			if (existingUserIndex !== -1) {
				activeUsers[existingUserIndex].socketId = socket.id;
			} else {
				activeUsers.push({
					userId: newUserId,
					socketId: socket.id,
				});
			}
			io.emit("get-users", activeUsers);
		}
	});

	socket.on("disconnected", () => {
		activeUsers = activeUsers.filter((user) => user.socketId !== socket.id);
		io.emit("get-users", activeUsers);
	});

	socket.on("send-message", (data) => {
		try {
			const { recieverId } = data;
			// const user = activeUsers.find((user) => user.userId === recieverId);
			// console.log("Active users: ", activeUsers);
			// console.log("Users: ", user);
			// console.log("Sending from socket to: ", recieverId);
			// console.log("Data: ", data);
			// if (user) io.to(user.socketId).emit("recieve-message", data);
			const matchedUsers = activeUsers.filter((user) =>
				recieverId.includes(user.userId)
			);
			matchedUsers.forEach((user) => {
				io.to(user.socketId).emit("recieve-message", data);
			});
		} catch (error) {
			console.log(error);
		}
	});
});
