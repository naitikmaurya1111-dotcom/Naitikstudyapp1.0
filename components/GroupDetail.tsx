import React, { useEffect, useState } from 'react';
import { UserProfile, StudyGroup, GroupTab } from '../types';
import { subscribeToGroupMembers, subscribeToGroupDetails, updateGroupSettings, deleteGroup, fetchGroupWeeklyStats } from '../firebase';
import { 
  Users, MessageSquare, Trophy, CalendarCheck, Share2, 
  Settings, ChevronRight, Volume2, Sun, Target, Dumbbell,
  ArrowLeft, Edit2
} from 'lucide-react';
import GroupChat from './GroupChat';
import DeskIcon from './DeskIcon';
import { useAuth } from '../App';

interface GroupDetailProps {
  groupId: string;
  onBack: () => void;
}

const GroupDetail: React.FC<GroupDetailProps> = ({ groupId, onBack }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [groupInfo, setGroupInfo] = useState<StudyGroup | null>(null);
  const [currentTab, setCurrentTab] = useState<GroupTab>('HOME');
  const [showSettings, setShowSettings] = useState(false);
  const [now, setNow] = useState(Date.now());
  
  // Real Attendance Data
  const [weeklyStats, setWeeklyStats] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    const unsubGroup = subscribeToGroupDetails(groupId, (data) => {
        if (!data) {
            // Group deleted
            onBack();
        } else {
            setGroupInfo(data);
        }
    });
    const unsubMembers = subscribeToGroupMembers(groupId, (data) => setMembers(data as UserProfile[]));
    
    const interval = setInterval(() => setNow(Date.now()), 10000); 

    return () => { unsubGroup(); unsubMembers(); clearInterval(interval); };
  }, [groupId]);

  // Fetch weekly stats when tab changes to ATTENDANCE
  useEffect(() => {
      if (currentTab === 'ATTENDANCE' && members.length > 0) {
          loadWeeklyStats();
      }
  }, [currentTab, members.length]);

  const loadWeeklyStats = async () => {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
      const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 for Mon
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - diffToMon);
      startOfWeek.setHours(0,0,0,0);
      
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - diffToMon)); // Until Sunday
      endOfWeek.setHours(23,59,59,999);

      const memberIds = members.map(m => m.uid);
      const rawSessions = await fetchGroupWeeklyStats(memberIds, startOfWeek, endOfWeek);

      // Process Data: { userId: { '0': 3600, '1': 0 ... } } where 0 is Mon
      const stats: Record<string, Record<string, number>> = {};
      
      rawSessions.forEach((s: any) => {
          if (!stats[s.userId]) stats[s.userId] = {};
          
          const sDate = s.startTime.toDate ? s.startTime.toDate() : new Date(s.startTime);
          // Get Day Index relative to Monday (0-6)
          let dayIndex = sDate.getDay() - 1;
          if (dayIndex === -1) dayIndex = 6; // Sunday
          
          if (!stats[s.userId][dayIndex]) stats[s.userId][dayIndex] = 0;
          stats[s.userId][dayIndex] += s.durationSeconds;
      });
      
      setWeeklyStats(stats);
  };

  const isMemberActive = (member: UserProfile) => {
      if (!member.isStudying || !member.lastActive) return false;
      const lastActiveTime = member.lastActive.toDate ? member.lastActive.toDate().getTime() : 0;
      return (now - lastActiveTime) < 90000;
  };

  const activeMembersCount = members.filter(isMemberActive).length;
  const sortedMembers = [...members].sort((a, b) => b.studyTimeToday - a.studyTimeToday);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleInvite = () => {
    navigator.clipboard.writeText(groupId);
    alert('Group ID copied to clipboard');
  };

  const handleDeleteGroup = async () => {
      if (confirm("Are you sure you want to delete this group? This cannot be undone.")) {
          await deleteGroup(groupId);
          onBack();
      }
  };

  // --- RENDERERS ---

  const renderHome = () => (
    <div className="flex-1 overflow-y-auto bg-[#121212]">
      {/* Marquee Rule */}
      <div className="bg-[#1e1e1e] px-4 py-2 flex items-center space-x-2 border-b border-gray-800">
        <Volume2 size={16} className="text-gray-400" />
        <span className="text-xs text-gray-400 truncate flex-1">
           {groupInfo?.settings?.intro || groupInfo?.description || 'Study hard, play hard.'}
        </span>
        <ChevronRight size={16} className="text-gray-600" />
      </div>

      {/* Status Bar */}
      <div className="px-4 py-3 flex items-center justify-between text-xs text-[#FF6B35]">
        <div className="flex items-center space-x-2">
            <span>Studying <span className="font-bold text-white">{activeMembersCount}</span> members</span>
            <span className="text-gray-600">|</span>
            <span>Target <span className="text-white">{Math.floor((groupInfo?.settings?.dailyGoalSeconds || 0)/3600)}h</span></span>
        </div>
        <div className="flex space-x-3 text-gray-500">
            <Sun size={14} />
            <Dumbbell size={14} />
            <Target size={14} />
        </div>
      </div>

      {/* Desk Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
        {members.map((member) => {
            const active = isMemberActive(member);
            return (
                <div key={member.uid} className="flex flex-col items-center justify-center space-y-2">
                    <div className="relative">
                        <DeskIcon isStudying={active} />
                        {active && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
                        )}
                        {!active && member.isStudying && (
                             <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" title="Paused/Away" />
                        )}
                    </div>
                    <div className="text-center w-full">
                        <div className="text-xs text-gray-400 truncate max-w-[80px] mx-auto">{member.displayName || 'Unknown'}</div>
                        <div className={`text-sm font-mono ${active ? 'text-[#FF6B35]' : 'text-gray-600'}`}>
                            {formatTime(member.studyTimeToday)}
                        </div>
                         <div className="text-[9px] text-gray-600 h-3 truncate">
                            {active ? (member.currentSubject || 'Focus') : ''}
                        </div>
                    </div>
                </div>
            );
        })}
        {/* Empty Slots Filler */}
        {Array.from({ length: Math.max(0, (groupInfo?.settings?.maxCapacity || 50) - members.length) }).slice(0, 3).map((_, i) => (
            <div key={`empty-${i}`} className="flex flex-col items-center justify-center space-y-2 opacity-30">
                <DeskIcon isStudying={false} />
                <div className="text-xs text-gray-600">Empty</div>
                <div className="text-sm font-mono text-gray-700">00:00:00</div>
            </div>
        ))}
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="flex-1 overflow-y-auto bg-[#121212]">
      {/* Sub Header */}
      <div className="flex items-center space-x-4 px-4 py-2 border-b border-gray-800 text-sm">
          <button className="bg-[#FF6B35] text-white px-3 py-1 rounded-full text-xs font-bold">Study time</button>
          <button className="text-gray-500 px-3 py-1 text-xs">Wake Up</button>
          <button className="text-gray-500 px-3 py-1 text-xs">20 Squads</button>
      </div>

      {/* Stats Summary */}
      <div className="px-4 py-3 text-xs text-gray-400 flex space-x-4">
          <span>Total Attendance <span className="text-[#FF6B35]">{activeMembersCount}</span></span>
          <span>Average <span className="text-[#FF6B35]">{(activeMembersCount / (members.length || 1) * 100).toFixed(0)}%</span></span>
      </div>
      
      {/* Table */}
      <div className="w-full">
          {sortedMembers.map((member, index) => {
              const days = ['M','T','W','T','F','S','S'];
              const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; 
              
              // Get user's weekly stats
              const userStats = weeklyStats[member.uid] || {};

              return (
              <div key={member.uid} className="border-b border-gray-800 p-4 hover:bg-[#1e1e1e]">
                  <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-3">
                          <span className="text-gray-500 font-mono text-sm w-4">{index + 1}</span>
                          <span className={`font-bold text-sm ${member.uid === user?.uid ? 'text-green-400' : 'text-white'}`}>
                              {member.displayName}
                          </span>
                      </div>
                      <div className="font-mono text-sm text-gray-300">{formatTime(member.studyTimeToday)}</div>
                  </div>
                  
                  {/* Weekly Grid */}
                  <div className="flex justify-between items-center">
                       <div className="flex space-x-1">
                           {days.map((day, i) => {
                               let content = day;
                               let bg = 'bg-gray-800 text-gray-500';
                               const seconds = userStats[i.toString()] || 0;
                               
                               if (seconds > 0) {
                                   if (i === todayIndex) {
                                       content = formatTime(seconds).slice(0, 4); 
                                       bg = 'bg-[#FF6B35] text-white';
                                   } else {
                                       content = 'P';
                                       bg = 'bg-gray-700 text-gray-300';
                                   }
                               }

                               return (
                               <div key={i} className={`w-8 h-6 rounded flex items-center justify-center text-[9px] border border-gray-700 ${bg} overflow-hidden`}>
                                   {content}
                               </div>
                               );
                           })}
                       </div>
                       <span className="text-xs text-gray-600 flex items-center">
                           <CalendarCheck size={12} className="mr-1"/> {Object.keys(userStats).length}/7
                       </span>
                  </div>
              </div>
          )})}
      </div>
    </div>
  );

  const renderRankings = () => (
    <div className="flex-1 overflow-y-auto bg-[#121212]">
       {/* Date Header */}
       <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#1e1e1e]">
           <button className="text-gray-300 text-sm font-bold flex items-center">
               {new Date().toLocaleDateString()} <ChevronRight size={14} className="ml-1 rotate-90" />
           </button>
           <button className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">Daily</button>
       </div>

      <div className="px-4 py-2 border-b border-gray-800 flex justify-between items-center bg-[#1e1e1e]">
          <span className="text-xs text-gray-400">Target</span>
          <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">{Math.floor((groupInfo?.settings?.dailyGoalSeconds || 0)/3600)}h</span>
              <div className="w-4 h-4 bg-[#FF6B35] rounded-sm"></div>
          </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-4">
          {sortedMembers.map((member, index) => (
              <div key={member.uid} className="flex items-center justify-between">
                   <div className="flex items-center space-x-4">
                       <div className={`w-10 h-10 rounded-full border ${index < 3 ? 'border-[#FF6B35] text-[#FF6B35]' : 'border-gray-600 text-gray-500'} flex items-center justify-center text-xs font-bold`}>
                           {index + 1}
                       </div>
                       <div>
                           <div className="text-[10px] text-[#FF6B35] font-bold">{groupInfo?.settings?.category}</div>
                           <div className="text-sm font-bold text-white">{member.displayName}</div>
                       </div>
                   </div>
                   <div className="flex items-center space-x-3">
                       <span className={`font-mono ${isMemberActive(member) ? 'text-green-400' : 'text-[#FF6B35]'}`}>
                           {formatTime(member.studyTimeToday)}
                       </span>
                       <div className="scale-75 origin-right">
                          <DeskIcon isStudying={false} color="#555" />
                       </div>
                   </div>
              </div>
          ))}
      </div>
    </div>
  );

  const SettingsRow = ({ label, value, onClick, editable }: { label: string, value: string, onClick?: () => void, editable?: boolean }) => (
    <div className="flex justify-between items-center px-4 py-4 active:bg-[#1e1e1e] cursor-pointer" onClick={onClick}>
        <span className="text-sm text-gray-200">{label}</span>
        <div className="flex items-center text-gray-500 text-sm">
            <span className="truncate max-w-[150px]">{value}</span>
            {editable ? <Edit2 size={14} className="ml-2 text-gray-400" /> : <ChevronRight size={16} className="ml-2" />}
        </div>
    </div>
  );

  const renderSettings = () => {
    const isOwner = user?.uid === groupInfo?.ownerId;
    
    const handleUpdate = async (field: string, promptText: string) => {
        if (!isOwner) return;
        const val = prompt(promptText);
        if (val) {
            let updateVal: any = val;
            if (field === 'dailyGoalSeconds') updateVal = parseInt(val) * 3600;
            if (field === 'maxCapacity') updateVal = parseInt(val);
            
            await updateGroupSettings(groupId, { [field]: updateVal });
        }
    };

    return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] text-gray-300">
        <div className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Group Info/Settings</div>
        
        {/* Settings List */}
        <div className="divide-y divide-gray-800 border-t border-b border-gray-800 bg-[#121212]">
             <SettingsRow 
                label="Change Category" 
                value={groupInfo?.settings?.category || 'General'} 
                onClick={() => handleUpdate('category', 'Enter new category')} 
                editable={isOwner}
             />
             <SettingsRow 
                label="Change Daily Goal" 
                value={`${Math.floor((groupInfo?.settings?.dailyGoalSeconds || 0)/3600)}h`} 
                onClick={() => handleUpdate('dailyGoalSeconds', 'Enter hours (e.g. 7)')} 
                editable={isOwner}
             />
             <SettingsRow 
                label="Change Capacity" 
                value={`${groupInfo?.settings?.maxCapacity || 50} people`} 
                onClick={() => handleUpdate('maxCapacity', 'Enter max capacity')} 
                editable={isOwner}
             />
             <SettingsRow label="How to Join" value={groupInfo?.settings?.isPublic ? 'Public' : 'Password'} onClick={() => {}} />
             <SettingsRow label="Group Intro/Rules" value={groupInfo?.settings?.intro?.substring(0, 15) + '...' || 'Edit'} onClick={() => handleUpdate('intro', 'Enter intro')} editable={isOwner} />
        </div>

        <div className="h-4"></div>

        <div className="divide-y divide-gray-800 border-t border-b border-gray-800 bg-[#121212]">
            {['Waiting Room', 'Manage Group Members', 'Nudge everyone at once', 'Group Chat', 'Promote group'].map((label, i) => (
                 <div key={i} className="flex justify-between items-center px-4 py-4 active:bg-[#1e1e1e]">
                    <span className="text-sm text-gray-200">{label}</span>
                    <ChevronRight size={16} className="ml-2 text-gray-500" />
                </div>
            ))}
        </div>

        {isOwner && (
            <div className="p-4 mt-8">
                <button 
                    onClick={handleDeleteGroup}
                    className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-lg shadow-lg shadow-orange-900/20 active:scale-[0.98] transition-transform"
                >
                    Delete group
                </button>
            </div>
        )}
    </div>
  )};

  if (showSettings) {
      return (
          <div className="flex flex-col h-full bg-[#0a0a0a]">
              <div className="flex items-center px-4 py-3 bg-[#121212] border-b border-gray-800">
                  <button onClick={() => setShowSettings(false)} className="mr-4 text-gray-400">
                      <ArrowLeft size={20} />
                  </button>
                  <h1 className="text-lg font-bold text-white">Group Settings</h1>
              </div>
              {renderSettings()}
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white">
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center bg-[#121212]">
        <button onClick={onBack} className="p-1 -ml-2 text-gray-400">
             <ArrowLeft size={22} />
        </button>
        <span className="font-bold text-white truncate max-w-[200px]">{groupInfo?.name}</span>
        <button onClick={() => setShowSettings(true)} className="p-1 text-gray-400">
            <Settings size={22} />
        </button>
      </div>

      {/* Content Area */}
      {currentTab === 'HOME' && renderHome()}
      {currentTab === 'ATTENDANCE' && renderAttendance()}
      {currentTab === 'RANKINGS' && renderRankings()}
      {currentTab === 'CHAT' && <GroupChat groupId={groupId} />}

      {/* Bottom Group Nav */}
      <div className="h-16 bg-[#121212] border-t border-gray-800 flex items-center justify-around pb-safe">
          <button onClick={() => setCurrentTab('HOME')} className={`flex flex-col items-center space-y-1 ${currentTab === 'HOME' ? 'text-white' : 'text-gray-500'}`}>
              <Users size={20} />
              <span className="text-[10px]">Home</span>
          </button>
          <button onClick={() => setCurrentTab('ATTENDANCE')} className={`flex flex-col items-center space-y-1 ${currentTab === 'ATTENDANCE' ? 'text-white' : 'text-gray-500'}`}>
              <CalendarCheck size={20} />
              <span className="text-[10px]">Attendance</span>
          </button>
          <button onClick={() => setCurrentTab('RANKINGS')} className={`flex flex-col items-center space-y-1 ${currentTab === 'RANKINGS' ? 'text-white' : 'text-gray-500'}`}>
              <Trophy size={20} />
              <span className="text-[10px]">Rankings</span>
          </button>
           <button onClick={handleInvite} className={`flex flex-col items-center space-y-1 text-gray-500 active:text-white`}>
              <Share2 size={20} />
              <span className="text-[10px]">Invite</span>
          </button>
           <button onClick={() => setCurrentTab('CHAT')} className={`flex flex-col items-center space-y-1 ${currentTab === 'CHAT' ? 'text-white' : 'text-gray-500'}`}>
              <MessageSquare size={20} />
              <span className="text-[10px]">Chat</span>
          </button>
      </div>
    </div>
  );
};

export default GroupDetail;