#!/usr/bin/env bash
# Start or stop a Kalend dev server for runs that can't call preview_start
# (scheduled tasks). Only stops a server this script started.
# Usage: .claude/skills/verify/scripts/server.sh start|stop [port]
set -u
PORT="${2:-3000}"
cd "$(dirname "$0")/../../../.." || exit 1
DIR=output/verify
PIDFILE="$DIR/server-$PORT.pid"
LOG="$DIR/server-$PORT.log"
mkdir -p "$DIR"

tree() { echo "$1"; for c in $(pgrep -P "$1"); do tree "$c"; done; }
ping_ok() { [ "$(curl -s -m 5 "http://localhost:$PORT/api/ping")" = '{"message":"pong"}' ]; }

case "${1:-}" in
  start)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then echo "ALREADY RUNNING: started by this script, pid=$(cat "$PIDFILE")"; exit 0; fi
    if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      if ping_ok; then echo "REUSING: a server already answers on :$PORT (not started by this script; don't stop it)"; exit 0; fi
      echo "BUSY: :$PORT is taken by something that isn't Kalend; pick another port or stop that process"; exit 1
    fi
    nohup bun run dev -p "$PORT" >"$LOG" 2>&1 &
    echo $! >"$PIDFILE"
    for _ in $(seq 1 90); do
      if ping_ok; then echo "STARTED: pid=$(cat "$PIDFILE") port=$PORT log=$LOG"; exit 0; fi
      kill -0 "$(cat "$PIDFILE")" 2>/dev/null || { echo "EXITED early; last log lines:"; tail -20 "$LOG"; rm -f "$PIDFILE"; exit 1; }
      sleep 1
    done
    echo "TIMEOUT: no pong after 90s; last log lines:"; tail -20 "$LOG"; exit 1
    ;;
  stop)
    [ -f "$PIDFILE" ] || { echo "NOTHING TO STOP: no server started by this script on :$PORT"; exit 0; }
    pid=$(cat "$PIDFILE")
    pids=$(tree "$pid")
    kill -TERM $pids 2>/dev/null
    for _ in $(seq 1 15); do
      alive=$(for p in $pids; do kill -0 "$p" 2>/dev/null && echo "$p"; done)
      [ -z "$alive" ] && { rm -f "$PIDFILE"; echo "STOPPED: pids $(echo $pids) gone, :$PORT free"; exit 0; }
      sleep 1
    done
    kill -KILL $alive 2>/dev/null; rm -f "$PIDFILE"
    echo "KILLED after 15s: $(echo $alive)"
    ;;
  *) echo "usage: $0 start|stop [port]"; exit 2 ;;
esac
