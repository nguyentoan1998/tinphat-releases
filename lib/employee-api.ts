// Employee Management API
import { apiClient } from './api-client';

// ===== TYPES =====

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Employee {
    id: string;
    userId: string;
    employeeCode: string;
    fullName: string;
    teamId: string | null;
    positionId: string | null;
    hireDate: string | null;
    status: EmployeeStatus;
    image: string | null;
    address: string | null;
    phone: string | null;
    nationalId: string | null;
    idCardImages: { front?: string; back?: string } | null;
    createdAt: string;
    updatedAt: string;
    User?: {
        email: string;
        role: string;
    };
    Team?: {
        id: string;
        name: string;
        code: string;
    } | null;
    Position?: {
        id: string;
        name: string;
        code: string;
        baseSalary?: number;
    } | null;
    // Extended fields (server may return these)
    gender?: Gender | null;
    birthDate?: string | null;
    position?: string | null;
    department?: string | null;
    idCard?: string | null;
}

export interface CreateEmployeeDto {
    userId: string;
    employeeCode: string;
    fullName: string;
    teamId?: string;
    positionId?: string;
    hireDate?: string;
    status?: EmployeeStatus;
    image?: string;
    address?: string;
    phone?: string;
    nationalId?: string;
    idCardImages?: { front?: string; back?: string };
}

export interface UpdateEmployeeDto {
    employeeCode?: string;
    fullName?: string;
    teamId?: string;
    positionId?: string;
    hireDate?: string;
    status?: EmployeeStatus;
    image?: string;
    address?: string;
    phone?: string;
    nationalId?: string;
    idCardImages?: { front?: string; back?: string };
    gender?: Gender;
    birthDate?: string;
}

// ===== API FUNCTIONS =====

export const employeeApi = {
    async getEmployeeById(id: string): Promise<Employee> {
        return apiClient.get<Employee>(`/employees/${id}`);
    },

    async getEmployees(): Promise<Employee[]> {
        const raw = await apiClient.get<Employee[] | { data: Employee[]; total?: number }>('/employees?limit=0');
        if (Array.isArray(raw)) return raw;
        if (raw && Array.isArray((raw as any).data)) return (raw as any).data;
        return [];
    },

    async getEmployeeDetail(id: string): Promise<Employee> {
        return apiClient.get<Employee>(`/employees/${id}`);
    },

    async createEmployee(data: CreateEmployeeDto): Promise<Employee> {
        return apiClient.post<Employee>('/employees', data);
    },

    async updateEmployee(id: string, data: UpdateEmployeeDto): Promise<Employee> {
        return apiClient.patch<Employee>(`/employees/${id}`, data);
    },

    async deleteEmployee(id: string): Promise<void> {
        return apiClient.delete<void>(`/employees/${id}`);
    },
};
