import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

// Компоненты только для системы обучения V2
import LearningSystemV2 from './components/LearningSystemV2';
import AdminPanelV2 from './components/AdminPanelV2';
import UserDashboardV2 from './components/UserDashboardV2';
import MainDashboardV2 from './components/MainDashboardV2';
import { AuthProvider } from './components/AuthContextV2';

function AppLearningV2() {
  return (
    <AuthProvider>
      <div className="App min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <BrowserRouter>
          <Routes>
            {/* Главная страница - лендинг с входом */}
            <Route path="/" element={<MainDashboardV2 />} />

            {/* Dashboard для системы обучения V2 */}
            <Route path="/dashboard" element={<UserDashboardV2 />} />

            {/* Система обучения V2 */}
            <Route path="/learning-v2" element={<LearningSystemV2 />} />
            <Route path="/learning-v2/lesson/:lessonId" element={<LearningSystemV2 />} />

            {/* Админ-панель только для уроков V2 */}
            <Route path="/admin-v2" element={<AdminPanelV2 />} />

            {/* Редирект всех остальных маршрутов */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default AppLearningV2;
