import React, { useEffect, useState } from 'react';
import { Plus, MessageCircle, Users, X, Search, Lock } from 'lucide-react';
import { StudyGroup } from '../types';
import { useAuth } from '../App';
import { subscribeToUserGroups, createGroup, joinGroup } from '../firebase';

interface GroupListProps {
  onSelectGroup: (groupId: string) => void;
}

const GroupList: React.FC<GroupListProps> = ({ onSelectGroup }) => {
  const { user, isGuest } = useAuth();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [showModal, setShowModal] = useState<'NONE' | 'CREATE' | 'JOIN'>('NONE');
  
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('General');
  const [joinGroupId, setJoinGroupId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !isGuest) {
      const unsubscribe = subscribeToUserGroups(user.uid, (data) => {
        setGroups(data as StudyGroup[]);
      });
      return () => unsubscribe();
    }
  }, [user, isGuest]);

  if (isGuest) {
      return (
          <div className="flex flex-col h-full bg-[#121212] items-center justify-center text-center p-6">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Lock size={32} className="text-gray-500"/>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Login Required</h2>
              <p className="text-gray-400 mb-6">Groups and Social features are only available for logged-in users to ensure community safety.</p>
              <button 
                onClick={() => window.location.reload()} // Simple way to go back to login for now
                className="bg-[#FF6B35] text-white px-6 py-2 rounded-full font-bold"
              >
                  Go to Login
              </button>
          </div>
      );
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
        await createGroup(user.uid, newGroupName, newGroupDesc, newGroupCategory);
        setShowModal('NONE');
        setNewGroupName('');
        setNewGroupDesc('');
    } catch (err) {
        console.error(err);
        setError("Failed to create group.");
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!user) return;
      try {
          await joinGroup(user.uid, joinGroupId.trim());
          setShowModal('NONE');
          setJoinGroupId('');
      } catch (err) {
          setError("Could not join group. Check ID.");
      }
  }

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white relative">
       <div className="flex items-center justify-between px-4 py-3 bg-[#121212] border-b border-gray-800">
        <div className="text-xl font-bold">My Groups</div>
        <button 
            onClick={() => setShowModal('CREATE')}
            className="p-2 rounded-full bg-gray-800 hover:bg-gray-700"
        >
            <Plus size={20} className="text-[#FF6B35]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Users size={48} className="mb-4 opacity-50"/>
                <p>You haven't joined any groups yet.</p>
                <div className="flex space-x-4 mt-6">
                    <button onClick={() => setShowModal('CREATE')} className="text-[#FF6B35] font-bold">Create</button>
                    <span>or</span>
                    <button onClick={() => setShowModal('JOIN')} className="text-[#FF6B35] font-bold">Join</button>
                </div>
            </div>
        ) : (
            groups.map(group => (
                <div 
                    key={group.id} 
                    onClick={() => onSelectGroup(group.id)}
                    className="bg-[#1e1e1e] rounded-xl p-4 flex items-center space-x-4 border border-gray-800 active:scale-[0.98] transition-transform cursor-pointer"
                >
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-inner">
                        <Users className="text-gray-500" />
                    </div>
                    
                    <div className="flex-1">
                        <h3 className="font-bold text-base text-white">{group.name}</h3>
                        <p className="text-xs text-gray-400 mt-1">{group.memberCount} members • {group.settings?.category}</p>
                    </div>

                    <div className="text-gray-500">
                        <MessageCircle size={20} />
                    </div>
                </div>
            ))
        )}
      </div>

      {/* Floating Join Button */}
      <button 
        onClick={() => setShowModal('JOIN')}
        className="absolute bottom-6 right-6 bg-[#FF6B35] text-white p-4 rounded-full shadow-lg hover:bg-orange-600 transition-colors"
      >
        <Search size={24} />
      </button>

      {/* Modals */}
      {showModal !== 'NONE' && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-[#1e1e1e] w-full max-w-sm rounded-2xl border border-gray-700 p-6 relative">
                  <button 
                    onClick={() => { setShowModal('NONE'); setError(''); }} 
                    className="absolute top-4 right-4 text-gray-400"
                  >
                      <X size={20} />
                  </button>

                  <h2 className="text-xl font-bold mb-6">
                      {showModal === 'CREATE' ? 'Create New Group' : 'Join Group'}
                  </h2>

                  {showModal === 'CREATE' ? (
                      <form onSubmit={handleCreateGroup} className="space-y-4">
                          <div>
                              <label className="block text-xs text-gray-400 mb-1">Group Name</label>
                              <input 
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-[#FF6B35] outline-none"
                                placeholder="e.g. JEE Toppers"
                                required
                              />
                          </div>
                          <div>
                              <label className="block text-xs text-gray-400 mb-1">Category</label>
                              <select 
                                value={newGroupCategory}
                                onChange={(e) => setNewGroupCategory(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white outline-none"
                              >
                                  <option>General</option>
                                  <option>Exam Prep</option>
                                  <option>Coding</option>
                                  <option>Language</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs text-gray-400 mb-1">Description</label>
                              <textarea 
                                value={newGroupDesc}
                                onChange={(e) => setNewGroupDesc(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-[#FF6B35] outline-none h-20 resize-none"
                                placeholder="What is this group about?"
                              />
                          </div>
                          <button type="submit" className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-xl mt-2">
                              Create Group
                          </button>
                      </form>
                  ) : (
                      <form onSubmit={handleJoinGroup} className="space-y-4">
                           <div>
                              <label className="block text-xs text-gray-400 mb-1">Group ID</label>
                              <input 
                                value={joinGroupId}
                                onChange={(e) => setJoinGroupId(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-[#FF6B35] outline-none"
                                placeholder="Paste Group ID here"
                                required
                              />
                          </div>
                          {error && <p className="text-red-500 text-sm">{error}</p>}
                          <button type="submit" className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-xl mt-2">
                              Join Group
                          </button>
                      </form>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default GroupList;