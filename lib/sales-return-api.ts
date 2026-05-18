// Sales Returns API Client (Trả hàng bán)
import { apiClient } from './api-client';

// ===== TYPES =====

export type SalesReturnStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface SalesReturn {
    id: string;
    returnNumber: string;
    customerId?: string;
    warehouseId: string;
    returnDate: string;
    totalAmount?: number;
    status: SalesReturnStatus;
    note?: string;
    images?: any;
    createdAt: string;
    updatedAt: string;
    Customer?: { id: string; name: string; code: string };
    Warehouse?: { id: string; name: string; code: string };
    SalesReturnItem?: SalesReturnItem[];
}

export interface SalesReturnItem {
    id: string;
    returnId: string;
    productId: string;
    quantity: number;
    unitPrice?: number;
    reason?: string;
    createdAt: string;
    updatedAt: string;
    Product?: { id: string; name: string; code: string };
}

export interface SalesReturnFilters {
    status?: SalesReturnStatus;
    customerId?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
}

export interface CreateSalesReturnDto {
    customerId?: string;
    warehouseId: string;
    returnDate?: string;
    note?: string;
    images?: any;
    items: { productId: string; quantity: number; reason?: string }[];
}

const unwrap = <T>(res: any): T[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res as T[];
    for (const key of ['data', 'items', 'results']) {
        if (res[key] && Array.isArray(res[key])) return res[key] as T[];
    }
    return [];
};

// ===== API FUNCTIONS =====
// Correct base path: /sales/sales-returns (confirmed in API_ENDPOINTS.txt)

export const salesReturnApi = {
    getReturns: async (filters?: SalesReturnFilters): Promise<SalesReturn[]> => {
        const res = await apiClient.get<any>('/sales/returns', { params: filters });
        return unwrap<SalesReturn>(res);
    },

    getReturn: async (id: string): Promise<SalesReturn> => {
        return apiClient.get<SalesReturn>(`/sales/returns/${id}`);
    },

    createReturn: async (data: CreateSalesReturnDto): Promise<SalesReturn> => {
        return apiClient.post<SalesReturn>('/sales/returns', data);
    },

    updateReturn: async (id: string, data: Partial<CreateSalesReturnDto>): Promise<SalesReturn> => {
        return apiClient.patch<SalesReturn>(`/sales/returns/${id}`, data);
    },

    deleteReturn: async (id: string): Promise<void> => {
        return apiClient.delete<void>(`/sales/returns/${id}`);
    },

    confirmReturn: async (id: string): Promise<SalesReturn> => {
        return apiClient.post<SalesReturn>(`/sales/returns/${id}/confirm`);
    },
};
