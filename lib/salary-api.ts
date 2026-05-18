// Salary Management API (Lương nhân viên)
import { apiClient } from './api-client';

// ===== TYPES =====

export type SalaryStatus = 'PENDING' | 'APPROVED' | 'PAID';

export interface Salary {
    id: string;
    employeeId: string;
    month: number;
    year: number;
    baseSalary: number;
    outputSalary: number;
    bonus: number;
    deduction: number;
    totalSalary: number;
    workHours?: number;
    status: SalaryStatus;
    paidDate?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
    Employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
        Position?: {
            id: string;
            name: string;
        };
        Team?: {
            id: string;
            name: string;
        };
    };
}

export interface SalaryFilters {
    month?: number;
    year?: number;
    status?: SalaryStatus;
    employeeId?: string;
}

export interface CalculateSalariesDto {
    month: number;
    year: number;
}

// ===== API FUNCTIONS =====

export const salaryApi = {
    async getSalaries(filters?: SalaryFilters): Promise<Salary[]> {
        const params = new URLSearchParams();
        if (filters?.month) params.append('month', filters.month.toString());
        if (filters?.year) params.append('year', filters.year.toString());
        if (filters?.status) params.append('status', filters.status);
        if (filters?.employeeId) params.append('employeeId', filters.employeeId);

        const queryString = params.toString();
        return apiClient.get<Salary[]>(`/payroll/salaries${queryString ? `?${queryString}` : ''}`);
    },

    async getSalaryDetail(id: string): Promise<Salary> {
        return apiClient.get<Salary>(`/payroll/salaries/${id}`);
    },

    async calculateSalaries(data: CalculateSalariesDto): Promise<Salary[]> {
        return apiClient.post<Salary[]>('/payroll/salaries/calculate', data);
    },

    async updateSalary(id: string, data: Partial<Salary>): Promise<Salary> {
        return apiClient.patch<Salary>(`/payroll/salaries/${id}`, data);
    },

    async deleteSalary(id: string): Promise<void> {
        return apiClient.delete<void>(`/payroll/salaries/${id}`);
    },
};
