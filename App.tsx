import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, subscribeToTodaySessions, logout as firebaseLogout, updateUserProfileName } from './firebase';
import { Subject, AppRoute } from './types';
import Login from './pages/Login';
import Planner from './components/Planner';
import TimerOverlay from './components/TimerOverlay';
import GroupList from './components/GroupList';
import GroupDetail from './components/GroupDetail';
import Stats from './components/Stats';
import Settings from './components/Settings';
import { Home, Users, BarChart2, Plus, Settings as SettingsIcon } from 'lucide-react';
import { getGuestTodayTotal, setGuestMode, isGuestModeActive, getStoredSubjects, saveStoredSubject } from './utils/localStorage';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  googleToken: string | null;
  loading: boolean;
  loginAsGuest: () => void;
  setGoogleToken: (token: string) => void;
  logout: () => void;
  updateName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    isGuest: false, 
    googleToken: null, 
    loading: true, 
    loginAsGuest: () => {}, 
    setGoogleToken: () => {},
    logout: () => {},
    updateName: async () => {}
});

export const useAuth = () => useContext(AuthContext);

const DEFAULT_SUBJECTS: Subject[] = [
  { id: '1', name: 'Mathematics', color: '#008080' },
  { id: '2', name: 'Physics', color: '#CD5C5C' },
  { id: '3', name: 'Chemistry', color: '#708090' },
  { id: '4', name: 'English', color: '#E9967A' },
  { id: '5', name: 'Coding', color: '#6A5ACD' },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<AppRoute>(AppRoute.PLANNER);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [todayTotalSeconds, setTodayTotalSeconds] = useState(0);
  
  // Custom Subject State
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);

  // Setup State
  const [isNameSetup, setIsNameSetup] = useState(true);
  const [setupName, setSetupName] = useState('');

  useEffect(() => {
    // 1. Check for Guest Mode in LocalStorage (Auto-Login for Guest)
    const guestActive = isGuestModeActive();
    if (guestActive) {
        setIsGuest(true);
        setLoading(false);
        // Guests might be named "Guest" by default, force change if needed
    }

    // 2. Check for Firebase User (Auto-Login for Google)
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
          setUser(u);
          setIsGuest(false);
          setGuestMode(false);
          // Check if user has a name
          if (!u.displayName) {
             setIsNameSetup(false);
          }
      } else {
          setUser(null);
      }
      setLoading(false);
    });

    // 3. Load Custom Subjects
    const stored = getStoredSubjects();
    setSubjects([...DEFAULT_SUBJECTS, ...stored]);

    return () => unsubscribe();
  }, []);

  // Monitor Total Time
  useEffect(() => {
    if (user && !isGuest) {
        // Firebase Mode
        const unsubscribe = subscribeToTodaySessions(user.uid, (sessions) => {
            const total = sessions.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
            setTodayTotalSeconds(total);
        });
        return () => unsubscribe();
    } else if (isGuest) {
        // Guest Mode
        const updateGuestTotal = () => {
            setTodayTotalSeconds(getGuestTodayTotal());
        };
        updateGuestTotal();
        const interval = setInterval(updateGuestTotal, 5000); 
        return () => clearInterval(interval);
    }
  }, [user, isGuest, isTimerOpen]);

  const loginAsGuest = () => {
      setIsGuest(true);
      setGuestMode(true);
      setLoading(false);
      // For Guests, we want them to set a name initially
      setIsNameSetup(false);
  };

  const logout = () => {
      if (user) {
          firebaseLogout();
      }
      setIsGuest(false);
      setGuestMode(false); 
      setUser(null);
      setIsNameSetup(true);
      setActiveTab(AppRoute.PLANNER);
  };

  const handleUpdateName = async (name: string) => {
      if (user && !isGuest) {
        await updateUserProfileName(user, name);
      } else if (isGuest) {
        // For guest, we simulate it by updating the auth context user wrapper locally if possible
        // But since 'user' is null for guest, we handle display name locally in components or via a wrapper
        // Here we just set state to proceed
      }
      // Reload logic slightly hacky for auth refresh, but for now just clear setup
      setIsNameSetup(true);
  };

  const handleGroupSelect = (id: string) => {
    setSelectedGroupId(id);
    setActiveTab(AppRoute.GROUP_DETAIL);
  };

  const handleAddSubject = (name: string, color: string) => {
      const newSub: Subject = { id: `custom_${Date.now()}`, name, color };
      const updated = saveStoredSubject(newSub);
      setSubjects([...DEFAULT_SUBJECTS, ...updated]);
  };

  const formatTotalTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    switch (activeTab) {
      case AppRoute.PLANNER:
        return <Planner />;
      case AppRoute.GROUPS:
        return <GroupList onSelectGroup={handleGroupSelect} />;
      case AppRoute.GROUP_DETAIL:
        return <GroupDetail groupId={selectedGroupId || ''} onBack={() => setActiveTab(AppRoute.GROUPS)} />;
      case AppRoute.STATS:
        return <Stats />;
      case AppRoute.SETTINGS:
        return <Settings />;
      default:
        return <Planner />;
    }
  };

  if (loading) return <div className="h-screen w-full bg-black flex items-center justify-center text-[#FF6B35]">Loading...</div>;
  
  if (!user && !isGuest) {
      return (
        <AuthContext.Provider value={{ user, isGuest, googleToken, loading, loginAsGuest, setGoogleToken, logout, updateName: handleUpdateName }}>
            <Login />
        </AuthContext.Provider>
      );
  }

  // Name Setup Screen
  if (!isNameSetup) {
      return (
          <div className="h-screen w-full bg-[#121212] flex items-center justify-center p-6 text-white">
              <div className="w-full max-w-sm">
                  <h1 className="text-2xl font-bold mb-2 text-center">Welcome!</h1>
                  <p className="text-gray-400 mb-6 text-center">How should we call you?</p>
                  <input 
                    autoFocus
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    placeholder="Enter your nickname"
                    className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl p-4 text-center text-xl text-white focus:border-[#FF6B35] outline-none mb-4"
                  />
                  <button 
                    disabled={!setupName.trim()}
                    onClick={() => handleUpdateName(setupName)}
                    className="w-full bg-[#FF6B35] py-4 rounded-xl font-bold disabled:opacity-50"
                  >
                      Get Started
                  </button>
              </div>
          </div>
      );
  }

  return (
    <AuthContext.Provider value={{ user, isGuest, googleToken, loading, loginAsGuest, setGoogleToken, logout, updateName: handleUpdateName }}>
      <div className="h-screen w-full bg-[#121212] flex flex-col overflow-hidden font-sans">
        
        <div className="flex-1 overflow-hidden relative">
          {renderContent()}
          
          {/* Floating Mini Player (Only on Planner) */}
          {activeTab === AppRoute.PLANNER && (
            <div 
              onClick={() => setIsTimerOpen(true)}
              className="absolute bottom-4 left-4 right-4 h-14 bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-800 flex items-center justify-between px-4 cursor-pointer z-10 active:scale-[0.99] transition-transform"
            >
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">Total Today</span>
                <span className="text-xl font-mono font-bold text-white">
                    {formatTotalTime(todayTotalSeconds)}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center text-white">
                <Plus size={20} />
              </div>
            </div>
          )}
        </div>

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
              <span className="text-[10px]">Group</span>
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
    </AuthContext.Provider>
  );
};

export default App;