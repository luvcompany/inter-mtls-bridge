#!/bin/bash
# Cria um repositório privado com a ponte e faz o push (para a Easypanel puxar).
# Precisa do GitHub CLI logado:  gh auth status
# Rodar de dentro da pasta:  bash deploy-github.sh
set -euo pipefail
cd "$(dirname "$0")"

REPO="${1:-luvcompany/inter-mtls-bridge}"

command -v gh >/dev/null || { echo "Instale/logue o GitHub CLI (gh) primeiro."; exit 1; }

git init -q 2>/dev/null || true
git add -A
git -c user.email="rizodentmarketing@gmail.com" -c user.name="LUV" commit -q -m "Ponte mTLS Inter" || true
git branch -M main

if gh repo view "$REPO" >/dev/null 2>&1; then
  echo "Repo $REPO já existe — atualizando..."
  git remote add origin "https://github.com/$REPO.git" 2>/dev/null || true
  git push -u origin main --force
else
  gh repo create "$REPO" --private --source=. --remote=origin --push
fi

echo
echo "Pronto: https://github.com/$REPO"
echo "Agora crie o serviço na Easypanel apontando para esse repositório (veja README.md)."
