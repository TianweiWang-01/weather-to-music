const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT) || 8000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const PUBLIC_DIR = __dirname;
const DEFAULT_ALLOWED_ORIGINS = [
    'https://tianweiwang-01.github.io',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    try {
        const requestUrl = new URL(req.url, `http://${req.headers.host}`);

        if (requestUrl.pathname === '/api/assistant') {
            await handleAssistantRequest(req, res);
            return;
        }

        await serveStaticFile(requestUrl.pathname, res);
    } catch (err) {
        console.error(err);
        sendJson(res, 500, { error: 'Server error. Please try again.' }, req);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`SkyMelody server running at http://localhost:${PORT}`);
});

async function handleAssistantRequest(req, res) {
    setCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed.' }, req);
        return;
    }

    if (!OPENAI_API_KEY) {
        sendJson(res, 500, {
            error: 'OpenAI API key is missing. Set OPENAI_API_KEY before starting the server.'
        }, req);
        return;
    }

    const body = await readRequestBody(req);
    const payload = JSON.parse(body || '{}');
    const context = payload.context || {};
    const messages = Array.isArray(payload.messages) ? payload.messages : [];

    const openaiMessages = buildOpenAiMessages(context, messages);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: openaiMessages,
            temperature: 0.75,
            max_tokens: 700
        })
    });

    const data = await response.json();

    if (!response.ok) {
        const message = data.error?.message || 'OpenAI request failed.';
        sendJson(res, response.status, { error: message }, req);
        return;
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    sendJson(res, 200, {
        reply: reply || 'I could not generate a response. Try asking again.'
    }, req);
}

function buildOpenAiMessages(context, messages) {
    const draft = String(context.draft || '').slice(0, 4500);
    const title = String(context.title || 'Untitled weather piece').slice(0, 160);
    const weatherRoom = String(context.weatherRoom || 'Rain Room').slice(0, 80);
    const weatherMood = String(context.weatherMood || 'reflective').slice(0, 120);
    const sensoryPalette = String(context.sensoryPalette || 'weather atmosphere').slice(0, 220);
    const wordCount = Number(context.wordCount) || 0;

    const systemMessage = [
        'You are SkyMelody AI, a warm but concise writing assistant inside an immersive weather writing studio.',
        'Help the user brainstorm, continue, revise, outline, title, or improve their writing.',
        'Respond in English because the final project website is in English.',
        'Do not mention that you are using hidden context unless the user asks.',
        'Keep replies practical and writer-facing. Use short paragraphs or compact bullets when useful.',
        '',
        `Current weather room: ${weatherRoom}`,
        `Mood and pace: ${weatherMood}`,
        `Sensory palette: ${sensoryPalette}`,
        `Draft title: ${title}`,
        `Approximate word count: ${wordCount}`,
        '',
        `Current draft:\n${draft || 'The writing board is currently empty.'}`
    ].join('\n');

    return [
        { role: 'system', content: systemMessage },
        ...messages
            .filter((message) => ['user', 'assistant'].includes(message.role) && message.content)
            .slice(-10)
            .map((message) => ({
                role: message.role,
                content: String(message.content).slice(0, 1800)
            }))
    ];
}

async function serveStaticFile(pathname, res) {
    const safePath = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
    const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

    if (!filePath.startsWith(PUBLIC_DIR)) {
        sendText(res, 403, 'Forbidden');
        return;
    }

    try {
        const content = await fs.readFile(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'application/octet-stream'
        });
        res.end(content);
    } catch (err) {
        if (err.code === 'ENOENT') {
            sendText(res, 404, 'Not found');
            return;
        }

        throw err;
    }
}

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;

            if (body.length > 100000) {
                req.destroy(new Error('Request body too large.'));
            }
        });

        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

function sendJson(res, status, data, req) {
    setCorsHeaders(res, req);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}

function sendText(res, status, text) {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(text);
}

function setCorsHeaders(res, req) {
    const requestOrigin = req?.headers.origin;
    const allowedOrigin = getAllowedOrigin(requestOrigin);

    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getAllowedOrigin(requestOrigin) {
    if (ALLOWED_ORIGINS.includes('*')) return '*';
    if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin;
    if (!requestOrigin) return ALLOWED_ORIGINS[0];
    return '';
}
