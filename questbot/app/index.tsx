import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, UIManager, LayoutAnimation, Animated
} from 'react-native';
import uuid from 'react-native-uuid';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONFIG & CONSTANTS ---
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
  text: '#3B3B3B',
  textMuted: '#8A8A8A',
  primary: '#4A5C6A',
  primaryMuted: '#D9E0E5',
  accent: '#C8A2C8',
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

// --- MAIN COMPONENT ---
export default function HomeScreen() {
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
    if (!isRunning || timeLeft <= 0) {
      if (timeLeft <= 0 && timerMode === 'pomodoro') {
        // Auto-start break after pomodoro completion
        setCurrentExercise(INDOOR_EXERCISES[Math.floor(Math.random() * INDOOR_EXERCISES.length)]);
        setTimerMode('break');
        setTimeLeft(breakDuration);
        setIsRunning(true);
        handleFinishSession();
        return;
      }
      if (timeLeft <= 0 && timerMode === 'break') {
        // End break and reset to idle
        setTimerMode('idle');
        setTimeLeft(pomodoroDuration);
      }
      setIsRunning(false);
      return;
    }
    const interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, timerMode, pomodoroDuration, breakDuration]);

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
  };

  const startPomodoro = () => {
    if (!selectedSubQuestId) return;
    setTimerMode('pomodoro');
    setTimeLeft(pomodoroDuration);
    setIsRunning(true);
  };

  const startBreak = () => {
    setCurrentExercise(INDOOR_EXERCISES[Math.floor(Math.random() * INDOOR_EXERCISES.length)]);
    setTimerMode('break');
    setTimeLeft(breakDuration);
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

  // --- UI RENDER ---
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>🍅 FocusQuest</Text>
            <TouchableOpacity onPress={() => setShowSettings(!showSettings)}>
              <Text style={styles.settingsButton}>⚙️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerDate}>{new Date(selectedDate).toDateString()}</Text>
          
          {/* Level Up Section */}
          <View style={styles.levelSection}>
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
          </View>

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

        {/* Level Up Modal */}
        {showLevelUp && (
          <Animated.View style={[
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
          </Animated.View>
        )}

        {/* Settings Section */}
        {showSettings && (
          <View style={styles.settingsSection}>
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
              <TouchableOpacity style={styles.buttonSecondary} onPress={resetToDefaults}>
                <Text style={styles.buttonSecondaryText}>Reset to Defaults</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={updateTimerSettings}>
                <Text style={styles.buttonText}>Save Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Timer Section */}
        <View style={styles.section}>
          <View style={styles.timerHeader}>
            <Text style={styles.timerSettingsText}>
              🍅 {Math.floor(pomodoroDuration / 60)}min • ☕ {Math.floor(breakDuration / 60)}min
            </Text>
          </View>
          {timerMode === 'pomodoro' && isRunning && (
            <View style={styles.timerDisplay}>
              <Text style={styles.timerEmoji}>🍅</Text>
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              <Text style={styles.timerSubText}>Focusing on: {selectedSubQuest?.title}</Text>
              <TouchableOpacity style={styles.button} onPress={() => {
                setTimerMode('idle');
                setIsRunning(false);
                setTimeLeft(pomodoroDuration);
              }}>
                <Text style={styles.buttonText}>⏹️ Stop Session</Text>
              </TouchableOpacity>
            </View>
          )}
          {timerMode === 'break' && isRunning && (
            <View style={styles.timerDisplay}>
              <Text style={styles.timerEmoji}>☕</Text>
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              <Text style={styles.timerSubText}>Break: {currentExercise}</Text>
              <TouchableOpacity style={styles.button} onPress={skipBreak}>
                <Text style={styles.buttonText}>⏭️ Skip Break</Text>
              </TouchableOpacity>
            </View>
          )}
          {timerMode === 'idle' && (
            <View style={styles.idleContainer}>
              <TouchableOpacity style={styles.button} onPress={startPomodoro} disabled={!selectedSubQuestId}>
                <Text style={[styles.buttonText, !selectedSubQuestId && styles.buttonTextDisabled]}>
                  🍅 Start Focus Session
                </Text>
              </TouchableOpacity>
              {!selectedSubQuestId && (
                <Text style={styles.hintText}>💡 Select a sub-task to start focusing</Text>
              )}
            </View>
          )}
        </View>

        {/* Quest Creation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 New Quest</Text>
          <TextInput style={styles.input} placeholder="What is your main goal?" value={newQuestTitle} onChangeText={setNewQuestTitle} />
          <TextInput style={styles.input} placeholder="Estimated focus sessions" keyboardType="numeric" value={newQuestEstimate} onChangeText={setNewQuestEstimate} />
          <TouchableOpacity style={styles.button} onPress={addQuest}><Text style={styles.buttonText}>➕ Add Quest</Text></TouchableOpacity>
        </View>

        {/* Quest List Section */}
        <View style={styles.section}>
          <View style={styles.dateNavigator}>
            <TouchableOpacity onPress={() => changeDate(-1)}><Text style={styles.dateButton}>‹ Prev</Text></TouchableOpacity>
            <Text style={styles.sectionTitle}>🎯 Your Quests</Text>
            <TouchableOpacity onPress={() => changeDate(1)}><Text style={styles.dateButton}>Next ›</Text></TouchableOpacity>
          </View>
          {quests.length === 0 ? (
            <Text style={styles.emptyText}>🌟 No quests for this day. Create your first quest!</Text>
          ) : (
            quests.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.questItem, selectedQuestId === item.id && styles.questItemSelected]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSelectedQuestId(item.id);
                }}
              >
                <Text style={styles.questTitle}>{item.isComplete ? '✓' : '○'} {item.title}</Text>
                <Text style={styles.questProgress}>{item.completed} / {item.estimated} sessions</Text>
                
                {selectedQuestId === item.id && (
                  <View style={styles.subQuestContainer}>
                    {item.subQuests.map((sub, i) => (
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
                    ))}
                    <View style={styles.addSubQuestContainer}>
                      <TextInput
                        style={styles.subQuestInput}
                        placeholder="➕ Add a sub-task..."
                        value={newSubQuestTitle}
                        onChangeText={setNewSubQuestTitle}
                      />
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                          if (!newSubQuestTitle.trim()) return;
                          const newSub = { id: uuid.v4().toString(), title: newSubQuestTitle.trim(), isComplete: false };
                          setQuestsByDate(prev => ({
                            ...prev,
                            [selectedDate]: prev[selectedDate].map(q =>
                              q.id === item.id ? { ...q, subQuests: [...q.subQuests, newSub] } : q
                            )
                          }));
                          setNewSubQuestTitle('');
                        }}
                      >
                        <Text style={styles.addButtonText}>➕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 20, paddingVertical: 40 },
  header: { marginBottom: 30, paddingTop: 40 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 36, fontWeight: 'bold', color: COLORS.text },
  settingsButton: { fontSize: 24, color: COLORS.primary },
  headerDate: { fontSize: 18, fontWeight: '500', color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  
  // Level Section Styles
  levelSection: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: COLORS.text,
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
    color: COLORS.text,
    marginBottom: 15,
  },
  levelUpAnimal: {
    fontSize: 80,
    marginBottom: 15,
  },
  levelUpText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
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
  sectionTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 15 },
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 10,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
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
  dateButton: { fontSize: 16, color: COLORS.primary, fontWeight: '500' },
  questItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  questItemSelected: { backgroundColor: COLORS.primaryMuted, borderLeftColor: COLORS.primary },
  questTitle: { fontSize: 18, fontWeight: '500', color: COLORS.text },
  questProgress: { fontSize: 14, color: COLORS.textMuted, marginTop: 5 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, paddingVertical: 20, fontSize: 16 },
  subQuestContainer: {
    marginTop: 15,
    paddingLeft: 15,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
  },
  subQuestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 5,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subQuestItemSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  subQuestItemComplete: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  subQuestTitle: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  subQuestTitleComplete: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  addSubQuestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  subQuestInput: {
    flex: 1,
    backgroundColor: COLORS.white,
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
});