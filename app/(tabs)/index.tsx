import { Redirect } from 'expo-router';

// Default tab route: redirect to home
export default function TabsIndex() {
    return <Redirect href="/(tabs)/home" />;
}
