// Инициализация базы данных для NumerOM Learning System V2
db = db.getSiblingDB('learning_v2');

// Создание индексов для коллекций
db.lessons_v2.createIndex({ "lesson_id": 1 }, { unique: true });
db.lessons_v2.createIndex({ "is_active": 1 });
db.lessons_v2.createIndex({ "order": 1 });

db.lesson_progress_v2.createIndex({ "user_id": 1, "lesson_id": 1 }, { unique: true });
db.lesson_progress_v2.createIndex({ "completed_at": 1 });

db.user_lesson_analytics.createIndex({ "user_id": 1 });
db.user_lesson_analytics.createIndex({ "lesson_id": 1 });

print("NumerOM Learning System V2 database initialized successfully");

