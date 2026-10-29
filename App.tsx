import { Ionicons } from '@expo/vector-icons';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AddExpenseScreen } from './src/screens/AddExpenseScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { Payment, parsePaymentUrl, syncNativeState } from './src/services/upiDetect';
import { useColors } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navRef = createNavigationContainerRef<any>();

const TAB_ICONS: Record<string, string> = { Home: 'home', History: 'calendar', Settings: 'settings' };

function Tabs() {
  const c = useColors();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.faint,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
        tabBarIcon: ({ color, size, focused }) => {
          const base = TAB_ICONS[route.name] ?? 'home';
          return <Ionicons name={focused ? base : (`${base}-outline` as any)} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const c = useColors();
  const base = c.isDark ? DarkTheme : DefaultTheme;
  const pendingPayment = useRef<Payment | null>(null);

  const openPayment = (url: string | null | undefined) => {
    const payment = parsePaymentUrl(url);
    if (!payment) return;
    if (navRef.isReady()) navRef.navigate('AddExpense', { prefill: payment });
    else pendingPayment.current = payment;
  };

  useEffect(() => {
    syncNativeState().catch(() => {});
    // Tapping the "payment detected" notification opens expensetracker://add-upi?...
    Linking.getInitialURL().then(openPayment).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => openPayment(e.url));
    return () => sub.remove();
  }, []);

  const navTheme = {
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.bg, text: c.text, border: c.border, primary: c.primary },
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navRef}
        theme={navTheme}
        onReady={() => {
          if (pendingPayment.current) {
            navRef.navigate('AddExpense', { prefill: pendingPayment.current });
            pendingPayment.current = null;
          }
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: c.bg },
            headerTitleStyle: { fontWeight: '800' },
            headerTintColor: c.text,
            animation: 'slide_from_bottom',
          }}
        >
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'New expense' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style={c.isDark ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}
