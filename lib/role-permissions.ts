// Role-based permission config for UI visibility
import type { User } from './api-client';

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

// Bottom tabs visible per role
const VISIBLE_TABS: Record<UserRole, string[]> = {
    ADMIN: ['index', 'inventory', 'sales', 'production', 'settings'],
    MANAGER: ['index', 'inventory', 'production', 'settings'],
    USER: ['index', 'settings'],
};

// Inventory cards visible per role (ADMIN sees all)
const MANAGER_INVENTORY_CARDS = ['current-stock', 'products'];

// Home menu items hidden per role
const ADMIN_ONLY_MENUS = ['users'];

export function isTabVisible(tabName: string, role?: UserRole): boolean {
    if (!role) return false;
    return VISIBLE_TABS[role]?.includes(tabName) ?? false;
}

export function isInventoryCardVisible(cardId: string, role?: UserRole): boolean {
    if (!role || role === 'ADMIN') return true;
    if (role === 'MANAGER') return MANAGER_INVENTORY_CARDS.includes(cardId);
    return false;
}

export function isHomeMenuVisible(menuId: string, role?: UserRole): boolean {
    if (!role) return false;
    if (ADMIN_ONLY_MENUS.includes(menuId)) return role === 'ADMIN';
    return true;
}

export function getRoleLabel(role?: string): string {
    switch (role) {
        case 'ADMIN': return 'Quản trị viên';
        case 'MANAGER': return 'Quản lý';
        default: return 'Nhân viên';
    }
}
