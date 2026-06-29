#!/bin/sh
node /app/server.js &
nginx -g 'daemon off;'
