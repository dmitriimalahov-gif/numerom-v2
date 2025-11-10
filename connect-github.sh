#!/bin/bash

# Скрипт для подключения к GitHub
# Использование: ./connect-github.sh YOUR_USERNAME [REPO_NAME]

set -e

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка аргументов
if [ -z "$1" ]; then
    log_error "Не указан GitHub username!"
    echo ""
    echo "Использование: $0 YOUR_USERNAME [REPO_NAME]"
    echo ""
    echo "Примеры:"
    echo "  $0 brandbox"
    echo "  $0 brandbox my-custom-repo"
    echo ""
    exit 1
fi

GITHUB_USERNAME="$1"
REPO_NAME="${2:-numerom-v2}"

log_info "GitHub Username: $GITHUB_USERNAME"
log_info "Repository Name: $REPO_NAME"
echo ""

# Проверка что мы в правильной директории
if [ ! -d ".git" ]; then
    log_error "Это не Git репозиторий! Запустите скрипт из /Users/brandbox/Desktop/numerom-v2"
    exit 1
fi

# Проверка что remote еще не добавлен
if git remote | grep -q "origin"; then
    log_error "Remote 'origin' уже существует!"
    echo ""
    echo "Текущий origin:"
    git remote -v
    echo ""
    echo "Если хотите изменить, сначала удалите старый:"
    echo "  git remote remove origin"
    exit 1
fi

# Добавление remote
log_info "Добавление remote origin..."
REPO_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
git remote add origin "$REPO_URL"
log_success "Remote добавлен: $REPO_URL"
echo ""

# Проверка что ветка называется main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    log_info "Переименование ветки $CURRENT_BRANCH в main..."
    git branch -M main
    log_success "Ветка переименована в main"
    echo ""
fi

# Информация о следующих шагах
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ REMOTE УСПЕШНО ДОБАВЛЕН                      ║"
echo "╠════════════════════════════════════════════════════════════════════╣"
echo ""
log_info "Repository URL: $REPO_URL"
echo ""
log_info "Следующие шаги:"
echo ""
echo "1️⃣ Убедитесь что репозиторий создан на GitHub:"
echo "   🌐 https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
echo ""
echo "   Если репозиторий НЕ создан, создайте его:"
echo "   🌐 https://github.com/new"
echo "   - Название: ${REPO_NAME}"
echo "   - НЕ создавайте README, .gitignore (они уже есть)"
echo ""
echo "2️⃣ Отправьте код на GitHub:"
echo "   git push -u origin main"
echo ""
echo "3️⃣ При запросе аутентификации:"
echo "   - Username: ${GITHUB_USERNAME}"
echo "   - Password: используйте Personal Access Token"
echo "     (создайте на https://github.com/settings/tokens)"
echo ""
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Спросить хотят ли сделать push сейчас
read -p "Хотите выполнить git push сейчас? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Выполнение git push -u origin main..."
    echo ""
    git push -u origin main
    echo ""
    log_success "Код успешно отправлен на GitHub!"
    log_success "Репозиторий: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
else
    log_info "Push отменен. Выполните позже: git push -u origin main"
fi

