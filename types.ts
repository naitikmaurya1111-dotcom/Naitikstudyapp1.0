import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  isStudying: boolean;
  currentSubject?: string;
  lastActive?: number; // Unix Timestamp for local, converted for Firebase
  studyTimeToday: number; // in seconds
  roomId?: string | null; // The currently connected room
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  startTime: Date;
  endTime: Date | null;
  durationSeconds: number;
  memo?: string; 
}

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface Room {
  id: string;
  name: string;
  password?: string; // Stored in DB to verify join
  description: string;
  memberCount: number;
  ownerId: string;
  members: string[]; 
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
  isCalendarEvent?: boolean;
}

export enum AppRoute {
  PLANNER = 'PLANNER',
  GROUPS = 'GROUPS', // Now represents "Rooms"
  GROUP_DETAIL = 'GROUP_DETAIL',
  STATS = 'STATS',
  SETTINGS = 'SETTINGS'
}

export type GroupTab = 'HOME' | 'ATTENDANCE' | 'RANKINGS' | 'CHAT';