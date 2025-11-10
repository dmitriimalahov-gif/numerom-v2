import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  BookOpen,
  Brain,
  Target,
  Calendar,
  BarChart3,
  PlayCircle,
  CheckCircle,
  Lock,
  Star,
  Trophy,
  Clock,
  FileText,
  Video,
  ChevronRight,
  ChevronLeft,
  Home,
  User,
  Calculator
} from 'lucide-react';
import { useAuth } from './AuthContextV2';
import { getBackendUrl } from '../utils/backendUrl';

const LearningSystemV2 = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentSection, setCurrentSection] = useState('theory');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLevel, setUserLevel] = useState(1);
  const [exerciseResponses, setExerciseResponses] = useState({});
  const [exerciseResponsesData, setExerciseResponsesData] = useState({}); // Полные данные ответов
  const [savingResponse, setSavingResponse] = useState({});
  const [lessonProgress, setLessonProgress] = useState(null);
  const [challengeProgress, setChallengeProgress] = useState(null);
  const [challengeNotes, setChallengeNotes] = useState({});
  const [savingChallengeNote, setSavingChallengeNote] = useState({});

  const backendUrl = getBackendUrl();

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/learning-v2/lessons`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLessons(data.lessons);
      setUserLevel(data.user_level);
    } catch (error) {
      console.error('Error loading lessons:', error);
      setError('Ошибка загрузки уроков');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка ответов на упражнения для урока
  // Загрузка ответов на упражнения (как в челлендже - одним запросом)
  const loadExerciseResponses = async (lessonId) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/student/exercise-responses/${lessonId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const exerciseResponsesObj = data.exercise_responses || {};
        
        // Формируем объекты для состояния
        const responses = {};
        const responsesData = {};
        
        Object.keys(exerciseResponsesObj).forEach(exerciseId => {
          const responseData = exerciseResponsesObj[exerciseId];
          responses[exerciseId] = responseData.response_text || '';
          responsesData[exerciseId] = responseData;
        });
        
        setExerciseResponses(responses);
        setExerciseResponsesData(responsesData);
      }
    } catch (error) {
      console.error('Error loading exercise responses:', error);
    }
  };

  // Загрузка прогресса урока
  const loadLessonProgress = async (lessonId) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/student/lesson-progress/${lessonId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLessonProgress(data);
      }
    } catch (error) {
      console.error('Error loading lesson progress:', error);
    }
  };

  // Сохранение ответа на упражнение (как в челлендже)
  const saveExerciseResponse = async (lessonId, exerciseId, responseText) => {
    try {
      setSavingResponse(prev => ({ ...prev, [exerciseId]: true }));

      const response = await fetch(
        `${backendUrl}/api/student/exercise-response`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lesson_id: lessonId,
            exercise_id: exerciseId,
            response_text: responseText
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Обновляем локальное состояние
      setExerciseResponses(prev => ({
        ...prev,
        [exerciseId]: responseText
      }));

      // Перезагружаем ответы и прогресс (как в челлендже)
      await loadExerciseResponses(lessonId);
      await loadLessonProgress(lessonId);

      return data;
    } catch (error) {
      console.error('Error saving exercise response:', error);
      throw error;
    } finally {
      setSavingResponse(prev => ({ ...prev, [exerciseId]: false }));
    }
  };

  const startLesson = async (lesson) => {
    try {
      const response = await fetch(`${backendUrl}/api/learning-v2/lessons/${lesson.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCurrentLesson(data.lesson);
      setCurrentSection('theory');
      
      // Загружаем ответы и прогресс для этого урока
      await loadExerciseResponses(lesson.id);
      await loadLessonProgress(lesson.id);
      
      // Загружаем прогресс челленджа если есть
      if (data.lesson.challenge) {
        await loadChallengeProgress(lesson.id, data.lesson.challenge.id);
      }
    } catch (error) {
      console.error('Error loading lesson:', error);
      setError('Ошибка загрузки урока');
    }
  };

  // Загрузка прогресса челленджа
  const loadChallengeProgress = async (lessonId, challengeId) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/student/challenge-progress/${lessonId}/${challengeId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setChallengeProgress(data);
        
        // Загружаем заметки в локальное состояние
        const notes = {};
        data.daily_notes.forEach(note => {
          notes[note.day] = note.note;
        });
        setChallengeNotes(notes);
      }
    } catch (error) {
      console.error('Error loading challenge progress:', error);
    }
  };

  // Сохранение заметки челленджа
  const saveChallengeNote = async (lessonId, challengeId, day, note, completed = false) => {
    try {
      setSavingChallengeNote(prev => ({ ...prev, [day]: true }));

      const response = await fetch(
        `${backendUrl}/api/student/challenge-progress`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lesson_id: lessonId,
            challenge_id: challengeId,
            day: day,
            note: note,
            completed: completed
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Обновляем локальное состояние
      setChallengeNotes(prev => ({
        ...prev,
        [day]: note
      }));

      // Перезагружаем прогресс
      await loadChallengeProgress(lessonId, challengeId);
      await loadLessonProgress(lessonId);

      return data;
    } catch (error) {
      console.error('Error saving challenge note:', error);
      throw error;
    } finally {
      setSavingChallengeNote(prev => ({ ...prev, [day]: false }));
    }
  };

  const renderLessonCard = (lesson) => {
    const isCompleted = lesson.completed || false;
    const isAccessible = lesson.level <= userLevel;
    const isLocked = !isAccessible;

    const progress = lesson.progress || {};
    const theoryProgress = progress.theory_read_time || 0;
    const exercisesCompleted = progress.exercises_completed || 0;
    const challengeProgress = progress.challenge_progress || 0;

    return (
      <Card key={lesson.id} className={`mb-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${!isLocked ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1">
                  Интерактивный урок
                </Badge>
                {lesson.points_required === 0 ? (
                  <Badge className="bg-green-50 text-green-700 border border-green-200 px-3 py-1">
                    Бесплатно
                  </Badge>
                ) : (
                  <Badge className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1">
                    {lesson.points_required} баллов
                  </Badge>
                )}
                {!isLocked && !isCompleted && (
                  <Badge className="bg-green-100 text-green-800 px-3 py-1 animate-pulse">
                    🔓 ДОСТУПЕН
                  </Badge>
                )}
                {isCompleted && (
                  <Badge className="bg-green-100 text-green-800 px-3 py-1">
                    ✓ ЗАВЕРШЕН
                  </Badge>
                )}
              </div>

              <CardTitle className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                {lesson.title}
              </CardTitle>

              <CardDescription className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
                {lesson.description}
              </CardDescription>

              {/* Прогресс урока */}
              {isAccessible && (theoryProgress > 0 || exercisesCompleted > 0 || challengeProgress > 0) && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 mb-4">
                  <div className="text-sm font-medium text-blue-900 mb-2">Ваш прогресс:</div>
                  <div className="space-y-2">
                    {theoryProgress > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>Теория прочитана</span>
                        <span>{Math.round(theoryProgress)} мин</span>
                      </div>
                    )}
                    {exercisesCompleted > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>Упражнения выполнено</span>
                        <span>{exercisesCompleted}</span>
                      </div>
                    )}
                    {challengeProgress > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>Челлендж</span>
                        <span>{challengeProgress}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-2">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Что включено */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <h4 className="font-medium mb-3 text-gray-900 flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-blue-600" />
              Что включено в урок:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center">
                <BookOpen className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">{lesson.theory?.length || 0} блоков теории</span>
              </div>
              <div className="flex items-center">
                <Brain className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">{lesson.exercises?.length || 0} интерактивных упражнений</span>
              </div>
              {lesson.challenge && (
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{lesson.challenge.duration_days}-дневный челлендж</span>
                </div>
              )}
              {lesson.quiz && (
                <div className="flex items-center">
                  <Target className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Тест ({lesson.quiz.questions?.length || 0} вопросов)</span>
                </div>
              )}
              {lesson.analytics_enabled && (
                <div className="flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Персональная аналитика</span>
                </div>
              )}
            </div>
          </div>

          {/* Кнопка действия */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-sm text-gray-500 flex items-center">
              <Trophy className="w-4 h-4 mr-1 text-blue-500 flex-shrink-0" />
              <span>Уровень {lesson.level} • {lesson.points_required} баллов опыта</span>
            </div>

            <Button
              size="lg"
              variant={isCompleted ? "outline" : "default"}
              disabled={isLocked}
              onClick={() => startLesson(lesson)}
              className={`${!isCompleted && !isLocked ? "bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200" : ""} w-full sm:w-auto`}
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              {isCompleted ? "Повторить урок" : isLocked ? "Заблокирован" : "Начать обучение"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLessonContent = () => {
    if (!currentLesson) return null;

    return (
      <div className="space-y-6">
        {/* Навигация */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentLesson(null)}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  К списку уроков
                </Button>
                <div className="h-6 w-px bg-gray-300"></div>
                <div>
                  <h2 className="text-xl font-semibold">{currentLesson.title}</h2>
                  <p className="text-sm text-gray-600">Уровень {currentLesson.level}</p>
                </div>
              </div>

              {/* Навигация по разделам */}
              <div className="flex gap-2">
                <Button
                  variant={currentSection === 'theory' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentSection('theory')}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Теория
                </Button>
                <Button
                  variant={currentSection === 'exercises' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentSection('exercises')}
                  className="flex items-center gap-2"
                >
                  <Brain className="w-4 h-4" />
                  Упражнения
                </Button>
                {currentLesson.challenge && (
                  <Button
                    variant={currentSection === 'challenge' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentSection('challenge')}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Челлендж
                  </Button>
                )}
                {currentLesson.quiz && (
                  <Button
                    variant={currentSection === 'quiz' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentSection('quiz')}
                    className="flex items-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    Тест
                  </Button>
                )}
                {currentLesson.analytics_enabled && (
                  <Button
                    variant={currentSection === 'analytics' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentSection('analytics')}
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Аналитика
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Содержимое разделов */}
        {currentSection === 'theory' && renderTheorySection()}
        {currentSection === 'exercises' && renderExercisesSection()}
        {currentSection === 'challenge' && renderChallengeSection()}
        {currentSection === 'quiz' && renderQuizSection()}
        {currentSection === 'analytics' && renderAnalyticsSection()}
      </div>
    );
  };

  const renderTheorySection = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Теоретическая часть
          </CardTitle>
          <CardDescription>
            Изучите основы материала перед выполнением практических заданий
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentLesson.theory?.map((block, index) => (
            <div key={block.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">{block.title}</h3>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {block.content}
                </p>
              </div>

              {/* Файлы для этого блока */}
              {currentLesson.files?.filter(f => f.lesson_section === 'theory').length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium mb-2">Материалы для изучения:</h4>
                  <div className="flex gap-2">
                    {currentLesson.files
                      .filter(f => f.lesson_section === 'theory')
                      .map(file => (
                        <Button
                          key={file.id}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          {file.file_type === 'pdf' && <FileText className="w-4 h-4" />}
                          {file.file_type === 'video' && <Video className="w-4 h-4" />}
                          {file.original_filename}
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end">
            <Button
              onClick={() => setCurrentSection('exercises')}
              className="flex items-center gap-2"
            >
              Перейти к упражнениям
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderExercisesSection = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-green-600" />
            Практические упражнения
          </CardTitle>
          <CardDescription>
            Примените полученные знания на практике
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentLesson.exercises?.map((exercise, index) => (
            <div key={exercise.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{exercise.title}</h3>
                <Badge variant="outline" className="ml-2">
                  {exercise.type === 'text' ? 'Текст' :
                   exercise.type === 'multiple_choice' ? 'Выбор' :
                   exercise.type === 'calculation' ? 'Расчет' : 'Рефлексия'}
                </Badge>
              </div>

              <div className="mb-4">
                <p className="text-gray-700 mb-2"><strong>Задание:</strong></p>
                <p className="text-gray-600 whitespace-pre-line">{exercise.description}</p>
              </div>

              <div className="mb-4">
                <p className="text-gray-700 mb-2"><strong>Инструкции:</strong></p>
                <p className="text-gray-600 whitespace-pre-line">{exercise.instructions}</p>
              </div>

              {/* Форма для ответа */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ваш ответ:
                </label>
                {exercise.type === 'multiple_choice' && exercise.options ? (
                  <div className="space-y-2">
                    {exercise.options.map((option, idx) => (
                      <label key={idx} className="flex items-center">
                        <input
                          type="radio"
                          name={`exercise-${exercise.id}`}
                          value={option}
                          checked={exerciseResponses[exercise.id] === option}
                          onChange={(e) => {
                            setExerciseResponses(prev => ({
                              ...prev,
                              [exercise.id]: e.target.value
                            }));
                          }}
                          className="mr-2"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Введите ваш ответ здесь..."
                    value={exerciseResponses[exercise.id] || ''}
                    onChange={(e) => {
                      setExerciseResponses(prev => ({
                        ...prev,
                        [exercise.id]: e.target.value
                      }));
                    }}
                  />
                )}

                <Button 
                  className="mt-3" 
                  size="sm"
                  onClick={() => saveExerciseResponse(currentLesson.id, exercise.id, exerciseResponses[exercise.id] || '')}
                  disabled={savingResponse[exercise.id]}
                >
                  {savingResponse[exercise.id] ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Сохранение...
                    </>
                  ) : exerciseResponses[exercise.id] ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Обновить ответ
                    </>
                  ) : (
                    'Отправить ответ'
                  )}
                </Button>
                
                {exerciseResponses[exercise.id] && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Ответ сохранен
                  </p>
                )}
              </div>

              {/* Комментарий администратора */}
              {exerciseResponsesData[exercise.id]?.reviewed && exerciseResponsesData[exercise.id]?.admin_comment && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-sm font-semibold text-indigo-900 mb-2">
                    💬 Комментарий преподавателя:
                  </p>
                  <p className="text-sm text-indigo-800 whitespace-pre-wrap">
                    {exerciseResponsesData[exercise.id].admin_comment}
                  </p>
                  {exerciseResponsesData[exercise.id].reviewed_at && (
                    <p className="text-xs text-indigo-600 mt-2">
                      Проверено: {new Date(exerciseResponsesData[exercise.id].reviewed_at).toLocaleString('ru-RU')}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Ожидаемый результат:</strong> {exercise.expected_outcome}
                </p>
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentSection('theory')}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Назад к теории
            </Button>

            {currentLesson.challenge ? (
              <Button
                onClick={() => setCurrentSection('challenge')}
                className="flex items-center gap-2"
              >
                Перейти к челленджу
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : currentLesson.quiz ? (
              <Button
                onClick={() => setCurrentSection('quiz')}
                className="flex items-center gap-2"
              >
                Перейти к тесту
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentSection('analytics')}
                className="flex items-center gap-2"
              >
                Перейти к аналитике
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderChallengeSection = () => {
    const completedDays = challengeProgress?.completed_days || [];
    const isCompleted = challengeProgress?.is_completed || false;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Ежедневный челлендж
          </CardTitle>
          <CardDescription>
            {currentLesson.challenge?.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center bg-purple-50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {completedDays.length} / {currentLesson.challenge?.duration_days} дней
            </div>
            <p className="text-gray-600">
              {isCompleted ? '🎉 Челлендж завершен!' : 'Продолжайте выполнять задания'}
            </p>
            <Progress 
              value={(completedDays.length / currentLesson.challenge?.duration_days) * 100} 
              className="mt-3"
            />
          </div>

          <div className="space-y-4">
            {currentLesson.challenge?.daily_tasks?.map((day) => {
              const isDayCompleted = completedDays.includes(day.day);
              const dayNote = challengeNotes[day.day] || '';
              
              return (
                <div 
                  key={day.day} 
                  className={`border rounded-lg p-4 ${
                    isDayCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg">День {day.day}: {day.title}</h4>
                    <Badge variant={isDayCompleted ? "default" : "outline"} className={isDayCompleted ? 'bg-green-600' : ''}>
                      {isDayCompleted ? "✓ Выполнено" : "В процессе"}
                    </Badge>
                  </div>

                  {day.description && (
                    <div className="mb-3">
                      <p className="text-gray-700 mb-2"><strong>Описание:</strong></p>
                      <p className="text-gray-600">{day.description}</p>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-gray-700 mb-2"><strong>Задачи:</strong></p>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                      {day.tasks.map((task, idx) => (
                        <li key={idx}>{task}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Поле для заметок */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200 mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📝 Ваши заметки и наблюдения:
                    </label>
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={4}
                      placeholder="Запишите свои мысли, наблюдения и результаты выполнения задач..."
                      value={dayNote}
                      onChange={(e) => {
                        setChallengeNotes(prev => ({
                          ...prev,
                          [day.day]: e.target.value
                        }));
                      }}
                    />
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => saveChallengeNote(
                          currentLesson.id, 
                          currentLesson.challenge.id, 
                          day.day, 
                          dayNote,
                          false
                        )}
                        disabled={savingChallengeNote[day.day]}
                        className="flex-1"
                      >
                        {savingChallengeNote[day.day] ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                            Сохранение...
                          </>
                        ) : (
                          <>💾 Сохранить заметку</>
                        )}
                      </Button>
                      
                      {!isDayCompleted && dayNote && (
                        <Button 
                          size="sm"
                          onClick={() => saveChallengeNote(
                            currentLesson.id, 
                            currentLesson.challenge.id, 
                            day.day, 
                            dayNote,
                            true
                          )}
                          disabled={savingChallengeNote[day.day]}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          ✓ Отметить выполненным
                        </Button>
                      )}
                    </div>
                    
                    {dayNote && !savingChallengeNote[day.day] && (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ Заметка сохранена
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isCompleted && (
            <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-xl font-bold text-green-800 mb-2">
                Поздравляем! Вы завершили челлендж!
              </h3>
              <p className="text-green-700">
                Вы успешно прошли все {currentLesson.challenge?.duration_days} дней челленджа
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentSection('exercises')}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Назад к упражнениям
            </Button>

            {currentLesson.quiz ? (
              <Button
                onClick={() => setCurrentSection('quiz')}
                className="flex items-center gap-2"
              >
                Перейти к тесту
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentSection('analytics')}
                className="flex items-center gap-2"
              >
                Перейти к аналитике
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderQuizSection = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-red-600" />
            Тест на знания
          </CardTitle>
          <CardDescription>
            {currentLesson.quiz?.description || "Проверьте свои знания"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">
              {currentLesson.quiz?.questions?.length || 0}
            </div>
            <p className="text-gray-600">вопросов для проверки</p>
            <p className="text-sm text-gray-500 mt-1">
              Проходной балл: {currentLesson.quiz?.passing_score || 70}%
            </p>
          </div>

          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              Тест поможет вам закрепить полученные знания и получить персональные рекомендации.
            </AlertDescription>
          </Alert>

          <div className="text-center">
            <Button size="lg" className="px-8 py-3">
              Начать тест
            </Button>
          </div>

          <div className="flex justify-between">
            {currentLesson.challenge ? (
              <Button
                variant="outline"
                onClick={() => setCurrentSection('challenge')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад к челленджу
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setCurrentSection('exercises')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад к упражнениям
              </Button>
            )}

            <Button
              onClick={() => setCurrentSection('analytics')}
              className="flex items-center gap-2"
            >
              Перейти к аналитике
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAnalyticsSection = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Персональная аналитика
          </CardTitle>
          <CardDescription>
            Анализ ваших ответов и персональные рекомендации
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              На основе ваших ответов в упражнениях и результатах теста, мы подготовили персональный анализ.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                <Star className="w-5 h-5 mr-2" />
                Ваши сильные стороны
              </h4>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• Глубокое понимание материала</li>
                <li>• Творческий подход к задачам</li>
                <li>• Высокая мотивация к обучению</li>
              </ul>
            </div>

            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Зоны роста
              </h4>
              <ul className="space-y-2 text-sm text-orange-800">
                <li>• Практическое применение знаний</li>
                <li>• Работа с деталями</li>
                <li>• Систематический подход</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              Персональные рекомендации
            </h4>
            <div className="space-y-3 text-sm text-blue-800">
              <p>
                <strong>1. Практика:</strong> Регулярно применяйте полученные знания в повседневной жизни.
                Попробуйте анализировать цифры вокруг вас - даты, номера, адреса.
              </p>
              <p>
                <strong>2. Глубина:</strong> Когда изучаете материал, старайтесь не только запомнить информацию,
                но и понять ее суть и взаимосвязи.
              </p>
              <p>
                <strong>3. Терпение:</strong> Нумерология - это не быстрый результат, а постепенное раскрытие
                понимания. Дайте себе время на интеграцию знаний.
              </p>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
            <h4 className="font-semibold text-indigo-900 mb-3 flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Следующие шаги
            </h4>
            <div className="space-y-2 text-sm text-indigo-800">
              <p>• Продолжайте изучение следующих уроков</p>
              <p>• Практикуйте анализ личных чисел</p>
              <p>• Обсуждайте темы с единомышленниками</p>
              <p>• Ведите дневник открытий</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            {currentLesson.quiz ? (
              <Button
                variant="outline"
                onClick={() => setCurrentSection('quiz')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад к тесту
              </Button>
            ) : currentLesson.challenge ? (
              <Button
                variant="outline"
                onClick={() => setCurrentSection('challenge')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад к челленджу
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setCurrentSection('exercises')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад к упражнениям
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentLesson(null)}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4 mr-1" />
                К списку уроков
              </Button>

              <Button
                onClick={() => window.location.href = '/personal-data'}
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4 mr-1" />
                Личные данные
              </Button>

              <Button
                onClick={() => window.location.href = '/numerology'}
                className="flex items-center gap-2"
              >
                <Calculator className="w-4 h-4 mr-1" />
                Нумерология
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка системы обучения...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="max-w-md mx-auto">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {currentLesson ? (
        renderLessonContent()
      ) : (
        <>
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Система Обучения V2
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Интерактивная платформа для глубокого изучения нумерологии с персональной аналитикой
            </p>
          </div>

          {/* Уровень пользователя */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  Уровень {userLevel}
                </div>
                <p className="text-gray-600">Ваш текущий уровень обучения</p>
                <Progress value={(userLevel / 10) * 100} className="mt-4 max-w-md mx-auto" />
              </div>
            </CardContent>
          </Card>

          {/* Список уроков */}
          <div className="space-y-6">
            {lessons.map(lesson => renderLessonCard(lesson))}
          </div>

          {lessons.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Уроки готовятся
              </h3>
              <p className="text-gray-600">
                Скоро здесь появятся новые интерактивные уроки
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LearningSystemV2;
