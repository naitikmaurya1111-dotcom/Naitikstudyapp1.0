import React, { useEffect, useState } from 'react';
import { RotateCw, Coffee, Grid, Edit2, Play, MoreVertical, WifiOff, Lock, Plus, Calendar } from 'lucide-react';
import { useApp } from '../App';
import { StudySession, CalendarEvent } from '../types';
import { getLocalSessions, deleteLocalSession, saveLocalSession } from '../utils/localStorage';
import { fetchCalendarEvents } from '../utils/googleCalendar';

const Planner: React.FC = () => {
  const { refreshData, googleAccessToken, connectGoogleCalendar } = useApp();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Custom Menu State
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  // Edit State
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [editDurationStr, setEditDurationStr] = useState('');

  // "Now" Line State
  const [nowPosition, setNowPosition] = useState(0);

  // Dynamic Date State
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [todayIndex, setTodayIndex] = useState(0);

  // Initialize Dates
  useEffect(() => {
      const generateWeek = () => {
          const now = new Date();
          // Adjust for 4 AM day boundary
          if (now.getHours() < 4) now.setDate(now.getDate() - 1);

          const currentDay = now.getDay(); // 0 = Sun, 1 = Mon
          const diffToMon = currentDay === 0 ? 6 : currentDay - 1; // 0 = Mon

          const monday = new Date(now);
          monday.setDate(now.getDate() - diffToMon);

          const days = [];
          for(let i=0; i<7; i++) {
              const d = new Date(monday);
              d.setDate(monday.getDate() + i);
              days.push(d);
          }
          setWeekDates(days);
          setTodayIndex(diffToMon);
      };
      generateWeek();
  }, []);

  // Calculate position for "Now" line
  useEffect(() => {
      const updatePosition = () => {
          const now = new Date();
          let currentHour = now.getHours();
          const currentMin = now.getMinutes();

          // Planner logic: Day starts at 4 AM.
          if (currentHour < 4) {
              currentHour += 24;
          }

          const hoursElapsed = currentHour - 4;
          const totalMinutes = hoursElapsed * 60 + currentMin;
          setNowPosition(totalMinutes);
      };

      updatePosition();
      const interval = setInterval(updatePosition, 60000); 
      return () => clearInterval(interval);
  }, []);

  // Load Local Sessions periodically
  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Calendar Events when token changes
  useEffect(() => {
    const loadCalendar = async () => {
      if (googleAccessToken) {
        const events = await fetchCalendarEvents(googleAccessToken);
        const now = new Date();
        if (now.getHours() < 4) now.setDate(now.getDate() - 1);
        
        // Filter for "Today" (meaning the planner's view of today starting at 4am)
        const startOfDay = new Date(now);
        startOfDay.setHours(4, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setDate(endOfDay.getDate() + 1);
        endOfDay.setHours(4, 0, 0, 0);

        const todaysEvents = events.filter(e => 
          (e.start >= startOfDay && e.start < endOfDay) || 
          (e.end > startOfDay && e.end <= endOfDay) ||
          (e.start <= startOfDay && e.end >= endOfDay)
        );
        setCalendarEvents(todaysEvents);
      }
    };
    loadCalendar();
  }, [googleAccessToken]);

  const loadSessions = () => {
      const all = getLocalSessions();
      const now = new Date();
      if (now.getHours() < 4) now.setDate(now.getDate() - 1);
      const startOfDay = new Date(now);
      startOfDay.setHours(4, 0, 0, 0);
      
      const endOfDay = new Date(now);
      endOfDay.setDate(endOfDay.getDate() + 1);
      endOfDay.setHours(4, 0, 0, 0);

      const todaySessions = all.filter(s => s.startTime >= startOfDay && s.startTime < endOfDay);
      setSessions(todaySessions);
  };

  const handleRefresh = async () => {
      setIsRefreshing(true);
      loadSessions();
      if (googleAccessToken) {
        const events = await fetchCalendarEvents(googleAccessToken);
        // ... simple refetch logic, ideally duplicated filter logic but fine for now
        // or just rely on useEffect dependencies if we unset/reset something
      }
      setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleSessionClick = (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const top = Math.min(rect.top, window.innerHeight - 320); 
      setMenuPosition({ top, left: 60 }); 
      setMenuOpenId(sessionId);
  };

  const handleMenuAction = async (action: string) => {
      if (!menuOpenId) return;
      
      const s = sessions.find(x => x.id === menuOpenId);
      if (!s) return;

      if (action === 'delete') {
          if (confirm("Delete this record?")) {
             deleteLocalSession(s.id);
             loadSessions();
             refreshData();
          }
      } else if (action === 'edit') {
          setEditingSession(s);
          setEditDurationStr((s.durationSeconds / 60).toFixed(0));
      }
      setMenuOpenId(null);
  };

  const saveEdit = async () => {
      if (!editingSession || !editDurationStr) return;
      const newMinutes = parseInt(editDurationStr);
      if (isNaN(newMinutes)) return;
      const newSeconds = newMinutes * 60;

      const updated = { ...editingSession, durationSeconds: newSeconds };
      saveLocalSession(updated);
      loadSessions();
      refreshData();
      
      setEditingSession(null);
  };

  const hours = Array.from({ length: 24 }, (_, i) => (i + 4) % 24);

  const getBlockStyle = (startInput: any, endInput: any, color: string, isStudy: boolean) => {
    if (!startInput) return {};
    const start = startInput instanceof Date ? startInput : new Date(startInput);
    const end = endInput ? (endInput instanceof Date ? endInput : new Date(endInput)) : new Date();
    
    let startHour = start.getHours();
    if (startHour < 4) startHour += 24; 
    const startMin = start.getMinutes();
    
    let endHour = end.getHours();
    if (endHour < 4) endHour += 24;
    const endMin = end.getMinutes();

    const startTotalMinutes = (startHour - 4) * 60 + startMin;
    let durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    if (durationMinutes < 0) durationMinutes = 60; 

    return {
      top: `${startTotalMinutes}px`,
      height: `${Math.max(durationMinutes, 15)}px`, 
      backgroundColor: color,
      zIndex: isStudy ? 10 : 5, 
      width: isStudy ? '96%' : '85%', 
      left: isStudy ? '2%' : '10%', 
      borderRadius: '4px',
    };
  };

  const formattedDate = () => {
      const now = new Date();
      if(now.getHours() < 4) now.setDate(now.getDate() - 1);
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return `${dateStr} D-Day`;
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white" onClick={() => setMenuOpenId(null)}>
      {/* Top App Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#121212] z-10">
        <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1 cursor-pointer">
                <div className="w-5 h-0.5 bg-gray-400"></div>
                <div className="w-5 h-0.5 bg-gray-400"></div>
                <div className="w-5 h-0.5 bg-gray-400"></div>
            </div>
            <div className="text-lg font-bold">
                {new Date().toLocaleString('default', { month: 'long' })}
            </div>
        </div>
        <div className="flex items-center space-x-4">
            <div className="text-gray-400 text-sm">{formattedDate()}</div>
            <button 
                onClick={connectGoogleCalendar}
                className={`p-1 ${googleAccessToken ? 'text-[#FF6B35]' : 'text-gray-400'}`}
                title={googleAccessToken ? "Calendar Connected" : "Connect Google Calendar"}
            >
                <Calendar size={18} />
            </button>
            <button 
                onClick={handleRefresh}
                className={`text-gray-400 p-1 ${isRefreshing ? 'animate-spin' : ''}`}
            >
                <RotateCw size={18} />
            </button>
        </div>
      </div>

      {/* Dynamic Calendar Grid */}
      <div className="grid grid-cols-7 text-center text-xs text-gray-500 border-b border-gray-800 bg-[#121212] pb-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} className="py-1">{d}</div>)}
          {weekDates.map((date, index) => {
              const isToday = index === todayIndex;
              return (
                  <div key={index} className={`flex items-center justify-center`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isToday ? 'bg-[#FF6B35] text-white' : 'text-gray-400'}`}>
                        {date.getDate()}
                      </div>
                  </div>
              );
          })}
      </div>

      {/* Timeline Scroll Area */}
      <div className="flex-1 overflow-y-auto relative bg-[#121212]" id="planner-scroll">
        <div className="flex min-h-[1440px]">
          {/* Time Gutter */}
          <div className="w-14 flex flex-col border-r border-gray-800 bg-[#121212]">
            {hours.map((h) => (
              <div key={h} className="h-[60px] text-[10px] text-gray-500 text-right pr-2 pt-1 relative">
                <span className="relative z-10 bg-[#121212] pl-1">{h < 12 ? `${h} AM` : (h === 12 ? `12 PM` : `${h-12} PM`)}</span>
                <div className="absolute top-0 right-0 w-full h-[1px] bg-gray-900 -z-10"></div>
              </div>
            ))}
          </div>
          
          {/* Content Area */}
          <div className="flex-1 relative bg-[#0a0a0a]">
            {hours.map((h, i) => (
              <div key={i} className="absolute w-full h-[1px] bg-gray-900" style={{ top: `${i * 60}px` }} />
            ))}
            
            {/* Dynamic NOW Line */}
            <div 
                className="absolute w-full h-[1px] bg-[#FF6B35] z-20 pointer-events-none transition-all duration-1000"
                style={{ top: `${nowPosition}px` }}
            >
                 <div className="bg-[#FF6B35] text-black text-[9px] px-1.5 py-0.5 rounded-sm absolute -left-12 -top-2 font-bold z-30">
                     Now
                 </div>
            </div>

            {/* Calendar Events (Underneath) */}
            {calendarEvents.map((event) => (
                <div
                    key={event.id}
                    className="absolute border-l-4 border-blue-500 bg-blue-900/30 overflow-hidden px-2 py-1 flex flex-col justify-center"
                    style={getBlockStyle(event.start, event.end, 'rgba(30, 64, 175, 0.3)', false)}
                >
                    <div className="text-[10px] text-blue-200 font-bold truncate">{event.title}</div>
                </div>
            ))}

            {/* Study Sessions */}
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={(e) => handleSessionClick(e, session.id)}
                className="absolute rounded opacity-90 border-l-2 border-white/20 overflow-hidden px-1 py-0.5 cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
                style={getBlockStyle(session.startTime, session.endTime, session.subjectColor, true)}
              >
              </div>
            ))}
          </div>
        </div>

        {/* Custom Context Menu */}
        {menuOpenId && (
            <div 
                className="fixed z-50 bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-700 w-64 overflow-hidden animate-in fade-in zoom-in duration-200"
                style={{ top: menuPosition.top, left: 80 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                    <div className="flex items-center gap-2 text-sm">
                        <Coffee size={16} /> Pomodoro
                    </div>
                </div>

                <div className="py-2">
                    <button onClick={() => handleMenuAction('edit')} className="w-full flex items-center px-4 py-3 text-sm hover:bg-white/5 text-gray-200 gap-3">
                        <Edit2 size={16} /> Edit Time
                    </button>
                    <button className="w-full flex items-center px-4 py-3 text-sm hover:bg-white/5 text-gray-200 gap-3">
                        <Grid size={16} /> Subject Tag
                    </button>
                </div>

                <div className="bg-[#2a2a2a] p-2 flex items-center justify-center gap-2">
                    <button className="flex-1 bg-white text-black rounded-lg py-2 font-bold flex items-center justify-center gap-2">
                        <Play size={16} fill="black" /> 0:00:00 <MoreVertical size={16} />
                    </button>
                    <button onClick={() => handleMenuAction('delete')} className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center text-red-400">
                        <Edit2 size={18} />
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Edit Session Modal */}
      {editingSession && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
              <div className="w-full max-w-xs bg-[#1e1e1e] rounded-xl border border-gray-700 p-4">
                  <h3 className="font-bold mb-4">Edit Session Time</h3>
                  <div className="mb-4">
                      <label className="text-xs text-gray-500">Duration (Minutes)</label>
                      <input 
                        type="number"
                        value={editDurationStr}
                        onChange={(e) => setEditDurationStr(e.target.value)}
                        className="w-full bg-black border border-gray-700 rounded p-2 mt-1"
                      />
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setEditingSession(null)} className="flex-1 py-2 rounded bg-gray-800 text-gray-400">Cancel</button>
                      <button onClick={saveEdit} className="flex-1 py-2 rounded bg-[#FF6B35] font-bold">Save</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Planner;