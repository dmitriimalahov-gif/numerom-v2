# ===== FRONTEND ДЛЯ СИСТЕМЫ ОБУЧЕНИЯ V2 =====

# Используем Node.js для сборки
FROM node:22-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --legacy-peer-deps

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# ===== NGINX ДЛЯ РАЗДАЧИ СТАТИКИ =====
FROM nginx:alpine

# Копируем собранное приложение
COPY --from=builder /app/build /usr/share/nginx/html

# Копируем конфигурацию nginx для learning-v2
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создаем необходимые директории
RUN mkdir -p /usr/share/nginx/html/uploads

# Открываем порт 80
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
