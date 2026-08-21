#!/bin/bash
# Testa a ponte já publicada: manda o certificado real + credencial falsa e
# espera o Inter recusar (prova de que o certificado chegou).
# Uso:  bash testar-servico.sh https://SUA-URL-DA-PONTE/
set -euo pipefail

URL="${1:?Passe a URL da ponte. Ex.: bash testar-servico.sh https://inter-bridge-xxxx.easypanel.host/}"
CERT_DIR="$HOME/Downloads/certificados"
set -a; . "$HOME/.config/luv/inter_bridge.env"; set +a

echo "0) Health check..."
curl -sS -m 15 "$URL" | head -c 100; echo

echo "1) Teste mTLS (certificado real + credencial falsa)..."
PAYLOAD=$(mktemp)
python3 - "$CERT_DIR" "$PAYLOAD" <<'PY'
import json, sys, os
d = sys.argv[1]
open(sys.argv[2], "w").write(json.dumps({
    "metodo": "POST", "caminho": "/oauth/v2/token",
    "corpo": "client_id=00000000-0000-0000-0000-000000000000&client_secret=errado&grant_type=client_credentials&scope=extrato.read saldo.read",
    "headers": {"Content-Type": "application/x-www-form-urlencoded"},
    "cert_pem": open(os.path.join(d, "Inter API_Certificado.crt")).read(),
    "key_pem": open(os.path.join(d, "Inter API_Chave.key")).read(),
}))
PY
R=$(curl -sS -m 45 -X POST "$URL" -H "Content-Type: application/json" -H "x-bridge-secret: $INTER_BRIDGE_SECRET" --data @"$PAYLOAD" || echo TIMEOUT)
rm -f "$PAYLOAD"
echo "   -> $R"
echo
case "$R" in
  *"not valid"*) echo "PONTE FUNCIONANDO — certificado chegou ao Inter. Pode ligar no app." ;;
  *nao\ autorizado*) echo "Segredo diferente: BRIDGE_SECRET na Easypanel precisa ser igual ao INTER_BRIDGE_SECRET local." ;;
  *) echo "Resposta inesperada — mande a linha ao Claude." ;;
esac
