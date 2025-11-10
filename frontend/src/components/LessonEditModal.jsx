import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Edit, Save, X, Plus, Trash2, BookOpen, Brain, Users, FileText, BarChart3 } from 'lucide-react';

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
                <Button onClick={addTheoryBlock} size="sm" className="bg-blue-600">
                  <Plus className="w-4 h-4 mr-1" />
                  Добавить блок
                </Button>
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
                <Button onClick={addExercise} size="sm" className="bg-green-600">
                  <Plus className="w-4 h-4 mr-1" />
                  Добавить упражнение
                </Button>
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
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold mb-4">Челлендж</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Функционал редактирования челленджа будет добавлен в следующей версии
                </p>
                {editedLesson.challenge && (
                  <div className="bg-white p-3 rounded">
                    <p className="text-sm"><strong>Длительность:</strong> {editedLesson.challenge.duration_days} дней</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ТЕСТ */}
            <TabsContent value="quiz" className="space-y-4 mt-0">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="text-lg font-semibold mb-4">Тест</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Функционал редактирования теста будет добавлен в следующей версии
                </p>
                {editedLesson.quiz && (
                  <div className="bg-white p-3 rounded">
                    <p className="text-sm"><strong>Вопросов:</strong> {editedLesson.quiz.questions?.length || 0}</p>
                  </div>
                )}
              </div>
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

