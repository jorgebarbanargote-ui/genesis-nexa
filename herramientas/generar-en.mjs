// Genera en/index.html (versión inglesa estática e indexable) desde index.html
// aplicando los atributos data-en con un parser DOM real.
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const site = process.argv[2];
const src = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
const $ = cheerio.load(src);

let aplicados = 0;
$('[data-en]').each((_, el) => {
  const t = $(el).attr('data-en');
  if (!t) return;
  if (t.indexOf('<') > -1) $(el).html(t);
  else $(el).text(t);
  aplicados++;
});
$('[data-ph-en]').each((_, el) => {
  const p = $(el).attr('data-ph-en');
  if (p) $(el).attr('placeholder', p);
});

$('html').attr('lang', 'en');
$('title').text('Genesis Nexa — Premium Websites that Sell');
$('meta[name="description"]').attr('content', 'We build your premium website: bilingual, modern, with direct WhatsApp and ready to sell. AI and marketing available as optional extras.');
$('meta[property="og:title"]').attr('content', 'Genesis Nexa — Premium Websites that Sell');
$('meta[property="og:description"]').attr('content', 'Your premium website, bilingual and ready to sell for you. One-time payment. AI and ads as optional extras.');
$('meta[property="og:url"]').attr('content', 'https://genesisnex.com/en/');
$('link[rel="canonical"]').attr('href', 'https://genesisnex.com/en/');

// Rutas locales → absolutas para que funcionen desde /en/
const abs = (v) => (v && !/^(https?:|\/\/|\/|#|data:|mailto:|tel:)/.test(v)) ? '/' + v : v;
$('img[src], source[src], video[poster], link[href], script[src]').each((_, el) => {
  for (const attr of ['src', 'poster', 'href']) {
    const v = $(el).attr(attr);
    if (v !== undefined) $(el).attr(attr, abs(v));
  }
});

let out = $.html();
// CSS inline y JS: rutas absolutas + idioma por defecto 'en' + botón ES navega a la home ES
out = out.replace("url('ai-chat-bg.webp')", "url('/ai-chat-bg.webp')");
// Cualquier video del hero referenciado en el JS pasa a ruta absoluta
out = out.replace(/'(hero-[a-z0-9-]+\.mp4)'/g, "'/$1'");
out = out.replace("localStorage.getItem('gn-lang') || 'es'", "localStorage.getItem('gn-lang') || 'en'");
out = out.replace('onclick="setLangTo(\'es\')"', 'onclick="localStorage.setItem(\'gn-lang\',\'es\');location.href=\'/\'"');

fs.mkdirSync(path.join(site, 'en'), { recursive: true });
fs.writeFileSync(path.join(site, 'en', 'index.html'), out);
console.log('en/index.html generado —', aplicados, 'elementos traducidos,', (out.length / 1024 | 0) + 'KB');

// Verificaciones: nada visible en español que tenga data-en sin aplicar
const check = cheerio.load(out);
let mal = 0;
check('[data-en]').each((_, el) => {
  const t = check(el).attr('data-en');
  const con = t.indexOf('<') > -1 ? check(el).html() : check(el).text();
  if (t.trim() !== con.trim()) { mal++; if (mal <= 3) console.log('  ✗ no aplicado:', t.slice(0, 60)); }
});
console.log(mal === 0 ? 'verificación: todos los textos EN aplicados ✓' : 'ATENCIÓN: ' + mal + ' sin aplicar');
console.log('lang=', check('html').attr('lang'), '| canonical=', check('link[rel="canonical"]').attr('href'));
