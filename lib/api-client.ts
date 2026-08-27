// API Client with JWT authentication
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { secureStorage } from './secure-storage';
import { isMissingCallLogTableApiError } from './call-error';
import { isMissingChatTableApiError } from './chat-error';

// Types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name?: string;
}

export interface VerifyEmailRequest {
    email: string;
    code: string;
}

export interface ResetPasswordRequest {
    email: string;
    code: string;
    newPassword: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user: User;
}

export interface User {
    id: string;
    email: string;
    name?: string;
    role: 'ADMIN' | 'MANAGER' | 'USER';
    isActive: boolean;

    // When backend links User  Employee (required for login), it may include employeeId
    employeeId?: string;

    createdAt: string;
    updatedAt: string;
}

// Base API URL
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.tinphatmetech.online';

export function buildApiUrl(path?: string | null): string | undefined {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
}

// Extract user-friendly error message
export function getErrorMessage(error: any, fallback: string): string {
    if (error?.response?.data?.message) {
        return error.response.data.message;
    }
    if (error?.response?.status === 401) {
        return 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại';
    }
    if (error?.response?.status === 403) {
        return 'Bạn không có quyền thực hiện hành động này';
    }
    if (error?.response?.status === 404) {
        return 'Dữ liệu không tồn tại';
    }
    if (error?.response?.status === 429) {
        return 'Quá nhiều yêu cầu, vui lòng thử lại sau';
    }
    if (error?.response?.status >= 500) {
        return 'Lỗi máy chủ, vui lòng thử lại sau';
    }
    if (error?.code === 'ECONNABORTED') {
        return 'Kết nối bị timeout, vui lòng kiểm tra mạng';
    }
    if (error?.code === 'ERR_NETWORK' || !error?.response) {
        const platform = Platform.OS === 'android' ? 'Android' : Platform.OS === 'ios' ? 'iOS' : 'Web';
        return `Không thể kết nối đến máy chủ (${platform}). Vui lòng kiểm tra kết nối mạng hoặc liên hệ IT.`;
    }
    return fallback;
}

class ApiClient {
    private client: AxiosInstance;
    private isRefreshing = false;
    private failedQueue: Array<{
        resolve: (value?: any) => void;
        reject: (error?: any) => void;
    }> = [];

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log(`[API Client] Initialized with base URL: ${API_BASE_URL}`);

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor: Attach JWT token
        this.client.interceptors.request.use(
            async (config) => {
                // Don't attach Authorization header for public auth endpoints
                // (some backends run auth guards globally and will 401 if an invalid token is provided)
                const url = config.url || '';
                const isPublicAuthEndpoint =
                    url.includes('/auth/login') ||
                    url.includes('/auth/register') ||
                    url.includes('/auth/verify-email') ||
                    url.includes('/auth/resend-verification') ||
                    url.includes('/auth/forgot-password') ||
                    url.includes('/auth/reset-password') ||
                    url.includes('/auth/refresh');

                if (!isPublicAuthEndpoint) {
                    try {
                        const token = await secureStorage.getToken();
                        if (token && config.headers) {
                            config.headers.Authorization = `Bearer ${token}`;
                        }
                    } catch {
                        // Secure storage may not work on web
                    }
                }

                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor: Handle 401 and token refresh
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
                const status = error.response?.status;
                const url = originalRequest?.url;

                // Log all API errors for debugging
                if (
                    url &&
                    !url.includes('/auth/refresh') &&
                    !isMissingCallLogTableApiError(error) &&
                    !isMissingChatTableApiError(error)
                ) {
                    console.warn(`[API Error] ${status || 'NETWORK'} ${url}: ${error.message}`, error.code);
                }

                const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                    originalRequest.url?.includes('/auth/register') ||
                    originalRequest.url?.includes('/auth/refresh');

                if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
                    if (this.isRefreshing) {
                        return new Promise((resolve, reject) => {
                            this.failedQueue.push({ resolve, reject });
                        })
                            .then((token) => {
                                if (originalRequest.headers) {
                                    originalRequest.headers.Authorization = `Bearer ${token}`;
                                }
                                return this.client(originalRequest);
                            })
                            .catch((err) => Promise.reject(err));
                    }

                    originalRequest._retry = true;
                    this.isRefreshing = true;

                    try {
                        const refreshToken = await secureStorage.getRefreshToken();
                        if (!refreshToken) throw new Error('No refresh token');

                        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                            refresh_token: refreshToken,
                        });

                        const { access_token, refresh_token } = response.data;
                        await secureStorage.setToken(access_token);
                        await secureStorage.setRefreshToken(refresh_token);

                        this.failedQueue.forEach((promise) => promise.resolve(access_token));
                        this.failedQueue = [];

                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${access_token}`;
                        }

                        return this.client(originalRequest);
                    } catch (refreshError) {
                        this.failedQueue.forEach((promise) => promise.reject(refreshError));
                        this.failedQueue = [];
                        await secureStorage.clearAll();
                        return Promise.reject(refreshError);
                    } finally {
                        this.isRefreshing = false;
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    // ===== Auth endpoints =====
    async login(data: LoginRequest): Promise<AuthResponse> {
        const response = await this.client.post<AuthResponse>('/auth/login', data);
        const { access_token, refresh_token } = response.data;
        await secureStorage.setToken(access_token);
        await secureStorage.setRefreshToken(refresh_token);
        return response.data;
    }

    async register(data: RegisterRequest): Promise<{ message: string }> {
        const response = await this.client.post<{ message: string }>('/auth/register', data);
        return response.data;
    }

    async verifyEmail(data: VerifyEmailRequest): Promise<{ message: string }> {
        const response = await this.client.post<{ message: string }>('/auth/verify-email', data);
        return response.data;
    }

    async resendVerification(email: string): Promise<{ message: string }> {
        const response = await this.client.post<{ message: string }>('/auth/resend-verification', { email });
        return response.data;
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        const response = await this.client.post<{ message: string }>('/auth/forgot-password', { email });
        return response.data;
    }

    async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
        const response = await this.client.post<{ message: string }>('/auth/reset-password', data);
        return response.data;
    }

    async getMe(): Promise<User> {
        const response = await this.client.get<User>('/auth/me');
        return response.data;
    }

    async getProfile(): Promise<User> {
        const response = await this.client.get<User>('/auth/profile');
        return response.data;
    }

    async logout(refreshToken: string): Promise<{ message: string }> {
        const response = await this.client.post<{ message: string }>('/auth/logout', { refresh_token: refreshToken });
        await secureStorage.clearAll();
        return response.data;
    }

    async logoutAll(): Promise<{ message: string }> {
        const response = await this.client.post<{ message: string }>('/auth/logout-all');
        await secureStorage.clearAll();
        return response.data;
    }

    // ===== Generic request methods =====
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.get<T>(url, config);
        return response.data;
    }

    async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.post<T>(url, data, config);
        return response.data;
    }

    async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.put<T>(url, data, config);
        return response.data;
    }

    async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.patch<T>(url, data, config);
        return response.data;
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.delete<T>(url, config);
        return response.data;
    }
}

export const apiClient = new ApiClient();
export default apiClient;
