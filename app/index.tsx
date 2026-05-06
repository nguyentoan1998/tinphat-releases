import { Redirect } from 'expo-router';

// Entry point: redirect ngay sang splash screen
export default function Index() {
    return <Redirect href="/splash" />;
}
