import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Settings, WifiOff, Slash, Coffee, Plus, Save, RotateCcw } from 'lucide-react';
import { Subject } from '../types';
import { startStudySession, endStudySession, sendHeartbeat } from '../firebase';
import { saveGuestSession } from '../utils/localStorage';
import { useAuth } from '../App';

interface TimerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  onAddSubject: (name: string, color: string) => void;
}

// Timer States
type TimerState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'SUMMARY';

const TimerOverlay: React.FC<TimerOverlayProps> = ({ isOpen, onClose, subjects, onAddSubject }) => {
  const { user, isGuest } = useAuth();
  
  // State
  const [timerState, setTimerState] = useState<TimerState>('IDLE');
  const [selectedSubject, setSelectedSubject] = useState<Subject>(subjects[0]);
  const [isRestMode, setIsRestMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestStartTime, setGuestStartTime] = useState<Date | null>(null);
  const [sessionMemo, setSessionMemo] = useState('');
  
  // Add missing state for subject creation
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  
  // Refs
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const heartbeatRef = useRef<number | null>(null); // For Anti-Cheat Ping

  // Effect: Sync subjects
  useEffect(() => {
    if (subjects.length > 0 && !subjects.find(s => s.id === selectedSubject.id)) {
        setSelectedSubject(subjects[0]);
    }
  }, [subjects]);

  // Effect: Page Visibility (Focus Guard / Anti-Cheat / Heartbeat Recovery)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
         if (timerState === 'RUNNING' && !isRestMode) {
             console.warn("User switched tabs!");
         }
      } else {
          // User came back. Force a heartbeat to show them as online immediately.
          if (timerState === 'RUNNING' && !isRestMode && user && !isGuest) {
              sendHeartbeat(user.uid);
          }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [timerState, isRestMode, user, isGuest]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startTimer = async () => {
    setTimerState('RUNNING');
    startTimeRef.current = Date.now();
    
    // Start session in DB if not in rest mode
    if (!isRestMode) {
        if (user && !isGuest) {
            const sid = await startStudySession(user.uid, selectedSubject.id, selectedSubject.name, selectedSubject.color);
            setSessionId(sid);
            
            // START HEARTBEAT
            // 1. Send immediately
            sendHeartbeat(user.uid);
            
            // 2. Schedule interval (every 30s)
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            heartbeatRef.current = window.setInterval(() => {
                sendHeartbeat(user.uid);
            }, 30000);

        } else if (isGuest) {
            setGuestStartTime(new Date());
        }
    }

    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTimeRef.current) / 1000);
      setSeconds(accumulatedTimeRef.current + elapsed);
    }, 1000);
  };

  const pauseTimer = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
    }
    setTimerState('PAUSED');
    accumulatedTimeRef.current = seconds;
  };

  const handleStopClick = () => {
      pauseTimer();
      // If purely resting (no study session), just reset.
      // If studying, go to Summary screen.
      if (isRestMode) {
          resetTimer();
          onClose();
      } else {
          setTimerState('SUMMARY');
      }
  };

  const saveAndClose = async () => {
    // Commit the session data
    if (!isRestMode) {
        if (user && !isGuest && sessionId) {
            await endStudySession(user.uid, sessionId, seconds, sessionMemo);
        } else if (isGuest && guestStartTime) {
            saveGuestSession({
                userId: 'guest',
                subjectId: selectedSubject.id,
                subjectName: selectedSubject.name,
                subjectColor: selectedSubject.color,
                startTime: guestStartTime,
                endTime: new Date(),
                durationSeconds: seconds,
                memo: sessionMemo
            });
        }
    }
    resetTimer();
    onClose();
  };

  const resetTimer = () => {
      setSeconds(0);
      accumulatedTimeRef.current = 0;
      setSessionId(null);
      setGuestStartTime(null);
      setSessionMemo('');
      setTimerState('IDLE');
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
  };

  const handleCreateSubject = () => {
      if(newSubName.trim()) {
          const hue = Math.floor(Math.random() * 360);
          const color = `hsl(${hue}, 70%, 50%)`; 
          onAddSubject(newSubName, color);
          setIsAddingSubject(false);
          setNewSubName('');
      }
  };

  if (!isOpen) return null;

  // --- SUMMARY VIEW ---
  if (timerState === 'SUMMARY') {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6 text-white">
              <div className="w-full max-w-sm bg-[#1e1e1e] rounded-2xl border border-gray-800 p-6 flex flex-col items-center">
                  <h2 className="text-xl font-bold mb-2">Session Complete</h2>
                  <div className="text-4xl font-mono font-bold text-[#FF6B35] mb-2">{formatTime(seconds)}</div>
                  <div className="text-sm text-gray-400 mb-6">{selectedSubject.name}</div>
                  
                  <div className="w-full mb-6">
                      <label className="text-xs text-gray-500 mb-1 block">Add a Note (Optional)</label>
                      <textarea 
                        value={sessionMemo}
                        onChange={(e) => setSessionMemo(e.target.value)}
                        placeholder="What did you achieve?"
                        className="w-full bg-black border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-[#FF6B35] outline-none h-24 resize-none"
                      />
                  </div>

                  <div className="flex w-full gap-3">
                      <button 
                        onClick={() => { resetTimer(); onClose(); }} 
                        className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-medium flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors"
                      >
                          <RotateCcw size={18} />
                          Discard
                      </button>
                      <button 
                        onClick={saveAndClose}
                        className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#e55a2b] transition-colors"
                      >
                          <Save size={18} /> Save
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- TIMER VIEW ---
  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-end transition-colors duration-500 ${isRestMode ? 'bg-[#1a2e1a]' : 'bg-black'} text-white`}>
      
      {/* Subject Selector (Hidden while running) */}
      <div className="w-full px-6 mb-12 h-16">
        {timerState === 'IDLE' && (
            <div className="flex overflow-x-auto space-x-4 pb-4 no-scrollbar items-center">
            {subjects.map(sub => (
                <button
                key={sub.id}
                onClick={() => setSelectedSubject(sub)}
                className={`flex-shrink-0 px-6 py-2 rounded-full border transition-all ${
                    selectedSubject.id === sub.id 
                    ? `text-white` 
                    : 'border-gray-600 text-gray-400'
                }`}
                style={{ 
                    backgroundColor: selectedSubject.id === sub.id ? sub.color : 'transparent',
                    borderColor: sub.color
                }}
                >
                {sub.name}
                </button>
            ))}
            <button 
                onClick={() => setIsAddingSubject(true)}
                className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white"
            >
                <Plus size={20} />
            </button>
            </div>
        )}
      </div>

      {/* Main Clock */}
      <div className="mb-16 text-center">
        <div className={`text-[5rem] font-bold tracking-tighter leading-none font-mono ${isRestMode ? 'text-green-400' : 'text-white'}`}>
          {formatTime(seconds)}
        </div>
        <div className="text-xl font-medium mt-2" style={{ color: isRestMode ? '#4ade80' : selectedSubject.color }}>
            {isRestMode ? 'RESTING' : selectedSubject.name}
        </div>
      </div>

      {/* Quick Settings (Hidden while running) */}
      {timerState === 'IDLE' && (
        <div className="flex space-x-8 mb-12 text-gray-400">
            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setIsRestMode(!isRestMode)}>
                <div className={`p-3 rounded-full border ${isRestMode ? 'bg-green-900 border-green-500 text-green-400' : 'bg-gray-900 border-gray-800'}`}>
                    <Coffee size={20} />
                </div>
                <span className="text-xs">{isRestMode ? 'Focus' : 'Rest'}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
                <div className="p-3 rounded-full bg-gray-900 border border-gray-800">
                    <Settings size={20} />
                </div>
                <span className="text-xs">Settings</span>
            </div>
        </div>
      )}

      {/* Controls */}
      <div className="w-full flex items-center justify-center pb-16 space-x-8">
        {timerState === 'RUNNING' || timerState === 'PAUSED' ? (
          <>
             {timerState === 'RUNNING' ? (
                 <button 
                 onClick={pauseTimer}
                 className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 active:scale-95 transition-all"
               >
                 <Pause size={32} fill="currentColor" />
               </button>
             ) : (
                <button 
                onClick={startTimer}
                className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 active:scale-95 transition-all"
              >
                <Play size={32} fill="currentColor" />
              </button>
             )}
            
            <button 
              onClick={handleStopClick}
              className="w-20 h-20 rounded-full bg-red-900/50 text-red-500 border border-red-500 flex items-center justify-center hover:bg-red-900/80 active:scale-95 transition-all"
            >
              <Square size={32} fill="currentColor" />
            </button>
          </>
        ) : (
          <button 
            onClick={startTimer}
            className={`w-24 h-24 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.4)] flex items-center justify-center text-white hover:brightness-110 active:scale-95 transition-all ${isRestMode ? 'bg-green-600 shadow-green-900/50' : 'bg-[#FF6B35] shadow-orange-900/50'}`}
          >
            <Play size={40} fill="currentColor" className="ml-1" />
          </button>
        )}
      </div>
      
      {timerState === 'IDLE' && (
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 p-2">
           Close
        </button>
      )}

      {/* Add Subject Modal */}
      {isAddingSubject && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 z-50">
              <div className="w-full max-w-sm bg-[#1e1e1e] rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold mb-4">Add Subject</h3>
                  <input 
                    autoFocus
                    value={newSubName} 
                    onChange={e => setNewSubName(e.target.value)}
                    placeholder="Subject Name"
                    className="w-full bg-black border border-gray-600 rounded-lg p-3 text-white mb-4 outline-none focus:border-[#FF6B35]"
                  />
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setIsAddingSubject(false)} className="text-gray-400">Cancel</button>
                      <button onClick={handleCreateSubject} className="bg-[#FF6B35] px-4 py-2 rounded-lg font-bold">Add</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TimerOverlay;