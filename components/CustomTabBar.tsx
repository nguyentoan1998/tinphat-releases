import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Package, Phone, House, MessageCircle, CalendarRange } from 'lucide-react-native';
import { usePathname, useRouter } from 'expo-router';

const TABS = [
  { id: 'inventory', Icon: Package, route: '/inventory', label: 'Kho hàng' },
  { id: 'calls', Icon: Phone, route: '/(tabs)/calls', label: 'Cuộc gọi' },
  { id: 'home', Icon: House, route: '/home', label: 'Trang chủ' },
  { id: 'messages', Icon: MessageCircle, route: '/(tabs)/chat', label: 'Tin nhắn' },
  { id: 'plans', Icon: CalendarRange, route: '/(tabs)/production', label: 'Kế hoạch' },
];

export default function CustomTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const handlePress = (route: string | null) => {
    if (route) router.push(route as any);
  };

  const isActive = (tab: typeof TABS[number]) => {
    if (!tab.route) return false;
    return (
      pathname === tab.route ||
      (tab.id === 'calls' && pathname === '/calls') ||
      (tab.id === 'messages' && pathname.startsWith('/chat')) ||
      (tab.id === 'plans' && pathname === '/production')
    );
  };

  return (
    <View style={styles.container} pointerEvents="auto">
      <View style={styles.pillOuter}>
        <BlurView intensity={50} tint="light" style={styles.blur}>
          <View style={styles.pill}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => handlePress(tab.route)}
                activeOpacity={tab.route ? 0.6 : 1}
              >
                <tab.Icon
                  size={24}
                  color={isActive(tab) ? '#0156A7' : '#59677B'}
                  strokeWidth={2.2}
                />
              </TouchableOpacity>
            ))}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
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
});
