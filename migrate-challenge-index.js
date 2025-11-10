// Миграция: удаление уникального индекса для challenge_progress
// Это позволит студентам проходить челлендж многократно

db = db.getSiblingDB('learning_v2');

print("Starting migration: Removing unique index from challenge_progress...");

try {
    // Удаляем старый уникальный индекс
    print("Dropping old unique index...");
    db.challenge_progress.dropIndex("user_id_1_lesson_id_1_challenge_id_1");
    print("✓ Old unique index dropped successfully");
    
    // Создаем новый неуникальный индекс
    print("Creating new non-unique index...");
    db.challenge_progress.createIndex({ "user_id": 1, "lesson_id": 1, "challenge_id": 1 });
    print("✓ New non-unique index created successfully");
    
    // Добавляем новые индексы для баллов и попыток
    print("Adding indexes for attempt_number and points_earned...");
    db.challenge_progress.createIndex({ "attempt_number": 1 });
    db.challenge_progress.createIndex({ "points_earned": -1 });
    print("✓ New indexes created successfully");
    
    print("\n========================================");
    print("Migration completed successfully!");
    print("========================================");
    print("Students can now complete challenges multiple times!");
    print("Each attempt will be tracked separately with points.");
    print("========================================\n");
    
} catch (error) {
    print("\n========================================");
    print("Migration error:");
    print(error);
    print("========================================\n");
    
    // Если индекс уже не существует, это нормально
    if (error.codeName === "IndexNotFound") {
        print("Note: Index was already removed or doesn't exist.");
        print("Creating new indexes...");
        
        db.challenge_progress.createIndex({ "user_id": 1, "lesson_id": 1, "challenge_id": 1 });
        db.challenge_progress.createIndex({ "attempt_number": 1 });
        db.challenge_progress.createIndex({ "points_earned": -1 });
        
        print("✓ Indexes created successfully");
    }
}

