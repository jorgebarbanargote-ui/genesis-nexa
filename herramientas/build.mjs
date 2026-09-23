import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as cheerio from 'cheerio';

// Run from the website root: npm --prefix herramientas run build
const site = path.resolve(process.argv[2] || '.');
const tools = path.dirname(fileURLToPath(import.meta.url));
const domain = 'https://genesisnex.com';
const pages = ['index.html','agente-whatsapp/index.html'];
let home;
let landing;
for (const file of pages) {
  const $ = cheerio.load(fs.readFileSync(path.join(site,file),'utf8'));
  $('script[type="application/ld+json"]').each((_,el)=>{
    const data=JSON.parse($(el).text());
    if(data['@type']==='FAQPage'){
      data.inLanguage='es';
      data.mainEntity=$('.faq-item').toArray().map(item=>({
        '@type':'Question',name:$(item).find('summary').text().trim(),
        acceptedAnswer:{'@type':'Answer',text:$(item).find('p').text().trim()}
      }));
    }
    $(el).text(JSON.stringify(data));
  });
  fs.writeFileSync(path.join(site,file),$.html().split('\n').map(line=>line.trimEnd()).join('\n'));
  if(file==='index.html')home=$;else landing=$;
}
const lines=['# Genesis Nexa','','> Agencia digital para negocios de México y Estados Unidos. Diseño web bilingüe, agentes de IA y publicidad en Meta.','','## Paquetes de páginas web'];
home('.price-cards.packs .pcard').each((_,el)=>{
  const card=home(el);lines.push(`- ${card.find('h3').text()}: ${card.find('.p-amount').text().replace(/\s+/g,' ').trim()}. ${card.find('.p-desc').text()}`);
});
lines.push('',home('.hosting-note').text().trim(),'','## Preguntas sobre páginas web');
for(const [$,title] of [[home,''],[landing,'## Agentes de IA para WhatsApp']]){
  if(title)lines.push('',title);
  $('.faq-item').each((_,el)=>lines.push('',`### ${$(el).find('summary').text().trim()}`,$(el).find('p').text().trim()));
}
lines.push('','## Portafolio');
home('#portafolio a.site-card').each((_,el)=>lines.push(`- [${home(el).find('img').attr('alt')||home(el).text().trim()}](${home(el).attr('href')})`));
lines.push('','## Páginas',`- [Inicio en español](${domain}/)`,`- [Home in English](${domain}/en/)`,`- [Agente de WhatsApp](${domain}/agente-whatsapp/)`,`- [WhatsApp agent in English](${domain}/en/agente-whatsapp/)`,'','## Contacto','- WhatsApp: +1 (786) 357-0624','- Instagram: https://www.instagram.com/genesisnexa','');
fs.writeFileSync(path.join(site,'llms.txt'),lines.join('\n'));
for(const args of [
  [site,'--out='+path.join(site,'en/index.html')],
  [path.join(site,'agente-whatsapp'),'--canonical=/en/agente-whatsapp/','--es-url=/agente-whatsapp/','--out='+path.join(site,'en/agente-whatsapp/index.html')]
])execFileSync(process.execPath,[path.join(tools,'generar-en.mjs'),...args],{stdio:'inherit'});
console.log('FAQ, llms.txt y ambas versiones inglesas sincronizados.');
