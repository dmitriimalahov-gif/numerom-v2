const getWindowBackendUrl = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.__LEARNING_V2_BACKEND_URL__) {
    return window.__LEARNING_V2_BACKEND_URL__;
  }

  const metaTag = document.querySelector('meta[name="learning-v2-backend-url"]');
  if (metaTag?.content) {
    return metaTag.content;
  }

  return null;
};

const getEnvBackendUrl = () => {
  if (typeof process !== 'undefined' && process?.env) {
    if (process.env.REACT_APP_LEARNING_V2_BACKEND_URL) {
      return process.env.REACT_APP_LEARNING_V2_BACKEND_URL;
    }
    if (process.env.LEARNING_V2_BACKEND_URL) {
      return process.env.LEARNING_V2_BACKEND_URL;
    }
  }
  return null;
};

export const getBackendUrl = () => {
  const runtimeUrl = getWindowBackendUrl();
  if (runtimeUrl) return runtimeUrl.replace(/\/$/, '');

  const envUrl = getEnvBackendUrl();
  if (envUrl) return envUrl.replace(/\/$/, '');

  return 'http://localhost:8000';
};

export const getApiBaseUrl = () => {
  const backendUrl = getBackendUrl();
  if (backendUrl.endsWith('/api')) {
    return backendUrl;
  }
  return `${backendUrl}/api`;
};