import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Brain, BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContextV2';
import LoginFormV2 from './LoginFormV2';

const MainDashboardV2 = () => {
  const { user, loading, isInitialized } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);

  // Показываем загрузку пока инициализируется аутентификация
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Система обучения V2
              </h2>
              <p className="text-gray-600">Загрузка...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Если пользователь аутентифицирован, перенаправляем на dashboard
  if (user) {
    console.log('MainDashboardV2: пользователь найден, перенаправляем на /dashboard для:', user.email);
    navigate('/dashboard', { replace: true });
    return null;
  }

  // Показываем лендинг страницу для неавторизованных пользователей
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">NumerOM</h1>
                <p className="text-xs text-gray-500">Система обучения V2</p>
              </div>
            </div>
            <Button onClick={() => setShowLogin(true)}>
              Войти
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Интерактивная система
            <span className="block text-blue-600">обучения нумерологии</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Освойте древнюю науку чисел через персонализированный подход.
            5 разделов обучения, интерактивные упражнения и персональная аналитика.
          </p>
          <Button
            size="lg"
            onClick={() => setShowLogin(true)}
            className="text-lg px-8 py-4"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            Начать обучение
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <BookOpen className="w-12 h-12 text-blue-600 mb-4" />
              <CardTitle>Теория</CardTitle>
              <CardDescription>
                Структурированные блоки информации с примерами и объяснениями
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="w-12 h-12 text-green-600 mb-4" />
              <CardTitle>Упражнения</CardTitle>
              <CardDescription>
                Интерактивные задания для закрепления материала
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Sparkles className="w-12 h-12 text-purple-600 mb-4" />
              <CardTitle>Аналитика</CardTitle>
              <CardDescription>
                Персональные рекомендации и анализ прогресса обучения
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Demo Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Попробовать демо</CardTitle>
              <CardDescription>
                Войдите в систему с любыми данными для демонстрации возможностей
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900">Тестовые данные:</p>
                  <p className="text-sm text-gray-600">Email: admin@learning-v2.com</p>
                  <p className="text-sm text-gray-600">Пароль: admin123</p>
                </div>
                <Button
                  onClick={() => setShowLogin(true)}
                  className="w-full"
                >
                  Попробовать систему
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="relative">
            <LoginFormV2 />
            <Button
              variant="ghost"
              className="absolute -top-2 -right-2 w-8 h-8 p-0 bg-white hover:bg-gray-100"
              onClick={() => setShowLogin(false)}
            >
              ×
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainDashboardV2;
