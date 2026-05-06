// Material Requests API Client (Yêu cầu xuất kho vật tư)
import { apiClient } from './api-client';

// ===== TYPES =====

export type RequestStatus = 'PENDING' | 'APPROVED' | 'FULFILLED' | 'REJECTED';

export interface MaterialRequest {
    id: string;
    requestNumber: string;
    requestDate: string;
    status: RequestStatus;
    note?: string;
    warehouseId?: string;
    createdAt: string;
    updatedAt: string;
    Warehouse?: {
        id: string;
        name: string;
        code: string;
    };
    MaterialRequestItem?: MaterialRequestItem[];
    MaterialRequestOrder?: MaterialRequestOrder[];
}

export interface MaterialRequestItem {
    id: string;
    requestId: string;
    productId: string;
    requiredQty: number;
    availableQty: number;
    requestQty: number;
    issuedQty: number;
    shortageQty: number;
    createdAt: string;
    updatedAt: string;
    Product?: {
        id: string;
        name: string;
        code: string;
    };
}

export interface MaterialRequestOrder {
    id: string;
    materialRequestId: string;
    productionOrderId: string;
    createdAt: string;
    ProductionOrder?: {
        id: string;
        orderNumber: string;
    };
}

export interface MaterialRequestFilters {
    status?: RequestStatus;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
}

export interface CreateMaterialRequestDto {
    requestDate?: string;
    note?: string;
    warehouseId?: string;
    items?: {
        productId: string;
        requiredQty: number;
        requestQty: number;
    }[];
    productionOrderIds?: string[];
}

// ===== API FUNCTIONS =====

export const materialRequestApi = {
    getRequests: async (filters?: MaterialRequestFilters): Promise<MaterialRequest[]> => {
        return apiClient.get<MaterialRequest[]>('/production/material-requests', { params: filters });
    },

    getRequest: async (id: string): Promise<MaterialRequest> => {
        return apiClient.get<MaterialRequest>(`/production/material-requests/${id}`);
    },

    createRequest: async (data: CreateMaterialRequestDto): Promise<MaterialRequest> => {
        return apiClient.post<MaterialRequest>('/production/material-requests', data);
    },

    updateRequest: async (id: string, data: Partial<CreateMaterialRequestDto>): Promise<MaterialRequest> => {
        return apiClient.patch<MaterialRequest>(`/production/material-requests/${id}`, data);
    },

    deleteRequest: async (id: string): Promise<void> => {
        return apiClient.delete<void>(`/production/material-requests/${id}`);
    },
};
