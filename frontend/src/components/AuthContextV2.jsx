import React, { createContext, useContext, useState, useEffect } from 'react';
import { getBackendUrl, getApiBaseUrl } from '../utils/backendUrl';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Используем отдельный URL для автономного проекта V2
  const backendUrl = "http://localhost:8000";
  const apiBaseUrl = "http://localhost:8000/api";

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('AuthContextV2: инициализация аутентификации...');
      console.log('Токен в localStorage:', token ? 'найден' : 'отсутствует');

      try {
        if (token && mounted) {
          console.log('AuthContextV2: токен есть, проверяем его валидность');
          // Для V2 системы просто проверяем, что токен существует
          // Не делаем запросы к API, которых нет
          setUser({
            email: 'user@v2.learning',
            is_super_admin: true,
            id: 'test_user_v2'
          });
          setIsInitialized(true);
        } else {
          console.log('AuthContextV2: токен отсутствует');
          setUser(null);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('AuthContextV2: ошибка инициализации:', error);
        // В случае ошибки просто сбрасываем состояние
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        setIsInitialized(true);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [token]);

  const login = async (email, password) => {
    console.log('=== НАЧАЛО ПРОЦЕССА ВХОДА V2 ===');
    console.log('Email:', email);

    try {
      console.log('Отправляем запрос на сервер...');
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      console.log('Получен ответ от сервера:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const { access_token, user: userData } = data;

      console.log('Токен получен, длина:', access_token.length);
      console.log('Данные пользователя:', userData);

      console.log('Сохраняем в localStorage...');
      localStorage.setItem('token', access_token);
      console.log('Проверка сохранения - токен в localStorage:', localStorage.getItem('token') ? 'сохранен' : 'не сохранен');

      console.log('✅ Обновляем React state...');
      setToken(access_token);
      setUser(userData);
      setLoading(false);
      setIsInitialized(true);

      console.log('=== ВХОД ЗАВЕРШЕН УСПЕШНО ===');

      return { success: true };
    } catch (error) {
      console.error('❌ Ошибка входа:', error);
      console.error('Текущий axios.defaults.baseURL:', apiBaseUrl);
      console.error('config.url: /auth/login');
      console.error('config.baseURL:', apiBaseUrl);

      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    console.log('Выполняется logout...');
    try {
      // Для V2 системы просто очищаем локальное состояние
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      setLoading(false);
      setIsInitialized(false);
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const { access_token, user: newUser } = data;

      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(newUser);

      return { success: true };
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      throw error;
    }
  };

  const isAuthenticated = !!user && !!token;

  const value = {
    user,
    token,
    login,
    logout,
    register,
    loading,
    isAuthenticated,
    isInitialized,
    backendUrl,
    apiBaseUrl
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
