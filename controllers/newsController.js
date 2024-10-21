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
        const q = req.query.q || 'business'; 
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

export async function getNewsByDate(req, res) {
    try {
        const today = new Date().toISOString().split('T')[0]; 
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const fromDate = fiveDaysAgo.toISOString().split('T')[0]; 
        
        const url = `https://newsapi.org/v2/everything?q=(business OR tech)&from=${fromDate}&to=${today}&apiKey=${process.env.NEWS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

