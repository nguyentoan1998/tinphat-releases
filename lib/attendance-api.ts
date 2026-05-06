// Attendance API — aligned with backend /payroll/attendance
import { apiClient } from './api-client';

// ===== TYPES =====

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';

export interface AttendanceRecord {
    id: string;
    employeeId: string;
    date: string;
    mark: string | null;
    workHours: number;
    overtimeHours: number;
    status: AttendanceStatus;
    note: string | null;
    createdAt: string;
    updatedAt: string;
    Employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
        teamId?: string | null;
        Team?: { id: string; name: string; code: string } | null;
    };
}

export interface AttendanceFilters {
    employeeId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
}

export interface AttendancePaginatedResponse {
    data: AttendanceRecord[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// ===== API =====

export const attendanceApi = {
    async getAttendance(filters?: AttendanceFilters): Promise<AttendancePaginatedResponse> {
        const params = new URLSearchParams();
        if (filters?.employeeId) params.append('employeeId', filters.employeeId);
        if (filters?.fromDate) params.append('fromDate', filters.fromDate);
        if (filters?.toDate) params.append('toDate', filters.toDate);
        if (filters?.page) params.append('page', String(filters.page));
        // limit=0 → fetch all for a month
        if (filters?.limit !== undefined) params.append('limit', String(filters.limit));
        const q = params.toString();
        const res = await apiClient.get<any>(`/payroll/attendance${q ? `?${q}` : ''}`);
        // Backend returns { data: [...], meta: {...} }
        if (res && Array.isArray(res.data)) return res as AttendancePaginatedResponse;
        if (Array.isArray(res)) return { data: res, meta: { total: res.length, page: 1, limit: res.length, totalPages: 1 } };
        return { data: [], meta: { total: 0, page: 1, limit: 0, totalPages: 0 } };
    },
};
