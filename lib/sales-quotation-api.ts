// Sales Quotation API Client
import { apiClient } from './api-client';

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED' | 'CANCELLED';

export interface SalesQuotationItem {
    id: string;
    quotationId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    amount: number;
    note?: string;
    Product?: { id: string; name: string; code: string };
}

export interface SalesQuotation {
    id: string;
    quotationNumber: string;
    customerId: string;
    quotationDate: string;
    validUntil?: string;
    status: QuotationStatus;
    totalAmount: number;
    discount: number;
    tax: number;
    note?: string;
    terms?: string;
    orderId?: string;
    createdAt: string;
    updatedAt: string;
    Customer?: { id: string; name: string; code: string };
    SalesQuotationItem?: SalesQuotationItem[];
}

export const salesQuotationApi = {
    getAll: async (): Promise<SalesQuotation[]> =>
        apiClient.get<SalesQuotation[]>('/sales/quotations'),

    getOne: async (id: string): Promise<SalesQuotation> =>
        apiClient.get<SalesQuotation>(`/sales/quotations/${id}`),

    create: async (data: Partial<SalesQuotation>): Promise<SalesQuotation> =>
        apiClient.post<SalesQuotation>('/sales/quotations', data),

    update: async (id: string, data: Partial<SalesQuotation>): Promise<SalesQuotation> =>
        apiClient.patch<SalesQuotation>(`/sales/quotations/${id}`, data),

    delete: async (id: string): Promise<void> =>
        apiClient.delete<void>(`/sales/quotations/${id}`),

    send: async (id: string): Promise<SalesQuotation> =>
        apiClient.post<SalesQuotation>(`/sales/quotations/${id}/send`, {}),

    accept: async (id: string): Promise<SalesQuotation> =>
        apiClient.post<SalesQuotation>(`/sales/quotations/${id}/accept`, {}),

    reject: async (id: string): Promise<SalesQuotation> =>
        apiClient.post<SalesQuotation>(`/sales/quotations/${id}/reject`, {}),

    convert: async (id: string): Promise<SalesQuotation> =>
        apiClient.post<SalesQuotation>(`/sales/quotations/${id}/convert`, {}),
};
