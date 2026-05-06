// Leave Request API
import { apiClient } from './api-client';

// ===== TYPES =====

export type LeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL' | 'UNPAID' | 'MATERNITY' | 'OTHER';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
    ANNUAL: 'Nghỉ phép năm',
    SICK: 'Nghỉ ốm',
    PERSONAL: 'Việc cá nhân',
    UNPAID: 'Nghỉ không lương',
    MATERNITY: 'Thai sản',
    OTHER: 'Khác',
};

export const LEAVE_STATUS_CONFIG: Record<LeaveRequestStatus, { label: string; color: string; bg: string }> = {
    PENDING:   { label: 'Chờ duyệt',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
    APPROVED:  { label: 'Đã duyệt',   color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
    REJECTED:  { label: 'Từ chối',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
    CANCELLED: { label: 'Đã hủy',     color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
};

export interface LeaveRequest {
    id: string;
    employeeId: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    status: LeaveRequestStatus;
    approvedById: string | null;
    approvedAt: string | null;
    rejectReason: string | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
    Employee?: {
        id: string;
        fullName: string;
        employeeCode: string;
        Team?: { id: string; name: string; code: string } | null;
        Position?: { id: string; name: string } | null;
    };
    ApprovedBy?: {
        id: string;
        name: string | null;
        email: string;
    } | null;
}

export interface CreateLeaveRequestDto {
    employeeId: string;
    leaveType?: LeaveType;
    startDate: string;
    endDate: string;
    totalDays?: number;
    reason: string;
    note?: string;
}

export interface LeaveRequestFilters {
    employeeId?: string;
    status?: LeaveRequestStatus;
    fromDate?: string;
    toDate?: string;
    teamId?: string;
    page?: number;
    limit?: number;
}

export interface LeaveRequestPaginatedResponse {
    data: LeaveRequest[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

// ===== API =====

export const leaveRequestApi = {
    async getAll(filters?: LeaveRequestFilters): Promise<LeaveRequestPaginatedResponse> {
        const params = new URLSearchParams();
        if (filters?.employeeId) params.append('employeeId', filters.employeeId);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.fromDate) params.append('fromDate', filters.fromDate);
        if (filters?.toDate) params.append('toDate', filters.toDate);
        if (filters?.teamId) params.append('teamId', filters.teamId);
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit !== undefined) params.append('limit', String(filters.limit));
        const q = params.toString();
        const res = await apiClient.get<any>(`/leave-requests${q ? `?${q}` : ''}`);
        if (res && Array.isArray(res.data)) return res as LeaveRequestPaginatedResponse;
        if (Array.isArray(res)) return { data: res, meta: { total: res.length, page: 1, limit: res.length, totalPages: 1 } };
        return { data: [], meta: { total: 0, page: 1, limit: 0, totalPages: 0 } };
    },

    async getOne(id: string): Promise<LeaveRequest> {
        return apiClient.get<LeaveRequest>(`/leave-requests/${id}`);
    },

    async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
        return apiClient.post<LeaveRequest>('/leave-requests', dto);
    },

    async approve(id: string, approvedById: string, note?: string): Promise<LeaveRequest> {
        return apiClient.patch<LeaveRequest>(`/leave-requests/${id}/approve`, { approvedById, note });
    },

    async reject(id: string, approvedById: string, rejectReason: string): Promise<LeaveRequest> {
        return apiClient.patch<LeaveRequest>(`/leave-requests/${id}/reject`, { approvedById, rejectReason });
    },

    async cancel(id: string, employeeId: string): Promise<LeaveRequest> {
        return apiClient.patch<LeaveRequest>(`/leave-requests/${id}/cancel`, { employeeId });
    },

    async update(id: string, dto: Partial<CreateLeaveRequestDto>): Promise<LeaveRequest> {
        return apiClient.patch<LeaveRequest>(`/leave-requests/${id}`, dto);
    },

    async delete(id: string): Promise<void> {
        return apiClient.delete<void>(`/leave-requests/${id}`);
    },
};
