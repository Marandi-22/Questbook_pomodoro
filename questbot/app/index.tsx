import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, UIManager, LayoutAnimation, Animated
} from 'react-native';
import uuid from 'react-native-uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { useFonts, DancingScript_400Regular } from '@expo-google-fonts/dancing-script';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONFIG & CONSTANTS ---
const STORAGE_KEY = '@FocusQuestData';
const XP_PER_LEVEL = 1000;
const DEFAULT_POMODORO_DURATION = 25 * 60;
const DEFAULT_BREAK_DURATION = 5 * 60;
const INDOOR_EXERCISES = [
  "20 Jumping Jacks", "10 Push-ups", "15 Squats", "30-sec Plank",
  "15 Lunges (each leg)", "20 High Knees", "10 Burpees", "30-sec Wall Sit"
];

// Animal evolution system
const LEVEL_ANIMALS = [
  { level: 1, emoji: '🐛', name: 'Caterpillar', description: 'Just starting your journey!' },
  { level: 2, emoji: '🐜', name: 'Ant', description: 'Building discipline!' },
  { level: 3, emoji: '🐝', name: 'Bee', description: 'Buzzing with productivity!' },
  { level: 4, emoji: '🐸', name: 'Frog', description: 'Leaping to new heights!' },
  { level: 5, emoji: '🐢', name: 'Turtle', description: 'Steady and persistent!' },
  { level: 6, emoji: '🐰', name: 'Rabbit', description: 'Quick and efficient!' },
  { level: 7, emoji: '🐺', name: 'Wolf', description: 'Focused and determined!' },
  { level: 8, emoji: '🐅', name: 'Tiger', description: 'Powerful and precise!' },
  { level: 9, emoji: '🦅', name: 'Eagle', description: 'Soaring above challenges!' },
  { level: 10, emoji: '🦖', name: 'T-Rex', description: 'The ultimate focus master!' },
];

const COLORS = {
  background: '#F8F7F4',
  text: '#e0e0e0',
  textMuted: '#b0b0b0',
  primary: '#80deea',
  primaryMuted: '#D9E0E5',
  accent: '#ff6f61',
  border: '#EAEAEA',
  white: '#FFFFFF',
  success: '#4CAF50',
  xpBar: '#FFD700',
  xpBarBg: '#F0F0F0'
};

// --- HELPERS & TYPES ---
const getToday = () => new Date().toISOString().split('T')[0];
type SubQuest = { id: string; title: string; isComplete: boolean; };
type Quest = { id: string; title: string; estimated: number; completed: number; isComplete: boolean; subQuests: SubQuest[]; };
type DatedQuests = { [date: string]: Quest[]; };
type TimerMode = 'idle' | 'pomodoro' | 'break';

// Get current animal based on level
const getCurrentAnimal = (level: number) => {
  const animalIndex = Math.min(level - 1, LEVEL_ANIMALS.length - 1);
  return LEVEL_ANIMALS[Math.max(0, animalIndex)];
};

// Get next animal
const getNextAnimal = (level: number) => {
  const nextIndex = Math.min(level, LEVEL_ANIMALS.length - 1);
  return LEVEL_ANIMALS[nextIndex];
};

// Adventure Trail Component
const AdventureTrail = ({
  questsByDate,
  completedTasks,
  dailyGoals,
  selectedDate,
  onDateSelect,
}: {
  questsByDate: DatedQuests;
  completedTasks: { [date: string]: number };
  dailyGoals: { [date: string]: number };
  selectedDate: string;
  onDateSelect: (date: string) => void;
}) => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date(today);

  const days = Array.from({ length: 15 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (14 - i));
    return date.toISOString().split('T')[0];
  });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
      {days.map(date => {
        const completed = completedTasks[date] || 0;
        const goal = dailyGoals[date] || 0;
        const isComplete = goal > 0 && completed >= goal;
        const isToday = date === today;
        const isSelected = date === selectedDate;

        return (
          <TouchableOpacity
            key={date}
            onPress={() => onDateSelect(date)}
            style={{ alignItems: 'center', marginHorizontal: 6 }}
          >
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: isToday
                ? 'rgba(255, 111, 97, 0.6)' // Accent with transparency
                : isComplete
                ? 'rgba(76, 175, 80, 0.4)' // Success with transparency
                : 'rgba(255, 255, 255, 0.1)', // Light transparent for muted
              borderWidth: isToday ? 2.5 : isSelected ? 2 : 1,
              borderColor: isToday ? COLORS.primary : isSelected ? COLORS.primary : 'rgba(255,255,255,0.3)',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
            }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 30 }}>
                  {(() => {
                    const hasActivity = goal > 0 || completed > 0;
                    if (!hasActivity) return '';
                    if (completed === 0) return '🦥';        // Sloth — did nothing
                    if (completed >= goal * 2.0) return '🦖'; // T-Rex — dominated
                    if (completed >= goal * 1.5) return '🦍'; // Gorilla — alpha grind
                    if (completed >= goal * 1.1) return '🦁'; // Lion — beast mode
                    if (completed >= goal) return '🐘';       // Elephant — goal hit
                    if (completed >= goal * 0.5) return '🐢'; // Turtle — decent try
                    return '🐌';                               // Snail — barely moved
                  })()}
                </Text>
                {goal > 0 && (
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                    {completed}/{goal}
                  </Text>
                )}
              </View>
            </View>
            <Text style={{ fontSize: 10, marginTop: 2, color: COLORS.textMuted }}>
              {date.slice(5)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

// --- MAIN COMPONENT ---
export default function HomeScreen() {
  useKeepAwake();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular,
  });

  // State
  const [questsByDate, setQuestsByDate] = useState<DatedQuests>({});
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [selectedSubQuestId, setSelectedSubQuestId] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_POMODORO_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>('idle');
  const [currentExercise, setCurrentExercise] = useState('');
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestEstimate, setNewQuestEstimate] = useState('');
  const [newSubQuestTitle, setNewSubQuestTitle] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpAnimation] = useState(new Animated.Value(0));
  
  // Custom timer settings
  const [pomodoroDuration, setPomodoroDuration] = useState(DEFAULT_POMODORO_DURATION);
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK_DURATION);
  const [customPomodoroInput, setCustomPomodoroInput] = useState('25');
  const [customBreakInput, setCustomBreakInput] = useState('5');
  const [dailyGoal, setDailyGoal] = useState(5);
  const [dailyGoals, setDailyGoals] = useState<{ [date: string]: number }>({});
  const [completedTasks, setCompletedTasks] = useState<{ [date: string]: number }>({});
  const [isPaused, setIsPaused] = useState(false);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [pausedTimeLeft, setPausedTimeLeft] = useState<number | null>(null);

  // Derived State
  const level = useMemo(() => Math.floor(xp / XP_PER_LEVEL) + 1, [xp]);
  const currentLevelXP = useMemo(() => xp % XP_PER_LEVEL, [xp]);
  const xpProgress = useMemo(() => (currentLevelXP / XP_PER_LEVEL) * 100, [currentLevelXP]);
  const currentAnimal = useMemo(() => getCurrentAnimal(level), [level]);
  const nextAnimal = useMemo(() => getNextAnimal(level), [level]);
  const quests = useMemo(() => questsByDate[selectedDate] || [], [questsByDate, selectedDate]);
  const selectedQuest = useMemo(() => quests.find(q => q.id === selectedQuestId), [quests, selectedQuestId]);
  const selectedSubQuest = useMemo(() => 
    selectedQuest?.subQuests.find(sub => sub.id === selectedSubQuestId), 
    [selectedQuest, selectedSubQuestId]
  );

  // Level up effect
  const triggerLevelUp = () => {
    setShowLevelUp(true);
    Animated.sequence([
      Animated.timing(levelUpAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(levelUpAnimation, {
        toValue: 0,
        duration: 500,
        delay: 2000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLevelUp(false);
    });
  };

  // Effects
  useEffect(() => {
    const loadData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) {
          try {
            const savedData = JSON.parse(jsonValue);
            setQuestsByDate(savedData.questsByDate || {});
            setXp(savedData.xp || 0);
            setPomodoroDuration(savedData.pomodoroDuration || DEFAULT_POMODORO_DURATION);
            setBreakDuration(savedData.breakDuration || DEFAULT_BREAK_DURATION);
            const pomodoroMinutes = savedData.pomodoroDuration / 60;
            setCustomPomodoroInput(isNaN(pomodoroMinutes) ? '25' : String(pomodoroMinutes));
            const breakMinutes = savedData.breakDuration / 60;
            setCustomBreakInput(isNaN(breakMinutes) ? '5' : String(breakMinutes));
            setDailyGoals(savedData.dailyGoals || {});
            setCompletedTasks(savedData.completedTasks || {});
            
            const today = getToday();
            if (!savedData.dailyGoals?.[today]) {
              const smartGoal = generateBalancedGoal({
                level: Math.floor(savedData.xp / XP_PER_LEVEL) + 1,
                completedTasks: savedData.completedTasks || {},
                dailyGoals: savedData.dailyGoals || {},
              });
              setDailyGoals(prev => ({
                ...prev,
                [today]: smartGoal,
              }));
              setDailyGoal(smartGoal);
            } else {
              setDailyGoal(savedData.dailyGoals[today]);
            }
          } catch (parseError) {
            console.error("Error parsing saved data from AsyncStorage", parseError);
            // Optionally, clear the corrupted data or load default state
            // await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        console.error("Failed to load data from AsyncStorage", e);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        const jsonValue = JSON.stringify({
          questsByDate,
          xp,
          pomodoroDuration,
          breakDuration,
          dailyGoals,
          completedTasks,
        });
        await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
      } catch (e) {
        console.error("Failed to save data to AsyncStorage", e);
      }
    };

    const handler = setTimeout(() => {
      saveData();
    }, 1000); // Debounce for 1 second

    return () => {
      clearTimeout(handler);
    };
  }, [questsByDate, xp, pomodoroDuration, breakDuration]);

  // --- Pomodoro Timer Effect ---
  // Replace your timer useEffect with this:

  useEffect(() => {
    if (!isRunning || isPaused || !targetEndTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((targetEndTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setIsRunning(false);
        setTargetEndTime(null);
        if (timerMode === 'pomodoro') {
          handleFinishSession();
          startBreak();
        } else {
          setTimerMode('idle');
          setTimeLeft(pomodoroDuration);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, targetEndTime, timerMode]);

  // Check for level up
  useEffect(() => {
    const previousLevel = Math.floor((xp - 250) / XP_PER_LEVEL) + 1;
    const currentLevel = Math.floor(xp / XP_PER_LEVEL) + 1;
    
    if (currentLevel > previousLevel && xp > 0) {
      triggerLevelUp();
    }
  }, [xp]);

  // Handlers
  const changeDate = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + offset);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const addQuest = () => {
    const estimate = parseInt(newQuestEstimate);
    if (!newQuestTitle.trim() || isNaN(estimate) || estimate <= 0) return;
    const newQuest: Quest = {
      id: uuid.v4().toString(), title: newQuestTitle.trim(),
      estimated: estimate, completed: 0, isComplete: false, subQuests: [],
    };
    setQuestsByDate(prev => ({ ...prev, [selectedDate]: [...(prev[selectedDate] || []), newQuest] }));
    setNewQuestTitle('');
    setNewQuestEstimate('');
    setDailyGoals(prev => ({
      ...prev,
      [selectedDate]: dailyGoal,
    }));
  };

  const startPomodoro = () => {
    if (!selectedSubQuestId) return;
    const now = Date.now();
    const durationInMs = pomodoroDuration * 1000;

    setStartTimestamp(now);
    setTargetEndTime(now + durationInMs);
    setTimerMode('pomodoro');
    setIsRunning(true);
  };

  const startBreak = () => {
    const now = Date.now();
    const durationInMs = breakDuration * 1000;

    setStartTimestamp(now);
    setTargetEndTime(now + durationInMs);
    setCurrentExercise(INDOOR_EXERCISES[Math.floor(Math.random() * INDOOR_EXERCISES.length)]);
    setTimerMode('break');
    setIsRunning(true);
  };

  const handleFinishSession = () => {
    if (!selectedSubQuestId || !selectedQuestId) return;
    setXp(prev => prev + 250);
    // Mark subtask as complete
    setQuestsByDate(prev => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] || []).map(q =>
        q.id === selectedQuestId
          ? { 
              ...q, 
              completed: q.completed + 1,
              subQuests: q.subQuests.map(sub =>
                sub.id === selectedSubQuestId ? { ...sub, isComplete: true } : sub
              )
            }
          : q
      )
    }));
    setSelectedSubQuestId(null);
    setCompletedTasks(prev => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] || 0) + 1,
    }));
  };

  const skipBreak = () => {
    setTimerMode('idle');
    setIsRunning(false);
    setTimeLeft(pomodoroDuration);
  };

  const updateTimerSettings = () => {
    const newPomodoroMinutes = parseInt(customPomodoroInput);
    const newBreakMinutes = parseInt(customBreakInput);
    
    if (!isNaN(newPomodoroMinutes) && newPomodoroMinutes > 0) {
      setPomodoroDuration(newPomodoroMinutes * 60);
    }
    if (!isNaN(newBreakMinutes) && newBreakMinutes > 0) {
      setBreakDuration(newBreakMinutes * 60);
    }
    
    // Update current timer if idle
    if (timerMode === 'idle') {
      setTimeLeft(newPomodoroMinutes * 60);
    }
    
    setShowSettings(false);
  };

  const resetToDefaults = () => {
    setPomodoroDuration(DEFAULT_POMODORO_DURATION);
    setBreakDuration(DEFAULT_BREAK_DURATION);
    setCustomPomodoroInput('25');
    setCustomBreakInput('5');
    if (timerMode === 'idle') {
      setTimeLeft(DEFAULT_POMODORO_DURATION);
    }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const calculateSmartGoal = (
    level: number,
    completedTasks: { [date: string]: number },
    dailyGoals: { [date: string]: number }
  ): number => {
    const today = getToday();
    const todayDate = new Date(today);
    const trailingDays = [1, 2, 3].map(offset => {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - offset);
      return d.toISOString().split('T')[0];
    });

    const recent = trailingDays.map(date => ({
      goal: dailyGoals[date] || 0,
      done: completedTasks[date] || 0,
    }));

    const averageGoal = recent.reduce((sum, r) => sum + (r.goal || 0), 0) / recent.length || 3;
    const completionRate = recent.reduce((sum, r) => sum + (r.done / (r.goal || 1)), 0) / recent.length;

    let newGoal = Math.round(averageGoal);

    if (completionRate >= 1.2) newGoal += 1;
    else if (completionRate < 0.6) newGoal = Math.max(1, newGoal - 1);

    newGoal += Math.floor(level / 3); // Increase difficulty with level
    return newGoal;
  };

  const generateBalancedGoal = ({
    level,
    completedTasks,
    dailyGoals,
  }: {
    level: number;
    completedTasks: { [date: string]: number };
    dailyGoals: { [date: string]: number };
  }): number => {
    const today = getToday();
    const todayDate = new Date(today);

    const trailingDays = [1, 2, 3].map(offset => {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - offset);
      const key = d.toISOString().split('T')[0];
      return { goal: dailyGoals[key] || 0, completed: completedTasks[key] || 0 };
    });

    const failedCount = trailingDays.filter(day => day.goal > 0 && day.completed < day.goal).length;
    const yesterday = trailingDays[0];
    const momentumBonus = yesterday.completed >= yesterday.goal ? 1 : 0;

    let newGoal = 3 + Math.floor(level / 2) + momentumBonus;

    if (failedCount > 0) {
      newGoal = Math.max(1, newGoal - failedCount);
    }

    return newGoal;
  };

  // --- UI RENDER ---
  return (
  <View style={{ flex: 1 }}>
    {/* Background video with dark overlay */}
    <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 0 }}>
      <Video
        source={require('../assets/video/rain_flowers.mp4')}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isMuted
        isLooping
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.2)',
        }}
      />
    </View>

    {/* Foreground scrollable UI */}
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, { zIndex: 2 }]}
    >

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>🍅 FocusQuest</Text>
              <BlurView intensity={50} tint="dark" style={styles.settingsButtonGlass}>
                <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.settingsButtonTouchable}>
                  <Text style={styles.settingsButton}>⚙️</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
            <Text style={styles.headerDate}>{new Date(selectedDate).toDateString()}</Text>
            
            {/* Level Up Section */}
            <BlurView intensity={50} tint="dark" style={[styles.levelSection, styles.glassBox]}>
              <View style={styles.animalContainer}>
                <Text style={styles.currentAnimal}>{currentAnimal.emoji}</Text>
                <View style={styles.animalInfo}>
                  <Text style={styles.animalName}>{currentAnimal.name}</Text>
                  <Text style={styles.animalDescription}>{currentAnimal.description}</Text>
                </View>
              </View>
              <View style={styles.xpContainer}>
                <View style={styles.xpBarContainer}>
                  <View style={styles.xpBarBackground}>
                    <View style={[styles.xpBarFill, { width: `${xpProgress}%` }]} />
                  </View>
                  <Text style={styles.xpText}>{currentLevelXP} / {XP_PER_LEVEL} XP</Text>
                </View>
                {level < LEVEL_ANIMALS.length && (
                  <View style={styles.nextLevelContainer}>
                    <Text style={styles.nextLevelText}>Next: {nextAnimal.emoji} {nextAnimal.name}</Text>
                    <Text style={styles.xpNeeded}>{XP_PER_LEVEL - currentLevelXP} XP needed</Text>
                  </View>
                )}
              </View>
            </BlurView>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{level}</Text>
                <Text style={styles.statLabel}>Level</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{xp}</Text>
                <Text style={styles.statLabel}>Total XP</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{quests.reduce((sum, q) => sum + q.completed, 0)}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
            </View>
          </View>

          <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginBottom: 8 }}>
            🎯 Goal for today: <Text style={{ fontWeight: 'bold', color: COLORS.text }}>{dailyGoal}</Text> Pomodoros
          </Text>
          {/* Adventure Trail Section */}
          <BlurView intensity={50} tint="dark" style={[styles.section, styles.glassBox]}>
            <Text style={styles.sectionTitle}>🗺️ Your Focus Trail</Text>
            <AdventureTrail
              questsByDate={questsByDate}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              dailyGoals={dailyGoals}
              completedTasks={completedTasks}
            />
          </BlurView>

          {/* Level Up Modal */}
          {showLevelUp && (
            <BlurView intensity={50} tint="dark" style={[
              styles.levelUpModal,
              {
                opacity: levelUpAnimation,
                transform: [
                  {
                    scale: levelUpAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}>
              <Text style={styles.levelUpTitle}>🎉 LEVEL UP! 🎉</Text>
              <Text style={styles.levelUpAnimal}>{currentAnimal.emoji}</Text>
              <Text style={styles.levelUpText}>You are now a {currentAnimal.name}!</Text>
              <Text style={styles.levelUpDescription}>{currentAnimal.description}</Text>
            </BlurView>
          )}

          {/* Settings Section */}
          {showSettings && (
            <BlurView intensity={50} tint="dark" style={[styles.settingsSection, styles.glassBox]}>
              <Text style={styles.sectionTitle}>⚙️ Timer Settings</Text>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Pomodoro Duration (minutes):</Text>
                <TextInput
                  style={styles.settingsInput}
                  value={customPomodoroInput}
                  onChangeText={setCustomPomodoroInput}
                  keyboardType="numeric"
                  placeholder="25"
                />
              </View>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Break Duration (minutes):</Text>
                <TextInput
                  style={styles.settingsInput}
                  value={customBreakInput}
                  onChangeText={setCustomBreakInput}
                  keyboardType="numeric"
                  placeholder="5"
                />
              </View>
              <View style={styles.settingsButtons}>
                <BlurView intensity={50} tint="dark" style={[styles.glassBox, { borderRadius: 8 }]}>
                  <TouchableOpacity onPress={resetToDefaults} style={[styles.buttonSecondary, { borderRadius: 8, overflow: 'hidden' }]}>
                    <Text style={styles.buttonSecondaryText}>Reset to Defaults</Text>
                  </TouchableOpacity>
                </BlurView>
                <BlurView intensity={50} tint="dark" style={[styles.glassBox, { borderRadius: 8 }]}>
                  <TouchableOpacity onPress={updateTimerSettings} style={[styles.button, { borderRadius: 8, overflow: 'hidden' }]}>
                    <Text style={styles.buttonText}>Save Settings</Text>
                  </TouchableOpacity>
                </BlurView>
              </View>
            </BlurView>
          )}

          {/* Timer Section */}
          <BlurView intensity={50} tint="dark" style={[styles.section, styles.glassBox]}>
            <View style={styles.timerHeader}>
              <Text style={styles.timerSettingsText}>
                🍅 {Math.floor(pomodoroDuration / 60)}min • ☕ {Math.floor(breakDuration / 60)}min
              </Text>
            </View>
            {timerMode === 'pomodoro' && (
              <BlurView intensity={70} tint="dark" style={styles.timerDisplay}>
                <Text style={styles.timerEmoji}>🍅</Text>
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                {(isRunning || isPaused) && (
                  <BlurView intensity={50} tint="dark" style={[styles.glassBox, { borderRadius: 8 }]}>
                    <TouchableOpacity
                      onPress={() => {
                        if (isPaused) {
                          // RESUME
                          if (pausedTimeLeft !== null) {
                            const newTarget = Date.now() + pausedTimeLeft * 1000;
                            setTargetEndTime(newTarget);
                            setPausedTimeLeft(null);
                            setIsPaused(false);
                            setIsRunning(true);
                          }
                        } else {
                          // PAUSE
                          if (targetEndTime) {
                            const remaining = Math.max(0, Math.floor((targetEndTime - Date.now()) / 1000));
                            setPausedTimeLeft(remaining);
                            setIsPaused(true);
                            setTargetEndTime(null); // optional: clear it temporarily
                          }
                        }
                      }}
                      style={[styles.pauseButton, { borderRadius: 8, overflow: 'hidden' }]} 
                    >
                      <Text style={{ color: COLORS.text }}>
                        {isPaused ? '▶ Resume' : '⏸ Pause'}
                      </Text>
                    </TouchableOpacity>
                  </BlurView>
                )}
                <Text style={styles.timerSubText}>Focusing on: {selectedSubQuest?.title}</Text>
                <BlurView intensity={50} tint="dark" style={[styles.glassBox, { borderRadius: 8 }]}>
                  <TouchableOpacity onPress={() => {
                    setTimerMode('idle');
                    setIsRunning(false);
                    setTimeLeft(pomodoroDuration);
                  }} style={[styles.button, { borderRadius: 8, overflow: 'hidden' }]}>
                    <Text style={styles.buttonText}>⏹️ Stop Session</Text>
                  </TouchableOpacity>
                </BlurView>
              </BlurView>
            )}
            {timerMode === 'break' && isRunning && (
              <View style={styles.timerDisplay}>
                <Text style={styles.timerEmoji}>☕</Text>
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                <Text style={styles.timerSubText}>Break: {currentExercise}</Text>
                <BlurView intensity={50} tint="dark" style={[styles.glassBox, { borderRadius: 8 }]}>
                <TouchableOpacity onPress={skipBreak} style={[styles.button, { borderRadius: 8, overflow: 'hidden' }]}>
                  <Text style={styles.buttonText}>⏭️ Skip Break</Text>
                </TouchableOpacity>
              </BlurView>
              </View>
            )}
            {timerMode === 'idle' && (
              <View style={styles.idleContainer}>
                <BlurView intensity={50} tint="dark" style={[styles.glassBox, { borderRadius: 8 }]}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    !selectedSubQuestId ? { opacity: 0.6 } : {},
                    { borderRadius: 8, overflow: 'hidden' }
                  ]}
                  onPress={startPomodoro}
                  disabled={!selectedSubQuestId}
                >
                  <Text style={[
                    styles.buttonText,
                    !selectedSubQuestId ? styles.buttonTextDisabled : {}
                  ]}>
                    🍅 Start Focus Session
                  </Text>
                </TouchableOpacity>
              </BlurView>

                {!selectedSubQuestId && (
                  <Text style={styles.hintText}>💡 Select a sub-task to start focusing</Text>
                )}
              </View>
            )}
          </BlurView>

          {/* Quest Creation Section */}
          <BlurView intensity={50} tint="dark" style={[styles.section, styles.glassBox]}>
            <Text style={styles.sectionTitle}>📝 New Quest</Text>
            <TextInput style={styles.input} placeholder="What is your main goal?" value={newQuestTitle} onChangeText={setNewQuestTitle} />
            <TextInput style={styles.input} placeholder="Estimated focus sessions" keyboardType="numeric" value={newQuestEstimate} onChangeText={setNewQuestEstimate} />
            <BlurView intensity={50} tint="dark" style={[styles.glassBox, { borderRadius: 8 }]}>
              <TouchableOpacity style={[styles.button, { borderRadius: 8, overflow: 'hidden' }]} onPress={addQuest}><Text style={styles.buttonText}>➕ Add Quest</Text></TouchableOpacity>
            </BlurView>
          </BlurView>

          {/* Quest List Section */}
          <View style={styles.section}>
            <View style={styles.dateNavigator}>
              <BlurView intensity={50} tint="dark" style={[styles.glassBox, { borderRadius: 8 }]}>
                <TouchableOpacity onPress={() => changeDate(-1)} style={[styles.dateButton, { borderRadius: 8, overflow: 'hidden' }]}><Text style={styles.dateButtonText}>‹ Prev</Text></TouchableOpacity>
              </BlurView>
              <Text style={styles.sectionTitle}>🎯 Your Quests</Text>
              <BlurView intensity={50} tint="dark" style={[styles.glassBox, { borderRadius: 8 }]}>
                <TouchableOpacity onPress={() => changeDate(1)} style={[styles.dateButton, { borderRadius: 8, overflow: 'hidden' }]}><Text style={styles.dateButtonText}>Next ›</Text></TouchableOpacity>
              </BlurView>
            </View>
            {quests.length === 0 ? (
              <Text style={styles.emptyText}>🌟 No quests for this day. Create your first quest!</Text>
            ) : (
              quests.map(item => (
                <BlurView intensity={50} tint="dark" style={styles.questItem} key={item.id}>
                  <TouchableOpacity
                    style={[
                      {width: '100%'},
                      selectedQuestId === item.id && styles.questItemSelected
                    ]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setSelectedQuestId(item.id);
                    }}
                  >
                    <Text style={styles.questTitle}>{item.isComplete ? '✓' : '○'} {item.title}</Text>
                    <Text style={styles.questProgress}>{item.completed} / {item.estimated} sessions</Text>
                    {selectedQuestId === item.id && (
                      <BlurView intensity={70} tint="dark" style={styles.subQuestContainer}>
                        {Array.from({ length: item.estimated }).map((_, i) => {
                          const sub = item.subQuests[i];
                          if (sub) {
                            return (
                              <TouchableOpacity 
                            key={sub.id} 
                            style={[
                              styles.subQuestItem,
                              selectedSubQuestId === sub.id && styles.subQuestItemSelected,
                              sub.isComplete && styles.subQuestItemComplete
                            ]}
                            onPress={() => {
                              if (!sub.isComplete) {
                                setSelectedSubQuestId(selectedSubQuestId === sub.id ? null : sub.id);
                              }
                            }}
                          >
                            <Text style={[
                              styles.subQuestTitle,
                              sub.isComplete && styles.subQuestTitleComplete
                            ]}>
                              {sub.isComplete ? '✅' : (selectedSubQuestId === sub.id ? '🎯' : '⚪')} {sub.title}
                            </Text>
                          </TouchableOpacity>
                        );
                      } else {
                        return (
                          <View key={`placeholder-${i}`} style={styles.subQuestPlaceholder}>
                            <Text style={styles.subQuestPlaceholderText}>Empty Slot</Text>
                          </View>
                        );
                      }
                    })}
                    {item.subQuests.length < item.estimated && (
                      <View style={styles.addSubQuestContainer}>
                        <TextInput
                          style={styles.subQuestInput}
                          placeholder="➕ Add a sub-task..."
                          value={newSubQuestTitle}
                          onChangeText={setNewSubQuestTitle}
                        />
                        <BlurView intensity={50} tint="dark" style={[styles.glassBox, { borderRadius: 8 }]}>
                          <TouchableOpacity
                            onPress={() => {
                              if (!newSubQuestTitle.trim()) return;
                              if (item.subQuests.length >= item.estimated) return;
                              const newSub = { id: uuid.v4().toString(), title: newSubQuestTitle.trim(), isComplete: false };
                              setQuestsByDate(prev => ({
                                ...prev,
                                [selectedDate]: prev[selectedDate].map(q =>
                                  q.id === item.id ? { ...q, subQuests: [...q.subQuests, newSub] } : q
                                )
                              }));
                              setNewSubQuestTitle('');
                            }}
                            style={[styles.addButton, { borderRadius: 8, overflow: 'hidden' }]} 
                          >
                            <Text style={styles.addButtonText}>➕</Text>
                          </TouchableOpacity>
                        </BlurView>
                      </View>
                    )}
                      </BlurView>
                    )}
                  </TouchableOpacity>
                </BlurView>
              ))
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  glassBox: {
    borderRadius: 8,
    padding:16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    overflow: 'hidden',
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: { paddingHorizontal: 20, paddingVertical: 40 },
  header: { marginBottom: 30, paddingTop: 40 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 36, fontWeight: 'bold', color: COLORS.white, fontFamily: 'DancingScript_400Regular' },
  settingsButton: { fontSize: 24, color: COLORS.primary },
  settingsButtonGlass: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  settingsButtonTouchable: {
    padding: 8,
  },
  headerDate: { fontSize: 18, fontWeight: '500', color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },

  // Level Section Styles
  levelSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  animalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  currentAnimal: {
    fontSize: 60,
    marginRight: 15,
  },
  animalInfo: {
    flex: 1,
  },
  animalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  animalDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  xpContainer: {
    marginTop: 10,
  },
  xpBarContainer: {
    marginBottom: 10,
  },
  xpBarBackground: {
    height: 12,
    backgroundColor: COLORS.xpBarBg,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 5,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.xpBar,
    borderRadius: 6,
  },
  xpText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  nextLevelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nextLevelText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  xpNeeded: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  
  // Level Up Modal Styles
  levelUpModal: {
    position: 'absolute',
    top: '30%',
    left: 20,
    right: 20,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 3,
    borderColor: COLORS.xpBar,
  },
  levelUpTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 15,
  },
  levelUpAnimal: {
    fontSize: 80,
    marginBottom: 15,
  },
  levelUpText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 5,
  },
  levelUpDescription: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  section: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: COLORS.white, marginBottom: 15 },
  settingsSection: { 
    marginBottom: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border, 
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 15
  },
  settingsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  settingsLabel: { flex: 1, fontSize: 16, color: COLORS.text },
  settingsInput: {
    width: 60,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    textAlign: 'center',
    color: COLORS.text,
  },
  settingsButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  buttonSecondary: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondaryText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  timerHeader: { alignItems: 'center', marginBottom: 10 },
  timerSettingsText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  timerDisplay: { alignItems: 'center', paddingVertical: 20 },
  timerEmoji: { fontSize: 48, marginBottom: 10 },
  timerText: { fontSize: 64, fontWeight: '300', color: COLORS.primary, marginBottom: 5 },
  timerSubText: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginBottom: 20 },
  idleContainer: { alignItems: 'center', paddingVertical: 20 },
  hintText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 15, fontStyle: 'italic' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: COLORS.text,
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    overflow: 'hidden',
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  buttonTextDisabled: { color: COLORS.primaryMuted },
  buttonClear: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonClearText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  dateNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  dateButton: {},
  dateButtonText: { fontSize: 16, color: COLORS.primary, fontWeight: '500' },
  questItem: {
    flex: 1,
    backgroundColor: 'rgba(30,30,30,0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    overflow: 'hidden',
  },
  questItemSelected: {
    borderColor: COLORS.primary,
  },
  questTitle: { fontSize: 18, fontWeight: '500', color: COLORS.text, fontFamily: 'DancingScript_400Regular' },
  questProgress: { fontSize: 14, color: COLORS.textMuted, marginTop: 5 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, paddingVertical: 20, fontSize: 16 },
  questCard: {
    backgroundColor: 'rgba(30,30,30,0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    overflow: 'hidden',
  },
  subQuestContainer: {
    marginTop: 15,
    paddingLeft: 15,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
  },
  subQuestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  subQuestItemSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  subQuestItemComplete: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  subQuestTitle: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
    fontFamily: 'DancingScript_400Regular',
  },
  subQuestTitleComplete: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  subQuestPlaceholder: {
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    height: 40, // Approximate height of a subQuestItem
  },
  subQuestPlaceholderText: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  addSubQuestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  subQuestInput: {
    flex: 1,
    backgroundColor: 'rgba(30,30,30,0.4)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: COLORS.text,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  pauseButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginVertical: 8,
    alignSelf: 'center',
  },
});