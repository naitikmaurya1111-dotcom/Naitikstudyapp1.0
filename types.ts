import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  isStudying: boolean;
  currentSubject?: string;
  lastActive?: Timestamp; // The heartbeat timestamp
  studyTimeToday: number; // in seconds
  joinedGroupIds?: string[];
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  startTime: Timestamp | Date; // Date for Local, Timestamp for Firebase
  endTime: Timestamp | Date | null;
  durationSeconds: number;
  memo?: string; 
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  isCalendarEvent: boolean;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface GroupSettings {
  dailyGoalSeconds: number; // e.g., 7 hours = 25200
  maxCapacity: number;
  category: string;
  isPublic: boolean;
  password?: string;
  nicknameRules: boolean;
  intro?: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  ownerId: string;
  createdAt: Timestamp;
  members: string[]; 
  settings: GroupSettings; // New settings object
}

export interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  photoURL: string | null;
  createdAt: Timestamp;
}

export enum AppRoute {
  LOGIN = 'LOGIN',
  PLANNER = 'PLANNER',
  GROUPS = 'GROUPS',
  GROUP_DETAIL = 'GROUP_DETAIL',
  STATS = 'STATS',
  SETTINGS = 'SETTINGS'
}

export type GroupTab = 'HOME' | 'ATTENDANCE' | 'RANKINGS' | 'CHAT';