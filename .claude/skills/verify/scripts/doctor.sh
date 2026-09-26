#!/usr/bin/env bash
# Read-only: is a Kalend dev server on $1 (default 3000) worth driving?
# Usage: .claude/skills/verify/scripts/doctor.sh [port]
set -u
PORT="${1:-3000}"
cd "$(dirname "$0")/../../../.." || exit 1
ok=1
for v in DATABASE_URL NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY DEMO_USER_EMAIL DEMO_USER_PASSWORD; do
  grep -q "^$v=." .env.local 2>/dev/null || { echo "MISSING env: $v in .env.local"; ok=0; }
done
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
