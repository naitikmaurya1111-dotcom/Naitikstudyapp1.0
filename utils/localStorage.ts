import { StudySession, Subject, UserProfile } from '../types';

const KEYS = {
    USER_ID: 'ypt_local_uid',
    PROFILE: 'ypt_local_profile',
    SESSIONS: 'ypt_local_sessions',
    SUBJECTS: 'ypt_local_subjects',
    ACTIVE_SESSION: 'ypt_active_session',
    ROOM_ID: 'ypt_connected_room_id'
};

// --- User Management ---
export const getLocalUserId = (): string => {
    let uid = localStorage.getItem(KEYS.USER_ID);
    if (!uid) {
        uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem(KEYS.USER_ID, uid);
    }
    return uid;
};

export const getLocalProfile = (): UserProfile => {
    const stored = localStorage.getItem(KEYS.PROFILE);
    if (stored) return JSON.parse(stored);
    
    // Default Profile
    const newProfile: UserProfile = {
        uid: getLocalUserId(),
        displayName: 'Student',
        photoURL: null,
        isStudying: false,
        studyTimeToday: 0
    };
    saveLocalProfile(newProfile);
    return newProfile;
};

export const saveLocalProfile = (profile: UserProfile) => {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
};

export const updateLocalProfileName = (name: string) => {
    const p = getLocalProfile();
    p.displayName = name;
    saveLocalProfile(p);
    return p;
};

// --- Subjects ---
const DEFAULT_SUBJECTS: Subject[] = [
  { id: '1', name: 'Mathematics', color: '#008080' },
  { id: '2', name: 'Physics', color: '#CD5C5C' },
  { id: '3', name: 'Chemistry', color: '#708090' },
  { id: '4', name: 'English', color: '#E9967A' },
  { id: '5', name: 'Coding', color: '#6A5ACD' },
];

export const getLocalSubjects = (): Subject[] => {
    const stored = localStorage.getItem(KEYS.SUBJECTS);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(DEFAULT_SUBJECTS));
    return DEFAULT_SUBJECTS;
};

export const saveLocalSubject = (subject: Subject) => {
    const subjects = getLocalSubjects();
    subjects.push(subject);
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(subjects));
    return subjects;
};

// --- Sessions ---
export const getLocalSessions = (): StudySession[] => {
    const stored = localStorage.getItem(KEYS.SESSIONS);
    if (!stored) return [];
    return JSON.parse(stored).map((s: any) => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: s.endTime ? new Date(s.endTime) : null
    }));
};

export const saveLocalSession = (session: StudySession) => {
    const sessions = getLocalSessions();
    // Check if exists (for updates)
    const index = sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
        sessions[index] = session;
    } else {
        sessions.push(session);
    }
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
};

export const deleteLocalSession = (id: string) => {
    const sessions = getLocalSessions().filter(s => s.id !== id);
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
};

export const getTodayTotalSeconds = (): number => {
    const sessions = getLocalSessions();
    const now = new Date();
    // Logic: Day starts at 4AM
    if (now.getHours() < 4) now.setDate(now.getDate() - 1);
    now.setHours(4, 0, 0, 0);

    return sessions
        .filter(s => s.startTime >= now)
        .reduce((acc, curr) => acc + curr.durationSeconds, 0);
};

// --- Resume State (Active Timer) ---
export const saveActiveSessionState = (sessionData: any) => {
    localStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify(sessionData));
};

export const getActiveSessionState = () => {
    const stored = localStorage.getItem(KEYS.ACTIVE_SESSION);
    return stored ? JSON.parse(stored) : null;
};

export const clearActiveSessionState = () => {
    localStorage.removeItem(KEYS.ACTIVE_SESSION);
};

// --- Room ---
export const getConnectedRoomId = (): string | null => {
    return localStorage.getItem(KEYS.ROOM_ID);
};

export const setConnectedRoomId = (roomId: string | null) => {
    if (roomId) localStorage.setItem(KEYS.ROOM_ID, roomId);
    else localStorage.removeItem(KEYS.ROOM_ID);
};