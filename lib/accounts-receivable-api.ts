// Accounts Receivable API Client (Công nợ phải thu)
import { apiClient } from './api-client';

// ===== TYPES =====

export type ARStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface AccountReceivable {
    id: string;
    customerId: string;
    orderId?: string;
    amount: number;
    paidAmount: number;
    dueDate?: string;
    status: ARStatus;
    createdAt: string;
    updatedAt: string;
    Customer?: {
        id: string;
        name: string;
        code: string;
    };
    Order?: {
        id: string;
        orderNumber: string;
    };
    ARPayment?: ARPayment[];
}

export interface ARPayment {
    id: string;
    receivableId: string;
    paymentDate: string;
    amount: number;
    paymentMethod?: string;
    note?: string;
    createdAt: string;
}

export interface AccountsReceivableFilters {
    status?: ARStatus;
    customerId?: string;
    fromDate?: string;
    toDate?: string;
}

export interface ARSummary {
    totalUnpaid: number;
    totalPartial: number;
    totalPaid: number;
    totalAmount: number;
    totalPaidAmount: number;
    overdueCount: number;
}

export interface CreateARPaymentDto {
    amount: number;
    paymentDate?: string;
    paymentMethod?: string;
    note?: string;
}

// ===== API FUNCTIONS =====

export const accountsReceivableApi = {
    getReceivables: async (filters?: AccountsReceivableFilters): Promise<AccountReceivable[]> => {
        const params: Record<string, any> = { limit: 0, ...filters };
        const res = await apiClient.get<any>('/sales/accounts-receivable', { params });
        // Backend trả về paginated response { data: [...], meta: {...} }
        return Array.isArray(res) ? res : (res?.data ?? []);
    },

    getSummary: async (): Promise<ARSummary> => {
        return apiClient.get<ARSummary>('/sales/accounts-receivable/summary');
    },

    getReceivable: async (id: string): Promise<AccountReceivable> => {
        return apiClient.get<AccountReceivable>(`/sales/accounts-receivable/${id}`);
    },

    recordPayment: async (id: string, payment: CreateARPaymentDto): Promise<AccountReceivable> => {
        return apiClient.post<AccountReceivable>(`/sales/accounts-receivable/${id}/payments`, payment);
    },
};
