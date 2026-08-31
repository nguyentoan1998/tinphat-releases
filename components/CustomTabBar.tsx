import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Package, Phone, House, MessageCircle, CalendarRange } from 'lucide-react-native';
import { usePathname, useRouter } from 'expo-router';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store';
import { isTabVisible, type UserRole } from '@/lib/role-permissions';

const ALL_TABS = [
  { id: 'inventory', Icon: Package, route: '/inventory', label: 'Kho hàng' },
  { id: 'calls', Icon: Phone, route: '/(tabs)/calls', label: 'Cuộc gọi' },
  { id: 'home', Icon: House, route: '/home', label: 'Trang chủ' },
  { id: 'messages', Icon: MessageCircle, route: '/(tabs)/chat', label: 'Tin nhắn' },
  { id: 'plans', Icon: CalendarRange, route: '/(tabs)/production', label: 'Kế hoạch' },
];

export default function CustomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined;

  const handlePress = (route: string | null) => {
    if (route) router.push(route as any);
  };

  const isActive = (tab: typeof ALL_TABS[number]) => {
    if (!tab.route) return false;
    return (
      pathname === tab.route ||
      (tab.id === 'calls' && pathname === '/calls') ||
      (tab.id === 'messages' && pathname.startsWith('/chat')) ||
      (tab.id === 'plans' && pathname === '/production')
    );
  };

  const totalUnread = useChatStore((s) =>
    s.rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0)
  );

  const tabs = ALL_TABS.filter((t) => isTabVisible(t.id, role));

  return (
    <View style={styles.container} pointerEvents="auto">
      <View style={styles.pillOuter}>
        <BlurView intensity={50} tint="light" style={styles.blur}>
          <View style={styles.pill}>
            {tabs.map((tab) => {
              const active = isActive(tab);
              const isHome = tab.id === 'home';
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles.tabItem}
                  onPress={() => handlePress(tab.route)}
                  activeOpacity={tab.route ? 0.6 : 1}
                >
                  <View style={[isHome && styles.homeTabWrap, active && isHome && styles.homeTabActive]}>
                    <tab.Icon
                      size={isHome ? 28 : 24}
                      color={active ? (isHome ? '#FFF' : '#0156A7') : (isHome ? '#0156A7' : '#59677B')}
                      strokeWidth={isHome ? 2.8 : 2.2}
                      fill={isHome && active ? '#0156A7' : 'none'}
                    />
                    {tab.id === 'messages' && totalUnread > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {totalUnread > 99 ? '99+' : totalUnread}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: '8%',
    right: '8%',
    zIndex: 9999,
    pointerEvents: 'auto',
  },
  pillOuter: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    boxShadow: '0px 8px 12px rgba(0,0,0,0.25)',
    elevation: 8,
  },
  blur: {
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  pill: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTabWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
  },
  homeTabActive: {
    backgroundColor: '#0156A7',
    boxShadow: '0px 4px 8px rgba(1,86,167,0.4)',
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
