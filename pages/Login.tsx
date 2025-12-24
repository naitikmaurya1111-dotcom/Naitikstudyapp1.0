import React, { useState } from 'react';
import { loginWithGoogle, loginWithEmailPassword, registerWithEmailPassword } from '../firebase';
import { LogIn, UserX, AlertCircle, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../App';

const Login: React.FC = () => {
  const { loginAsGuest, setGoogleToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  // Email Auth State
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
      setError(null);
      try {
          const { token } = await loginWithGoogle();
          if (token) setGoogleToken(token);
      } catch (e: any) {
          console.error(e);
          if (e.code === 'auth/unauthorized-domain') {
              setError("Login failed: This domain is not authorized in Firebase Console.");
          } else if (e.code === 'auth/popup-closed-by-user') {
              setError("Login cancelled by user.");
          } else {
              setError("Login failed. Check console for details.");
          }
      }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
        if (isSignUp) {
           if(!name.trim()) throw new Error("Name is required for sign up.");
           await registerWithEmailPassword(name, email, password);
        } else {
           await loginWithEmailPassword(email, password);
        }
    } catch (err: any) {
        console.error(err);
        if (err.code === 'auth/invalid-email') setError("Invalid email address.");
        else if (err.code === 'auth/user-disabled') setError("User account disabled.");
        else if (err.code === 'auth/user-not-found') setError("No account found with this email.");
        else if (err.code === 'auth/wrong-password') setError("Incorrect password.");
        else if (err.code === 'auth/email-already-in-use') setError("Email already in use.");
        else if (err.code === 'auth/weak-password') setError("Password should be at least 6 characters.");
        else if (err.code === 'auth/missing-password') setError("Please enter a password.");
        else setError(err.message || "Authentication failed.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black items-center justify-center p-6 text-center overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-center">
          
        {/* Logo Section */}
        <div className="w-16 h-16 bg-[#FF6B35] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-900/40">
            <span className="text-3xl font-bold text-white">Y</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Yeolpumta</h1>
        <p className="text-gray-400 text-sm mb-8">Focus. Study. Succeed.</p>

        {/* Error Message */}
        {error && (
            <div className="w-full bg-red-900/20 border border-red-800 text-red-200 p-3 rounded-lg text-xs mb-6 flex items-center gap-2 text-left animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
            </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="w-full space-y-3 mb-6">
            {isSignUp && (
                <div className="relative">
                    <User size={18} className="absolute left-3 top-3 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Display Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:border-[#FF6B35] outline-none"
                    />
                </div>
            )}
            <div className="relative">
                <Mail size={18} className="absolute left-3 top-3 text-gray-500" />
                <input 
                    type="email" 
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:border-[#FF6B35] outline-none"
                />
            </div>
            <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-gray-500" />
                <input 
                    type="password" 
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:border-[#FF6B35] outline-none"
                />
            </div>

            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#FF6B35] text-white font-bold py-3 rounded-lg hover:bg-[#e55a2b] transition-colors flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        {isSignUp ? "Sign Up" : "Login"} <ArrowRight size={18} />
                    </>
                )}
            </button>
        </form>

        <div className="text-xs text-gray-400 mb-6">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button 
                onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                className="text-[#FF6B35] font-bold hover:underline"
            >
                {isSignUp ? "Login" : "Sign Up"}
            </button>
        </div>

        {/* Divider */}
        <div className="flex items-center w-full mb-6">
            <div className="flex-1 h-px bg-gray-800"></div>
            <span className="px-3 text-[10px] text-gray-600 uppercase">Or continue with</span>
            <div className="flex-1 h-px bg-gray-800"></div>
        </div>

        {/* Social Buttons */}
        <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center space-x-3 w-full bg-white text-black py-3 px-6 rounded-lg font-bold hover:bg-gray-200 transition-colors mb-3"
        >
            <LogIn size={20} />
            <span>Google</span>
        </button>

        <button
            onClick={loginAsGuest}
            className="flex items-center justify-center space-x-3 w-full bg-gray-900 text-gray-300 py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors border border-gray-800"
        >
            <UserX size={20} />
            <span>Guest Mode</span>
        </button>

        <p className="text-[10px] text-gray-600 mt-8 max-w-xs">
            By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Login;