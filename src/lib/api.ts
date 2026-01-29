import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Add a request interceptor to include the Auth Token
api.interceptors.request.use(
    (config) => {
        const session = sessionStorage.getItem('taskflow_user');
        if (session) {
            try {
                const { token } = JSON.parse(session);
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch {
                sessionStorage.removeItem('taskflow_user');
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
