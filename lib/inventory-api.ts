// Inventory API Client
import { apiClient } from './api-client';

// ===== TYPES =====

export type ProductType = 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_PRODUCT';
export type MovementType = 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';

// Product
export interface Product {
    id: string;
    code: string;
    name: string;
    description?: string;
    productType: ProductType;
    baseUnitId: string;
    categoryId?: string;
    image?: string;
    minimumQuantity: number;
    createdAt: string;
    updatedAt: string;
    MeasurementUnit?: MeasurementUnit;
    ProductCategory?: ProductCategory;
    UnitConversion?: UnitConversion[];
}

// Product Category
export interface ProductCategory {
    id: string;
    code: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

// Measurement Unit
export interface MeasurementUnit {
    id: string;
    code: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

// Unit Conversion
export interface UnitConversion {
    id: string;
    productId: string;
    fromUnitId: string;
    toUnitId: string;
    conversionRate: number;
    teamId?: string;
    createdAt?: string;
}

// Warehouse
export interface Warehouse {
    id: string;
    code: string;
    name: string;
    location?: string;
    createdAt: string;
    updatedAt: string;
}

// Stock
export interface Stock {
    id: string;
    warehouseId: string;
    productId: string;
    quantity: number;
    openingBalance: number;
    images?: any;
    createdAt: string;
    updatedAt: string;
    Product?: Product;
    Warehouse?: Warehouse;
}

// Stock Movement
export interface StockMovement {
    id: string;
    type: MovementType;
    warehouseId: string;
    productId: string;
    quantity: number;
    referenceId?: string;
    note?: string;
    images?: any;
    createdAt: string;
    Product?: Product;
    Warehouse?: Warehouse;
    RoutingStep?: {
        id: string;
        sequenceNo: number;
        productId: string;
        Operation?: {
            id: string;
            name: string;
        };
    };
}

// ===== DTOs =====

export interface CreateProductDto {
    code: string;
    name: string;
    description?: string;
    productType: ProductType;
    baseUnitId: string;
    categoryId?: string;
    image?: string;
    minimumQuantity?: number;
    salePrice?: number;
    salaryPrice?: number;
}

export interface UpdateStockDto {
    quantity?: number;
    openingBalance?: number;
}

export interface CreateStockMovementDto {
    type: MovementType;
    warehouseId: string;
    productId: string;
    quantity: number;
    referenceId?: string;
    note?: string;
    images?: any;
}

export interface CreateOutboundDto {
    type: 'OUT';
    warehouseId: string;
    productId: string;
    quantity: number;
    referenceId?: string;
    note?: string;
}

export interface CreateTransferDto {
    // Legacy: backend có thể không hỗ trợ đầy đủ TRANSFER/targetWarehouseId.
    // Giữ lại để tương thích ngược nếu server có field này.
    type: 'TRANSFER';
    warehouseId: string;
    targetWarehouseId?: string;
    productId: string;
    quantity: number;
    note?: string;
}

export interface CreateTransferVoucherItemDto {
    productId: string;
    quantity: number;
}

export interface CreateTransferVoucherDto {
    fromWarehouseId: string;
    toWarehouseId: string;
    items: CreateTransferVoucherItemDto[];
    note?: string;
}

export interface TransferVoucherItem {
    productId: string;
    quantity: number;
    Product?: Product;
}

export interface TransferVoucher {
    referenceId: string; // group id
    fromWarehouseId: string;
    toWarehouseId: string;
    items: TransferVoucherItem[];
    note?: string;
    createdAt: string;
    // Convenience relations (filled client-side when available)
    FromWarehouse?: Warehouse;
    ToWarehouse?: Warehouse;
}

export interface CreateUnitConversionDto {
    productId: string;
    fromUnitId: string;
    toUnitId: string;
    conversionRate: number;
    teamId?: string;
}

// ===== API FUNCTIONS =====

// Helper: backend responses sometimes wrap lists in { data: [...] } or { items: [...] }
const unwrapList = <T>(payload: any): T[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload as T[];

    if (typeof payload === 'object') {
        // common Nest/REST wrappers
        const candidates = [
            (payload as any).data,
            (payload as any).items,
            (payload as any).results,
            (payload as any).result,
            (payload as any).warehouses,
        ];

        for (const c of candidates) {
            if (!c) continue;
            const unwrapped = unwrapList<T>(c);
            if (unwrapped.length > 0) return unwrapped;
            // If wrapper exists but empty list, keep empty
            if (Array.isArray(c)) return [];
        }
    }

    return [];
};

export interface PagedResult<T> {
    items: T[];
    total?: number;
    page?: number;
    limit?: number;
    nextPage?: number | null;
}

// Helper: unwrap pagination shapes
const unwrapPaged = <T>(payload: any, page: number, limit: number): PagedResult<T> => {
    if (!payload) return { items: [], page, limit, nextPage: null };

    // Shape A: array only
    if (Array.isArray(payload)) {
        const items = payload as T[];
        return {
            items,
            page,
            limit,
            nextPage: items.length < limit ? null : page + 1,
        };
    }

    // Shape B: { items, total, page, limit }
    const items = unwrapList<T>((payload as any).items ?? (payload as any).data ?? (payload as any).results);
    const total = (payload as any).total ?? (payload as any).count ?? (payload as any).meta?.total;
    const currentPage = (payload as any).page ?? (payload as any).meta?.page ?? page;
    const currentLimit = (payload as any).limit ?? (payload as any).meta?.limit ?? limit;

    // Try common next page indicators
    const hasNext =
        (payload as any).hasNext ??
        (payload as any).meta?.hasNext ??
        ((typeof total === 'number') ? (currentPage * currentLimit < total) : undefined);

    const nextPageFromPayload = (payload as any).nextPage ?? (payload as any).meta?.nextPage;

    const nextPage =
        typeof nextPageFromPayload === 'number'
            ? nextPageFromPayload
            : hasNext === true
                ? currentPage + 1
                : (items.length < currentLimit ? null : currentPage + 1);

    return {
        items,
        total: typeof total === 'number' ? total : undefined,
        page: currentPage,
        limit: currentLimit,
        nextPage,
    };
};

export const inventoryApi = {
    // ===== Warehouses =====
    async getWarehouses(): Promise<Warehouse[]> {
        try {
            // Production currently exposes plural endpoint ("/warehouses")
            const res = await apiClient.get<any>('/warehouses');
            return unwrapList<Warehouse>(res);
        } catch (error: any) {
            // Backward compatibility: some envs may still mount singular "/warehouse".
            const status = error?.response?.status;
            const msg = error?.response?.data?.message || error?.message;
            const looksLikeMissingRoute = status === 404 || (typeof msg === 'string' && msg.includes('Cannot GET'));
            if (!looksLikeMissingRoute) throw error;

            const res2 = await apiClient.get<any>('/warehouse');
            return unwrapList<Warehouse>(res2);
        }
    },

    async getWarehouse(id: string): Promise<Warehouse> {
        try {
            return await apiClient.get<Warehouse>(`/warehouses/${id}`);
        } catch (error: any) {
            const status = error?.response?.status;
            const msg = error?.response?.data?.message || error?.message;
            const looksLikeMissingRoute = status === 404 || (typeof msg === 'string' && msg.includes('Cannot GET'));
            if (!looksLikeMissingRoute) throw error;
            return apiClient.get<Warehouse>(`/warehouse/${id}`);
        }
    },

    async createWarehouse(data: { code: string; name: string; location?: string }): Promise<Warehouse> {
        try {
            return await apiClient.post<Warehouse>('/warehouses', data);
        } catch (error: any) {
            const status = error?.response?.status;
            const msg = error?.response?.data?.message || error?.message;
            const looksLikeMissingRoute = status === 404 || (typeof msg === 'string' && msg.includes('Cannot POST'));
            if (!looksLikeMissingRoute) throw error;
            return apiClient.post<Warehouse>('/warehouse', data);
        }
    },

    async updateWarehouse(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
        try {
            return await apiClient.patch<Warehouse>(`/warehouses/${id}`, data);
        } catch (error: any) {
            const status = error?.response?.status;
            const msg = error?.response?.data?.message || error?.message;
            const looksLikeMissingRoute = status === 404 || (typeof msg === 'string' && msg.includes('Cannot PATCH'));
            if (!looksLikeMissingRoute) throw error;
            return apiClient.patch<Warehouse>(`/warehouse/${id}`, data);
        }
    },

    async deleteWarehouse(id: string): Promise<void> {
        try {
            return await apiClient.delete<void>(`/warehouses/${id}`);
        } catch (error: any) {
            const status = error?.response?.status;
            const msg = error?.response?.data?.message || error?.message;
            const looksLikeMissingRoute = status === 404 || (typeof msg === 'string' && msg.includes('Cannot DELETE'));
            if (!looksLikeMissingRoute) throw error;
            return apiClient.delete<void>(`/warehouse/${id}`);
        }
    },

    // ===== Products =====
    async getProducts(): Promise<Product[]> {
        const res = await apiClient.get<any>('/inventory/products');
        return unwrapList<Product>(res);
    },

    // Paginated product list with server-side search (q only — backend does not support productType filter)
    async getProductsPage(filters?: { q?: string; page?: number; limit?: number }): Promise<PagedResult<Product>> {
        const page = Math.max(1, Number(filters?.page ?? 1));
        const limit = Math.min(100, Math.max(1, Number(filters?.limit ?? 50)));

        const params = new URLSearchParams();
        if (filters?.q?.trim()) params.append('q', filters.q.trim());
        params.append('page', String(page));
        params.append('limit', String(limit));

        const res = await apiClient.get<any>(`/inventory/products?${params.toString()}`);
        return unwrapPaged<Product>(res, page, limit);
    },

    async getProduct(id: string): Promise<Product> {
        return apiClient.get<Product>(`/inventory/products/${id}`);
    },

    async createProduct(data: CreateProductDto): Promise<Product> {
        return apiClient.post<Product>('/inventory/products', data);
    },

    async updateProduct(id: string, data: Partial<CreateProductDto>): Promise<Product> {
        return apiClient.patch<Product>(`/inventory/products/${id}`, data);
    },

    async deleteProduct(id: string): Promise<void> {
        return apiClient.delete<void>(`/inventory/products/${id}`);
    },

    // ===== Measurement Units =====
    async getProductCategories(): Promise<ProductCategory[]> {
        return apiClient.get<ProductCategory[]>('/inventory/product-categories');
    },

    async getProductCategory(id: string): Promise<ProductCategory> {
        return apiClient.get<ProductCategory>(`/inventory/product-categories/${id}`);
    },

    async createProductCategory(data: { code: string; name: string; description?: string }): Promise<ProductCategory> {
        return apiClient.post<ProductCategory>('/inventory/product-categories', data);
    },

    async updateProductCategory(id: string, data: Partial<ProductCategory>): Promise<ProductCategory> {
        return apiClient.patch<ProductCategory>(`/inventory/product-categories/${id}`, data);
    },

    async deleteProductCategory(id: string): Promise<void> {
        return apiClient.delete<void>(`/inventory/product-categories/${id}`);
    },

    // ===== Measurement Units =====
    async getMeasurementUnits(): Promise<MeasurementUnit[]> {
        return apiClient.get<MeasurementUnit[]>('/inventory/measurement-units');
    },

    async getMeasurementUnit(id: string): Promise<MeasurementUnit> {
        return apiClient.get<MeasurementUnit>(`/inventory/measurement-units/${id}`);
    },

    async createMeasurementUnit(data: { code: string; name: string }): Promise<MeasurementUnit> {
        return apiClient.post<MeasurementUnit>('/inventory/measurement-units', data);
    },

    async updateMeasurementUnit(id: string, data: Partial<MeasurementUnit>): Promise<MeasurementUnit> {
        return apiClient.patch<MeasurementUnit>(`/inventory/measurement-units/${id}`, data);
    },

    async deleteMeasurementUnit(id: string): Promise<void> {
        return apiClient.delete<void>(`/inventory/measurement-units/${id}`);
    },

    // ===== Unit Conversions =====
    async getUnitConversions(productId?: string): Promise<UnitConversion[]> {
        const params = productId ? `?productId=${productId}` : '';
        return apiClient.get<UnitConversion[]>(`/inventory/unit-conversions${params}`);
    },

    async getUnitConversion(id: string): Promise<UnitConversion> {
        return apiClient.get<UnitConversion>(`/inventory/unit-conversions/${id}`);
    },

    async createUnitConversion(data: CreateUnitConversionDto): Promise<UnitConversion> {
        return apiClient.post<UnitConversion>('/inventory/unit-conversions', data);
    },

    async updateUnitConversion(id: string, data: Partial<CreateUnitConversionDto>): Promise<UnitConversion> {
        return apiClient.patch<UnitConversion>(`/inventory/unit-conversions/${id}`, data);
    },

    async deleteUnitConversion(id: string): Promise<void> {
        return apiClient.delete<void>(`/inventory/unit-conversions/${id}`);
    },

    // ===== Stock Management =====
    /**
     * Legacy: fetch full stock list (no pagination).
     * Prefer getStockPage() for better performance.
     */
    async getStock(filters?: { warehouseId?: string; productId?: string }): Promise<Stock[]> {
        const params = new URLSearchParams();
        if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId);
        if (filters?.productId) params.append('productId', filters.productId);

        const queryString = params.toString();
        const res = await apiClient.get<any>(`/inventory/stock${queryString ? `?${queryString}` : ''}`);
        return unwrapList<Stock>(res);
    },

    /**
     * New: server-side search + pagination
     * Backend supports: /inventory/stock?warehouseId=...&q=...&page=...&limit=...
     */
    async getStockPage(filters?: { warehouseId?: string; q?: string; page?: number; limit?: number }): Promise<PagedResult<Stock>> {
        const page = Math.max(1, Number(filters?.page ?? 1));
        const limit = Math.min(200, Math.max(1, Number(filters?.limit ?? 50)));

        const params = new URLSearchParams();
        if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId);
        if (filters?.q && filters.q.trim()) params.append('q', filters.q.trim());
        params.append('page', String(page));
        params.append('limit', String(limit));

        const res = await apiClient.get<any>(`/inventory/stock?${params.toString()}`);
        return unwrapPaged<Stock>(res, page, limit);
    },

    async getStockDetail(warehouseId: string, productId: string): Promise<Stock> {
        return apiClient.get<Stock>(`/inventory/stock/${warehouseId}/${productId}`);
    },

    async updateStock(warehouseId: string, productId: string, data: UpdateStockDto): Promise<Stock> {
        return apiClient.patch<Stock>(`/inventory/stock/${warehouseId}/${productId}`, data);
    },

    // Adjust stock quantity (+/-) using the dedicated adjust endpoint
    // Backend: PATCH /inventory/stock/:warehouseId/:productId/adjust
    async adjustStock(warehouseId: string, productId: string, quantity: number, note?: string): Promise<Stock> {
        const body: any = { quantity, ...(note ? { note } : {}) };
        try {
            const res = await apiClient.patch<Stock>(`/inventory/stock/${warehouseId}/${productId}/adjust`, body);
            return res;
        } catch (err: any) {
            throw err;
        }
    },

    // ===== Stock Movements =====
    async getStockMovements(filters?: { type?: MovementType; warehouseId?: string }): Promise<StockMovement[]> {
        const params = new URLSearchParams();
        if (filters?.type) params.append('type', filters.type);
        if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId);

        const queryString = params.toString();
        const res = await apiClient.get<any>(`/inventory/stock-movements${queryString ? `?${queryString}` : ''}`);
        return unwrapList<StockMovement>(res);
    },

    async getStockMovement(id: string): Promise<StockMovement> {
        return apiClient.get<StockMovement>(`/inventory/stock-movements/${id}`);
    },

    async createStockMovement(data: CreateStockMovementDto): Promise<StockMovement> {
        return apiClient.post<StockMovement>('/inventory/stock-movements', data);
    },

    // ===== Inventory Count / Adjustments =====
    // Backend: GET /inventory/count, POST /inventory/count
    async getInventoryCounts(): Promise<any[]> {
        const res = await apiClient.get<any>('/inventory/count');
        return unwrapList<any>(res);
    },

    async createInventoryCount(data: any): Promise<any> {
        return apiClient.post<any>('/inventory/count', data);
    },

    // ===== Outbound =====
    async getOutbound(page = 1, limit = 20): Promise<{ data: StockMovement[]; hasNext: boolean; total: number }> {
        const res = await apiClient.get<any>(`/inventory/outbound?page=${page}&limit=${limit}`);
        if (Array.isArray(res)) return { data: res, hasNext: false, total: res.length };
        const data: StockMovement[] = Array.isArray(res?.data) ? res.data : [];
        const total = Number(res?.meta?.total ?? res?.total ?? data.length);
        const hasNext = res?.meta?.hasNext ?? (page * limit < total);
        return { data, hasNext, total };
    },

    async createOutbound(data: CreateOutboundDto): Promise<StockMovement> {
        return apiClient.post<StockMovement>('/inventory/outbound', data);
    },

    // ===== Inbound =====
    async getInbound(page = 1, limit = 20): Promise<{ data: StockMovement[]; hasNext: boolean; total: number }> {
        const res = await apiClient.get<any>(`/inventory/inbound?page=${page}&limit=${limit}`);
        if (Array.isArray(res)) return { data: res, hasNext: false, total: res.length };
        const data: StockMovement[] = Array.isArray(res?.data) ? res.data : [];
        const total = Number(res?.meta?.total ?? res?.total ?? data.length);
        const hasNext = res?.meta?.hasNext ?? (page * limit < total);
        return { data, hasNext, total };
    },

    async createInbound(data: any): Promise<any> {
        return apiClient.post<any>('/inventory/inbound', data);
    },

    // ===== Warehouse Transfer =====
    // Legacy transfer list (type TRANSFER)
    async getTransfers(): Promise<StockMovement[]> {
        return this.getStockMovements({ type: 'TRANSFER' });
    },

    // Legacy create (server hỗ trợ type TRANSFER)
    async createTransfer(data: CreateTransferDto): Promise<StockMovement> {
        return apiClient.post<StockMovement>('/inventory/stock-movements', data);
    },

    // New: tạo 1 phiếu chuyển kho có nhiều sản phẩm bằng cách tạo các StockMovement OUT/IN
    // và group theo referenceId = TRF-xxxx.
    async createTransferVoucher(data: CreateTransferVoucherDto): Promise<TransferVoucher> {
        const referenceId = `TRF-${Date.now()}`;
        const note = data.note;

        // Tạo OUT (kho nguồn) cho từng item
        const outs = await Promise.all(
            data.items.map((it) =>
                this.createStockMovement({
                    type: 'OUT',
                    warehouseId: data.fromWarehouseId,
                    productId: it.productId,
                    quantity: it.quantity,
                    referenceId,
                    note,
                })
            )
        );

        // Tạo IN (kho đích) cho từng item
        await Promise.all(
            data.items.map((it) =>
                this.createStockMovement({
                    type: 'IN',
                    warehouseId: data.toWarehouseId,
                    productId: it.productId,
                    quantity: it.quantity,
                    referenceId,
                    note,
                })
            )
        );

        const createdAt = outs[0]?.createdAt || new Date().toISOString();
        return {
            referenceId,
            fromWarehouseId: data.fromWarehouseId,
            toWarehouseId: data.toWarehouseId,
            items: outs.map((m) => ({ productId: m.productId, quantity: Number(m.quantity), Product: m.Product })),
            note,
            createdAt,
        };
    },

    // New: lấy danh sách phiếu chuyển kho (group theo referenceId prefix TRF-)
    async getTransferVouchers(): Promise<TransferVoucher[]> {
        const movements = await this.getStockMovements();
        const transferMoves = (Array.isArray(movements) ? movements : []).filter(
            (m) => typeof m.referenceId === 'string' && m.referenceId.startsWith('TRF-')
        );

        const groups = new Map<string, StockMovement[]>();
        for (const m of transferMoves) {
            const key = m.referenceId!;
            const arr = groups.get(key) || [];
            arr.push(m);
            groups.set(key, arr);
        }

        const vouchers: TransferVoucher[] = [];
        for (const [referenceId, ms] of groups.entries()) {
            const outs = ms.filter((m) => m.type === 'OUT');
            const ins = ms.filter((m) => m.type === 'IN');
            if (outs.length === 0 || ins.length === 0) continue;

            // Giả định 1 phiếu: tất cả OUT cùng kho nguồn, tất cả IN cùng kho đích
            const fromWarehouseId = outs[0].warehouseId;
            const toWarehouseId = ins[0].warehouseId;
            const createdAt = ms
                .map((m) => m.createdAt)
                .sort()[0] || new Date().toISOString();
            const note = outs[0].note || ins[0].note;

            vouchers.push({
                referenceId,
                fromWarehouseId,
                toWarehouseId,
                createdAt,
                note,
                items: outs.map((m) => ({
                    productId: m.productId,
                    quantity: Number(m.quantity),
                    Product: m.Product,
                })),
            });
        }

        // newest first
        vouchers.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return vouchers;
    },
};
