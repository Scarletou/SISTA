#!/bin/bash
# Démarre Sista + le tunnel dans UNE seule fenêtre du Terminal.
# Utilisation : ~/Documents/sista/demarrer.sh      (Ctrl + C arrête Sista ; le tunnel reste allumé)
cd "$(dirname "$0")" || exit 1

# 1. Arrêter une ancienne Sista qui occuperait la place
OLD=$(lsof -ti tcp:3000 -sTCP:LISTEN)
if [ -n "$OLD" ]; then kill $OLD; sleep 1; fi

# 2. Tunnel : on garde celui qui tourne déjà (même adresse), sinon on en lance un nouveau
URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' tunnel.log 2>/dev/null | head -1)
if [ -z "$URL" ] || ! pgrep -f "cloudflared tunnel" >/dev/null; then
  pkill -f "cloudflared tunnel" 2>/dev/null
  rm -f tunnel.log
  nohup ./cloudflared tunnel --url http://localhost:3000 > tunnel.log 2>&1 &
  echo "Démarrage du tunnel…"
  for i in $(seq 1 40); do
    URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' tunnel.log 2>/dev/null | head -1)
    [ -n "$URL" ] && break
    sleep 1
  done
  NEW=1
fi

echo
echo "=================================================================="
if [ -n "$URL" ]; then
  echo " Adresse du webhook : $URL/webhook"
  if [ -n "$NEW" ]; then
    echo " ⚠️  NOUVELLE adresse : colle-la chez Meta (Configuration › Callback URL)"
  else
    echo " ✅ Même adresse que la dernière fois : rien à changer chez Meta"
  fi
else
  echo " ⚠️  Le tunnel n'a pas démarré. Vérifie internet, puis relance ce script."
fi
echo "=================================================================="
echo

# 3. Sista (dans cette fenêtre)
npm start
