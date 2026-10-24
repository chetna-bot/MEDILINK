export type UserRole = 'Patient' | 'Hospital' | 'Doctor' | 'Admin';

export interface Patient {
  id: string; // e.g. MED-00000125
  name: string;
  phone: string;
  aadhaar?: string;
  passport?: string;
  dob: string;
  bloodGroup: string;
  allergies: string[];
  chronicDiseases: string[];
  emergencyContacts: EmergencyContact[];
  avatar?: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface Hospital {
  id: string;
  name: string;
  location: string;
  contact: string;
  licenseNo: string;
  approved: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  hospitalId: string;
  hospitalName: string;
  specialty: string;
  licenseNo: string;
  verified: boolean;
}

export type RecordType =
  | 'Prescription'
  | 'Blood Test'
  | 'MRI'
  | 'CT Scan'
  | 'X-ray'
  | 'ECG'
  | 'Ultrasound'
  | 'Vaccination'
  | 'Discharge Summary'
  | 'Doctor Notes';

export interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  hospitalId?: string;
  hospitalName: string;
  date: string;
  type: RecordType;
  title: string;
  diagnoses: string;
  notes: string;
  doctorName: string;
  medicines?: Medicine[];
  fileUrl?: string;
  aiSummary?: string;
  isPersonalUpload?: boolean;
}

export type ConsentStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface ConsentRequest {
  id: string;
  patientId: string;
  hospitalId: string;
  hospitalName: string;
  doctorName?: string;
  status: ConsentStatus;
  timestamp: string;
  purpose: string;
}

export interface AuditLog {
  id: string;
  patientId: string;
  actorName: string;
  actorRole: string;
  action: string;
  timestamp: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  hospitalName: string;
  date: string;
  time: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface MedicineReminder {
  id: string;
  patientId: string;
  medicineName: string;
  time: string;
  frequency: string;
  active: boolean;
}

export interface DashboardStats {
  patientsCount: number;
  hospitalsCount: number;
  recordsCount: number;
  activeUsersCount: number;
  pendingApprovalsCount: number;
}

export interface GCSStoredFile {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  contentType: string;
  size: number;
  gcsUri: string;
  bucket: string;
  path: string;
  uploadedAt: string;
  uploadedBy: string;
  category: string;
  recordId?: string;
  storageClass?: string;
  encryption?: string;
}

export interface GCSStorageStatus {
  connected: boolean;
  driver: string;
  bucket: string;
  projectId?: string;
  encryption: string;
  isolationPolicy: string;
  totalFiles: number;
  totalBytes: number;
  usersWithStorage: number;
}

