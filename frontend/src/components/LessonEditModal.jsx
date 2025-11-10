import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Edit, Save, X, Plus, Trash2, BookOpen, Brain, Users, FileText, BarChart3, Upload } from 'lucide-react';

const LessonEditModal = ({ 
  lesson, 
  isOpen, 
  onClose, 
  onSave,
  isSaving 
}) => {
  const [editedLesson, setEditedLesson] = useState(lesson || {});
  const [activeTab, setActiveTab] = useState('general');

  // Синхронизация с пропсом lesson при его изменении
  useEffect(() => {
    if (lesson) {
      setEditedLesson(lesson);
      setActiveTab('general'); // Сбрасываем на первую вкладку при открытии нового урока
    }
  }, [lesson, isOpen]);

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
    const sections = text.split(/\n\n+/);
    
    sections.forEach((section, index) => {
      const lines = section.trim().split('\n');
      if (lines.length > 0) {
        blocks.push({
          id: `theory_${Date.now()}_${index}`,
          title: lines[0].replace(/^#+\s*/, ''),
          content: lines.slice(1).join('\n').trim(),
          order: index
        });
      }
    });
    
    return blocks;
  };

  const parseExercisesFromText = (text) => {
    const exercises = [];
    const exerciseBlocks = text.split(/УПРАЖНЕНИЕ \d+:/i).filter(Boolean);
    
    exerciseBlocks.forEach((block, index) => {
      const lines = block.trim().split('\n');
      const title = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();
      
      exercises.push({
        id: `exercise_${Date.now()}_${index}`,
        title: title || `Упражнение ${index + 1}`,
        description: content.substring(0, 200),
        instructions: content,
        expected_outcome: '',
        type: 'reflection',
        order: index
      });
    });
    
    return exercises;
  };

  const parseChallengeFromText = (text) => {
    const lines = text.split('\n');
    const title = lines[0]?.replace(/^#+\s*/, '') || 'Новый челлендж';
    const description = lines[1] || '';
    
    const dailyTasks = [];
    let currentDay = null;
    
    lines.forEach(line => {
      const dayMatch = line.match(/День (\d+):/i);
      if (dayMatch) {
        if (currentDay) dailyTasks.push(currentDay);
        currentDay = {
          day: parseInt(dayMatch[1]),
          title: line.replace(/День \d+:\s*/i, ''),
          description: '',
          tasks: [],
          completed: false
        };
      } else if (currentDay && line.trim().startsWith('-')) {
        currentDay.tasks.push(line.replace(/^-\s*/, '').trim());
      } else if (currentDay && line.trim()) {
        currentDay.description += line.trim() + ' ';
      }
    });
    
    if (currentDay) dailyTasks.push(currentDay);
    
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
    const title = lines[0]?.replace(/^#+\s*/, '') || 'Новый тест';
    const description = lines[1] || '';
    
    const questions = [];
    let currentQuestion = null;
    
    lines.forEach(line => {
      const questionMatch = line.match(/^\d+\.\s*(.+)/);
      if (questionMatch) {
        if (currentQuestion) questions.push(currentQuestion);
        currentQuestion = {
          id: `q${questions.length + 1}`,
          question: questionMatch[1],
          type: 'multiple_choice',
          options: [],
          correct_answer: '',
          explanation: '',
          points: 10
        };
      } else if (currentQuestion && line.trim().match(/^[а-яА-Яa-zA-Z]\)|^-/)) {
        const option = line.replace(/^[а-яА-Яa-zA-Z]\)\s*|^-\s*/, '').trim();
        if (option) currentQuestion.options.push(option);
      }
    });
    
    if (currentQuestion) questions.push(currentQuestion);
    
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white flex flex-col">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-600" />
            Редактирование урока
          </DialogTitle>
          <DialogDescription>
            Используйте вкладки для редактирования разных разделов урока
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-6 bg-gray-100">
            <TabsTrigger value="general" className="flex items-center gap-1">
              <Edit className="w-4 h-4" />
              Основное
            </TabsTrigger>
            <TabsTrigger value="theory" className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              Теория
            </TabsTrigger>
            <TabsTrigger value="exercises" className="flex items-center gap-1">
              <Brain className="w-4 h-4" />
              Упражнения
            </TabsTrigger>
            <TabsTrigger value="challenge" className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Челлендж
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Тест
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              Аналитика
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
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
                    <Button onClick={addChallengeDay} size="sm" className="bg-purple-600">
                      <Plus className="w-4 h-4 mr-1" />
                      Добавить день
                    </Button>
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
                    <Button onClick={addQuestion} size="sm" className="bg-red-600">
                      <Plus className="w-4 h-4 mr-1" />
                      Добавить вопрос
                    </Button>
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
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <h3 className="text-lg font-semibold mb-4">Аналитика и ответы студентов</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Раздел для просмотра ответов студентов и аналитики прохождения урока
                </p>
                <div className="bg-white p-4 rounded">
                  <p className="text-sm text-gray-500">Данные аналитики будут доступны после реализации системы сбора ответов студентов</p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t border-gray-200 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 hover:bg-gray-100"
          >
            <X className="w-4 h-4 mr-2" />
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
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
    </Dialog>
  );
};

export default LessonEditModal;

