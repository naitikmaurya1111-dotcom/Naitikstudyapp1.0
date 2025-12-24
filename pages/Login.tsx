import React from 'react';
import { loginWithGoogle } from '../firebase';
import { LogIn, UserX } from 'lucide-react';
import { useAuth } from '../App';

const Login: React.FC = () => {
  const { loginAsGuest, setGoogleToken } = useAuth();

  const handleGoogleLogin = async () => {
      try {
          const { token } = await loginWithGoogle();
          if (token) setGoogleToken(token);
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="flex flex-col h-screen bg-black items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-[#FF6B35] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-900/40">
        <span className="text-4xl font-bold text-white">Y</span>
      </div>
      
      <h1 className="text-3xl font-bold text-white mb-2">Yeolpumta</h1>
      <p className="text-gray-400 mb-12">The world's most intense study timer.</p>

      <button
        onClick={handleGoogleLogin}
        className="flex items-center justify-center space-x-3 w-full max-w-sm bg-white text-black py-3 px-6 rounded-full font-bold hover:bg-gray-200 transition-colors mb-4"
      >
        <LogIn size={20} />
        <span>Continue with Google</span>
      </button>

      <button
        onClick={loginAsGuest}
        className="flex items-center justify-center space-x-3 w-full max-w-sm bg-gray-900 text-gray-300 py-3 px-6 rounded-full font-medium hover:bg-gray-800 transition-colors border border-gray-800"
      >
        <UserX size={20} />
        <span>Continue as Guest</span>
      </button>

      <p className="text-xs text-gray-600 mt-8 max-w-xs">
        Guests cannot join groups or sync data across devices.
        <br/>
        Google Calendar integration requires Google Login.
      </p>

      <div className="mt-12 text-gray-800 text-[10px]">
        v1.2.0 • Focus to Win
      </div>
    </div>
  );
};

export default Login;