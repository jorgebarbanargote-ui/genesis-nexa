---
name: seo-optimizer
description: >
  Usa esta skill cuando el usuario quiera optimizar el SEO de una web recién construida.
  Se activa con frases como: "optimiza el SEO", "aplica SEO a la web", "posicionamiento SEO",
  "mejora el SEO del cliente", "añade meta tags", "añade schema", "que la web se posicione bien".
  SIEMPRE úsala después de web-rebuilder o cuando haya archivos HTML de un cliente listos para publicar.
---

# SEO Optimizer — Instrucciones para Claude

## Objetivo
Optimizar el SEO on-page completo de los 4 archivos HTML generados para el cliente.
Adaptar automáticamente la estrategia al sector del negocio detectado.
Modificar los archivos directamente — no generar informes, aplicar los cambios.

---

## Paso 1 — Detectar el negocio y el sector

Lee `index.html` y extrae:
- Nombre de la empresa
- Sector (mudanzas, fontanería, abogados, restaurante, clínica, etc.)
- Ciudad / zona geográfica principal
- Servicios principales (los 3-5 más relevantes)
- Teléfono y email

Con esto construyes la **base SEO** que usarás en todos los pasos siguientes.
El sector determina: el Schema.org correcto, las keywords prioritarias y el tono del contenido.

---

## Paso 2 — Meta tags en las 4 páginas

Para cada página (`index.html`, `servicios.html`, `nosotros.html`, `contacto.html`) añade o reemplaza dentro de `<head>`:

### Title
- Formato: `[Keyword principal] en [Ciudad] | [Nombre empresa]`
- Máximo 60 caracteres
- Cada página debe tener un title único y diferente

### Meta description
- Formato: frase que incluye el servicio + ciudad + llamada a la acción
- Entre 140-160 caracteres
- Incluir el teléfono si cabe

### Open Graph (og:)
```html
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:type" content="website" />
<meta property="og:url" content="..." />
<meta property="og:image" content="assets/hero-poster.jpg" />
<meta property="og:locale" content="es_ES" />
<meta property="og:site_name" content="[Nombre empresa]" />
```

### Twitter Card
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:description" content="..." />
<meta name="twitter:image" content="assets/hero-poster.jpg" />
```

### Meta adicionales en todas las páginas
```html
<meta name="robots" content="index, follow" />
<meta name="author" content="[Nombre empresa]" />
<link rel="canonical" href="[URL de la página]" />
```

---

## Paso 3 — Structured Data (Schema.org)

Detecta el tipo de negocio y aplica el Schema correcto.

### Regla de selección por sector:
| Sector detectado | Schema principal |
|---|---|
| Mudanzas / transporte | `MovingCompany` |
| Restaurante / bar | `Restaurant` |
| Clínica / médico | `MedicalBusiness` |
| Abogados | `LegalService` |
| Fontanería / electricidad | `HomeAndConstructionBusiness` |
| Tienda física | `LocalBusiness` + `Store` |
| Cualquier servicio local | `LocalBusiness` |

Añade el JSON-LD en `index.html` dentro de `<head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "[Tipo detectado]",
  "name": "[Nombre empresa]",
  "description": "[Descripción del negocio extraída del contenido]",
  "url": "[URL si la conoces, si no deja en blanco o pon '#']",
  "telephone": "[Teléfono]",
  "email": "[Email]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Dirección]",
    "addressLocality": "[Ciudad]",
    "addressCountry": "ES"
  },
  "areaServed": ["[Zona 1]", "[Zona 2]", "..."],
  "openingHours": "<!-- REVISAR -->",
  "priceRange": "<!-- REVISAR -->",
  "image": "assets/hero-poster.jpg",
  "logo": "assets/logo.png"
}
</script>
```

También añade Schema de `BreadcrumbList` en las páginas interiores (servicios, nosotros, contacto):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Inicio", "item": "index.html"},
    {"@type": "ListItem", "position": 2, "name": "[Nombre página actual]", "item": "[archivo.html]"}
  ]
}
</script>
```

---

## Paso 4 — Optimización de contenido

Revisa el HTML de cada página y aplica:

### Jerarquía de headings
- Solo un `<h1>` por página — debe contener la keyword principal + ciudad
- Los `<h2>` deben cubrir los servicios o secciones principales
- Los `<h3>` para puntos de detalle

### Keywords en el contenido
- El `<h1>` de index.html debe contener: nombre del sector + ciudad
- Las primeras 100 palabras visibles de cada página deben incluir la keyword principal
- No forzar keywords — si el contenido ya las tiene de forma natural, no tocar

### Atributos alt en imágenes
- Cualquier `<img>` sin `alt` o con `alt=""` debe recibir un alt descriptivo basado en el contexto
- Formato: `[qué muestra la imagen] - [nombre empresa]`
- Ejemplo: `alt="Camión de mudanzas Valenciana de Mudanzas en Valencia"`

### Texto del logo
```html
<img src="assets/logo.png" alt="[Nombre empresa] - Logo" />
```

---

## Paso 5 — Performance técnica

Añade en el `<head>` de todas las páginas:

```html
<!-- Preconnect para Google Fonts si se usa -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Preload del hero para index.html (solo en index.html) -->
<link rel="preload" as="image" href="assets/hero-poster.jpg" />

<!-- Viewport y charset (verificar que existen, añadir si faltan) -->
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

### Lazy loading en imágenes
Cualquier `<img>` que no sea el logo del header ni el hero debe tener:
```html
loading="lazy"
```

### Scripts diferidos
Cualquier `<script src="...">` que no sea crítico (analytics, chat, etc.) debe tener `defer` o `async`.

---

## Paso 6 — Generar sitemap.xml y robots.txt

### sitemap.xml
Crea el archivo `sitemap.xml` en la raíz del proyecto:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>index.html</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>servicios.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>nosotros.html</loc>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>contacto.html</loc>
    <changefreq>yearly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

### robots.txt
Crea el archivo `robots.txt` en la raíz:

```
User-agent: *
Allow: /

Sitemap: sitemap.xml
```

---

## Paso 7 — Al terminar

Confirma al usuario:

1. **Páginas modificadas**: lista los 4 HTML con los cambios aplicados en cada uno
2. **Schema aplicado**: qué tipo de Schema.org se usó y por qué
3. **Archivos nuevos creados**: sitemap.xml y robots.txt
4. **Marcadores <!-- REVISAR -->**: lista cualquier campo que no pudo rellenarse automáticamente (horarios, precio, URL final del sitio)
5. **Siguiente paso recomendado**: "Cuando subas la web a producción, actualiza las URLs en el sitemap y en los og:url con el dominio real del cliente."
