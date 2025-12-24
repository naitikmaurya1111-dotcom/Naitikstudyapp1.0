import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  linkWithPopup
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
  getDoc, 
  arrayUnion,
  increment,
  deleteDoc,
  orderBy,
  limit,
  runTransaction
} from "firebase/firestore";
import { Room, StudySession, UserProfile } from "./types";

// NOTE: Use your own Firebase Config here for Room Syncing to work.
// If config is invalid, app works in "Offline Mode".
const firebaseConfig = {
  apiKey: "AIzaSyCHr1R12hY6cqUKjTqSL3RDnZvbRvGtX0g",
  authDomain: "naitikstudyapp1.firebaseapp.com",
  databaseURL: "https://naitikstudyapp1-default-rtdb.firebaseio.com",
  projectId: "naitikstudyapp1",
  storageBucket: "naitikstudyapp1.firebasestorage.app",
  messagingSenderId: "111741373060",
  appId: "1:111741373060:web:fed13452cf8055342a90d1",
  measurementId: "G-X74SQ6QSWN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Anonymous Auth immediately (fallback)
signInAnonymously(auth).catch((error) => {
    console.log("Offline Mode: Could not connect to Firebase (Check config)", error);
});

// --- AUTH FUNCTIONS ---

export const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Request read-only access to Calendar
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    
    let result;
    try {
        result = await signInWithPopup(auth, provider);
    } catch (error: any) {
        // Handle credential already in use by linking if necessary, 
        // or just throw to let UI handle it. 
        // For this app's simple flow, re-throwing is safest.
        console.error("Google Sign In Error", error);
        throw error;
    }

    // Get the Google Access Token for Calendar API
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken; 
    const user = result.user;
    
    // Create/Update user in Firestore
    if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          lastActive: serverTimestamp(),
        }, { merge: true });
    }

    return { user, token };
};

export const loginWithEmailPassword = async (email: string, pass: string) => {
    return await signInWithEmailAndPassword(auth, email, pass);
};

export const registerWithEmailPassword = async (name: string, email: string, pass: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (result.user) {
        await updateProfile(result.user, { displayName: name });
    }
    return result;
};

// --- SYNC FUNCTIONS (Local -> Cloud) ---

export const syncUserProfileToRoom = async (profile: UserProfile, roomId: string) => {
    try {
        const userRef = doc(db, 'rooms', roomId, 'members', profile.uid);
        await setDoc(userRef, {
            ...profile,
            lastActive: serverTimestamp(), // Use server timestamp for accuracy
        }, { merge: true });
    } catch (e) {
        console.warn("Sync failed (Offline?)");
    }
};

export const syncSessionToRoom = async (session: StudySession, roomId: string) => {
    try {
        // We store sessions in a subcollection of the room for stats
        const sessionRef = doc(db, 'rooms', roomId, 'sessions', session.id);
        await setDoc(sessionRef, {
            ...session,
            startTime: session.startTime, // Firestore handles JS Date objects
            endTime: session.endTime
        });
        
        // Update member total
        const memberRef = doc(db, 'rooms', roomId, 'members', session.userId);
        await updateDoc(memberRef, {
            studyTimeToday: increment(session.durationSeconds),
            isStudying: false,
            lastActive: serverTimestamp()
        });

    } catch (e) {
        console.warn("Sync session failed");
    }
};

export const updateRoomStatus = async (roomId: string, userId: string, isStudying: boolean, subject?: string) => {
    try {
        const memberRef = doc(db, 'rooms', roomId, 'members', userId);
        await updateDoc(memberRef, {
            isStudying,
            currentSubject: isStudying ? subject : null,
            lastActive: serverTimestamp()
        });
    } catch (e) {
        console.warn("Status update failed");
    }
};

// --- ROOM LOGIC ---

export const createRoom = async (ownerId: string, name: string, password?: string, description?: string) => {
    const roomRef = await addDoc(collection(db, 'rooms'), {
        name,
        password: password || '', // Simple password check
        description: description || '',
        ownerId,
        memberCount: 1,
        members: [ownerId],
        createdAt: serverTimestamp()
    });
    return roomRef.id;
};

export const joinRoomWithPassword = async (roomId: string, passwordInput: string, userId: string) => {
    const roomRef = doc(db, 'rooms', roomId);
    
    // 1. Check Password
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
        throw new Error("Room not found");
    }
    
    const roomData = roomSnap.data();
    if (roomData.password && roomData.password !== passwordInput) {
        throw new Error("Incorrect Password");
    }

    // 2. Join (Transaction for safety)
    await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(roomRef);
        if (!sfDoc.exists()) throw "Room does not exist!";

        const members = sfDoc.data().members || [];
        if (!members.includes(userId)) {
             transaction.update(roomRef, {
                members: arrayUnion(userId),
                memberCount: increment(1)
            });
        }
    });

    return roomData;
};

// --- LISTENERS ---

export const subscribeToRoomMembers = (roomId: string, callback: (members: any[]) => void) => {
    const q = collection(db, 'rooms', roomId, 'members');
    return onSnapshot(q, (snapshot) => {
        const members = snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert timestamp to number for local app consistency
            const lastActive = data.lastActive?.toMillis ? data.lastActive.toMillis() : Date.now();
            return { ...data, uid: doc.id, lastActive };
        });
        callback(members);
    });
};

export const subscribeToRoomChat = (roomId: string, callback: (msgs: any[]) => void) => {
    const q = query(
        collection(db, 'rooms', roomId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(50)
    );
    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                ...data, 
                id: doc.id, 
                createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now() 
            };
        });
        callback(msgs);
    });
};

export const sendRoomMessage = async (roomId: string, userId: string, userName: string, text: string) => {
    await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        userId,
        userName,
        text,
        createdAt: serverTimestamp()
    });
};