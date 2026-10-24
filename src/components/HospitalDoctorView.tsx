import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, CheckCircle, FileText, Plus, Trash2, Calendar, Clock, RefreshCw, ChevronDown, User, Heart, Send, Cloud, HardDrive, UploadCloud, Database } from 'lucide-react';
import { RecordType, Medicine } from '../types';
import GCSStorageVault from './GCSStorageVault';

const doctorAvatarImage = new URL('../assets/images/telehealth_doctor_avatar_1792232373100.jpg', import.meta.url).href;

interface HospitalDoctorViewProps {
  token: string;
  user: any; // Hospital or Doctor details
  role: 'Hospital' | 'Doctor';
}

export default function HospitalDoctorView({ token, user, role }: HospitalDoctorViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [consentRequests, setConsentRequests] = useState<any[]>([]);
  
  // Consent submission state
  const [consentPurpose, setConsentPurpose] = useState('General checkup & clinical records decryption');
  const [consentDoctor, setConsentDoctor] = useState(role === 'Doctor' ? user.name : '');
  
  // Sub-tab for consented patient: 'timeline' | 'gcs_vault'
  const [activePatientSubTab, setActivePatientSubTab] = useState<'timeline' | 'gcs_vault'>('timeline');

  // New Medical Record form state
  const [recordType, setRecordType] = useState<RecordType>('Prescription');
  const [recordTitle, setRecordTitle] = useState('');
  const [recordDiagnoses, setRecordDiagnoses] = useState('');
  const [doctorUploadFile, setDoctorUploadFile] = useState<File | null>(null);
  const [recordNotes, setRecordNotes] = useState('');
  const [recordDoctor, setRecordDoctor] = useState(role === 'Doctor' ? user.name : '');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  
  // Medicine list builder temp state
  const [tempMedName, setTempMedName] = useState('');
  const [tempMedDosage, setTempMedDosage] = useState('');
  const [tempMedFreq, setTempMedFreq] = useState('Once daily');
  const [tempMedDur, setTempMedDur] = useState('7 days');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Auto-fill some demo search options
  const handleQuickFill = (id: string) => {
    setSearchQuery(id);
    executeSearch(id);
  };

  const executeSearch = async (queryVal: string) => {
    if (!queryVal) return;
    setLoading(true);
    setError('');
    setSelectedPatient(null);
    try {
      const res = await fetch(`/api/patients/search/query?q=${encodeURIComponent(queryVal)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search query failed.');
      setSearchResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = async (patient: any) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      // Fetch details which includes consent checking
      const res = await fetch(`/api/patients/${patient.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSelectedPatient(data);

      if (!data.needsConsent) {
        // Patient has granted consent! Load records
        const recordsRes = await fetch(`/api/patients/${patient.id}/records`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const recordsData = await recordsRes.json();
        setPatientRecords(recordsData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } else {
        // Fetch consent requests to see if there is a pending one
        const consentRes = await fetch(`/api/consent/requests?patientId=${patient.id}&hospitalId=${role === 'Doctor' ? user.hospitalId : user.id}`);
        const consentData = await consentRes.json();
        setConsentRequests(consentData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const requestConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const hospitalId = role === 'Doctor' ? user.hospitalId : user.id;

    try {
      const res = await fetch('/api/consent/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          hospitalId,
          purpose: consentPurpose,
          doctorName: consentDoctor || 'Attending Staff'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(data.message);
      // Reload consent request state
      handlePatientSelect(selectedPatient);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addMedicineRow = () => {
    if (!tempMedName) return;
    const newMed: Medicine = {
      name: tempMedName,
      dosage: tempMedDosage || 'N/A',
      frequency: tempMedFreq,
      duration: tempMedDur
    };
    setMedicines([...medicines, newMed]);
    setTempMedName('');
    setTempMedDosage('');
  };

  const removeMedicineRow = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleUploadRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setLoading(true);
    setError('');
    setMessage('');

    const hospId = role === 'Doctor' ? user.hospitalId : user.id;
    const hospName = role === 'Doctor' ? user.hospitalName : user.name;

    try {
      let fileData = '';
      let fileName = '';
      let fileType = '';

      if (doctorUploadFile) {
        fileName = doctorUploadFile.name;
        fileType = doctorUploadFile.type || 'application/octet-stream';
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(doctorUploadFile);
        fileData = await base64Promise;
      }

      const res = await fetch(`/api/patients/${selectedPatient.id}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: recordType,
          title: recordTitle || `${recordType} Report`,
          diagnoses: recordDiagnoses,
          notes: recordNotes,
          doctorName: recordDoctor || 'Staff Physician',
          medicines,
          hospitalId: hospId,
          hospitalName: hospName,
          isPersonalUpload: false,
          fileData: fileData || undefined,
          fileName: fileName || undefined,
          fileType: fileType || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Medical record and file successfully synchronized to Google Cloud Storage!");
      setRecordTitle('');
      setRecordDiagnoses('');
      setRecordNotes('');
      setMedicines([]);
      setDoctorUploadFile(null);
      
      // Reload timeline
      handlePatientSelect(selectedPatient);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group records by year for beautiful timeline
  const groupedRecords: Record<string, any[]> = {};
  patientRecords.forEach(rec => {
    const year = rec.date ? rec.date.split('-')[0] : 'Unknown';
    if (!groupedRecords[year]) groupedRecords[year] = [];
    groupedRecords[year].push(rec);
  });

  return (
    <div id="clinical-panel" className="flex-1 flex overflow-hidden h-full bg-[#F8FAFC]">
      
      {/* Left side: Search & Patient Selection Panel (Width 80) */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
        
        {/* Header Search Field */}
        <div className="p-4 border-b border-slate-100">
          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
            Decentralized Search Ledger
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter Medical ID, Mobile, or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeSearch(searchQuery)}
              className="w-full pl-9 pr-8 py-2 bg-slate-100 border-transparent rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            />
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
            {searchQuery && (
              <button 
                onClick={() => executeSearch(searchQuery)}
                className="absolute right-2 top-2.5 text-blue-600 hover:text-blue-800 text-[10px] font-bold"
              >
                GO
              </button>
            )}
          </div>

          <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sandbox Patients:</p>
            <button 
              onClick={() => handleQuickFill('MED-00000125')}
              className="w-full text-left py-1 px-1.5 hover:bg-white hover:shadow-sm rounded text-[11px] font-bold text-blue-800 flex justify-between"
            >
              <span>Jane Doe</span>
              <span className="font-mono text-[10px]">MED-00000125</span>
            </button>
          </div>
        </div>

        {/* Search results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            Identity Registry Results ({searchResults.length})
          </h3>

          {searchResults.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Enter query parameters to retrieve patient identities.</p>
          ) : (
            searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePatientSelect(p)}
                className={`w-full text-left p-3 rounded-2xl border transition-all ${
                  selectedPatient?.id === p.id
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-slate-800 leading-tight">{p.name}</span>
                  <span className="text-[9px] font-bold text-blue-600 font-mono">{p.id}</span>
                </div>
                <p className="text-[10px] text-slate-500">Phone: {p.phone}</p>
                <p className="text-[10px] text-slate-500">DOB: {p.dob} • Blood: {p.bloodGroup}</p>
              </button>
            ))
          )}
        </div>

        {/* Logged clinician card */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/80">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 font-mono">Verified Clinician</p>
          <div className="flex items-center gap-3">
            {role === 'Doctor' ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-300 shadow-xs shrink-0 bg-white">
                <img src={doctorAvatarImage} alt={user.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 text-sm font-bold shrink-0">
                🏥
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                {user.name}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">
                {role === 'Doctor' ? `${user.specialty} · ${user.hospitalName}` : user.location}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Detailed Workspace (Timeline / Consent Gate / Upload Record) */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
        
        {/* General Messages */}
        {error && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-xs text-red-700 font-medium flex justify-between items-center shrink-0">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 font-bold">X</button>
          </div>
        )}
        {message && (
          <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded-r-xl text-xs text-green-700 font-medium flex justify-between items-center shrink-0">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-green-500 font-bold">X</button>
          </div>
        )}

        {!selectedPatient ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
              <Search size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Patient Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Select or search for a patient in the left registry panel to access unified electronic health records and request secure consent.
            </p>
          </div>
        ) : selectedPatient.needsConsent ? (
          
          /* CONSENT CHECK GATE */
          <div className="max-w-2xl mx-auto w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6 my-auto">
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldAlert size={28} />
              </div>
              <h2 className="text-lg font-black text-slate-900">Access Restricted by Cryptographic Ledger</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Patient <span className="font-bold text-slate-800">{selectedPatient.name}</span>'s health records are securely locked. You must initiate a consent request to decrypt this profile.
              </p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
              <span className="text-amber-600 text-xs font-bold shrink-0">Security Note:</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Consistent with HIPAA and the ABHA framework, patient consent must be logged in a secure, non-repudiation ledger. The patient can revoke access at any time from their personal terminal.
              </p>
            </div>

            {/* Check pending request status */}
            {consentRequests.some(c => c.status === 'pending') ? (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-3">
                <p className="text-xs font-bold text-slate-700">Access Request Pending Approval</p>
                <p className="text-[11px] text-slate-500">
                  A verification request was triggered. Switch to the <strong>Patient Role</strong> to instantly approve.
                </p>
                <button
                  onClick={() => handlePatientSelect(selectedPatient)}
                  className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 mx-auto"
                >
                  <RefreshCw size={12} className="animate-spin" /> CHECK RE-APPROVAL STATUS
                </button>
              </div>
            ) : (
              <form onSubmit={requestConsent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Attending Clinician / Team
                    </label>
                    <input
                      type="text"
                      value={consentDoctor}
                      onChange={(e) => setConsentDoctor(e.target.value)}
                      placeholder="e.g. Dr. Sarah Connor"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Clinical Purpose
                    </label>
                    <input
                      type="text"
                      value={consentPurpose}
                      onChange={(e) => setConsentPurpose(e.target.value)}
                      placeholder="e.g. Regular clinical follow-up"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Send size={14} /> TRIGGER LEDGER CONSENT REQUEST
                </button>
              </form>
            )}
          </div>

        ) : (
          
          /* UNLOCKED ACTIVE CLINICAL WORKSPACE */
          <div className="space-y-6">
            
            {/* Active Patient Overview Header */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex justify-between items-start">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-extrabold text-lg">
                  {selectedPatient.avatar || selectedPatient.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-800 leading-tight">{selectedPatient.name}</h2>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[9px] font-bold">DECRYPTED & SYNCED</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    ID: <span className="font-mono font-bold text-blue-600">{selectedPatient.id}</span> • DOB: {selectedPatient.dob} • Blood: {selectedPatient.bloodGroup}
                  </p>
                </div>
              </div>
              
              <div className="text-right flex flex-col items-end gap-1">
                <span className="text-[10px] font-bold text-red-500 uppercase">Allergies Warning</span>
                <p className="text-xs font-bold text-slate-800 truncate max-w-[240px]">
                  {selectedPatient.allergies && selectedPatient.allergies.length > 0 
                    ? selectedPatient.allergies.join(', ') 
                    : 'None registered'}
                </p>
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Chronic Diseases</span>
                <p className="text-xs text-slate-600">
                  {selectedPatient.chronicDiseases && selectedPatient.chronicDiseases.length > 0 
                    ? selectedPatient.chronicDiseases.join(', ') 
                    : 'None recorded'}
                </p>
              </div>
            </div>

            {/* Sub-tab Navigation: Clinical Timeline vs GCS Storage Vault */}
            <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-150 shadow-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActivePatientSubTab('timeline')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activePatientSubTab === 'timeline'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText size={13} /> Clinical Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setActivePatientSubTab('gcs_vault')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activePatientSubTab === 'gcs_vault'
                      ? 'bg-[#006666] text-white shadow-xs'
                      : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                  }`}
                >
                  <Cloud size={13} /> Google Cloud Storage Vault
                </button>
              </div>

              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline px-2">
                GCS Partition: users/{selectedPatient.id}/*
              </span>
            </div>

            {activePatientSubTab === 'gcs_vault' ? (
              <GCSStorageVault
                userId={selectedPatient.id}
                userName={selectedPatient.name}
                userRole={role}
                token={token}
              />
            ) : (
              /* Split Grid: Upload records & Current Unified History */
              <div className="grid grid-cols-12 gap-6">
              
              {/* Write New Record Module (col-span-5) */}
              <div className="col-span-5 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">
                  Compile Digital Health Entry
                </h3>

                <form onSubmit={handleUploadRecord} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Document Type</label>
                      <select
                        value={recordType}
                        onChange={(e) => setRecordType(e.target.value as RecordType)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      >
                        {['Prescription', 'Blood Test', 'MRI', 'CT Scan', 'X-ray', 'ECG', 'Ultrasound', 'Vaccination', 'Discharge Summary', 'Doctor Notes'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Attending Clinician</label>
                      <input
                        type="text"
                        value={recordDoctor}
                        onChange={(e) => setRecordDoctor(e.target.value)}
                        placeholder="Dr. Sarah Connor"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Entry Title</label>
                    <input
                      type="text"
                      value={recordTitle}
                      onChange={(e) => setRecordTitle(e.target.value)}
                      placeholder="e.g. 12-Lead ECG Screening / Diabetes Review"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Primary Clinical Diagnosis</label>
                    <input
                      type="text"
                      value={recordDiagnoses}
                      onChange={(e) => setRecordDiagnoses(e.target.value)}
                      placeholder="e.g. Normal Cardiac Sinus Rhythm"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Clinician Observation Notes</label>
                    <textarea
                      value={recordNotes}
                      onChange={(e) => setRecordNotes(e.target.value)}
                      placeholder="Enter detailed laboratory results, surgical annotations or lifestyle directions..."
                      rows={3}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none"
                    />
                  </div>

                  {/* Dynamic Medicine Prescription Builder (Only shown for Prescription or Doctor Notes) */}
                  {(recordType === 'Prescription' || recordType === 'Doctor Notes' || recordType === 'Discharge Summary') && (
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                      <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Attach Active Prescription
                      </p>
                      
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          placeholder="Drug Name (e.g. Metformin)"
                          value={tempMedName}
                          onChange={(e) => setTempMedName(e.target.value)}
                          className="p-1.5 bg-white border border-slate-200 rounded-lg text-[10px]"
                        />
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 500mg)"
                          value={tempMedDosage}
                          onChange={(e) => setTempMedDosage(e.target.value)}
                          className="p-1.5 bg-white border border-slate-200 rounded-lg text-[10px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={tempMedFreq}
                          onChange={(e) => setTempMedFreq(e.target.value)}
                          className="p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600"
                        >
                          <option value="Once daily">Once daily</option>
                          <option value="Twice daily">Twice daily</option>
                          <option value="Three times daily">Three times daily</option>
                          <option value="Every 6 hours as needed">Every 6 hours</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Duration (e.g. 7 days)"
                          value={tempMedDur}
                          onChange={(e) => setTempMedDur(e.target.value)}
                          className="p-1.5 bg-white border border-slate-200 rounded-lg text-[10px]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={addMedicineRow}
                        className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[10px] transition-colors"
                      >
                        + ADD DRUG TO PRESCRIPTION
                      </button>

                      {/* Prescribed List */}
                      {medicines.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {medicines.map((m, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-1.5 rounded-lg border border-slate-100 text-[10px]">
                              <div>
                                <span className="font-bold text-slate-800">{m.name}</span> ({m.dosage}) - <span className="text-slate-500">{m.frequency}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeMedicineRow(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 flex justify-between">
                      <span>Attach File to Google Cloud Storage</span>
                      <span className="text-teal-700 font-mono lowercase text-[8px]">users/{selectedPatient.id}/files/</span>
                    </label>
                    <div className="relative border border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/70 rounded-xl p-2.5 text-center transition-all cursor-pointer">
                      <input
                        type="file"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setDoctorUploadFile(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.json"
                      />
                      <div className="flex items-center justify-center gap-1.5 text-[11px]">
                        <UploadCloud size={14} className="text-teal-600" />
                        {doctorUploadFile ? (
                          <span className="font-bold text-slate-800 truncate max-w-[160px]">
                            {doctorUploadFile.name}
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            Attach report/scan file to GCS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                  >
                    {loading ? 'Encrypting ledger...' : 'UPLOAD & SECURELY ENCRYPT'}
                  </button>
                </form>
              </div>

              {/* Patient Chronological Unified History (col-span-7) */}
              <div className="col-span-7 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-[520px]">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-4 shrink-0">
                  Unified Clinical Ledger Timeline
                </h3>

                {patientRecords.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center my-auto">
                    Patient has zero registered electronic medical records on file.
                  </p>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-1 space-y-6 relative">
                    <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-100"></div>
                    
                    {Object.keys(groupedRecords).sort((a,b) => b.localeCompare(a)).map(year => (
                      <div key={year} className="space-y-4">
                        {/* Year Node */}
                        <div className="relative flex items-center gap-3 z-10 shrink-0">
                          <span className="px-2.5 py-1 bg-slate-900 text-white rounded-full font-mono text-[10px] font-black tracking-wider">
                            {year}
                          </span>
                        </div>

                        {groupedRecords[year].map(rec => (
                          <div key={rec.id} className="relative flex gap-4 pl-4">
                            {/* Connected small dot */}
                            <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-blue-500 flex items-center justify-center shrink-0 z-10">
                              <FileText size={12} className="text-blue-600" />
                            </div>

                            <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                              <div className="flex justify-between items-start">
                                <h4 className="text-xs font-bold text-slate-800 leading-tight">
                                  {rec.title}
                                </h4>
                                <span className="text-[9px] font-black text-blue-500 font-mono uppercase bg-blue-50 px-1.5 py-0.5 rounded">
                                  {rec.type}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-500 font-semibold">
                                Hospital: {rec.hospitalName} • Attending: {rec.doctorName} • Date: {rec.date}
                              </p>

                              <p className="text-[11px] text-slate-700 leading-relaxed font-mono bg-white p-2 rounded-xl border border-slate-100">
                                <strong>Diagnosis:</strong> {rec.diagnoses}
                              </p>

                              {rec.medicines && rec.medicines.length > 0 && (
                                <div className="mt-1.5 space-y-1">
                                  <p className="text-[9px] font-extrabold text-slate-400 uppercase">Prescribed Therapy:</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {rec.medicines.map((m: any, mIdx: number) => (
                                      <span key={mIdx} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] text-slate-600 font-medium">
                                        💊 {m.name} ({m.dosage}) - {m.frequency} ({m.duration})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {rec.gcsUri && (
                                <div className="mt-2">
                                  <a
                                    href={rec.fileUrl || `/api/users/${selectedPatient.id}/storage/files/${rec.gcsFileId}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
                                    title={rec.gcsUri}
                                  >
                                    <Cloud size={12} className="text-teal-600" /> Stored in GCS Partition
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          </div>
        )}

      </div>

    </div>
  );
}
