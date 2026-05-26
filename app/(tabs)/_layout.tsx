// Tabs layout — SIMPLE: Only use CustomTabBar
import { Tabs } from 'expo-router';
import CustomTabBar from '@/components/CustomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { display: 'none' },
      }}
      tabBar={(props) => <CustomTabBar />}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="home" options={{ href: '/home' }} />
      <Tabs.Screen name="inventory" options={{ href: '/inventory' }} />
      <Tabs.Screen name="calls" options={{ href: '/calls' }} />
      <Tabs.Screen name="chat/index" options={{ href: '/chat' }} />
      <Tabs.Screen name="production" options={{ href: '/production' }} />
    </Tabs>
  );
}
