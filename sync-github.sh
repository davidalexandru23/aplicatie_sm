#!/usr/bin/env bash
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
echo "=================================================="
echo "Sincronizare GitHub: $(basename "$PROJECT_DIR")"
echo "Cale: $PROJECT_DIR"
echo "=================================================="

if [ ! -d ".git" ]; then
    echo "Avertisment: Nu este repository Git inițializat."
    exit 0
fi

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
if [ -z "$CURRENT_BRANCH" ]; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
fi

REMOTE_NAME=$(git remote 2>/dev/null | head -n 1)
if [ -z "$REMOTE_NAME" ]; then
    echo "Avertisment: Nu este configurat niciun remote Git."
    exit 0
fi

REMOTE_URL=$(git remote get-url "$REMOTE_NAME" 2>/dev/null)
echo "Remote: $REMOTE_NAME -> $REMOTE_URL"
echo "Branch curent: $CURRENT_BRANCH"

echo "Aducere actualizări (git fetch $REMOTE_NAME)..."
git fetch "$REMOTE_NAME" 2>&1

# Verificare modificări locale nesalvate
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "Notă: Există modificări locale necomise în proiect:"
    git status -s
fi

# Pull dacă există branch remote corespondent
if git rev-parse --verify --quiet "$REMOTE_NAME/$CURRENT_BRANCH" >/dev/null; then
    echo "Actualizare branch local cu $REMOTE_NAME/$CURRENT_BRANCH..."
    git pull --ff-only "$REMOTE_NAME" "$CURRENT_BRANCH" 2>&1 || git pull --rebase "$REMOTE_NAME" "$CURRENT_BRANCH" 2>&1 || echo "Notă: Nu s-a putut face fast-forward pull automat. Vă rugăm verificați starea manual."
else
    echo "Notă: Branch-ul remote $REMOTE_NAME/$CURRENT_BRANCH nu a fost găsit."
fi

echo "Status sincronizare finalizat pentru $(basename "$PROJECT_DIR")."
echo ""
