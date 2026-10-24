import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  HardDrive,
  UploadCloud,
  FileText,
  FileImage,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  Database,
  Lock,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  FolderLock,
  Layers,
  FileCode,
  Calendar,
  User,
  ShieldCheck,
  Maximize2,
  X
} from 'lucide-react';
import { GCSStoredFile, GCSStorageStatus } from '../types';

interface GCSStorageVaultProps {
  userId: string;
  userName: string;
  userRole?: string;
  token?: string;
}

export default function GCSStorageVault({ userId, userName, userRole = 'Patient', token }: GCSStorageVaultProps) {
  const [files, setFiles] = useState<GCSStoredFile[]>([]);
  const [storageStatus, setStorageStatus] = useState<GCSStorageStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('Medical Report');
  const [uploadCustomName, setUploadCustomName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File preview modal
  const [previewFile, setPreviewFile] = useState<{
    metadata: GCSStoredFile;
    dataUrl: string;
    isImage: boolean;
    isPdf: boolean;
    isText: boolean;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // User database JSON modal
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbSnapshot, setDbSnapshot] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [copiedUri, setCopiedUri] = useState<string | null>(null);

  // Load files and storage status
  const fetchVaultData = async () => {
    setLoading(true);
    setError('');
    try {
      const [filesRes, statusRes] = await Promise.all([
        fetch(`/api/users/${userId}/storage/files`),
        fetch(`/api/users/${userId}/storage/status`)
      ]);

      if (!filesRes.ok || !statusRes.ok) {
        throw new Error('Failed to load Google Cloud Storage vault data');
      }

      const filesData = await filesRes.json();
      const statusData = await statusRes.json();

      setFiles(filesData);
      setStorageStatus(statusData);
    } catch (err: any) {
      setError(err.message || 'Error communicating with Google Cloud Storage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultData();
  }, [userId]);

  // Handle file selection from disk
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setUploadFile(selected);
      if (!uploadCustomName) {
        setUploadCustomName(selected.name);
      }
    }
  };

  // Upload to GCS
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a file to store in Google Cloud Storage.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(uploadFile);
      const base64Data = await base64Promise;

      const payload = {
        fileName: uploadCustomName.trim() || uploadFile.name,
        fileType: uploadFile.type || 'application/octet-stream',
        fileData: base64Data,
        category: uploadCategory,
        uploadedBy: userName
      };

      const res = await fetch(`/api/users/${userId}/storage/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setSuccessMsg(`File "${data.file.originalName}" secured in user's isolated Google Cloud Storage partition.`);
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadCustomName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh list
      fetchVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to upload to Google Cloud Storage');
    } finally {
      setUploading(false);
    }
  };

  // Preview file in modal
  const handlePreview = async (file: GCSStoredFile) => {
    setPreviewLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/users/${userId}/storage/files/${file.id}/preview`);
      if (!res.ok) throw new Error('Failed to load file preview');
      const data = await res.json();
      setPreviewFile(data);
    } catch (err: any) {
      setError(err.message || 'Cannot preview this file.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Delete file from GCS
  const handleDelete = async (file: GCSStoredFile) => {
    if (!confirm(`Are you sure you want to permanently delete "${file.originalName}" from your Google Cloud Storage vault?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}/storage/files/${file.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete file from Google Cloud Storage');
      setSuccessMsg(`File "${file.originalName}" removed from Google Cloud Storage.`);
      fetchVaultData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Sync user database snapshot to GCS
  const handleSyncDatabase = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/users/${userId}/storage/sync-db`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync database to GCS');
      setSuccessMsg(`User database snapshot successfully written to Google Cloud Storage: ${data.snapshot?.gcsUri || 'users/' + userId + '/database/user_db.json'}`);
      fetchVaultData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // View user database snapshot
  const handleViewDatabaseSnapshot = async () => {
    setDbLoading(true);
    setIsDbModalOpen(true);
    try {
      const res = await fetch(`/api/users/${userId}/storage/database`);
      if (!res.ok) throw new Error('Failed to read database snapshot');
      const data = await res.json();
      setDbSnapshot(data);
    } catch (err: any) {
      setDbSnapshot({ error: err.message });
    } finally {
      setDbLoading(false);
    }
  };

  // Helper for copying GCS URI
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUri(text);
    setTimeout(() => setCopiedUri(null), 2500);
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Categories
  const categories = ['All', 'Medical Report', 'Lab Report', 'Diagnostic Scan', 'Prescription', 'Discharge Summary', 'Other'];
  const filteredFiles = files.filter(f => {
    if (selectedCategory === 'All') return true;
    return f.category === selectedCategory;
  });

  const totalVaultBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  return (
    <div className="space-y-6" id="gcs-storage-vault">
      {/* Banner & GCS Architecture Card */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Cloud size={16} className="text-sky-400 shrink-0" />
              <span className="font-semibold text-slate-200">Google Cloud Storage</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-300">Multi-Tenant Vault</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-medium">AES-256 Encrypted</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Isolated Cloud Storage &amp; User Database
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Every patient and healthcare user possesses an isolated directory partition in Google Cloud Storage.
              Files and database dossiers are stored separately under dedicated prefixes with server-side encryption.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
              id="btn-gcs-upload-modal"
            >
              <UploadCloud size={16} /> Upload File
            </button>
            <button
              onClick={handleSyncDatabase}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-teal-200 border border-teal-500/30 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
              title="Sync current records, profile, and dossiers to GCS"
              id="btn-gcs-sync-db"
            >
              <Database size={15} /> Sync Dossier DB
            </button>
            <button
              onClick={handleViewDatabaseSnapshot}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              title="Inspect JSON database snapshot stored in GCS"
              id="btn-gcs-view-db-json"
            >
              <FileCode size={15} /> Inspect DB
            </button>
            <button
              onClick={fetchVaultData}
              disabled={loading}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Google Cloud Storage files"
              id="btn-gcs-refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Partition Details Bar */}
        <div className="mt-6 pt-5 border-t border-teal-900/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-teal-900/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <HardDrive size={12} className="text-teal-400" /> Storage Bucket
            </span>
            <p className="font-mono text-teal-200 font-bold truncate">
              {storageStatus?.bucket || 'medlink-health-records'}
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-teal-900/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <FolderLock size={12} className="text-emerald-400" /> Isolated User Partition
            </span>
            <p className="font-mono text-emerald-200 font-bold truncate" title={`users/${userId}/files/`}>
              users/{userId}/files/
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-teal-900/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <Layers size={12} className="text-amber-400" /> User Files Stored
            </span>
            <p className="font-bold text-white">
              {files.length} documents <span className="text-slate-400 font-normal">({formatSize(totalVaultBytes)})</span>
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-teal-900/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <Lock size={12} className="text-cyan-400" /> Storage Encryption
            </span>
            <p className="text-[11px] text-cyan-200 font-medium truncate">
              GCS Server-Side (AES-256)
            </p>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-2xl border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-500 font-bold hover:text-red-700">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-2xl border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 font-bold hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* Category Tabs & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-150 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#006666] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
              {cat === 'All' ? ` (${files.length})` : ` (${files.filter(f => f.category === cat).length})`}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-800">{filteredFiles.length}</strong> of {files.length} GCS objects
        </div>
      </div>

      {/* Files List / Grid */}
      {filteredFiles.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-150 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-teal-50 text-teal-700 rounded-3xl flex items-center justify-center mx-auto border border-teal-100">
            <Cloud size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800">No Documents in This Category</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your Google Cloud Storage partition is provisioned and ready. Upload laboratory files, scans, or prescriptions directly into your segregated workspace.
            </p>
          </div>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#006666] hover:bg-[#005252] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <UploadCloud size={16} /> Upload First File to GCS
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" id="gcs-files-grid">
          {filteredFiles.map((file) => {
            const isImage = file.contentType?.startsWith('image/') || file.fileName.endsWith('.svg') || file.fileName.endsWith('.png') || file.fileName.endsWith('.jpg');
            const isPdf = file.contentType?.includes('pdf') || file.fileName.endsWith('.pdf');
            const isJson = file.contentType?.includes('json') || file.fileName.endsWith('.json');

            return (
              <div
                key={file.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top Bar with Icon & Category */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-xl border ${
                        isImage ? 'bg-indigo-50 border-indigo-200 text-indigo-600' :
                        isPdf ? 'bg-rose-50 border-rose-200 text-rose-600' :
                        isJson ? 'bg-amber-50 border-amber-200 text-amber-600' :
                        'bg-teal-50 border-teal-200 text-teal-600'
                      }`}>
                        {isImage ? <FileImage size={20} /> :
                         isPdf ? <FileText size={20} /> :
                         isJson ? <FileCode size={20} /> :
                         <FileText size={20} />}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                          {file.category}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {formatSize(file.size)} • {file.contentType.split('/')[1]?.toUpperCase() || 'FILE'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(file)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete from Google Cloud Storage"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Title & GCS Path */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-teal-700 transition-colors" title={file.originalName}>
                      {file.originalName}
                    </h4>
                    
                    {/* GCS URI badge */}
                    <div className="mt-1.5 flex items-center justify-between gap-1 p-1.5 bg-slate-50 rounded-lg border border-slate-150 text-[10px] font-mono text-slate-600">
                      <span className="truncate" title={file.gcsUri}>{file.gcsUri}</span>
                      <button
                        onClick={() => copyToClipboard(file.gcsUri)}
                        className="text-slate-400 hover:text-teal-700 shrink-0 p-0.5 cursor-pointer"
                        title="Copy GCS URI"
                      >
                        {copiedUri === file.gcsUri ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <User size={11} className="text-slate-400" /> {file.uploadedBy || 'User'}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-slate-400">
                      <Calendar size={11} /> {new Date(file.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePreview(file)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Eye size={14} /> Preview
                  </button>
                  <a
                    href={`/api/users/${userId}/storage/files/${file.id}/download`}
                    download={file.originalName}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#006666] hover:bg-[#005252] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Download size={14} /> Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload File to GCS Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in duration-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 text-teal-700 rounded-2xl border border-teal-100">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Upload to Google Cloud Storage</h3>
                  <p className="text-xs text-slate-500">Secured in partition: users/{userId}/files/*</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/70 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.json"
                />
                <Cloud size={32} className="text-teal-600 mx-auto" />
                {uploadFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">{uploadFile.name}</p>
                    <p className="text-[10px] text-teal-700 font-semibold">{formatSize(uploadFile.size)} • Ready to upload</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-800">Click to choose or drop a file</p>
                    <p className="text-[10px] text-slate-500">PDF, JPG, PNG, DICOM, Lab CSV, or Prescriptions (up to 50MB)</p>
                  </div>
                )}
              </div>

              {/* Document Title / Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Name in GCS</label>
                <input
                  type="text"
                  value={uploadCustomName}
                  onChange={(e) => setUploadCustomName(e.target.value)}
                  placeholder="e.g. Annual_Cardiology_Summary_2024.pdf"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-teal-600"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-teal-600"
                >
                  <option value="Medical Report">Medical Report</option>
                  <option value="Lab Report">Lab Report</option>
                  <option value="Diagnostic Scan">Diagnostic Scan (MRI/CT/X-ray)</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Discharge Summary">Discharge Summary</option>
                  <option value="Other">Other Document</option>
                </select>
              </div>

              {/* Destination GCS Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-600 space-y-1">
                <span className="font-bold text-slate-500">GCS Target Object Path:</span>
                <p className="text-teal-700 font-semibold truncate">
                  gs://{storageStatus?.bucket || 'medlink-health-records'}/users/{userId}/files/[ID]_{uploadCustomName || 'filename'}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="flex-1 py-2.5 bg-[#006666] hover:bg-[#005252] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Uploading to GCS...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} /> Commit to GCS Vault
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl">
                  <Eye size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white truncate max-w-md">
                    {previewFile.metadata.originalName}
                  </h3>
                  <p className="text-[10px] text-teal-300/80 font-mono">
                    {previewFile.metadata.gcsUri}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/users/${userId}/storage/files/${previewFile.metadata.id}/download`}
                  download={previewFile.metadata.originalName}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} /> Download
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content Preview Frame */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-100 flex items-center justify-center min-h-[350px]">
              {previewFile.isImage ? (
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 max-w-full">
                  <img
                    src={previewFile.dataUrl}
                    alt={previewFile.metadata.originalName}
                    className="max-h-[70vh] object-contain rounded-xl mx-auto"
                  />
                </div>
              ) : previewFile.isPdf ? (
                <iframe
                  src={previewFile.dataUrl}
                  title="PDF Preview"
                  className="w-full h-[70vh] rounded-2xl border border-slate-300 bg-white"
                />
              ) : (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 w-full max-h-[70vh] overflow-auto">
                  <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap">
                    {atob(previewFile.dataUrl.split(',')[1] || '')}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span>Size: <strong className="text-slate-800">{formatSize(previewFile.metadata.size)}</strong></span>
              <span>Encryption: <strong className="text-teal-700">{previewFile.metadata.encryption || 'GCS Server-Side'}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Database Snapshot Modal */}
      {isDbModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-teal-950 text-white flex items-center justify-between border-b border-teal-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-400/30">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Google Cloud Storage User Database Snapshot</h3>
                  <p className="text-[11px] text-teal-300/80 font-mono">
                    gs://{storageStatus?.bucket || 'medlink-health-records'}/users/{userId}/database/user_db.json
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDbModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto bg-slate-950 font-mono text-xs text-emerald-400">
              {dbLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-teal-300">
                  <RefreshCw size={18} className="animate-spin" /> Reading user database partition from GCS...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(dbSnapshot, null, 2)}
                </pre>
              )}
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                Partition Status: <strong className="text-emerald-700">Synchronized &amp; Isolated</strong>
              </span>
              <button
                onClick={() => {
                  copyToClipboard(JSON.stringify(dbSnapshot, null, 2));
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Copy size={13} /> Copy JSON Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
