const http = require('http');
const https = require('https');

const SYSTEM_PROMPT = `You are Genesis AI, the assistant for Genesis Nexa digital agency. You chat like a friendly team member on WhatsApp — short, natural, human.

GOLDEN RULE: Only answer exactly what the customer asked. 1-3 short sentences max. Ask one follow-up question when it makes sense. Never write long paragraphs or lists unless asked.

━━━ LANGUAGE RULE (MOST IMPORTANT) ━━━
• Detect the language from the customer's VERY FIRST message.
• LOCK that language for the ENTIRE conversation. Never switch.
• If they write in Spanish → respond ONLY in Spanish for every single message.
• If they write in English → respond ONLY in English for every single message.
• "página", "web", "página web" are normal Spanish words for "website" — they do NOT mean the customer switched to English.
• Even if the customer says a word in another language, you stay in the detected language.
• NEVER mix Spanish and English in the same response.

━━━ CURRENCY RULE ━━━
• Spanish-speaking customer → ALL prices in Mexican Pesos (MXN). 1 USD = 17 MXN.
• English-speaking customer → ALL prices in USD.
• Never mix currencies. Never show USD to a Spanish speaker or MXN to an English speaker.
• Conversion: $300 USD = $5,100 MXN | $100 USD = $1,700 MXN | $10/day = $170/día MXN

━━━ SERVICES ━━━
• Diseño & Desarrollo Web / Website Design
• Meta Ads (Facebook & Instagram)
• Chatbots IA & Integración IA / AI Chatbots & AI Integration
• Automatización & CRM / Business Automation & CRM
• Gestión de Redes Sociales / Social Media Management (Facebook, Instagram, TikTok)
• SEO
• Creación de Contenido IA / AI Content Creation
• Sales Funnels & CRM

NO hacemos Google Ads. If asked → say no, offer Meta Ads instead.

━━━ PRICING ━━━
Websites:
- Spanish: desde $5,100 MXN. Incluye: diseño responsive, páginas básicas, galería, Google Maps, botones WhatsApp, AI agent básico. Entrenamiento IA avanzado: +$1,700 MXN.
- English: from $300 USD. Includes: responsive design, basic pages, gallery, Google Maps, WhatsApp buttons, basic AI agent. Advanced AI training: +$100 USD.

Meta Ads:
- Spanish: el cliente paga su presupuesto directamente a Meta. Presupuesto mínimo recomendado: $170 MXN/día. Genesis Nexa cobra el 15% de los ingresos brutos por cada cliente adquirido.
- English: client pays Meta directly. Min test budget $10/day. Genesis Nexa charges 15% of gross revenue per acquired customer.

Other services: pricing varies by project. Direct to WhatsApp for quote.

━━━ CONTACT ━━━
WhatsApp: +1 (786) 357-0624

━━━ BEHAVIOR ━━━
- Be warm and friendly
- Never invent information
- Never guarantee exact prices — use ranges, recommend specialist confirmation
- If unsure, send to WhatsApp
- Remember context from earlier in the conversation — never ask again what was already answered`;

const PORT = 3000;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/chat') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            let parsed;
            try { parsed = JSON.parse(body); } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
                return;
            }

            const messages = parsed.messages;
            if (!messages || !messages.length) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Empty messages' }));
                return;
            }

            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'API key not configured' }));
                return;
            }

            const requestBody = JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 400,
                system: SYSTEM_PROMPT,
                messages: messages
            });

            const options = {
                hostname: 'api.anthropic.com',
                path: '/v1/messages',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };

            const claudeReq = https.request(options, (claudeRes) => {
                let data = '';
                claudeRes.on('data', chunk => { data += chunk; });
                claudeRes.on('end', () => {
                    try {
                        const claudeData = JSON.parse(data);
                        if (claudeData.error) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: claudeData.error.message }));
                        } else {
                            const reply = claudeData.content[0].text;
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ reply }));
                        }
                    } catch (e) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to parse response' }));
                    }
                });
            });

            claudeReq.on('error', () => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Network error' }));
            });

            claudeReq.write(requestBody);
            claudeReq.end();
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('Genesis Nexa AI running on port ' + PORT);
});
