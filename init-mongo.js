// Инициализация базы данных для NumerOM Learning System V2
db = db.getSiblingDB('learning_v2');

print("Initializing NumerOM Learning System V2 database...");

// ===== КОЛЛЕКЦИЯ: lessons_v2 =====
// Хранит все уроки с теорией, упражнениями, челленджами и тестами
print("Creating indexes for lessons_v2...");
db.lessons_v2.createIndex({ "id": 1 }, { unique: true });
db.lessons_v2.createIndex({ "is_active": 1 });
db.lessons_v2.createIndex({ "order": 1 });
db.lessons_v2.createIndex({ "created_at": -1 });
db.lessons_v2.createIndex({ "updated_at": -1 });

// ===== КОЛЛЕКЦИЯ: exercise_responses =====
// Хранит ответы студентов на упражнения
print("Creating indexes for exercise_responses...");
db.exercise_responses.createIndex({ "id": 1 }, { unique: true });
db.exercise_responses.createIndex({ "user_id": 1, "lesson_id": 1, "exercise_id": 1 }, { unique: true });
db.exercise_responses.createIndex({ "user_id": 1 });
db.exercise_responses.createIndex({ "lesson_id": 1 });
db.exercise_responses.createIndex({ "exercise_id": 1 });
db.exercise_responses.createIndex({ "submitted_at": -1 });
db.exercise_responses.createIndex({ "reviewed": 1 });
db.exercise_responses.createIndex({ "reviewed_by": 1 });

// ===== КОЛЛЕКЦИЯ: lesson_progress =====
// Хранит прогресс студентов по урокам
print("Creating indexes for lesson_progress...");
db.lesson_progress.createIndex({ "id": 1 }, { unique: true });
db.lesson_progress.createIndex({ "user_id": 1, "lesson_id": 1 }, { unique: true });
db.lesson_progress.createIndex({ "user_id": 1 });
db.lesson_progress.createIndex({ "lesson_id": 1 });
db.lesson_progress.createIndex({ "is_completed": 1 });
db.lesson_progress.createIndex({ "completion_percentage": -1 });
db.lesson_progress.createIndex({ "last_activity_at": -1 });
db.lesson_progress.createIndex({ "started_at": -1 });
db.lesson_progress.createIndex({ "completed_at": -1 });

// ===== КОЛЛЕКЦИЯ: quiz_attempts =====
// Хранит попытки прохождения тестов
print("Creating indexes for quiz_attempts...");
db.quiz_attempts.createIndex({ "id": 1 }, { unique: true });
db.quiz_attempts.createIndex({ "user_id": 1, "lesson_id": 1 });
db.quiz_attempts.createIndex({ "user_id": 1 });
db.quiz_attempts.createIndex({ "lesson_id": 1 });
db.quiz_attempts.createIndex({ "quiz_id": 1 });
db.quiz_attempts.createIndex({ "passed": 1 });
db.quiz_attempts.createIndex({ "score": -1 });
db.quiz_attempts.createIndex({ "started_at": -1 });
db.quiz_attempts.createIndex({ "completed_at": -1 });

// ===== КОЛЛЕКЦИЯ: challenge_progress =====
// Хранит прогресс студентов по челленджам
print("Creating indexes for challenge_progress...");
db.challenge_progress.createIndex({ "id": 1 }, { unique: true });
db.challenge_progress.createIndex({ "user_id": 1, "lesson_id": 1, "challenge_id": 1 }, { unique: true });
db.challenge_progress.createIndex({ "user_id": 1 });
db.challenge_progress.createIndex({ "lesson_id": 1 });
db.challenge_progress.createIndex({ "challenge_id": 1 });
db.challenge_progress.createIndex({ "is_completed": 1 });
db.challenge_progress.createIndex({ "current_day": 1 });
db.challenge_progress.createIndex({ "started_at": -1 });
db.challenge_progress.createIndex({ "completed_at": -1 });

// ===== КОЛЛЕКЦИЯ: student_analytics =====
// Хранит общую аналитику по студентам
print("Creating indexes for student_analytics...");
db.student_analytics.createIndex({ "id": 1 }, { unique: true });
db.student_analytics.createIndex({ "user_id": 1 }, { unique: true });
db.student_analytics.createIndex({ "total_lessons_completed": -1 });
db.student_analytics.createIndex({ "total_exercises_completed": -1 });
db.student_analytics.createIndex({ "average_quiz_score": -1 });
db.student_analytics.createIndex({ "last_activity_at": -1 });

// ===== КОЛЛЕКЦИЯ: users =====
// Хранит информацию о пользователях
print("Creating indexes for users...");
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "is_admin": 1 });
db.users.createIndex({ "is_super_admin": 1 });
db.users.createIndex({ "created_at": -1 });

// ===== СТАТИСТИКА =====
print("\n========================================");
print("Database initialization completed!");
print("========================================");
print("Collections created:");
print("  • lessons_v2 - Уроки с контентом");
print("  • exercise_responses - Ответы на упражнения");
print("  • lesson_progress - Прогресс по урокам");
print("  • quiz_attempts - Попытки прохождения тестов");
print("  • challenge_progress - Прогресс по челленджам");
print("  • student_analytics - Общая аналитика студентов");
print("  • users - Пользователи системы");
print("========================================");
print("All indexes created successfully!");
print("========================================\n");

