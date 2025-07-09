import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { TouchableOpacity, Text } from 'react-native'; // Added import
import { useRouter } from 'expo-router'; // Added import

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} /> {/* Added for index.tsx */}
        <Stack.Screen
          name="settings"
          options={({ navigation }) => ({ // Destructure navigation from props
            headerShown: true,
            title: 'Settings',
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 15 }}>
                <Text style={{ fontSize: 18, color: colorScheme === 'dark' ? 'white' : 'black' }}>← Back</Text>
              </TouchableOpacity>
            ),
          })}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
