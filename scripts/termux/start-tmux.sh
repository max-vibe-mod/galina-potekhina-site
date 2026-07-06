#!/data/data/com.termux/files/usr/bin/bash
# Сервер + туннель в фоне через tmux (переживает сворачивание Termux)

SITE_DIR="$HOME/galina-site"
SESSION="galina"

tmux kill-session -t "$SESSION" 2>/dev/null || true

tmux new-session -d -s "$SESSION" -c "$SITE_DIR" "bash scripts/termux/start.sh"
sleep 2
tmux split-window -h -t "$SESSION" -c "$SITE_DIR" "bash scripts/termux/tunnel.sh"

echo "Сессия tmux: galina"
echo "Подключиться: tmux attach -t galina"
echo "Отключиться без остановки: Ctrl+B, затем D"
