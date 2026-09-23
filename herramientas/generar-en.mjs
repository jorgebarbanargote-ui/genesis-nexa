// Genera en/index.html (versión inglesa estática e indexable) desde index.html
// aplicando los atributos data-en con un parser DOM real.
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const site = process.argv[2];
// Opciones para las subpáginas (la home no necesita ninguna):
//   --canonical=/en/agente-whatsapp/   ruta canónica de la versión inglesa
//   --es-url=/agente-whatsapp/         a dónde lleva el botón ES (por defecto, la home)
//   --out=en/agente-whatsapp/index.html  dónde se escribe el archivo
const opcion = (nombre, pordefecto) => {
  const a = process.argv.find((x) => x.startsWith(`--${nombre}=`));
  return a ? a.split('=').slice(1).join('=') : pordefecto;
};
const canonicalEn = opcion('canonical', '/en/');
const urlEs = opcion('es-url', '/');
const salida = opcion('out', path.join('en', 'index.html'));
const esLanding = canonicalEn === '/en/agente-whatsapp/';
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
const title = esLanding ? 'AI Agent for WhatsApp — Genesis Nexa' : 'Websites for Businesses in Mexico & the US | Genesis Nexa';
const description = esLanding
  ? 'An AI agent that answers your business WhatsApp 24/7. Plans from approx. $36 USD per month; Solo and Business include a 7-day free trial with no setup fee.'
  : 'Bilingual websites for businesses in Mexico and the US, from approx. USD 303. Explore real projects, compare packages and contact Genesis Nexa on WhatsApp.';
$('title').text(title);
$('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]').attr('content', description);
$('meta[property="og:title"], meta[name="twitter:title"]').attr('content', title);
$('meta[property="og:url"]').attr('content', 'https://genesisnex.com' + canonicalEn);
$('link[rel="canonical"]').attr('href', 'https://genesisnex.com' + canonicalEn);

// Rutas locales → absolutas para que funcionen desde /en/
const abs = (v) => (v && !/^(https?:|\/\/|\/|#|data:|mailto:|tel:)/.test(v))
  ? new URL(v, 'https://genesisnex.com' + urlEs).pathname : v;
$('img[src], source[src], video[poster], link[href], script[src]').each((_, el) => {
  for (const attr of ['src', 'poster', 'href']) {
    const v = $(el).attr(attr);
    if (v !== undefined) $(el).attr(attr, abs(v));
  }
});

// Cada versión enlaza las páginas del mismo idioma.
$('a[href]').each((_, el) => {
  if ($(el).attr('hreflang')) return;
  const href = $(el).attr('href');
  if (!href || /^(https?:|\/\/|#|mailto:|tel:)/.test(href)) return;
  const resolved = new URL(href, 'https://genesisnex.com' + urlEs);
  if (resolved.pathname === '/') $(el).attr('href', '/en/' + resolved.hash);
  if (resolved.pathname === '/agente-whatsapp/') $(el).attr('href', '/en/agente-whatsapp/' + resolved.hash);
});
$('[data-href-en]').each((_, el) => $(el).attr('href', $(el).attr('data-href-en')));
$('[data-label-en]').each((_, el) => $(el).attr('aria-label', $(el).attr('data-label-en')));
$('[data-alt-en]').each((_, el) => $(el).attr('alt', $(el).attr('data-alt-en')));
$('.lang-switch a').each((_, el) => {
  const current = $(el).attr('lang') === 'en';
  $(el).toggleClass('active', current);
  if (current) $(el).attr('aria-current', 'page'); else $(el).removeAttr('aria-current');
});

// Las preguntas estructuradas se generan del contenido visible traducido.
$('script[type="application/ld+json"]').each((_, el) => {
  const data = JSON.parse($(el).text());
  if (data['@type'] === 'Organization') {
    data.description = 'Genesis Nexa: a digital agency for businesses in Mexico and the United States. Bilingual websites, AI agents and Meta advertising.';
    // The English page displays approximate USD references, not fixed USD offers.
    delete data.makesOffer;
  }
  if (data['@type'] === 'FAQPage') {
    data['@id'] = 'https://genesisnex.com' + canonicalEn + '#faq';
    data.inLanguage = 'en';
    data.mainEntity = $('.faq-item').toArray().map(item => ({
      '@type': 'Question', name: $(item).find('summary').text().trim(),
      acceptedAnswer: { '@type': 'Answer', text: $(item).find('p').text().trim() }
    }));
  }
  if (data['@type'] === 'Service') {
    data['@id'] = 'https://genesisnex.com' + canonicalEn + '#servicio';
    data.url = 'https://genesisnex.com' + canonicalEn;
    data.name = 'AI agent for WhatsApp';
    data.serviceType = 'WhatsApp AI chatbot';
    data.description = description;
    // USD prices are estimates, not a separate fixed-price offer.
    delete data.offers.price;
    delete data.offers.priceCurrency;
    data.offers.description = $('.lp-price').text().replace(/\s+/g, ' ').trim();
  }
  $(el).text(JSON.stringify(data));
});

let out = $.html();
// CSS inline y JS: rutas absolutas + idioma por defecto 'en' + botón ES navega a la home ES
out = out.replace("url('ai-chat-bg.webp')", "url('/ai-chat-bg.webp')");
// Cualquier video del hero referenciado en el JS pasa a ruta absoluta
out = out.replace(/'(hero-[a-z0-9-]+\.mp4)'/g, "'/$1'");
out = out.split('\n').map(line => line.trimEnd()).join('\n');

const destino = path.isAbsolute(salida) ? salida : path.resolve(salida); // --out va relativo al directorio desde el que se ejecuta
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, out);
console.log(salida + ' generado —', aplicados, 'elementos traducidos,', (out.length / 1024 | 0) + 'KB');

// Verificaciones: nada visible en español que tenga data-en sin aplicar
const check = cheerio.load(out);
let mal = 0;
check('[data-en]').each((_, el) => {
  const t = check(el).attr('data-en');
  const con = t.indexOf('<') > -1 ? check(el).html() : check(el).text();
  // Se normalizan comillas y espacios: cheerio reescribe class='x' como class="x",
  // lo que hacía saltar la alarma con textos que llevan HTML dentro.
  const norm = (x) => x.replace(/'/g, '"').replace(/\s+/g, ' ').trim();
  if (norm(t) !== norm(con)) { mal++; if (mal <= 3) console.log('  ✗ no aplicado:', t.slice(0, 60)); }
});
console.log(mal === 0 ? 'verificación: todos los textos EN aplicados ✓' : 'ATENCIÓN: ' + mal + ' sin aplicar');
console.log('lang=', check('html').attr('lang'), '| canonical=', check('link[rel="canonical"]').attr('href'));
