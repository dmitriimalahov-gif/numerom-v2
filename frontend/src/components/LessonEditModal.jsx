import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Edit, Save, X, Plus, Trash2, BookOpen, Brain, Users, FileText, BarChart3, Upload, Calendar, Eye, Download, ExternalLink } from 'lucide-react';

const LessonEditModal = ({ 
  lesson, 
  isOpen, 
  onClose, 
  onSave,
  isSaving 
}) => {
  const [editedLesson, setEditedLesson] = useState(lesson || {});
  const [activeTab, setActiveTab] = useState('general');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [studentResponses, setStudentResponses] = useState([]);
  const [challengeNotes, setChallengeNotes] = useState([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [reviewingResponse, setReviewingResponse] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [filesAnalytics, setFilesAnalytics] = useState(null);
  
  // Состояния для загрузки файлов
  const [theoryMediaFiles, setTheoryMediaFiles] = useState([]);
  const [theoryDocuments, setTheoryDocuments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Состояния для модальных окон просмотра
  const [viewingFile, setViewingFile] = useState(null);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  
  // Состояния для трекинга видео
  const [videoWatchStartTime, setVideoWatchStartTime] = useState(null);
  const [videoWatchInterval, setVideoWatchInterval] = useState(null);

  // Синхронизация с пропсом lesson при его изменении
  useEffect(() => {
    if (lesson) {
      setEditedLesson(lesson);
      setActiveTab('general'); // Сбрасываем на первую вкладку при открытии нового урока
    }
  }, [lesson, isOpen]);

  // Загрузка аналитики при переключении на вкладку
  useEffect(() => {
    if (activeTab === 'analytics' && lesson?.id) {
      loadAnalytics();
    }
  }, [activeTab, lesson?.id]);

  const loadAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      
      // Загружаем статистику урока
      const analyticsResponse = await fetch(
        `http://localhost:8000/api/admin/analytics/lesson/${lesson.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (analyticsResponse.ok) {
        const data = await analyticsResponse.json();
        setAnalyticsData(data);
      }
      
      // Загружаем ответы студентов
      const responsesResponse = await fetch(
        `http://localhost:8000/api/admin/analytics/student-responses/${lesson.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (responsesResponse.ok) {
        const data = await responsesResponse.json();
        setStudentResponses(data.responses || []);
      }
      
      // Загружаем заметки челленджа
      const notesResponse = await fetch(
        `http://localhost:8000/api/admin/analytics/challenge-notes/${lesson.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (notesResponse.ok) {
        const data = await notesResponse.json();
        setChallengeNotes(data.notes || []);
      }
      
      // Загружаем аналитику файлов
      const filesResponse = await fetch(
        `http://localhost:8000/api/admin/lesson-files-analytics/${lesson.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (filesResponse.ok) {
        const data = await filesResponse.json();
        setFilesAnalytics(data);
      }
      
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleReviewResponse = async (responseId) => {
    if (!adminComment.trim()) {
      alert('Введите комментарий');
      return;
    }
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/admin/review-response/${responseId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ admin_comment: adminComment })
        }
      );
      
      if (response.ok) {
        // Обновляем локальное состояние
        setStudentResponses(prev => prev.map(r => 
          r.id === responseId 
            ? { ...r, reviewed: true, admin_comment: adminComment }
            : r
        ));
        setReviewingResponse(null);
        setAdminComment('');
        alert('Комментарий добавлен');
      } else {
        alert('Ошибка при добавлении комментария');
      }
    } catch (error) {
      console.error('Error reviewing response:', error);
      alert('Ошибка при добавлении комментария');
    }
  };

  // ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ФАЙЛАМИ =====
  
  // Загрузка списка файлов для раздела
  const loadFiles = async (section) => {
    if (!lesson?.id) return;
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/admin/files?lesson_id=${lesson.id}&section=${section}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Разделяем файлы на медиа и документы
        const mediaFiles = data.files.filter(f => f.file_type === 'media');
        const documents = data.files.filter(f => f.file_type === 'document');
        
        // Обновляем состояние в зависимости от раздела
        if (section === 'theory') {
          setTheoryMediaFiles(mediaFiles);
          setTheoryDocuments(documents);
        }
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };
  
  // Загрузка файла
  const handleFileUpload = async (event, section, fileType) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingFile(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Создаем FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('lesson_id', lesson.id);
        formData.append('section', section);
        formData.append('file_type', fileType);
        
        const response = await fetch(
          'http://localhost:8000/api/admin/upload-file',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          }
        );
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Ошибка загрузки файла');
        }
      }
      
      // Перезагружаем список файлов
      await loadFiles(section);
      alert(`Успешно загружено файлов: ${files.length}`);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Ошибка загрузки: ${error.message}`);
    } finally {
      setUploadingFile(false);
      event.target.value = ''; // Сбрасываем input
    }
  };
  
  // Удаление файла
  const handleFileDelete = async (fileId, section) => {
    if (!window.confirm('Удалить этот файл?')) return;
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/admin/files/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        // Перезагружаем список файлов
        await loadFiles(section);
        alert('Файл удален');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Ошибка при удалении файла');
    }
  };
  
  // Загрузка файлов при открытии вкладки теории
  useEffect(() => {
    if (activeTab === 'theory' && lesson?.id) {
      loadFiles('theory');
    }
  }, [activeTab, lesson?.id]);

  // Функция для открытия просмотра файла
  const handleViewFile = async (file) => {
    setViewingFile(file);
    setFileViewerOpen(true);
    
    // Отправляем событие просмотра
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:8000/api/student/file-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          file_id: file.id,
          lesson_id: lesson.id,
          action: 'view'
        })
      });
    } catch (error) {
      console.error('Error tracking file view:', error);
    }
  };

  // Функция для закрытия просмотра файла
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
    setVideoWatchStartTime(null);
  };
  
  // Функция для отправки времени просмотра видео
  const sendVideoWatchTime = async (fileId, minutesWatched) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:8000/api/student/video-watch-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          file_id: fileId,
          lesson_id: lesson.id,
          minutes_watched: minutesWatched
        })
      });
    } catch (error) {
      console.error('Error tracking video watch time:', error);
    }
  };
  
  // useEffect для трекинга видео
  useEffect(() => {
    if (fileViewerOpen && viewingFile?.mime_type?.startsWith('video/')) {
      // Начинаем трекинг
      setVideoWatchStartTime(Date.now());
      
      // Отправляем данные каждую минуту
      const interval = setInterval(() => {
        sendVideoWatchTime(viewingFile.id, 1);
      }, 60000); // 60000 мс = 1 минута
      
      setVideoWatchInterval(interval);
      
      // Очистка при размонтировании
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [fileViewerOpen, viewingFile]);

  // Функция для скачивания файла
  const handleDownloadFile = async (file) => {
    try {
      const token = localStorage.getItem('token');
      
      // Отправляем событие скачивания
      try {
        await fetch('http://localhost:8000/api/student/file-analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            file_id: file.id,
            lesson_id: lesson.id,
            action: 'download'
          })
        });
      } catch (analyticsError) {
        console.error('Error tracking file download:', analyticsError);
      }
      
      // Скачиваем файл
      const response = await fetch(`http://localhost:8000/api/download-file/${file.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка при скачивании файла');
      }

      // Получаем blob из ответа
      const blob = await response.blob();
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Освобождаем память
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Ошибка при скачивании файла');
    }
  };

  const handleFieldChange = (field, value) => {
    setEditedLesson(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTheoryChange = (index, field, value) => {
    const newTheory = [...(editedLesson.theory || [])];
    newTheory[index] = {
      ...newTheory[index],
      [field]: value
    };
    setEditedLesson(prev => ({
      ...prev,
      theory: newTheory
    }));
  };

  const addTheoryBlock = () => {
    const newTheory = [...(editedLesson.theory || [])];
    newTheory.push({
      id: `theory_${Date.now()}`,
      title: '',
      content: '',
      order: newTheory.length
    });
    setEditedLesson(prev => ({
      ...prev,
      theory: newTheory
    }));
  };

  const removeTheoryBlock = (index) => {
    const newTheory = editedLesson.theory.filter((_, i) => i !== index);
    setEditedLesson(prev => ({
      ...prev,
      theory: newTheory
    }));
  };

  const handleExerciseChange = (index, field, value) => {
    const newExercises = [...(editedLesson.exercises || [])];
    newExercises[index] = {
      ...newExercises[index],
      [field]: value
    };
    setEditedLesson(prev => ({
      ...prev,
      exercises: newExercises
    }));
  };

  const addExercise = () => {
    const newExercises = [...(editedLesson.exercises || [])];
    newExercises.push({
      id: `exercise_${Date.now()}`,
      title: '',
      description: '',
      type: 'reflection',
      instructions: '',
      expected_outcome: '',
      order: newExercises.length
    });
    setEditedLesson(prev => ({
      ...prev,
      exercises: newExercises
    }));
  };

  const removeExercise = (index) => {
    const newExercises = editedLesson.exercises.filter((_, i) => i !== index);
    setEditedLesson(prev => ({
      ...prev,
      exercises: newExercises
    }));
  };

  const handleChallengeChange = (field, value) => {
    setEditedLesson(prev => ({
      ...prev,
      challenge: {
        ...prev.challenge,
        [field]: value
      }
    }));
  };

  const handleChallengeDayChange = (dayIndex, field, value) => {
    const newDays = [...(editedLesson.challenge?.daily_tasks || [])];
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      [field]: value
    };
    setEditedLesson(prev => ({
      ...prev,
      challenge: {
        ...prev.challenge,
        daily_tasks: newDays
      }
    }));
  };

  const handleChallengeDayTaskChange = (dayIndex, taskIndex, value) => {
    const newDays = [...(editedLesson.challenge?.daily_tasks || [])];
    const newTasks = [...(newDays[dayIndex].tasks || [])];
    newTasks[taskIndex] = value;
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      tasks: newTasks
    };
    setEditedLesson(prev => ({
      ...prev,
      challenge: {
        ...prev.challenge,
        daily_tasks: newDays
      }
    }));
  };

  const addChallengeDayTask = (dayIndex) => {
    const newDays = [...(editedLesson.challenge?.daily_tasks || [])];
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      tasks: [...(newDays[dayIndex].tasks || []), '']
    };
    setEditedLesson(prev => ({
      ...prev,
      challenge: {
        ...prev.challenge,
        daily_tasks: newDays
      }
    }));
  };

  const removeChallengeDayTask = (dayIndex, taskIndex) => {
    const newDays = [...(editedLesson.challenge?.daily_tasks || [])];
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      tasks: newDays[dayIndex].tasks.filter((_, i) => i !== taskIndex)
    };
    setEditedLesson(prev => ({
      ...prev,
      challenge: {
        ...prev.challenge,
        daily_tasks: newDays
      }
    }));
  };

  const addChallengeDay = () => {
    const currentDays = editedLesson.challenge?.daily_tasks || [];
    const newDay = {
      day: currentDays.length + 1,
      title: '',
      description: '',
      tasks: [''],
      completed: false
    };
    setEditedLesson(prev => ({
      ...prev,
      challenge: {
        ...prev.challenge,
        duration_days: currentDays.length + 1,
        daily_tasks: [...currentDays, newDay]
      }
    }));
  };

  const removeChallengeDay = (dayIndex) => {
    const newDays = editedLesson.challenge.daily_tasks
      .filter((_, i) => i !== dayIndex)
      .map((day, idx) => ({ ...day, day: idx + 1 }));
    setEditedLesson(prev => ({
      ...prev,
      challenge: {
        ...prev.challenge,
        duration_days: newDays.length,
        daily_tasks: newDays
      }
    }));
  };

  const createNewChallenge = () => {
    setEditedLesson(prev => ({
      ...prev,
      challenge: {
        id: `challenge_${Date.now()}`,
        title: '',
        description: '',
        duration_days: 7,
        daily_tasks: Array.from({ length: 7 }, (_, i) => ({
          day: i + 1,
          title: '',
          description: '',
          tasks: [''],
          completed: false
        })),
        start_date: null,
        end_date: null
      }
    }));
  };

  const handleQuizChange = (field, value) => {
    setEditedLesson(prev => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        [field]: value
      }
    }));
  };

  const handleQuestionChange = (questionIndex, field, value) => {
    const newQuestions = [...(editedLesson.quiz?.questions || [])];
    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      [field]: value
    };
    setEditedLesson(prev => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        questions: newQuestions
      }
    }));
  };

  const handleQuestionOptionChange = (questionIndex, optionIndex, value) => {
    const newQuestions = [...(editedLesson.quiz?.questions || [])];
    const newOptions = [...(newQuestions[questionIndex].options || [])];
    newOptions[optionIndex] = value;
    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      options: newOptions
    };
    setEditedLesson(prev => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        questions: newQuestions
      }
    }));
  };

  const addQuestionOption = (questionIndex) => {
    const newQuestions = [...(editedLesson.quiz?.questions || [])];
    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      options: [...(newQuestions[questionIndex].options || []), '']
    };
    setEditedLesson(prev => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        questions: newQuestions
      }
    }));
  };

  const removeQuestionOption = (questionIndex, optionIndex) => {
    const newQuestions = [...(editedLesson.quiz?.questions || [])];
    newQuestions[questionIndex] = {
      ...newQuestions[questionIndex],
      options: newQuestions[questionIndex].options.filter((_, i) => i !== optionIndex)
    };
    setEditedLesson(prev => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        questions: newQuestions
      }
    }));
  };

  const addQuestion = () => {
    const currentQuestions = editedLesson.quiz?.questions || [];
    const newQuestion = {
      id: `q${currentQuestions.length + 1}`,
      question: '',
      type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      points: 10
    };
    setEditedLesson(prev => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        questions: [...currentQuestions, newQuestion]
      }
    }));
  };

  const removeQuestion = (questionIndex) => {
    const newQuestions = editedLesson.quiz.questions.filter((_, i) => i !== questionIndex);
    setEditedLesson(prev => ({
      ...prev,
      quiz: {
        ...prev.quiz,
        questions: newQuestions
      }
    }));
  };

  const createNewQuiz = () => {
    setEditedLesson(prev => ({
      ...prev,
      quiz: {
        id: `quiz_${Date.now()}`,
        title: '',
        description: '',
        questions: [],
        passing_score: 70,
        time_limit_minutes: 15
      }
    }));
  };

  // Функции загрузки из файлов
  const handleUploadTheory = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const blocks = parseTheoryFromText(text);
      setEditedLesson(prev => ({
        ...prev,
        theory: [...(prev.theory || []), ...blocks]
      }));
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleUploadExercises = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const exercises = parseExercisesFromText(text);
      setEditedLesson(prev => ({
        ...prev,
        exercises: [...(prev.exercises || []), ...exercises]
      }));
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleUploadChallenge = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const challenge = parseChallengeFromText(text);
      setEditedLesson(prev => ({
        ...prev,
        challenge: challenge
      }));
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleUploadQuiz = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const quiz = parseQuizFromText(text);
      setEditedLesson(prev => ({
        ...prev,
        quiz: quiz
      }));
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Парсеры для разных типов контента
  const parseTheoryFromText = (text) => {
    const blocks = [];
    // Разделяем по линиям-разделителям (─────) или двойным переносам
    const sections = text.split(/───+|═══+|\n\n\n+/);
    
    sections.forEach((section, index) => {
      const trimmed = section.trim();
      if (!trimmed || trimmed.length < 3) return;
      
      const lines = trimmed.split('\n').filter(l => l.trim());
      if (lines.length === 0) return;
      
      // Первая строка - заголовок (может быть в верхнем регистре или с #)
      let title = lines[0].replace(/^#+\s*/, '').trim();
      
      // Пропускаем общий заголовок урока (УРОК N — ...)
      if (title.match(/^УРОК\s+\d+\s*—/i) || title.match(/^РАЗДЕЛ\s+\d+/i)) {
        return;
      }
      
      // Содержание - все остальные строки
      const content = lines.slice(1).join('\n').trim();
      
      if (content) {
        blocks.push({
          id: `theory_${Date.now()}_${index}`,
          title: title,
          content: content,
          order: blocks.length
        });
      }
    });
    
    return blocks;
  };

  const parseExercisesFromText = (text) => {
    const exercises = [];
    // Разделяем по линиям-разделителям
    const sections = text.split(/───+|═══+/).filter(s => s.trim());
    
    sections.forEach((section, index) => {
      const trimmed = section.trim();
      if (!trimmed || trimmed.length < 10) return;
      
      // Пропускаем заголовок урока и раздела
      if (trimmed.match(/^УРОК\s+\d+\s*—/i) || trimmed.match(/^РАЗДЕЛ\s+\d+/i)) {
        return;
      }
      
      const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;
      
      // Ищем структуру: Номер. Название: ... Тип: ... Содержание: ... Инструкция: ... Ожидаемый результат:
      let title = '';
      let type = 'reflection';
      let description = '';
      let instructions = '';
      let expectedOutcome = '';
      
      let currentSection = '';
      let currentContent = [];
      
      lines.forEach(line => {
        // Определяем секции
        if (line.match(/^\d+\.\s*Название:/i)) {
          title = line.replace(/^\d+\.\s*Название:\s*/i, '').trim();
          currentSection = 'title';
        } else if (line.match(/^Тип:/i)) {
          const typeText = line.replace(/^Тип:\s*/i, '').trim().toLowerCase();
          // Определяем тип упражнения
          if (typeText.includes('расчёт') || typeText.includes('расчет')) type = 'practice';
          else if (typeText.includes('анализ')) type = 'analysis';
          else if (typeText.includes('практик')) type = 'practice';
          else if (typeText.includes('психолог')) type = 'reflection';
          else if (typeText.includes('энергет')) type = 'practice';
          else if (typeText.includes('духов')) type = 'reflection';
          currentSection = 'type';
        } else if (line.match(/^Содержание:/i)) {
          currentSection = 'content';
          currentContent = [];
        } else if (line.match(/^Инструкция:/i)) {
          if (currentSection === 'content') {
            description = currentContent.join('\n').trim();
          }
          currentSection = 'instructions';
          currentContent = [];
        } else if (line.match(/^Ожидаемый результат:/i)) {
          if (currentSection === 'instructions') {
            instructions = currentContent.join('\n').trim();
          }
          currentSection = 'outcome';
          currentContent = [];
        } else if (line.match(/^Интерпретация:/i)) {
          // Интерпретация - часть содержания
          if (currentSection === 'content') {
            currentContent.push('\n**Интерпретация:**');
          }
          currentContent.push(line.replace(/^Интерпретация:\s*/i, ''));
        } else {
          // Добавляем строку к текущей секции
          currentContent.push(line);
        }
      });
      
      // Сохраняем последнюю секцию
      if (currentSection === 'content') {
        description = currentContent.join('\n').trim();
      } else if (currentSection === 'instructions') {
        instructions = currentContent.join('\n').trim();
      } else if (currentSection === 'outcome') {
        expectedOutcome = currentContent.join('\n').trim();
      }
      
      // Если нет инструкций, но есть содержание - используем содержание как инструкции
      if (!instructions && description) {
        instructions = description;
        description = description.substring(0, 200) + (description.length > 200 ? '...' : '');
      }
      
      if (title && instructions) {
        exercises.push({
          id: `exercise_${Date.now()}_${index}`,
          title: title,
          description: description || instructions.substring(0, 200),
          instructions: instructions,
          expected_outcome: expectedOutcome,
          type: type,
          order: exercises.length
        });
      }
    });
    
    return exercises;
  };

  const parseChallengeFromText = (text) => {
    const lines = text.split('\n');
    
    // Ищем заголовок челленджа (обычно в кавычках или после ЧЕЛЛЕНДЖ)
    let title = 'Челлендж';
    let description = '';
    
    // Ищем строку с ЧЕЛЛЕНДЖ «...»
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.match(/ЧЕЛЛЕНДЖ\s*[«"]/i)) {
        const match = line.match(/ЧЕЛЛЕНДЖ\s*[«"]([^»"]+)[»"]/i);
        if (match) {
          title = match[1];
        }
      } else if (line.match(/^Описание:/i)) {
        // Собираем описание до первого разделителя
        let descLines = [];
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].match(/───+|═══+/)) break;
          descLines.push(lines[j].trim());
        }
        description = descLines.filter(Boolean).join(' ');
        break;
      }
    }
    
    const dailyTasks = [];
    let currentDay = null;
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Ищем дни недели в верхнем регистре (ПОНЕДЕЛЬНИК, ВТОРНИК и т.д.)
      const dayOfWeekMatch = trimmed.match(/^(ПОНЕДЕЛЬНИК|ВТОРНИК|СРЕДА|ЧЕТВЕРГ|ПЯТНИЦА|СУББОТА|ВОСКРЕСЕНЬЕ)\s*[—–-]\s*(.+)/i);
      
      if (dayOfWeekMatch) {
        // Сохраняем предыдущий день
        if (currentDay) {
          dailyTasks.push(currentDay);
        }
        
        // Определяем номер дня по дню недели (для 7-дневного челленджа)
        const dayNames = ['ВОСКРЕСЕНЬЕ', 'ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА'];
        const dayName = dayOfWeekMatch[1].toUpperCase();
        const dayNumber = dayNames.indexOf(dayName) >= 0 ? dayNames.indexOf(dayName) : dailyTasks.length + 1;
        
        currentDay = {
          day: dailyTasks.length + 1, // Порядковый номер
          title: dayOfWeekMatch[2].trim(),
          description: '',
          tasks: [],
          completed: false
        };
      } else if (currentDay && trimmed.match(/^\d+\./)) {
        // Задачи начинаются с номера (1., 2., 3.)
        const task = trimmed.replace(/^\d+\.\s*/, '').trim();
        if (task) {
          currentDay.tasks.push(task);
        }
      } else if (currentDay && !trimmed.match(/───+|═══+/) && trimmed.length > 0) {
        // Добавляем к описанию дня (если это не разделитель)
        if (!trimmed.match(/^УРОК\s+\d+/i) && !trimmed.match(/^РАЗДЕЛ/i) && !trimmed.match(/^РЕЗУЛЬТАТ:/i)) {
          if (currentDay.description) {
            currentDay.description += ' ' + trimmed;
          } else {
            currentDay.description = trimmed;
          }
        }
      }
    });
    
    // Сохраняем последний день
    if (currentDay) {
      dailyTasks.push(currentDay);
    }
    
    return {
      id: `challenge_${Date.now()}`,
      title,
      description,
      duration_days: dailyTasks.length,
      daily_tasks: dailyTasks,
      start_date: null,
      end_date: null
    };
  };

  const parseQuizFromText = (text) => {
    const lines = text.split('\n');
    
    // Ищем заголовок теста
    let title = 'Тест';
    let description = '';
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.match(/^УРОК\s+\d+\s*—/i)) {
        // Извлекаем название из заголовка урока
        const match = line.match(/—\s*(.+?)(?:\s*•|$)/);
        if (match) {
          title = `Тест: ${match[1].trim()}`;
        }
      } else if (line.match(/^РАЗДЕЛ\s+\d+\.\s*ТЕСТ/i)) {
        continue;
      } else if (line.match(/^Каждый вопрос/i) || line.match(/^Выберите/i)) {
        description = line;
        break;
      }
    }
    
    const questions = [];
    let currentQuestion = null;
    let inAnswersSection = false;
    const correctAnswers = {};
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Проверяем секцию с ответами
      if (trimmed.match(/^ОТВЕТЫ:/i)) {
        inAnswersSection = true;
        // Ищем строку с ответами (формат: 1–C, 2–A, 3–C...)
        if (index + 1 < lines.length) {
          const answersLine = lines[index + 1].trim();
          // Парсим ответы вида "1–C, 2–A, 3–C"
          const answerPairs = answersLine.split(',');
          answerPairs.forEach(pair => {
            const match = pair.trim().match(/(\d+)[–-]([A-E])/i);
            if (match) {
              correctAnswers[parseInt(match[1])] = match[2].toUpperCase();
            }
          });
        }
        return;
      }
      
      if (inAnswersSection) return;
      
      // Ищем вопросы (формат: 1. Текст вопроса?)
      const questionMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
      if (questionMatch && !trimmed.match(/^───+/)) {
        // Сохраняем предыдущий вопрос
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        
        const questionNum = parseInt(questionMatch[1]);
        currentQuestion = {
          id: `q${questionNum}`,
          question: questionMatch[2].trim(),
          type: 'multiple_choice',
          options: [],
          correct_answer: '',
          explanation: '',
          points: 10
        };
      } else if (currentQuestion && trimmed.match(/^[A-E]\./i)) {
        // Варианты ответа (формат: A. Текст ответа)
        const option = trimmed.replace(/^[A-E]\.\s*/i, '').trim();
        if (option) {
          currentQuestion.options.push(option);
        }
      }
    });
    
    // Сохраняем последний вопрос
    if (currentQuestion) {
      questions.push(currentQuestion);
    }
    
    // Устанавливаем правильные ответы
    questions.forEach((q, index) => {
      const questionNum = index + 1;
      if (correctAnswers[questionNum]) {
        const answerLetter = correctAnswers[questionNum];
        const answerIndex = answerLetter.charCodeAt(0) - 'A'.charCodeAt(0);
        if (answerIndex >= 0 && answerIndex < q.options.length) {
          q.correct_answer = q.options[answerIndex];
        }
      }
    });
    
    return {
      id: `quiz_${Date.now()}`,
      title,
      description,
      questions,
      passing_score: 70,
      time_limit_minutes: 15
    };
  };

  const handleSave = () => {
    onSave(editedLesson);
  };

  if (!lesson) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[96vw] w-[96vw] max-h-[96vh] h-[96vh] p-0 overflow-hidden bg-white flex flex-col">
        <DialogHeader className="border-b border-gray-200 px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Edit className="w-6 h-6 text-blue-600" />
            Редактирование урока
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Используйте вкладки для редактирования разных разделов урока
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col px-8">
          <TabsList className="grid w-full grid-cols-6 bg-gray-100 h-14 mt-4 flex-shrink-0">
            <TabsTrigger value="general" className="flex items-center gap-2 text-base">
              <Edit className="w-4 h-4" />
              Основное
            </TabsTrigger>
            <TabsTrigger value="theory" className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4" />
              Теория
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center gap-2 text-base">
              <Brain className="w-4 h-4" />
              Упражнения
            </TabsTrigger>
            <TabsTrigger value="challenge" className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" />
              Челлендж
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Тест
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4" />
              Аналитика
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-6 pr-2" style={{ scrollbarWidth: 'thin' }}>
            {/* ОСНОВНОЕ */}
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Название урока
                </Label>
                <Input
                  value={editedLesson.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="Введите название урока"
                  className="bg-white"
                />
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Описание урока
                </Label>
                <Textarea
                  value={editedLesson.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Введите описание урока"
                  rows={3}
                  className="bg-white"
                />
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Уровень</Label>
                    <Select
                      value={editedLesson.level?.toString() || '1'}
                      onValueChange={(value) => handleFieldChange('level', parseInt(value))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
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
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Порядок</Label>
                    <Input
                      type="number"
                      value={editedLesson.order || 0}
                      onChange={(e) => handleFieldChange('order', parseInt(e.target.value) || 0)}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Необходимые баллы</Label>
                    <Input
                      type="number"
                      value={editedLesson.points_required || 0}
                      onChange={(e) => handleFieldChange('points_required', parseInt(e.target.value) || 0)}
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">Модуль</Label>
                    <Input
                      value={editedLesson.module || ''}
                      onChange={(e) => handleFieldChange('module', e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-3 bg-white px-4 py-3 rounded-lg border border-gray-300">
                    <input
                      type="checkbox"
                      id="is-active"
                      checked={editedLesson.is_active || false}
                      onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <Label htmlFor="is-active" className="cursor-pointer">Урок активен</Label>
                  </div>

                  <div className="flex items-center space-x-3 bg-white px-4 py-3 rounded-lg border border-gray-300">
                    <input
                      type="checkbox"
                      id="analytics-enabled"
                      checked={editedLesson.analytics_enabled || false}
                      onChange={(e) => handleFieldChange('analytics_enabled', e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <Label htmlFor="analytics-enabled" className="cursor-pointer">Аналитика включена</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ТЕОРИЯ */}
            <TabsContent value="theory" className="space-y-4 mt-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Блоки теории ({editedLesson.theory?.length || 0})</h3>
                <div className="flex gap-2">
                  {/* Загрузка теории из текстового файла */}
                  <input
                    type="file"
                    id="upload-theory"
                    accept=".txt,.md"
                    onChange={handleUploadTheory}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => document.getElementById('upload-theory').click()} 
                    size="sm" 
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Загрузить из файла
                  </Button>
                  
                  {/* Загрузка медиафайлов */}
                  <input
                    type="file"
                    id="upload-theory-media"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) => handleFileUpload(e, 'theory', 'media')}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => document.getElementById('upload-theory-media').click()} 
                    size="sm" 
                    variant="outline"
                    className="border-purple-600 text-purple-600 hover:bg-purple-50"
                    disabled={uploadingFile}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    {uploadingFile ? 'Загрузка...' : 'Медиафайлы'}
                  </Button>
                  
                  {/* Загрузка документов */}
                  <input
                    type="file"
                    id="upload-theory-docs"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                    multiple
                    onChange={(e) => handleFileUpload(e, 'theory', 'document')}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => document.getElementById('upload-theory-docs').click()} 
                    size="sm" 
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    disabled={uploadingFile}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    {uploadingFile ? 'Загрузка...' : 'Документы'}
                  </Button>
                  
                  <Button onClick={addTheoryBlock} size="sm" className="bg-blue-600">
                    <Plus className="w-4 h-4 mr-1" />
                    Добавить блок
                  </Button>
                </div>
              </div>

              {editedLesson.theory?.map((block, index) => (
                <div key={block.id || index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-semibold text-gray-700">Блок {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTheoryBlock(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm mb-1 block">Заголовок</Label>
                      <Input
                        value={block.title || ''}
                        onChange={(e) => handleTheoryChange(index, 'title', e.target.value)}
                        placeholder="Заголовок блока теории"
                        className="bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-sm mb-1 block">Содержание</Label>
                      <Textarea
                        value={block.content || ''}
                        onChange={(e) => handleTheoryChange(index, 'content', e.target.value)}
                        placeholder="Текст теории"
                        rows={4}
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {(!editedLesson.theory || editedLesson.theory.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Нет блоков теории. Нажмите "Добавить блок" чтобы создать первый.</p>
                </div>
              )}

              {/* ЗАГРУЖЕННЫЕ ФАЙЛЫ */}
              {(theoryMediaFiles.length > 0 || theoryDocuments.length > 0) && (
                <div className="mt-6 space-y-4">
                  {/* Медиафайлы */}
                  {theoryMediaFiles.length > 0 && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Медиафайлы ({theoryMediaFiles.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {theoryMediaFiles.map((file) => (
                          <div key={file.id} className="bg-white p-3 rounded border border-purple-200 flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.original_name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.file_size / 1024 / 1024).toFixed(2)} МБ • {file.extension}
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewFile(file)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Просмотр"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadFile(file)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Скачать"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFileDelete(file.id, 'theory')}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Документы */}
                  {theoryDocuments.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Документы ({theoryDocuments.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {theoryDocuments.map((file) => (
                          <div key={file.id} className="bg-white p-3 rounded border border-green-200 flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.original_name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.file_size / 1024 / 1024).toFixed(2)} МБ • {file.extension}
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewFile(file)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Просмотр"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadFile(file)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Скачать"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFileDelete(file.id, 'theory')}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* УПРАЖНЕНИЯ */}
            <TabsContent value="exercises" className="space-y-4 mt-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Упражнения ({editedLesson.exercises?.length || 0})</h3>
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="upload-exercises"
                    accept=".txt,.md"
                    onChange={handleUploadExercises}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => document.getElementById('upload-exercises').click()} 
                    size="sm" 
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Загрузить из файла
                  </Button>
                  <Button onClick={addExercise} size="sm" className="bg-green-600">
                    <Plus className="w-4 h-4 mr-1" />
                    Добавить упражнение
                  </Button>
                </div>
              </div>

              {editedLesson.exercises?.map((exercise, index) => (
                <div key={exercise.id || index} className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-semibold text-gray-700">Упражнение {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExercise(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm mb-1 block">Название</Label>
                      <Input
                        value={exercise.title || ''}
                        onChange={(e) => handleExerciseChange(index, 'title', e.target.value)}
                        placeholder="Название упражнения"
                        className="bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-sm mb-1 block">Описание</Label>
                      <Textarea
                        value={exercise.description || ''}
                        onChange={(e) => handleExerciseChange(index, 'description', e.target.value)}
                        placeholder="Краткое описание упражнения"
                        rows={2}
                        className="bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-sm mb-1 block">Инструкции</Label>
                      <Textarea
                        value={exercise.instructions || ''}
                        onChange={(e) => handleExerciseChange(index, 'instructions', e.target.value)}
                        placeholder="Подробные инструкции для выполнения"
                        rows={3}
                        className="bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-sm mb-1 block">Ожидаемый результат</Label>
                      <Input
                        value={exercise.expected_outcome || ''}
                        onChange={(e) => handleExerciseChange(index, 'expected_outcome', e.target.value)}
                        placeholder="Что студент должен получить"
                        className="bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-sm mb-1 block">Тип упражнения</Label>
                      <Select
                        value={exercise.type || 'reflection'}
                        onValueChange={(value) => handleExerciseChange(index, 'type', value)}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reflection">Рефлексия</SelectItem>
                          <SelectItem value="practice">Практика</SelectItem>
                          <SelectItem value="analysis">Анализ</SelectItem>
                          <SelectItem value="creative">Творческое</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}

              {(!editedLesson.exercises || editedLesson.exercises.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Нет упражнений. Нажмите "Добавить упражнение" чтобы создать первое.</p>
                </div>
              )}
            </TabsContent>

            {/* ЧЕЛЛЕНДЖ */}
            <TabsContent value="challenge" className="space-y-4 mt-0">
              {!editedLesson.challenge ? (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 mx-auto mb-4 text-purple-300" />
                  <p className="text-gray-600 mb-4">Челлендж еще не создан</p>
                  <div className="flex gap-2 justify-center">
                    <input
                      type="file"
                      id="upload-challenge"
                      accept=".txt,.md"
                      onChange={handleUploadChallenge}
                      className="hidden"
                    />
                    <Button 
                      onClick={() => document.getElementById('upload-challenge').click()} 
                      variant="outline"
                      className="border-purple-600 text-purple-600 hover:bg-purple-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Загрузить из файла
                    </Button>
                    <Button onClick={createNewChallenge} className="bg-purple-600 hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Создать челлендж
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Основная информация о челлендже */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 space-y-3">
                    <div>
                      <Label className="text-sm mb-1 block font-semibold">Название челленджа</Label>
                      <Input
                        value={editedLesson.challenge.title || ''}
                        onChange={(e) => handleChallengeChange('title', e.target.value)}
                        placeholder="Например: 7-дневный челлендж развития"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-sm mb-1 block font-semibold">Описание</Label>
                      <Textarea
                        value={editedLesson.challenge.description || ''}
                        onChange={(e) => handleChallengeChange('description', e.target.value)}
                        placeholder="Краткое описание челленджа"
                        rows={2}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-sm mb-1 block font-semibold">Длительность (дней)</Label>
                      <Input
                        type="number"
                        value={editedLesson.challenge.duration_days || 7}
                        onChange={(e) => handleChallengeChange('duration_days', parseInt(e.target.value) || 7)}
                        className="bg-white w-32"
                        min="1"
                        max="30"
                      />
                    </div>
                  </div>

                  {/* Ежедневные задания */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Ежедневные задания ({editedLesson.challenge.daily_tasks?.length || 0})</h3>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        id="upload-challenge-existing"
                        accept=".txt,.md"
                        onChange={handleUploadChallenge}
                        className="hidden"
                      />
                      <Button 
                        onClick={() => document.getElementById('upload-challenge-existing').click()} 
                        size="sm" 
                        variant="outline"
                        className="border-purple-600 text-purple-600 hover:bg-purple-50"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Загрузить из файла
                      </Button>
                      <Button onClick={addChallengeDay} size="sm" className="bg-purple-600">
                        <Plus className="w-4 h-4 mr-1" />
                        Добавить день
                      </Button>
                    </div>
                  </div>

                  {editedLesson.challenge.daily_tasks?.map((day, dayIndex) => (
                    <div key={dayIndex} className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-semibold text-purple-800">День {day.day}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChallengeDay(dayIndex)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm mb-1 block">Название дня</Label>
                          <Input
                            value={day.title || ''}
                            onChange={(e) => handleChallengeDayChange(dayIndex, 'title', e.target.value)}
                            placeholder="Например: День 1: Утренняя аффирмация"
                            className="bg-white"
                          />
                        </div>

                        <div>
                          <Label className="text-sm mb-1 block">Описание</Label>
                          <Textarea
                            value={day.description || ''}
                            onChange={(e) => handleChallengeDayChange(dayIndex, 'description', e.target.value)}
                            placeholder="Краткое описание задания на день"
                            rows={2}
                            className="bg-white"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <Label className="text-sm font-semibold">Задачи ({day.tasks?.length || 0})</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addChallengeDayTask(dayIndex)}
                              className="text-purple-600 hover:text-purple-700"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Добавить задачу
                            </Button>
                          </div>

                          {day.tasks?.map((task, taskIndex) => (
                            <div key={taskIndex} className="flex gap-2 mb-2">
                              <Input
                                value={task || ''}
                                onChange={(e) => handleChallengeDayTaskChange(dayIndex, taskIndex, e.target.value)}
                                placeholder={`Задача ${taskIndex + 1}`}
                                className="bg-white flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeChallengeDayTask(dayIndex, taskIndex)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </TabsContent>

            {/* ТЕСТ */}
            <TabsContent value="quiz" className="space-y-4 mt-0">
              {!editedLesson.quiz ? (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-red-300" />
                  <p className="text-gray-600 mb-4">Тест еще не создан</p>
                  <div className="flex gap-2 justify-center">
                    <input
                      type="file"
                      id="upload-quiz"
                      accept=".txt,.md"
                      onChange={handleUploadQuiz}
                      className="hidden"
                    />
                    <Button 
                      onClick={() => document.getElementById('upload-quiz').click()} 
                      variant="outline"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Загрузить из файла
                    </Button>
                    <Button onClick={createNewQuiz} className="bg-red-600 hover:bg-red-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Создать тест
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Основная информация о тесте */}
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-3">
                    <div>
                      <Label className="text-sm mb-1 block font-semibold">Название теста</Label>
                      <Input
                        value={editedLesson.quiz.title || ''}
                        onChange={(e) => handleQuizChange('title', e.target.value)}
                        placeholder="Например: Тест по основам нумерологии"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-sm mb-1 block font-semibold">Описание</Label>
                      <Textarea
                        value={editedLesson.quiz.description || ''}
                        onChange={(e) => handleQuizChange('description', e.target.value)}
                        placeholder="Краткое описание теста"
                        rows={2}
                        className="bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm mb-1 block font-semibold">Проходной балл (%)</Label>
                        <Input
                          type="number"
                          value={editedLesson.quiz.passing_score || 70}
                          onChange={(e) => handleQuizChange('passing_score', parseInt(e.target.value) || 70)}
                          className="bg-white"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block font-semibold">Время (минут)</Label>
                        <Input
                          type="number"
                          value={editedLesson.quiz.time_limit_minutes || 15}
                          onChange={(e) => handleQuizChange('time_limit_minutes', parseInt(e.target.value) || 15)}
                          className="bg-white"
                          min="1"
                          max="120"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Вопросы */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Вопросы ({editedLesson.quiz.questions?.length || 0})</h3>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        id="upload-quiz-existing"
                        accept=".txt,.md"
                        onChange={handleUploadQuiz}
                        className="hidden"
                      />
                      <Button 
                        onClick={() => document.getElementById('upload-quiz-existing').click()} 
                        size="sm" 
                        variant="outline"
                        className="border-red-600 text-red-600 hover:bg-red-50"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Загрузить из файла
                      </Button>
                      <Button onClick={addQuestion} size="sm" className="bg-red-600">
                        <Plus className="w-4 h-4 mr-1" />
                        Добавить вопрос
                      </Button>
                    </div>
                  </div>

                  {editedLesson.quiz.questions?.map((question, qIndex) => (
                    <div key={qIndex} className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-semibold text-red-800">Вопрос {qIndex + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm mb-1 block">Вопрос</Label>
                          <Textarea
                            value={question.question || ''}
                            onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                            placeholder="Введите текст вопроса"
                            rows={2}
                            className="bg-white"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <Label className="text-sm font-semibold">Варианты ответов ({question.options?.length || 0})</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addQuestionOption(qIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Добавить вариант
                            </Button>
                          </div>

                          {question.options?.map((option, optIndex) => (
                            <div key={optIndex} className="flex gap-2 mb-2">
                              <Input
                                value={option || ''}
                                onChange={(e) => handleQuestionOptionChange(qIndex, optIndex, e.target.value)}
                                placeholder={`Вариант ${optIndex + 1}`}
                                className="bg-white flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestionOption(qIndex, optIndex)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div>
                          <Label className="text-sm mb-1 block">Правильный ответ</Label>
                          <Select
                            value={question.correct_answer || ''}
                            onValueChange={(value) => handleQuestionChange(qIndex, 'correct_answer', value)}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Выберите правильный ответ" />
                            </SelectTrigger>
                            <SelectContent>
                              {question.options?.map((option, idx) => (
                                <SelectItem key={idx} value={option}>
                                  {option || `Вариант ${idx + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm mb-1 block">Объяснение</Label>
                          <Textarea
                            value={question.explanation || ''}
                            onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                            placeholder="Объяснение правильного ответа"
                            rows={2}
                            className="bg-white"
                          />
                        </div>

                        <div>
                          <Label className="text-sm mb-1 block">Баллы за вопрос</Label>
                          <Input
                            type="number"
                            value={question.points || 10}
                            onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 10)}
                            className="bg-white w-32"
                            min="1"
                            max="100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!editedLesson.quiz.questions || editedLesson.quiz.questions.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Нет вопросов. Нажмите "Добавить вопрос" чтобы создать первый.</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* АНАЛИТИКА */}
            <TabsContent value="analytics" className="space-y-4 mt-0">
              {loadingAnalytics ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : analyticsData ? (
                <>
                  {/* Компактная общая статистика */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {/* Студенты */}
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-lg text-white shadow-lg">
                      <p className="text-xs opacity-90 mb-1">Студентов</p>
                      <p className="text-3xl font-bold">{analyticsData.statistics.total_students}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {analyticsData.statistics.completed_students} завершили
                      </p>
                    </div>

                    {/* Прогресс */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-lg text-white shadow-lg">
                      <p className="text-xs opacity-90 mb-1">Прогресс</p>
                      <p className="text-3xl font-bold">{analyticsData.statistics.avg_completion_percentage}%</p>
                      <p className="text-xs mt-1 opacity-75">средний</p>
                    </div>

                    {/* Упражнения */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-lg text-white shadow-lg">
                      <p className="text-xs opacity-90 mb-1">Упражнения</p>
                      <p className="text-3xl font-bold">{analyticsData.statistics.total_exercise_responses}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {analyticsData.statistics.pending_review} на проверке
                      </p>
                    </div>

                    {/* Тесты */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-lg text-white shadow-lg">
                      <p className="text-xs opacity-90 mb-1">Тесты</p>
                      <p className="text-3xl font-bold">{analyticsData.statistics.avg_quiz_score}%</p>
                      <p className="text-xs mt-1 opacity-75">
                        {analyticsData.statistics.total_quiz_attempts} попыток
                      </p>
                    </div>

                    {/* Челленджи */}
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-lg text-white shadow-lg">
                      <p className="text-xs opacity-90 mb-1">Челленджи</p>
                      <p className="text-3xl font-bold">{analyticsData.statistics.total_challenge_attempts || 0}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {analyticsData.statistics.completed_challenges || 0} завершено
                      </p>
                    </div>
                  </div>

                  {/* Статистика по баллам */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Баллы за челленджи */}
                    {analyticsData.statistics.total_challenge_attempts > 0 && (
                      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-lg border border-yellow-200">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-yellow-700" />
                          Баллы за челленджи
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Всего баллов:</span>
                            <span className="text-lg font-bold text-yellow-600">
                              {analyticsData.statistics.total_points_earned || 0} 🌟
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Средний:</span>
                            <span className="text-sm font-semibold text-amber-600">
                              {analyticsData.statistics.avg_points_per_attempt || 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Участников:</span>
                            <span className="text-sm font-semibold text-orange-600">
                              {analyticsData.statistics.unique_challenge_users || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Баллы за тесты */}
                    {analyticsData.statistics.total_quiz_attempts > 0 && (
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-purple-700" />
                          Баллы за тесты
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Всего баллов:</span>
                            <span className="text-lg font-bold text-purple-600">
                              {analyticsData.statistics.total_quiz_points || 0} 🎯
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Средний:</span>
                            <span className="text-sm font-semibold text-indigo-600">
                              {analyticsData.statistics.avg_quiz_points || 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Пройдено:</span>
                            <span className="text-sm font-semibold text-green-600">
                              {analyticsData.statistics.passed_quizzes || 0} / {analyticsData.statistics.total_quiz_attempts}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Топ студентов по баллам - две колонки */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Топ по челленджам */}
                    {analyticsData.challenge_leaderboard && analyticsData.challenge_leaderboard.length > 0 && (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-yellow-600" />
                          Топ по челленджам
                        </h3>
                      <div className="space-y-2">
                        {analyticsData.challenge_leaderboard.map((student, index) => (
                          <div 
                            key={student.user_id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                              index === 1 ? 'bg-gray-50 border border-gray-200' :
                              index === 2 ? 'bg-orange-50 border border-orange-200' :
                              'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                index === 1 ? 'bg-gray-400 text-gray-900' :
                                index === 2 ? 'bg-orange-400 text-orange-900' :
                                'bg-gray-300 text-gray-700'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-sm">Студент {student.user_id.substring(0, 8)}</p>
                                <p className="text-xs text-gray-500">
                                  {student.attempts} попыток • {student.completed} завершено
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-yellow-600">{student.total_points} 🌟</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      </div>
                    )}

                    {/* Топ по тестам */}
                    {analyticsData.quiz_leaderboard && analyticsData.quiz_leaderboard.length > 0 && (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-purple-600" />
                          Топ по тестам
                        </h3>
                        <div className="space-y-2">
                          {analyticsData.quiz_leaderboard.map((student, index) => (
                            <div 
                              key={student.user_id}
                              className={`flex items-center justify-between p-3 rounded-lg ${
                                index === 0 ? 'bg-purple-50 border border-purple-200' :
                                index === 1 ? 'bg-gray-50 border border-gray-200' :
                                index === 2 ? 'bg-indigo-50 border border-indigo-200' :
                                'bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                  index === 0 ? 'bg-purple-400 text-purple-900' :
                                  index === 1 ? 'bg-gray-400 text-gray-900' :
                                  index === 2 ? 'bg-indigo-400 text-indigo-900' :
                                  'bg-gray-300 text-gray-700'
                                }`}>
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">Студент {student.user_id.substring(0, 8)}</p>
                                  <p className="text-xs text-gray-500">
                                    {student.attempts} попыток • {student.passed} пройдено • {student.best_score}%
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-purple-600">{student.total_points} 🎯</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* График прогресса по времени */}
                  {analyticsData.progress_timeline && analyticsData.progress_timeline.length > 0 && (
                    <div className="bg-white p-5 rounded-lg border border-gray-200">
                      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-600" />
                        Динамика обучения
                      </h3>
                      <div className="space-y-2">
                        {analyticsData.progress_timeline.slice(-7).map(([date, data]) => {
                          const maxValue = Math.max(data.started, data.completed, 1);
                          const startedWidth = (data.started / maxValue) * 100;
                          const completedWidth = (data.completed / maxValue) * 100;
                          
                          return (
                            <div key={date} className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>{new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                                <span>{data.started} начали • {data.completed} завершили</span>
                              </div>
                              <div className="flex gap-1 h-6">
                                <div 
                                  className="bg-blue-200 rounded flex items-center justify-end pr-2"
                                  style={{ width: `${startedWidth}%` }}
                                >
                                  {data.started > 0 && <span className="text-xs text-blue-800">{data.started}</span>}
                                </div>
                                <div 
                                  className="bg-green-500 rounded flex items-center justify-end pr-2"
                                  style={{ width: `${completedWidth}%` }}
                                >
                                  {data.completed > 0 && <span className="text-xs text-white">{data.completed}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-4 mt-3 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-blue-200 rounded"></div>
                          <span className="text-gray-600">Начали</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span className="text-gray-600">Завершили</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ответы студентов - компактный дизайн */}
                  <div className="bg-white p-5 rounded-lg border border-gray-200">
                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Ответы студентов ({studentResponses.length})
                      {analyticsData.statistics.pending_review > 0 && (
                        <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                          {analyticsData.statistics.pending_review} на проверке
                        </span>
                      )}
                    </h3>
                    
                    {studentResponses.length === 0 ? (
                      <p className="text-gray-500 text-center py-6 text-sm">Пока нет ответов от студентов</p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {studentResponses.map((response) => (
                          <div 
                            key={response.id} 
                            className={`p-3 rounded-lg border ${
                              response.reviewed 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-yellow-50 border-yellow-200'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{response.user_name}</p>
                                  {response.reviewed ? (
                                    <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded">✓</span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-xs bg-yellow-600 text-white rounded">⏱</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600">{response.exercise_title}</p>
                              </div>
                              <p className="text-xs text-gray-500">
                                {new Date(response.submitted_at).toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                            
                            <div className="bg-white p-2 rounded border border-gray-200 mb-2">
                              <p className="text-xs text-gray-700 line-clamp-2">{response.response_text}</p>
                            </div>
                            
                            {response.reviewed && response.admin_comment && (
                              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                <p className="text-xs font-semibold text-blue-800 mb-1">Комментарий администратора:</p>
                                <p className="text-sm text-blue-900">{response.admin_comment}</p>
                              </div>
                            )}
                            
                            {!response.reviewed && (
                              <div className="mt-3">
                                {reviewingResponse === response.id ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={adminComment}
                                      onChange={(e) => setAdminComment(e.target.value)}
                                      placeholder="Введите комментарий для студента..."
                                      rows={3}
                                      className="w-full"
                                    />
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleReviewResponse(response.id)}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        Сохранить комментарий
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => {
                                          setReviewingResponse(null);
                                          setAdminComment('');
                                        }}
                                      >
                                        Отмена
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setReviewingResponse(response.id)}
                                    className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                                  >
                                    Добавить комментарий
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Заметки челленджа - компактный дизайн */}
                  {challengeNotes.length > 0 && (
                    <div className="bg-white p-5 rounded-lg border border-gray-200">
                      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        Заметки челленджа ({challengeNotes.length})
                      </h3>
                      
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {challengeNotes.map((note, index) => (
                          <div 
                            key={index} 
                            className="p-3 rounded-lg border bg-purple-50 border-purple-200"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{note.user_name}</p>
                                  <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                                    День {note.day}
                                  </span>
                                  {note.is_challenge_completed && (
                                    <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                                      ✓ Завершен
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-gray-500">
                                {new Date(note.completed_at).toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                            
                            <div className="bg-white p-2 rounded border border-purple-200">
                              <p className="text-xs text-gray-700 line-clamp-2">{note.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Аналитика файлов */}
                  {filesAnalytics && filesAnalytics.files && filesAnalytics.files.length > 0 && (
                    <div className="bg-white p-5 rounded-lg border border-gray-200">
                      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Аналитика файлов ({filesAnalytics.total_files})
                      </h3>
                      
                      <div className="space-y-3">
                        {filesAnalytics.files.map((file, index) => (
                          <div 
                            key={index} 
                            className="p-4 rounded-lg border bg-blue-50 border-blue-200"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <p className="font-medium text-sm mb-1">{file.file_name}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                                    {file.section === 'theory' ? 'Теория' : 
                                     file.section === 'exercises' ? 'Упражнения' : 
                                     file.section === 'challenge' ? 'Челлендж' : 'Тест'}
                                  </span>
                                  <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded">
                                    {file.file_type === 'media' ? '🎬 Медиа' : '📄 Документ'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div className="bg-white p-2 rounded border border-blue-200">
                                <p className="text-xs text-gray-600">Просмотры</p>
                                <p className="text-lg font-semibold text-blue-600">{file.total_views}</p>
                              </div>
                              <div className="bg-white p-2 rounded border border-blue-200">
                                <p className="text-xs text-gray-600">Скачивания</p>
                                <p className="text-lg font-semibold text-green-600">{file.total_downloads}</p>
                              </div>
                              <div className="bg-white p-2 rounded border border-blue-200">
                                <p className="text-xs text-gray-600">Уник. польз.</p>
                                <p className="text-lg font-semibold text-purple-600">{file.unique_users}</p>
                              </div>
                            </div>
                            
                            {file.video_stats && (
                              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded border border-yellow-200">
                                <p className="text-xs font-semibold text-yellow-800 mb-2">📹 Статистика видео:</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <p className="text-xs text-gray-600">Минут просмотра</p>
                                    <p className="text-sm font-semibold text-yellow-700">{file.video_stats.total_watch_minutes}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Баллов начислено</p>
                                    <p className="text-sm font-semibold text-green-700">{file.video_stats.total_points_earned}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Зрителей</p>
                                    <p className="text-sm font-semibold text-blue-700">{file.video_stats.unique_watchers}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Нажмите на вкладку "Аналитика" для загрузки данных</p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t border-gray-200 px-8 py-6 bg-gray-50 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 hover:bg-gray-100 h-12 px-6 text-base"
          >
            <X className="w-5 h-5 mr-2" />
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-8 text-base"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Сохранить все изменения
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Модальное окно просмотра файлов */}
      {fileViewerOpen && viewingFile && (
        <Dialog open={fileViewerOpen} onOpenChange={setFileViewerOpen}>
          <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] h-[90vh] p-0 overflow-hidden bg-white flex flex-col">
            <DialogHeader className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <Eye className="w-5 h-5 text-blue-600" />
                Просмотр файла
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {viewingFile.original_name} • {(viewingFile.file_size / 1024 / 1024).toFixed(2)} МБ • {viewingFile.extension}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              {/* Изображения */}
              {viewingFile.mime_type?.startsWith('image/') && (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={`http://localhost:8000/uploads/learning_v2/${viewingFile.stored_name}`}
                    alt={viewingFile.original_name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}

              {/* Видео */}
              {viewingFile.mime_type?.startsWith('video/') && (
                <div className="flex items-center justify-center h-full">
                  <video
                    controls
                    className="max-w-full max-h-full rounded-lg shadow-lg"
                    src={`http://localhost:8000/uploads/learning_v2/${viewingFile.stored_name}`}
                  >
                    Ваш браузер не поддерживает воспроизведение видео.
                  </video>
                </div>
              )}

              {/* PDF */}
              {viewingFile.extension === 'pdf' && (
                <iframe
                  src={`http://localhost:8000/uploads/learning_v2/${viewingFile.stored_name}`}
                  className="w-full h-full rounded-lg shadow-lg"
                  title={viewingFile.original_name}
                />
              )}

              {/* Текстовые файлы */}
              {viewingFile.mime_type?.startsWith('text/') && (
                <div className="bg-white p-6 rounded-lg shadow-lg h-full overflow-auto">
                  <iframe
                    src={`http://localhost:8000/uploads/learning_v2/${viewingFile.stored_name}`}
                    className="w-full h-full border-0"
                    title={viewingFile.original_name}
                  />
                </div>
              )}

              {/* Документы Word, Excel - предложение скачать */}
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
                    Скачайте файл для просмотра в соответствующем приложении
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

            <DialogFooter className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleCloseFileViewer}
                className="border-gray-300 hover:bg-gray-100"
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
                  window.open(`http://localhost:8000/uploads/learning_v2/${viewingFile.stored_name}`, '_blank');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Открыть в новой вкладке
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default LessonEditModal;

