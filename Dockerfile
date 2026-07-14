FROM nginx:alpine
RUN apk add --no-cache nodejs

# Copy AI API server
RUN mkdir -p /app
COPY api/server.js /app/server.js

# Copy website files
ARG CACHEBUST=34
COPY . /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/api

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
