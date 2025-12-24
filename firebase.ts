import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc,
  Timestamp,
  getDoc,
  arrayUnion,
  increment,
  deleteDoc,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  getDocs
} from "firebase/firestore";
import { GroupSettings } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyCHr1R12hY6cqUKjTqSL3RDnZvbRvGtX0g",
  authDomain: "naitikstudyapp1.firebaseapp.com",
  projectId: "naitikstudyapp1",
  storageBucket: "naitikstudyapp1.firebasestorage.app",
  messagingSenderId: "111741373060",
  appId: "1:111741373060:web:fed13452cf8055342a90d1",
  measurementId: "G-X74SQ6QSWN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Add scope for Google Calendar
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');

// Auth Functions
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    const user = result.user;
    
    const userRef = doc(db, 'users', user.uid);
    // Don't overwrite existing fields like studyTimeToday if they exist
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastActive: serverTimestamp(),
    }, { merge: true });

    return { user, token };
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
};

export const updateUserProfileName = async (user: User, name: string) => {
    await updateProfile(user, { displayName: name });
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { displayName: name });
};

// --- STUDY LOGIC & HEARTBEAT ---

export const sendHeartbeat = async (uid: string) => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        lastActive: serverTimestamp()
    });
};

export const updateUserStatus = async (uid: string, isStudying: boolean, currentSubject?: string) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    isStudying,
    currentSubject: isStudying ? currentSubject : null,
    lastActive: serverTimestamp()
  });
};

export const startStudySession = async (uid: string, subjectId: string, subjectName: string, subjectColor: string) => {
  await updateUserStatus(uid, true, subjectName);
  const sessionRef = await addDoc(collection(db, 'sessions'), {
    userId: uid,
    subjectId,
    subjectName,
    subjectColor,
    startTime: serverTimestamp(),
    endTime: null,
    durationSeconds: 0
  });
  return sessionRef.id;
};

export const endStudySession = async (uid: string, sessionId: string, duration: number, memo: string = "") => {
  await updateUserStatus(uid, false);
  const sessionRef = doc(db, 'sessions', sessionId);
  await updateDoc(sessionRef, {
    endTime: serverTimestamp(),
    durationSeconds: duration,
    memo: memo
  });
  
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    studyTimeToday: increment(duration)
  });
};

export const deleteSession = async (uid: string, sessionId: string, duration: number) => {
  await deleteDoc(doc(db, 'sessions', sessionId));
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    studyTimeToday: increment(-duration)
  });
};

export const updateSessionDuration = async (uid: string, sessionId: string, oldDuration: number, newDuration: number) => {
    const sessionRef = doc(db, 'sessions', sessionId);
    const userRef = doc(db, 'users', uid);
    
    const batch = writeBatch(db);
    
    // Update Session
    batch.update(sessionRef, {
        durationSeconds: newDuration,
        // Approximate end time adjustment based on new duration
        // logic: endTime = startTime + newDuration
    });

    // Update User Total
    const diff = newDuration - oldDuration;
    if (diff !== 0) {
        batch.update(userRef, {
            studyTimeToday: increment(diff)
        });
    }

    await batch.commit();
};

// --- GROUP FEATURES ---

export const createGroup = async (userId: string, name: string, description: string, category: string) => {
  const defaultSettings: GroupSettings = {
      dailyGoalSeconds: 7 * 3600, // 7 Hours default
      maxCapacity: 50,
      category: category,
      isPublic: true,
      nicknameRules: true,
      intro: description
  };

  const groupRef = await addDoc(collection(db, 'groups'), {
    name,
    description,
    ownerId: userId,
    memberCount: 1,
    members: [userId],
    createdAt: serverTimestamp(),
    settings: defaultSettings
  });

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    joinedGroupIds: arrayUnion(groupRef.id)
  });

  return groupRef.id;
};

// STRONG JOIN: Uses Transaction to prevent race conditions exceeding capacity
export const joinGroup = async (userId: string, groupId: string) => {
  const groupRef = doc(db, 'groups', groupId);
  const userRef = doc(db, 'users', userId);

  await runTransaction(db, async (transaction) => {
      const groupDoc = await transaction.get(groupRef);
      if (!groupDoc.exists()) {
          throw new Error("Group does not exist!");
      }

      const data = groupDoc.data();
      const currentMembers = data.members || [];
      const capacity = data.settings?.maxCapacity || 50;

      if (currentMembers.includes(userId)) {
          return; // Already joined
      }

      if (data.memberCount >= capacity) {
          throw new Error("Group is full!");
      }

      transaction.update(groupRef, {
          members: arrayUnion(userId),
          memberCount: increment(1)
      });

      transaction.update(userRef, {
          joinedGroupIds: arrayUnion(groupId)
      });
  });
};

export const updateGroupSettings = async (groupId: string, settings: Partial<GroupSettings>) => {
    const groupRef = doc(db, 'groups', groupId);
    const updateData: any = {};
    Object.entries(settings).forEach(([key, value]) => {
        updateData[`settings.${key}`] = value;
    });
    await updateDoc(groupRef, updateData);
};

export const deleteGroup = async (groupId: string) => {
    // 1. Get group to find members
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) return;
    
    // 2. Remove group ID from all members (Ideally done via Cloud Functions, but doing client-side best effort here)
    // Note: This might be slow for large groups client-side.
    // In production, just delete the group doc and let a background trigger clean up users.
    await deleteDoc(groupRef);
};


// --- CHAT FEATURES ---

export const sendGroupMessage = async (groupId: string, user: User, text: string) => {
  await addDoc(collection(db, `groups/${groupId}/messages`), {
    userId: user.uid,
    userName: user.displayName || 'Anonymous',
    photoURL: user.photoURL,
    text,
    createdAt: serverTimestamp()
  });
};

export const subscribeToGroupMessages = (groupId: string, callback: (messages: any[]) => void) => {
  const q = query(
    collection(db, `groups/${groupId}/messages`),
    orderBy('createdAt', 'asc'),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
};


// Real-time Listeners

export const subscribeToUserGroups = (userId: string, callback: (groups: any[]) => void) => {
  const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(groups);
  });
};

export const subscribeToGroupMembers = (groupId: string, callback: (members: any[]) => void) => {
  // Queries users who have this groupId in their joined list
  const q = query(collection(db, 'users'), where('joinedGroupIds', 'array-contains', groupId)); 
  return onSnapshot(q, (snapshot) => {
    const members = snapshot.docs.map(doc => doc.data());
    callback(members);
  });
};

export const subscribeToGroupDetails = (groupId: string, callback: (data: any) => void) => {
  const docRef = doc(db, 'groups', groupId);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    }
  });
};

export const subscribeToTodaySessions = (uid: string, callback: (sessions: any[]) => void) => {
  // OPTIMIZED: Use server-side Timestamp filtering with 4 AM logic
  const now = new Date();
  
  // If current time is before 4 AM, we are technically in "yesterday's" study day
  if (now.getHours() < 4) {
      now.setDate(now.getDate() - 1);
  }

  const startOfDay = new Date(now);
  startOfDay.setHours(4, 0, 0, 0); // 4 AM start
  
  const endOfDay = new Date(now);
  endOfDay.setDate(endOfDay.getDate() + 1);
  endOfDay.setHours(4, 0, 0, 0); // 4 AM next day end

  const q = query(
      collection(db, 'sessions'), 
      where('userId', '==', uid),
      where('startTime', '>=', startOfDay),
      where('startTime', '<=', endOfDay)
  );

  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(sessions);
  });
};

export const subscribeToHistorySessions = (uid: string, callback: (sessions: any[]) => void) => {
  const q = query(
      collection(db, 'sessions'), 
      where('userId', '==', uid),
      orderBy('startTime', 'desc'),
      limit(200)
  );
  
  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(sessions);
  });
};

// Helper to fetch attendance for multiple users for a date range (Not real-time, one-off fetch)
export const fetchGroupWeeklyStats = async (memberIds: string[], startDate: Date, endDate: Date) => {
    if (memberIds.length === 0) return [];
    
    // Firestore 'in' query supports max 10 items. If > 10, we'd need multiple queries. 
    // For simplicity in this clone, we'll fetch sessions for the range and filter in memory if group is large, 
    // OR just fetch per user if group is small.
    // Better strategy: Store daily aggregates in a subcollection `users/{uid}/daily_stats/{date}`.
    
    // Fallback implementation: Query sessions in range.
    // Warning: Index required for complex queries.
    
    const q = query(
        collection(db, 'sessions'),
        where('startTime', '>=', startDate),
        where('startTime', '<=', endDate),
        // orderBy('startTime', 'desc') // Requires composite index
    );

    const snapshot = await getDocs(q);
    const sessions = snapshot.docs.map(doc => doc.data());
    
    // Filter for members only (since we can't 'in' query easily with date range without specific index)
    return sessions.filter(s => memberIds.includes(s.userId));
};