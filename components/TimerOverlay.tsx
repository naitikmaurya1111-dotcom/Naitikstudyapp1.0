import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Settings, Coffee, Plus, Save, RotateCcw } from 'lucide-react';
import { Subject } from '../types';
import { 
    saveLocalSession, 
    saveActiveSessionState, 
    clearActiveSessionState, 
    getActiveSessionState, 
    getConnectedRoomId 
} from '../utils/localStorage';
import { useApp } from '../App';
import { updateRoomStatus, syncSessionToRoom } from '../firebase';

interface TimerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  onAddSubject: (name: string, color: string) => void;
}

type TimerState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'SUMMARY';

const TimerOverlay: React.FC<TimerOverlayProps> = ({ isOpen, onClose, subjects, onAddSubject }) => {
  const { profile, refreshData } = useApp();
  
  // State
  const [timerState, setTimerState] = useState<TimerState>('IDLE');
  const [selectedSubject, setSelectedSubject] = useState<Subject>(subjects[0]);
  const [isRestMode, setIsRestMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionMemo, setSessionMemo] = useState('');
  
  // Subject Creation State
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  
  // Refs
  const intervalRef = useRef<number | null>(null);
  const heartBeatRef = useRef<number | null>(null);

  // 1. Resume Logic on Mount
  useEffect(() => {
      const savedState = getActiveSessionState();
      if (savedState) {
          // Restore state
          const start = new Date(savedState.startTime);
          setSessionStartTime(start);
          setSelectedSubject(savedState.subject);
          setTimerState('RUNNING'); // Auto-resume
          
          // Calculate elapsed time even while app was closed
          const now = Date.now();
          const elapsed = Math.floor((now - start.getTime()) / 1000);
          setSeconds(elapsed);
          
          // Restart Interval
          startTicker(start);
      }
  }, []);

  // 2. Sync Subjects
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject.id) {
        setSelectedSubject(subjects[0]);
    } else if (subjects.length > 0 && !subjects.find(s => s.id === selectedSubject.id)) {
        // If stored subject was deleted, default to first
        setSelectedSubject(subjects[0]);
    }
  }, [subjects]);

  // 3. Heartbeat for Room Status
  useEffect(() => {
      if (timerState === 'RUNNING' && !isRestMode) {
          const roomId = getConnectedRoomId();
          if (roomId) {
              // Initial update
              updateRoomStatus(roomId, profile.uid, true, selectedSubject.name);
              // Periodic update
              heartBeatRef.current = window.setInterval(() => {
                   updateRoomStatus(roomId, profile.uid, true, selectedSubject.name);
              }, 30000);
          }
      } else {
          // Clear status if paused/stopped
          const roomId = getConnectedRoomId();
          if (roomId && heartBeatRef.current) {
              updateRoomStatus(roomId, profile.uid, false);
              clearInterval(heartBeatRef.current);
          }
      }
      return () => {
          if (heartBeatRef.current) clearInterval(heartBeatRef.current);
      }
  }, [timerState, isRestMode, selectedSubject]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startTicker = (startTime: Date) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
          const now = Date.now();
          const elapsed = Math.floor((now - startTime.getTime()) / 1000);
          setSeconds(elapsed);
      }, 1000);
  };

  const startTimer = () => {
    const start = new Date();
    setSessionStartTime(start);
    setTimerState('RUNNING');
    
    // Save state to local storage for "Resume" capability
    if (!isRestMode) {
        saveActiveSessionState({
            startTime: start.getTime(),
            subject: selectedSubject
        });
    }

    startTicker(start);
  };

  const pauseTimer = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerState('PAUSED');
  };

  const handleStopClick = () => {
      pauseTimer();
      clearActiveSessionState(); // Clear resume state
      
      if (isRestMode) {
          resetTimer();
          onClose();
      } else {
          setTimerState('SUMMARY');
      }
  };

  const saveAndClose = async () => {
    if (!isRestMode && sessionStartTime) {
        const newSession = {
            id: 'sess_' + Date.now(),
            userId: profile.uid,
            subjectId: selectedSubject.id,
            subjectName: selectedSubject.name,
            subjectColor: selectedSubject.color,
            startTime: sessionStartTime,
            endTime: new Date(),
            durationSeconds: seconds,
            memo: sessionMemo
        };

        // 1. Save Local
        saveLocalSession(newSession);
        refreshData();

        // 2. Sync to Room (if connected)
        const roomId = getConnectedRoomId();
        if (roomId) {
            syncSessionToRoom(newSession, roomId);
        }
    }
    resetTimer();
    onClose();
  };

  const resetTimer = () => {
      setSeconds(0);
      setSessionStartTime(null);
      setSessionMemo('');
      setTimerState('IDLE');
      if (intervalRef.current) clearInterval(intervalRef.current);
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
      
      {/* Subject Selector */}
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

      {/* Quick Settings */}
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
                onClick={startTimer} // Resume
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