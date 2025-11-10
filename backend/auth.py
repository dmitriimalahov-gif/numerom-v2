from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
from models import User, UserResponse

# Security configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 часа

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)  # Используем настройку из константы
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Return user info including admin rights
    return {
        "user_id": payload.get("user_id", user_id),
        "sub": payload.get("sub", user_id),
        "is_admin": payload.get("is_admin", False),
        "is_super_admin": payload.get("is_super_admin", False),
        "role": payload.get("role", "user")
    }


async def get_current_user_full(credentials: HTTPAuthorizationCredentials = Depends(security), db=None):
    """Get full user object from database"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Fetch user from database if provided
    if db:
        user_dict = await db.users.find_one({"id": user_id})
        if not user_dict:
            raise HTTPException(status_code=404, detail="User not found")
        return User(**user_dict)
    
    return {"user_id": user_id}

def create_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        name=user.name,
        surname=user.surname,
        birth_date=user.birth_date,
        city=user.city,
        phone_number=user.phone_number,
        car_number=user.car_number,
        street=user.street,
        house_number=user.house_number,
        apartment_number=user.apartment_number,
        postal_code=user.postal_code,
        is_premium=user.is_premium,
        is_super_admin=user.is_super_admin,
        is_admin=user.is_admin,
        subscription_type=user.subscription_type,
        credits_remaining=user.credits_remaining,
        created_at=user.created_at
    )

async def ensure_super_admin_exists(db):
    """Создаем суперадминистратора при первом запуске"""
    SUPER_ADMIN_EMAIL = "dmitrii.malahov@gmail.com"
    SUPER_ADMIN_PASSWORD = "756bvy67H"
    
    # Проверяем, существует ли уже суперадминистратор
    existing_admin = await db.users.find_one({"email": SUPER_ADMIN_EMAIL})
    
    if not existing_admin:
        # Создаем суперадминистратора
        super_admin = User(
            email=SUPER_ADMIN_EMAIL,
            password_hash=get_password_hash(SUPER_ADMIN_PASSWORD),
            full_name="Дмитрий Малахов (Суперадминистратор)",
            birth_date="01.01.1980",
            city="Москва",
            is_premium=True,
            is_super_admin=True,
            credits_remaining=1000000  # Безлимитные кредиты
        )
        
        await db.users.insert_one(super_admin.dict())
        print(f"✅ Создан суперадминистратор: {SUPER_ADMIN_EMAIL}")
    else:
        # Обновляем существующего пользователя до суперадминистратора и сбрасываем пароль
        await db.users.update_one(
            {"email": SUPER_ADMIN_EMAIL},
            {"$set": {
                "is_super_admin": True,
                "is_premium": True,
                "credits_remaining": 1000000,
                "password_hash": get_password_hash(SUPER_ADMIN_PASSWORD),
                "updated_at": datetime.utcnow()
            }}
        )
        # Гарантируем доступ к административным эндпоинтам (создаем запись admin_users)
        existing_admin_user = await db.users.find_one({"email": SUPER_ADMIN_EMAIL})
        if existing_admin_user:
            await db.admin_users.update_one(
                {"user_id": existing_admin_user.get("id")},
                {"$set": {
                    "user_id": existing_admin_user.get("id"),
                    "role": "super_admin",
                    "permissions": ["video_management", "user_management", "content_management"]
                }},
                upsert=True
            )
        print(f"✅ Обновлен статус суперадминистратора и пароль: {SUPER_ADMIN_EMAIL}")

def require_super_admin(current_user: dict, db):
    """Декоратор для проверки прав суперадминистратора"""
    async def check_super_admin():
        user_data = await db.users.find_one({"id": current_user["user_id"]})
        if not user_data or not user_data.get("is_super_admin", False):
            raise HTTPException(
                status_code=403, 
                detail="Доступ запрещен. Требуются права суперадминистратора."
            )
        return User(**user_data)
    return check_super_admin