#!/usr/bin/env bash
# Read-only: is a Kalend dev server on $1 (default 3000) worth driving?
# Usage: .claude/skills/verify/scripts/doctor.sh [port]
set -u
PORT="${1:-3000}"
cd "$(dirname "$0")/../../../.." || exit 1
ok=1
for v in DATABASE_URL BETTER_AUTH_SECRET BETTER_AUTH_URL; do
  grep -q "^$v=." .env.local 2>/dev/null || { echo "MISSING env: $v in .env.local"; ok=0; }
done
signin=1
grep -q "^KALEND_DEV_SIGN_IN=1$" .env.local 2>/dev/null || { echo "NOTE: KALEND_DEV_SIGN_IN is not 1 in .env.local; /api/dev/sign-in is unavailable"; signin=0; }
for v in DEMO_USER_EMAIL DEMO_USER_PASSWORD; do
  grep -q "^$v=." .env.local 2>/dev/null || { echo "NOTE: $v not set in .env.local; /api/dev/sign-in is unavailable"; signin=0; }
done
[ $signin = 1 ] && echo "dev sign-in configured"
pid=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1)
if [ -z "$pid" ]; then echo "DOWN: nothing listening on :$PORT"; exit 1; fi
cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')
echo "listener pid=$pid cwd=$cwd"
[ "$cwd" = "$PWD" ] || { echo "WARN: port $PORT is served from another checkout/worktree"; ok=0; }
pong=$(curl -s -m 10 "http://localhost:$PORT/api/ping")
[ "$pong" = '{"message":"pong"}' ] && echo "ping OK" || { echo "ping FAILED: $pong"; ok=0; }
code=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "http://localhost:$PORT/api/tasks")
[ "$code" = 307 ] && echo "auth gate OK (unauthenticated /api/tasks -> 307 to /login)" || { echo "auth gate unexpected: $code"; ok=0; }
echo "branch: $(git branch --show-current) @ $(git rev-parse --short HEAD)"
[ $ok = 1 ] && echo "DOCTOR: OK" || { echo "DOCTOR: PROBLEMS"; exit 1; }
