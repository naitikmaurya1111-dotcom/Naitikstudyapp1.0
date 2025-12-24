import React, { useEffect, useState } from 'react';
import { getLocalSessions } from '../utils/localStorage';
import { StudySession } from '../types';
import { PieChart, Clock, Calendar } from 'lucide-react';

interface SubjectStat {
  time: number;
  color: string;
}

const Stats: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    // Load local history
    const all = getLocalSessions();
    setSessions(all);
    setTotalTime(all.reduce((acc, curr) => acc + curr.durationSeconds, 0));
  }, []);

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
        <div className="px-4 py-4 border-b border-gray-800 bg-[#121212]">
            <h1 className="text-xl font-bold">Statistics</h1>
            <p className="text-xs text-gray-400">Local Device Performance</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
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
        </div>
    </div>
  );
};

export default Stats;