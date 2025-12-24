import React, { useState } from 'react';
import { Plus, Users, X, Search, Lock, KeyRound, Copy } from 'lucide-react';
import { useApp } from '../App';
import { createRoom, joinRoomWithPassword } from '../firebase';
import { setConnectedRoomId, getConnectedRoomId } from '../utils/localStorage';

interface GroupListProps {
  onSelectRoom: (roomId: string) => void;
}

const GroupList: React.FC<GroupListProps> = ({ onSelectRoom }) => {
  const { profile, refreshData } = useApp();
  const [activeRoomId, setActiveRoomId] = useState<string | null>(getConnectedRoomId());
  
  const [showModal, setShowModal] = useState<'NONE' | 'CREATE' | 'JOIN'>('NONE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [joinId, setJoinId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
        const id = await createRoom(profile.uid, roomName, roomPassword);
        
        // Auto-join after create
        setConnectedRoomId(id);
        setActiveRoomId(id);
        refreshData();
        onSelectRoom(id);
        
        setShowModal('NONE');
        setRoomName('');
        setRoomPassword('');
    } catch (err) {
        setError("Failed to create room. Are you online?");
    } finally {
        setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');
      try {
          await joinRoomWithPassword(joinId.trim(), joinPassword.trim(), profile.uid);
          
          setConnectedRoomId(joinId.trim());
          setActiveRoomId(joinId.trim());
          refreshData();
          onSelectRoom(joinId.trim());
          
          setShowModal('NONE');
          setJoinId('');
          setJoinPassword('');
      } catch (err: any) {
          console.error(err);
          setError(err.message || "Could not join. Check ID and Password.");
      } finally {
          setIsLoading(false);
      }
  }

  const handleLeaveRoom = () => {
      if(confirm("Disconnect from current room?")) {
          setConnectedRoomId(null);
          setActiveRoomId(null);
          refreshData();
      }
  };

  // If already connected, show the "Connected" State
  if (activeRoomId) {
      return (
          <div className="flex flex-col h-full bg-[#121212] items-center justify-center p-6 text-center">
              <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mb-4 border border-green-500/50">
                  <Users size={40} className="text-green-500"/>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Connected to Room</h2>
              <div className="bg-[#1e1e1e] p-3 rounded-lg border border-gray-800 flex items-center gap-3 mb-6">
                  <span className="font-mono text-gray-300">{activeRoomId}</span>
                  <button onClick={() => navigator.clipboard.writeText(activeRoomId)}><Copy size={16} className="text-gray-500 hover:text-white"/></button>
              </div>
              
              <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button 
                    onClick={() => onSelectRoom(activeRoomId)} 
                    className="bg-[#FF6B35] text-white px-6 py-3 rounded-xl font-bold w-full"
                  >
                      Enter Room
                  </button>
                  <button 
                    onClick={handleLeaveRoom}
                    className="bg-gray-800 text-gray-400 px-6 py-3 rounded-xl font-medium w-full"
                  >
                      Disconnect
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white relative">
       <div className="flex items-center justify-between px-4 py-3 bg-[#121212] border-b border-gray-800">
        <div className="text-xl font-bold">Rooms</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <div className="text-center space-y-2 max-w-xs">
              <h2 className="text-xl font-bold">Study Together</h2>
              <p className="text-gray-400 text-sm">Create a private room with a password or join friends to sync your study status.</p>
          </div>

          <div className="grid gap-4 w-full max-w-xs">
              <button 
                onClick={() => setShowModal('CREATE')}
                className="bg-[#1e1e1e] border border-gray-700 p-4 rounded-xl flex items-center gap-4 hover:bg-[#2a2a2a] transition-colors"
              >
                  <div className="w-10 h-10 bg-[#FF6B35] rounded-full flex items-center justify-center text-white">
                      <Plus size={20} />
                  </div>
                  <div className="text-left">
                      <div className="font-bold">Create Room</div>
                      <div className="text-xs text-gray-500">Get a Room ID & set password</div>
                  </div>
              </button>

              <button 
                onClick={() => setShowModal('JOIN')}
                className="bg-[#1e1e1e] border border-gray-700 p-4 rounded-xl flex items-center gap-4 hover:bg-[#2a2a2a] transition-colors"
              >
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white">
                      <KeyRound size={20} />
                  </div>
                  <div className="text-left">
                      <div className="font-bold">Join Room</div>
                      <div className="text-xs text-gray-500">Enter ID & Password</div>
                  </div>
              </button>
          </div>
      </div>

      {/* Modals */}
      {showModal !== 'NONE' && (
          <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
              <div className="bg-[#1e1e1e] w-full max-w-sm rounded-2xl border border-gray-700 p-6 relative">
                  <button 
                    onClick={() => { setShowModal('NONE'); setError(''); }} 
                    className="absolute top-4 right-4 text-gray-400"
                  >
                      <X size={20} />
                  </button>

                  <h2 className="text-xl font-bold mb-6">
                      {showModal === 'CREATE' ? 'Create Room' : 'Join Room'}
                  </h2>

                  {showModal === 'CREATE' ? (
                      <form onSubmit={handleCreateRoom} className="space-y-4">
                          <div>
                              <label className="block text-xs text-gray-400 mb-1">Room Name</label>
                              <input 
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-[#FF6B35] outline-none"
                                placeholder="My Study Room"
                                required
                              />
                          </div>
                          <div>
                              <label className="block text-xs text-gray-400 mb-1">Set Password</label>
                              <div className="relative">
                                <Lock size={16} className="absolute left-3 top-3.5 text-gray-500"/>
                                <input 
                                    type="text"
                                    value={roomPassword}
                                    onChange={(e) => setRoomPassword(e.target.value)}
                                    className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-10 text-white focus:border-[#FF6B35] outline-none"
                                    placeholder="Secret Password"
                                    required
                                />
                              </div>
                          </div>
                          <button disabled={isLoading} type="submit" className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-xl mt-2 disabled:opacity-50">
                              {isLoading ? 'Creating...' : 'Create & Join'}
                          </button>
                      </form>
                  ) : (
                      <form onSubmit={handleJoinRoom} className="space-y-4">
                           <div>
                              <label className="block text-xs text-gray-400 mb-1">Room ID</label>
                              <input 
                                value={joinId}
                                onChange={(e) => setJoinId(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-[#FF6B35] outline-none font-mono"
                                placeholder="Paste Room ID"
                                required
                              />
                          </div>
                          <div>
                              <label className="block text-xs text-gray-400 mb-1">Password</label>
                              <div className="relative">
                                <KeyRound size={16} className="absolute left-3 top-3.5 text-gray-500"/>
                                <input 
                                    type="text"
                                    value={joinPassword}
                                    onChange={(e) => setJoinPassword(e.target.value)}
                                    className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-10 text-white focus:border-[#FF6B35] outline-none"
                                    placeholder="Enter Room Password"
                                    required
                                />
                              </div>
                          </div>
                          {error && <p className="text-red-500 text-sm bg-red-900/20 p-2 rounded">{error}</p>}
                          <button disabled={isLoading} type="submit" className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-xl mt-2 disabled:opacity-50">
                              {isLoading ? 'Connecting...' : 'Join Room'}
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