#!/usr/bin/env python3
"""
Сервер только для системы обучения V2
Отдельный инстанс для тестирования новой системы обучения
"""

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import motor.motor_asyncio
import os
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
import logging

# Импорты моделей и функций
from models import LessonV2, TheoryBlock, Exercise, Challenge, ChallengeDay, Quiz, QuizQuestion, LessonFile
from auth import get_current_user, create_access_token

# Импорт базы данных (глобальный объект db)
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Настройка подключения к MongoDB для автономного проекта V2
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://admin:password123@mongodb:27017/learning_v2?authSource=admin")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.learning_v2

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Создание приложения FastAPI
app_v2 = FastAPI(
    title="NumerOM Learning System V2",
    description="Отдельная система обучения V2 для тестирования",
    version="2.0.0"
)

# Настройка CORS для автономного проекта V2
app_v2.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== PYDANTIC МОДЕЛИ ДЛЯ ЗАПРОСОВ =====

class ExerciseResponseRequest(BaseModel):
    """Модель для сохранения ответа студента на упражнение"""
    lesson_id: str
    exercise_id: str
    response_text: str

class ChallengeProgressRequest(BaseModel):
    """Модель для сохранения прогресса студента по челленджу"""
    lesson_id: str
    challenge_id: str
    day: int
    note: str = ""
    completed: bool = False

class ReviewResponseRequest(BaseModel):
    """Модель для комментария администратора к ответу студента"""
    admin_comment: str

class QuizAttemptRequest(BaseModel):
    """Модель для сохранения результата прохождения теста"""
    lesson_id: str
    quiz_id: str
    score: int
    passed: bool
    answers: dict  # {question_id: answer}

# Инициализация подключения к MongoDB
@app_v2.on_event("startup")
async def startup_event():
    logger.info("Learning System V2 запущен и подключен к MongoDB")

@app_v2.on_event("shutdown")
async def shutdown_event():
    logger.info("Learning System V2 остановлен")

# ===== API ТОЛЬКО ДЛЯ СИСТЕМЫ ОБУЧЕНИЯ V2 =====

# Простая аутентификация для тестирования системы обучения V2
@app_v2.post("/api/auth/login")
async def login_v2(request_data: dict):
    """Простая аутентификация для системы обучения V2"""
    email = request_data.get("email", "")
    password = request_data.get("password", "")

    # Для тестирования принимаем любые credentials
    # В реальной системе здесь должна быть проверка с основной БД
    if email and password:
        # Создаем тестовый токен
        test_token = create_access_token({"sub": email, "user_id": "test_user_v2", "is_admin": True})

        return {
            "access_token": test_token,
            "token_type": "bearer",
            "user": {
                "id": "test_user_v2",
                "email": email,
                "name": "Test User V2",
                "is_admin": True,
                "is_super_admin": True
            }
        }

    raise HTTPException(status_code=401, detail="Invalid credentials")

@app_v2.get("/api/user/profile")
async def get_user_profile_v2(current_user: dict = Depends(get_current_user)):
    """Получить профиль пользователя для системы обучения V2"""
    return {
        "id": current_user.get("user_id", "test_user_v2"),
        "email": current_user.get("sub", "test@example.com"),
        "name": "Test User V2",
        "is_admin": True,
        "is_super_admin": True
    }

@app_v2.get("/api/learning-v2/lessons")
async def get_all_lessons_v2_student(current_user: dict = Depends(get_current_user)):
    """Получить все доступные уроки V2 для студентов"""
    try:
        user_id = current_user['user_id']

        # Получаем активные уроки
        lessons = await db.lessons_v2.find({"is_active": True}).sort("order", 1).to_list(1000)

        lessons_list = []
        for lesson in lessons:
            lesson_dict = dict(lesson)
            lesson_dict.pop('_id', None)
            # Убираем чувствительную информацию
            lesson_dict.pop('created_by', None)
            lesson_dict.pop('updated_by', None)
            lessons_list.append(lesson_dict)

        return {
            "lessons": lessons_list,
            "user_level": 10  # Все уровни доступны для тестирования
        }

    except Exception as e:
        logger.error(f"Error getting lessons V2 for student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting lessons: {str(e)}")

@app_v2.get("/api/learning-v2/lessons/{lesson_id}")
async def get_lesson_v2_student(lesson_id: str, current_user: dict = Depends(get_current_user)):
    """Получить урок V2 для студента"""
    try:
        user_id = current_user['user_id']

        lesson = await db.lessons_v2.find_one({"id": lesson_id, "is_active": True})
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

        lesson_dict = dict(lesson)
        lesson_dict.pop('_id', None)
        lesson_dict.pop('created_by', None)
        lesson_dict.pop('updated_by', None)

        return {
            "lesson": lesson_dict,
            "progress": {}  # Пока без прогресса
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lesson V2 for student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting lesson: {str(e)}")

@app_v2.get("/api/admin/lessons-v2")
async def get_all_lessons_v2_admin(current_user: dict = Depends(get_current_user)):
    """Получить все уроки V2 для админа"""
    try:
        logger.info(f"Current user: {current_user}")
        # Проверка прав администратора
        if not current_user.get('is_super_admin', False) and not current_user.get('is_admin', False):
            logger.error(f"Access denied for user: {current_user}")
            raise HTTPException(status_code=403, detail="Недостаточно прав")

        logger.info("Access granted, querying lessons...")
        lessons = await db.lessons_v2.find({}).sort("order", 1).to_list(1000)
        logger.info(f"Found {len(lessons)} lessons")

        lessons_list = []
        for lesson in lessons:
            lesson_dict = dict(lesson)
            lesson_dict.pop('_id', None)
            lessons_list.append(lesson_dict)

        logger.info("Successfully processed lessons")
        return {"lessons": lessons_list}

    except Exception as e:
        import traceback
        logger.error(f"Error getting lessons V2: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error getting lessons: {str(e)}")

@app_v2.put("/api/admin/lessons-v2/{lesson_id}")
async def update_lesson_v2(
    lesson_id: str,
    lesson_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Обновить урок V2 (полное обновление всех разделов)"""
    try:
        # Проверка прав администратора
        if not current_user.get('is_super_admin', False) and not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Недостаточно прав")

        # Подготовим данные для обновления
        update_data = {
            "title": lesson_data.get("title"),
            "description": lesson_data.get("description"),
            "level": lesson_data.get("level", 1),
            "order": lesson_data.get("order", 0),
            "points_required": lesson_data.get("points_required", 0),
            "is_active": lesson_data.get("is_active", True),
            "analytics_enabled": lesson_data.get("analytics_enabled", True),
            "updated_by": current_user.get('user_id', current_user.get('id', 'admin_system')),
            "updated_at": datetime.utcnow()
        }

        # Если указан модуль, обновим его тоже
        if "module" in lesson_data:
            update_data["module"] = lesson_data["module"]

        # Обновляем теорию если передана
        if "theory" in lesson_data:
            update_data["theory"] = lesson_data["theory"]

        # Обновляем упражнения если переданы
        if "exercises" in lesson_data:
            update_data["exercises"] = lesson_data["exercises"]

        # Обновляем челлендж если передан
        if "challenge" in lesson_data:
            update_data["challenge"] = lesson_data["challenge"]

        # Обновляем тест если передан
        if "quiz" in lesson_data:
            update_data["quiz"] = lesson_data["quiz"]

        # Обновляем файлы если переданы
        if "files" in lesson_data:
            update_data["files"] = lesson_data["files"]

        # Обновляем урок в базе данных
        result = await db.lessons_v2.update_one(
            {"id": lesson_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Lesson not found")

        logger.info(f"Lesson {lesson_id} updated successfully with all sections")
        return {"message": "Урок успешно обновлен", "lesson_id": lesson_id}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error updating lesson V2 {lesson_id}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error updating lesson: {str(e)}")

@app_v2.delete("/api/admin/lessons-v2/{lesson_id}")
async def delete_lesson_v2(
    lesson_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Удалить урок V2 с каскадным удалением всех связанных данных"""
    try:
        # Проверка прав администратора
        if not current_user.get('is_super_admin', False) and not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Недостаточно прав")

        # Проверяем существование урока
        lesson = await db.lessons_v2.find_one({"id": lesson_id})
        if not lesson:
            raise HTTPException(status_code=404, detail="Урок не найден")

        # Каскадное удаление связанных данных
        # 1. Удаляем прогресс студентов по этому уроку (если есть коллекция)
        if "lesson_progress" in await db.list_collection_names():
            progress_result = await db.lesson_progress.delete_many({"lesson_id": lesson_id})
            logger.info(f"Deleted {progress_result.deleted_count} progress records for lesson {lesson_id}")

        # 2. Удаляем ответы студентов на упражнения (если есть коллекция)
        if "exercise_responses" in await db.list_collection_names():
            responses_result = await db.exercise_responses.delete_many({"lesson_id": lesson_id})
            logger.info(f"Deleted {responses_result.deleted_count} exercise responses for lesson {lesson_id}")

        # 3. Удаляем результаты тестов (если есть коллекция)
        if "quiz_results" in await db.list_collection_names():
            quiz_result = await db.quiz_results.delete_many({"lesson_id": lesson_id})
            logger.info(f"Deleted {quiz_result.deleted_count} quiz results for lesson {lesson_id}")

        # 4. Удаляем прогресс челленджей (если есть коллекция)
        if "challenge_progress" in await db.list_collection_names():
            challenge_result = await db.challenge_progress.delete_many({"lesson_id": lesson_id})
            logger.info(f"Deleted {challenge_result.deleted_count} challenge progress records for lesson {lesson_id}")

        # 5. Удаляем сам урок
        delete_result = await db.lessons_v2.delete_one({"id": lesson_id})
        
        if delete_result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Не удалось удалить урок")

        logger.info(f"Lesson {lesson_id} and all related data deleted successfully by {current_user.get('user_id')}")
        
        return {
            "message": "Урок и все связанные данные успешно удалены",
            "lesson_id": lesson_id,
            "deleted_by": current_user.get('user_id', current_user.get('id', 'admin'))
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error deleting lesson V2 {lesson_id}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка при удалении урока: {str(e)}")

@app_v2.get("/api/test-db")
async def test_database():
    """Тест подключения к базе данных"""
    try:
        # Попробуем получить количество документов
        count = await db.lessons_v2.count_documents({})
        return {"status": "ok", "lessons_count": count}
    except Exception as e:
        import traceback
        logger.error(f"Database test error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"status": "error", "error": str(e)}

@app_v2.post("/api/admin/lessons-v2/upload-from-file")
async def upload_lesson_from_file_v2(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Загрузить урок V2 из текстового файла"""
    try:
        # Проверка прав администратора
        if not current_user.get('is_super_admin', False) and not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Недостаточно прав")

        # Читаем файл
        content = await file.read()
        text_content = content.decode('utf-8')

        logger.info(f"Current user: {current_user}")

        # Парсим урок из файла
        lesson_obj = parse_lesson_from_text_v2(text_content)

        # Сохраняем в базу данных
        lesson_dict = lesson_obj.dict()
        lesson_dict['created_by'] = current_user.get('user_id', current_user.get('id', 'admin_system'))
        lesson_dict['updated_by'] = current_user.get('user_id', current_user.get('id', 'admin_system'))

        result = await db.lessons_v2.insert_one(lesson_dict)

        return {
            "message": "Урок V2 успешно загружен",
            "lesson_id": lesson_obj.id,
            "sections": {
                "theory_blocks": len(lesson_obj.theory),
                "exercises": len(lesson_obj.exercises),
                "has_challenge": lesson_obj.challenge is not None,
                "has_quiz": lesson_obj.quiz is not None,
                "analytics_enabled": lesson_obj.analytics_enabled
            }
        }

    except Exception as e:
        logger.error(f"Error uploading lesson V2: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading lesson: {str(e)}")

def parse_lesson_from_text_v2(text_content: str) -> LessonV2:
    """Парсить урок V2 из текстового файла"""
    lines = text_content.split('\n')
    lesson_data = {
        'title': '',
        'description': '',
        'module': 'Основы нумерологии',
        'level': 1,
        'order': 0,
        'theory': [],
        'exercises': [],
        'challenge': None,
        'quiz': None
    }

    current_section = None
    current_block = None
    block_order = 0
    exercise_order = 0

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Заголовок урока
        if line.startswith('УРОК') and 'ЦИФРА' in line:
            lesson_data['title'] = line
            i += 1
            continue

        # Разделы
        if '───────────────────────────────────────────────' in line:
            i += 1
            if i < len(lines):
                section_title = lines[i].strip().upper()
                if 'ВВЕДЕНИЕ' in section_title:
                    current_section = 'introduction'
                elif 'КЛЮЧЕВЫЕ КОНЦЕПЦИИ' in section_title:
                    current_section = 'key_concepts'
                elif 'ПРАКТИЧЕСКОЕ ПРИМЕНЕНИЕ' in section_title:
                    current_section = 'practical'
                elif 'УПРАЖНЕНИЯ' in section_title or 'ПРАКТИЧЕСКИЕ ЗАДАНИЯ' in section_title:
                    current_section = 'exercises'
                elif 'ЧЕЛЛЕНДЖ' in section_title or 'ВЫЗОВ' in section_title:
                    current_section = 'challenge'
                elif 'ТЕСТ' in section_title or 'ВОПРОСЫ' in section_title:
                    current_section = 'quiz'
            i += 1
            continue

        # Обрабатываем контент по разделам
        if current_section == 'introduction' and line:
            if not lesson_data['description']:
                lesson_data['description'] = line
            else:
                lesson_data['description'] += ' ' + line

        elif current_section in ['key_concepts', 'practical'] and line:
            # Создаем или добавляем к блоку теории
            if not current_block or current_block.get('title') != section_title:
                current_block = {
                    'title': section_title if section_title else current_section.replace('_', ' ').title(),
                    'content': line,
                    'order': block_order
                }
                lesson_data['theory'].append(current_block)
                block_order += 1
            else:
                current_block['content'] += '\n' + line

        elif current_section == 'exercises' and line.startswith('УПРАЖНЕНИЕ') or line.startswith('ЗАДАНИЕ'):
            # Создаем упражнение
            exercise = {
                'title': line,
                'description': '',
                'type': 'reflection',
                'instructions': '',
                'expected_outcome': '',
                'order': exercise_order
            }

            # Читаем описание упражнения
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('УПРАЖНЕНИЕ') and not lines[i].strip().startswith('───────────────────────────────────────────────'):
                if lines[i].strip():
                    exercise['instructions'] += lines[i].strip() + '\n'
                i += 1

            lesson_data['exercises'].append(exercise)
            exercise_order += 1
            continue

        i += 1

    # Создаем объекты моделей
    theory_blocks = [
        TheoryBlock(
            title=block['title'],
            content=block['content'],
            order=block['order']
        ) for block in lesson_data['theory']
    ]

    exercises = [
        Exercise(
            title=ex['title'],
            description=ex['instructions'][:200] + '...' if len(ex['instructions']) > 200 else ex['instructions'],
            type='reflection',
            instructions=ex['instructions'],
            expected_outcome='Осознание и применение полученных знаний',
            order=ex['order']
        ) for ex in lesson_data['exercises']
    ]

    # Создаем урок V2
    lesson = LessonV2(
        title=lesson_data['title'],
        description=lesson_data['description'],
        module=lesson_data['module'],
        level=lesson_data['level'],
        order=lesson_data['order'],
        theory=theory_blocks,
        exercises=exercises,
        challenge=None,
        quiz=None,
        created_by="admin_system",
        updated_by="admin_system"
    )

    return lesson

# Экспорт приложения для uvicorn
app = app_v2

# ===== ЗАПУСК СЕРВЕРА =====
# ===== ENDPOINTS ДЛЯ ОТВЕТОВ СТУДЕНТОВ =====

@app_v2.post("/api/student/exercise-response")
async def submit_exercise_response(
    request: ExerciseResponseRequest,
    current_user: dict = Depends(get_current_user)
):
    """Сохранить ответ студента на упражнение"""
    try:
        user_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        lesson_id = request.lesson_id
        exercise_id = request.exercise_id
        response_text = request.response_text
        
        # Создаем или обновляем ответ
        response_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "lesson_id": lesson_id,
            "exercise_id": exercise_id,
            "response_text": response_text,
            "submitted_at": datetime.utcnow(),
            "reviewed": False,
            "admin_comment": None,
            "reviewed_at": None,
            "reviewed_by": None
        }
        
        # Проверяем, есть ли уже ответ на это упражнение
        existing_response = await db.exercise_responses.find_one({
            "user_id": user_id,
            "lesson_id": lesson_id,
            "exercise_id": exercise_id
        })
        
        if existing_response:
            # Обновляем существующий ответ
            await db.exercise_responses.update_one(
                {"_id": existing_response["_id"]},
                {"$set": {
                    "response_text": response_text,
                    "submitted_at": datetime.utcnow()
                }}
            )
            response_id = existing_response.get("id", existing_response["_id"])
        else:
            # Создаем новый ответ
            await db.exercise_responses.insert_one(response_data)
            response_id = response_data["id"]
        
        # Обновляем прогресс урока
        await update_lesson_progress(user_id, lesson_id)
        
        logger.info(f"Exercise response saved: user={user_id}, lesson={lesson_id}, exercise={exercise_id}")
        
        return {
            "message": "Ответ сохранен",
            "response_id": response_id,
            "submitted_at": response_data["submitted_at"].isoformat()
        }
        
    except Exception as e:
        import traceback
        logger.error(f"Error saving exercise response: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении ответа: {str(e)}")


@app_v2.get("/api/student/exercise-responses/{lesson_id}")
async def get_all_exercise_responses(
    lesson_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить все ответы студента на упражнения урока"""
    try:
        user_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        
        # Получаем все ответы студента для данного урока
        responses_cursor = db.exercise_responses.find({
            "user_id": user_id,
            "lesson_id": lesson_id
        })
        
        responses = await responses_cursor.to_list(length=None)
        
        # Формируем словарь ответов по exercise_id
        exercise_responses = {}
        for response in responses:
            exercise_id = response.get("exercise_id")
            exercise_responses[exercise_id] = {
                "response_text": response.get("response_text", ""),
                "submitted_at": response.get("submitted_at").isoformat() if response.get("submitted_at") else None,
                "reviewed": response.get("reviewed", False),
                "admin_comment": response.get("admin_comment"),
                "reviewed_at": response.get("reviewed_at").isoformat() if response.get("reviewed_at") else None,
                "reviewed_by": response.get("reviewed_by")
            }
        
        return {
            "lesson_id": lesson_id,
            "exercise_responses": exercise_responses
        }
        
    except Exception as e:
        logger.error(f"Error getting exercise responses: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении ответов: {str(e)}")


@app_v2.get("/api/student/exercise-response/{lesson_id}/{exercise_id}")
async def get_exercise_response(
    lesson_id: str,
    exercise_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить ответ студента на упражнение (старый endpoint для совместимости)"""
    try:
        user_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        
        response = await db.exercise_responses.find_one({
            "user_id": user_id,
            "lesson_id": lesson_id,
            "exercise_id": exercise_id
        })
        
        if not response:
            return {"response_text": "", "submitted_at": None}
        
        return {
            "response_text": response.get("response_text", ""),
            "submitted_at": response.get("submitted_at").isoformat() if response.get("submitted_at") else None,
            "reviewed": response.get("reviewed", False),
            "admin_comment": response.get("admin_comment")
        }
        
    except Exception as e:
        logger.error(f"Error getting exercise response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении ответа: {str(e)}")


async def update_lesson_progress(user_id: str, lesson_id: str):
    """Обновить прогресс студента по уроку"""
    try:
        # Получаем урок
        lesson = await db.lessons_v2.find_one({"id": lesson_id})
        if not lesson:
            return
        
        # Подсчитываем количество выполненных упражнений
        total_exercises = len(lesson.get("exercises", []))
        completed_exercises = await db.exercise_responses.count_documents({
            "user_id": user_id,
            "lesson_id": lesson_id
        })
        
        # Проверяем прогресс по другим разделам
        theory_completed = False  # TODO: добавить отслеживание просмотра теории
        challenge_completed = False  # TODO: проверить прогресс челленджа
        quiz_completed = False  # TODO: проверить результаты теста
        
        # Вычисляем процент завершения
        total_sections = 0
        completed_sections = 0
        
        if lesson.get("theory"):
            total_sections += 1
            if theory_completed:
                completed_sections += 1
        
        if lesson.get("exercises"):
            total_sections += 1
            if completed_exercises >= total_exercises:
                completed_sections += 1
        
        if lesson.get("challenge"):
            total_sections += 1
            if challenge_completed:
                completed_sections += 1
        
        if lesson.get("quiz"):
            total_sections += 1
            if quiz_completed:
                completed_sections += 1
        
        completion_percentage = (completed_sections / total_sections * 100) if total_sections > 0 else 0
        
        # Обновляем или создаем запись прогресса
        progress_data = {
            "user_id": user_id,
            "lesson_id": lesson_id,
            "exercises_completed": completed_exercises,
            "theory_completed": theory_completed,
            "challenge_completed": challenge_completed,
            "quiz_completed": quiz_completed,
            "quiz_passed": False,
            "completion_percentage": completion_percentage,
            "is_completed": completion_percentage >= 100,
            "last_activity_at": datetime.utcnow()
        }
        
        existing_progress = await db.lesson_progress.find_one({
            "user_id": user_id,
            "lesson_id": lesson_id
        })
        
        if existing_progress:
            await db.lesson_progress.update_one(
                {"_id": existing_progress["_id"]},
                {"$set": progress_data}
            )
        else:
            progress_data["id"] = str(uuid.uuid4())
            progress_data["started_at"] = datetime.utcnow()
            progress_data["completed_at"] = None
            progress_data["time_spent_minutes"] = 0
            await db.lesson_progress.insert_one(progress_data)
        
        logger.info(f"Lesson progress updated: user={user_id}, lesson={lesson_id}, completion={completion_percentage}%")
        
    except Exception as e:
        logger.error(f"Error updating lesson progress: {str(e)}")


@app_v2.get("/api/student/lesson-progress/{lesson_id}")
async def get_lesson_progress(
    lesson_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить прогресс студента по уроку"""
    try:
        user_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        
        progress = await db.lesson_progress.find_one({
            "user_id": user_id,
            "lesson_id": lesson_id
        })
        
        if not progress:
            return {
                "exercises_completed": 0,
                "completion_percentage": 0,
                "is_completed": False
            }
        
        return {
            "exercises_completed": progress.get("exercises_completed", 0),
            "theory_completed": progress.get("theory_completed", False),
            "challenge_completed": progress.get("challenge_completed", False),
            "quiz_completed": progress.get("quiz_completed", False),
            "completion_percentage": progress.get("completion_percentage", 0),
            "is_completed": progress.get("is_completed", False),
            "last_activity_at": progress.get("last_activity_at").isoformat() if progress.get("last_activity_at") else None
        }
        
    except Exception as e:
        logger.error(f"Error getting lesson progress: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении прогресса: {str(e)}")


# ===== ENDPOINTS ДЛЯ ТЕСТОВ (СТУДЕНТЫ) =====

@app_v2.post("/api/student/quiz-attempt")
async def submit_quiz_attempt(
    request: QuizAttemptRequest,
    current_user: dict = Depends(get_current_user)
):
    """Сохранить результат прохождения теста студентом с начислением баллов"""
    try:
        user_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        lesson_id = request.lesson_id
        quiz_id = request.quiz_id
        score = request.score
        passed = request.passed
        answers = request.answers
        
        # Получаем урок для определения параметров начисления баллов
        lesson = await db.lessons_v2.find_one({"id": lesson_id})
        quiz = lesson.get("quiz", {}) if lesson else {}
        
        # Параметры начисления баллов за тест
        points_per_percent = quiz.get("points_per_percent", 1)  # 1 балл за каждый процент
        bonus_points = quiz.get("bonus_points", 20)  # Бонус за прохождение теста
        
        # Подсчет баллов
        points_earned = 0
        if passed:
            # Баллы = процент × множитель + бонус за прохождение
            points_earned = (score * points_per_percent) + bonus_points
        else:
            # Даже за непройденный тест начисляем баллы пропорционально проценту
            points_earned = score * points_per_percent
        
        # Создаем запись о попытке с баллами
        attempt_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "lesson_id": lesson_id,
            "quiz_id": quiz_id,
            "score": score,
            "passed": passed,
            "answers": answers,
            "points_earned": points_earned,
            "attempted_at": datetime.utcnow()
        }
        
        # Сохраняем попытку
        await db.quiz_attempts.insert_one(attempt_data)
        
        # Обновляем прогресс урока
        await db.lesson_progress.update_one(
            {
                "user_id": user_id,
                "lesson_id": lesson_id
            },
            {
                "$set": {
                    "quiz_completed": passed,
                    "last_activity_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        # Пересчитываем общий прогресс
        await update_lesson_progress(user_id, lesson_id)
        
        logger.info(f"Quiz attempt saved: user={user_id}, lesson={lesson_id}, score={score}%, points={points_earned}")
        
        return {
            "message": "Результат теста сохранен",
            "attempt_id": attempt_data["id"],
            "score": score,
            "passed": passed,
            "points_earned": points_earned
        }
        
    except Exception as e:
        logger.error(f"Error saving quiz attempt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении результата теста: {str(e)}")


@app_v2.get("/api/student/quiz-attempts/{lesson_id}")
async def get_quiz_attempts(
    lesson_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить все попытки прохождения теста студентом"""
    try:
        user_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        
        attempts_cursor = db.quiz_attempts.find({
            "user_id": user_id,
            "lesson_id": lesson_id
        }).sort("attempted_at", -1)  # Сортировка по дате (новые первые)
        
        attempts = await attempts_cursor.to_list(length=None)
        
        # Форматируем данные с баллами
        formatted_attempts = []
        for attempt in attempts:
            formatted_attempts.append({
                "id": attempt.get("id"),
                "score": attempt.get("score"),
                "passed": attempt.get("passed"),
                "points_earned": attempt.get("points_earned", 0),  # Добавляем баллы
                "attempted_at": attempt.get("attempted_at").isoformat() if attempt.get("attempted_at") else None
            })
        
        return {
            "lesson_id": lesson_id,
            "attempts": formatted_attempts,
            "best_score": max([a["score"] for a in formatted_attempts]) if formatted_attempts else 0,
            "total_attempts": len(formatted_attempts),
            "total_points": sum([a.get("points_earned", 0) for a in formatted_attempts])  # Общая сумма баллов
        }
        
    except Exception as e:
        logger.error(f"Error getting quiz attempts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении попыток теста: {str(e)}")


# ===== ENDPOINTS ДЛЯ ЧЕЛЛЕНДЖЕЙ (СТУДЕНТЫ) =====

@app_v2.post("/api/student/challenge-progress")
async def save_challenge_progress(
    request: ChallengeProgressRequest,
    current_user: dict = Depends(get_current_user)
):
    """Сохранить прогресс студента по челленджу"""
    try:
        lesson_id = request.lesson_id
        challenge_id = request.challenge_id
        day = request.day
        note = request.note
        completed = request.completed
        user_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        
        # Получаем урок для определения длительности челленджа и баллов
        lesson = await db.lessons_v2.find_one({"id": lesson_id})
        challenge = lesson.get("challenge", {}) if lesson else {}
        total_days = challenge.get("duration_days", 7)
        points_per_day = challenge.get("points_per_day", 10)  # Баллы за день
        bonus_points = challenge.get("bonus_points", 50)  # Бонус за завершение
        
        # Проверяем существующий АКТИВНЫЙ прогресс (незавершенный)
        existing_progress = await db.challenge_progress.find_one({
            "user_id": user_id,
            "lesson_id": lesson_id,
            "challenge_id": challenge_id,
            "is_completed": False
        })
        
        if existing_progress:
            # Обновляем существующий прогресс
            daily_notes = existing_progress.get("daily_notes", [])
            completed_days = existing_progress.get("completed_days", [])
            
            # Обновляем или добавляем заметку для дня
            note_found = False
            for i, note_item in enumerate(daily_notes):
                if note_item.get("day") == day:
                    daily_notes[i] = {
                        "day": day,
                        "note": note,
                        "completed_at": datetime.utcnow()
                    }
                    note_found = True
                    break
            
            if not note_found:
                daily_notes.append({
                    "day": day,
                    "note": note,
                    "completed_at": datetime.utcnow()
                })
            
            # Обновляем список завершенных дней
            if completed and day not in completed_days:
                completed_days.append(day)
            
            # Определяем текущий день (максимальный завершенный + 1)
            current_day = max(completed_days) + 1 if completed_days else 1
            
            is_completed = len(completed_days) >= total_days
            
            # Подсчет баллов
            points_earned = 0
            if is_completed:
                points_earned = (len(completed_days) * points_per_day) + bonus_points
            else:
                points_earned = len(completed_days) * points_per_day
            
            # Получаем номер попытки
            total_attempts = await db.challenge_progress.count_documents({
                "user_id": user_id,
                "lesson_id": lesson_id,
                "challenge_id": challenge_id
            })
            
            await db.challenge_progress.update_one(
                {"_id": existing_progress["_id"]},
                {"$set": {
                    "current_day": current_day,
                    "completed_days": completed_days,
                    "daily_notes": daily_notes,
                    "is_completed": is_completed,
                    "completed_at": datetime.utcnow() if is_completed else None,
                    "points_earned": points_earned,
                    "attempt_number": total_attempts
                }}
            )
            
            # Обновляем прогресс урока
            await update_lesson_progress_with_challenge(user_id, lesson_id, is_completed)
            
        else:
            # Получаем номер попытки
            total_attempts = await db.challenge_progress.count_documents({
                "user_id": user_id,
                "lesson_id": lesson_id,
                "challenge_id": challenge_id
            })
            
            # Создаем новый прогресс (новая попытка)
            points_earned = points_per_day if completed else 0
            
            progress_data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "lesson_id": lesson_id,
                "challenge_id": challenge_id,
                "current_day": 1,
                "completed_days": [day] if completed else [],
                "daily_notes": [{
                    "day": day,
                    "note": note,
                    "completed_at": datetime.utcnow()
                }],
                "is_completed": False,
                "started_at": datetime.utcnow(),
                "completed_at": None,
                "points_earned": points_earned,
                "attempt_number": total_attempts + 1
            }
            await db.challenge_progress.insert_one(progress_data)
        
        logger.info(f"Challenge progress saved: user={user_id}, lesson={lesson_id}, day={day}")
        
        return {
            "message": "Прогресс сохранен",
            "day": day,
            "completed": completed
        }
        
    except Exception as e:
        import traceback
        logger.error(f"Error saving challenge progress: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении прогресса: {str(e)}")


@app_v2.get("/api/student/challenge-progress/{lesson_id}/{challenge_id}")
async def get_challenge_progress(
    lesson_id: str,
    challenge_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить текущий прогресс студента по челленджу"""
    try:
        user_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        
        # Ищем активный (незавершенный) прогресс или последний прогресс
        progress = await db.challenge_progress.find_one({
            "user_id": user_id,
            "lesson_id": lesson_id,
            "challenge_id": challenge_id,
            "is_completed": False
        })
        
        # Если нет активного, берем последний завершенный
        if not progress:
            progress_cursor = db.challenge_progress.find({
                "user_id": user_id,
                "lesson_id": lesson_id,
                "challenge_id": challenge_id
            }).sort("started_at", -1).limit(1)
            
            progress_list = await progress_cursor.to_list(length=1)
            progress = progress_list[0] if progress_list else None
        
        if not progress:
            # Получаем количество прохождений
            total_attempts = await db.challenge_progress.count_documents({
                "user_id": user_id,
                "lesson_id": lesson_id,
                "challenge_id": challenge_id
            })
            
            return {
                "current_day": 1,
                "completed_days": [],
                "daily_notes": [],
                "is_completed": False,
                "attempt_number": total_attempts + 1,
                "total_attempts": total_attempts,
                "total_points": 0
            }
        
        # Получаем общее количество прохождений
        total_attempts = await db.challenge_progress.count_documents({
            "user_id": user_id,
            "lesson_id": lesson_id,
            "challenge_id": challenge_id
        })
        
        # Получаем сумму баллов за все прохождения
        pipeline = [
            {"$match": {
                "user_id": user_id,
                "lesson_id": lesson_id,
                "challenge_id": challenge_id,
                "is_completed": True
            }},
            {"$group": {
                "_id": None,
                "total_points": {"$sum": "$points_earned"}
            }}
        ]
        points_result = await db.challenge_progress.aggregate(pipeline).to_list(length=1)
        total_points = points_result[0]["total_points"] if points_result else 0
        
        return {
            "current_day": progress.get("current_day", 1),
            "completed_days": progress.get("completed_days", []),
            "daily_notes": progress.get("daily_notes", []),
            "is_completed": progress.get("is_completed", False),
            "started_at": progress.get("started_at").isoformat() if progress.get("started_at") else None,
            "attempt_number": total_attempts,
            "total_attempts": total_attempts,
            "points_earned": progress.get("points_earned", 0),
            "total_points": total_points
        }
        
    except Exception as e:
        logger.error(f"Error getting challenge progress: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении прогресса: {str(e)}")


@app_v2.get("/api/student/challenge-history/{lesson_id}/{challenge_id}")
async def get_challenge_history(
    lesson_id: str,
    challenge_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить историю всех прохождений челленджа студентом"""
    try:
        user_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        
        # Получаем все прохождения
        attempts_cursor = db.challenge_progress.find({
            "user_id": user_id,
            "lesson_id": lesson_id,
            "challenge_id": challenge_id
        }).sort("started_at", -1)  # Новые первые
        
        attempts = await attempts_cursor.to_list(length=None)
        
        # Форматируем данные
        formatted_attempts = []
        total_points = 0
        
        for attempt in attempts:
            points = attempt.get("points_earned", 0)
            total_points += points
            
            formatted_attempts.append({
                "id": attempt.get("id"),
                "attempt_number": attempt.get("attempt_number", 0),
                "completed_days": attempt.get("completed_days", []),
                "is_completed": attempt.get("is_completed", False),
                "points_earned": points,
                "started_at": attempt.get("started_at").isoformat() if attempt.get("started_at") else None,
                "completed_at": attempt.get("completed_at").isoformat() if attempt.get("completed_at") else None
            })
        
        return {
            "lesson_id": lesson_id,
            "challenge_id": challenge_id,
            "total_attempts": len(attempts),
            "total_points": total_points,
            "attempts": formatted_attempts
        }
        
    except Exception as e:
        logger.error(f"Error getting challenge history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении истории: {str(e)}")


async def update_lesson_progress_with_challenge(user_id: str, lesson_id: str, challenge_completed: bool):
    """Обновить прогресс урока с учетом челленджа"""
    try:
        # Получаем существующий прогресс
        progress = await db.lesson_progress.find_one({
            "user_id": user_id,
            "lesson_id": lesson_id
        })
        
        if progress:
            await db.lesson_progress.update_one(
                {"_id": progress["_id"]},
                {"$set": {
                    "challenge_completed": challenge_completed,
                    "last_activity_at": datetime.utcnow()
                }}
            )
            
            # Пересчитываем процент завершения
            await update_lesson_progress(user_id, lesson_id)
        
    except Exception as e:
        logger.error(f"Error updating lesson progress with challenge: {str(e)}")


# ===== ENDPOINTS ДЛЯ АНАЛИТИКИ (АДМИНИСТРАТОР) =====

@app_v2.get("/api/admin/analytics/lesson/{lesson_id}")
async def get_lesson_analytics(
    lesson_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить аналитику по уроку для администратора"""
    try:
        # Проверка прав администратора
        if not current_user.get('is_admin') and not current_user.get('is_super_admin'):
            raise HTTPException(status_code=403, detail="Доступ запрещен")
        
        # Получаем урок
        lesson = await db.lessons_v2.find_one({"id": lesson_id})
        if not lesson:
            raise HTTPException(status_code=404, detail="Урок не найден")
        
        # Статистика по ответам на упражнения
        exercise_responses = await db.exercise_responses.find({
            "lesson_id": lesson_id
        }).to_list(length=None)
        
        # Группируем ответы по студентам
        students_responses = {}
        for response in exercise_responses:
            user_id = response.get("user_id")
            if user_id not in students_responses:
                students_responses[user_id] = []
            students_responses[user_id].append({
                "exercise_id": response.get("exercise_id"),
                "response_text": response.get("response_text"),
                "submitted_at": response.get("submitted_at").isoformat() if response.get("submitted_at") else None,
                "reviewed": response.get("reviewed", False),
                "admin_comment": response.get("admin_comment")
            })
        
        # Статистика по прогрессу
        lesson_progress_list = await db.lesson_progress.find({
            "lesson_id": lesson_id
        }).to_list(length=None)
        
        # Статистика по тестам
        quiz_attempts = await db.quiz_attempts.find({
            "lesson_id": lesson_id
        }).to_list(length=None)
        
        # Статистика по челленджам
        challenge_progress_list = await db.challenge_progress.find({
            "lesson_id": lesson_id
        }).to_list(length=None)
        
        # Общая статистика
        total_students = len(set([p.get("user_id") for p in lesson_progress_list]))
        completed_students = len([p for p in lesson_progress_list if p.get("is_completed")])
        avg_completion = sum([p.get("completion_percentage", 0) for p in lesson_progress_list]) / len(lesson_progress_list) if lesson_progress_list else 0
        
        total_exercise_responses = len(exercise_responses)
        reviewed_responses = len([r for r in exercise_responses if r.get("reviewed")])
        
        total_quiz_attempts = len(quiz_attempts)
        passed_quizzes = len([q for q in quiz_attempts if q.get("passed")])
        avg_quiz_score = sum([q.get("score", 0) for q in quiz_attempts]) / len(quiz_attempts) if quiz_attempts else 0
        
        # Баллы за тесты
        total_quiz_points = sum([q.get("points_earned", 0) for q in quiz_attempts])
        avg_quiz_points = total_quiz_points / total_quiz_attempts if total_quiz_attempts > 0 else 0
        
        # Топ студентов по баллам за тесты
        user_quiz_points = {}
        for q in quiz_attempts:
            user_id = q.get("user_id")
            points = q.get("points_earned", 0)
            if user_id not in user_quiz_points:
                user_quiz_points[user_id] = {"total_points": 0, "attempts": 0, "passed": 0, "best_score": 0}
            user_quiz_points[user_id]["total_points"] += points
            user_quiz_points[user_id]["attempts"] += 1
            if q.get("passed"):
                user_quiz_points[user_id]["passed"] += 1
            user_quiz_points[user_id]["best_score"] = max(user_quiz_points[user_id]["best_score"], q.get("score", 0))
        
        # Расширенная статистика по челленджам
        unique_challenge_users = len(set([c.get("user_id") for c in challenge_progress_list]))
        total_challenge_attempts = len(challenge_progress_list)
        completed_challenges = len([c for c in challenge_progress_list if c.get("is_completed")])
        total_challenge_notes = sum([len(c.get("daily_notes", [])) for c in challenge_progress_list])
        
        # Баллы за челленджи
        total_points_earned = sum([c.get("points_earned", 0) for c in challenge_progress_list])
        avg_points_per_attempt = total_points_earned / total_challenge_attempts if total_challenge_attempts > 0 else 0
        
        # Топ студентов по баллам челленджа
        user_points = {}
        for c in challenge_progress_list:
            user_id = c.get("user_id")
            points = c.get("points_earned", 0)
            if user_id not in user_points:
                user_points[user_id] = {"total_points": 0, "attempts": 0, "completed": 0}
            user_points[user_id]["total_points"] += points
            user_points[user_id]["attempts"] += 1
            if c.get("is_completed"):
                user_points[user_id]["completed"] += 1
        
        # Прогресс по дням (для графика)
        progress_by_date = {}
        for progress in lesson_progress_list:
            if progress.get("started_at"):
                date_key = progress.get("started_at").strftime("%Y-%m-%d")
                if date_key not in progress_by_date:
                    progress_by_date[date_key] = {"started": 0, "completed": 0}
                progress_by_date[date_key]["started"] += 1
                if progress.get("is_completed"):
                    progress_by_date[date_key]["completed"] += 1
        
        return {
            "lesson_id": lesson_id,
            "lesson_title": lesson.get("title"),
            "statistics": {
                "total_students": total_students,
                "completed_students": completed_students,
                "avg_completion_percentage": round(avg_completion, 2),
                "total_exercise_responses": total_exercise_responses,
                "reviewed_responses": reviewed_responses,
                "pending_review": total_exercise_responses - reviewed_responses,
                "total_quiz_attempts": total_quiz_attempts,
                "passed_quizzes": passed_quizzes,
                "avg_quiz_score": round(avg_quiz_score, 2),
                "total_quiz_points": total_quiz_points,
                "avg_quiz_points": round(avg_quiz_points, 2),
                "unique_challenge_users": unique_challenge_users,
                "total_challenge_attempts": total_challenge_attempts,
                "completed_challenges": completed_challenges,
                "total_challenge_notes": total_challenge_notes,
                "total_points_earned": total_points_earned,
                "avg_points_per_attempt": round(avg_points_per_attempt, 2)
            },
            "quiz_leaderboard": sorted(
                [{"user_id": uid, **data} for uid, data in user_quiz_points.items()],
                key=lambda x: x["total_points"],
                reverse=True
            )[:10],  # Топ 10 по тестам
            "challenge_leaderboard": sorted(
                [{"user_id": uid, **data} for uid, data in user_points.items()],
                key=lambda x: x["total_points"],
                reverse=True
            )[:10],  # Топ 10 по челленджам
            "progress_timeline": sorted(progress_by_date.items()),
            "students_data": [
                {
                    "user_id": progress.get("user_id"),
                    "completion_percentage": progress.get("completion_percentage", 0),
                    "exercises_completed": progress.get("exercises_completed", 0),
                    "quiz_completed": progress.get("quiz_completed", False),
                    "quiz_passed": progress.get("quiz_passed", False),
                    "last_activity_at": progress.get("last_activity_at").isoformat() if progress.get("last_activity_at") else None
                }
                for progress in lesson_progress_list
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lesson analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении аналитики: {str(e)}")


@app_v2.get("/api/admin/analytics/student-responses/{lesson_id}")
async def get_student_responses_for_lesson(
    lesson_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить все ответы студентов на упражнения урока"""
    try:
        # Проверка прав администратора
        if not current_user.get('is_admin') and not current_user.get('is_super_admin'):
            raise HTTPException(status_code=403, detail="Доступ запрещен")
        
        # Получаем урок
        lesson = await db.lessons_v2.find_one({"id": lesson_id})
        if not lesson:
            raise HTTPException(status_code=404, detail="Урок не найден")
        
        # Получаем все ответы
        responses = await db.exercise_responses.find({
            "lesson_id": lesson_id
        }).sort("submitted_at", -1).to_list(length=None)
        
        # Получаем информацию о пользователях
        user_ids = list(set([r.get("user_id") for r in responses]))
        users = await db.users.find({"username": {"$in": user_ids}}).to_list(length=None)
        users_map = {u.get("username"): u.get("full_name", u.get("username")) for u in users}
        
        # Формируем данные по упражнениям
        exercises_map = {ex.get("id"): ex for ex in lesson.get("exercises", [])}
        
        result = []
        for response in responses:
            exercise = exercises_map.get(response.get("exercise_id"), {})
            result.append({
                "id": response.get("id"),
                "user_id": response.get("user_id"),
                "user_name": users_map.get(response.get("user_id"), response.get("user_id")),
                "exercise_id": response.get("exercise_id"),
                "exercise_title": exercise.get("title", "Неизвестное упражнение"),
                "response_text": response.get("response_text"),
                "submitted_at": response.get("submitted_at").isoformat() if response.get("submitted_at") else None,
                "reviewed": response.get("reviewed", False),
                "admin_comment": response.get("admin_comment"),
                "reviewed_at": response.get("reviewed_at").isoformat() if response.get("reviewed_at") else None,
                "reviewed_by": response.get("reviewed_by")
            })
        
        return {
            "lesson_id": lesson_id,
            "lesson_title": lesson.get("title"),
            "total_responses": len(result),
            "responses": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student responses: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении ответов: {str(e)}")


@app_v2.post("/api/admin/review-response/{response_id}")
async def review_student_response(
    response_id: str,
    request: ReviewResponseRequest,
    current_user: dict = Depends(get_current_user)
):
    """Добавить комментарий администратора к ответу студента"""
    try:
        # Проверка прав администратора
        if not current_user.get('is_admin') and not current_user.get('is_super_admin'):
            raise HTTPException(status_code=403, detail="Доступ запрещен")
        
        admin_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        admin_comment = request.admin_comment
        
        # Обновляем ответ
        result = await db.exercise_responses.update_one(
            {"id": response_id},
            {"$set": {
                "reviewed": True,
                "admin_comment": admin_comment,
                "reviewed_at": datetime.utcnow(),
                "reviewed_by": admin_id
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Ответ не найден")
        
        logger.info(f"Response reviewed: response_id={response_id}, admin={admin_id}")
        
        return {
            "message": "Комментарий добавлен",
            "response_id": response_id,
            "reviewed_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reviewing response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при добавлении комментария: {str(e)}")


@app_v2.get("/api/admin/analytics/challenge-notes/{lesson_id}")
async def get_challenge_notes_for_lesson(
    lesson_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить все заметки студентов по челленджу урока"""
    try:
        # Проверка прав администратора
        if not current_user.get('is_admin') and not current_user.get('is_super_admin'):
            raise HTTPException(status_code=403, detail="Доступ запрещен")
        
        # Получаем урок
        lesson = await db.lessons_v2.find_one({"id": lesson_id})
        if not lesson:
            raise HTTPException(status_code=404, detail="Урок не найден")
        
        # Получаем все прогрессы по челленджу
        challenge_progresses = await db.challenge_progress.find({
            "lesson_id": lesson_id
        }).sort("started_at", -1).to_list(length=None)
        
        # Получаем информацию о пользователях
        user_ids = list(set([p.get("user_id") for p in challenge_progresses]))
        users = await db.users.find({"username": {"$in": user_ids}}).to_list(length=None)
        users_map = {u.get("username"): u.get("full_name", u.get("username")) for u in users}
        
        # Формируем данные
        result = []
        for progress in challenge_progresses:
            daily_notes = progress.get("daily_notes", [])
            for note_item in daily_notes:
                if note_item.get("note"):  # Только если есть текст заметки
                    result.append({
                        "user_id": progress.get("user_id"),
                        "user_name": users_map.get(progress.get("user_id"), progress.get("user_id")),
                        "day": note_item.get("day"),
                        "note": note_item.get("note"),
                        "completed_at": note_item.get("completed_at").isoformat() if note_item.get("completed_at") else None,
                        "is_challenge_completed": progress.get("is_completed", False)
                    })
        
        return {
            "lesson_id": lesson_id,
            "lesson_title": lesson.get("title"),
            "total_notes": len(result),
            "notes": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting challenge notes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении заметок: {str(e)}")


@app_v2.get("/api/admin/analytics/overview")
async def get_analytics_overview(
    current_user: dict = Depends(get_current_user)
):
    """Получить общую аналитику системы"""
    try:
        # Проверка прав администратора
        if not current_user.get('is_admin') and not current_user.get('is_super_admin'):
            raise HTTPException(status_code=403, detail="Доступ запрещен")
        
        # Общая статистика
        total_lessons = await db.lessons_v2.count_documents({"is_active": True})
        total_students = await db.users.count_documents({"is_admin": False})
        total_responses = await db.exercise_responses.count_documents({})
        pending_reviews = await db.exercise_responses.count_documents({"reviewed": False})
        
        # Активность за последние 7 дней
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_activity = await db.lesson_progress.count_documents({
            "last_activity_at": {"$gte": seven_days_ago}
        })
        
        # Топ уроков по популярности
        pipeline = [
            {"$group": {
                "_id": "$lesson_id",
                "students_count": {"$sum": 1},
                "avg_completion": {"$avg": "$completion_percentage"}
            }},
            {"$sort": {"students_count": -1}},
            {"$limit": 5}
        ]
        top_lessons = await db.lesson_progress.aggregate(pipeline).to_list(length=5)
        
        # Получаем названия уроков
        lesson_ids = [l.get("_id") for l in top_lessons]
        lessons = await db.lessons_v2.find({"id": {"$in": lesson_ids}}).to_list(length=None)
        lessons_map = {l.get("id"): l.get("title") for l in lessons}
        
        top_lessons_formatted = [
            {
                "lesson_id": l.get("_id"),
                "lesson_title": lessons_map.get(l.get("_id"), "Неизвестный урок"),
                "students_count": l.get("students_count"),
                "avg_completion": round(l.get("avg_completion", 0), 2)
            }
            for l in top_lessons
        ]
        
        return {
            "total_lessons": total_lessons,
            "total_students": total_students,
            "total_responses": total_responses,
            "pending_reviews": pending_reviews,
            "recent_activity_7days": recent_activity,
            "top_lessons": top_lessons_formatted
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analytics overview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении общей аналитики: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server_v2:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
