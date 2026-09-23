/* Shared enhancements; core content and language links also work without JS. */
(() => {
  'use strict';
  const english = document.documentElement.lang === 'en';
  const t = (es,en) => english ? en : es;
  document.querySelectorAll('[data-label-es]').forEach(el => el.setAttribute('aria-label', el.getAttribute(english?'data-label-en':'data-label-es')));
  document.querySelectorAll('.lang-switch a').forEach(a => {
    const current = a.lang === document.documentElement.lang;
    a.classList.toggle('active',current);
    if(current) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    a.addEventListener('click',()=> { a.hash = location.hash; });
  });

  // No tracking is loaded before an explicit marketing choice.
  const storageKey = 'gn-marketing';
  let consent;
  try { consent = localStorage.getItem(storageKey); } catch (_) {}
  const production = ['genesisnex.com','www.genesisnex.com'].includes(location.hostname);
  let pixelStarted = false;
  function loadPixel() {
    if(!production || consent!=='yes') return;
    if(pixelStarted){window.fbq('consent','grant');return;}
    const fbq = window.fbq = function(){fbq.callMethod ? fbq.callMethod.apply(fbq,arguments) : fbq.queue.push(arguments);};
    window._fbq = fbq; fbq.push=fbq; fbq.loaded=true; fbq.version='2.0';fbq.queue=[];
    fbq('consent','grant');fbq('init','2236011003635974');
    fbq('set','autoConfig',false,'2236011003635974');
    fbq('track','PageView');pixelStarted=true;
    const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.append(script);
  }
  window.gnTrack = function(event, placement) {
    if(consent==='yes' && production && window.fbq) window.fbq('trackCustom',event,{placement:placement||'page',language:english?'en':'es'});
  };
  const banner=document.createElement('section');banner.className='consent-banner';banner.setAttribute('aria-label',t('Preferencias de privacidad','Privacy preferences'));
  banner.innerHTML=`<strong>${t('Tu privacidad, tú decides','Your privacy, your choice')}</strong><p>${t('Podemos usar Meta Pixel para medir visitas y clics de contacto. Puedes aceptar esta medición o continuar solo con lo necesario.','We can use Meta Pixel to measure visits and contact clicks. You can accept this measurement or continue with necessary functionality only.')}</p><div class="consent-actions"><button type="button" data-choice="no">${t('Solo lo necesario','Necessary only')}</button><button type="button" data-choice="yes">${t('Aceptar medición','Accept measurement')}</button></div>`;
  document.body.append(banner);
  function showBanner(show){banner.hidden=!show;document.body.classList.toggle('consent-open',show);}
  banner.addEventListener('click',e=>{
    const choice=e.target.closest('[data-choice]');if(!choice)return;
    consent=choice.dataset.choice;
    try{localStorage.setItem(storageKey,consent);}catch(_){}
    if(consent==='yes')loadPixel();
    else if(window.fbq)window.fbq('consent','revoke');
    if(consent==='no')for(const name of ['_fbp','_fbc']){
      document.cookie=`${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      if(production)document.cookie=`${name}=; Max-Age=0; Path=/; Domain=.genesisnex.com; SameSite=Lax`;
    }
    showBanner(false);
  });
  const settings=document.createElement('button');settings.type='button';settings.className='privacy-settings';settings.textContent=t('Preferencias de privacidad','Privacy preferences');
  settings.addEventListener('click',()=>{showBanner(true);banner.querySelector('button').focus();});
  (document.querySelector('.legal-links,.lp-foot .container')||document.body).append(settings);
  showBanner(consent!=='yes'&&consent!=='no');if(consent==='yes')loadPixel();
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');if(!a)return;
    if(a.hostname==='wa.me')window.gnTrack('WhatsAppClick',a.closest('section')?.id||a.closest('.chatbot-window')?.id||'navigation');
  });

  // Do not hide content unless reveal observers actually exist.
  if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('js-reveal');
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}
    }),{threshold:0.05});
    document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
  }

  // Modal focus stays within the open surface and returns to the opener.
  document.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const surface=document.querySelector('.legal-modal.open')||document.querySelector('.mobile-menu.open');
    if(!surface)return;
    let nodes=[...surface.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(el=>el.getClientRects().length);
    if(surface.id==='mobile-menu')nodes=[document.getElementById('hamburger'),...nodes];
    if(!nodes.length)return;
    const first=nodes[0],last=nodes.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  function openHash(){if(location.hash==='#privacidad'&&window.openLegal)window.openLegal('modal-privacidad');if(location.hash==='#terminos'&&window.openLegal)window.openLegal('modal-terminos');}
  window.addEventListener('hashchange',openHash);openHash();
})();
