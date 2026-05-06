// Custom Tab Bar — Floating Pill with Chat menu 180° ABOVE
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Package, MessageCircle, Factory, CalendarRange, PackageSearch, Users, MessageSquare } from 'lucide-react-native';
import { usePathname, useRouter } from 'expo-router';

const MENU_ITEMS = [
  { id: 'plan', Icon: CalendarRange, route: '/production/plans', label: 'Kế hoạch' },
  { id: 'material', Icon: PackageSearch, route: '/production/material-requests', label: 'Vật tư' },
  { id: 'staff', Icon: Users, route: '/attendance', label: 'Nhân viên' },
  { id: 'chat', Icon: MessageSquare, route: '/chat', label: 'Chat riêng' },
];

export default function CustomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const animation = React.useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = menuVisible ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();
    setMenuVisible(!menuVisible);
  };

  const navigateAndClose = (route: string) => {
    toggleMenu();
    setTimeout(() => {
      router.push(route as any);
    }, 300);
  };

  const renderMenuButtons = () => {
    const radius = 120; // INCREASED to 120px - MUCH FARTHER from chat button
    return MENU_ITEMS.map((item, index) => {
      // 180° arc above: angles 45°, 75°, 105°, 135° (start farther from center)
      const angleDeg = 45 + (index * 30); // 45, 75, 105, 135
      const angleRad = angleDeg * (Math.PI / 180);
      
      // BOTH start at 1000px (far away) when closed
      const translateX = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [1000, Math.cos(angleRad) * radius],
      });
      
      const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [1000, -Math.sin(angleRad) * radius], // Negative to go UP
      });

      return (
        <Animated.View
          key={item.id}
          style={[
            styles.menuItem,
            {
              transform: [{ translateX }, { translateY }],
              opacity: animation,
            },
          ]}
          pointerEvents={menuVisible ? 'auto' : 'none'}
        >
          <TouchableOpacity 
            style={styles.menuBtn} 
            onPress={() => navigateAndClose(item.route)}
          >
            <item.Icon size={20} color="#0156A7" strokeWidth={2} />
          </TouchableOpacity>
        </Animated.View>
      );
    });
  };

  return (
    <View style={styles.container} pointerEvents="auto">
      {/* Overlay */}
      {menuVisible && (
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={toggleMenu} />
      )}

      {/* Floating Pill Tab Bar */}
      <View style={styles.pillOuter}>
        <BlurView intensity={50} tint="light" style={styles.blur}>
          <View style={styles.pill}>
            {/* Kho hàng */}
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => router.push('/inventory' as any)}
            >
              <Package
                size={22}
                color={pathname === '/inventory' ? '#0156A7' : '#59677B'}
                strokeWidth={pathname === '/inventory' ? 2.2 : 1.8}
              />
            </TouchableOpacity>

            {/* Chat button with menu - ONLY toggle menu, NO navigation */}
            <View style={styles.chatWrapper}>
              {renderMenuButtons()}
              <TouchableOpacity
                style={[styles.chatBtn, menuVisible && styles.chatBtnActive]}
                onPress={() => toggleMenu()}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MessageCircle size={24} color="#FFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Sản xuất */}
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => router.push('/production' as any)}
            >
              <Factory
                size={22}
                color={pathname === '/production' ? '#0156A7' : '#59677B'}
                strokeWidth={pathname === '/production' ? 2.2 : 1.8}
              />
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: '10%',
    right: '10%',
    zIndex: 9999,
    pointerEvents: 'auto',
  },
  pillOuter: {
    borderRadius: 28,
    overflow: 'visible',
    elevation: 6,
    shadowColor: '#0156A7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  blur: {
    borderRadius: 28,
    overflow: 'visible',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(1,86,167,0.1)',
  },
  pill: {
    height: 56,
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
  chatWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1001,
    height: 56,
  },
  chatBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0156A7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0156A7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1002,
  },
  chatBtnActive: {
    backgroundColor: '#013B78',
  },
  overlay: {
    position: 'absolute',
    top: -2000,
    left: -2000,
    right: -2000,
    bottom: -2000,
    zIndex: 998,
  },
  menuItem: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -22,
    marginLeft: -22,
    zIndex: 999,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(1,86,167,0.2)',
    shadowColor: '#0156A7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
