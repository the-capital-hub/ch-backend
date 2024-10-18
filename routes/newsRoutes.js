import express from 'express';
import { getAllNews, getTopHeadlines, getCountryHeadlines } from '../controllers/newsController.js';


const newsRouter = express.Router();

newsRouter.get("/all-news", getAllNews);
newsRouter.get("/top-headlines", getTopHeadlines);
newsRouter.get("/country/:iso", getCountryHeadlines);

export default newsRouter;

