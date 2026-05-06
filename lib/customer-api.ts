// Customer API Client
import { apiClient } from './api-client';

export interface Customer {
    id: string;
    code: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxCode?: string;
    createdAt: string;
    updatedAt: string;
}

export const customerApi = {
    getAll: async (): Promise<Customer[]> => {
        return apiClient.get<Customer[]>('/sales/customers');
    },
    getOne: async (id: string): Promise<Customer> => {
        return apiClient.get<Customer>(`/sales/customers/${id}`);
    },
    create: async (data: Partial<Customer>): Promise<Customer> => {
        return apiClient.post<Customer>('/sales/customers', data);
    },
    update: async (id: string, data: Partial<Customer>): Promise<Customer> => {
        return apiClient.patch<Customer>(`/sales/customers/${id}`, data);
    },
    delete: async (id: string): Promise<void> => {
        return apiClient.delete<void>(`/sales/customers/${id}`);
    },
};
