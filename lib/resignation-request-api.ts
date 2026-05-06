// Resignation Request API — Đơn xin nghỉ việc
import { apiClient } from './api-client';

export type ResignationRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export const RESIGNATION_STATUS_CONFIG: Record<ResignationRequestStatus, { label: string; color: string; bg: string }> = {
    PENDING:   { label: 'Chờ duyệt', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
    APPROVED:  { label: 'Đã duyệt',  color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
    REJECTED:  { label: 'Từ chối',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
    CANCELLED: { label: 'Đã hủy',    color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
};

export interface ResignationRequest {
    id: string;
    employeeId: string;
    lastWorkingDate: string;
    reason: string;
    status: ResignationRequestStatus;
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
    ApprovedBy?: { id: string; name: string | null; email: string } | null;
}

export interface CreateResignationRequestDto {
    employeeId: string;
    lastWorkingDate: string;
    reason: string;
    note?: string;
}

export interface ResignationRequestFilters {
    employeeId?: string;
    status?: ResignationRequestStatus;
    fromDate?: string;
    toDate?: string;
    teamId?: string;
    page?: number;
    limit?: number;
}

export interface ResignationPaginatedResponse {
    data: ResignationRequest[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export const resignationRequestApi = {
    async getAll(filters?: ResignationRequestFilters): Promise<ResignationPaginatedResponse> {
        const params = new URLSearchParams();
        if (filters?.employeeId) params.append('employeeId', filters.employeeId);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.fromDate) params.append('fromDate', filters.fromDate);
        if (filters?.toDate) params.append('toDate', filters.toDate);
        if (filters?.teamId) params.append('teamId', filters.teamId);
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit !== undefined) params.append('limit', String(filters.limit));
        const q = params.toString();
        const res = await apiClient.get<any>(`/resignation-requests${q ? `?${q}` : ''}`);
        if (res && Array.isArray(res.data)) return res as ResignationPaginatedResponse;
        if (Array.isArray(res)) return { data: res, meta: { total: res.length, page: 1, limit: res.length, totalPages: 1 } };
        return { data: [], meta: { total: 0, page: 1, limit: 0, totalPages: 0 } };
    },

    async create(dto: CreateResignationRequestDto): Promise<ResignationRequest> {
        return apiClient.post<ResignationRequest>('/resignation-requests', dto);
    },

    async update(id: string, dto: Partial<CreateResignationRequestDto>): Promise<ResignationRequest> {
        return apiClient.patch<ResignationRequest>(`/resignation-requests/${id}`, dto);
    },

    async approve(id: string, approvedById: string, note?: string): Promise<ResignationRequest> {
        return apiClient.patch<ResignationRequest>(`/resignation-requests/${id}/approve`, { approvedById, note });
    },

    async reject(id: string, approvedById: string, rejectReason: string): Promise<ResignationRequest> {
        return apiClient.patch<ResignationRequest>(`/resignation-requests/${id}/reject`, { approvedById, rejectReason });
    },

    async cancel(id: string, employeeId: string): Promise<ResignationRequest> {
        return apiClient.patch<ResignationRequest>(`/resignation-requests/${id}/cancel`, { employeeId });
    },

    async delete(id: string): Promise<void> {
        return apiClient.delete<void>(`/resignation-requests/${id}`);
    },
};
