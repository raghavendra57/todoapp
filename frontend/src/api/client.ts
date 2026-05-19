import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true, // important for sending cookies
});

// Response interceptor to handle 401s (e.g., token expired, need to re-login or refresh)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // In a real app with refresh tokens, you'd try to refresh here.
      // For this demo, we can just let the frontend know it's unauthorized
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
