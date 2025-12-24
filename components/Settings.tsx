import React, { useState } from 'react';
import { useApp } from '../App';
import { User, Save, Camera, Bell } from 'lucide-react';

const Settings: React.FC = () => {
  const { profile, updateName } = useApp();
  const [name, setName] = useState(profile.displayName);
  const [isEditing, setIsEditing] = useState(false);
  
  const handleSave = () => {
    if (name.trim()) {
      updateName(name);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white">
      <div className="px-4 py-4 border-b border-gray-800 bg-[#121212]">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        
        {/* Profile Section */}
        <div className="bg-[#1e1e1e] rounded-xl p-6 border border-gray-800 mb-6 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-gray-700 mb-4 overflow-hidden border-2 border-[#FF6B35] relative group">
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User size={40} />
                </div>
            </div>

            <div className="w-full">
                <label className="text-xs text-gray-500 mb-1 block uppercase tracking-wider">Display Name</label>
                <div className="flex gap-2">
                    <input 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!isEditing}
                        className={`flex-1 bg-black border ${isEditing ? 'border-[#FF6B35]' : 'border-gray-700'} rounded-lg p-3 text-white outline-none transition-colors`}
                    />
                    {isEditing ? (
                         <button 
                         onClick={handleSave}
                         className="bg-[#FF6B35] px-4 rounded-lg flex items-center justify-center text-white"
                     >
                         <Save size={20} />
                     </button>
                    ) : (
                        <button 
                        onClick={() => setIsEditing(true)}
                        className="bg-gray-800 px-4 rounded-lg text-sm font-medium hover:bg-gray-700"
                    >
                        Edit
                    </button>
                    )}
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
                User ID: <span className="font-mono text-gray-600">{profile.uid}</span>
            </p>
        </div>

        {/* Preferences */}
        <div className="space-y-3 mb-8">
            <h3 className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-2">Preferences</h3>
            
            <div className="bg-[#1e1e1e] p-4 rounded-lg flex justify-between items-center border border-gray-800">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-gray-400" />
                  <span className="text-gray-200">Notifications</span>
                </div>
                <div className="w-12 h-7 rounded-full bg-gray-600 relative">
                     <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full"></div>
                </div>
            </div>
            
            <p className="text-[10px] text-gray-500 px-1 mt-2">
              Data is saved locally on this device. Connect to a room to sync online.
            </p>
        </div>
        
        <div className="text-center mt-8 text-gray-600 text-xs font-mono">
            YPT Clone (Offline First) v2.0
        </div>

      </div>
    </div>
  );
};

export default Settings;