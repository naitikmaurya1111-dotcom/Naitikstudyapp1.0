import { StudySession, Subject } from '../types';

const STORAGE_KEY = 'ypt_guest_sessions';
const GUEST_FLAG_KEY = 'ypt_is_guest_mode';
const SUBJECTS_KEY = 'ypt_custom_subjects';

// --- Session Management ---
export const getGuestSessions = (): StudySession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((s: any) => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: s.endTime ? new Date(s.endTime) : null
    }));
  } catch (e) {
    console.error("Failed to load guest sessions", e);
    return [];
  }
};

export const saveGuestSession = (session: Omit<StudySession, 'id'>) => {
    const sessions = getGuestSessions();
    const newSession = { ...session, id: `local_${Date.now()}` };
    sessions.push(newSession as StudySession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return newSession.id;
};

export const deleteGuestSession = (sessionId: string) => {
    let sessions = getGuestSessions();
    sessions = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const getGuestTodayTotal = (): number => {
    const sessions = getGuestSessions();
    const today = new Date();
    today.setHours(0,0,0,0);

    return sessions
        .filter(s => {
            const d = s.startTime instanceof Date ? s.startTime : new Date(s.startTime);
            return d >= today;
        })
        .reduce((acc, curr) => acc + curr.durationSeconds, 0);
};

// --- Auth Persistence ---
export const setGuestMode = (isGuest: boolean) => {
    if (isGuest) {
        localStorage.setItem(GUEST_FLAG_KEY, 'true');
    } else {
        localStorage.removeItem(GUEST_FLAG_KEY);
    }
};

export const isGuestModeActive = (): boolean => {
    return localStorage.getItem(GUEST_FLAG_KEY) === 'true';
};

// --- Custom Subjects ---
export const getStoredSubjects = (): Subject[] => {
    try {
        const stored = localStorage.getItem(SUBJECTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const saveStoredSubject = (subject: Subject) => {
    const current = getStoredSubjects();
    const updated = [...current, subject];
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(updated));
    return updated;
};