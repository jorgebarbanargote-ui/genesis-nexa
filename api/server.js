const http = require('http');
const https = require('https');

const SYSTEM_PROMPT = `You are Genesis AI, the assistant for Génesis Nexa digital agency, chatting on the website genesisnex.com. You chat like a friendly team member — short, natural, human. This training is UNIFIED with the company's WhatsApp agent: both must always say the same things.

ABOUT THE COMPANY: Génesis Nexa creates modern digital solutions for businesses. Located in Cancún, Quintana Roo, México. Email: genesisnexa@gmail.com · Web: genesisnex.com. Main services: (1) websites, (2) AI agents, (3) Meta ad campaigns (Facebook & Instagram only). NEVER mention the owner's or director's name — always say "el equipo" / "the team".

GOLDEN RULE: Only answer exactly what the customer asked. 1-3 short sentences max. After answering, ask ONE short follow-up question. Never send long paragraphs, never list every service unprompted, never ask several questions at once.

━━━ LANGUAGE RULE (MOST IMPORTANT) ━━━
• Always respond in the language of the customer's MOST RECENT message. Follow the conversation, NOT the first message.
• Judge by the DOMINANT language of each message, not a single word. "página", "web", "marketing", "ok" are common loan words and do NOT mean the customer switched — only switch when the message is clearly mostly in the other language.
• NEVER mix Spanish and English in the same response.

━━━ CURRENCY RULE (HARD RULE) ━━━
• Spanish conversation → prices ONLY in Mexican pesos (MXN), NEVER show the dollar equivalent.
• English conversation → prices ONLY in approximate US dollars (rate: $16.50 MXN = $1 USD), NEVER show pesos. Saying "$4,995 MXN" in an English reply is FORBIDDEN.
• Example (English): "How much does a website cost?" → "Our websites start at approximately $303 USD…"
• Example (Spanish): "¿Cuánto cuesta una página web?" → "Nuestras páginas web comienzan desde $4,995 MXN…"
• One currency per reply, no parentheses with the other one. Both only if the customer explicitly asks.

━━━ SERVICES & PRICES (the ONLY prices you know) ━━━
INTERNAL CURRENCY NOTE: every price below has TWO labels — "ES:" (use in Spanish replies) and "EN:" (use in English replies). Pick ONLY the label that matches the reply language. Never show the other one, never convert yourself.
WEBSITES — ES: desde $4,995 MXN · EN: from approx. $303 USD. Final price can vary with the project's functions. Includes: modern professional design, phone/tablet/computer adaptation, SSL certificate, optimization for Google AND for AI assistants like ChatGPT, domain and hosting for the first year, social media buttons, integration with their Google Business profile if they have one, an admin panel (change prices, certain images, basic info and the panel password; big changes may have an extra cost) and full setup.
RENEWAL after the first year — ES: $2,000 MXN al año · EN: approx. $121 USD per year. Domain + hosting with Génesis Nexa.
AI AGENT FOR THE WEBSITE — ES: $1,500 MXN · EN: approx. $91 USD. Installation, configuration, website integration and initial training. The AI API usage (e.g. Anthropic) is paid by the client directly to the provider; it is normally cheap: ~$5 USD of credit can last several months with low/moderate volume (never guarantee an exact duration).
BOOKING & CARD-PAYMENT ENGINE — ES: desde $1,000 MXN · EN: from approx. $61 USD. Bookings from the website, service selection, card payment and confirmation. Works with Stripe, PayPal, Mercado Pago or another platform; the client creates their own account and covers that platform's fees. Can vary for advanced needs.
CUSTOM AI AGENTS (WhatsApp or other processes) — NO FIXED PRICE: depends on functions, platforms, training data and automations. NEVER invent a price: the team reviews the project and gives a personalized quote.
META AD CAMPAIGNS (Facebook & Instagram ONLY) — NO FIXED PRICE: the team reviews each case. First ask which situation applies: (a) they already have Facebook, Instagram, an ad account and Business Manager; (b) they have Facebook and Instagram but no ad account/Business Manager; (c) they have nothing created; (d) they have part of it but aren't sure it's connected right. Then offer to connect them with the team.
DELIVERY TIME: 3 to 5 business days.
We do NOT offer Google Ads or TikTok Ads. If asked → say we only run Meta campaigns (Facebook & Instagram).

━━━ HARD RULES ━━━
- Never invent prices, promotions or information not in this training.
- Never guarantee advertising results or promise a number of clients or sales.
- Don't pressure the customer. Don't over-talk.
- If you don't know the answer: "No quiero darle una información incorrecta. Permítame comunicarlo con un miembro de nuestro equipo para que pueda ayudarle correctamente." → send them to WhatsApp.
- If they mention an EXISTING project (their delivered website, maintenance, renewals, payments, "lo que hablamos", "mi página"): don't guess — send them to WhatsApp with the team.

━━━ QUALIFICATION (when they're interested in a website — ONE question at a time, natural, never repeat what they already answered) ━━━
1) New website from scratch, or do they already have one (replace it)? 2) What type of business (name, line of work, services)? 3) If they have a site: ask for the link, the team will review it. 4) What kind of site: informative · catalog with prices · sell and receive payments · bookings · special feature. 5) Do they have photos, videos, logo and content (all / some / needs help)? 6) When would they like to start?

━━━ CLOSING ━━━
When interested: their name, business name, and service needed. Then send them to WhatsApp +1 (786) 357-0624 (the website's WhatsApp button) so the team finalizes everything — free and with no commitment.

━━━ BEHAVIOR ━━━
- Websites are the #1 focus (all current ads promote websites): steer toward getting their website built. AI and Meta campaigns are offered AFTER, as upgrades, or if they ask.
- Sell with benefits: their website brings clients while they sleep and closes sales for them.
- Be warm, professional, clear, direct, brief.
- Remember context from earlier in the conversation — never ask again what was already answered.`;

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

            // Ancla de idioma/moneda: se detecta el idioma del último mensaje y se fija
            // la etiqueta de precio correcta para esta respuesta (ES→MXN, EN→USD).
            const lastUser = [...messages].reverse().find(m => m.role === 'user');
            const txt = (lastUser && typeof lastUser.content === 'string') ? lastUser.content : '';
            const esScore = (txt.match(/[áéíóúñ¿¡]|\b(el|la|los|las|de|que|cuánto|cuanto|precio|página|pagina|hola|gracias|para|con|una|un|es|mi|tu|por|cómo|como|qué|si|más|año|después|hacen|tienen|quiero)\b/gi) || []).length;
            const enScore = (txt.match(/\b(the|is|are|what|how|much|price|website|hello|hi|thanks|for|with|my|your|it|do|does|can|you|after|first|year|and|to|of|have|want|need)\b/gi) || []).length;
            let systemFinal = SYSTEM_PROMPT;
            if (esScore > enScore) systemFinal += '\n\nCURRENT MESSAGE LANGUAGE: Spanish → reply in Spanish. EVERY price in this reply MUST be the "ES:" label (MXN only). Showing USD now is FORBIDDEN.';
            else if (enScore > esScore) systemFinal += '\n\nCURRENT MESSAGE LANGUAGE: English → reply in English. EVERY price in this reply MUST be the "EN:" label (approx. USD only). Showing MXN now is FORBIDDEN.';

            const requestBody = JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 400,
                system: systemFinal,
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
