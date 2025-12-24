import React, { createContext, useContext, useEffect, useState } from 'react';
import { Subject, AppRoute, UserProfile } from './types';
import Planner from './components/Planner';
import TimerOverlay from './components/TimerOverlay';
import GroupList from './components/GroupList';
import GroupDetail from './components/GroupDetail';
import Stats from './components/Stats';
import Settings from './components/Settings';
import Login from './pages/Login';
import { Home, Users, BarChart2, Plus, Settings as SettingsIcon } from 'lucide-react';
import { 
    getLocalProfile, 
    getLocalSubjects, 
    saveLocalSubject, 
    getTodayTotalSeconds, 
    updateLocalProfileName,
    getConnectedRoomId,
    getActiveSessionState,
    saveLocalProfile
} from './utils/localStorage';
import { syncUserProfileToRoom, auth, loginWithGoogle } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// --- Global Context ---
interface AppContextType {
  profile: UserProfile;
  subjects: Subject[];
  refreshData: () => void;
  updateName: (name: string) => void;
  googleAccessToken: string | null;
  connectGoogleCalendar: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({ 
    profile: getLocalProfile(),
    subjects: [],
    refreshData: () => {},
    updateName: () => {},
    googleAccessToken: null,
    connectGoogleCalendar: async () => {}
});

export const useApp = () => useContext(AppContext);

// --- Auth Context (For Login.tsx) ---
interface AuthContextType {
  loginAsGuest: () => void;
  setGoogleToken: (token: string) => void;
}
const AuthContext = createContext<AuthContextType>({ loginAsGuest: () => {}, setGoogleToken: () => {} });
export const useAuth = () => useContext(AuthContext);

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(getLocalProfile());
  const [subjects, setSubjects] = useState<Subject[]>(getLocalSubjects());
  const [activeTab, setActiveTab] = useState<AppRoute>(AppRoute.PLANNER);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  
  // Google Calendar State
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  
  // Room State
  const [connectedRoomId, setConnectedRoomId] = useState<string | null>(getConnectedRoomId());
  
  // Setup State (Acts as Auth State)
  const [isNameSetup, setIsNameSetup] = useState(!!getLocalProfile().displayName && getLocalProfile().displayName !== 'Student');

  // Initial Load & Resume Check
  useEffect(() => {
    refreshData();
    
    // Check if we were running a session when app closed
    const savedState = getActiveSessionState();
    if (savedState) {
        setIsTimerOpen(true); // Open timer immediately to resume
    }

    // If connected to a room, sync initial presence
    if (connectedRoomId) {
        syncUserProfileToRoom(profile, connectedRoomId);
    }

    // Auth Listener
    const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
            const current = getLocalProfile();
            if (current.uid !== user.uid) {
                const newProfile = {
                    ...current,
                    uid: user.uid,
                    displayName: user.displayName || current.displayName,
                    photoURL: user.photoURL || current.photoURL
                };
                saveLocalProfile(newProfile);
                setProfile(newProfile);
                setIsNameSetup(true);
                refreshData();
            }
        }
    });
    return () => unsub();
  }, []);

  // Periodic Refresh
  useEffect(() => {
    const interval = setInterval(() => {
        refreshData();
    }, 5000);
    return () => clearInterval(interval);
  }, [isTimerOpen, connectedRoomId]);

  const refreshData = () => {
      setProfile(getLocalProfile());
      setSubjects(getLocalSubjects());
      setTodayTotal(getTodayTotalSeconds());
      setConnectedRoomId(getConnectedRoomId());
  };

  const handleUpdateName = (name: string) => {
      const updated = updateLocalProfileName(name);
      setProfile(updated);
      setIsNameSetup(true);
      refreshData();
  };

  const handleAddSubject = (name: string, color: string) => {
      const newSub: Subject = { id: `sub_${Date.now()}`, name, color };
      saveLocalSubject(newSub);
      refreshData();
  };

  const handleRoomSelect = (id: string) => {
    // We are already connected to this room via GroupList logic
    setActiveTab(AppRoute.GROUP_DETAIL);
  };

  const formatTotalTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Auth Context Implementations
  const loginAsGuest = () => {
    setIsNameSetup(true);
  };

  const setGoogleToken = (token: string) => {
    setGoogleAccessToken(token);
    setIsNameSetup(true);
  };

  const connectGoogleCalendar = async () => {
    try {
        const { token } = await loginWithGoogle();
        if (token) {
            setGoogleAccessToken(token);
            alert("Google Calendar Connected!");
        }
    } catch (e) {
        console.error("Failed to connect calendar", e);
        alert("Failed to connect Google Calendar.");
    }
  };

  // --- Views ---

  const renderContent = () => {
    switch (activeTab) {
      case AppRoute.PLANNER:
        return <Planner />;
      case AppRoute.GROUPS:
        return <GroupList onSelectRoom={handleRoomSelect} />;
      case AppRoute.GROUP_DETAIL:
        return <GroupDetail roomId={connectedRoomId || ''} onBack={() => setActiveTab(AppRoute.GROUPS)} />;
      case AppRoute.STATS:
        return <Stats />;
      case AppRoute.SETTINGS:
        return <Settings />;
      default:
        return <Planner />;
    }
  };

  // --- Login / Initial Name Setup Screen ---
  if (!isNameSetup) {
      return (
          <AuthContext.Provider value={{ loginAsGuest, setGoogleToken }}>
               <Login />
          </AuthContext.Provider>
      );
  }

  return (
    <AppContext.Provider value={{ 
        profile, 
        subjects, 
        refreshData, 
        updateName: handleUpdateName,
        googleAccessToken,
        connectGoogleCalendar 
    }}>
      <div className="h-screen w-full bg-[#121212] flex flex-col overflow-hidden font-sans">
        
        <div className="flex-1 overflow-hidden relative">
          {renderContent()}
          
          {/* Floating Timer Button (Only on Planner) */}
          {activeTab === AppRoute.PLANNER && (
            <div 
              onClick={() => setIsTimerOpen(true)}
              className="absolute bottom-4 left-4 right-4 h-14 bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-800 flex items-center justify-between px-4 cursor-pointer z-10 active:scale-[0.99] transition-transform"
            >
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">Total Today</span>
                <span className="text-xl font-mono font-bold text-white">
                    {formatTotalTime(todayTotal)}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center text-white">
                <Plus size={20} />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        {activeTab !== AppRoute.GROUP_DETAIL && (
          <div className="h-16 bg-[#000000] border-t border-gray-900 flex items-center justify-around text-gray-500 pb-safe">
            <button 
              onClick={() => setActiveTab(AppRoute.PLANNER)}
              className={`flex flex-col items-center space-y-1 ${activeTab === AppRoute.PLANNER ? 'text-[#FF6B35]' : ''}`}
            >
              <Home size={22} strokeWidth={activeTab === AppRoute.PLANNER ? 2.5 : 2} />
              <span className="text-[10px]">Home</span>
            </button>
            <button 
              onClick={() => setActiveTab(AppRoute.GROUPS)}
              className={`flex flex-col items-center space-y-1 ${activeTab === AppRoute.GROUPS ? 'text-[#FF6B35]' : ''}`}
            >
              <Users size={22} strokeWidth={activeTab === AppRoute.GROUPS ? 2.5 : 2} />
              <span className="text-[10px]">Room</span>
            </button>
            <button 
              onClick={() => setActiveTab(AppRoute.STATS)}
              className={`flex flex-col items-center space-y-1 ${activeTab === AppRoute.STATS ? 'text-[#FF6B35]' : ''}`}
            >
              <BarChart2 size={22} strokeWidth={activeTab === AppRoute.STATS ? 2.5 : 2} />
              <span className="text-[10px]">Stats</span>
            </button>
            <button 
                onClick={() => setActiveTab(AppRoute.SETTINGS)}
                className={`flex flex-col items-center space-y-1 ${activeTab === AppRoute.SETTINGS ? 'text-[#FF6B35]' : ''}`}
            >
              <SettingsIcon size={22} strokeWidth={activeTab === AppRoute.SETTINGS ? 2.5 : 2} />
              <span className="text-[10px]">Settings</span>
            </button>
          </div>
        )}

        <TimerOverlay 
          isOpen={isTimerOpen} 
          onClose={() => setIsTimerOpen(false)} 
          subjects={subjects}
          onAddSubject={handleAddSubject}
        />
        
      </div>
    </AppContext.Provider>
  );
};

export default App;