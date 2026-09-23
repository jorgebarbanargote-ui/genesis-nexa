/* ============================================================
   MALLA DE PUNTOS INTERACTIVA v2 — Genesis Nexa
   Efecto tipo hero de Meta/Stripe: cuadrícula de puntos que
   reacciona al mouse, con onda ambiental, brillo, pulso al
   click y colores automáticos según la paleta del sitio.

   USO — hero solamente:
     MallaPuntos.init({ modo: 'hero', objetivo: '#hero' });

   USO — página entera (fondo fijo detrás de todo):
     MallaPuntos.init({ modo: 'pagina' });

   Sin librerías. Canvas 2D puro. ~3.000 puntos fluidos en móvil.
   ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = {
    modo: 'pagina',          // 'hero' | 'pagina'
    objetivo: null,          // selector CSS del hero (obligatorio en modo 'hero')
    espaciado: 26,           // px entre puntos (en móvil se multiplica x1.35)
    radio: 160,              // radio de influencia del cursor en px
    fuerza: 38,              // desplazamiento máximo de un punto
    interaccion: 'repeler',  // 'repeler' | 'atraer'
    colorBase: 'auto',       // 'auto' o cualquier color CSS
    colorActivo: 'auto',     // 'auto' lee --accent/--primary del :root
    opacidadBase: 0.5,       // opacidad de los puntos en reposo (0 a 1)
    onda: true,              // ondulación ambiental sutil (respira solo)
    ondaAmplitud: 2.2,
    ripple: true,            // pulso expansivo al hacer click / tap
    brillo: true,            // halo en los puntos cercanos al cursor
    zIndex: 0,               // z-index del canvas
    dprMax: 2,               // tope de devicePixelRatio (rendimiento)
    maxPuntos: 6000          // techo duro; sube el espaciado si se pasa
  };

  // ---------- utilidades de color ----------

  function parsearColor(c) {
    var d = document.createElement('div');
    d.style.color = c;
    d.style.display = 'none';
    document.body.appendChild(d);
    var m = getComputedStyle(d).color.match(/[\d.]+/g);
    document.body.removeChild(d);
    return m ? [ +m[0], +m[1], +m[2] ] : null;
  }

  function luminancia(rgb) {
    return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  }

  function fondoDe(el) {
    // Sube por el DOM hasta encontrar un fondo no transparente
    var nodo = el;
    while (nodo && nodo !== document.documentElement) {
      var bg = getComputedStyle(nodo).backgroundColor;
      var m = bg.match(/[\d.]+/g);
      if (m && (m.length < 4 || +m[3] > 0.05)) return [ +m[0], +m[1], +m[2] ];
      nodo = nodo.parentElement;
    }
    var raiz = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g);
    if (raiz && (raiz.length < 4 || +raiz[3] > 0.05)) return [ +raiz[0], +raiz[1], +raiz[2] ];
    // body transparente: el color real puede vivir en el <html>
    var htmlBg = getComputedStyle(document.documentElement).backgroundColor.match(/[\d.]+/g);
    if (htmlBg && (htmlBg.length < 4 || +htmlBg[3] > 0.05)) return [ +htmlBg[0], +htmlBg[1], +htmlBg[2] ];
    return [255, 255, 255];
  }

  function detectarAcento() {
    var raiz = getComputedStyle(document.documentElement);
    var vars = ['--accent', '--color-accent', '--primary', '--color-primary', '--brand', '--color-brand'];
    for (var i = 0; i < vars.length; i++) {
      var val = raiz.getPropertyValue(vars[i]).trim();
      if (val) {
        var rgb = parsearColor(val);
        if (rgb) return rgb;
      }
    }
    return null;
  }

  // ---------- núcleo ----------

  function init(opciones) {
    var cfg = {};
    for (var k in DEFAULTS) cfg[k] = DEFAULTS[k];
    for (var k2 in (opciones || {})) cfg[k2] = opciones[k2];

    var esHero = cfg.modo === 'hero';
    var contenedor = null;
    if (esHero) {
      contenedor = document.querySelector(cfg.objetivo);
      if (!contenedor) {
        console.warn('[MallaPuntos] No existe el selector: ' + cfg.objetivo);
        return null;
      }
      if (getComputedStyle(contenedor).position === 'static') {
        contenedor.style.position = 'relative';
      }
    }

    var reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var tactil = matchMedia('(pointer: coarse)').matches;
    if (tactil) cfg.espaciado = Math.round(cfg.espaciado * 1.35);

    // --- colores ---
    var fondo = fondoDe(esHero ? contenedor : document.body);
    var fondoOscuro = luminancia(fondo) < 0.5;

    var rgbBase = cfg.colorBase === 'auto'
      ? (fondoOscuro ? [148, 163, 191] : [100, 116, 145])
      : (parsearColor(cfg.colorBase) || [148, 163, 191]);

    var rgbActivo = cfg.colorActivo === 'auto'
      ? (detectarAcento() || (fondoOscuro ? [110, 168, 255] : [37, 99, 235]))
      : (parsearColor(cfg.colorActivo) || [110, 168, 255]);

    // --- canvas ---
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'malla-puntos-canvas';
    var st = canvas.style;
    st.pointerEvents = 'none';
    st.display = 'block';
    st.zIndex = String(cfg.zIndex);
    if (esHero) {
      st.position = 'absolute';
      st.inset = '0';
      st.width = '100%';
      st.height = '100%';
      contenedor.insertBefore(canvas, contenedor.firstChild);
    } else {
      st.position = 'fixed';
      st.inset = '0';
      st.width = '100vw';
      st.height = '100vh';
      document.body.insertBefore(canvas, document.body.firstChild);
    }
    var ctx = canvas.getContext('2d');

    // --- estado ---
    var ancho = 0, alto = 0, puntos = [];
    var mouse = { x: -99999, y: -99999 };        // posición suavizada
    var mouseReal = { x: -99999, y: -99999 };
    var velSuave = 0, prevX = null, prevY = null;
    var ripples = [];
    var rafId = null, visible = true, oculto = false;
    var signo = cfg.interaccion === 'atraer' ? -1 : 1;

    function reconstruir() {
      var dpr = Math.min(devicePixelRatio || 1, cfg.dprMax);
      ancho = esHero ? contenedor.clientWidth : innerWidth;
      alto = esHero ? contenedor.clientHeight : innerHeight;
      canvas.width = Math.round(ancho * dpr);
      canvas.height = Math.round(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var esp = cfg.espaciado;
      while ((ancho / esp) * (alto / esp) > cfg.maxPuntos) esp += 4;

      puntos = [];
      var margen = esp / 2;
      for (var y = margen; y < alto; y += esp)
        for (var x = margen; x < ancho; x += esp)
          puntos.push({ x: x, y: y, ox: x, oy: y });

      if (reducirMovimiento) dibujar(0);
    }

    function coordenadas(e) {
      if (esHero) {
        var r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      }
      return { x: e.clientX, y: e.clientY };
    }

    function dibujar(t) {
      ctx.clearRect(0, 0, ancho, alto);

      // cursor suavizado + velocidad (el radio crece si mueves rápido)
      mouse.x += (mouseReal.x - mouse.x) * 0.18;
      mouse.y += (mouseReal.y - mouse.y) * 0.18;
      if (prevX !== null) {
        var v = Math.hypot(mouseReal.x - prevX, mouseReal.y - prevY);
        velSuave += (v - velSuave) * 0.1;
      }
      prevX = mouseReal.x; prevY = mouseReal.y;
      var radioEf = cfg.radio * (1 + Math.min(velSuave / 60, 0.5));

      // limpiar ripples viejos
      for (var i = ripples.length - 1; i >= 0; i--)
        if (t - ripples[i].t0 > 1100) ripples.splice(i, 1);

      var lerp = reducirMovimiento ? 1 : 0.12;

      for (var j = 0; j < puntos.length; j++) {
        var p = puntos[j];
        var tx = p.ox, ty = p.oy;
        var energia = 0;

        // onda ambiental (el fondo "respira" aunque no muevas el mouse)
        if (cfg.onda && !reducirMovimiento) {
          tx += Math.sin(t * 0.0011 + p.ox * 0.011 + p.oy * 0.007) * cfg.ondaAmplitud;
          ty += Math.cos(t * 0.0009 + p.oy * 0.013 + p.ox * 0.006) * cfg.ondaAmplitud;
        }

        // empuje del cursor
        var dx = p.ox - mouse.x, dy = p.oy - mouse.y;
        var dist = Math.hypot(dx, dy) || 1;
        if (dist < radioEf) {
          var cerca = 1 - dist / radioEf;
          var empuje = cerca * cfg.fuerza * signo;
          tx += (dx / dist) * empuje;
          ty += (dy / dist) * empuje;
          energia = cerca;
        }

        // pulso expansivo de los clicks
        for (var r2 = 0; r2 < ripples.length; r2++) {
          var rp = ripples[r2];
          var edad = t - rp.t0;
          var radioOnda = edad * 0.4;
          var ddx = p.ox - rp.x, ddy = p.oy - rp.y;
          var d2 = Math.hypot(ddx, ddy) || 1;
          var anillo = Math.abs(d2 - radioOnda);
          if (anillo < 70) {
            var inten = (1 - anillo / 70) * (1 - edad / 1100);
            tx += (ddx / d2) * inten * 30;
            ty += (ddy / d2) * inten * 30;
            if (inten * 0.9 > energia) energia = inten * 0.9;
          }
        }

        p.x += (tx - p.x) * lerp;
        p.y += (ty - p.y) * lerp;

        // color: interpola del base al activo según la energía
        var rr = Math.round(rgbBase[0] + (rgbActivo[0] - rgbBase[0]) * energia);
        var gg = Math.round(rgbBase[1] + (rgbActivo[1] - rgbBase[1]) * energia);
        var bb = Math.round(rgbBase[2] + (rgbActivo[2] - rgbBase[2]) * energia);
        var alfa = cfg.opacidadBase + (1 - cfg.opacidadBase) * energia;
        var radioPunto = 1.4 + energia * 1.9;

        // halo barato en puntos con energía alta (sin shadowBlur, que es lento)
        if (cfg.brillo && energia > 0.35) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, radioPunto * 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + rr + ',' + gg + ',' + bb + ',' + (energia * 0.12).toFixed(3) + ')';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, radioPunto, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + rr + ',' + gg + ',' + bb + ',' + alfa.toFixed(3) + ')';
        ctx.fill();
      }
    }

    function bucle(t) {
      dibujar(t);
      rafId = requestAnimationFrame(bucle);
    }

    function arrancar() {
      if (rafId === null && !reducirMovimiento && visible && !oculto) {
        rafId = requestAnimationFrame(bucle);
      }
    }
    function frenar() {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }

    // --- eventos ---
    var alMover = function (e) {
      var c = coordenadas(e);
      mouseReal.x = c.x; mouseReal.y = c.y;
      if (reducirMovimiento) { mouse.x = c.x; mouse.y = c.y; dibujar(performance.now()); }
    };
    var alSalir = function () {
      mouseReal.x = -99999; mouseReal.y = -99999;
      if (reducirMovimiento) { mouse.x = -99999; mouse.y = -99999; dibujar(performance.now()); }
    };
    var alPulsar = function (e) {
      if (!cfg.ripple || reducirMovimiento) return;
      var c = coordenadas(e);
      if (esHero && (c.x < 0 || c.y < 0 || c.x > ancho || c.y > alto)) return;
      ripples.push({ x: c.x, y: c.y, t0: performance.now() });
    };

    var timerResize = null;
    var alRedimensionar = function () {
      clearTimeout(timerResize);
      timerResize = setTimeout(reconstruir, 150);
    };
    var alVisibilidad = function () {
      oculto = document.hidden;
      if (oculto) frenar(); else arrancar();
    };

    addEventListener('pointermove', alMover, { passive: true });
    addEventListener('pointerdown', alPulsar, { passive: true });
    document.documentElement.addEventListener('pointerleave', alSalir);
    addEventListener('resize', alRedimensionar);
    document.addEventListener('visibilitychange', alVisibilidad);

    // pausar cuando el canvas no está en pantalla (ahorra batería)
    var observador = null;
    if ('IntersectionObserver' in window) {
      observador = new IntersectionObserver(function (entradas) {
        visible = entradas[0].isIntersecting;
        if (visible) arrancar(); else frenar();
      });
      observador.observe(canvas);
    }

    reconstruir();
    arrancar();

    return {
      destruir: function () {
        frenar();
        removeEventListener('pointermove', alMover);
        removeEventListener('pointerdown', alPulsar);
        document.documentElement.removeEventListener('pointerleave', alSalir);
        removeEventListener('resize', alRedimensionar);
        document.removeEventListener('visibilitychange', alVisibilidad);
        if (observador) observador.disconnect();
        canvas.remove();
      }
    };
  }

  window.MallaPuntos = { init: init };
})();
