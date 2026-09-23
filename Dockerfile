FROM nginx:alpine
RUN apk add --no-cache nodejs

# Copy AI API server
RUN mkdir -p /app
COPY api/server.js /app/server.js

# Publish only runtime files; never copy source documents or backups into nginx.
RUN rm -rf /usr/share/nginx/html/*
COPY index.html 404.html robots.txt sitemap.xml llms.txt site.css site.js malla-puntos.js /usr/share/nginx/html/
COPY en/ /usr/share/nginx/html/en/
COPY agente-whatsapp/ /usr/share/nginx/html/agente-whatsapp/
COPY *.webp logo-nav.jpg hero-poster-capcut.jpg ai-avatar.png /usr/share/nginx/html/
COPY hero-capcut.mp4 hero-video-2-movil.mp4 /usr/share/nginx/html/

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/api/health || exit 1
CMD ["/start.sh"]
