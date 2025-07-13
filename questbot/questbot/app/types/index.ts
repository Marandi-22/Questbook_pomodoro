// This file exports types and interfaces used throughout the application.

export type SubQuest = {
  id: string;
  title: string;
  isComplete: boolean;
};

export type Quest = {
  id: string;
  title: string;
  estimated: number;
  completed: number;
  isComplete: boolean;
  subQuests: SubQuest[];
};

export type DatedQuests = {
  [date: string]: Quest[];
};

export type DailyGoals = {
  [date: string]: number;
};

export type CompletedTasks = {
  [date: string]: number;
};

export type CheckpointNodeProps = {
  date: string;
  isCompleted: boolean;
  isSelected: boolean;
  onSelect: (date: string) => void;
};