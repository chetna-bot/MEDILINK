import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import Auth from './components/Auth';
import PatientView from './components/PatientView';
import HospitalDoctorView from './components/HospitalDoctorView';
import AdminView from './components/AdminView';
import MedLinkLogo from './components/MedLinkLogo';
import { ShieldCheck, LogOut } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load from session storage for convenience on reload
  useEffect(() => {
    const savedRole = sessionStorage.getItem('medlink_role');
    const savedUser = sessionStorage.getItem('medlink_user');
    const savedToken = sessionStorage.getItem('medlink_token');

    if (savedRole && savedUser && savedToken) {
      setCurrentRole(savedRole as UserRole);
      setCurrentUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const handleLoginSuccess = (role: UserRole, user: any, userToken: string) => {
    setCurrentRole(role);
    setCurrentUser(user);
    setToken(userToken);

    sessionStorage.setItem('medlink_role', role);
    sessionStorage.setItem('medlink_user', JSON.stringify(user));
    sessionStorage.setItem('medlink_token', userToken);
  };

  const handleLogout = () => {
    setCurrentRole(null);
    setCurrentUser(null);
    setToken(null);
    sessionStorage.clear();
  };

  const handleProfileUpdate = (updatedPatient: any) => {
    setCurrentUser(updatedPatient);
    sessionStorage.setItem('medlink_user', JSON.stringify(updatedPatient));
  };

  return (
    <div className="h-screen w-screen bg-[#F4F7FA] text-[#1E293B] font-sans overflow-hidden flex flex-col">
      

      {/* RENDER AUTH SCREEN IF NOT LOGGED IN */}
      {!currentRole || !token ? (
        <div className="flex-1 overflow-y-auto">
          <Auth onLoginSuccess={handleLoginSuccess} />
        </div>
      ) : (
        /* RENDER DASHBOARD FRAME */
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Main Workspace Header */}
          <header className="h-16 bg-slate-900 flex items-center justify-between px-6 shrink-0 shadow-sm border-b border-slate-800 text-white">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <MedLinkLogo size="sm" showText={false} variant="light" />
                <span className="text-base font-bold tracking-tight text-white">MedLink</span>
                <span className="text-slate-600 hidden sm:inline">|</span>
                <span className="text-xs text-slate-400 hidden sm:inline font-medium">Unified Health Cloud</span>
              </div>
            </div>

            {/* Profile badge & logout */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-200">{currentUser?.name || 'Authorized User'}</p>
                <div className="flex items-center gap-1.5 justify-end">
                  <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-slate-400">
                    {currentRole} Session Active
                  </span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-semibold text-xs">
                {currentUser?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) || 'MD'}
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/80"
                title="Log out of secure session"
              >
                <LogOut size={14} />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          </header>

          {/* ACTIVE ROLE DESK */}
          <div className="flex-1 overflow-hidden">
            {currentRole === 'Patient' && (
              <PatientView 
                token={token} 
                patient={currentUser} 
                onProfileUpdate={handleProfileUpdate} 
              />
            )}
            
            {(currentRole === 'Hospital' || currentRole === 'Doctor') && (
              <HospitalDoctorView 
                token={token} 
                user={currentUser} 
                role={currentRole} 
              />
            )}

            {currentRole === 'Admin' && (
              <AdminView token={token} />
            )}
          </div>

        </div>
      )}

    </div>
  );
}
