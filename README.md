# Genesis Nexa — web pública

Sitio estático en español e inglés, servido con Nginx. El chat se atiende desde un servidor Node local dentro del mismo contenedor. CRM, facturas y SEO Radar no forman parte de esta aplicación.

## Editar y verificar

Editar `index.html` y `agente-whatsapp/index.html` como fuentes en español. Los atributos `data-en` contienen la traducción. No editar directamente los HTML de `en/`: se generan desde las fuentes.

Con Node 24:

```sh
npm --prefix herramientas ci
npm --prefix herramientas run build
npm --prefix herramientas test
```

El build sincroniza los datos FAQ, `llms.txt` y ambas páginas inglesas. Las pruebas revisan scripts, enlaces locales, imágenes, idiomas, metadatos, preguntas estructuradas, formulario y errores/límites del chat. La automatización de GitHub además construye el contenedor y prueba sus rutas. No publica la web.

## Publicación en el alojamiento existente

1. Incorporar los cambios revisados a la rama que use el alojamiento (el repositorio local está conectado a `main`).
2. Si no empieza una publicación automática, pulsar **Deploy/Rebuild** en el panel donde está alojada la aplicación.
3. Mantener la variable **ANTHROPIC_API_KEY** que ya utiliza el chat. No subirla al repositorio. El modelo puede configurarse mediante **ANTHROPIC_MODEL**; el valor por defecto conserva `claude-sonnet-5`, que funcionó en la comprobación del sitio anterior.
4. El contenedor expone el puerto **80**. El proxy público debe mantener HTTPS y reenviar las solicitudes a ese puerto.
5. Verificar `/api/health` (debe devolver 200), las cuatro páginas, la renovación de $2,500 MXN y una respuesta real del chat después del deployment. Una clave ausente o inválida requiere corregir la configuración del alojamiento.

El límite del chat usa la dirección que Nginx observa y entrega como `X-Real-IP`. Si el alojamiento termina todas las conexiones en un proxy, configurar `real_ip` solo para las redes confiables concretas de ese proveedor; no confiar indiscriminadamente en cualquier cabecera enviada por un visitante.

## Oferta vigente confirmada

- Web Business: $5,000 MXN; Web AI: $6,500 MXN; E-commerce AI: $8,000 MXN. Diseño de pago único.
- Esos tres paquetes incluyen compra del dominio y hosting con Genesis Nexa el primer año.
- Renovación conjunta desde el segundo año: **$2,500 MXN anuales**.
- Hosting independiente contratado a nombre del cliente: se paga aparte.
- Landing Pro: $3,000 MXN; alcance específico de dominio/alojamiento a confirmar.
- WhatsApp Solo: $599/mes; Business: $1,199/mes; Pro: $1,999/mes más $3,000 de implementación. Prueba gratuita de siete días para Solo y Business.
- USD: referencias aproximadas; confirmar el importe de la propuesta.

## Privacidad y medición

Meta Pixel se carga solo después de aceptar medición. Las preferencias se pueden reabrir desde el pie. Los eventos personalizados registran intención de contacto, no ventas confirmadas, y no incluyen contenido de formularios o conversaciones. En localhost no se carga el Pixel, aunque se acepte, para no contaminar los datos reales.

Los mensajes del chat se procesan con Anthropic. El servidor no implementa una base de datos de conversaciones. No confundir el funcionamiento de este chat con posicionamiento en ChatGPT o Google: el acceso de rastreadores no garantiza indexación ni recomendaciones.
