// Custom Tab Bar — Floating Pill with Chat menu 180° ABOVE
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Package, MessageCircle, Factory, Bell, CalendarRange, PackageSearch, Users, MessageSquare } from 'lucide-react-native';
import { usePathname, useRouter } from 'expo-router';
import NotificationBadge from '@/components/ui/NotificationBadge';

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
    const radius = 120;
    return MENU_ITEMS.map((item, index) => {
      const angleDeg = 45 + (index * 30);
      const angleRad = angleDeg * (Math.PI / 180);
      
      const translateX = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [1000, Math.cos(angleRad) * radius],
      });
      
      const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [1000, -Math.sin(angleRad) * radius],
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
            <item.Icon size={20} color="#FFFFFF" strokeWidth={2.2} />
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

      {/* Menu buttons — OUTSIDE pillOuter để không bị overflow: hidden clip */}
      <View style={styles.menuLayer} pointerEvents="box-none">
        {renderMenuButtons()}
      </View>

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
                size={24}
                color={pathname === '/inventory' ? '#0156A7' : '#59677B'}
                strokeWidth={2.2}
              />
            </TouchableOpacity>

            {/* Thông báo */}
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => router.push('/notifications' as any)}
            >
              <View style={styles.bellWrap}>
                <Bell
                  size={22}
                  color={pathname === '/notifications' ? '#0156A7' : '#59677B'}
                  strokeWidth={2.2}
                />
                <NotificationBadge size={16} />
              </View>
            </TouchableOpacity>

            {/* Chat button — chỉ toggle menu, không điều hướng */}
            <View style={styles.chatWrapper}>
              <TouchableOpacity
                style={[styles.chatBtn, menuVisible && styles.chatBtnActive]}
                onPress={() => toggleMenu()}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MessageCircle size={26} color="#FFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Sản xuất */}
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => router.push('/production' as any)}
            >
              <Factory
                size={24}
                color={pathname === '/production' ? '#0156A7' : '#59677B'}
                strokeWidth={2.2}
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
    bottom: 24,
    left: '12%',
    right: '12%',
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
    backgroundColor: 'rgba(255,255,255,0.75)', // Tăng độ đục để icon nổi bật hơn
  },
  pill: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1001,
    height: 60,
  },
  chatBtn: {
    width: 52, // Tăng nhẹ kích thước
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0156A7', 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 }, // Đổ bóng sâu hơn tạo hiệu ứng 3D nổi
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1002,
    borderWidth: 2, // Viền dày hơn
    borderColor: 'rgba(255,255,255,0.4)',
  },
  chatBtnActive: {
    backgroundColor: '#013B78',
    borderColor: '#FFFFFF',
    transform: [{ scale: 0.95 }],
  },
  overlay: {
    position: 'absolute',
    top: -2000,
    left: -2000,
    right: -2000,
    bottom: -2000,
    zIndex: 998,
    backgroundColor: 'rgba(0,0,0,0.1)', // Thêm lớp phủ mờ khi mở menu
  },
  menuLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 1005,
  },
});
