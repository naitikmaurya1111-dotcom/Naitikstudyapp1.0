import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { subscribeToHistorySessions } from '../firebase';
import { getGuestSessions } from '../utils/localStorage';
import { StudySession } from '../types';
import { PieChart, Clock, Calendar } from 'lucide-react';

interface SubjectStat {
  time: number;
  color: string;
}

const Stats: React.FC = () => {
  const { user, isGuest } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    if (user && !isGuest) {
        // Updated to use history subscription for ALL TIME stats
        const unsubscribe = subscribeToHistorySessions(user.uid, (data) => {
             // Map and convert timestamps
             const mapped = data.map(d => ({
                ...d,
                startTime: d.startTime && d.startTime.toDate ? d.startTime.toDate() : new Date(d.startTime),
                endTime: d.endTime && d.endTime.toDate ? d.endTime.toDate() : new Date(d.endTime),
              })) as StudySession[];
            setSessions(mapped);
        });
        return () => unsubscribe();
    } else if (isGuest) {
        // Guest mode already loads all history from local storage
        const all = getGuestSessions();
        setSessions(all);
    }
  }, [user, isGuest]);

  useEffect(() => {
    setTotalTime(sessions.reduce((acc, curr) => acc + curr.durationSeconds, 0));
  }, [sessions]);

  // Aggregate data by subject
  const subjectStats = sessions.reduce((acc, curr) => {
      if (!acc[curr.subjectName]) {
          acc[curr.subjectName] = { time: 0, color: curr.subjectColor };
      }
      acc[curr.subjectName].time += curr.durationSeconds;
      return acc;
  }, {} as Record<string, SubjectStat>);

  const sortedSubjects = (Object.entries(subjectStats) as [string, SubjectStat][])
    .sort(([, a], [, b]) => b.time - a.time);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getMaxTime = () => {
      if (sortedSubjects.length === 0) return 1;
      return sortedSubjects[0][1].time;
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-800 bg-[#121212]">
            <h1 className="text-xl font-bold">Statistics</h1>
            <p className="text-xs text-gray-400">All-time performance</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Total Time Card */}
            <div className="bg-[#1e1e1e] rounded-xl p-6 border border-gray-800 flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-sm mb-1">Total Study Time</p>
                    <h2 className="text-3xl font-mono font-bold text-[#FF6B35]">
                        {formatTime(totalTime)}
                    </h2>
                </div>
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
                    <Clock className="text-[#FF6B35]" />
                </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="bg-[#1e1e1e] rounded-xl p-6 border border-gray-800">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <PieChart size={18} className="text-gray-400" /> Subject Breakdown
                </h3>
                
                {sortedSubjects.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">No study data yet.</div>
                ) : (
                    <div className="space-y-4">
                        {sortedSubjects.map(([name, data]) => (
                            <div key={name}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span>{name}</span>
                                    <span className="text-gray-400">{formatTime(data.time)}</span>
                                </div>
                                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full" 
                                        style={{ 
                                            width: `${(data.time / getMaxTime()) * 100}%`,
                                            backgroundColor: data.color 
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Daily Streak (Mock Visual) */}
            <div className="bg-[#1e1e1e] rounded-xl p-6 border border-gray-800">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400" /> Recent Activity
                </h3>
                <div className="flex justify-between">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className={`w-8 h-20 rounded-md ${i === 6 ? 'bg-[#FF6B35]' : 'bg-gray-800'} relative`}>
                                <div className="absolute bottom-0 w-full bg-white/20" style={{ height: `${Math.random() * 80 + 20}%`}}></div>
                            </div>
                            <span className="text-xs text-gray-500">{day}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    </div>
  );
};

export default Stats;