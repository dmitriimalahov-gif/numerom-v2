import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Brain, Upload, FileText, BookOpen, Users, Settings, Edit, Save, X, Plus, Trash2, ChevronDown, ChevronUp, BarChart3, Award, Zap, Target, Activity, ClipboardList } from 'lucide-react';
import { useAuth } from './AuthContextV2';
import { getBackendUrl } from '../utils/backendUrl';
import LessonEditModal from './LessonEditModal';

const AdminPanelV2 = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('lessons-v2');
  const [lessonsV2, setLessonsV2] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState('general');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [deletingLesson, setDeletingLesson] = useState(false);
  const [filesStats, setFilesStats] = useState({}); // Статистика файлов по урокам
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewNotes, setReviewNotes] = useState({});
  const [reviewSavingState, setReviewSavingState] = useState({});

  // Используем отдельный URL для автономного проекта V2
  const backendUrl = "http://localhost:8000";

  const formatDateTime = (value) => {
    if (!value) return 'Дата неизвестна';
    try {
      return new Date(value).toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return value;
    }
  };

  useEffect(() => {
    if (activeTab === 'lessons-v2') {
      loadDashboardOverview();
      loadLessonsV2();
    }
  }, [activeTab]);

  const loadDashboardOverview = async () => {
    try {
      setDashboardLoading(true);
      setDashboardError('');
      const response = await fetch(`${backendUrl}/api/admin/analytics/overview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDashboardStats(data);
      setPendingReviews(data.pending_reviews_details || []);
      setReviewNotes({});
    } catch (error) {
      console.error('Error loading dashboard overview:', error);
      setDashboardError('Не удалось загрузить дашборд. Попробуйте обновить страницу.');
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleReviewNoteChange = (responseId, value) => {
    setReviewNotes(prev => ({
      ...prev,
      [responseId]: value
    }));
  };

  const submitReviewResponse = async (responseId) => {
    const comment = (reviewNotes[responseId] || '').trim();
    if (!comment) {
      alert('Введите комментарий перед отправкой ответа студенту.');
      return;
    }

    try {
      setReviewSavingState(prev => ({ ...prev, [responseId]: true }));
      const response = await fetch(`${backendUrl}/api/admin/review-response/${responseId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ admin_comment: comment })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setPendingReviews(prev => prev.filter(item => item.response_id !== responseId));
      setReviewNotes(prev => {
        const updated = { ...prev };
        delete updated[responseId];
        return updated;
      });
      setDashboardStats(prev => prev ? {
        ...prev,
        pending_reviews: Math.max((prev.pending_reviews || 1) - 1, 0),
        pending_reviews_details: prev.pending_reviews_details
          ? prev.pending_reviews_details.filter(item => item.response_id !== responseId)
          : prev.pending_reviews_details
      } : prev);

      alert('Комментарий отправлен. Ответ помечен как проверенный.');
    } catch (error) {
      console.error('Error reviewing response:', error);
      alert('Не удалось отправить комментарий. Попробуйте ещё раз.');
    } finally {
      setReviewSavingState(prev => ({ ...prev, [responseId]: false }));
    }
  };

  const loadLessonsV2 = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/admin/lessons-v2`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLessonsV2(data.lessons);
      
      // Загружаем статистику файлов для каждого урока
      await loadFilesStats(data.lessons);
    } catch (error) {
      console.error('Error loading lessons V2:', error);
      alert('Ошибка загрузки уроков V2');
    } finally {
      setLoading(false);
    }
  };

  const loadFilesStats = async (lessons) => {
    try {
      const stats = {};
      
      // Загружаем статистику для каждого урока параллельно
      await Promise.all(
        lessons.map(async (lesson) => {
          try {
            const response = await fetch(
              `${backendUrl}/api/admin/files?lesson_id=${lesson.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              const mediaCount = data.files.filter(f => f.file_type === 'media').length;
              const docCount = data.files.filter(f => f.file_type === 'document').length;
              
              stats[lesson.id] = {
                media: mediaCount,
                documents: docCount,
                total: data.total
              };
            }
          } catch (error) {
            console.error(`Error loading files for lesson ${lesson.id}:`, error);
            stats[lesson.id] = { media: 0, documents: 0, total: 0 };
          }
        })
      );
      
      setFilesStats(stats);
    } catch (error) {
      console.error('Error loading files stats:', error);
    }
  };

  const uploadLessonFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingFile(true);
      const response = await fetch(`${backendUrl}/api/admin/lessons-v2/upload-from-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      alert(`Урок успешно загружен!\n${result.sections.theory_blocks} блоков теории\n${result.sections.exercises} упражнений`);
      loadLessonsV2(); // Перезагрузить список
    } catch (error) {
      console.error('Error uploading lesson:', error);
      alert('Ошибка загрузки урока: ' + error.message);
    } finally {
      setUploadingFile(false);
      // Очистить input
      event.target.value = '';
    }
  };

  const openEditDialog = (lesson) => {
    setEditingLesson({ ...lesson }); // Создаем копию объекта
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditingLesson(null);
    setEditDialogOpen(false);
  };

  const handleLessonFieldChange = (field, value) => {
    setEditingLesson(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveLessonChanges = async (lessonData) => {
    if (!lessonData) return;

    try {
      setSavingLesson(true);
      const response = await fetch(`${backendUrl}/api/admin/lessons-v2/${lessonData.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(lessonData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      alert('Урок успешно обновлен!');
      loadLessonsV2(); // Перезагрузить список
      closeEditDialog();
    } catch (error) {
      console.error('Error updating lesson:', error);
      alert('Ошибка обновления урока: ' + error.message);
    } finally {
      setSavingLesson(false);
    }
  };

  const openDeleteDialog = (lesson) => {
    setLessonToDelete(lesson);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setLessonToDelete(null);
    setDeleteDialogOpen(false);
  };

  const confirmDeleteLesson = async () => {
    if (!lessonToDelete) return;

    try {
      setDeletingLesson(true);
      const response = await fetch(`${backendUrl}/api/admin/lessons-v2/${lessonToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      alert('Урок и все связанные данные успешно удалены!');
      loadLessonsV2(); // Перезагрузить список
      closeDeleteDialog();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Ошибка удаления урока: ' + error.message);
    } finally {
      setDeletingLesson(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p>Загрузка данных пользователя...</p>
        </div>
      </div>
    );
  }

  const isAdminUser = user?.is_super_admin || user?.is_admin;

  if (!isAdminUser) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto bg-white border border-red-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Доступ ограничен
            </CardTitle>
            <CardDescription className="text-gray-600">
              Панель администратора доступна только уполномоченным пользователям. Вы вошли как студент.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Если вы считаете, что это ошибка, обратитесь к суперадминистратору для получения прав доступа.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderLessonsV2Tab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Дашборд администратора
          </CardTitle>
          <CardDescription>
            Ключевые метрики по системе обучения и контроль домашних заданий
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {dashboardLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
              <p className="text-indigo-700 font-medium">Загрузка аналитики...</p>
            </div>
          ) : dashboardError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
              {dashboardError}
            </div>
          ) : dashboardStats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                      Студенты
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-blue-700">{dashboardStats.total_students || 0}</p>
                  <p className="text-sm text-blue-900 mt-1">Всего студентов в системе</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-emerald-100 rounded-lg">
                      <BookOpen className="w-6 h-6 text-emerald-600" />
                    </div>
                    <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                      Уроки
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-emerald-700">{dashboardStats.total_lessons || 0}</p>
                  <p className="text-sm text-emerald-900 mt-1">
                    Активных уроков в системе
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <Award className="w-6 h-6 text-yellow-600" />
                    </div>
                    <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">
                      Баллы
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-yellow-600">{dashboardStats.points?.total || 0}</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Баллов начислено студентам
                  </p>
                </div>

              <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-rose-100 rounded-lg">
                      <ClipboardList className="w-6 h-6 text-rose-600" />
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      Проверить
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-rose-600">{dashboardStats.pending_reviews || 0}</p>
                  <p className="text-sm text-rose-700 mt-1">
                    Непроверенных домашних заданий
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="col-span-1 lg:col-span-2 border border-indigo-100 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-700">
                      <Zap className="w-5 h-5" />
                      Разбивка начисленных баллов
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                        <p className="text-xs uppercase tracking-wide text-purple-600 mb-1">Челленджи</p>
                        <p className="text-2xl font-bold text-purple-700">{dashboardStats.points?.challenges || 0}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <p className="text-xs uppercase tracking-wide text-green-600 mb-1">Тесты</p>
                        <p className="text-2xl font-bold text-green-700">{dashboardStats.points?.quizzes || 0}</p>
                      </div>
                      <div className="bg-sky-50 rounded-lg p-4 border border-sky-100">
                        <p className="text-xs uppercase tracking-wide text-sky-600 mb-1">Время</p>
                        <p className="text-2xl font-bold text-sky-700">{dashboardStats.points?.time || 0}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                        <p className="text-xs uppercase tracking-wide text-orange-600 mb-1">Видео</p>
                        <p className="text-2xl font-bold text-orange-700">{dashboardStats.points?.videos || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-blue-100 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Activity className="w-5 h-5" />
                      Активность
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <p className="text-xs uppercase tracking-wide text-blue-600 mb-1">Активность за 7 дней</p>
                      <p className="text-2xl font-bold text-blue-700">{dashboardStats.recent_activity_7days || 0}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                      <p className="text-xs uppercase tracking-wide text-indigo-600 mb-1">Активные студенты</p>
                      <p className="text-2xl font-bold text-indigo-700">{dashboardStats.active_students || 0}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {dashboardStats.top_lessons && dashboardStats.top_lessons.length > 0 && (
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                      <Target className="w-5 h-5 text-green-600" />
                      Топ уроков по вовлеченности
                    </CardTitle>
                    <CardDescription>
                      Уроки с наибольшим числом студентов и высоким процентом завершения
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboardStats.top_lessons.map((lesson) => (
                      <div key={lesson.lesson_id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{lesson.lesson_title}</p>
                          <p className="text-xs text-gray-600 mt-1">ID урока: {lesson.lesson_id}</p>
                        </div>
                        <div className="flex items-center gap-6 mt-2 sm:mt-0">
                          <div className="text-sm text-gray-700">
                            👥 {lesson.students_count} студентов
                          </div>
                          <div className="text-sm text-blue-700 font-medium">
                            {lesson.avg_completion}% завершения
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className="border border-rose-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-rose-700">
                    <ClipboardList className="w-5 h-5" />
                    Домашние задания, ожидающие проверки
                  </CardTitle>
                  <CardDescription>
                    Ответы студентов на упражнения, которые ещё не были проверены преподавателем
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingReviews.length === 0 ? (
                    <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-4">
                      Все домашние задания проверены! 🎉
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingReviews.map((item) => (
                        <div key={item.response_id} className="border border-rose-100 bg-rose-50 rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-rose-700">{item.user_name}</p>
                              <p className="text-xs text-rose-600">
                                Урок: {item.lesson_title}
                              </p>
                              <p className="text-xs text-rose-500">
                                Упражнение: {item.exercise_title}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs bg-white text-rose-600 border-rose-200">
                              {formatDateTime(item.submitted_at)}
                            </Badge>
                          </div>
                          {item.response_text && (
                            <p className="text-sm text-rose-700 mt-3 bg-white/70 border border-rose-100 rounded-md p-3">
                              {item.response_text.length > 240
                                ? `${item.response_text.slice(0, 240)}…`
                                : item.response_text}
                            </p>
                          )}
                          <Textarea
                            rows={3}
                            value={reviewNotes[item.response_id] ?? ''}
                            onChange={(e) => handleReviewNoteChange(item.response_id, e.target.value)}
                            placeholder="Введите комментарий для студента..."
                            className="mt-3 bg-white border border-rose-200 focus:border-rose-400 focus:ring-rose-400 text-sm"
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReviewNoteChange(item.response_id, '')}
                              className="border-rose-200 text-rose-600 hover:bg-rose-100"
                              disabled={reviewSavingState[item.response_id]}
                            >
                              Очистить
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => submitReviewResponse(item.response_id)}
                              disabled={reviewSavingState[item.response_id]}
                              className="bg-rose-600 hover:bg-rose-700 text-white"
                            >
                              {reviewSavingState[item.response_id] ? 'Отправка...' : 'Отправить ответ'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-sm text-gray-500">Данные дашборда недоступны.</div>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-blue-600" />
            Система обучения V2 - Админ панель
          </CardTitle>
          <CardDescription>
            Управление новой системой обучения с 5 разделами
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="lesson-file-upload" className="block text-sm font-medium mb-2">
                Загрузить урок из текстового файла
              </Label>
              <Input
                id="lesson-file-upload"
                type="file"
                accept=".txt"
                onChange={uploadLessonFile}
                disabled={uploadingFile}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Поддерживаются файлы в формате TXT с разметкой разделов
              </p>
            </div>

            {uploadingFile && (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-gray-600">Загрузка...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Список уроков V2 */}
      <Card>
        <CardHeader>
          <CardTitle>Уроки V2 ({lessonsV2.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка уроков...</p>
            </div>
          ) : lessonsV2.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Нет уроков V2</p>
              <p className="text-sm">Загрузите первый урок из текстового файла</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lessonsV2.map((lesson) => (
                <div key={lesson.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{lesson.title}</h3>
                      <p className="text-gray-600 text-sm mb-2">{lesson.description}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-2">
                        <span>Уровень: {lesson.level}</span>
                        <span>Баллов: {lesson.points_required}</span>
                        <span>Активен: {lesson.is_active ? 'Да' : 'Нет'}</span>
                      </div>

                      {/* Статистика файлов */}
                      {filesStats[lesson.id] && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                            🎬 Медиа: {filesStats[lesson.id].media || 0}
                          </Badge>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            📄 Документы: {filesStats[lesson.id].documents || 0}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            📁 Всего: {filesStats[lesson.id].total || 0}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col items-end gap-2">
                      <Badge variant="outline" className="mb-1">
                        Аналитика: {lesson.analytics_enabled ? 'Включена' : 'Отключена'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(lesson)}
                        className="flex items-center gap-1 w-full"
                      >
                        <Edit className="w-3 h-3" />
                        Редактировать
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteDialog(lesson)}
                        className="flex items-center gap-1 w-full bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                        Удалить
                      </Button>
                    </div>
                  </div>

                  {/* Статистика разделов */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <BookOpen className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                      <div className="text-lg font-semibold">{lesson.theory?.length || 0}</div>
                      <div className="text-xs text-gray-600">Теория</div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-3">
                      <Brain className="w-6 h-6 mx-auto mb-1 text-green-600" />
                      <div className="text-lg font-semibold">{lesson.exercises?.length || 0}</div>
                      <div className="text-xs text-gray-600">Упражнения</div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-3">
                      <Users className="w-6 h-6 mx-auto mb-1 text-purple-600" />
                      <div className="text-lg font-semibold">{lesson.challenge ? lesson.challenge.duration_days : 0}</div>
                      <div className="text-xs text-gray-600">Челлендж</div>
                    </div>

                    <div className="bg-red-50 rounded-lg p-3">
                      <FileText className="w-6 h-6 mx-auto mb-1 text-red-600" />
                      <div className="text-lg font-semibold">{lesson.quiz ? lesson.quiz.questions?.length || 0 : 0}</div>
                      <div className="text-xs text-gray-600">Тест</div>
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-3">
                      <Settings className="w-6 h-6 mx-auto mb-1 text-indigo-600" />
                      <div className="text-lg font-semibold">
                        {filesStats[lesson.id]?.total || 0}
                      </div>
                      <div className="text-xs text-gray-600">Файлы</div>
                    </div>
                  </div>

                  {/* Файлы */}
                  {lesson.files && lesson.files.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium mb-2">Прикрепленные файлы:</h4>
                      <div className="flex flex-wrap gap-2">
                        {lesson.files.map((file) => (
                          <Badge key={file.id} variant="secondary" className="text-xs">
                            {file.file_type === 'pdf' && '📄'}
                            {file.file_type === 'video' && '🎥'}
                            {file.original_filename}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🧠 Система обучения V2 - Тестирование
        </h1>
        <p className="text-gray-600">
          Отдельная версия для тестирования новой системы обучения
        </p>
      </div>

      {renderLessonsV2Tab()}

      {/* Модальное окно редактирования урока */}
      <LessonEditModal
        lesson={editingLesson}
        isOpen={editDialogOpen}
        onClose={closeEditDialog}
        onSave={saveLessonChanges}
        isSaving={savingLesson}
      />

      {/* Диалог подтверждения удаления */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Подтверждение удаления
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Это действие необратимо и приведет к удалению всех связанных данных.
            </DialogDescription>
          </DialogHeader>

          {lessonToDelete && (
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  Вы действительно хотите удалить урок:
                </p>
                <p className="font-semibold text-gray-900 mb-3">
                  "{lessonToDelete.title}"
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>• Будут удалены все блоки теории ({lessonToDelete.theory?.length || 0})</p>
                  <p>• Будут удалены все упражнения ({lessonToDelete.exercises?.length || 0})</p>
                  <p>• Будет удален челлендж {lessonToDelete.challenge ? '(1)' : '(0)'}</p>
                  <p>• Будет удален тест {lessonToDelete.quiz ? '(1)' : '(0)'}</p>
                  <p>• Будут удалены прогресс и ответы всех студентов</p>
                  <p>• Будут удалены все файлы ({lessonToDelete.files?.length || 0})</p>
                </div>
              </div>

              <Alert className="border-yellow-300 bg-yellow-50">
                <AlertDescription className="text-sm text-yellow-800">
                  ⚠️ Это действие нельзя отменить! Все данные будут безвозвратно удалены из базы данных.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="border-t border-gray-200 pt-4">
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={deletingLesson}
              className="border-gray-300 hover:bg-gray-100"
            >
              <X className="w-4 h-4 mr-2" />
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteLesson}
              disabled={deletingLesson}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingLesson ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Удаление...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Да, удалить урок
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Старое модальное окно - удалить после тестирования */}
      <Dialog open={false} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader className="border-b border-gray-200 pb-4 mb-4">
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Редактирование урока
            </DialogTitle>
            <DialogDescription>
              Измените параметры урока. После сохранения изменения вступят в силу немедленно.
            </DialogDescription>
          </DialogHeader>

          {editingLesson && (
            <div className="space-y-5">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <Label htmlFor="lesson-title" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Название урока
                </Label>
                <Input
                  id="lesson-title"
                  value={editingLesson.title || ''}
                  onChange={(e) => handleLessonFieldChange('title', e.target.value)}
                  placeholder="Введите название урока"
                  className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <Label htmlFor="lesson-description" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Описание урока
                </Label>
                <Textarea
                  id="lesson-description"
                  value={editingLesson.description || ''}
                  onChange={(e) => handleLessonFieldChange('description', e.target.value)}
                  placeholder="Введите описание урока"
                  rows={3}
                  className="bg-white border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lesson-level" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Уровень
                    </Label>
                    <Select
                      value={editingLesson.level?.toString() || '1'}
                      onValueChange={(value) => handleLessonFieldChange('level', parseInt(value))}
                    >
                      <SelectTrigger className="bg-white border-gray-300">
                        <SelectValue placeholder="Выберите уровень" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                          <SelectItem key={level} value={level.toString()}>
                            Уровень {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="lesson-order" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Порядок
                    </Label>
                    <Input
                      id="lesson-order"
                      type="number"
                      value={editingLesson.order || 0}
                      onChange={(e) => handleLessonFieldChange('order', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lesson-points" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Необходимые баллы
                    </Label>
                    <Input
                      id="lesson-points"
                      type="number"
                      value={editingLesson.points_required || 0}
                      onChange={(e) => handleLessonFieldChange('points_required', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lesson-module" className="text-sm font-semibold text-gray-700 mb-2 block">
                      Модуль
                    </Label>
                    <Input
                      id="lesson-module"
                      value={editingLesson.module || ''}
                      onChange={(e) => handleLessonFieldChange('module', e.target.value)}
                      placeholder="Название модуля"
                      className="bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-3 bg-white px-4 py-3 rounded-lg border border-gray-300 hover:border-blue-400 transition-colors">
                    <input
                      type="checkbox"
                      id="lesson-active"
                      checked={editingLesson.is_active || false}
                      onChange={(e) => handleLessonFieldChange('is_active', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="lesson-active" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Урок активен
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 bg-white px-4 py-3 rounded-lg border border-gray-300 hover:border-green-400 transition-colors">
                    <input
                      type="checkbox"
                      id="lesson-analytics"
                      checked={editingLesson.analytics_enabled || false}
                      onChange={(e) => handleLessonFieldChange('analytics_enabled', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <Label htmlFor="lesson-analytics" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Аналитика включена
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-gray-200 pt-4 mt-6">
            <Button 
              variant="outline" 
              onClick={closeEditDialog}
              className="border-gray-300 hover:bg-gray-100 text-gray-700"
            >
              <X className="w-4 h-4 mr-2" />
              Отмена
            </Button>
            <Button 
              onClick={saveLessonChanges} 
              disabled={savingLesson}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              {savingLesson ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить изменения
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanelV2;
