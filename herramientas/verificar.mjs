import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
const root=path.resolve(process.argv[2]||'.');
const routes=['/','/en/','/agente-whatsapp/','/en/agente-whatsapp/'];
let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
for(const route of routes){
 const file=path.join(root,route.slice(1),'index.html');
 const html=fs.readFileSync(file,'utf8'),$=cheerio.load(html);
 const english=route.startsWith('/en/');
 check($('html').attr('lang')===(english?'en':'es'),route+' language');
 check($('h1').length===1,route+' single h1');check($('main').length===1,route+' main landmark');
 check($('link[rel="canonical"]').attr('href')==='https://genesisnex.com'+route,route+' canonical');
 check($('meta[property="og:url"]').attr('content')==='https://genesisnex.com'+route,route+' social URL');
 check($('title').text()=== $('meta[property="og:title"]').attr('content'),route+' title consistency');
 if(route.includes('agente-whatsapp'))check($('title').text().includes('WhatsApp'),route+' service title');
 const ids=new Set();$('[id]').each((_,e)=>{const id=$(e).attr('id');check(!ids.has(id),route+' duplicate id '+id);ids.add(id);});
 $('label[for]').each((_,e)=>check(ids.has($(e).attr('for')),route+' field label'));
 check($('label:not([for])').length===0,route+' all labels associated');
 $('img').each((_,e)=>check($(e).attr('alt')!==undefined,route+' image alternative text'));
 $('script').each((_,e)=>{const el=$(e);if(el.attr('src'))return;if(el.attr('type')==='application/ld+json'){
   const data=JSON.parse(el.text());
   if(data['@type']==='FAQPage'){
     const items=$('.faq-item').toArray();check(items.length===data.mainEntity.length,route+' FAQ count');
     items.forEach((item,i)=>{check($(item).find('summary').text().trim()===data.mainEntity[i].name,route+' FAQ question matches');check($(item).find('p').text().trim()===data.mainEntity[i].acceptedAnswer.text,route+' FAQ answer matches');});
   }
   if(data['@type']==='Service'&&!english)check(data.offers.price==='599',route+' structured price');
 }else new vm.Script(el.text(),{filename:file});});
 $('[src],[href],[poster]').each((_,e)=>{
  const el=$(e);for(const attr of ['src','href','poster']){
   const value=el.attr(attr);if(!value||/^(data:|mailto:|tel:)/.test(value))continue;
   const url=new URL(value,'https://genesisnex.com'+route);if(url.hostname!=='genesisnex.com')continue;
   let pathname=decodeURIComponent(url.pathname);
   if(pathname.endsWith('/'))pathname+='index.html';
   const target=path.join(root,pathname.slice(1));
   check(fs.existsSync(target),route+' missing file '+value);
   if(url.hash&&url.pathname===route&&!['#privacidad','#terminos'].includes(url.hash))check(ids.has(decodeURIComponent(url.hash.slice(1))),route+' missing anchor '+value);
  }
 });
 const es=route.includes('agente-whatsapp')?'/agente-whatsapp/':'/';
 const en=route.includes('agente-whatsapp')?'/en/agente-whatsapp/':'/en/';
 check($('#lang-btn-es').attr('href')===es,route+' Spanish switch');
 check($('#lang-btn-en').attr('href')===en,route+' English switch');
 if(english){
  $('a[href*="wa.me/"]').each((_,e)=>{const value=new URL($(e).attr('href')).searchParams.get('text');if(value)check(value.startsWith('Hello'),route+' English WhatsApp message');});
 }
 check(!html.includes('"price":"499"'),route+' no outdated price');
 check(!html.includes('this page does not display prices')&&!html.includes('esta página no muestra precios'),route+' visible prices acknowledged');
 check(!html.includes('No usamos cookies de rastreo'),route+' no inaccurate tracking statement');
 console.log('✓',route,'metadata, links, assets, labels, language, JSON-LD and script syntax');
}
for(const file of ['site.js','malla-puntos.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
const llms=fs.readFileSync(path.join(root,'llms.txt'),'utf8');
check(llms.includes('$2,500 MXN'), 'renewal in llms.txt');
check(!llms.includes('$2,000 MXN'), 'old renewal removed');
console.log(`✓ ${checks} checks passed`);
