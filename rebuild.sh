#!/bin/bash

# Скрипт для автоматической пересборки и перезапуска контейнеров
# Использование: ./rebuild.sh [backend|frontend|all]

set -e  # Остановить выполнение при ошибке

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Функция для пересборки backend
rebuild_backend() {
    log_info "Пересборка backend..."
    docker-compose down backend
    docker-compose build backend
    docker-compose up -d backend
    log_success "Backend успешно пересобран и запущен!"
}

# Функция для пересборки frontend
rebuild_frontend() {
    log_info "Пересборка frontend..."
    docker-compose down frontend
    docker-compose build frontend
    docker-compose up -d frontend
    log_success "Frontend успешно пересобран и запущен!"
}

# Функция для пересборки всего
rebuild_all() {
    log_info "Пересборка всех сервисов..."
    docker-compose down
    docker-compose build
    docker-compose up -d
    log_success "Все сервисы успешно пересобраны и запущены!"
}

# Основная логика
case "${1:-all}" in
    backend)
        rebuild_backend
        ;;
    frontend)
        rebuild_frontend
        ;;
    all)
        rebuild_all
        ;;
    *)
        log_error "Неизвестный параметр: $1"
        echo "Использование: $0 [backend|frontend|all]"
        echo "  backend  - пересобрать только backend"
        echo "  frontend - пересобрать только frontend"
        echo "  all      - пересобрать все сервисы (по умолчанию)"
        exit 1
        ;;
esac

# Показать статус контейнеров
log_info "Статус контейнеров:"
docker-compose ps

log_success "Готово! Приложение доступно по адресу http://localhost:3000"

