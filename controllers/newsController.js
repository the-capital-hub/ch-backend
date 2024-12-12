import axios from "axios";
import fetch from "node-fetch";
import inshorts from "inshorts-news-api";
import Post from "../models/News.js";

async function makeApiRequest(url) {
	try {
		const response = await axios.get(url);
		return { status: response.status, data: response.data };
	} catch (error) {
		return { status: 500, message: error.message };
	}
}

export async function getAllNews(req, res) {
	try {
		const pageSize = parseInt(req.query.pageSize) || 80;
		const page = parseInt(req.query.page) || 1;
		const q = req.query.q || "business";
		const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
			q
		)}&page=${page}&pageSize=${pageSize}&apiKey=${process.env.NEWS_API_KEY}`;

		const result = await makeApiRequest(url);
		const status = result.status || 200;
		res.status(status).json(result.data || result);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

export async function getTopHeadlines(req, res) {
	try {
		const pageSize = parseInt(req.query.pageSize) || 80;
		const page = parseInt(req.query.page) || 1;
		const category = req.query.category || "general";

		const url = `https://newsapi.org/v2/top-headlines?category=${category}&language=en&page=${page}&pageSize=${pageSize}&apiKey=${process.env.NEWS_API_KEY}`;
		const result = await makeApiRequest(url);

		const status = result.status || 200;
		res.status(status).json(result.data || result);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

export async function getCountryHeadlines(req, res) {
	try {
		const pageSize = parseInt(req.query.pageSize) || 80;
		const page = parseInt(req.query.page) || 1;
		const country = req.params.iso;

		const url = `https://newsapi.org/v2/top-headlines?country=${country}&apiKey=${process.env.NEWS_API_KEY}&page=${page}&pageSize=${pageSize}`;
		const result = await makeApiRequest(url);

		const status = result.status || 200;
		res.status(status).json(result.data || result);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

export async function getNewsByDate(req, res) {
	try {
		const today = new Date().toISOString().split("T")[0];
		const fiveDaysAgo = new Date();
		fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
		const fromDate = fiveDaysAgo.toISOString().split("T")[0];

		const url = `https://newsapi.org/v2/everything?q=(business OR tech)&from=${fromDate}&to=${today}&language=en&apiKey=${process.env.NEWS_API_KEY}`;

		const response = await fetch(url);
		const data = await response.json();

		res.status(200).json(data);
	} catch (error) {
		console.error("Error fetching news:", error);
		res.status(500).json({ message: "Internal Server Error" });
	}
}

export async function getTodaysNews(req, res) {
	try {
		const today = new Date().toISOString().split("T")[0];
		const twoDaysAgo = new Date();
		twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);
		const fromDate = twoDaysAgo.toISOString().split("T")[0];

		const url = `https://newsapi.org/v2/everything?q=(business OR tech)&from=${fromDate}&to=${today}&language=en&apiKey=${process.env.NEWS_API_KEY}`;

		const response = await fetch(url);
		const data = await response.json();

		res.status(200).json(data);
	} catch (error) {
		console.error("Error fetching today's news:", error);
		res.status(500).json({ message: "Internal Server Error" });
	}
}

// Get news from inshorts news api
export const getNews = async (req, res) => {
	try {
		const newsData = await inshorts.getNews({
			language: req.body.lang,
			category: req.body.category,
		});
		res.status(200).json({
			posts: new Post().fromDocuments(newsData.news),
			news_offset: newsData.news_offset,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

export const getMoreNews = async (req, res) => {
	try {
		const newsData = await inshorts.getNews({
			language: req.body.lang,
			category: req.body.category,
			news_offset: req.body.news_offset,
		});
		res.status(200).json({
			posts: new Post().fromDocuments(newsData.news),
			news_offset: newsData.news_offset,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
