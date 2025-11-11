import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import { 
  Brain, 
  BookOpen, 
  Settings, 
  LogOut, 
  Menu, 
  User, 
  Crown,
  Trophy,
  Target,
  Zap,
  TrendingUp,
  Award,
  Star,
  Flame,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Download,
  BarChart3
} from 'lucide-react';
import { useAuth } from './AuthContextV2';
import { getBackendUrl } from '../utils/backendUrl';

const backendUrl = getBackendUrl();

const UserDashboardV2 = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Загрузка статистики студента
  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/student/dashboard-stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dashboard stats loaded:', data);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Навигационные элементы
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

  // Функция для получения цвета уровня
  const getLevelColor = (level) => {
    const colors = {
      1: 'from-gray-400 to-gray-600',
      2: 'from-green-400 to-green-600',
      3: 'from-blue-400 to-blue-600',
      4: 'from-purple-400 to-purple-600',
      5: 'from-yellow-400 to-yellow-600'
    };
    return colors[level] || colors[1];
  };

  // Функция для получения иконки уровня
  const getLevelIcon = (level) => {
    const icons = {
      1: '🌱',
      2: '📚',
      3: '🎓',
      4: '⭐',
      5: '👑'
    };
    return icons[level] || icons[1];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-gray-600">Загрузка вашего прогресса...</p>
        </div>
      </div>
    );
  }

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
        {/* Hero Section - Level & Points */}
        <div className="mb-8">
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden relative">
            {/* Decorative Background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full -ml-48 -mb-48"></div>
            </div>
            
            <CardContent className="pt-8 pb-8 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Level Info */}
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start mb-4">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getLevelColor(stats?.level || 1)} flex items-center justify-center text-4xl shadow-lg`}>
                      {getLevelIcon(stats?.level || 1)}
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold mb-2">
                    Уровень {stats?.level || 1}
                  </h2>
                  <p className="text-xl text-blue-100 mb-4">
                    {stats?.level_name || 'Новичок'}
                  </p>
                  <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                    <div className="flex justify-between text-sm mb-2">
                      <span>До следующего уровня</span>
                      <span className="font-bold">{stats?.progress_to_next_level || 0}%</span>
                    </div>
                    <Progress value={stats?.progress_to_next_level || 0} className="h-2 bg-white/30" />
                    <p className="text-xs text-blue-100 mt-2">
                      {stats?.total_points || 0} / {stats?.next_level_points || 100} баллов
                    </p>
                  </div>
                </div>

                {/* Total Points */}
                <div className="text-center">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
                  <h3 className="text-5xl font-bold mb-2">
                    {stats?.total_points || 0}
                  </h3>
                  <p className="text-xl text-blue-100">
                    Всего баллов
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                      <Zap className="w-4 h-4 mx-auto mb-1" />
                      <p className="font-bold">{stats?.points_breakdown?.challenges || 0}</p>
                      <p className="text-xs text-blue-100">Челленджи</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                      <Target className="w-4 h-4 mx-auto mb-1" />
                      <p className="font-bold">{stats?.points_breakdown?.quizzes || 0}</p>
                      <p className="text-xs text-blue-100">Тесты</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                      <Clock className="w-4 h-4 mx-auto mb-1" />
                      <p className="font-bold">{stats?.points_breakdown?.time || 0}</p>
                      <p className="text-xs text-blue-100">Время</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                      <Eye className="w-4 h-4 mx-auto mb-1" />
                      <p className="font-bold">{stats?.points_breakdown?.videos || 0}</p>
                      <p className="text-xs text-blue-100">Видео</p>
                    </div>
                  </div>
                </div>

                {/* Achievements Preview */}
                <div className="text-center md:text-right">
                  <Award className="w-16 h-16 mx-auto md:ml-auto mb-4 text-yellow-300" />
                  <h3 className="text-3xl font-bold mb-2">
                    {stats?.total_achievements || 0}
                  </h3>
                  <p className="text-xl text-blue-100 mb-4">
                    Достижений
                  </p>
                  <Button
                    onClick={() => {
                      // Прокрутка к секции достижений
                      document.getElementById('achievements-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    variant="outline"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Посмотреть все
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Lessons Progress */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/learning-v2')}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <BookOpen className="w-8 h-8 text-blue-600" />
                <Badge variant="secondary" className="text-lg font-bold">
                  {stats?.lessons?.completion_percentage || 0}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl font-bold mb-1">
                {stats?.lessons?.completed || 0} / {stats?.lessons?.total || 0}
              </h3>
              <p className="text-sm text-gray-600 mb-3">Уроков завершено</p>
              <Progress value={stats?.lessons?.completion_percentage || 0} className="h-2" />
              {stats?.lessons?.in_progress > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {stats.lessons.in_progress} в процессе
                </p>
              )}
            </CardContent>
          </Card>

          {/* Challenges */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Zap className="w-8 h-8 text-yellow-600" />
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl font-bold mb-1">
                {stats?.activity?.total_challenges || 0}
              </h3>
              <p className="text-sm text-gray-600 mb-3">Челленджей пройдено</p>
              {stats?.activity?.recent_challenges > 0 && (
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+{stats.activity.recent_challenges} за месяц</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quizzes */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Target className="w-8 h-8 text-green-600" />
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl font-bold mb-1">
                {stats?.activity?.total_quizzes || 0}
              </h3>
              <p className="text-sm text-gray-600 mb-3">Тестов пройдено</p>
              {stats?.activity?.recent_quizzes > 0 && (
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+{stats.activity.recent_quizzes} за месяц</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exercises */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Brain className="w-8 h-8 text-purple-600" />
                <BarChart3 className="w-6 h-6 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl font-bold mb-1">
                {stats?.activity?.total_exercises || 0}
              </h3>
              <p className="text-sm text-gray-600 mb-3">Упражнений выполнено</p>
              {stats?.activity?.recent_exercises > 0 && (
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+{stats.activity.recent_exercises} за месяц</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Chart & Recent Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                Активность за неделю
              </CardTitle>
              <CardDescription>
                Ваша активность за последние 7 дней
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between h-48 gap-2">
                {stats?.activity_chart?.map((day, index) => {
                  const maxActivity = Math.max(...(stats?.activity_chart?.map(d => d.activity) || [1]));
                  const height = maxActivity > 0 ? (day.activity / maxActivity) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="relative w-full flex-1 flex items-end">
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            day.activity > 0 
                              ? 'bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500' 
                              : 'bg-gray-200'
                          }`}
                          style={{ height: `${Math.max(height, 5)}%` }}
                          title={`${day.day_name}: ${day.activity} активностей`}
                        >
                          {day.activity > 0 && (
                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700">
                              {day.activity}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2 font-medium">{day.day_name}</p>
                      <p className="text-xs text-gray-400">{day.date}</p>
                    </div>
                  );
                })}
              </div>
              {stats?.activity_chart?.every(d => d.activity === 0) && (
                <p className="text-center text-gray-500 mt-4">
                  Начните обучение, чтобы увидеть вашу активность!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="w-5 h-5 text-yellow-600 mr-2" />
                Последние достижения
              </CardTitle>
              <CardDescription>
                Ваши недавние успехи
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recent_achievements && stats.recent_achievements.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_achievements.map((achievement, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:shadow-md transition-shadow">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{achievement.title}</p>
                        <p className="text-xs text-gray-500">{achievement.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Пока нет достижений</p>
                  <p className="text-sm text-gray-400 mt-2">Начните обучение, чтобы получить первые награды!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Achievements Section */}
        <div id="achievements-section" className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Award className="w-6 h-6 text-yellow-600 mr-2" />
                Достижения
              </CardTitle>
              <CardDescription>
                Коллекция ваших наград и достижений
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.achievements && stats.achievements.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {stats.achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="relative group"
                    >
                      <div className={`p-6 rounded-xl border-2 text-center transition-all ${
                        achievement.earned
                          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 hover:shadow-lg hover:scale-105'
                          : 'bg-gray-50 border-gray-200 opacity-50'
                      }`}>
                        <div className="text-4xl mb-3">{achievement.icon}</div>
                        <h4 className="font-bold text-sm mb-1">{achievement.title}</h4>
                        <p className="text-xs text-gray-600">{achievement.description}</p>
                        {achievement.earned && (
                          <Badge className="mt-3 bg-green-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Получено
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Award className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg text-gray-500 mb-2">Пока нет достижений</p>
                  <p className="text-sm text-gray-400 mb-6">
                    Завершайте уроки, проходите челленджи и тесты, чтобы получать награды!
                  </p>
                  <Button onClick={() => navigate('/learning-v2')} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                    <Brain className="w-4 h-4 mr-2" />
                    Начать обучение
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Learning Section */}
          <Card className="hover:shadow-xl transition-shadow border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <BookOpen className="w-6 h-6 text-blue-600 mr-2" />
                Продолжить обучение
              </CardTitle>
              <CardDescription>
                Интерактивные уроки по нумерологии
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Прогресс:</span>
                  <span className="font-bold text-blue-600">
                    {stats?.lessons?.completed || 0} / {stats?.lessons?.total || 0} уроков
                  </span>
                </div>
                <Progress value={stats?.lessons?.completion_percentage || 0} className="h-2" />
                <Button
                  onClick={() => navigate('/learning-v2')}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  Перейти к урокам
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Admin Section (only for admins) */}
          {isAdmin && (
            <Card className="hover:shadow-xl transition-shadow border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Crown className="w-6 h-6 text-purple-600 mr-2" />
                  Администрирование
                </CardTitle>
                <CardDescription>
                  Управление контентом и уроками
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate('/admin-v2')}
                  variant="outline"
                  className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
                  size="lg"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Открыть админ-панель
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
