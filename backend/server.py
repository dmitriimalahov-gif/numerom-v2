#!/usr/bin/env python3
"""
Сервер только для системы обучения V2
Отдельный инстанс для тестирования новой системы обучения
"""

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import motor.motor_asyncio
import os
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
import logging
import traceback

# Импорты моделей и функций
from models import LessonV2, TheoryBlock, Exercise, Challenge, ChallengeDay, Quiz, QuizQuestion, LessonFile
from auth import get_current_user, create_access_token, get_password_hash, verify_password

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
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://numerom.site").split(",")
allowed_origins = [origin.strip() for origin in allowed_origins if origin.strip()]

app_v2.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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


class TimeActivityRequest(BaseModel):
    """Модель для отслеживания времени активности студента"""
    lesson_id: str
    minutes_spent: int  # Количество минут, проведенных на уроке

class FileAnalyticsRequest(BaseModel):
    """Модель для записи просмотра или скачивания файла"""
    file_id: str
    lesson_id: str
    action: str  # 'view' или 'download'
    
class VideoWatchTimeRequest(BaseModel):
    """Модель для отслеживания времени просмотра видео"""
    file_id: str
    lesson_id: str
    minutes_watched: int  # Количество минут просмотра


# Инициализация подключения к MongoDB
@app_v2.on_event("startup")
async def startup_event():
    logger.info("Learning System V2 запущен и подключен к MongoDB")

@app_v2.on_event("shutdown")
async def shutdown_event():
    logger.info("Learning System V2 остановлен")

# ===== API ТОЛЬКО ДЛЯ СИСТЕМЫ ОБУЧЕНИЯ V2 =====

# Простая аутентификация для тестирования системы обучения V2
SUPER_ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "dmitrii.malahov@gmail.com").lower()
SUPER_ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "756bvy67H")


@app_v2.post("/api/auth/login")
async def login_v2(request_data: dict):
    """Аутентификация для системы обучения V2"""
    email_raw = request_data.get("email", "")
    password = request_data.get("password", "")

    if not email_raw or not password:
        raise HTTPException(status_code=400, detail="Не заполнены email или пароль")

    email = email_raw.strip().lower()
    is_super_admin = email == SUPER_ADMIN_EMAIL

    if is_super_admin:
        if password != SUPER_ADMIN_PASSWORD:
            raise HTTPException(status_code=401, detail="Неверные учетные данные")

        now = datetime.utcnow()
        admin_update = {
            "email": email,
            "username": email,
            "full_name": request_data.get("name") or "Суперадминистратор",
            "is_admin": True,
            "is_super_admin": True,
            "password_hash": get_password_hash(password),
            "updated_at": now
        }

        await db.users.update_one(
            {"email": email},
            {
                "$set": admin_update,
                "$setOnInsert": {
                    "created_at": now
                }
            },
            upsert=True
        )

        user_doc = await db.users.find_one({"email": email})
        access_token = create_access_token({
            "sub": email,
            "user_id": user_doc.get("username", email),
            "is_admin": True,
            "is_super_admin": True
        })

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_doc.get("username", email),
                "email": email,
                "full_name": user_doc.get("full_name", "Суперадминистратор"),
                "is_admin": True,
                "is_super_admin": True
            }
        }

    # Обычные пользователи (студенты)
    user_doc = await db.users.find_one({"email": email})

    if not user_doc:
        now = datetime.utcnow()
        new_user = {
            "email": email,
            "username": email,
            "full_name": request_data.get("name") or email.split('@')[0],
            "password_hash": get_password_hash(password),
            "is_admin": False,
            "is_super_admin": False,
            "created_at": now,
            "updated_at": now
        }
        await db.users.insert_one(new_user)
        user_doc = new_user
    else:
        stored_hash = user_doc.get("password_hash")
        if not stored_hash or not verify_password(password, stored_hash):
            raise HTTPException(status_code=401, detail="Неверные учетные данные")

        if user_doc.get("is_admin") or user_doc.get("is_super_admin"):
            await db.users.update_one(
                {"email": email},
                {"$set": {"is_admin": False, "is_super_admin": False}}
            )
            user_doc["is_admin"] = False
            user_doc["is_super_admin"] = False

    access_token = create_access_token({
        "sub": email,
        "user_id": user_doc.get("username", email),
        "is_admin": False,
        "is_super_admin": False
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_doc.get("username", email),
            "email": email,
            "full_name": user_doc.get("full_name", user_doc.get("username", email)),
            "is_admin": False,
            "is_super_admin": False
        }
    }

@app_v2.get("/api/user/profile")
async def get_user_profile_v2(current_user: dict = Depends(get_current_user)):
    """Получить профиль пользователя для системы обучения V2"""
    email = current_user.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Не удалось определить пользователя")

    user_doc = await db.users.find_one({"email": email})
    if not user_doc:
        return {
            "id": current_user.get("user_id", email),
            "email": email,
            "full_name": email.split('@')[0],
            "is_admin": current_user.get("is_admin", False),
            "is_super_admin": current_user.get("is_super_admin", False)
        }

    return {
        "id": user_doc.get("username", email),
        "email": email,
        "full_name": user_doc.get("full_name", email.split('@')[0]),
        "is_admin": user_doc.get("is_admin", False),
        "is_super_admin": user_doc.get("is_super_admin", False)
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
        # Теория считается пройденной, если есть хоть какая-то активность в уроке
        theory_completed = True  # Теория считается пройденной по умолчанию
        
        # Проверяем челлендж - есть ли хотя бы одна завершенная попытка
        challenge_completed = False
        if lesson.get("challenge"):
            challenge_count = await db.challenge_progress.count_documents({
                "user_id": user_id,
                "lesson_id": lesson_id,
                "is_completed": True
            })
            challenge_completed = challenge_count > 0
        
        # Проверяем тест - есть ли хотя бы одна пройденная попытка
        quiz_completed = False
        quiz_passed = False
        if lesson.get("quiz"):
            quiz_attempt = await db.quiz_attempts.find_one({
                "user_id": user_id,
                "lesson_id": lesson_id,
                "passed": True
            })
            if quiz_attempt:
                quiz_completed = True
                quiz_passed = True
        
        # Вычисляем процент завершения
        total_sections = 0
        completed_sections = 0
        
        if lesson.get("theory"):
            total_sections += 1
            if theory_completed:
                completed_sections += 1
        
        if lesson.get("exercises") and total_exercises > 0:
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
        is_completed = completion_percentage >= 100
        
        # Обновляем или создаем запись прогресса
        progress_data = {
            "user_id": user_id,
            "lesson_id": lesson_id,
            "exercises_completed": completed_exercises,
            "theory_completed": theory_completed,
            "challenge_completed": challenge_completed,
            "quiz_completed": quiz_completed,
            "quiz_passed": quiz_passed,
            "completion_percentage": round(completion_percentage, 2),
            "is_completed": is_completed,
            "last_activity_at": datetime.utcnow()
        }
        
        existing_progress = await db.lesson_progress.find_one({
            "user_id": user_id,
            "lesson_id": lesson_id
        })
        
        if existing_progress:
            # Если урок только что завершён, устанавливаем completed_at
            if is_completed and not existing_progress.get("is_completed", False):
                progress_data["completed_at"] = datetime.utcnow()
            
            await db.lesson_progress.update_one(
                {"_id": existing_progress["_id"]},
                {"$set": progress_data}
            )
        else:
            progress_data["id"] = str(uuid.uuid4())
            progress_data["started_at"] = datetime.utcnow()
            progress_data["completed_at"] = datetime.utcnow() if is_completed else None
            progress_data["time_spent_minutes"] = 0
            await db.lesson_progress.insert_one(progress_data)
        
        logger.info(f"Lesson progress updated: user={user_id}, lesson={lesson_id}, completion={completion_percentage}%, sections: {completed_sections}/{total_sections}")
        
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
        
        # Пересчитываем прогресс перед возвратом
        await update_lesson_progress(user_id, lesson_id)
        
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


@app_v2.post("/api/student/time-activity")
async def track_time_activity(
    request: TimeActivityRequest,
    current_user: dict = Depends(get_current_user)
):
    """Отслеживание времени активности студента и начисление баллов (1 балл за минуту)"""
    try:
        user_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        lesson_id = request.lesson_id
        minutes_spent = request.minutes_spent
        
        # Начисляем баллы: 1 балл за минуту
        points_earned = minutes_spent
        
        # Проверяем, есть ли уже запись для этого урока
        existing_activity = await db.time_activity.find_one({
            "user_id": user_id,
            "lesson_id": lesson_id
        })
        
        if existing_activity:
            # Обновляем существующую запись
            new_total_minutes = existing_activity.get("total_minutes", 0) + minutes_spent
            new_total_points = existing_activity.get("total_points", 0) + points_earned
            
            await db.time_activity.update_one(
                {
                    "user_id": user_id,
                    "lesson_id": lesson_id
                },
                {
                    "$set": {
                        "total_minutes": new_total_minutes,
                        "total_points": new_total_points,
                        "last_activity_at": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"Time activity updated: user={user_id}, lesson={lesson_id}, minutes={new_total_minutes}, points={new_total_points}")
            
            return {
                "message": "Время активности обновлено",
                "total_minutes": new_total_minutes,
                "total_points": new_total_points,
                "points_earned": points_earned
            }
        else:
            # Создаем новую запись
            activity_data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "lesson_id": lesson_id,
                "total_minutes": minutes_spent,
                "total_points": points_earned,
                "started_at": datetime.utcnow(),
                "last_activity_at": datetime.utcnow()
            }
            
            await db.time_activity.insert_one(activity_data)
            
            logger.info(f"Time activity created: user={user_id}, lesson={lesson_id}, minutes={minutes_spent}, points={points_earned}")
            
            return {
                "message": "Время активности сохранено",
                "total_minutes": minutes_spent,
                "total_points": points_earned,
                "points_earned": points_earned
            }
        
    except Exception as e:
        logger.error(f"Error tracking time activity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при отслеживании времени: {str(e)}")


@app_v2.get("/api/student/time-activity/{lesson_id}")
async def get_time_activity(
    lesson_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить статистику времени активности студента для урока"""
    try:
        user_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        
        activity = await db.time_activity.find_one({
            "user_id": user_id,
            "lesson_id": lesson_id
        })
        
        if not activity:
            return {
                "total_minutes": 0,
                "total_points": 0,
                "started_at": None,
                "last_activity_at": None
            }
        
        return {
            "total_minutes": activity.get("total_minutes", 0),
            "total_points": activity.get("total_points", 0),
            "started_at": activity.get("started_at").isoformat() if activity.get("started_at") else None,
            "last_activity_at": activity.get("last_activity_at").isoformat() if activity.get("last_activity_at") else None
        }
        
    except Exception as e:
        logger.error(f"Error getting time activity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении статистики времени: {str(e)}")


@app_v2.delete("/api/student/reset-lesson/{lesson_id}")
async def reset_lesson_progress(
    lesson_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Сброс всего прогресса студента по уроку (для повторного прохождения)"""
    try:
        user_id = current_user.get('user_id', current_user.get('id', 'unknown'))
        
        # Удаляем все ответы на упражнения
        await db.exercise_responses.delete_many({
            "user_id": user_id,
            "lesson_id": lesson_id
        })
        
        # Удаляем прогресс урока
        await db.lesson_progress.delete_many({
            "user_id": user_id,
            "lesson_id": lesson_id
        })
        
        # НЕ удаляем попытки тестов и челленджей - они остаются в истории
        # НЕ удаляем время активности - оно продолжает накапливаться
        
        logger.info(f"Lesson progress reset: user={user_id}, lesson={lesson_id}")
        
        return {
            "message": "Прогресс урока сброшен",
            "lesson_id": lesson_id
        }
        
    except Exception as e:
        logger.error(f"Error resetting lesson progress: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при сбросе прогресса: {str(e)}")


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
        
        # Подсчет выданных баллов
        challenge_points_cursor = await db.challenge_progress.aggregate([
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$points_earned", 0]}}}}
        ]).to_list(length=None)
        total_challenge_points = challenge_points_cursor[0]["total"] if challenge_points_cursor else 0
        
        quiz_points_cursor = await db.quiz_attempts.aggregate([
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$points_earned", 0]}}}}
        ]).to_list(length=None)
        total_quiz_points = quiz_points_cursor[0]["total"] if quiz_points_cursor else 0
        
        time_points_cursor = await db.time_activity.aggregate([
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$total_points", 0]}}}}
        ]).to_list(length=None)
        total_time_points = time_points_cursor[0]["total"] if time_points_cursor else 0
        
        video_points_cursor = await db.video_watch_time.aggregate([
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$total_points", 0]}}}}
        ]).to_list(length=None)
        total_video_points = video_points_cursor[0]["total"] if video_points_cursor else 0
        
        total_points_awarded = total_challenge_points + total_quiz_points + total_time_points + total_video_points
        
        # Уникальные активные студенты
        active_students = await db.lesson_progress.distinct("user_id")
        active_students_count = len(active_students)
        
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
        
        # Непроверенные ответы (детально)
        pending_responses_cursor = db.exercise_responses.find({"reviewed": False}).sort("submitted_at", -1).limit(15)
        pending_responses_list = await pending_responses_cursor.to_list(length=None)
        
        lesson_ids = list(set([resp.get("lesson_id") for resp in pending_responses_list if resp.get("lesson_id")]))
        lessons_docs = await db.lessons_v2.find({"id": {"$in": lesson_ids}}).to_list(length=None)
        lessons_map = {lesson.get("id"): lesson for lesson in lessons_docs}
        
        user_ids = list(set([resp.get("user_id") for resp in pending_responses_list if resp.get("user_id")]))
        users_docs = await db.users.find({"username": {"$in": user_ids}}).to_list(length=None)
        users_map = {user.get("username"): user for user in users_docs}
        
        pending_reviews_details = []
        for response in pending_responses_list:
            lesson_id = response.get("lesson_id")
            exercise_id = response.get("exercise_id")
            lesson_doc = lessons_map.get(lesson_id, {})
            user_doc = users_map.get(response.get("user_id"), {})
            
            exercise_title = None
            exercises = lesson_doc.get("exercises", []) if lesson_doc else []
            for exercise in exercises:
                if exercise.get("id") == exercise_id:
                    exercise_title = exercise.get("title") or exercise.get("name")
                    break
            
            pending_reviews_details.append({
                "response_id": response.get("id") or str(response.get("_id")),
                "user_id": response.get("user_id"),
                "user_name": user_doc.get("full_name") or user_doc.get("username") or response.get("user_id"),
                "lesson_id": lesson_id,
                "lesson_title": lesson_doc.get("title", "Неизвестный урок"),
                "exercise_id": exercise_id,
                "exercise_title": exercise_title or f"Упражнение {exercise_id}",
                "submitted_at": response.get("submitted_at").isoformat() if response.get("submitted_at") else None,
                "response_text": response.get("response_text", "")
            })
        
        return {
            "total_lessons": total_lessons,
            "total_students": total_students,
            "total_responses": total_responses,
            "pending_reviews": pending_reviews,
            "recent_activity_7days": recent_activity,
            "top_lessons": top_lessons_formatted,
            "points": {
                "total": total_points_awarded,
                "challenges": total_challenge_points,
                "quizzes": total_quiz_points,
                "time": total_time_points,
                "videos": total_video_points
            },
            "active_students": active_students_count,
            "pending_reviews_details": pending_reviews_details
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analytics overview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении общей аналитики: {str(e)}")


# ===== ENDPOINTS ДЛЯ ЗАГРУЗКИ ФАЙЛОВ (АДМИНИСТРАТОР) =====

# Монтируем папку uploads для доступа к файлам
app_v2.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app_v2.get("/api/download-file/{file_id}")
async def download_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Скачать файл с заголовком Content-Disposition: attachment (доступно всем авторизованным пользователям)"""
    try:
        # Находим файл в базе данных
        file_doc = await db.files.find_one({"id": file_id})
        if not file_doc:
            raise HTTPException(status_code=404, detail="Файл не найден")
        
        file_path = file_doc.get("file_path")
        original_name = file_doc.get("original_name")
        stored_name = file_doc.get("stored_name")
        mime_type = file_doc.get("mime_type", "application/octet-stream")
        
        logger.info(f"Download file request: file_id={file_id}, file_path={file_path}, original_name={original_name}, stored_name={stored_name}")
        
        # Проверяем существование файла
        if not os.path.exists(file_path):
            logger.error(f"File not found at path: {file_path}")
            logger.info(f"Current working directory: {os.getcwd()}")
            logger.info(f"Absolute path would be: {os.path.abspath(file_path)}")
            
            # Пробуем альтернативный путь
            alt_path = os.path.join(os.getcwd(), file_path)
            if os.path.exists(alt_path):
                logger.info(f"File found at alternative path: {alt_path}")
                file_path = alt_path
            else:
                raise HTTPException(status_code=404, detail=f"Физический файл не найден: {file_path}")
        
        # Кодируем имя файла для поддержки кириллицы (RFC 5987)
        from urllib.parse import quote
        encoded_filename = quote(original_name)
        
        # Возвращаем файл с заголовком для скачивания
        return FileResponse(
            path=file_path,
            filename=original_name,
            media_type=mime_type,
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка при скачивании файла: {str(e)}")

@app_v2.post("/api/admin/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    lesson_id: str = Form(...),
    section: str = Form(...),  # theory, exercises, challenge, quiz
    file_type: str = Form(...),  # media, document
    current_user: dict = Depends(get_current_user)
):
    """
    Загрузка файла (медиа или документ)
    
    Ограничения:
    - Документы (PDF, Word, Excel, txt): без ограничений
    - Видео: до 2 ГБ
    - Медиа (изображения): без ограничений
    """
    try:
        # Проверка прав администратора
        if not current_user.get('is_super_admin', False) and not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Проверка размера файла для видео
        file_size = 0
        content = await file.read()
        file_size = len(content)
        await file.seek(0)  # Возвращаем указатель в начало
        
        # Определяем тип файла по расширению
        file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
        
        # Проверка размера для видео (2 ГБ = 2 * 1024 * 1024 * 1024 байт)
        video_extensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm']
        if file_ext in video_extensions and file_size > 2 * 1024 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Размер видео не должен превышать 2 ГБ")
        
        # Создаем уникальное имя файла с защитой от конфликтов
        file_id = str(uuid.uuid4())
        
        # Определяем папку для сохранения
        upload_dir = "uploads/learning_v2"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Получаем оригинальное имя и расширение
        original_name = file.filename
        name_parts = os.path.splitext(original_name)
        base_name = name_parts[0]
        extension = name_parts[1]
        
        # Проверяем конфликты и добавляем суффикс при необходимости
        safe_filename = original_name
        file_path = os.path.join(upload_dir, safe_filename)
        counter = 1
        
        while os.path.exists(file_path):
            safe_filename = f"{base_name}({counter}){extension}"
            file_path = os.path.join(upload_dir, safe_filename)
            counter += 1
        
        # Сохраняем файл
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Сохраняем метаданные в БД
        file_metadata = {
            "id": file_id,
            "lesson_id": lesson_id,
            "section": section,
            "file_type": file_type,
            "original_name": safe_filename,  # Используем финальное имя (с суффиксом при конфликте)
            "stored_name": safe_filename,
            "file_path": file_path,
            "file_size": file_size,
            "mime_type": file.content_type,
            "extension": file_ext,
            "uploaded_by": current_user.get('user_id', current_user.get('id', 'unknown')),
            "uploaded_at": datetime.utcnow()
        }
        
        await db.files.insert_one(file_metadata)
        
        logger.info(f"File uploaded: {file.filename} ({file_size} bytes) for lesson {lesson_id}, section {section}")
        
        return {
            "message": "Файл успешно загружен",
            "file_id": file_id,
            "filename": file.filename,
            "file_size": file_size,
            "file_type": file_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при загрузке файла: {str(e)}")


@app_v2.get("/api/admin/files")
async def get_files(
    lesson_id: str = None,
    section: str = None,
    file_type: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Получить список файлов с фильтрацией"""
    try:
        # Проверка прав администратора
        if not current_user.get('is_super_admin', False) and not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Формируем фильтр
        filter_query = {}
        if lesson_id:
            filter_query["lesson_id"] = lesson_id
        if section:
            filter_query["section"] = section
        if file_type:
            filter_query["file_type"] = file_type
        
        # Получаем файлы
        files_cursor = db.files.find(filter_query).sort("uploaded_at", -1)
        files = await files_cursor.to_list(length=None)
        
        # Форматируем данные
        formatted_files = []
        for file in files:
            formatted_files.append({
                "id": file.get("id"),
                "lesson_id": file.get("lesson_id"),
                "section": file.get("section"),
                "file_type": file.get("file_type"),
                "original_name": file.get("original_name"),
                "stored_name": file.get("stored_name"),
                "file_size": file.get("file_size"),
                "mime_type": file.get("mime_type"),
                "extension": file.get("extension"),
                "uploaded_by": file.get("uploaded_by"),
                "uploaded_at": file.get("uploaded_at").isoformat() if file.get("uploaded_at") else None,
                "file_path": file.get("file_path")
            })
        
        return {
            "files": formatted_files,
            "total": len(formatted_files)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении списка файлов: {str(e)}")


@app_v2.delete("/api/admin/files/{file_id}")
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Удалить файл"""
    try:
        # Проверка прав администратора
        if not current_user.get('is_super_admin', False) and not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Находим файл в БД
        file_metadata = await db.files.find_one({"id": file_id})
        if not file_metadata:
            raise HTTPException(status_code=404, detail="Файл не найден")
        
        # Удаляем физический файл
        file_path = file_metadata.get("file_path")
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Physical file deleted: {file_path}")
        
        # Удаляем метаданные из БД
        await db.files.delete_one({"id": file_id})
        
        logger.info(f"File deleted: {file_id}")
        
        return {
            "message": "Файл успешно удален",
            "file_id": file_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при удалении файла: {str(e)}")


@app_v2.get("/api/student/lesson-files/{lesson_id}")
async def get_lesson_files_for_student(
    lesson_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить список файлов урока для студента"""
    try:
        lesson = await db.lessons_v2.find_one({"id": lesson_id, "is_active": True})
        if not lesson:
            raise HTTPException(status_code=404, detail="Урок не найден или недоступен")

        files_cursor = db.files.find({"lesson_id": lesson_id}).sort("uploaded_at", 1)
        files = await files_cursor.to_list(length=None)

        formatted_files = []
        for file in files:
            formatted_files.append({
                "id": file.get("id"),
                "lesson_id": file.get("lesson_id"),
                "section": file.get("section"),
                "file_type": file.get("file_type"),
                "original_name": file.get("original_name"),
                "stored_name": file.get("stored_name"),
                "file_size": file.get("file_size"),
                "mime_type": file.get("mime_type"),
                "extension": file.get("extension"),
                "uploaded_at": file.get("uploaded_at").isoformat() if file.get("uploaded_at") else None
            })

        return {
            "lesson_id": lesson_id,
            "lesson_title": lesson.get("title"),
            "files": formatted_files,
            "total": len(formatted_files)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lesson files for student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении файлов урока: {str(e)}")


# ===== ENDPOINTS ДЛЯ АНАЛИТИКИ ФАЙЛОВ =====

@app_v2.post("/api/student/file-analytics")
async def track_file_action(
    request: FileAnalyticsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Записать просмотр или скачивание файла"""
    try:
        user_id = current_user.get('user_id', current_user.get('id'))
        
        # Проверяем существование файла
        file_doc = await db.files.find_one({"id": request.file_id})
        if not file_doc:
            raise HTTPException(status_code=404, detail="Файл не найден")
        
        # Создаем запись аналитики
        analytics_id = str(uuid.uuid4())
        analytics_data = {
            "id": analytics_id,
            "file_id": request.file_id,
            "user_id": user_id,
            "lesson_id": request.lesson_id,
            "action": request.action,  # 'view' или 'download'
            "file_name": file_doc.get("original_name"),
            "file_type": file_doc.get("file_type"),
            "mime_type": file_doc.get("mime_type"),
            "created_at": datetime.utcnow()
        }
        
        await db.file_analytics.insert_one(analytics_data)
        
        logger.info(f"File action tracked: {request.action} - file_id: {request.file_id}, user_id: {user_id}")
        
        return {
            "message": "Действие записано",
            "analytics_id": analytics_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking file action: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при записи действия: {str(e)}")


@app_v2.post("/api/student/video-watch-time")
async def track_video_watch_time(
    request: VideoWatchTimeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Отслеживать время просмотра видео и начислять баллы (10 баллов за минуту)"""
    try:
        user_id = current_user.get('user_id', current_user.get('id'))
        
        # Проверяем существование файла
        file_doc = await db.files.find_one({"id": request.file_id})
        if not file_doc:
            raise HTTPException(status_code=404, detail="Файл не найден")
        
        # Проверяем, что это видео
        mime_type = file_doc.get("mime_type", "")
        if not mime_type.startswith("video/"):
            raise HTTPException(status_code=400, detail="Файл не является видео")
        
        # Вычисляем баллы (10 баллов за минуту)
        points_earned = request.minutes_watched * 10
        
        # Обновляем или создаем запись о просмотре видео
        existing_watch = await db.video_watch_time.find_one({
            "file_id": request.file_id,
            "user_id": user_id
        })
        
        if existing_watch:
            # Обновляем существующую запись
            new_total_minutes = existing_watch.get("total_minutes", 0) + request.minutes_watched
            new_total_points = new_total_minutes * 10
            
            await db.video_watch_time.update_one(
                {"file_id": request.file_id, "user_id": user_id},
                {
                    "$set": {
                        "total_minutes": new_total_minutes,
                        "total_points": new_total_points,
                        "last_updated": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"Video watch time updated: file_id: {request.file_id}, user_id: {user_id}, total_minutes: {new_total_minutes}, total_points: {new_total_points}")
            
            return {
                "message": "Время просмотра обновлено",
                "total_minutes": new_total_minutes,
                "total_points": new_total_points,
                "points_earned": points_earned
            }
        else:
            # Создаем новую запись
            watch_id = str(uuid.uuid4())
            watch_data = {
                "id": watch_id,
                "file_id": request.file_id,
                "user_id": user_id,
                "lesson_id": request.lesson_id,
                "file_name": file_doc.get("original_name"),
                "total_minutes": request.minutes_watched,
                "total_points": points_earned,
                "created_at": datetime.utcnow(),
                "last_updated": datetime.utcnow()
            }
            
            await db.video_watch_time.insert_one(watch_data)
            
            logger.info(f"Video watch time created: file_id: {request.file_id}, user_id: {user_id}, minutes: {request.minutes_watched}, points: {points_earned}")
            
            return {
                "message": "Время просмотра записано",
                "total_minutes": request.minutes_watched,
                "total_points": points_earned,
                "points_earned": points_earned
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking video watch time: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при записи времени просмотра: {str(e)}")


@app_v2.get("/api/admin/file-analytics/{file_id}")
async def get_file_analytics(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить аналитику по конкретному файлу"""
    try:
        # Проверка прав администратора
        if not current_user.get('is_super_admin', False) and not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Получаем информацию о файле
        file_doc = await db.files.find_one({"id": file_id})
        if not file_doc:
            raise HTTPException(status_code=404, detail="Файл не найден")
        
        # Получаем все действия с файлом
        analytics_cursor = db.file_analytics.find({"file_id": file_id}).sort("created_at", -1)
        analytics = await analytics_cursor.to_list(length=None)
        
        # Подсчитываем статистику
        total_views = sum(1 for a in analytics if a.get("action") == "view")
        total_downloads = sum(1 for a in analytics if a.get("action") == "download")
        unique_viewers = len(set(a.get("user_id") for a in analytics if a.get("action") == "view"))
        unique_downloaders = len(set(a.get("user_id") for a in analytics if a.get("action") == "download"))
        
        # Получаем информацию о пользователях
        user_actions = {}
        for action in analytics:
            user_id = action.get("user_id")
            if user_id not in user_actions:
                # Получаем имя пользователя
                user_doc = await db.users.find_one({"_id": user_id})
                username = user_doc.get("username", "Неизвестный") if user_doc else "Неизвестный"
                
                user_actions[user_id] = {
                    "user_id": user_id,
                    "username": username,
                    "views": 0,
                    "downloads": 0,
                    "last_action": None
                }
            
            if action.get("action") == "view":
                user_actions[user_id]["views"] += 1
            elif action.get("action") == "download":
                user_actions[user_id]["downloads"] += 1
            
            if not user_actions[user_id]["last_action"]:
                user_actions[user_id]["last_action"] = action.get("created_at").isoformat() if action.get("created_at") else None
        
        # Получаем статистику просмотра видео (если это видео)
        video_stats = None
        if file_doc.get("mime_type", "").startswith("video/"):
            video_watch_cursor = db.video_watch_time.find({"file_id": file_id})
            video_watches = await video_watch_cursor.to_list(length=None)
            
            total_watch_minutes = sum(v.get("total_minutes", 0) for v in video_watches)
            total_points_earned = sum(v.get("total_points", 0) for v in video_watches)
            unique_watchers = len(video_watches)
            
            video_stats = {
                "total_watch_minutes": total_watch_minutes,
                "total_points_earned": total_points_earned,
                "unique_watchers": unique_watchers,
                "avg_watch_minutes": round(total_watch_minutes / unique_watchers, 2) if unique_watchers > 0 else 0
            }
        
        return {
            "file_id": file_id,
            "file_name": file_doc.get("original_name"),
            "file_type": file_doc.get("file_type"),
            "mime_type": file_doc.get("mime_type"),
            "statistics": {
                "total_views": total_views,
                "total_downloads": total_downloads,
                "unique_viewers": unique_viewers,
                "unique_downloaders": unique_downloaders
            },
            "user_actions": list(user_actions.values()),
            "video_stats": video_stats
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении аналитики: {str(e)}")


@app_v2.get("/api/student/my-files-stats/{lesson_id}")
async def get_student_files_stats(
    lesson_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить статистику файлов студента для урока"""
    try:
        user_id = current_user.get('user_id')
        
        # Получаем все файлы урока
        files_cursor = db.files.find({"lesson_id": lesson_id})
        files = await files_cursor.to_list(length=None)
        
        # Получаем аналитику студента по файлам
        analytics_cursor = db.file_analytics.find({
            "lesson_id": lesson_id,
            "user_id": user_id
        })
        analytics = await analytics_cursor.to_list(length=None)
        
        # Получаем статистику просмотра видео
        video_stats_cursor = db.video_watch_time.find({
            "lesson_id": lesson_id,
            "user_id": user_id
        })
        video_stats = await video_stats_cursor.to_list(length=None)
        
        # Группируем по файлам
        files_data = []
        total_views = 0
        total_downloads = 0
        total_video_minutes = 0
        total_video_points = 0
        
        for file_doc in files:
            file_id = file_doc.get("id")
            
            # Подсчет просмотров и скачиваний
            file_views = sum(1 for a in analytics if a.get("file_id") == file_id and a.get("action") == "view")
            file_downloads = sum(1 for a in analytics if a.get("file_id") == file_id and a.get("action") == "download")
            
            total_views += file_views
            total_downloads += file_downloads
            
            # Статистика видео
            video_data = None
            if file_doc.get("mime_type", "").startswith("video/"):
                video_stat = next((v for v in video_stats if v.get("file_id") == file_id), None)
                if video_stat:
                    minutes = video_stat.get("total_minutes", 0)
                    points = video_stat.get("total_points", 0)
                    total_video_minutes += minutes
                    total_video_points += points
                    video_data = {
                        "minutes_watched": minutes,
                        "points_earned": points
                    }
            
            files_data.append({
                "file_id": file_id,
                "file_name": file_doc.get("original_name"),
                "file_type": file_doc.get("file_type"),
                "section": file_doc.get("section"),
                "mime_type": file_doc.get("mime_type"),
                "views": file_views,
                "downloads": file_downloads,
                "video_stats": video_data
            })
        
        return {
            "files": files_data,
            "summary": {
                "total_files": len(files),
                "total_views": total_views,
                "total_downloads": total_downloads,
                "total_video_minutes": total_video_minutes,
                "total_video_points": total_video_points
            }
        }
    except Exception as e:
        logger.error(f"Error getting student files stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении статистики: {str(e)}")


@app_v2.get("/api/admin/lesson-files-analytics/{lesson_id}")
async def get_lesson_files_analytics(
    lesson_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Получить аналитику по всем файлам урока"""
    try:
        # Проверка прав администратора
        if not current_user.get('is_super_admin', False) and not current_user.get('is_admin', False):
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Получаем все файлы урока
        files_cursor = db.files.find({"lesson_id": lesson_id})
        files = await files_cursor.to_list(length=None)
        
        files_analytics = []
        
        for file_doc in files:
            file_id = file_doc.get("id")
            
            # Получаем аналитику по файлу
            analytics_cursor = db.file_analytics.find({"file_id": file_id})
            analytics = await analytics_cursor.to_list(length=None)
            
            total_views = sum(1 for a in analytics if a.get("action") == "view")
            total_downloads = sum(1 for a in analytics if a.get("action") == "download")
            unique_users = len(set(a.get("user_id") for a in analytics))
            
            # Статистика видео (если применимо)
            video_stats = None
            if file_doc.get("mime_type", "").startswith("video/"):
                video_watch_cursor = db.video_watch_time.find({"file_id": file_id})
                video_watches = await video_watch_cursor.to_list(length=None)
                
                total_watch_minutes = sum(v.get("total_minutes", 0) for v in video_watches)
                total_points = sum(v.get("total_points", 0) for v in video_watches)
                
                video_stats = {
                    "total_watch_minutes": total_watch_minutes,
                    "total_points_earned": total_points,
                    "unique_watchers": len(video_watches)
                }
            
            files_analytics.append({
                "file_id": file_id,
                "file_name": file_doc.get("original_name"),
                "file_type": file_doc.get("file_type"),
                "section": file_doc.get("section"),
                "mime_type": file_doc.get("mime_type"),
                "total_views": total_views,
                "total_downloads": total_downloads,
                "unique_users": unique_users,
                "video_stats": video_stats
            })
        
        return {
            "lesson_id": lesson_id,
            "total_files": len(files),
            "files": files_analytics
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lesson files analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении аналитики урока: {str(e)}")


@app_v2.get("/api/student/dashboard-stats")
async def get_student_dashboard_stats(
    current_user: dict = Depends(get_current_user)
):
    """
    Получить общую статистику студента для дашборда:
    - Общие баллы (челленджи, тесты, время обучения)
    - Прогресс по урокам
    - Достижения
    - Активность
    """
    try:
        user_id = current_user['user_id']
        
        # 1. Получаем все уроки
        lessons = await db['lessons_v2'].find().to_list(length=None)
        total_lessons = len(lessons)
        
        # 2. Получаем прогресс по урокам
        lesson_progress = await db['lesson_progress'].find({'user_id': user_id}).to_list(length=None)
        completed_lessons = len([p for p in lesson_progress if p.get('is_completed', False)])
        
        # 3. Считаем общие баллы
        # Баллы за челленджи
        challenge_attempts = await db['challenge_progress'].find({'user_id': user_id}).to_list(length=None)
        total_challenge_points = sum(attempt.get('points_earned', 0) for attempt in challenge_attempts)
        total_challenge_attempts = len(challenge_attempts)
        
        # Баллы за тесты
        quiz_attempts = await db['quiz_attempts'].find({'user_id': user_id}).to_list(length=None)
        total_quiz_points = sum(attempt.get('points_earned', 0) for attempt in quiz_attempts)
        total_quiz_attempts = len(quiz_attempts)
        
        # Баллы за время обучения (из time_activity)
        time_activity_records = await db['time_activity'].find({'user_id': user_id}).to_list(length=None)
        total_time_points = sum(record.get('total_points', 0) for record in time_activity_records)
        total_time_minutes = sum(record.get('total_minutes', 0) for record in time_activity_records)
        
        # Баллы за просмотр видео
        video_watch_records = await db['video_watch_time'].find({'user_id': user_id}).to_list(length=None)
        total_video_points = sum(record.get('total_points', 0) for record in video_watch_records)
        total_video_minutes = sum(record.get('total_minutes', 0) for record in video_watch_records)
        
        # Общие баллы
        total_points = total_challenge_points + total_quiz_points + total_time_points + total_video_points
        
        # 4. Считаем упражнения
        exercise_responses = await db['exercise_responses'].find({'user_id': user_id}).to_list(length=None)
        total_exercises_completed = len(exercise_responses)
        
        # 5. Считаем файлы
        file_views = await db['file_analytics'].count_documents({'user_id': user_id, 'action': 'view'})
        file_downloads = await db['file_analytics'].count_documents({'user_id': user_id, 'action': 'download'})
        
        # 6. Активность по дням (последние 30 дней)
        from datetime import datetime, timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Собираем активность из разных источников
        recent_challenges = await db['challenge_progress'].count_documents({
            'user_id': user_id,
            'completed_at': {'$gte': thirty_days_ago}
        })
        
        recent_quizzes = await db['quiz_attempts'].count_documents({
            'user_id': user_id,
            'attempted_at': {'$gte': thirty_days_ago}
        })
        
        recent_exercises = await db['exercise_responses'].count_documents({
            'user_id': user_id,
            'submitted_at': {'$gte': thirty_days_ago}
        })
        
        # 7. Определяем уровень студента на основе баллов
        level = 1
        level_name = "Новичок"
        next_level_points = 100
        
        if total_points >= 1000:
            level = 5
            level_name = "Мастер"
            next_level_points = 2000
        elif total_points >= 500:
            level = 4
            level_name = "Эксперт"
            next_level_points = 1000
        elif total_points >= 250:
            level = 3
            level_name = "Продвинутый"
            next_level_points = 500
        elif total_points >= 100:
            level = 2
            level_name = "Ученик"
            next_level_points = 250
        
        # 8. Достижения (бейджи)
        achievements = []
        
        # Первый урок
        if completed_lessons >= 1:
            achievements.append({
                'id': 'first_lesson',
                'title': 'Первый шаг',
                'description': 'Завершен первый урок',
                'icon': '🎯',
                'earned': True
            })
        
        # 5 уроков
        if completed_lessons >= 5:
            achievements.append({
                'id': 'five_lessons',
                'title': 'Упорный ученик',
                'description': 'Завершено 5 уроков',
                'icon': '📚',
                'earned': True
            })
        
        # 10 уроков
        if completed_lessons >= 10:
            achievements.append({
                'id': 'ten_lessons',
                'title': 'Знаток',
                'description': 'Завершено 10 уроков',
                'icon': '🏆',
                'earned': True
            })
        
        # Первый челлендж
        if total_challenge_attempts >= 1:
            achievements.append({
                'id': 'first_challenge',
                'title': 'Принял вызов',
                'description': 'Завершен первый челлендж',
                'icon': '⚡',
                'earned': True
            })
        
        # 100 баллов
        if total_points >= 100:
            achievements.append({
                'id': 'hundred_points',
                'title': 'Сотня',
                'description': 'Заработано 100 баллов',
                'icon': '💯',
                'earned': True
            })
        
        # 500 баллов
        if total_points >= 500:
            achievements.append({
                'id': 'five_hundred_points',
                'title': 'Коллекционер',
                'description': 'Заработано 500 баллов',
                'icon': '💎',
                'earned': True
            })
        
        # 1000 баллов
        if total_points >= 1000:
            achievements.append({
                'id': 'thousand_points',
                'title': 'Легенда',
                'description': 'Заработано 1000 баллов',
                'icon': '👑',
                'earned': True
            })
        
        # Активный ученик (активность в последние 7 дней)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_challenge_count = await db['challenge_progress'].count_documents({
            'user_id': user_id,
            'completed_at': {'$gte': seven_days_ago}
        })
        recent_quiz_count = await db['quiz_attempts'].count_documents({
            'user_id': user_id,
            'attempted_at': {'$gte': seven_days_ago}
        })
        recent_exercise_count = await db['exercise_responses'].count_documents({
            'user_id': user_id,
            'submitted_at': {'$gte': seven_days_ago}
        })
        recent_activity = recent_challenge_count + recent_quiz_count + recent_exercise_count
        
        if recent_activity >= 5:
            achievements.append({
                'id': 'active_learner',
                'title': 'Активный ученик',
                'description': '5+ активностей за неделю',
                'icon': '🔥',
                'earned': True
            })
        
        # 9. График активности (последние 7 дней)
        activity_chart = []
        for i in range(7):
            day = datetime.utcnow() - timedelta(days=6-i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_challenge_count = await db['challenge_progress'].count_documents({
                'user_id': user_id,
                'completed_at': {'$gte': day_start, '$lt': day_end}
            })
            day_quiz_count = await db['quiz_attempts'].count_documents({
                'user_id': user_id,
                'attempted_at': {'$gte': day_start, '$lt': day_end}
            })
            day_exercise_count = await db['exercise_responses'].count_documents({
                'user_id': user_id,
                'submitted_at': {'$gte': day_start, '$lt': day_end}
            })
            day_activity = day_challenge_count + day_quiz_count + day_exercise_count
            
            activity_chart.append({
                'date': day.strftime('%d.%m'),
                'day_name': ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][day.weekday()],
                'activity': day_activity
            })
        
        # 10. Последние достижения (последние 5)
        recent_achievements = []
        
        # Последние завершенные уроки
        recent_lesson_progress = await db['lesson_progress'].find(
            {'user_id': user_id, 'is_completed': True}
        ).sort('completed_at', -1).limit(3).to_list(length=3)
        
        for progress in recent_lesson_progress:
            lesson = await db['lessons_v2'].find_one({'_id': progress['lesson_id']})
            if lesson:
                recent_achievements.append({
                    'type': 'lesson',
                    'title': f"Урок завершен: {lesson['title']}",
                    'date': progress.get('completed_at', datetime.utcnow()).strftime('%d.%m.%Y'),
                    'icon': '✅'
                })
        
        # Последние челленджи
        recent_challenge_attempts = await db['challenge_progress'].find(
            {'user_id': user_id}
        ).sort('completed_at', -1).limit(2).to_list(length=2)
        
        for attempt in recent_challenge_attempts:
            lesson = await db['lessons_v2'].find_one({'_id': attempt['lesson_id']})
            if lesson:
                recent_achievements.append({
                    'type': 'challenge',
                    'title': f"Челлендж: {lesson['title']} (+{attempt.get('points_earned', 0)} баллов)",
                    'date': attempt.get('completed_at', datetime.utcnow()).strftime('%d.%m.%Y'),
                    'icon': '⚡'
                })
        
        # Сортируем по дате и берем последние 5
        recent_achievements = sorted(
            recent_achievements,
            key=lambda x: x['date'],
            reverse=True
        )[:5]
        
        return {
            'success': True,
            'stats': {
                # Общая информация
                'total_points': total_points,
                'level': level,
                'level_name': level_name,
                'next_level_points': next_level_points,
                'progress_to_next_level': min(100, int((total_points / next_level_points) * 100)),
                
                # Для обратной совместимости с frontend
                'total_lessons': total_lessons,
                'completed_lessons': completed_lessons,
                'total_challenge_attempts': total_challenge_attempts,
                'total_challenge_points': total_challenge_points,
                'total_quiz_attempts': total_quiz_attempts,
                'total_quiz_points': total_quiz_points,
                'total_exercises_completed': total_exercises_completed,
                
                # Баллы по категориям
                'points_breakdown': {
                    'challenges': total_challenge_points,
                    'quizzes': total_quiz_points,
                    'time': total_time_points,
                    'time_minutes': total_time_minutes,
                    'videos': total_video_points,
                    'video_minutes': total_video_minutes
                },
                
                # Прогресс по урокам
                'lessons': {
                    'total': total_lessons,
                    'completed': completed_lessons,
                    'in_progress': len(lesson_progress) - completed_lessons,
                    'completion_percentage': int((completed_lessons / total_lessons * 100)) if total_lessons > 0 else 0
                },
                
                # Активность
                'activity': {
                    'total_challenges': total_challenge_attempts,
                    'total_quizzes': total_quiz_attempts,
                    'total_exercises': total_exercises_completed,
                    'total_time_minutes': total_time_minutes,
                    'total_video_minutes': total_video_minutes,
                    'recent_challenges': recent_challenges,
                    'recent_quizzes': recent_quizzes,
                    'recent_exercises': recent_exercises,
                    'file_views': file_views,
                    'file_downloads': file_downloads
                },
                
                # Достижения
                'achievements': achievements,
                'total_achievements': len(achievements),
                
                # График активности
                'activity_chart': activity_chart,
                
                # Последние достижения
                'recent_achievements': recent_achievements
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting student dashboard stats: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Ошибка при получении статистики: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server_v2:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
