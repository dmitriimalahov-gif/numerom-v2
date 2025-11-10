import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Brain, BookOpen, Settings, LogOut, Menu, User, Crown } from 'lucide-react';
import { useAuth } from './AuthContextV2';

const UserDashboardV2 = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  // Навигационные элементы только для системы обучения V2
  const navigationItems = [
    {
      id: 'learning-v2',
      label: 'Обучение V2',
      icon: <Brain className="w-4 h-4" />,
      description: 'Интерактивная система обучения с 5 разделами'
    },
    {
      id: 'admin-v2',
      label: 'Админ-панель',
      icon: <Crown className="w-4 h-4" />,
      description: 'Управление уроками и контентом',
      adminOnly: true
    }
  ];

  const handleNavigation = (sectionId) => {
    if (sectionId === 'learning-v2') {
      navigate('/learning-v2');
    } else if (sectionId === 'admin-v2') {
      navigate('/admin-v2');
    }
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Проверяем, является ли пользователь администратором
  const isAdmin = user?.is_super_admin || user?.is_admin;
  const filteredNavigation = navigationItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">NumerOM</h1>
                <p className="text-xs text-gray-500">Система обучения V2</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {filteredNavigation.map((item) => (
                <Button
                  key={item.id}
                  variant={location.pathname.startsWith(`/${item.id}`) ? "default" : "ghost"}
                  onClick={() => handleNavigation(item.id)}
                  className="flex items-center space-x-2"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Button>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="hidden sm:flex items-center space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name || 'Пользователь'}
                  </p>
                  {isAdmin && (
                    <Badge variant="secondary" className="text-xs">
                      Администратор
                    </Badge>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Выйти</span>
              </Button>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden"
              >
                <Menu className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {filteredNavigation.map((item) => (
                <Button
                  key={item.id}
                  variant={location.pathname.startsWith(`/${item.id}`) ? "default" : "ghost"}
                  onClick={() => handleNavigation(item.id)}
                  className="w-full justify-start"
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-6 h-6 text-blue-600 mr-2" />
                Добро пожаловать в систему обучения V2!
              </CardTitle>
              <CardDescription>
                Интерактивная платформа для изучения нумерологии с персонализированным подходом
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Теория</h3>
                  <p className="text-sm text-gray-600">Структурированные блоки информации</p>
                </div>
                <div className="text-center">
                  <Brain className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Упражнения</h3>
                  <p className="text-sm text-gray-600">Интерактивные задания</p>
                </div>
                <div className="text-center">
                  <Settings className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Аналитика</h3>
                  <p className="text-sm text-gray-600">Персональные рекомендации</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Learning Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 text-blue-600 mr-2" />
                Обучение
              </CardTitle>
              <CardDescription>
                Начните изучение нумерологии с интерактивными уроками
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/learning-v2')}
                className="w-full"
              >
                <Brain className="w-4 h-4 mr-2" />
                Перейти к обучению
              </Button>
            </CardContent>
          </Card>

          {/* Admin Section (only for admins) */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="w-5 h-5 text-purple-600 mr-2" />
                  Администрирование
                </CardTitle>
                <CardDescription>
                  Управление контентом и уроками системы обучения
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate('/admin-v2')}
                  variant="outline"
                  className="w-full"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Админ-панель
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserDashboardV2;
