#!/bin/sh
set -eu
nginx -t
node /app/server.js &
api_pid=$!
nginx -g 'daemon off;' &
nginx_pid=$!
cleanup() {
    kill "$api_pid" "$nginx_pid" 2>/dev/null || true
    wait "$api_pid" "$nginx_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 0' TERM INT
while kill -0 "$api_pid" 2>/dev/null && kill -0 "$nginx_pid" 2>/dev/null; do
    sleep 2
done
exit 1
