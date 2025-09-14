// Simple Node.js Express backend to protect Gemini API key
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();
console.log('Initializing Express app...');
app.use(cors());
console.log('CORS enabled.');
app.use(express.json());
console.log('JSON body parser enabled.');
app.use(express.static(path.join(__dirname, 'public')));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log('Loaded GEMINI_API_KEY:', !!GEMINI_API_KEY);
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

app.post('/api/gemini', async (req, res) => {
    try {
        console.log('Received POST /api/gemini');
        const payload = req.body;
        console.log('Payload:', JSON.stringify(payload));
        const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
        console.log('Requesting Gemini API:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log('Gemini API response status:', response.status);
        const data = await response.json();
        console.log('Gemini API response data:', JSON.stringify(data));
        res.json(data);
    } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
