import React, { useEffect, useState } from 'react';
import { UserProfile, Room } from '../types';
import { subscribeToRoomMembers, subscribeToRoomChat } from '../firebase';
import { 
  Users, MessageSquare, Trophy, CalendarCheck, Share2, 
  ChevronRight, Volume2, Sun, Target, Dumbbell, ArrowLeft
} from 'lucide-react';
import GroupChat from './GroupChat';
import DeskIcon from './DeskIcon';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface GroupDetailProps {
  roomId: string;
  onBack: () => void;
}

const GroupDetail: React.FC<GroupDetailProps> = ({ roomId, onBack }) => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [roomInfo, setRoomInfo] = useState<Room | null>(null);
  const [currentTab, setCurrentTab] = useState<'HOME' | 'CHAT'>('HOME');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // 1. Fetch Room Info
    getDoc(doc(db, 'rooms', roomId)).then(snap => {
        if(snap.exists()) setRoomInfo(snap.data() as Room);
    });

    // 2. Subscribe to Members
    const unsubMembers = subscribeToRoomMembers(roomId, (data) => setMembers(data as UserProfile[]));
    
    // 3. Heartbeat local UI
    const interval = setInterval(() => setNow(Date.now()), 10000); 

    return () => { unsubMembers(); clearInterval(interval); };
  }, [roomId]);

  const isMemberActive = (member: UserProfile) => {
      if (!member.isStudying || !member.lastActive) return false;
      return (now - member.lastActive) < 90000; // 90s tolerance
  };

  const activeMembersCount = members.filter(isMemberActive).length;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(roomId);
    alert('Room ID copied to clipboard');
  };

  const renderHome = () => (
    <div className="flex-1 overflow-y-auto bg-[#121212]">
      {/* Marquee Rule */}
      <div className="bg-[#1e1e1e] px-4 py-2 flex items-center space-x-2 border-b border-gray-800">
        <Volume2 size={16} className="text-gray-400" />
        <span className="text-xs text-gray-400 truncate flex-1">
           {roomInfo?.description || 'Welcome to our study room!'}
        </span>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-3 flex items-center justify-between text-xs text-[#FF6B35]">
        <div className="flex items-center space-x-2">
            <span>Studying <span className="font-bold text-white">{activeMembersCount}</span> members</span>
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
                             <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
                        )}
                    </div>
                    <div className="text-center w-full">
                        <div className="text-xs text-gray-400 truncate max-w-[80px] mx-auto">{member.displayName || 'Unknown'}</div>
                        <div className={`text-sm font-mono ${active ? 'text-[#FF6B35]' : 'text-gray-600'}`}>
                            {formatTime(member.studyTimeToday || 0)}
                        </div>
                         <div className="text-[9px] text-gray-600 h-3 truncate">
                            {active ? (member.currentSubject || 'Focus') : ''}
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white">
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center bg-[#121212]">
        <button onClick={onBack} className="p-1 -ml-2 text-gray-400">
             <ArrowLeft size={22} />
        </button>
        <div className="flex flex-col items-center">
            <span className="font-bold text-white truncate max-w-[200px]">{roomInfo?.name || 'Room'}</span>
            <span className="text-[10px] text-gray-500 font-mono" onClick={handleCopyId}>ID: {roomId}</span>
        </div>
        <div className="w-6"></div>
      </div>

      {currentTab === 'HOME' && renderHome()}
      {currentTab === 'CHAT' && <GroupChat groupId={roomId} />}

      {/* Bottom Group Nav */}
      <div className="h-16 bg-[#121212] border-t border-gray-800 flex items-center justify-around pb-safe">
          <button onClick={() => setCurrentTab('HOME')} className={`flex flex-col items-center space-y-1 ${currentTab === 'HOME' ? 'text-white' : 'text-gray-500'}`}>
              <Users size={20} />
              <span className="text-[10px]">Home</span>
          </button>
           <button onClick={handleCopyId} className={`flex flex-col items-center space-y-1 text-gray-500 active:text-white`}>
              <Share2 size={20} />
              <span className="text-[10px]">Share ID</span>
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