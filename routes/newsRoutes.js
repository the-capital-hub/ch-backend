import express from "express";
import {
	getAllNews,
	getTopHeadlines,
	getCountryHeadlines,
	getNewsByDate,
	getTodaysNews,
	getNews,
	getMoreNews,
} from "../controllers/newsController.js";

const newsRouter = express.Router();

newsRouter.get("/all-news", getAllNews);
newsRouter.get("/top-headlines", getTopHeadlines);
newsRouter.get("/country/:iso", getCountryHeadlines);
newsRouter.get("/getNewsByDate", getNewsByDate);
newsRouter.get("/getTodaysNews", getTodaysNews);

// News from inshorts news api
//get first 10 news posts from inshorts
// http://localhost:8080/news/inshortsNews
newsRouter.post("/inshortsNews", getNews);

//get more news posts
// http://localhost:8080/news/inshortsNews/more
newsRouter.post("/inshortsNews/more", getMoreNews);

export default newsRouter;
