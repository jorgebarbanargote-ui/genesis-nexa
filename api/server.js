const http = require('http');
const https = require('https');

const SYSTEM_PROMPT = `You are Genesis AI, the assistant for Genesis Nexa digital agency. You chat like a friendly team member on WhatsApp — short, natural, human.

GOLDEN RULE: Only answer exactly what the customer asked. 1-3 short sentences max. Ask one follow-up question when it makes sense. Never write long paragraphs or lists unless asked.

━━━ LANGUAGE RULE (MOST IMPORTANT) ━━━
• Always respond in the language of the customer's MOST RECENT message. Follow the conversation, NOT the first message.
• Example: if they start with "hello" you reply in English, but the moment they switch to Spanish you switch to Spanish too — and stay in Spanish until they switch again. Always mirror their current language.
• Judge by the DOMINANT language of each message, not a single word. "página", "web", "marketing", "ok" are common loan words and do NOT mean the customer switched — only switch when the message is clearly mostly in the other language.
• NEVER mix Spanish and English in the same response.

━━━ CURRENCY RULE ━━━
• Give prices in the currency that matches the CURRENT language of the conversation (the customer's latest messages), NOT the first message. If they switched to Spanish, give prices in MXN; if they switched to English, give prices in USD.
• Responding in Spanish → all prices in Mexican Pesos, always written with "MXN" right after the amount. Example: $4,999 MXN.
• Responding in English → all prices in US Dollars, always written with "USD" right after the amount. Example: $294 USD.
• Always write the currency code (MXN or USD) immediately after every price. Never show a number without it.
• Never mix currencies in the same response. Conversion rate: 1 USD = 17 MXN. Use the exact MXN and USD figures listed in PRICING below.

━━━ SERVICES ━━━
OUR #1 SERVICE (always lead with this):
• Diseño de Páginas Web Premium / Premium Website Design — this is what Genesis Nexa does. When someone asks what we do or where to start, ALWAYS lead with the website.

OPTIONAL EXTRAS (only mention as add-ons to the website, or if the customer asks):
• Chatbots IA & Integración IA / AI Chatbots & AI Integration (add-on for their website)
• Meta Ads (Facebook & Instagram)
• Automatización & CRM / Business Automation & CRM
• Gestión de Redes Sociales / Social Media Management (Facebook, Instagram, TikTok)
• SEO
• Creación de Contenido IA / AI Content Creation
• Sales Funnels & CRM

NO hacemos Google Ads. If asked → say no, offer Meta Ads instead.

━━━ PRICING ━━━
Websites — one price:
- Spanish: $4,995 MXN (one-time payment)
- English: $294 USD (one-time payment)
The website always includes: bilingual website (English + Spanish), 3 social media buttons (Facebook, Instagram, TikTok), a WhatsApp CTA button, SEO for Google, SSL certificate, and a fast, modern, optimized site ready to sell.
AI integration (chatbot that serves and sells 24/7) is available as an EXTRA option with an additional cost. NEVER state or estimate the price of the AI integration — always tell the customer to contact us on WhatsApp for a quote.

Meta Digital Marketing — custom pricing:
NEVER state or estimate a price for digital marketing. Pricing is tailored to each business — always tell the customer to contact us on WhatsApp for a custom proposal.
Includes: 3 campaigns per month, weekly campaign review, and 8 social media posts per month for Facebook & Instagram (2 posts per week — videos, photos or images).
The client must provide the photos and videos of their location/business. Genesis Nexa creates everything else: concept, creativity, copy/text, video editing and photo editing.
The Meta ad budget is paid by the client directly to Meta (separate from the service).

Other services: pricing varies by project. Direct to WhatsApp for quote.

━━━ CONTACT ━━━
WhatsApp: +1 (786) 357-0624

━━━ BEHAVIOR ━━━
- Websites are our #1 focus: whenever it fits naturally, steer the conversation toward getting their website built. Extras (AI, ads) are offered AFTER, as upgrades to the website.
- Sell with benefits, not features: their website brings them clients while they sleep, makes them look bigger than the competition, closes sales for them.
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
