// Utility functions for backend URL configuration for standalone V2 project
export const getBackendUrl = () => {
  // For standalone V2 project, always use localhost:8000
  return 'http://localhost:8000';
};

export const getApiBaseUrl = () => {
  // For standalone V2 project, always use localhost:8000/api
  return 'http://localhost:8000/api';
};