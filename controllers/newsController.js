import axios from 'axios';

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
        const q = req.query.q || 'world'; 
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}&apiKey=${process.env.NEWS_API_KEY}`;
        
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
