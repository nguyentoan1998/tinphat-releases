// Sales Invoices API Client (Hóa đơn bán hàng)
import { apiClient } from './api-client';

// ===== TYPES =====

export type InvoiceStatus = 'PENDING' | 'APPROVED';

export interface Invoice {
    id: string;
    invoiceNumber: string;
    orderId: string;
    warehouseId: string;
    amount: number;
    paidAmount: number;
    paid: boolean;
    status: InvoiceStatus;
    images?: any;
    createdAt: string;
    updatedAt: string;
    Order?: {
        id: string;
        orderNumber: string;
        Customer?: {
            id: string;
            name: string;
        };
    };
    Warehouse?: {
        id: string;
        name: string;
        code: string;
    };
    InvoiceItem?: InvoiceItem[];
}

export interface InvoiceItem {
    id: string;
    invoiceId: string;
    productId: string;
    quantity: number;
    price: number;
    amount: number;
    createdAt: string;
    updatedAt: string;
    Product?: {
        id: string;
        name: string;
    };
}

export interface InvoiceFilters {
    status?: InvoiceStatus;
    orderId?: string;
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
}

export interface CreateInvoiceDto {
    orderId: string;
    warehouseId: string;
    images?: any;
    items?: {
        productId: string;
        quantity: number;
        price: number;
    }[];
}

// ===== API FUNCTIONS =====

export const salesInvoiceApi = {
    getInvoices: async (filters?: InvoiceFilters): Promise<Invoice[]> => {
        return apiClient.get<Invoice[]>('/sales/invoices', { params: filters });
    },

    getInvoice: async (id: string): Promise<Invoice> => {
        return apiClient.get<Invoice>(`/sales/invoices/${id}`);
    },

    createInvoice: async (data: CreateInvoiceDto): Promise<Invoice> => {
        return apiClient.post<Invoice>('/sales/invoices', data);
    },

    updateInvoice: async (id: string, data: Partial<CreateInvoiceDto>): Promise<Invoice> => {
        return apiClient.patch<Invoice>(`/sales/invoices/${id}`, data);
    },

    deleteInvoice: async (id: string): Promise<void> => {
        return apiClient.delete<void>(`/sales/invoices/${id}`);
    },

    confirmInvoice: async (id: string): Promise<Invoice> => {
        return apiClient.post<Invoice>(`/sales/invoices/${id}/confirm`);
    },
};
