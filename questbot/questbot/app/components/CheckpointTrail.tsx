import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

type CheckpointTrailProps = {
  questsByDate: { [date: string]: any[] };
  completedTasks: { [date: string]: number };
  dailyGoals: { [date: string]: number };
  selectedDate: string;
  onDateSelect: (date: string) => void;
};

const CheckpointTrail: React.FC<CheckpointTrailProps> = ({
  questsByDate,
  completedTasks,
  dailyGoals,
  selectedDate,
  onDateSelect,
}) => {
  const today = new Date();
  const daysToShow = 30; // Show the next 30 days

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const completedCount = completedTasks[dateString] || 0;
      const goal = dailyGoals[dateString] || 0;
      const isSelected = dateString === selectedDate;

      days.push(
        <TouchableOpacity
          key={dateString}
          style={[
            styles.node,
            isSelected && styles.nodeSelected,
            completedCount >= goal && styles.nodeCompleted,
          ]}
          onPress={() => onDateSelect(dateString)}
        >
          <Text style={styles.nodeText}>{date.getDate()}</Text>
          {goal > 0 && (
            <Text style={styles.goalText}>
              {completedCount}/{goal}
            </Text>
          )}
        </TouchableOpacity>
      );
    }
    return days;
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {renderDays()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  node: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  nodeSelected: {
    backgroundColor: '#4A5C6A',
  },
  nodeCompleted: {
    backgroundColor: '#4CAF50',
  },
  nodeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  goalText: {
    fontSize: 12,
    color: '#3B3B3B',
  },
});

export default CheckpointTrail;