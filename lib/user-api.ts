// User Management API — uses shared apiClient for consistent URL/auth/retry
import { apiClient } from './api-client';

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface AppUser {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateUserDto {
    email: string;
    password: string;
    name?: string;
    role: UserRole;
    isActive?: boolean;
}

export interface UpdateUserDto {
    email?: string;
    name?: string;
    role?: UserRole;
    isActive?: boolean;
}

export const userApi = {
    getAll: async (): Promise<AppUser[]> => {
        const raw = await apiClient.get<AppUser[] | { data: AppUser[] }>('/users');
        if (Array.isArray(raw)) return raw;
        if (raw && Array.isArray((raw as any).data)) return (raw as any).data;
        return [];
    },
    getOne: (id: string) => apiClient.get<AppUser>(`/users/${id}`),
    create: (dto: CreateUserDto) => apiClient.post<AppUser>('/users', dto),
    update: (id: string, dto: UpdateUserDto) => apiClient.patch<AppUser>(`/users/${id}`, dto),
    toggleStatus: (id: string) => apiClient.patch<AppUser>(`/users/${id}/toggle-status`, {}),
    delete: (id: string) => apiClient.delete<void>(`/users/${id}`),
};
