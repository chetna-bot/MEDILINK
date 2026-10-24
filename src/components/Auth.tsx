import React, { useState } from 'react';
import { Shield, CheckCircle, AlertCircle, Heart, Lock, Stethoscope, Building2, User, Sparkles } from 'lucide-react';
import { UserRole } from '../types';
import MedLinkLogo from './MedLinkLogo';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  syncUserProfileToFirestore 
} from '../firebase';

const authHeroImage = new URL('../assets/images/auth_clinical_hero_1792232371600.jpg', import.meta.url).href;
const smartChipImage = new URL('../assets/images/smart_health_card_chip_1792232372491.jpg', import.meta.url).href;

interface AuthProps {
  onLoginSuccess: (role: UserRole, user: any, token: string) => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('Patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // ================= GOOGLE SIGN-IN ONLY (FIREBASE AUTH & FIRESTORE) =================
  const handleGoogleSignIn = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      // 1. Persist user profile directly into Firestore collection 'users/{userId}'
      await syncUserProfileToFirestore({
        uid: fbUser.uid,
        name: fbUser.displayName || 'Authorized User',
        email: fbUser.email || '',
        phone: fbUser.phoneNumber || '',
        role: selectedRole,
        photoURL: fbUser.photoURL || ''
      });

      // 2. Synchronize session with MedLink system backend
      const syncRes = await fetch('/api/auth/firebase-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          phoneNumber: fbUser.phoneNumber,
          role: selectedRole
        })
      });

      const syncData = await syncRes.json();
      if (!syncRes.ok) throw new Error(syncData.error || 'Failed to initialize session');

      setMessage(`Authenticated with Google as ${fbUser.displayName || fbUser.email}`);
      onLoginSuccess(selectedRole, syncData.user, syncData.token);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed before completion. Please click below to try again.');
      } else {
        setError(err.message || 'Failed to authenticate with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-page" className="min-h-screen bg-[#F4F7FA] flex flex-col items-center justify-center p-4 font-sans relative">
      
      {/* Main Container Card: 2-Column Clinical Layout */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] my-6">
        
        {/* Left Column: Focused Google Sign-In Portal */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 bg-white">
          <div>
            {/* Brand Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <MedLinkLogo size="sm" showText={false} variant="color" />
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">MedLink Portal</h1>
                  <p className="text-xs text-slate-500">Universal Digital Health Record • Firebase Auth</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 font-semibold">
                Firebase Firestore
              </span>
            </div>

            {/* Instruction Banner */}
            <div className="mt-8 mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Welcome to MedLink
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Select your clinical role and sign in securely with your Google account.
              </p>
            </div>

            {/* Role Selection Tabs */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Select Sign-In Role:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { r: 'Patient' as UserRole, label: 'Patient', icon: User, desc: 'Health Record' },
                  { r: 'Doctor' as UserRole, label: 'Doctor', icon: Stethoscope, desc: 'Clinical Care' },
                  { r: 'Hospital' as UserRole, label: 'Hospital', icon: Building2, desc: 'Facility Admin' },
                  { r: 'Admin' as UserRole, label: 'Admin', icon: Lock, desc: 'Governance' },
                ].map(({ r, label, icon: Icon, desc }) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r);
                      setError('');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedRole === r
                        ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-2 ring-sky-100'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={16} className={selectedRole === r ? 'text-sky-600' : 'text-slate-400'} />
                    <p className={`text-xs font-bold mt-1.5 ${selectedRole === r ? 'text-sky-900' : 'text-slate-700'}`}>
                      {label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-50/90 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="mb-5 p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-start gap-2.5">
                <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                <span>{message}</span>
              </div>
            )}

            {/* THE ONLY SIGN-IN OPTION: GOOGLE SIGN-IN */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm sm:text-base rounded-2xl border-2 border-slate-200 hover:border-slate-300 shadow-md transition-all hover:shadow-lg active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>
                  {loading ? 'Authenticating with Google...' : `Sign In with Google as ${selectedRole}`}
                </span>
              </button>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-500 flex items-center gap-2">
                <Shield size={14} className="text-teal-600 shrink-0" />
                <span>Zero passwords required. Authentication is cryptographically verified by Google Firebase Auth.</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Unified Digital Health Architecture</span>
            <span>HIPAA • Zero-Trust Access</span>
          </div>
        </div>

        {/* Right Column: Hero Visual & Trust Architecture */}
        <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-8 text-white bg-slate-950 overflow-hidden">
          <img
            src={authHeroImage}
            alt="Clinical laboratory"
            className="absolute inset-0 w-full h-full object-cover opacity-45 mix-blend-luminosity"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40" />

          {/* Top Brand Tag */}
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium tracking-wide text-slate-300">Firebase Cloud Active</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">ABAC Protected</span>
          </div>

          {/* Physical Smart Card Credential Graphic */}
          <div className="relative z-10 my-auto py-6">
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-5 border border-slate-700/80 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white tracking-wide">GOOGLE HEALTH IDENTITY</p>
                    <p className="text-[10px] text-slate-400">OAuth 2.0 &amp; Firebase</p>
                  </div>
                </div>
                <img
                  src={smartChipImage}
                  alt="Security chip"
                  className="w-10 h-7 rounded object-cover border border-amber-300/40 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="pt-2 border-t border-slate-800">
                <p className="text-[10px] font-mono text-slate-400">SELECTED CLINICAL PROFILE</p>
                <p className="text-sm font-mono font-bold text-teal-300 tracking-wider uppercase">
                  {selectedRole} Role Session
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                <div>
                  <p className="text-slate-500">Security Model</p>
                  <p className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle size={10} /> Google Verified
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Persistence</p>
                  <p className="text-sky-300 font-semibold">Cloud Firestore</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance Footnote */}
          <div className="relative z-10 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
            <p className="font-semibold text-slate-300">Single Sign-On Experience</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Secure one-click authentication linked with your Google credentials and Firestore document store.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
