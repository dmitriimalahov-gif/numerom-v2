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
  Calculator,
  Eye,
  Download,
  X,
  ExternalLink,
  Upload,
  Film,
  Maximize2,
  Minimize2,
  Image,
  FileSpreadsheet,
  RotateCw,
  RotateCcw,
  Zap,
  TrendingUp,
  Award,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from './AuthContextV2';
import { getBackendUrl } from '../utils/backendUrl';

const LearningSystemV2 = () => {
  const { user, isAuthenticated, loading: authLoading, isInitialized } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentSection, setCurrentSection] = useState('theory');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLevel, setUserLevel] = useState(1);
  const [lessonsFilesStats, setLessonsFilesStats] = useState({}); // Статистика файлов для всех уроков
  const [dashboardStats, setDashboardStats] = useState(null); // Статистика дашборда
  const [exerciseResponses, setExerciseResponses] = useState({});
  const [exerciseResponsesData, setExerciseResponsesData] = useState({}); // Полные данные ответов
  const [savingResponse, setSavingResponse] = useState({});
  const [lessonProgress, setLessonProgress] = useState(null);
  const [challengeProgress, setChallengeProgress] = useState(null);
  const [challengeNotes, setChallengeNotes] = useState({});
  const [savingChallengeNote, setSavingChallengeNote] = useState({});
  const [challengeHistory, setChallengeHistory] = useState([]); // История всех попыток челленджа
  const [quizHistory, setQuizHistory] = useState([]); // История всех попыток теста
  
  // Состояния для файлов
  const [lessonFiles, setLessonFiles] = useState({ theory: [], exercises: [], challenge: [], quiz: [] });
  const [viewingFile, setViewingFile] = useState(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageRotation, setImageRotation] = useState(0); // Угол поворота изображения
  const [videoWatchStartTime, setVideoWatchStartTime] = useState(null);
  const [videoWatchInterval, setVideoWatchInterval] = useState(null);
  const [studentFilesStats, setStudentFilesStats] = useState(null);
  const [lessonFileMap, setLessonFileMap] = useState({});
  
  // Состояние для компактной навигации при прокрутке
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Состояния для теста
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  
  // Состояния для отслеживания времени активности
  const [timeActivity, setTimeActivity] = useState({ total_minutes: 0, total_points: 0 });
  const [activityStartTime, setActivityStartTime] = useState(null);

  const backendUrl = getBackendUrl();

  useEffect(() => {
    if (!isInitialized || authLoading || !isAuthenticated) {
      return;
    }

    loadLessons();
    loadDashboardStats();
  }, [isInitialized, authLoading, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLessons([]);
      setCurrentLesson(null);
      setDashboardStats(null);
      setLessonFiles({ theory: [], exercises: [], challenge: [], quiz: [] });
      setStudentFilesStats(null);
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadDashboardStats = async () => {
    try {
      console.log('Loading dashboard stats...');
      const response = await fetch(`${backendUrl}/api/student/dashboard-stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Dashboard stats response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard stats data:', data);
        setDashboardStats(data.stats);
        console.log('Dashboard stats set successfully');
      } else {
        console.error('Dashboard stats response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

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
      
      // Загружаем прогресс для каждого урока
      const lessonsWithProgress = await Promise.all(
        data.lessons.map(async (lesson) => {
          try {
            const progressResponse = await fetch(
              `${backendUrl}/api/student/lesson-progress/${lesson.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              return {
                ...lesson,
                progress_data: progressData
              };
            }
            return lesson;
          } catch (error) {
            console.error(`Error loading progress for lesson ${lesson.id}:`, error);
            return lesson;
          }
        })
      );
      
      setLessons(lessonsWithProgress);
      setUserLevel(data.user_level);
      
      // Загружаем статистику файлов для всех уроков
      await loadAllLessonsFilesStats(lessonsWithProgress);
    } catch (error) {
      console.error('Error loading lessons:', error);
      setError('Ошибка загрузки уроков');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка статистики файлов для всех уроков
  const loadAllLessonsFilesStats = async (lessons) => {
    try {
      const stats = {};
      
      // Загружаем файлы для каждого урока параллельно
      await Promise.all(
        lessons.map(async (lesson) => {
          try {
            const response = await fetch(
              `${backendUrl}/api/student/lesson-files/${lesson.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              const files = data.files || [];
              const videoCount = files.filter(f => f.mime_type?.startsWith('video/') || f.file_type === 'media').length;
              const documentCount = files.length - videoCount;
              
              stats[lesson.id] = { videoCount, documentCount };
            }
          } catch (err) {
            console.error(`Error loading files for lesson ${lesson.id}:`, err);
            stats[lesson.id] = { videoCount: 0, documentCount: 0 };
          }
        })
      );
      
      setLessonsFilesStats(stats);
    } catch (error) {
      console.error('Error loading lessons files stats:', error);
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
      
      // Загружаем прогресс челленджа и историю если есть
      if (data.lesson.challenge) {
        await loadChallengeProgress(lesson.id, data.lesson.challenge.id);
        await loadChallengeHistory(lesson.id, data.lesson.challenge.id);
      }
      
      // Загружаем историю тестов если есть
      if (data.lesson.quiz) {
        await loadQuizHistory(lesson.id);
      }
      
      // Загружаем статистику времени активности
      await loadTimeActivity(lesson.id);
      
      // Загружаем файлы урока
      await loadLessonFiles(lesson.id);
      
      // Загружаем статистику файлов студента
      await loadStudentFilesStats(lesson.id);
    } catch (error) {
      console.error('Error loading lesson:', error);
      setError('Ошибка загрузки урока');
    }
  };

  // Загрузка прогресса челленджа
  // Загрузка текущего прогресса челленджа
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

  // Загрузка истории всех попыток челленджа
  const loadChallengeHistory = async (lessonId, challengeId) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/student/challenge-history/${lessonId}/${challengeId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setChallengeHistory(data.attempts || []);
      }
    } catch (error) {
      console.error('Error loading challenge history:', error);
    }
  };

  // Загрузка истории всех попыток теста
  const loadQuizHistory = async (lessonId) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/student/quiz-attempts/${lessonId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Quiz history loaded:', data);
        setQuizHistory(data.attempts || []);
        
        // Восстанавливаем состояние последней попытки теста
        if (data.attempts && data.attempts.length > 0) {
          const lastAttempt = data.attempts[0]; // Первая попытка - самая последняя (сортировка по убыванию)
          setQuizCompleted(true);
          setQuizScore(lastAttempt.score);
          console.log('Quiz state restored:', { score: lastAttempt.score, passed: lastAttempt.passed });
        }
      }
    } catch (error) {
      console.error('Error loading quiz history:', error);
    }
  };

  // Загрузка статистики времени активности
  const loadTimeActivity = async (lessonId) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/student/time-activity/${lessonId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTimeActivity({
          total_minutes: data.total_minutes || 0,
          total_points: data.total_points || 0
        });
        console.log('Time activity loaded:', data);
      }
    } catch (error) {
      console.error('Error loading time activity:', error);
    }
  };

  // Отправка времени активности на сервер
  const sendTimeActivity = async (lessonId, minutesSpent) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/student/time-activity`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lesson_id: lessonId,
            minutes_spent: minutesSpent
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTimeActivity({
          total_minutes: data.total_minutes,
          total_points: data.total_points
        });
        console.log('Time activity updated:', data);
      }
    } catch (error) {
      console.error('Error sending time activity:', error);
    }
  };

  // Загрузка файлов урока
  const loadLessonFiles = async (lessonId) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/student/lesson-files/${lessonId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const receipt = Array.isArray(data.files) ? data.files : [];
        
        const filesBySection = {
          theory: receipt.filter(f => f.section === 'theory'),
          exercises: receipt.filter(f => f.section === 'exercises'),
          challenge: receipt.filter(f => f.section === 'challenge'),
          quiz: receipt.filter(f => f.section === 'quiz')
        };

        const map = {};
        receipt.forEach(file => {
          if (file?.id) {
            map[file.id] = file;
          }
        });

        setLessonFiles(filesBySection);
        setLessonFileMap(map);
      } else if (response.status === 404) {
        setLessonFiles({ theory: [], exercises: [], challenge: [], quiz: [] });
        setLessonFileMap({});
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading lesson files:', error);
      setLessonFiles({ theory: [], exercises: [], challenge: [], quiz: [] });
      setLessonFileMap({});
    }
  };

  // Загрузка статистики файлов студента
  const loadStudentFilesStats = async (lessonId) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/student/my-files-stats/${lessonId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStudentFilesStats(data);
      }
    } catch (error) {
      console.error('Error loading student files stats:', error);
    }
  };

  // Открытие файла на просмотр
  const handleViewFile = async (file) => {
    setViewingFile(file);
    setFileViewerOpen(true);
    
    // Отправляем событие просмотра
    try {
      await fetch(`${backendUrl}/api/student/file-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          file_id: file.id,
          lesson_id: currentLesson.id,
          action: 'view'
        })
      });
    } catch (error) {
      console.error('Error tracking file view:', error);
    }
  };

  // Закрытие просмотра файла
  const handleCloseFileViewer = () => {
    // Останавливаем трекинг видео
    if (videoWatchInterval) {
      clearInterval(videoWatchInterval);
      setVideoWatchInterval(null);
    }
    
    // Отправляем финальное время просмотра
    if (videoWatchStartTime && viewingFile?.mime_type?.startsWith('video/')) {
      const minutesWatched = Math.floor((Date.now() - videoWatchStartTime) / 60000);
      if (minutesWatched > 0) {
        sendVideoWatchTime(viewingFile.id, minutesWatched);
      }
    }
    
    setViewingFile(null);
    setFileViewerOpen(false);
    setIsFullscreen(false);
    setImageRotation(0);
    setVideoWatchStartTime(null);
  };

  // Отправка времени просмотра видео
  const sendVideoWatchTime = async (fileId, minutesWatched) => {
    try {
      await fetch(`${backendUrl}/api/student/video-watch-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          file_id: fileId,
          lesson_id: currentLesson.id,
          minutes_watched: minutesWatched
        })
      });
    } catch (error) {
      console.error('Error tracking video watch time:', error);
    }
  };

  // Скачивание файла
  const handleDownloadFile = async (file) => {
    try {
      // Отправляем событие скачивания
      try {
        await fetch(`${backendUrl}/api/student/file-analytics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            file_id: file.id,
            lesson_id: currentLesson.id,
            action: 'download'
          })
        });
      } catch (analyticsError) {
        console.error('Error tracking file download:', analyticsError);
      }
      
      // Скачиваем файл
      const response = await fetch(`${backendUrl}/api/download-file/${file.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка при скачивании файла');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Ошибка при скачивании файла');
    }
  };

  // useEffect для отслеживания прокрутки (компактная навигация)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // useEffect для трекинга видео
  useEffect(() => {
    if (fileViewerOpen && viewingFile?.mime_type?.startsWith('video/')) {
      setVideoWatchStartTime(Date.now());
      
      const interval = setInterval(() => {
        sendVideoWatchTime(viewingFile.id, 1);
      }, 60000);
      
      setVideoWatchInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [fileViewerOpen, viewingFile]);

  // Таймер для отслеживания времени активности (каждую минуту отправляем данные)
  useEffect(() => {
    if (!currentLesson) return;

    // Запускаем таймер при открытии урока
    setActivityStartTime(Date.now());

    const interval = setInterval(() => {
      // Каждую минуту отправляем 1 минуту активности
      sendTimeActivity(currentLesson.id, 1);
    }, 60000); // 60000 мс = 1 минута

    // Очистка при размонтировании или смене урока
    return () => {
      clearInterval(interval);
      
      // При выходе из урока отправляем оставшееся время
      if (activityStartTime) {
        const elapsedMinutes = Math.floor((Date.now() - activityStartTime) / 60000);
        if (elapsedMinutes > 0) {
          sendTimeActivity(currentLesson.id, elapsedMinutes);
        }
      }
    };
  }, [currentLesson]);

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

      // Перезагружаем прогресс и историю
      await loadChallengeProgress(lessonId, challengeId);
      await loadChallengeHistory(lessonId, challengeId);
      await loadLessonProgress(lessonId);

      return data;
    } catch (error) {
      console.error('Error saving challenge note:', error);
      throw error;
    } finally {
      setSavingChallengeNote(prev => ({ ...prev, [day]: false }));
    }
  };

  // Сброс челленджа для повторного прохождения (создание новой попытки)
  const restartChallenge = async () => {
    try {
      console.log('Restarting challenge...');
      
      // Сбрасываем локальное состояние на пустой прогресс
      setChallengeProgress({
        current_day: 1,
        completed_days: [],
        daily_notes: [],
        is_completed: false,
        attempt_number: (challengeProgress?.total_attempts || 0) + 1,
        total_attempts: (challengeProgress?.total_attempts || 0) + 1,
        points_earned: 0,
        total_points: challengeProgress?.total_points || 0
      });
      
      // Очищаем заметки
      setChallengeNotes({});
      
      console.log('Challenge restarted successfully - new attempt ready');
    } catch (error) {
      console.error('Error restarting challenge:', error);
    }
  };

  // Функции для работы с тестом
  const startQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
    setQuizCompleted(false);
    setQuizScore(0);
  };

  const handleQuizAnswer = (questionId, answer) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentLesson.quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const submitQuiz = async () => {
    try {
      // Подсчет правильных ответов
      let correctCount = 0;
      const questions = currentLesson.quiz.questions;
      
      questions.forEach(question => {
        const userAnswer = quizAnswers[question.id];
        if (userAnswer === question.correct_answer) {
          correctCount++;
        }
      });

      const score = Math.round((correctCount / questions.length) * 100);
      const passingScore = currentLesson.quiz.passing_score || 70;
      const passed = score >= passingScore;

      // Сохраняем результат в БД
      const response = await fetch(
        `${backendUrl}/api/student/quiz-attempt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lesson_id: currentLesson.id,
            quiz_id: currentLesson.quiz.id || currentLesson.id,
            score: score,
            passed: passed,
            answers: quizAnswers
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Quiz result saved:', data);

      // Обновляем состояние с баллами
      setQuizScore(score);
      setQuizCompleted(true);
      
      // Сохраняем заработанные баллы
      if (data.points_earned) {
        // Можно сохранить в состояние для отображения
        console.log(`Earned ${data.points_earned} points for quiz!`);
      }

      // Обновляем прогресс урока и историю тестов
      await loadLessonProgress(currentLesson.id);
      await loadQuizHistory(currentLesson.id);

    } catch (error) {
      console.error('Error submitting quiz:', error);
      // Даже если сохранение не удалось, показываем результат
      // Пересчитываем score локально
      let localCorrectCount = 0;
      const questions = currentLesson.quiz.questions;
      questions.forEach(question => {
        const userAnswer = quizAnswers[question.id];
        if (userAnswer === question.correct_answer) {
          localCorrectCount++;
        }
      });
      const score = Math.round((localCorrectCount / questions.length) * 100);
      setQuizScore(score);
      setQuizCompleted(true);
    }
  };

  const restartQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestionIndex(0);
    setQuizAnswers({});
    setQuizCompleted(false);
    setQuizScore(0);
  };

  const renderLessonCard = (lesson) => {
    const isCompleted = lesson.progress_data?.is_completed || lesson.completed || false;
    const isAccessible = lesson.level <= userLevel;
    const isLocked = !isAccessible;

    const progress = lesson.progress || {};
    const theoryProgress = progress.theory_read_time || 0;
    const exercisesCompleted = progress.exercises_completed || 0;
    const challengeProgress = progress.challenge_progress || 0;
    
    // Общий прогресс урока
    const completionPercentage = lesson.progress_data?.completion_percentage || 0;

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
              {lessonsFilesStats[lesson.id]?.videoCount > 0 && (
                <div className="flex items-center">
                  <Film className="w-4 h-4 mr-2 flex-shrink-0" style={{ color: 'rgb(16, 185, 129)' }} />
                  <span className="text-sm text-gray-700">{lessonsFilesStats[lesson.id].videoCount} видеофайлов</span>
                </div>
              )}
              {lessonsFilesStats[lesson.id]?.documentCount > 0 && (
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-2 flex-shrink-0" style={{ color: 'rgb(239, 68, 68)' }} />
                  <span className="text-sm text-gray-700">{lessonsFilesStats[lesson.id].documentCount} документов</span>
                </div>
              )}
            </div>
          </div>

          {/* Общий прогресс урока */}
          {isAccessible && completionPercentage > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-900">Общий прогресс урока</span>
                <span className="text-lg font-bold text-indigo-600">{Math.round(completionPercentage)}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2.5" />
              <p className="text-xs text-indigo-700 mt-2">
                {completionPercentage === 100 ? '🎉 Урок полностью завершен!' : 
                 completionPercentage >= 75 ? 'Отличная работа! Вы почти у цели!' :
                 completionPercentage >= 50 ? 'Хороший прогресс! Продолжайте!' :
                 completionPercentage >= 25 ? 'Вы на правильном пути!' :
                 'Начните с изучения теории'}
              </p>
            </div>
          )}

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
        {/* Навигация - фиксированная при прокрутке, компактная на мобильных */}
        <div className={`sticky top-0 z-40 bg-white shadow-md transition-all duration-300 ${isScrolled ? 'py-1' : 'py-0'}`}>
          <Card className="border-0 rounded-none">
            <CardHeader className={`transition-all duration-300 ${isScrolled ? 'py-2 px-3 md:py-3 md:px-6' : 'py-3 px-4 md:py-4 md:px-6'}`}>
              <div className="flex items-center justify-between flex-wrap gap-2 md:gap-3">
              <div className="flex items-center gap-2 md:gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentLesson(null)}
                  className={`flex items-center gap-1 md:gap-2 transition-all ${isScrolled ? 'h-7 px-2 text-xs md:h-9 md:px-3 md:text-sm' : 'h-9 px-3'}`}
                >
                  <ChevronLeft className={`${isScrolled ? 'w-3 h-3 md:w-4 md:h-4' : 'w-4 h-4'}`} />
                  <span className="hidden sm:inline">К списку уроков</span>
                  <span className="sm:hidden">Назад</span>
                </Button>
                <div className={`w-px bg-gray-300 ${isScrolled ? 'h-4 md:h-6' : 'h-6'}`}></div>
                <div>
                  <h2 className={`font-semibold transition-all ${isScrolled ? 'text-sm md:text-lg' : 'text-lg md:text-xl'}`}>
                    <span className="hidden sm:inline">{currentLesson.title}</span>
                    <span className="sm:hidden">{currentLesson.title.length > 20 ? currentLesson.title.substring(0, 20) + '...' : currentLesson.title}</span>
                  </h2>
                  <p className={`text-gray-600 transition-all ${isScrolled ? 'text-xs hidden md:block' : 'text-xs md:text-sm'}`}>
                    Уровень {currentLesson.level}
                  </p>
                </div>
              </div>

              {/* Навигация по разделам */}
              <div className="flex gap-1 md:gap-2 flex-wrap">
                <Button
                  variant={currentSection === 'theory' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentSection('theory')}
                  className={`flex items-center gap-1 md:gap-2 transition-all ${isScrolled ? 'h-7 px-2 text-xs md:h-9 md:px-3 md:text-sm' : 'h-9 px-3'}`}
                >
                  <BookOpen className={`${isScrolled ? 'w-3 h-3 md:w-4 md:h-4' : 'w-4 h-4'}`} />
                  <span className="hidden sm:inline">Теория</span>
                  <span className="sm:hidden">📖</span>
                </Button>
                <Button
                  variant={currentSection === 'exercises' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentSection('exercises')}
                  className={`flex items-center gap-1 md:gap-2 transition-all ${isScrolled ? 'h-7 px-2 text-xs md:h-9 md:px-3 md:text-sm' : 'h-9 px-3'}`}
                >
                  <Brain className={`${isScrolled ? 'w-3 h-3 md:w-4 md:h-4' : 'w-4 h-4'}`} />
                  <span className="hidden sm:inline">Упражнения</span>
                  <span className="sm:hidden">🧠</span>
                </Button>
                {currentLesson.challenge && (
                  <Button
                    variant={currentSection === 'challenge' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentSection('challenge')}
                    className={`flex items-center gap-1 md:gap-2 transition-all ${isScrolled ? 'h-7 px-2 text-xs md:h-9 md:px-3 md:text-sm' : 'h-9 px-3'}`}
                  >
                    <Calendar className={`${isScrolled ? 'w-3 h-3 md:w-4 md:h-4' : 'w-4 h-4'}`} />
                    <span className="hidden sm:inline">Челлендж</span>
                    <span className="sm:hidden">📅</span>
                  </Button>
                )}
                {currentLesson.quiz && (
                  <Button
                    variant={currentSection === 'quiz' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentSection('quiz')}
                    className={`flex items-center gap-1 md:gap-2 transition-all ${isScrolled ? 'h-7 px-2 text-xs md:h-9 md:px-3 md:text-sm' : 'h-9 px-3'}`}
                  >
                    <Target className={`${isScrolled ? 'w-3 h-3 md:w-4 md:h-4' : 'w-4 h-4'}`} />
                    <span className="hidden sm:inline">Тест</span>
                    <span className="sm:hidden">🎯</span>
                  </Button>
                )}
                {/* Кнопка "Файлы" */}
                {(lessonFiles.theory.length > 0 || lessonFiles.exercises.length > 0 || 
                  lessonFiles.challenge.length > 0 || lessonFiles.quiz.length > 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Если не в теории, переключаемся на теорию
                      if (currentSection !== 'theory') {
                        setCurrentSection('theory');
                      }
                      // Прокручиваем к файлам через небольшую задержку
                      setTimeout(() => {
                        const filesSection = document.getElementById('files-section');
                        if (filesSection) {
                          filesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 100);
                    }}
                    className={`flex items-center gap-1 md:gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all ${isScrolled ? 'h-7 px-2 text-xs md:h-9 md:px-3 md:text-sm' : 'h-9 px-3'}`}
                  >
                    <Upload className={`${isScrolled ? 'w-3 h-3 md:w-4 md:h-4' : 'w-4 h-4'}`} />
                    <span className="hidden sm:inline">Файлы</span>
                    <span className="sm:hidden">📁</span>
                  </Button>
                )}
                {currentLesson.analytics_enabled && (
                  <Button
                    variant={currentSection === 'analytics' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentSection('analytics')}
                    className={`flex items-center gap-1 md:gap-2 transition-all ${isScrolled ? 'h-7 px-2 text-xs md:h-9 md:px-3 md:text-sm' : 'h-9 px-3'}`}
                  >
                    <BarChart3 className={`${isScrolled ? 'w-3 h-3 md:w-4 md:h-4' : 'w-4 h-4'}`} />
                    <span className="hidden sm:inline">Аналитика</span>
                    <span className="sm:hidden">📊</span>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
        </div>

        {/* Содержимое разделов */}
        {currentSection === 'theory' && renderTheorySection()}
        {currentSection === 'exercises' && renderExercisesSection()}
        {currentSection === 'challenge' && renderChallengeSection()}
        {currentSection === 'quiz' && renderQuizSection()}
        {currentSection === 'analytics' && renderAnalyticsSection()}
      </div>
    );
  };

  // Функция для подсчета файлов урока
  const getLessonFilesCount = (lessonId) => {
    const allFiles = [
      ...(lessonFiles.theory || []),
      ...(lessonFiles.exercises || []),
      ...(lessonFiles.challenge || []),
      ...(lessonFiles.quiz || [])
    ];
    
    const videoCount = allFiles.filter(f => f.mime_type?.startsWith('video/')).length;
    const documentCount = allFiles.filter(f => 
      f.extension === 'pdf' || 
      f.extension === 'doc' || 
      f.extension === 'docx' || 
      f.extension === 'xls' || 
      f.extension === 'xlsx' || 
      f.extension === 'txt'
    ).length;
    
    return { videoCount, documentCount };
  };

  // Функция для получения цвета и иконки файла
  const getFileStyle = (file) => {
    const ext = file.extension?.toLowerCase();
    
    // PDF - красный
    if (ext === 'pdf') {
      return {
        color: 'rgb(239, 68, 68)',
        bgColor: 'rgb(254, 226, 226)',
        icon: <FileText className="w-4 h-4" style={{ color: 'rgb(239, 68, 68)' }} />
      };
    }
    // Word - синий
    if (ext === 'doc' || ext === 'docx') {
      return {
        color: 'rgb(59, 130, 246)',
        bgColor: 'rgb(219, 234, 254)',
        icon: <FileText className="w-4 h-4" style={{ color: 'rgb(59, 130, 246)' }} />
      };
    }
    // Excel - зелёный
    if (ext === 'xls' || ext === 'xlsx') {
      return {
        color: 'rgb(34, 197, 94)',
        bgColor: 'rgb(220, 252, 231)',
        icon: <FileSpreadsheet className="w-4 h-4" style={{ color: 'rgb(34, 197, 94)' }} />
      };
    }
    // TXT - серый
    if (ext === 'txt') {
      return {
        color: 'rgb(107, 114, 128)',
        bgColor: 'rgb(243, 244, 246)',
        icon: <FileText className="w-4 h-4" style={{ color: 'rgb(107, 114, 128)' }} />
      };
    }
    // Видео - зелёный (мягкий)
    if (file.mime_type?.startsWith('video/')) {
      return {
        color: 'rgb(16, 185, 129)',
        bgColor: 'rgb(209, 250, 229)',
        icon: <Film className="w-4 h-4" style={{ color: 'rgb(16, 185, 129)' }} />
      };
    }
    // Изображения - розовый
    if (file.mime_type?.startsWith('image/')) {
      return {
        color: 'rgb(236, 72, 153)',
        bgColor: 'rgb(252, 231, 243)',
        icon: <Image className="w-4 h-4" style={{ color: 'rgb(236, 72, 153)' }} />
      };
    }
    // По умолчанию - синий
    return {
      color: 'rgb(59, 130, 246)',
      bgColor: 'rgb(219, 234, 254)',
      icon: <FileText className="w-4 h-4" style={{ color: 'rgb(59, 130, 246)' }} />
    };
  };

  // Рендеринг файлов для раздела
  const renderFilesSection = (sectionName) => {
    const files = lessonFiles[sectionName] || [];
    
    if (files.length === 0) return null;
    
    return (
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Файлы и материалы ({files.length})
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="files-section">
          {files.map((file) => {
            const fileStyle = getFileStyle(file);
            return (
              <div 
                key={file.id} 
                className="bg-white p-4 rounded-lg border-2 hover:shadow-lg transition-all"
                style={{ borderColor: fileStyle.color }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: fileStyle.bgColor }}
                      >
                        {fileStyle.icon}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{file.original_name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className="text-xs border-0"
                        style={{ 
                          backgroundColor: fileStyle.bgColor,
                          color: fileStyle.color
                        }}
                      >
                        {file.extension?.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {(file.file_size / 1024 / 1024).toFixed(2)} МБ
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleViewFile(file)}
                    className="flex-1 text-white"
                    style={{ 
                      backgroundColor: fileStyle.color,
                      borderColor: fileStyle.color
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Просмотр
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadFile(file)}
                    className="flex-1"
                    style={{ 
                      borderColor: fileStyle.color,
                      color: fileStyle.color
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Скачать
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
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

            </div>
          ))}

          {/* Файлы для теории */}
          {renderFilesSection('theory')}

          <div className="flex justify-end mt-6">
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

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentSection('theory')}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Назад к теории
            </Button>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={async () => {
                  if (window.confirm('Вы уверены, что хотите пройти урок заново? Это удалит ваши ответы на упражнения и прогресс урока. История тестов и челленджей сохранится.')) {
                    try {
                      const response = await fetch(
                        `${backendUrl}/api/student/reset-lesson/${currentLesson.id}`,
                        {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                          }
                        }
                      );
                      
                      if (response.ok) {
                        // Перезагружаем урок
                        await startLesson(currentLesson);
                        setCurrentSection('theory');
                        alert('Прогресс урока сброшен! Вы можете начать заново.');
                      } else {
                        alert('Ошибка при сбросе прогресса');
                      }
                    } catch (error) {
                      console.error('Error resetting lesson:', error);
                      alert('Ошибка при сбросе прогресса');
                    }
                  }
                }}
                className="flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                Пройти урок заново
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
          </div>
          
          {/* Файлы для упражнений */}
          {renderFilesSection('exercises')}
        </CardContent>
      </Card>
    );
  };

  const renderChallengeSection = () => {
    const completedDays = challengeProgress?.completed_days || [];
    const isCompleted = challengeProgress?.is_completed || false;
    const attemptNumber = challengeProgress?.attempt_number || 1;
    const totalAttempts = challengeProgress?.total_attempts || 0;
    const pointsEarned = challengeProgress?.points_earned || 0;
    const totalPoints = challengeProgress?.total_points || 0;

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
          {/* Статистика попыток и баллов */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700 mb-1">Попытка</div>
              <div className="text-2xl font-bold text-blue-900">#{attemptNumber}</div>
              <div className="text-xs text-blue-600 mt-1">Всего: {totalAttempts}</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-green-700 mb-1">Баллы (текущая)</div>
              <div className="text-2xl font-bold text-green-900">{pointsEarned}</div>
              <div className="text-xs text-green-600 mt-1">
                {currentLesson.challenge?.points_per_day || 10} за день
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-700 mb-1">Всего баллов</div>
              <div className="text-2xl font-bold text-yellow-900">{totalPoints}</div>
              <div className="text-xs text-yellow-600 mt-1">За все попытки</div>
            </div>
          </div>

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
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">🎉</div>
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  Поздравляем! Вы завершили челлендж!
                </h3>
                <p className="text-green-700 mb-2">
                  Вы успешно прошли все {currentLesson.challenge?.duration_days} дней челленджа
                </p>
                <div className="bg-white rounded-lg p-4 mt-4 inline-block">
                  <div className="text-sm text-gray-600 mb-1">Заработано баллов:</div>
                  <div className="text-3xl font-bold text-green-600">
                    +{pointsEarned} 🌟
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ({completedDays.length} дней × {currentLesson.challenge?.points_per_day || 10} + бонус {currentLesson.challenge?.bonus_points || 50})
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={restartChallenge}
                  className="flex items-center gap-2 border-green-600 text-green-700 hover:bg-green-100"
                >
                  <Calendar className="w-4 h-4" />
                  Пройти челлендж заново
                </Button>
              </div>
              <p className="text-center text-xs text-green-600 mt-3">
                💡 Пройдите челлендж снова, чтобы заработать еще больше баллов!
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
          
          {/* Файлы для челленджа */}
          {renderFilesSection('challenge')}
        </CardContent>
      </Card>
    );
  };

  const renderQuizSection = () => {
    if (!currentLesson.quiz || !currentLesson.quiz.questions || currentLesson.quiz.questions.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-red-600" />
              Тест на знания
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Тест для этого урока пока не добавлен.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    // Если тест завершен - показываем результаты
    if (quizCompleted) {
      const passingScore = currentLesson.quiz.passing_score || 70;
      const passed = quizScore >= passingScore;

      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-red-600" />
              Результаты теста
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className={`text-6xl font-bold mb-4 ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {quizScore}%
              </div>
              {passed ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-16 h-16 text-green-600" />
                  <p className="text-xl font-semibold text-green-900">Тест пройден!</p>
                  <p className="text-gray-600">Отличная работа! Вы успешно усвоили материал.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Target className="w-16 h-16 text-red-600" />
                  <p className="text-xl font-semibold text-red-900">Тест не пройден</p>
                  <p className="text-gray-600">Проходной балл: {passingScore}%. Попробуйте еще раз!</p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-semibold mb-4">Детальные результаты:</h4>
              <div className="space-y-3">
                {currentLesson.quiz.questions.map((question, index) => {
                  const userAnswer = quizAnswers[question.id];
                  const isCorrect = userAnswer === question.correct_answer;
                  
                  return (
                    <div key={question.id} className={`p-4 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-start gap-3">
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                        ) : (
                          <Target className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium mb-2">{index + 1}. {question.question}</p>
                          <p className="text-sm text-gray-600">Ваш ответ: {userAnswer || 'Не отвечено'}</p>
                          {!isCorrect && (
                            <p className="text-sm text-green-700 mt-1">Правильный ответ: {question.correct_answer}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button onClick={restartQuiz} variant="outline">
                Пройти тест заново
              </Button>
              <Button onClick={() => setCurrentSection('analytics')}>
                Перейти к аналитике
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Если тест не начат - показываем стартовую страницу
    if (!quizStarted) {
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
                {currentLesson.quiz.questions.length}
            </div>
            <p className="text-gray-600">вопросов для проверки</p>
            <p className="text-sm text-gray-500 mt-1">
                Проходной балл: {currentLesson.quiz.passing_score || 70}%
            </p>
          </div>

          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              Тест поможет вам закрепить полученные знания и получить персональные рекомендации.
            </AlertDescription>
          </Alert>

          <div className="text-center">
              <Button size="lg" className="px-8 py-3" onClick={startQuiz}>
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
    }

    // Прохождение теста - показываем текущий вопрос
    const currentQuestion = currentLesson.quiz.questions[currentQuestionIndex];
    const totalQuestions = currentLesson.quiz.questions.length;
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    const allQuestionsAnswered = currentLesson.quiz.questions.every(q => quizAnswers[q.id]);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="w-5 h-5 text-red-600" />
              Вопрос {currentQuestionIndex + 1} из {totalQuestions}
            </span>
            <Badge variant="outline">
              {Object.keys(quizAnswers).length} / {totalQuestions} отвечено
            </Badge>
          </CardTitle>
          <Progress value={progress} className="mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              {currentQuestion.question}
            </h3>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = quizAnswers[currentQuestion.id] === option;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleQuizAnswer(currentQuestion.id, option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-100'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <span className="font-medium">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={previousQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Предыдущий
            </Button>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <Button
                onClick={submitQuiz}
                disabled={!allQuestionsAnswered}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                Завершить тест
                <CheckCircle className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={nextQuestion}
                className="flex items-center gap-2"
              >
                Следующий
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {!allQuestionsAnswered && currentQuestionIndex === totalQuestions - 1 && (
            <Alert>
              <AlertDescription>
                Ответьте на все вопросы перед завершением теста.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Файлы для теста */}
          {renderFilesSection('quiz')}
        </CardContent>
      </Card>
    );
  };

  const renderAnalyticsSection = () => {
    // Подсчет статистики по текущему уроку
    const totalExercises = currentLesson.exercises?.length || 0;
    const completedExercises = Object.keys(exerciseResponses).filter(id => exerciseResponses[id]).length;
    const exerciseProgress = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

    const hasChallenge = currentLesson.challenge && currentLesson.challenge.days?.length > 0;
    const challengeDays = currentLesson.challenge?.days?.length || 0;
    const completedChallengeDays = challengeProgress?.completed_days?.length || 0;
    const challengeProgressPercent = challengeDays > 0 ? Math.round((completedChallengeDays / challengeDays) * 100) : 0;

    const hasQuiz = currentLesson.quiz && currentLesson.quiz.questions?.length > 0;
    const quizPassed = quizCompleted && quizScore >= (currentLesson.quiz?.passing_score || 70);

    const overallProgress = lessonProgress?.completion_percentage || 0;

    // Подсчет комментариев от преподавателя
    const reviewedExercises = Object.values(exerciseResponsesData).filter(r => r?.reviewed && r?.admin_comment).length;
    
    // Проверка загрузки данных
    const isLoadingStats = !studentFilesStats && lessonFiles.theory.length === 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Ваш прогресс по уроку
          </CardTitle>
          <CardDescription>
            Детальная статистика вашего обучения
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Индикатор загрузки */}
          {isLoadingStats && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-blue-700 font-medium">Загрузка статистики...</p>
              </div>
            </div>
          )}
          {/* Общий прогресс */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-indigo-900 text-lg">Общий прогресс урока</h4>
              <div className="text-3xl font-bold text-indigo-600">{overallProgress}%</div>
            </div>
            <Progress value={overallProgress} className="h-3" />
            <p className="text-sm text-indigo-700 mt-2">
              {overallProgress === 100 ? '🎉 Урок полностью завершен!' : 
               overallProgress >= 75 ? 'Отличная работа! Вы почти у цели!' :
               overallProgress >= 50 ? 'Хороший прогресс! Продолжайте в том же духе!' :
               overallProgress >= 25 ? 'Вы на правильном пути!' :
               'Начните с изучения теории и выполнения упражнений'}
            </p>
          </div>

          {/* Общие заработанные баллы */}
          <div className="bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 rounded-lg p-6 border-2 border-yellow-300 shadow-lg">
            <h4 className="font-semibold text-yellow-900 text-lg mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-600" />
              Заработанные баллы
              </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Баллы за челленджи */}
              {challengeHistory.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    <p className="text-sm font-medium text-gray-700">Челленджи</p>
            </div>
                  <p className="text-3xl font-bold text-orange-600">
                    {challengeHistory.reduce((sum, a) => sum + (a.points_earned || 0), 0)} 🌟
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {challengeHistory.filter(a => a.is_completed).length} завершено
                  </p>
                </div>
              )}
              
              {/* Баллы за тесты */}
              {quizHistory.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <p className="text-sm font-medium text-gray-700">Тесты</p>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">
                    {quizHistory.reduce((sum, a) => sum + (a.points_earned || 0), 0)} 🎯
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {quizHistory.filter(a => a.passed).length} пройдено
                  </p>
                </div>
              )}
              
              {/* Баллы за время активности */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-medium text-gray-700">Активность</p>
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  {timeActivity.total_points} ⏱️
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {timeActivity.total_minutes} минут
                </p>
              </div>
              
              {/* Баллы за видео */}
              {studentFilesStats && studentFilesStats.summary.total_video_points > 0 && (
                <div className="bg-white rounded-lg p-4 border border-pink-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-pink-600" />
                    <p className="text-sm font-medium text-gray-700">Видео</p>
                  </div>
                  <p className="text-3xl font-bold text-pink-600">
                    {studentFilesStats.summary.total_video_points} 🎬
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {studentFilesStats.summary.total_video_minutes} минут
                  </p>
                </div>
              )}
              
              {/* Общая сумма */}
              <div className="bg-gradient-to-br from-yellow-400 to-orange-400 rounded-lg p-4 border-2 border-yellow-500 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5" />
                  <p className="text-sm font-medium">Всего</p>
                </div>
                <p className="text-4xl font-bold">
                  {(challengeHistory.reduce((sum, a) => sum + (a.points_earned || 0), 0) +
                    quizHistory.reduce((sum, a) => sum + (a.points_earned || 0), 0) +
                    timeActivity.total_points +
                    (studentFilesStats?.summary.total_video_points || 0))} ⭐
                </p>
                <p className="text-xs mt-1 opacity-90">
                  Общий результат
                </p>
              </div>
            </div>
          </div>

          {/* Статистика по разделам */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Упражнения */}
            <div className="bg-green-50 rounded-lg p-5 border border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Brain className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h5 className="font-semibold text-green-900">Упражнения</h5>
                  <p className="text-sm text-green-700">{completedExercises} из {totalExercises}</p>
                </div>
              </div>
              <Progress value={exerciseProgress} className="h-2 mb-2" />
              <p className="text-xs text-green-600">{exerciseProgress}% выполнено</p>
              {reviewedExercises > 0 && (
                <p className="text-xs text-green-700 mt-2">
                  ✓ {reviewedExercises} ответов проверено преподавателем
                </p>
              )}
            </div>

            {/* Челлендж */}
            {hasChallenge && (
              <div className="bg-orange-50 rounded-lg p-5 border border-orange-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-orange-900">Челлендж</h5>
                    <p className="text-sm text-orange-700">{completedChallengeDays} из {challengeDays} дней</p>
                  </div>
                  {/* Баллы за челлендж */}
                  {challengeHistory.length > 0 && (
                    <div className="text-right">
                      <p className="text-xl font-bold text-orange-600">
                        {challengeHistory.reduce((sum, a) => sum + (a.points_earned || 0), 0)} 🌟
                      </p>
                      <p className="text-xs text-orange-600">баллов</p>
                    </div>
                  )}
                </div>
                <Progress value={challengeProgressPercent} className="h-2 mb-2" />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-orange-600">{challengeProgressPercent}% выполнено</p>
                  {challengeHistory.length > 0 && (
                    <p className="text-xs text-orange-700">
                      Попыток: {challengeHistory.length}
                    </p>
                  )}
                </div>
                {challengeProgress?.is_completed && (
                  <p className="text-xs text-green-700 mt-2 font-semibold">
                    ✅ Челлендж завершен!
                  </p>
                )}
                {!challengeProgress?.is_completed && challengeHistory.filter(a => a.is_completed).length > 0 && (
                  <p className="text-xs text-orange-700 mt-2">
                    ✓ Завершено попыток: {challengeHistory.filter(a => a.is_completed).length}
                  </p>
                )}
              </div>
            )}

            {/* Тест */}
            {hasQuiz && (
              <div className={`rounded-lg p-5 border ${quizPassed ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${quizPassed ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Target className={`w-6 h-6 ${quizPassed ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h5 className={`font-semibold ${quizPassed ? 'text-blue-900' : 'text-gray-900'}`}>Тест</h5>
                    <p className={`text-sm ${quizPassed ? 'text-blue-700' : 'text-gray-700'}`}>
                      {quizCompleted ? `${quizScore}%` : 'Не пройден'}
                    </p>
                  </div>
                </div>
                {quizCompleted ? (
                  <>
                    <Progress value={quizScore} className="h-2 mb-2" />
                    <p className={`text-xs ${quizPassed ? 'text-blue-600' : 'text-red-600'}`}>
                      {quizPassed ? '✓ Тест пройден успешно!' : '✗ Тест не пройден'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-600">Перейдите к разделу "Тест"</p>
                )}
              </div>
            )}
          </div>

          {/* Комментарии преподавателя */}
          {reviewedExercises > 0 && (
            <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5" />
                Обратная связь от преподавателя
              </h4>
              <div className="space-y-3">
                {Object.entries(exerciseResponsesData).map(([exerciseId, data]) => {
                  if (!data?.reviewed || !data?.admin_comment) return null;
                  
                  const exercise = currentLesson.exercises?.find(e => e.id === exerciseId);
                  if (!exercise) return null;

                  return (
                    <div key={exerciseId} className="bg-white rounded-lg p-4 border border-purple-200">
                      <p className="text-sm font-medium text-purple-900 mb-2">
                        {exercise.title}
                      </p>
                      <p className="text-sm text-purple-800 whitespace-pre-wrap">
                        {data.admin_comment}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">
                        {new Date(data.reviewed_at).toLocaleString('ru-RU')}
                      </p>
            </div>
                  );
                })}
          </div>
            </div>
          )}

          {/* Достижения */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-6 border border-yellow-200">
            <h4 className="font-semibold text-yellow-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Ваши достижения
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {completedExercises > 0 && (
                <div className="text-center">
                  <div className="text-3xl mb-2">✍️</div>
                  <p className="text-sm font-medium text-yellow-900">Практик</p>
                  <p className="text-xs text-yellow-700">{completedExercises} упражнений</p>
                </div>
              )}
              {completedChallengeDays > 0 && (
                <div className="text-center">
                  <div className="text-3xl mb-2">🔥</div>
                  <p className="text-sm font-medium text-yellow-900">Целеустремленный</p>
                  <p className="text-xs text-yellow-700">{completedChallengeDays} дней челленджа</p>
                </div>
              )}
              {quizPassed && (
                <div className="text-center">
                  <div className="text-3xl mb-2">🎓</div>
                  <p className="text-sm font-medium text-yellow-900">Знаток</p>
                  <p className="text-xs text-yellow-700">Тест пройден на {quizScore}%</p>
                </div>
              )}
              {overallProgress === 100 && (
                <div className="text-center">
                  <div className="text-3xl mb-2">🏆</div>
                  <p className="text-sm font-medium text-yellow-900">Мастер</p>
                  <p className="text-xs text-yellow-700">Урок завершен на 100%</p>
                </div>
              )}
            </div>
          </div>

          {/* История прохождения челленджа */}
          {hasChallenge && challengeHistory.length > 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-6 border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                История прохождения челленджа
            </h4>
              <div className="space-y-3">
                {challengeHistory.map((attempt, index) => (
                  <div 
                    key={index} 
                    className={`bg-white rounded-lg p-4 border-2 ${
                      attempt.is_completed 
                        ? 'border-green-300' 
                        : 'border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          attempt.is_completed 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          #{attempt.attempt_number}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Попытка {attempt.attempt_number}
                            {attempt.is_completed && ' ✓'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(attempt.started_at).toLocaleDateString('ru-RU')}
                            {attempt.completed_at && ` - ${new Date(attempt.completed_at).toLocaleDateString('ru-RU')}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-yellow-600">
                          {attempt.points_earned} 🌟
                        </p>
                        <p className="text-xs text-gray-600">
                          {attempt.completed_days?.length || 0} / {challengeDays} дней
              </p>
            </div>
          </div>

                    {/* Прогресс-бар */}
                    <div className="mb-3">
                      <Progress 
                        value={(attempt.completed_days?.length || 0) / challengeDays * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    {/* Заметки */}
                    {attempt.daily_notes && attempt.daily_notes.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-700">Заметки:</p>
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                          {attempt.daily_notes.slice(0, 3).map((note, noteIndex) => (
                            <div key={noteIndex} className="bg-gray-50 rounded p-2">
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">День {note.day}:</span> {note.note.substring(0, 100)}
                                {note.note.length > 100 && '...'}
                              </p>
                            </div>
                          ))}
                          {attempt.daily_notes.length > 3 && (
                            <p className="text-xs text-gray-500 text-center">
                              +{attempt.daily_notes.length - 3} заметок
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Статус */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {attempt.is_completed ? (
                        <p className="text-sm text-green-700 font-medium">
                          🎉 Челлендж завершен! Заработано {attempt.points_earned} баллов
                        </p>
                      ) : (
                        <p className="text-sm text-orange-700 font-medium">
                          ⏳ В процессе выполнения
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Общая статистика */}
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-4 mt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-orange-700">
                        {challengeHistory.length}
                      </p>
                      <p className="text-xs text-orange-600">Попыток</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-700">
                        {challengeHistory.filter(a => a.is_completed).length}
                      </p>
                      <p className="text-xs text-green-600">Завершено</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-700">
                        {challengeHistory.reduce((sum, a) => sum + (a.points_earned || 0), 0)} 🌟
                      </p>
                      <p className="text-xs text-yellow-600">Всего баллов</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* История прохождения тестов */}
          {hasQuiz && quizHistory.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                История прохождения тестов
            </h4>
              <div className="space-y-3">
                {quizHistory.map((attempt, index) => (
                  <div 
                    key={index} 
                    className={`bg-white rounded-lg p-4 border-2 ${
                      attempt.passed 
                        ? 'border-green-300' 
                        : 'border-red-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          attempt.passed 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Попытка {index + 1}
                            {attempt.passed && ' ✓'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(attempt.attempted_at).toLocaleString('ru-RU')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">
                          {attempt.points_earned || 0} 🎯
                        </p>
                        <p className="text-xs text-gray-600">
                          {attempt.score}%
                        </p>
            </div>
          </div>
                    
                    {/* Прогресс-бар */}
                    <div className="mb-3">
                      <Progress 
                        value={attempt.score} 
                        className={`h-2 ${attempt.passed ? 'bg-green-200' : 'bg-red-200'}`}
                      />
                    </div>
                    
                    {/* Статус */}
                    <div className="pt-3 border-t border-gray-200">
                      {attempt.passed ? (
                        <p className="text-sm text-green-700 font-medium">
                          ✅ Тест пройден! Заработано {attempt.points_earned || 0} баллов
                        </p>
                      ) : (
                        <p className="text-sm text-red-700 font-medium">
                          ❌ Тест не пройден. Заработано {attempt.points_earned || 0} баллов
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Общая статистика по тестам */}
                <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg p-4 mt-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-purple-700">
                        {quizHistory.length}
                      </p>
                      <p className="text-xs text-purple-600">Попыток</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-700">
                        {quizHistory.filter(a => a.passed).length}
                      </p>
                      <p className="text-xs text-green-600">Пройдено</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-indigo-700">
                        {Math.max(...quizHistory.map(a => a.score))}%
                      </p>
                      <p className="text-xs text-indigo-600">Лучший результат</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-700">
                        {quizHistory.reduce((sum, a) => sum + (a.points_earned || 0), 0)} 🎯
                      </p>
                      <p className="text-xs text-purple-600">Всего баллов</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Рекомендации */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Что делать дальше?
            </h4>
            <div className="space-y-3 text-sm text-blue-800">
              {completedExercises < totalExercises && (
                <p>• Завершите оставшиеся упражнения ({totalExercises - completedExercises} из {totalExercises})</p>
              )}
              {hasChallenge && completedChallengeDays < challengeDays && (
                <p>• Продолжите челлендж (осталось {challengeDays - completedChallengeDays} дней)</p>
              )}
              {hasQuiz && !quizCompleted && (
                <p>• Пройдите тест для проверки знаний</p>
              )}
              {hasQuiz && quizCompleted && !quizPassed && (
                <p>• Повторите материал и пройдите тест заново</p>
              )}
              {overallProgress === 100 && (
                <p>• 🎉 Отличная работа! Переходите к следующему уроку</p>
              )}
              {overallProgress < 100 && overallProgress >= 75 && (
                <p>• Вы почти у цели! Завершите оставшиеся задания</p>
              )}
            </div>
          </div>

          {/* Статистика файлов */}
          {studentFilesStats && studentFilesStats.summary.total_files > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 text-lg mb-4 flex items-center gap-2">
                <Upload className="w-6 h-6 text-blue-600" />
                Статистика работы с файлами
              </h4>
              
              {/* Общая статистика */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border border-blue-200 text-center">
                  <p className="text-3xl font-bold text-blue-600">{studentFilesStats.summary.total_files}</p>
                  <p className="text-sm text-gray-600 mt-1">Всего файлов</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200 text-center">
                  <p className="text-3xl font-bold text-green-600">{studentFilesStats.summary.total_views}</p>
                  <p className="text-sm text-gray-600 mt-1">Просмотров</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-purple-200 text-center">
                  <p className="text-3xl font-bold text-purple-600">{studentFilesStats.summary.total_downloads}</p>
                  <p className="text-sm text-gray-600 mt-1">Скачиваний</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-yellow-200 text-center">
                  <p className="text-3xl font-bold text-yellow-600">{studentFilesStats.summary.total_video_points} 🎬</p>
                  <p className="text-sm text-gray-600 mt-1">Баллов за видео</p>
                </div>
              </div>
              
              {/* Детальная статистика по файлам */}
              {studentFilesStats.files.length > 0 && (
                <div className="space-y-4">
                  <h5 className="font-medium text-gray-700">Материалы урока:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {studentFilesStats.files.map((file) => {
                      const baseFile = lessonFileMap[file.file_id];
                        const fallbackFile = baseFile || {
                          id: file.file_id,
                          original_name: file.file_name,
                          mime_type: file.mime_type || '',
                          extension: file.file_name?.split('.').pop() || '',
                          file_size: 0
                        };
                      const fileStyle = getFileStyle(fallbackFile);
                      const canOpen = Boolean(baseFile);

                      return (
                        <div
                          key={file.file_id}
                          className="bg-white rounded-lg p-4 border-2 shadow-sm flex flex-col gap-3"
                          style={{ borderColor: fileStyle.color }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="p-2 rounded-lg flex-shrink-0"
                              style={{ backgroundColor: fileStyle.bgColor }}
                            >
                              {fileStyle.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{file.file_name}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                                <span>Раздел: {file.section || '—'}</span>
                                <span>Просмотров: {file.views}</span>
                                <span>Скачиваний: {file.downloads}</span>
                                {file.video_stats && (
                                  <span className="text-purple-600">
                                    🎬 {file.video_stats.minutes_watched} мин • {file.video_stats.points_earned} баллов
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => baseFile && handleViewFile(baseFile)}
                              disabled={!canOpen}
                              className="flex-1 text-white"
                              style={{
                                backgroundColor: canOpen ? fileStyle.color : '#CBD5F5',
                                borderColor: canOpen ? fileStyle.color : '#CBD5F5'
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Просмотр
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => baseFile && handleDownloadFile(baseFile)}
                              disabled={!canOpen}
                              className="flex-1"
                              style={{
                                borderColor: fileStyle.color,
                                color: canOpen ? fileStyle.color : '#9CA3AF'
                              }}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Скачать
                            </Button>
                          </div>

                          {!canOpen && (
                            <p className="text-xs text-gray-500">
                              * Файл недоступен для просмотра. Обратитесь к администратору.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

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

          {/* Дашборд студента */}
          {dashboardStats ? (
            <div className="mb-8 space-y-6">
              {/* Hero Section - Уровень и прогресс */}
              <Card className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white border-0 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24"></div>
                <CardContent className="pt-8 pb-8 relative z-10">
                  <div className="text-center">
                    <div className="text-6xl mb-4">{['🌱', '📚', '🎓', '⭐', '👑'][dashboardStats.level - 1] || '🌱'}</div>
                    <h2 className="text-3xl font-bold mb-2">Уровень {dashboardStats.level} - {dashboardStats.level_name}</h2>
                    <p className="text-xl text-white/90 mb-6">{dashboardStats.total_points} баллов</p>
                    <div className="max-w-md mx-auto">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Прогресс до следующего уровня</span>
                        <span>{dashboardStats.progress_to_next_level}%</span>
                      </div>
                      <Progress value={dashboardStats.progress_to_next_level} className="h-3 bg-white/20" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Уроки */}
                <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {dashboardStats.completed_lessons}/{dashboardStats.total_lessons}
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{dashboardStats.completed_lessons}</h3>
                    <p className="text-sm text-gray-600">Уроков завершено</p>
                    <Progress value={(dashboardStats.completed_lessons / dashboardStats.total_lessons) * 100} className="mt-3 h-2" />
                  </CardContent>
                </Card>

                {/* Челленджи */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Zap className="w-6 h-6 text-purple-600" />
                      </div>
                      <Badge variant="outline" className="text-xs bg-purple-50">
                        {dashboardStats.total_challenge_points} баллов
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{dashboardStats.total_challenge_attempts}</h3>
                    <p className="text-sm text-gray-600">Челленджей пройдено</p>
                  </CardContent>
                </Card>

                {/* Тесты */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Target className="w-6 h-6 text-green-600" />
                      </div>
                      <Badge variant="outline" className="text-xs bg-green-50">
                        {dashboardStats.total_quiz_points} баллов
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{dashboardStats.total_quiz_attempts}</h3>
                    <p className="text-sm text-gray-600">Тестов пройдено</p>
                  </CardContent>
                </Card>

                {/* Упражнения */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <Brain className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{dashboardStats.total_exercises_completed}</h3>
                    <p className="text-sm text-gray-600">Упражнений выполнено</p>
                  </CardContent>
                </Card>
              </div>

              {/* Разбивка баллов */}
              {dashboardStats.points_breakdown && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Разбивка баллов
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Челленджи */}
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-5 h-5 text-purple-600" />
                          <p className="text-sm font-medium text-gray-700">Челленджи</p>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">
                          {dashboardStats.points_breakdown.challenges || 0}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">баллов</p>
                      </div>

                      {/* Тесты */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-5 h-5 text-green-600" />
                          <p className="text-sm font-medium text-gray-700">Тесты</p>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {dashboardStats.points_breakdown.quizzes || 0}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">баллов</p>
                      </div>

                      {/* Время */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-blue-600" />
                          <p className="text-sm font-medium text-gray-700">Время</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {dashboardStats.points_breakdown.time || 0}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">баллов</p>
                        <p className="text-xs text-gray-500">
                          {dashboardStats.points_breakdown.time_minutes || 0} минут
                        </p>
                      </div>

                      {/* Видео */}
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-5 h-5 text-orange-600" />
                          <p className="text-sm font-medium text-gray-700">Видео</p>
                        </div>
                        <p className="text-2xl font-bold text-orange-600">
                          {dashboardStats.points_breakdown.videos || 0}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">баллов</p>
                        <p className="text-xs text-gray-500">
                          {dashboardStats.points_breakdown.video_minutes || 0} минут просмотра
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Достижения (компактная версия) */}
              {dashboardStats.achievements && dashboardStats.achievements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                      Достижения
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {dashboardStats.achievements.filter(a => a.earned).slice(0, 6).map((achievement) => (
                        <div
                          key={achievement.id}
                          className="flex items-center gap-2 bg-gradient-to-br from-yellow-50 to-orange-50 px-4 py-2 rounded-lg border border-yellow-200"
                        >
                          <span className="text-2xl">{achievement.icon}</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{achievement.title}</p>
                            <p className="text-xs text-gray-600">{achievement.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="mb-8">
              <CardContent className="pt-6 pb-6">
              <div className="text-center">
                  <div className="animate-pulse flex flex-col items-center gap-3">
                    <BarChart3 className="w-12 h-12 text-blue-600" />
                    <p className="text-gray-600">Загрузка статистики...</p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

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
      
      {/* Модальное окно просмотра файлов */}
      {fileViewerOpen && viewingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div 
            className={`bg-white rounded-lg flex flex-col shadow-2xl transition-all ${
              isFullscreen 
                ? 'w-full h-full max-w-full max-h-full' 
                : 'max-w-6xl w-full h-[95vh]'
            }`}
          >
            {/* Заголовок */}
            <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const fileStyle = getFileStyle(viewingFile);
                    return (
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: fileStyle.bgColor }}
                      >
                        {fileStyle.icon}
                      </div>
                    );
                  })()}
                  <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      Просмотр файла
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {viewingFile.original_name} • {(viewingFile.file_size / 1024 / 1024).toFixed(2)} МБ
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="text-gray-500 hover:text-gray-700"
                    title={isFullscreen ? "Свернуть" : "Развернуть на весь экран"}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-5 h-5" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseFileViewer}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Содержимое */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              {/* Изображения */}
              {viewingFile.mime_type?.startsWith('image/') && (
                <div className="flex items-center justify-center h-full">
                  <div 
                    className="relative"
                    style={{ transform: `rotate(${imageRotation}deg)`, transition: 'transform 0.3s ease' }}
                  >
                    <img
                      src={`${backendUrl}/uploads/learning_v2/${viewingFile.stored_name}`}
                      alt={viewingFile.original_name}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                  </div>
                </div>
              )}

              {/* Видео */}
              {viewingFile.mime_type?.startsWith('video/') && (
                <div className="flex items-center justify-center h-full">
                  <video
                    controls
                    className="max-w-full max-h-full rounded-lg shadow-lg"
                    src={`${backendUrl}/uploads/learning_v2/${viewingFile.stored_name}`}
                  >
                    Ваш браузер не поддерживает воспроизведение видео.
                  </video>
                </div>
              )}

              {/* PDF */}
              {viewingFile.extension === 'pdf' && (
                <iframe
                  src={`${backendUrl}/uploads/learning_v2/${viewingFile.stored_name}`}
                  className="w-full h-full rounded-lg shadow-lg"
                  title={viewingFile.original_name}
                />
              )}

              {/* Текстовые файлы */}
              {viewingFile.mime_type?.startsWith('text/') && (
                <div className="bg-white p-6 rounded-lg shadow-lg h-full overflow-auto">
                  <iframe
                    src={`${backendUrl}/uploads/learning_v2/${viewingFile.stored_name}`}
                    className="w-full h-full border-0"
                    title={viewingFile.original_name}
                  />
                </div>
              )}

              {/* Документы Word, Excel */}
              {(viewingFile.extension === 'doc' || 
                viewingFile.extension === 'docx' || 
                viewingFile.extension === 'xls' || 
                viewingFile.extension === 'xlsx') && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <FileText className="w-24 h-24 text-gray-400" />
                  <p className="text-lg font-semibold text-gray-700">
                    Просмотр {viewingFile.extension.toUpperCase()} файлов в браузере не поддерживается
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Скачайте файл для просмотра
                  </p>
                  <Button
                    onClick={() => handleDownloadFile(viewingFile)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Скачать файл
                  </Button>
                </div>
              )}
            </div>

            {/* Футер */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-2 justify-between items-center">
              {/* Кнопки поворота (только для изображений) */}
              {viewingFile.mime_type?.startsWith('image/') && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setImageRotation((prev) => (prev - 90) % 360)}
                    title="Повернуть влево"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Повернуть влево
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                    title="Повернуть вправо"
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Повернуть вправо
                  </Button>
                </div>
              )}
              
              {/* Основные кнопки */}
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  onClick={handleCloseFileViewer}
                >
                  <X className="w-4 h-4 mr-2" />
                  Закрыть
                </Button>
                <Button
                  onClick={() => handleDownloadFile(viewingFile)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Скачать
                </Button>
                <Button
                  onClick={() => {
                    window.open(`${backendUrl}/uploads/learning_v2/${viewingFile.stored_name}`, '_blank');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Открыть в новой вкладке
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningSystemV2;
