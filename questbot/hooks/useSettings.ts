import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

interface AppSettings {
  pomodoroDuration: number;
  breakDuration: number;
  breakTasks: string[];
  theme: 'light' | 'dark' | 'system'; // 'system' means follow device settings
}

const DEFAULT_SETTINGS: AppSettings = {
  pomodoroDuration: 25,
  breakDuration: 5,
  breakTasks: [
    "20 Jumping Jacks", "10 Push-ups", "15 Squats", "30-sec Plank",
    "15 Lunges (each leg)", "20 High Knees", "10 Burpees", "30-sec Wall Sit"
  ],
  theme: 'system',
};

const SETTINGS_KEY = '@AppSettings';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
        if (storedSettings) {
          const parsedSettings: AppSettings = JSON.parse(storedSettings);
          // Merge with default settings to ensure all keys are present
          setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
        }
      } catch (error) {
        console.error("Failed to load settings from AsyncStorage", error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const saveSettings = async () => {
        try {
          await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
          console.error("Failed to save settings to AsyncStorage", error);
        }
      };
      saveSettings();

      // Apply theme setting immediately
      if (settings.theme === 'system') {
        Appearance.setColorScheme(null); // Reset to system default
      } else {
        Appearance.setColorScheme(settings.theme);
      }
    }
  }, [settings, isLoaded]);

  const updateSettings = (newValues: Partial<AppSettings>) => {
    setSettings(prevSettings => ({ ...prevSettings, ...newValues }));
  };

  return { settings, updateSettings, isLoaded };
};
