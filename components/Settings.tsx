import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { LogOut, User, Save, Camera, Bell } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Settings: React.FC = () => {
  const { user, isGuest, logout, updateName } = useAuth();
  const [name, setName] = useState(user?.displayName || (isGuest ? 'Guest' : ''));
  const [isEditing, setIsEditing] = useState(false);
  
  // Preference States
  const [notifications, setNotifications] = useState(false);

  useEffect(() => {
      setName(user?.displayName || (isGuest ? 'Guest' : ''));
      
      if ('Notification' in window && Notification.permission === 'granted') {
        setNotifications(true);
      }
  }, [user, isGuest]);

  const handleSave = async () => {
    if (name.trim()) {
      await updateName(name);
      setIsEditing(false);
    }
  };

  const handlePhotoUpdate = async () => {
    if (isGuest || !user) return;
    const url = prompt("Enter URL for your profile picture:");
    if (url) {
      try {
        await updateProfile(user, { photoURL: url });
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { photoURL: url });
        window.location.reload(); 
      } catch (e) {
        alert("Failed to update profile picture.");
      }
    }
  };

  const toggleNotifications = async () => {
    if (!('Notification' in window)) {
      alert("This browser does not support desktop notifications");
      return;
    }

    if (!notifications) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotifications(true);
        new Notification("YPT Clone", { body: "Notifications enabled successfully!" });
      } else {
        alert("Permission denied. Please enable notifications in your browser settings.");
      }
    } else {
      // Just toggle UI state as we cannot programmatically revoke permissions
      setNotifications(false);
    }
  };

  const Toggle = ({ value, onChange }: { value: boolean, onChange: () => void }) => (
      <div 
        onClick={onChange}
        className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors duration-200 ${value ? 'bg-[#FF6B35]' : 'bg-gray-600'}`}
      >
          <div 
            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${value ? 'left-6' : 'left-1'}`}
          ></div>
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white">
      <div className="px-4 py-4 border-b border-gray-800 bg-[#121212]">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        
        {/* Profile Section */}
        <div className="bg-[#1e1e1e] rounded-xl p-6 border border-gray-800 mb-6 flex flex-col items-center">
            <div 
              className="w-24 h-24 rounded-full bg-gray-700 mb-4 overflow-hidden border-2 border-[#FF6B35] relative group"
              onClick={handlePhotoUpdate}
            >
                {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User size={40} />
                    </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 h-8 flex items-center justify-center cursor-pointer group-hover:bg-black/70 transition-colors">
                    <Camera size={12} />
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
            {isGuest && <p className="text-xs text-yellow-600 mt-2">Guest account data is local to this device.</p>}
        </div>

        {/* Preferences */}
        <div className="space-y-3 mb-8">
            <h3 className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-2">Preferences</h3>
            
            <div className="bg-[#1e1e1e] p-4 rounded-lg flex justify-between items-center border border-gray-800">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-gray-400" />
                  <span className="text-gray-200">Notifications</span>
                </div>
                <Toggle value={notifications} onChange={toggleNotifications} />
            </div>
            
            <p className="text-[10px] text-gray-500 px-1 mt-2">
              Dark mode is enabled by default to save battery during long study sessions.
            </p>
        </div>

        {/* Logout */}
        <button 
            onClick={logout}
            className="w-full py-4 rounded-xl bg-red-900/10 text-red-500 border border-red-900/30 flex items-center justify-center gap-2 font-bold hover:bg-red-900/20 transition-colors active:scale-[0.98]"
        >
            <LogOut size={20} />
            Logout
        </button>
        
        <div className="text-center mt-8 text-gray-600 text-xs font-mono">
            YPT Clone v1.3.2
        </div>

      </div>
    </div>
  );
};

export default Settings;