import axios from 'axios';
import { authStore } from './auth-store';

// 1. Buat Instance Axios dengan Base URL bawaan
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// 2. REQUEST INTERCEPTOR: Menyelipkan Token
api.interceptors.request.use(
  (config) => {
    // Pastikan kode hanya berjalan di browser (Client-Side), bukan di server Next.js (SSR)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('bksda_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. RESPONSE INTERCEPTOR: Menangani Error 401 & 403 (Sesuai Rule 7.3)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Tangkap kode HTTP dari error balasan Laravel
    const status = error.response?.status;

    if (status === 401) {
      // 401 Unauthenticated: Token habis / tidak valid. 
      // Hapus token dan tendang user ke halaman login.
      if (typeof window !== 'undefined') {
        authStore.logout(); // <-- Panggil fungsi logout dari store
        
        // Jangan redirect jika posisinya memang sudah di /login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    } else if (status === 403) {
      // 403 Forbidden: User login, tapi tidak punya hak akses ke modul tertentu
      console.error('Forbidden: Hak akses ditolak.');
      // Untuk 403, cukup log error saja. Frontend UI yang menembak fungsi ini 
      // akan menampilkan Toast/Alert dengan membaca message dari error.
    }

    return Promise.reject(error);
  }
);
