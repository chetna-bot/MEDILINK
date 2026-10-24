import React, { useState, useEffect } from 'react';
import { Shield, Building, Award, Users, AlertTriangle, Check, Trash2, Heart, RefreshCw, Database, HardDrive, Lock } from 'lucide-react';

interface AdminViewProps {
  token: string;
}

export default function AdminView({ token }: AdminViewProps) {
  const [stats, setStats] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch admin statistics');
      
      setStats(data.stats);
      setHospitals(data.hospitals);
      setDoctors(data.doctors);
      setSecurityLogs(data.securityLogs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const approveHospital = async (id: string) => {
    try {
      const res = await fetch(`/api/hospitals/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMessage(data.message);
      fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const verifyDoctor = async (id: string) => {
    try {
      const res = await fetch(`/api/doctors/${id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(data.message);
      fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this account from the clinical directory? This operation is irreversible.")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(data.message);
      fetchAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F8FAFC]">
        <RefreshCw className="animate-spin text-blue-600 mb-2" size={32} />
        <span className="text-sm font-bold text-slate-600">Loading Administrative Control Console...</span>
      </div>
    );
  }

  return (
    <div id="admin-view" className="flex-1 p-6 overflow-y-auto space-y-6 h-full bg-[#F8FAFC]">
      
      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-xs text-red-700 font-medium flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold">X</button>
        </div>
      )}
      {message && (
        <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded-r-xl text-xs text-green-700 font-medium flex justify-between items-center">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-green-500 hover:text-green-700 font-bold">X</button>
        </div>
      )}

      {/* Header Info */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Control Console</h1>
          <p className="text-xs text-slate-500">Integrity audits, provider licensing & global directory metrics</p>
        </div>
        <button 
          onClick={fetchAdminData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
        >
          <RefreshCw size={14} /> REFRESH
        </button>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <Building className="text-blue-600" size={20} />
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">HOSPITALS</span>
          </div>
          <p className="text-2xl font-black text-slate-800">{stats?.hospitalsCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Federated medical nodes</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <Award className="text-green-600" size={20} />
            <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded">DOCTORS</span>
          </div>
          <p className="text-2xl font-black text-slate-800">{doctors.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">Verified medical providers</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <Users className="text-purple-600" size={20} />
            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded">PATIENTS</span>
          </div>
          <p className="text-2xl font-black text-slate-800">{stats?.patientsCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Unified active identities</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <Heart className="text-red-500" size={20} />
            <span className="px-1.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded">RECORDS</span>
          </div>
          <p className="text-2xl font-black text-slate-800">{stats?.recordsCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Encrypted clinical ledger files</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <AlertTriangle className="text-amber-500" size={20} />
            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded">ALERTS</span>
          </div>
          <p className="text-2xl font-black text-amber-600">0</p>
          <p className="text-[10px] text-slate-400 mt-1">Network violations</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Verification lists */}
        <div className="col-span-8 space-y-6">
          
          {/* Hospital Approvals */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mb-4">
              Registered Health Facilities Directory
            </h2>
            <div className="space-y-3">
              {hospitals.map((h) => (
                <div key={h.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{h.name}</span>
                      <span className="text-[10px] font-semibold text-blue-600 font-mono">{h.id}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{h.location} • License: {h.licenseNo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.approved ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-lg flex items-center gap-1">
                        <Check size={12} /> APPROVED
                      </span>
                    ) : (
                      <button
                        onClick={() => approveHospital(h.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-bold rounded-lg transition-colors"
                      >
                        APPROVE LICENSING
                      </button>
                    )}
                    <button
                      onClick={() => deleteAccount(h.id)}
                      className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors"
                      title="Delist Facility"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Doctor Credentials */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mb-4">
              Doctor Qualifications Audit
            </h2>
            <div className="space-y-3">
              {doctors.map((d) => (
                <div key={d.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{d.name}</span>
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded">{d.specialty}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Affiliation: {d.hospitalName} • License: <span className="font-mono font-bold">{d.licenseNo}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.verified ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-lg flex items-center gap-1">
                        <Check size={12} /> VERIFIED
                      </span>
                    ) : (
                      <button
                        onClick={() => verifyDoctor(d.id)}
                        className="px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 text-[11px] font-bold rounded-lg transition-colors"
                      >
                        VERIFY CREDENTIALS
                      </button>
                    )}
                    <button
                      onClick={() => deleteAccount(d.id)}
                      className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors"
                      title="Revoke License"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Security Logs Monitor */}
        <div className="col-span-4 space-y-6">

          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col h-[520px]">
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <Shield className="text-green-400" size={20} />
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-200">
                Network Security Log
              </h2>
            </div>
            
            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed shrink-0">
              Live HIPAA transmission audit and blockchain-style state integrity monitoring.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px] pr-1">
              {securityLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex flex-col gap-1">
                  <div className="flex justify-between text-slate-400">
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`font-bold px-1 rounded ${
                      log.status === 'PASS' || log.status === 'SECURE'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-white font-medium">{log.event}</p>
                  <p className="text-slate-400 text-[9px]">IP / Node: {log.ip}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 shrink-0 flex justify-between text-[11px] text-slate-400">
              <span>Database Ledger Status:</span>
              <span className="text-green-400 font-bold">100% HEALTHY</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
