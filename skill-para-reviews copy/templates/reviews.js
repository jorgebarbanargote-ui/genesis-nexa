// reviews.js — drop-in customer reviews system for an Express app.
// Usage in server.js (after app.use(express.json()) and the BLOCKED-files guard):
//   require('./reviews')(app, { dataDir: process.env.DATA_DIR || '/data' });
//
// Requires: Node 18+ (global fetch), express-rate-limit.
// Stores data on a PERSISTENT volume at dataDir:
//   <dataDir>/reviews.json   -> the reviews
//   <dataDir>/config.json    -> { adminPassword, callmebotPhone, callmebotApikey }
// Secrets may also come from env: ADMIN_PASSWORD, CALLMEBOT_PHONE, CALLMEBOT_APIKEY.

const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

module.exports = function mountReviews(app, opts = {}) {
  const DATA_DIR = opts.dataDir || process.env.DATA_DIR || '/data';
  const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
  const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
  const ADMIN_HTML = opts.adminHtmlPath || path.join(__dirname, 'admin.html');

  const ensureDataDir = () => { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {} };
  const loadReviews = () => { try { return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8')); } catch (e) { return []; } };
  const saveReviews = (list) => { ensureDataDir(); fs.writeFileSync(REVIEWS_FILE, JSON.stringify(list, null, 2)); };
  const loadConfig = () => {
    let c = {};
    try { c = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch (e) {}
    return {
      adminPassword: c.adminPassword || process.env.ADMIN_PASSWORD || '',
      callmebotPhone: c.callmebotPhone || process.env.CALLMEBOT_PHONE || '',
      callmebotApikey: c.callmebotApikey || process.env.CALLMEBOT_APIKEY || ''
    };
  };
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const genToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  const actionPage = (msg) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reviews</title><style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0D1128;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
.box{background:#161B3C;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:40px 32px;max-width:420px}h1{color:#00D4FF;font-size:1.2rem;margin:0 0 8px}p{color:#cdd6f4;font-size:1rem;line-height:1.5}</style></head>
<body><div class="box"><h1>Reviews</h1><p>${msg}</p></div></body></html>`;

  async function notifyWhatsApp(review, baseUrl) {
    const cfg = loadConfig();
    if (!cfg.callmebotPhone || !cfg.callmebotApikey) return;
    const approve = `${baseUrl}/r/approve/${review.id}/${review.token}`;
    const del = `${baseUrl}/r/delete/${review.id}/${review.token}`;
    const stars = '★'.repeat(review.stars) + '☆'.repeat(5 - review.stars);
    const msg = `🌟 Nueva reseña\n\n${review.name} — ${stars}\n"${review.text}"\n\n✅ Aprobar y publicar:\n${approve}\n\n🗑️ Borrar:\n${del}`;
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(cfg.callmebotPhone)}&text=${encodeURIComponent(msg)}&apikey=${encodeURIComponent(cfg.callmebotApikey)}`;
    try { await fetch(url); } catch (e) { console.error('WhatsApp notify failed:', e.message); }
  }

  const reviewLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, message: { error: 'Too many reviews, try again later.' } });

  // Public: submit a review -> "pending"
  app.post('/api/reviews', reviewLimiter, async (req, res) => {
    let { name, stars, text } = req.body || {};
    name = (name || '').toString().trim().slice(0, 60);
    text = (text || '').toString().trim().slice(0, 1000);
    stars = parseInt(stars, 10);
    if (!name || !text || !(stars >= 1 && stars <= 5)) {
      return res.status(400).json({ error: 'Name, rating and comment are required.' });
    }
    const reviews = loadReviews();
    const review = { id: genId(), token: genToken(), name, stars, text, status: 'pending', createdAt: new Date().toISOString() };
    reviews.push(review);
    saveReviews(reviews);
    notifyWhatsApp(review, `https://${req.get('host')}`);
    res.json({ ok: true });
  });

  // Public: approved reviews, newest first
  app.get('/api/reviews', (req, res) => {
    const approved = loadReviews().filter(r => r.status === 'approved');
    res.json(approved.map(r => ({ id: r.id, name: r.name, stars: r.stars, text: r.text, date: r.createdAt })).reverse());
  });

  // One-tap approve/delete from the WhatsApp message (per-review token)
  app.get('/r/:action/:id/:token', (req, res) => {
    const { action, id, token } = req.params;
    const reviews = loadReviews();
    const idx = reviews.findIndex(r => r.id === id && r.token === token);
    if (idx < 0) return res.status(404).send(actionPage('Invalid link or the review no longer exists.'));
    if (action === 'approve') { reviews[idx].status = 'approved'; saveReviews(reviews); return res.send(actionPage(`✅ Review by <b>${reviews[idx].name}</b> approved and published.`)); }
    if (action === 'delete') { const n = reviews[idx].name; reviews.splice(idx, 1); saveReviews(reviews); return res.send(actionPage(`🗑️ Review by <b>${n}</b> deleted.`)); }
    res.status(400).send(actionPage('Invalid action.'));
  });

  // Admin (password protected)
  const checkAdmin = (req) => {
    const cfg = loadConfig();
    const pw = (req.body && req.body.password) || req.get('x-admin-password') || '';
    return !!cfg.adminPassword && pw === cfg.adminPassword;
  };
  app.post('/api/admin/list', (req, res) => {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Wrong password' });
    res.json({ reviews: loadReviews().slice().reverse() });
  });
  app.post('/api/admin/approve', (req, res) => {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Wrong password' });
    const reviews = loadReviews();
    const r = reviews.find(x => x.id === (req.body && req.body.id));
    if (r) { r.status = 'approved'; saveReviews(reviews); }
    res.json({ ok: true });
  });
  app.post('/api/admin/delete', (req, res) => {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Wrong password' });
    saveReviews(loadReviews().filter(x => x.id !== (req.body && req.body.id)));
    res.json({ ok: true });
  });
  app.get('/admin', (req, res) => res.sendFile(ADMIN_HTML));
};
