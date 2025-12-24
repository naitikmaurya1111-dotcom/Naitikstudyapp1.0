import React, { useEffect, useState, useRef } from 'react';
import { Send, User } from 'lucide-react';
import { useAuth } from '../App';
import { ChatMessage } from '../types';
import { sendGroupMessage, subscribeToGroupMessages } from '../firebase';

interface GroupChatProps {
  groupId: string;
}

const GroupChat: React.FC<GroupChatProps> = ({ groupId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToGroupMessages(groupId, (data) => {
        // Convert timestamps to Date objects if needed or rely on serialization
        const mapped = data.map(m => ({
            ...m,
            // Handle Firestore timestamp or serialized date
            createdAt: m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt || Date.now())
        })) as ChatMessage[];
        setMessages(mapped);
    });
    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    
    try {
        await sendGroupMessage(groupId, user, newMessage.trim());
        setNewMessage('');
    } catch (err) {
        console.error("Failed to send message", err);
    }
  };

  const formatTime = (date: Date) => {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#121212]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-10 text-sm">
                No messages yet. Start the conversation!
            </div>
        ) : (
            messages.map((msg) => {
                const isMe = user?.uid === msg.userId;
                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                            {/* Avatar */}
                            <div className="w-6 h-6 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 border border-gray-600">
                                {msg.photoURL ? (
                                    <img src={msg.photoURL} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <User size={12} />
                                    </div>
                                )}
                            </div>
                            
                            {/* Bubble */}
                            <div className={`rounded-2xl px-3 py-2 text-sm ${
                                isMe 
                                ? 'bg-[#FF6B35] text-white rounded-br-none' 
                                : 'bg-[#1e1e1e] text-gray-200 border border-gray-700 rounded-bl-none'
                            }`}>
                                {!isMe && <div className="text-[10px] text-[#FF6B35] font-bold mb-1">{msg.userName}</div>}
                                {msg.text}
                                <div className={`text-[9px] mt-1 ${isMe ? 'text-orange-200' : 'text-gray-500'} text-right`}>
                                    {formatTime(msg.createdAt as any)}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-[#1e1e1e] border-t border-gray-800">
          <form onSubmit={handleSend} className="flex gap-2">
              <input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-black border border-gray-700 rounded-full px-4 py-2 text-sm text-white focus:border-[#FF6B35] outline-none"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="w-10 h-10 rounded-full bg-[#FF6B35] flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  <Send size={18} />
              </button>
          </form>
      </div>
    </div>
  );
};

export default GroupChat;
