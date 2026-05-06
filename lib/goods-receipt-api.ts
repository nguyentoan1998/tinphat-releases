// Goods Receipt API Client (Phiếu nhập kho - Purchasing)
import { apiClient } from './api-client';

// ===== TYPES =====

export type GoodsReceiptStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface GoodsReceipt {
    id: string;
    receiptNumber: string;
    purchaseOrderId?: string;
    warehouseId?: string;
    supplierId?: string;
    receiptDate: string;
    note?: string;
    images?: any;
    discount: number;
    tax: number;
    status: GoodsReceiptStatus;
    createdAt: string;
    updatedAt: string;
    PurchaseOrder?: {
        id: string;
        poNumber: string;
    };
    Warehouse?: {
        id: string;
        name: string;
        code: string;
    };
    Supplier?: {
        id: string;
        name: string;
        code: string;
    };
    GoodsReceiptItem?: GoodsReceiptItem[];
}

export interface GoodsReceiptItem {
    id: string;
    receiptId: string;
    productId: string;
    quantity: number;
    actualQty: number;
    unitPrice: number;
    createdAt: string;
    updatedAt: string;
    Product?: {
        id: string;
        name: string;
        code: string;
    };
}

export interface GoodsReceiptFilters {
    status?: GoodsReceiptStatus;
    warehouseId?: string;
    supplierId?: string;
    startDate?: string;
    endDate?: string;
}

export interface CreateGoodsReceiptDto {
    purchaseOrderId?: string;
    warehouseId?: string;
    supplierId?: string;
    receiptDate?: string;
    note?: string;
    discount?: number;
    tax?: number;
    images?: any;
    items: {
        productId: string;
        quantity: number;
        actualQty?: number;
        unitPrice?: number;
    }[];
}

// ===== API FUNCTIONS =====

export const goodsReceiptApi = {
    getReceipts: async (filters?: GoodsReceiptFilters): Promise<GoodsReceipt[]> => {
        return apiClient.get<GoodsReceipt[]>('/purchasing/receipts', { params: filters });
    },

    getReceipt: async (id: string): Promise<GoodsReceipt> => {
        return apiClient.get<GoodsReceipt>(`/purchasing/receipts/${id}`);
    },

    createReceipt: async (data: CreateGoodsReceiptDto): Promise<GoodsReceipt> => {
        return apiClient.post<GoodsReceipt>('/purchasing/receipts', data);
    },

    updateReceipt: async (id: string, data: Partial<CreateGoodsReceiptDto>): Promise<GoodsReceipt> => {
        return apiClient.patch<GoodsReceipt>(`/purchasing/receipts/${id}`, data);
    },

    deleteReceipt: async (id: string): Promise<void> => {
        return apiClient.delete<void>(`/purchasing/receipts/${id}`);
    },

    confirmReceipt: async (id: string): Promise<GoodsReceipt> => {
        return apiClient.post<GoodsReceipt>(`/purchasing/receipts/${id}/confirm`);
    },

    revertReceipt: async (id: string): Promise<GoodsReceipt> => {
        return apiClient.post<GoodsReceipt>(`/purchasing/receipts/${id}/revert`);
    },

    cancelReceipt: async (id: string): Promise<GoodsReceipt> => {
        return apiClient.post<GoodsReceipt>(`/purchasing/receipts/${id}/cancel`);
    },

    addItems: async (id: string, items: CreateGoodsReceiptDto['items']): Promise<GoodsReceipt> => {
        return apiClient.post<GoodsReceipt>(`/purchasing/receipts/${id}/items`, { items });
    },

    removeItem: async (id: string, itemId: string): Promise<void> => {
        return apiClient.delete<void>(`/purchasing/receipts/${id}/items/${itemId}`);
    },
};
