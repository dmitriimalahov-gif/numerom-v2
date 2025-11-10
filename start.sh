#!/bin/bash

echo "🚀 Запуск NumerOM Learning System V2..."

# Остановка существующих контейнеров
docker-compose down

# Сборка и запуск всех сервисов
docker-compose up --build -d

echo "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверка доступности сервисов
echo "🔍 Проверка доступности сервисов..."

# Проверка backend
if curl -s http://localhost:8000/docs > /dev/null; then
    echo "✅ Backend доступен: http://localhost:8000"
else
    echo "❌ Backend недоступен"
fi

# Проверка frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend доступен: http://localhost:3000"
else
    echo "❌ Frontend недоступен"
fi

echo ""
echo "🎯 Сервисы готовы!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 MongoDB: localhost:27017"
echo ""
echo "💡 Тестовые данные для входа:"
echo "   Email: admin@learning-v2.com"
echo "   Пароль: admin123"
