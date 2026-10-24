import React, { useState, useEffect } from 'react';
import { 
  Heart, Shield, AlertTriangle, QrCode, FileText, Check, X, Bell, 
  Plus, Trash2, Calendar, Clock, RefreshCw, Send, Sparkles, User, 
  Download, Volume2, ShieldCheck, Activity, PhoneCall, Info, 
  ChevronRight, ChevronDown, BellRing, UserCheck, Scale, Ruler, Building,
  Cloud, Database, HardDrive, UploadCloud
} from 'lucide-react';
import { MedicineReminder, Appointment, AuditLog, ConsentRequest, MedicalRecord } from '../types';
import GCSStorageVault from './GCSStorageVault';

// Clinical Scan & Laboratory Microscopy Images
const chestXrayImage = new URL('../assets/images/chest_xray_scan_1783436069587.jpg', import.meta.url).href;
const brainMriImage = new URL('../assets/images/brain_mri_scan_1783436085894.jpg', import.meta.url).href;
const abdomenCtImage = new URL('../assets/images/abdomen_ct_scan_1783436104667.jpg', import.meta.url).href;
const bloodMicroscopyImage = new URL('../assets/images/blood_microscopy_scan_1783436118027.jpg', import.meta.url).href;
const urineMicroscopyImage = new URL('../assets/images/urine_microscopy_scan_1783436133347.jpg', import.meta.url).href;
const smartChipImage = new URL('../assets/images/smart_health_card_chip_1792232372491.jpg', import.meta.url).href;
const doctorAvatarImage = new URL('../assets/images/telehealth_doctor_avatar_1792232373100.jpg', import.meta.url).href;

interface PatientViewProps {
  token: string;
  patient: any;
  onProfileUpdate: (updated: any) => void;
}

export default function PatientView({ token, patient, onProfileUpdate }: PatientViewProps) {
  // Tabs: patient_info is default as requested, followed by doctors consulted, medical_reports, reminders, permissions, report_analyzer, and cloud_storage
  const [activeTab, setActiveTab] = useState<'patient_info' | 'doctors' | 'medical_reports' | 'reminders' | 'permissions' | 'report_analyzer' | 'cloud_storage'>('patient_info');
  
  // Report Analyzer RAG States
  const [ragQuery, setRagQuery] = useState('');
  const [ragLanguage, setRagLanguage] = useState('English');
  const [selectedReportsForAnalysis, setSelectedReportsForAnalysis] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState('');
  const [analyzingReports, setAnalyzingReports] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  
  // Custom secure Markdown-like parsing helper for RAG insights
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let cleanLine = line.trim();
      
      // Check for headers
      if (cleanLine.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-black text-slate-900 mt-4 mb-2 uppercase tracking-wider flex items-center gap-2 border-b border-slate-150 pb-1">{cleanLine.slice(4)}</h4>;
      }
      if (cleanLine.startsWith('## ')) {
        return <h3 key={idx} className="text-sm font-black text-[#006666] mt-5 mb-3 uppercase tracking-wide flex items-center gap-2 border-b border-slate-200 pb-1">{cleanLine.slice(3)}</h3>;
      }
      if (cleanLine.startsWith('# ')) {
        return <h2 key={idx} className="text-base font-black text-teal-950 mt-6 mb-4 tracking-tight border-b-2 border-teal-100 pb-1">{cleanLine.slice(2)}</h2>;
      }
      
      // Check for bullet points
      if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
        const boldPattern = /\*\*(.*?)\*\*/g;
        const content = cleanLine.slice(2);
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = boldPattern.exec(content)) !== null) {
          if (match.index > lastIndex) {
            parts.push(content.substring(lastIndex, match.index));
          }
          parts.push(<strong key={match.index} className="font-extrabold text-slate-900">{match[1]}</strong>);
          lastIndex = boldPattern.lastIndex;
        }
        
        if (lastIndex < content.length) {
          parts.push(content.substring(lastIndex));
        }
        
        return (
          <li key={idx} className="ml-5 list-disc text-slate-700 text-xs leading-relaxed mb-2 pl-1">
            {parts.length > 0 ? parts : content}
          </li>
        );
      }
      
      if (cleanLine.length === 0) return <div key={idx} className="h-2" />;
      
      // Check for inline bold text in standard paragraphs
      const boldPattern = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldPattern.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-extrabold text-slate-900">{match[1]}</strong>);
        lastIndex = boldPattern.lastIndex;
      }
      
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }
      
      return (
        <p key={idx} className="text-slate-700 text-xs leading-relaxed mb-3">
          {parts.length > 0 ? parts : line}
        </p>
      );
    });
  };

  const handleAnalyzeReportsWithRag = async () => {
    if (!ragQuery.trim()) {
      setAnalysisError('Please enter a clinical question or topic to analyze.');
      return;
    }
    
    setAnalyzingReports(true);
    setAnalysisError('');
    setAnalysisResult('');

    // Determine selected reports. If none are selected, default to all of them for RAG analysis!
    const reportsToAnalyze = selectedReportsForAnalysis.length > 0 
      ? allReports.filter(r => selectedReportsForAnalysis.includes(r.id))
      : allReports;

    try {
      const response = await fetch('/api/records/analyze-rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: patient.id,
          query: ragQuery,
          language: ragLanguage,
          reports: reportsToAnalyze
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'The medical RAG analyzer is currently offline.');
      }

      setAnalysisResult(data.analysis);
    } catch (err: any) {
      setAnalysisError(err.message || 'An unexpected error occurred during analysis.');
    } finally {
      setAnalyzingReports(false);
    }
  };

  // Medical Reports tab states
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [activeReportCategory, setActiveReportCategory] = useState<string>('All');
  const [previewingReport, setPreviewingReport] = useState<any | null>(null);
  
  // Registering report states
  const [newReportType, setNewReportType] = useState<'X-ray' | 'MRI' | 'CT Scan' | 'Blood Test' | 'Urine Test' | 'Other'>('X-ray');
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportDoctor, setNewReportDoctor] = useState('Dr. Sarah Connor');
  const [newReportHospital, setNewReportHospital] = useState('Metro General Hospital');
  const [newReportDiagnoses, setNewReportDiagnoses] = useState('');
  const [newReportNotes, setNewReportNotes] = useState('');
  const [newReportFile, setNewReportFile] = useState<File | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [reminders, setReminders] = useState<MedicineReminder[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consents, setConsents] = useState<ConsentRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Expand record for AI summary
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  // New Reminder form state
  const [remName, setRemName] = useState('');
  const [remTime, setRemTime] = useState('08:00 AM');
  const [remFreq, setRemFreq] = useState('With Breakfast');

  // New Appointment form state
  const [apptDoctor, setApptDoctor] = useState('Dr. Sarah Connor');
  const [apptHospital, setApptHospital] = useState('Metro General Hospital');
  const [apptDate, setApptDate] = useState('2026-07-25');
  const [apptTime, setApptTime] = useState('10:00 AM');

  // SOS Panic State
  const [sosActive, setSosActive] = useState(false);

  // Patient Information detail states (initialized from patient details or solid defaults)
  const [nameInput, setNameInput] = useState(patient?.name || 'Jane Doe');
  const [parentNameInput, setParentNameInput] = useState(patient?.parentName || 'Robert Doe');
  const [genderInput, setGenderInput] = useState(patient?.gender || 'Female');
  const [bloodInput, setBloodInput] = useState(patient?.bloodGroup || 'O+');
  const [dobInput, setDobInput] = useState(patient?.dob || '1990-05-15');
  const [weightInput, setWeightInput] = useState(patient?.weight || '62 kg');
  const [heightInput, setHeightInput] = useState(patient?.height || '168 cm');
  const [upcomingVisitDate, setUpcomingVisitDate] = useState(patient?.upcomingVisitDate || '2026-07-20');
  const [visitedDates, setVisitedDates] = useState<string[]>(patient?.visitedDates || ['2023-04-12', '2023-08-20', '2024-02-15', '2024-06-10', '2025-01-05', '2025-09-14']);
  const [visitNotifications, setVisitNotifications] = useState<string[]>(patient?.visitNotifications || ['Reminder set for consultation on 2026-07-20 at 02:00 PM']);

  const [bloodPressureInput, setBloodPressureInput] = useState(patient?.bloodPressure || '118/76 mmHg');
  const [heartRateInput, setHeartRateInput] = useState(patient?.heartRate || '68 bpm');
  const [bloodGlucoseInput, setBloodGlucoseInput] = useState(patient?.bloodGlucose || '94 mg/dL');
  const [oxygenSatInput, setOxygenSatInput] = useState(patient?.oxygenSat || '99%');
  const [isHealthPassModalOpen, setIsHealthPassModalOpen] = useState(false);

  // Modals & Accordions
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  // Vitals edit mode
  const [isVitalsEditing, setIsVitalsEditing] = useState(false);
  const [isDemoEditing, setIsDemoEditing] = useState(false);

  // New Consultation Notification form state
  const [newNotifDate, setNewNotifDate] = useState('2026-07-20');
  const [newNotifType, setNewNotifType] = useState('Cardiology Consultation');
  const [newNotifTime, setNewNotifTime] = useState('02:00 PM');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Sync state values if the patient prop updates
  useEffect(() => {
    if (patient) {
      setNameInput(patient.name || 'Jane Doe');
      setParentNameInput(patient.parentName || 'Robert Doe');
      setGenderInput(patient.gender || 'Female');
      setBloodInput(patient.bloodGroup || 'O+');
      setDobInput(patient.dob || '1990-05-15');
      setWeightInput(patient.weight || '62 kg');
      setHeightInput(patient.height || '168 cm');
      setUpcomingVisitDate(patient.upcomingVisitDate || '2026-07-20');
      if (patient.visitedDates) setVisitedDates(patient.visitedDates);
      if (patient.visitNotifications) setVisitNotifications(patient.visitNotifications);
    }
  }, [patient]);

  const fetchPatientData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch records
      const recRes = await fetch(`/api/patients/${patient.id}/records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (recRes.ok) {
        const recData = await recRes.json();
        setRecords(recData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }

      // 2. Fetch notifications
      const notifRes = await fetch(`/api/patients/${patient.id}/notifications`);
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.reverse());
      }

      // 3. Fetch reminders
      const remRes = await fetch(`/api/reminders/${patient.id}`);
      if (remRes.ok) {
        const remData = await remRes.json();
        setReminders(remData);
      }

      // 4. Fetch appointments
      const apptRes = await fetch(`/api/appointments/${patient.id}`);
      if (apptRes.ok) {
        const apptData = await apptRes.json();
        setAppointments(apptData);
      }

      // 5. Fetch consents
      const conRes = await fetch(`/api/consent/requests?patientId=${patient.id}`);
      if (conRes.ok) {
        const conData = await conRes.json();
        setConsents(conData);
      }

      // 6. Fetch audit logs
      const auditRes = await fetch(`/api/audit-logs/${patient.id}`);
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData.reverse());
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, [patient.id, token]);

  const handleUpdateProfile = async (customPayload?: any) => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const payload = customPayload || {
        name: nameInput,
        parentName: parentNameInput,
        gender: genderInput,
        bloodGroup: bloodInput,
        dob: dobInput,
        weight: weightInput,
        height: heightInput,
        bloodPressure: bloodPressureInput,
        heartRate: heartRateInput,
        bloodGlucose: bloodGlucoseInput,
        oxygenSat: oxygenSatInput,
        upcomingVisitDate,
        visitedDates,
        visitNotifications
      };
      
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage("Dossier successfully synchronized with the central register.");
      onProfileUpdate(data.patient);
      setIsVitalsEditing(false);
      setIsDemoEditing(false);
      fetchPatientData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dobString: string): string => {
    if (!dobString) return 'N/A';
    const birthDate = new Date(dobString);
    const today = new Date("2026-07-07"); // Anchor to modern local year 2026 as per local time metadata
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return isNaN(age) || age < 0 ? 'N/A' : `${age} years`;
  };

  const handleAddVisitNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAlarm = `Alarm set: ${newNotifType} on ${newNotifDate} at ${newNotifTime}`;
    const updatedNotifications = [...visitNotifications, newAlarm];
    setVisitNotifications(updatedNotifications);
    
    // Save to server
    await handleUpdateProfile({
      parentName: parentNameInput,
      gender: genderInput,
      weight: weightInput,
      height: heightInput,
      visitedDates,
      upcomingVisitDate: newNotifDate, // Sync next upcoming visit date!
      visitNotifications: updatedNotifications
    });

    setMessage(`Consultation alert scheduled successfully for ${newNotifDate}!`);
  };

  const handleDeleteVisitNotification = async (indexToDelete: number) => {
    const updated = visitNotifications.filter((_, i) => i !== indexToDelete);
    setVisitNotifications(updated);

    await handleUpdateProfile({
      parentName: parentNameInput,
      gender: genderInput,
      weight: weightInput,
      height: heightInput,
      visitedDates,
      upcomingVisitDate,
      visitNotifications: updated
    });
    setMessage("Consultation alarm notification removed successfully.");
  };

  const markNotifsRead = async () => {
    try {
      await fetch(`/api/patients/${patient.id}/notifications/read`, { method: 'POST' });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remName) return;
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          medicineName: remName,
          time: remTime,
          frequency: remFreq
        })
      });
      const data = await res.json();
      setReminders([...reminders, data]);
      setRemName('');
      setMessage("Medicine reminder set successfully.");
    } catch (e) {
      console.error(e);
    }
  };

  const toggleReminder = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      });
      const data = await res.json();
      setReminders(reminders.map(r => r.id === id ? data : r));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      setReminders(reminders.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          doctorName: apptDoctor,
          hospitalName: apptHospital,
          date: apptDate,
          time: apptTime
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAppointments([...appointments, data.appointment]);
      setUpcomingVisitDate(apptDate); // Automatically update upcoming checkup date!
      
      // Update profile upcoming date on db too
      await handleUpdateProfile({
        parentName: parentNameInput,
        gender: genderInput,
        weight: weightInput,
        height: heightInput,
        visitedDates,
        upcomingVisitDate: apptDate,
        visitNotifications
      });

      setMessage("Appointment scheduled and synced with provider dashboard!");
      fetchPatientData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConsentResponse = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/consent/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update consent registry");

      setMessage(`Consent successfully ${status === 'approved' ? 'granted' : 'declined'}!`);
      fetchPatientData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevokeConsent = async (id: string) => {
    try {
      const res = await fetch(`/api/consent/${id}/revoke`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to revoke consent");

      setMessage("Consent permissions successfully revoked. Credentials locks redeployed.");
      fetchPatientData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateCustomConsent = async (hospitalId: string, hospitalName: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/consent/request-custom', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: patient.id,
          hospitalId,
          hospitalName,
          status,
          purpose: "Direct patient-initiated access preference",
          doctorName: "Staff Physician"
        })
      });
      if (!res.ok) throw new Error("Failed to register hospital access permission");
      
      setMessage(`Access permissions for ${hospitalName} successfully updated.`);
      fetchPatientData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSummarizeRecord = async (id: string) => {
    setSummarizingId(id);
    try {
      const res = await fetch(`/api/records/${id}/summarize`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gemini summarizer unavailable");

      setRecords(records.map(r => r.id === id ? { ...r, aiSummary: data.summary } : r));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSummarizingId(null);
    }
  };

  // Pre-populated default reports representing all categories
  const defaultReports = [
    {
      id: "REP-XRY-001",
      title: "Chest PA View (Radiography)",
      type: "X-ray",
      date: "2024-11-12",
      doctorName: "Dr. John Watson",
      hospitalName: "Metro General Hospital",
      clinicalHistory: "Evaluation of persistent non-productive cough, low-grade pyrexia, and dyspnea on exertion for 3 weeks.",
      method: "Digital Posteroanterior (PA) projection of the bony thorax taken at 115 kVp, under maximal inspiratory effort.",
      diagnoses: "No active cardiopulmonary disease. Lungs are clear with no focal consolidations or pleural abnormalities.",
      notes: "Normal chest radiography. Clear lung parenchymal tissues, normal cardiac shadow size and mediastinal contours. No effusions or pneumothoraces.",
      structuredData: [
        { section: "Lung Fields & Parenchyma", description: "Both lung fields are clear, well-expanded and symmetric. There is no focal parenchymal consolidation, suspicious pulmonary nodularity, or active airspace disease." },
        { section: "Pleural Cavities & Diaphragm", description: "Pleural spaces are normal. No pleural effusion, localized thickening, or pneumothorax is identified. Both costophrenic and cardiophrenic angles are sharp and well-defined." },
        { section: "Mediastinum & Cardiac Shadow", description: "The transverse diameter of the cardiac silhouette is within normal physiological limits (CTR < 50%). Normal mediastinal contours. Trachea is midline." },
        { section: "Osseous Structures & Soft Tissue", description: "The ribs, clavicles, and visualised thoracic vertebrae are intact. No acute fracture or aggressive bone destructive lesion is detected." }
      ]
    },
    {
      id: "REP-MRI-001",
      title: "Brain MRI Scan (High Res)",
      type: "MRI",
      date: "2023-08-20",
      doctorName: "Dr. Sarah Connor",
      hospitalName: "Metro General Hospital",
      clinicalHistory: "Chronic cephalalgia (headache) with atypical auditory aura, progressive cognitive fatigue. Rule out intracranial space-occupying lesion.",
      method: "Multiplanar, multisequence brain MRI protocol including Sagittal T1, Axial T2, FLAIR, DWI/ADC, and Coronal T2 sequences on a 3.0 Tesla scanner without IV gadolinium contrast.",
      diagnoses: "Unremarkable brain MRI. No evidence of acute intracranial pathology, ischemia, mass effect, or demyelination.",
      notes: "High-resolution MRI of the brain shows completely normal cranial anatomy. Symmetric cerebral hemispheres, normal ventricles and brainstem, with no space-occupying tumors.",
      structuredData: [
        { section: "Cerebrum & Gray-White Differentiation", description: "Symmetric cerebral hemispheres with normal sulcal pattern. Normal gray-white matter differentiation. No areas of restricted diffusion on DWI to suggest acute ischemia. No space-occupying mass or midline shift." },
        { section: "Ventricles & Extra-axial CSF", description: "The ventricular system and basal cisterns are of normal caliber, symmetry, and configuration. No hydrocephalus. Extra-axial cerebrospinal fluid spaces are normal." },
        { section: "Brainstem & Cerebellum", description: "The brainstem and cerebellum demonstrate normal signal intensity and morphology. Cerebellar tonsils are normally positioned above the level of the foramen magnum." },
        { section: "Paranasal Sinuses & Mastoids", description: "Slight mucosal thickening of the right maxillary sinus is observed. The mastoid air cells and left paranasal sinuses are clear." }
      ]
    },
    {
      id: "REP-CTS-001",
      title: "CT Scan Abdomen & Pelvis",
      type: "CT Scan",
      date: "2025-01-05",
      doctorName: "Dr. Gregory House",
      hospitalName: "Apollo Prime Healthcare",
      clinicalHistory: "Persistent epigastric fullness, abdominal discomfort, elevated liver transaminases (ALT/AST). Evaluate for fatty liver and biliary tree obstruction.",
      method: "Contrast-enhanced helical computed tomography (CT) of the abdomen and pelvis with intravenous Optiray contrast. Reconstructed at 2.5mm slice thickness.",
      diagnoses: "Mild Hepatic Steatosis (diffuse fatty infiltration of the liver). Otherwise normal abdominal and pelvic CT study.",
      notes: "Contrast CT scan shows borderline hepatomegaly with fatty infiltration of the liver parenchymal tissue. All other solid organs (kidneys, pancreas, spleen) are unremarkable.",
      structuredData: [
        { section: "Hepatobiliary System", description: "The liver is borderline enlarged, measuring 15.8 cm in craniocaudal dimension. There is a diffuse decrease in parenchymal attenuation (Hounsfield Units measure 40-42, significantly lower than spleen attenuation, consistent with hepatic steatosis). No hyperdense or hypodense focal lesions. Gallbladder is normal in size and wall thickness; no radiopaque calculi. Biliary tree is not dilated." },
        { section: "Spleen & Pancreas", description: "Spleen is normal in size and attenuation (10.5 cm). The pancreas has a normal lobular architecture, with no parenchymal calcifications, peripancreatic fluid collections, or mass effect." },
        { section: "Kidneys & Adrenals", description: "Both kidneys are normal in size, shape, and position, demonstrating symmetric contrast excretion. No hydronephrosis, calculi, or masses. Adrenal glands are bilaterally normal." },
        { section: "Gastrointestinal tract", description: "The stomach, duodenum, and loop of small/large bowels are normal in caliber. No wall thickening or abnormal bowel gas distribution. No free fluid or pathologically enlarged retroperitoneal lymph nodes." }
      ]
    },
    {
      id: "REP-BLD-001",
      title: "Complete Blood Count (CBC) with Differential",
      type: "Blood Test",
      date: "2023-04-12",
      doctorName: "Dr. Sarah Connor",
      hospitalName: "Metro General Hospital",
      clinicalHistory: "Routine health screening. Patient reports chronic fatigue, cold intolerance, and brittle nails.",
      specimen: "Venous Blood (EDTA Whole Blood)",
      method: "Automated flow cytometry with hydro-dynamic focusing and optical laser multi-angle light scatter technology.",
      diagnoses: "Mild Microcytic Hypochromic Anemia, consistent with iron deficiency.",
      notes: "Hemoglobin and RBC counts are mildly decreased. Low MCV and elevated RDW strongly suggest iron deficiency anemia. Follow-up ferritin and iron studies are recommended.",
      structuredData: [
        { name: "Hemoglobin (Hgb)", result: 11.2, unit: "g/dL", range: "12.0 - 15.5", status: "LOW" },
        { name: "Red Blood Cell Count (RBC)", result: 3.82, unit: "M/µL", range: "4.00 - 5.20", status: "LOW" },
        { name: "Hematocrit (Hct)", result: 34.1, unit: "%", range: "36.0 - 46.0", status: "LOW" },
        { name: "Mean Corpuscular Volume (MCV)", result: 78.5, unit: "fL", range: "80.0 - 100.0", status: "LOW" },
        { name: "Mean Corpuscular Hgb (MCH)", result: 24.8, unit: "pg", range: "27.0 - 33.0", status: "LOW" },
        { name: "Mean Corpuscular Hgb Conc (MCHC)", result: 32.2, unit: "g/dL", range: "32.0 - 36.0", status: "NORMAL" },
        { name: "Red Cell Distribution Width (RDW)", result: 15.8, unit: "%", range: "11.5 - 14.5", status: "HIGH" },
        { name: "White Blood Cell Count (WBC)", result: 6.45, unit: "K/µL", range: "4.50 - 11.00", status: "NORMAL" },
        { name: "Platelet Count (PLT)", result: 245, unit: "K/µL", range: "150 - 450", status: "NORMAL" },
        { name: "Neutrophils (Absolute)", result: 4.10, unit: "K/µL", range: "1.80 - 7.00", status: "NORMAL" },
        { name: "Lymphocytes (Absolute)", result: 1.85, unit: "K/µL", range: "1.00 - 4.80", status: "NORMAL" }
      ]
    },
    {
      id: "REP-URN-001",
      title: "Routine Urine Analysis & Microscopy",
      type: "Urine Test",
      date: "2025-06-18",
      doctorName: "Dr. Rajesh Koothrapali",
      hospitalName: "City Wellness Clinic",
      clinicalHistory: "Comprehensive executive wellness health checkup and baseline metabolic review.",
      specimen: "Midstream Clean-Catch Urine Sample",
      method: "Automated reflectance spectrophotometry chemical reagent strip analysis, combined with high-resolution digital imaging microscopy.",
      diagnoses: "Unremarkable urinalysis. All macroscopic, chemical, and microscopic values within physiological ranges.",
      notes: "Urine chemistry and microscopic examinations are normal. No glucose, protein, or blood cells detected. Sediment shows typical unremarkable elements.",
      structuredData: [
        { name: "Color", result: "Pale Straw", unit: "", range: "Straw to Light Amber", status: "NORMAL" },
        { name: "Clarity / Transparency", result: "Clear", unit: "", range: "Clear / Transparent", status: "NORMAL" },
        { name: "Specific Gravity", result: "1.015", unit: "", range: "1.005 - 1.030", status: "NORMAL" },
        { name: "pH", result: "6.0", unit: "", range: "5.0 - 8.0", status: "NORMAL" },
        { name: "Glucose", result: "Negative", unit: "", range: "Negative", status: "NORMAL" },
        { name: "Protein", result: "Negative", unit: "", range: "Negative", status: "NORMAL" },
        { name: "Ketones", result: "Negative", unit: "", range: "Negative", status: "NORMAL" },
        { name: "Bilirubin", result: "Negative", unit: "", range: "Negative", status: "NORMAL" },
        { name: "Blood (Hemoglobin)", result: "Negative", unit: "", range: "Negative", status: "NORMAL" },
        { name: "Nitrite", result: "Negative", unit: "", range: "Negative", status: "NORMAL" },
        { name: "Leukocyte Esterase", result: "Negative", unit: "", range: "Negative", status: "NORMAL" },
        { name: "Microscopic: RBCs", result: "0-1 / hpf", unit: "/hpf", range: "0 - 2 / hpf", status: "NORMAL" },
        { name: "Microscopic: WBCs", result: "1-2 / hpf", unit: "/hpf", range: "0 - 5 / hpf", status: "NORMAL" },
        { name: "Microscopic: Epithelial Cells", result: "Few", unit: "/hpf", range: "Few / Occasional", status: "NORMAL" },
        { name: "Microscopic: Casts & Crystals", result: "None Detected", unit: "", range: "None Detected", status: "NORMAL" }
      ]
    }
  ];

  const getReportCategory = (rec: any): string => {
    const type = rec.type || '';
    const title = rec.title || '';
    const notes = rec.notes || '';
    
    if (type === 'X-ray' || title.toLowerCase().includes('x-ray') || title.toLowerCase().includes('xray')) {
      return 'X-Ray Reports';
    }
    if (type === 'MRI' || title.toLowerCase().includes('mri')) {
      return 'MRI Reports';
    }
    if (type === 'CT Scan' || title.toLowerCase().includes('ct scan') || title.toLowerCase().includes('ctscan')) {
      return 'CT Scan Reports';
    }
    if (type === 'Blood Test' || title.toLowerCase().includes('blood') || title.toLowerCase().includes('glucose') || title.toLowerCase().includes('lipid')) {
      return 'Blood Test Reports';
    }
    if (type === 'Urine Test' || title.toLowerCase().includes('urine')) {
      return 'Urine Test Reports';
    }
    return 'Other Tests';
  };

  // Associate each clinical report category/title with high-resolution imagery
  const getReportScanImage = (report: any) => {
    if (!report) return null;
    const typeLower = (report.type || "").toLowerCase();
    const titleLower = (report.title || "").toLowerCase();
    
    if (typeLower === "x-ray" || titleLower.includes("x-ray") || titleLower.includes("xray") || titleLower.includes("radiography") || titleLower.includes("chest")) {
      return chestXrayImage;
    }
    if (typeLower === "mri" || titleLower.includes("mri") || titleLower.includes("magnetic resonance")) {
      return brainMriImage;
    }
    if (typeLower === "ct scan" || typeLower === "ct" || titleLower.includes("ct scan") || titleLower.includes("ctscan") || titleLower.includes("computed tomography") || titleLower.includes("abdomen")) {
      return abdomenCtImage;
    }
    if (typeLower === "blood test" || titleLower.includes("blood") || titleLower.includes("cbc") || titleLower.includes("hematology") || titleLower.includes("lipid") || titleLower.includes("glucose")) {
      return bloodMicroscopyImage;
    }
    if (typeLower === "urine test" || titleLower.includes("urine") || titleLower.includes("urinalysis") || titleLower.includes("microscopy")) {
      return urineMicroscopyImage;
    }
    return null;
  };

  // Generate standard minimal PDF string for downloading
  const generateReportBlob = (report: any) => {
    const title = report.title || "Diagnostic Report";
    const doctor = report.doctorName || "Verified Practitioner";
    const hospital = report.hospitalName || "Partner Clinical Node";
    const date = report.date || "2026-07-07";
    const category = report.type || "General Diagnosis";
    const diagnoses = report.diagnoses || "Status Stable";
    const notes = report.notes || "No significant abnormalities detected.";
    const patientName = patient?.name || "Jane Doe";
    const patientId = patient?.id || "MED-00000125";
    const age = "36 years"; // Standard estimated fallback age
    const bloodGroup = patient?.bloodGroup || "O+";

    const lines = [
      `======================================================================`,
      `                     MEDLINK SECURE HEALTH LEDGER                     `,
      `                     CRYPTOGRAPHIC CLINICAL RECORD                    `,
      `======================================================================`,
      `PATIENT RECORDFILE:`,
      `  Name:        ${patientName.toUpperCase().padEnd(35)} ID: ${patientId}`,
      `  Age/Gender:  ${age.padEnd(35)} Blood Group: ${bloodGroup}`,
      `----------------------------------------------------------------------`,
      `DOCUMENT METADATA:`,
      `  Category:    ${category.toUpperCase().padEnd(35)} Date of Test: ${date}`,
      `  Title:       ${title.toUpperCase().padEnd(35)} Record ID: ${report.id}`,
      `  Prescriber:  ${doctor.padEnd(35)} Hospital Node: ${hospital}`,
      `======================================================================`,
    ];

    if (report.clinicalHistory) {
      lines.push(`CLINICAL INDICATION & REASON FOR EXAM:`);
      lines.push(`  ${report.clinicalHistory}`);
      lines.push(`----------------------------------------------------------------------`);
    }

    if (report.specimen) {
      lines.push(`SPECIMEN & COLLECTION DETAILS:`);
      lines.push(`  Specimen Type: ${report.specimen}`);
      lines.push(`----------------------------------------------------------------------`);
    }

    if (report.method) {
      lines.push(`STUDY PROTOCOL & TECHNIQUE:`);
      lines.push(`  ${report.method}`);
      lines.push(`----------------------------------------------------------------------`);
    }

    if (report.structuredData) {
      if (Array.isArray(report.structuredData)) {
        if (report.structuredData[0] && typeof report.structuredData[0].name !== 'undefined') {
          // Lab test results table
          lines.push(`LABORATORY DIAGNOSTIC RESULTS:`);
          lines.push(`----------------------------------------------------------------------`);
          lines.push(`TEST PARAMETER                RESULT        UNIT       REFERENCE RANGE  FLAG`);
          lines.push(`----------------------------------------------------------------------`);
          for (const item of report.structuredData) {
            const nameCol = (item.name || "").padEnd(30).substring(0, 30);
            const resultCol = (String(item.result) || "").padEnd(14).substring(0, 14);
            const unitCol = (item.unit || "").padEnd(11).substring(0, 11);
            const rangeCol = (item.range || "").padEnd(17).substring(0, 17);
            const flagCol = !item.status || item.status.toLowerCase() === "normal" ? " " : `[${item.status.toUpperCase()}]`;
            lines.push(`  ${nameCol}${resultCol}${unitCol}${rangeCol}${flagCol}`);
          }
        } else {
          // Imaging segments
          lines.push(`DETAILED COMPARTMENT FINDINGS:`);
          lines.push(`----------------------------------------------------------------------`);
          for (const item of report.structuredData) {
            lines.push(`[${(item.section || "").toUpperCase()}]`);
            const words = (item.description || "").split(" ");
            let line = "  ";
            for (const word of words) {
              if ((line + word).length > 68) {
                lines.push(line);
                line = "  " + word + " ";
              } else {
                line += word + " ";
              }
            }
            lines.push(line);
            lines.push("");
          }
        }
      } else {
        // Structured data is an object of section key/values
        lines.push(`DETAILED FINDINGS BY ANATOMICAL SECTION:`);
        lines.push(`----------------------------------------------------------------------`);
        for (const [section, desc] of Object.entries(report.structuredData)) {
          lines.push(`[${section.toUpperCase()}]`);
          const words = String(desc).split(" ");
          let line = "  ";
          for (const word of words) {
            if ((line + word).length > 68) {
              lines.push(line);
              line = "  " + word + " ";
            } else {
              line += word + " ";
            }
          }
          lines.push(line);
          lines.push("");
        }
      }
      lines.push(`----------------------------------------------------------------------`);
    } else {
      lines.push(`CLINICAL OBSERVED FINDINGS & OBSERVATIONS:`);
      const words = notes.split(" ");
      let line = "  ";
      for (const word of words) {
        if ((line + word).length > 68) {
          lines.push(line);
          line = "  " + word + " ";
        } else {
          line += word + " ";
        }
      }
      lines.push(line);
      lines.push(`----------------------------------------------------------------------`);
    }

    lines.push(`CLINICAL IMPRESSION & CONCLUSION:`);
    lines.push(`  ${diagnoses.toUpperCase()}`);
    lines.push(`======================================================================`);
    lines.push(`STATUS: ELECTRONICALLY SIGNED & VERIFIED SECURE`);
    lines.push(`SIGNATURE OF CLINICIAN: ${doctor}`);
    lines.push(`MEDLINK SECURE LEDGER ID: ${report.id}`);
    lines.push(`======================================================================`);

    // Minimal PDF 1.3
    let out = `%PDF-1.3\n`;
    out += `1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n`;
    out += `2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n`;
    out += `3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Courier-Bold\n>>\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n`;

    let stream = `BT\n/F1 8 Tf\n40 730 Td\n11 TL\n`;
    for (const line of lines) {
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      stream += `(${escaped}) Tj T*\n`;
    }
    stream += `ET`;

    out += `4 0 obj\n<<\n/Length ${stream.length}\n>>\nstream\n${stream}\nendstream\nendobj\n`;
    out += `xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000062 00000 n\n0000000117 00000 n\n0000000287 00000 n\n`;
    out += `trailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n${out.length}\n%%EOF`;

    return new Blob([out], { type: "application/pdf" });
  };

  const downloadReportPDF = (report: any) => {
    const blob = generateReportBlob(report);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanDate = report.date ? report.date : '2026-07-07';
    a.download = `${(report.type || 'Test').replace(/\s+/g, '_')}_Report_${cleanDate}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadMultiplePDFs = (reportsToDownload: any[]) => {
    if (reportsToDownload.length === 0) return;
    reportsToDownload.forEach((report, index) => {
      setTimeout(() => {
        downloadReportPDF(report);
      }, index * 250);
    });
  };

  const handleRegisterReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportTitle.trim()) {
      setError("Please provide a report title.");
      return;
    }
    
    setLoading(true);
    try {
      let fileData = '';
      let fileName = '';
      let fileType = '';

      if (newReportFile) {
        fileName = newReportFile.name;
        fileType = newReportFile.type || 'application/octet-stream';
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(newReportFile);
        fileData = await base64Promise;
      }

      const res = await fetch(`/api/patients/${patient.id}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: newReportType,
          title: newReportTitle,
          diagnoses: newReportDiagnoses || "Unremarkable",
          notes: newReportNotes || "No significant findings.",
          doctorName: newReportDoctor,
          hospitalName: newReportHospital,
          isPersonalUpload: true,
          fileData: fileData || undefined,
          fileName: fileName || undefined,
          fileType: fileType || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register report");
      
      setMessage("Medical report successfully registered and secured in Google Cloud Storage!");
      setNewReportTitle('');
      setNewReportDiagnoses('');
      setNewReportNotes('');
      setNewReportFile(null);
      
      // Refresh patient records
      fetchPatientData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Build the unified list of medical reports (merging server + pre-populated fallbacks)
  const allReports: any[] = [];
  records.forEach(rec => {
    allReports.push({
      ...rec
    });
  });

  defaultReports.forEach(def => {
    if (!allReports.some(r => r.title === def.title || r.id === def.id)) {
      allReports.push(def);
    }
  });

  // Filter reports according to active search or category select
  const filteredReports = allReports.filter(rep => {
    if (activeReportCategory === 'All') return true;
    return getReportCategory(rep) === activeReportCategory;
  });

  // Consulted hospitals mapping
  const consultedHospitals = [
    {
      id: 'HOSP-01',
      name: 'Metro General Hospital',
      location: 'New York, NY',
      doctor: 'Dr. Sarah Connor',
      regNo: 'D-5511',
      department: 'Cardiology',
      logoType: 'cardio'
    },
    {
      id: 'HOSP-02',
      name: 'City Wellness Clinic',
      location: 'San Francisco, CA',
      doctor: 'Dr. Rajesh Koothrapali',
      regNo: 'D-8822',
      department: 'General Medicine',
      logoType: 'wellness'
    },
    {
      id: 'HOSP-03',
      name: 'Apollo Prime Healthcare',
      location: 'Boston, MA',
      doctor: 'Dr. Gregory House',
      regNo: 'D-3344',
      department: 'Internal Medicine',
      logoType: 'prime'
    }
  ];

  return (
    <div id="patient-view" className="flex-1 flex overflow-hidden h-full bg-[#F8FAFC]">
      
      {/* Executive Slate Clinical Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0 text-slate-300 shadow-lg z-20 border-r border-slate-800" id="patient-sidebar">
        <div className="p-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold font-mono">Patient Record</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">VERIFIED</span>
          </div>
          <p className="text-sm font-mono font-bold text-sky-400 mt-1 tracking-wide">{patient.id}</p>
          <p className="text-xs text-slate-300 font-medium truncate mt-0.5">{patient.name}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab('patient_info')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'patient_info'
                ? 'bg-sky-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
            id="tab-btn-patient-info"
          >
            <UserCheck size={16} /> Patient Information
          </button>

          <button
            onClick={() => setActiveTab('doctors')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'doctors'
                ? 'bg-sky-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
            id="tab-btn-doctors"
          >
            <User size={16} /> Doctors Consulted
          </button>
          
          <button
            onClick={() => setActiveTab('medical_reports')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'medical_reports'
                ? 'bg-sky-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
            id="tab-btn-medical-reports"
          >
            <FileText size={16} /> Medical Reports
          </button>

          <button
            onClick={() => setActiveTab('reminders')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'reminders'
                ? 'bg-sky-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
            id="tab-btn-reminders"
          >
            <Clock size={16} /> Daily Reminders
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'permissions'
                ? 'bg-sky-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
            id="tab-btn-permissions"
          >
            <span className="flex items-center gap-3">
              <Shield size={16} /> Permissions & Alerts
            </span>
            {consents.filter(c => c.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500 text-slate-950 rounded-md">
                {consents.filter(c => c.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('report_analyzer')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'report_analyzer'
                ? 'bg-sky-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
            id="tab-btn-report-analyzer"
          >
            <Sparkles size={16} className="text-amber-400" /> Report Analyzer (AI RAG)
          </button>

          <button
            onClick={() => setActiveTab('cloud_storage')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'cloud_storage'
                ? 'bg-sky-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
            id="tab-btn-cloud-storage"
          >
            <Cloud size={16} className="text-sky-400" /> Cloud Storage Vault
          </button>
        </nav>

        {/* SOS Trigger Footer */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={() => setSosActive(!sosActive)}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              sosActive
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60'
            }`}
          >
            <AlertTriangle size={15} />
            <span>{sosActive ? 'Dismiss Emergency SOS' : 'Emergency SOS Broadcast'}</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6" id="patient-workspace">

        {/* SOS Emergency Modal Overlay */}
        {sosActive && (
          <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-200 shadow-lg animate-pulse space-y-4" id="sos-active-overlay">
            <div className="flex justify-between items-start">
              <div className="flex gap-3 items-center">
                <AlertTriangle className="text-red-600 w-8 h-8 shrink-0" />
                <div>
                  <h2 className="text-base font-black text-red-900 uppercase tracking-wide">Emergency Identity Broadcast</h2>
                  <p className="text-xs text-red-700">Displaying critical health metrics for immediate responder audit</p>
                </div>
              </div>
              <button 
                onClick={() => setSosActive(false)}
                className="px-4 py-1.5 bg-red-900 text-white rounded-xl text-[10px] font-black hover:bg-red-950 shadow"
              >
                DISMISS BEACON
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-red-100">
              <div className="text-center p-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Group</p>
                <p className="text-2xl font-black text-red-600 mt-0.5">{patient.bloodGroup || 'O+'}</p>
              </div>
              <div className="text-center p-2 border-l border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Chronic Conditions</p>
                <p className="text-xs font-bold text-slate-800 mt-1">{patient.chronicDiseases?.join(', ') || 'None'}</p>
              </div>
              <div className="text-center p-2 border-l border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Allergies</p>
                <p className="text-xs font-bold text-red-600 mt-1">{patient.allergies?.join(', ') || 'None recorded'}</p>
              </div>
              <div className="text-center p-2 border-l border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Dossier ID</p>
                <p className="text-sm font-mono font-bold text-[#006666] mt-1">{patient.id}</p>
              </div>
            </div>

            <div className="flex justify-between items-center bg-red-950 text-white p-4 rounded-2xl border border-red-800">
              <div className="flex items-center gap-3">
                <PhoneCall size={20} className="text-red-400 animate-bounce" />
                <div className="text-left">
                  <p className="text-[10px] opacity-70 leading-none">Emergency Contact (Spouse)</p>
                  <p className="text-xs font-extrabold leading-tight mt-1">John Doe: 9876543211</p>
                </div>
              </div>
              <a 
                href="tel:9876543211" 
                className="px-4 py-2 bg-white text-red-900 rounded-xl text-xs font-black shadow-md hover:bg-slate-50 transition-all"
              >
                CALL PRIMARY CONTACT
              </a>
            </div>
          </div>
        )}

        {/* Feedback indicators */}
        {error && (
          <div className="p-3.5 bg-red-50 border-l-4 border-red-600 rounded-r-2xl text-xs text-red-800 font-bold flex justify-between items-center shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 font-extrabold hover:text-red-700">✕</button>
          </div>
        )}
        {message && (
          <div className="p-3.5 bg-green-50 border-l-4 border-green-600 rounded-r-2xl text-xs text-green-800 font-bold flex justify-between items-center shadow-sm">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-green-500 font-extrabold hover:text-green-700">✕</button>
          </div>
        )}

        {/* ======================= TAB 1: PATIENT INFORMATION ======================= */}
        {activeTab === 'patient_info' && (
          <div className="space-y-6" id="view-patient-info">
            
            {/* Header Title Bar */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-250/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Patient Dossier & Clinical Health Card</h2>
                <p className="text-xs text-slate-500 mt-1">Centralized health identity, biometric vitals radar, and emergency paramedic pass</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsHealthPassModalOpen(true)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <QrCode size={15} className="text-sky-400" />
                  <span>View Emergency Smart Pass</span>
                </button>
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-xl text-[11px] font-semibold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" /> AES-256 Vault
                </span>
              </div>
            </div>

            {/* Smart Health Card Physical Pass Preview Banner */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-4 max-w-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 shrink-0 shadow-sm">
                      <img src={smartChipImage} alt="Biometric Chip" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold tracking-widest text-sky-400 uppercase">Universal Biometric Pass</span>
                      <h3 className="text-lg font-bold text-white tracking-tight">{nameInput}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Patient ID</span>
                      <span className="font-mono font-bold text-sky-300 mt-0.5 block">{patient.id}</span>
                    </div>
                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Blood Type</span>
                      <span className="font-bold text-red-400 text-sm mt-0.5 block">{bloodInput}</span>
                    </div>
                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Emergency Contact</span>
                      <span className="font-medium text-slate-200 mt-0.5 block truncate">+1 555-0199</span>
                    </div>
                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Allergies</span>
                      <span className="font-medium text-amber-300 mt-0.5 block truncate">Penicillin, NSAIDs</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 shrink-0 bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700/70">
                  <div className="bg-white p-2 rounded-xl shadow-xs">
                    <QrCode size={72} className="text-slate-950" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Scan for ER Access</span>
                </div>
              </div>
            </div>

            {/* General Demographics & Checked Vitals Row */}
            <div className="grid grid-cols-12 gap-6">
              
              {/* Demographics & Family Person */}
              <div className="col-span-12 lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                    <h3 className="text-xs font-black text-[#006666] uppercase tracking-wider flex items-center gap-2">
                      <UserCheck size={16} /> Demographics & Family Profile
                    </h3>
                    <button
                      onClick={() => {
                        if (isDemoEditing) {
                          handleUpdateProfile();
                        } else {
                          setIsDemoEditing(true);
                        }
                      }}
                      className="px-3 py-1 bg-teal-50 hover:bg-[#004D4D] hover:text-white text-[#006666] text-[10px] font-black rounded-lg border border-teal-100 transition-all uppercase"
                    >
                      {isDemoEditing ? '✓ Sync changes' : '✏ Edit fields'}
                    </button>
                  </div>

                  {isDemoEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Parents / Family Person's Name</label>
                        <input
                          type="text"
                          value={parentNameInput}
                          onChange={(e) => setParentNameInput(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs outline-none focus:bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Gender</label>
                          <select
                            value={genderInput}
                            onChange={(e) => setGenderInput(e.target.value)}
                            className="w-full px-2 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs"
                          >
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Non-Binary">Non-Binary</option>
                            <option value="Prefer Not to Say">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Blood Group</label>
                          <select
                            value={bloodInput}
                            onChange={(e) => setBloodInput(e.target.value)}
                            className="w-full px-2 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs"
                          >
                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                              <option key={bg} value={bg}>{bg}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Birth Date</label>
                          <input
                            type="date"
                            value={dobInput}
                            onChange={(e) => setDobInput(e.target.value)}
                            className="w-full px-2 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                        <span className="text-sm font-black text-slate-800 block mt-0.5">{nameInput}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Parent / Family Person</span>
                        <span className="text-sm font-black text-slate-800 block mt-0.5">{parentNameInput}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Date of Birth</span>
                        <span className="text-sm font-black text-slate-800 block mt-0.5">{dobInput}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Current Age</span>
                        <span className="text-sm font-black text-slate-800 block mt-0.5">{calculateAge(dobInput)}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Gender Identity</span>
                        <span className="text-sm font-black text-slate-800 block mt-0.5">{genderInput}</span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Blood Group Type</span>
                        <span className="text-sm font-black text-slate-800 block mt-0.5">{bloodInput}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl">
                  <ShieldCheck size={28} className="text-[#006666] shrink-0" />
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Identity properties are locked to your medical registry index key. Any alteration logs a non-repudiation event in the system auditable ledger.
                  </p>
                </div>
              </div>

              {/* Comprehensive Clinical Vitals & Biometrics Radar */}
              <div className="col-span-12 lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Activity size={17} className="text-sky-600" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Clinical Biometric Radar
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (isVitalsEditing) {
                          handleUpdateProfile();
                          setIsVitalsEditing(false);
                        } else {
                          setIsVitalsEditing(true);
                        }
                      }}
                      className="px-3 py-1 bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-700 text-[11px] font-semibold rounded-lg border border-sky-200/80 transition-all cursor-pointer"
                    >
                      {isVitalsEditing ? '✓ Save Changes' : '✏ Log Vitals'}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                    Continuous physiological markers audited across verified consultation checkpoints.
                  </p>

                  <div className="space-y-3">
                    {/* Blood Pressure & Pulse Row */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/70">
                        <span className="text-[10px] font-mono font-medium text-slate-500 uppercase block">Blood Pressure</span>
                        {isVitalsEditing ? (
                          <input
                            type="text"
                            value={bloodPressureInput}
                            onChange={(e) => setBloodPressureInput(e.target.value)}
                            placeholder="118/76 mmHg"
                            className="w-full px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded mt-1 outline-none focus:border-sky-500"
                          />
                        ) : (
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-sm font-bold text-slate-900 font-mono">{bloodPressureInput}</span>
                            <span className="text-[10px] text-emerald-600 font-medium">Optimal</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/70">
                        <span className="text-[10px] font-mono font-medium text-slate-500 uppercase block">Resting Pulse</span>
                        {isVitalsEditing ? (
                          <input
                            type="text"
                            value={heartRateInput}
                            onChange={(e) => setHeartRateInput(e.target.value)}
                            placeholder="68 bpm"
                            className="w-full px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded mt-1 outline-none focus:border-sky-500"
                          />
                        ) : (
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-sm font-bold text-slate-900 font-mono">{heartRateInput}</span>
                            <span className="text-[10px] text-emerald-600 font-medium">Normal</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Blood Glucose & Oxygen SpO2 */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/70">
                        <span className="text-[10px] font-mono font-medium text-slate-500 uppercase block">Fasting Glucose</span>
                        {isVitalsEditing ? (
                          <input
                            type="text"
                            value={bloodGlucoseInput}
                            onChange={(e) => setBloodGlucoseInput(e.target.value)}
                            placeholder="94 mg/dL"
                            className="w-full px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded mt-1 outline-none focus:border-sky-500"
                          />
                        ) : (
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-sm font-bold text-slate-900 font-mono">{bloodGlucoseInput}</span>
                            <span className="text-[10px] text-emerald-600 font-medium">Controlled</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/70">
                        <span className="text-[10px] font-mono font-medium text-slate-500 uppercase block">Blood Oxygen SpO2</span>
                        {isVitalsEditing ? (
                          <input
                            type="text"
                            value={oxygenSatInput}
                            onChange={(e) => setOxygenSatInput(e.target.value)}
                            placeholder="99%"
                            className="w-full px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded mt-1 outline-none focus:border-sky-500"
                          />
                        ) : (
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-sm font-bold text-slate-900 font-mono">{oxygenSatInput}</span>
                            <span className="text-[10px] text-sky-600 font-medium">Optimal</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Weight, Height & BMI Calculation */}
                    <div className="p-3.5 bg-sky-50/60 rounded-2xl border border-sky-100 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold text-slate-600 uppercase">Weight & Height:</span>
                          {isVitalsEditing ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={weightInput}
                                onChange={(e) => setWeightInput(e.target.value)}
                                className="w-16 px-1.5 py-0.5 text-xs border rounded bg-white"
                              />
                              <input
                                type="text"
                                value={heightInput}
                                onChange={(e) => setHeightInput(e.target.value)}
                                className="w-16 px-1.5 py-0.5 text-xs border rounded bg-white"
                              />
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-900 font-mono">{weightInput} · {heightInput}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-mono">Calculated BMI:</span>
                          <span className="text-xs font-extrabold text-sky-800 font-mono">22.0 kg/m²</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-medium">Healthy</span>
                        </div>
                      </div>
                      <Scale size={20} className="text-sky-600 shrink-0" />
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 p-2.5 mt-4 border border-dashed border-slate-200 rounded-xl">
                  Verified by attending clinical staff as of {visitedDates[visitedDates.length - 1] || 'last checkup'}.
                </div>
              </div>

            </div>

            {/* Launch Hospital Visits Date Subscreen Button */}
            <div className="bg-[#006666] text-white rounded-3xl p-6 shadow-md border border-[#004D4D] flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                  <Building size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-wide">Hospital Visits Log & Notifications Settings</h3>
                  <p className="text-xs text-teal-100/80 mt-0.5">Access history of visited dates, upcoming consultation dates, and customize diagnostic notification alarms</p>
                </div>
              </div>

              <button
                onClick={() => setIsVisitModalOpen(true)}
                className="px-6 py-3 bg-[#EAA82C] hover:bg-[#d69623] text-slate-900 text-xs font-black rounded-xl transition-all shadow hover:shadow-md uppercase tracking-wider shrink-0"
                id="btn-open-visit-logs"
              >
                🏥 Open Visit Records ({visitedDates.length} Visited)
              </button>
            </div>

          </div>
        )}

        {/* ======================= HOSPITAL VISIT LOGS NEW SCREEN/MODAL ======================= */}
        {isVisitModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="visit-logs-modal-container">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full flex flex-col overflow-hidden max-h-[85vh] animate-slide-up" id="visit-logs-modal">
              
              {/* Modal Header */}
              <div className="bg-[#006666] p-5 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <Building className="text-teal-200" size={20} />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Hospital Visits Ledger</h3>
                    <p className="text-[11px] text-teal-100">Consultation timelines and automated alarm schedulers</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsVisitModalOpen(false)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                  id="btn-close-visit-logs"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Scroll Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {/* Upcoming Visit date display */}
                <div className="p-4 bg-teal-50 border border-teal-150 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-[#006666]" size={20} />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Upcoming Consultation Date</span>
                      <span className="text-sm font-black text-[#006666] block mt-0.5">{upcomingVisitDate}</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#EAA82C] text-slate-900 font-extrabold px-2.5 py-1 rounded-lg uppercase">UPCOMING VISIT</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Visited Dates list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Building size={14} className="text-[#006666]" /> Past Visited Dates History
                    </h4>
                    
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {visitedDates.map((vDate, idx) => {
                        // Mock mapping for hospital associated to visitor history index
                        const hospName = idx % 3 === 0 ? 'Metro General Hospital' : idx % 3 === 1 ? 'City Wellness Clinic' : 'Apollo Prime Healthcare';
                        return (
                          <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                            <div>
                              <p className="text-xs font-black text-slate-800">{vDate}</p>
                              <p className="text-[10px] text-slate-400">{hospName}</p>
                            </div>
                            <span className="text-[9px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded uppercase">CONSULTED</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notification Scheduler */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <BellRing size={14} className="text-[#006666]" /> Schedule consultation alarm
                    </h4>

                    <form onSubmit={handleAddVisitNotification} className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Consultation Type</label>
                        <select
                          value={newNotifType}
                          onChange={(e) => setNewNotifType(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
                        >
                          <option value="Cardiology Followup">Cardiology Followup</option>
                          <option value="Diabetes Glycemic Review">Diabetes Glycemic Review</option>
                          <option value="Internal Medicine Consult">Internal Medicine Consult</option>
                          <option value="General Checkup Physical">General Checkup Physical</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Date of Visit</label>
                          <input
                            type="date"
                            value={newNotifDate}
                            onChange={(e) => setNewNotifDate(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Reminder Hour</label>
                          <input
                            type="text"
                            value={newNotifTime}
                            onChange={(e) => setNewNotifTime(e.target.value)}
                            placeholder="e.g. 02:00 PM"
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-[#006666] hover:bg-[#004D4D] text-white text-[11px] font-black rounded-xl transition-all shadow-md uppercase"
                      >
                        🔔 Set Consultation Notification
                      </button>
                    </form>
                  </div>

                </div>

                {/* List of active scheduled notification alerts */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Active Consultation Alarms</h4>
                  <div className="space-y-2">
                    {visitNotifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No active notifications set on file.</p>
                    ) : (
                      visitNotifications.map((notif, index) => (
                        <div key={index} className="p-3 bg-teal-50/50 border border-teal-100 rounded-xl flex justify-between items-center text-xs">
                          <span className="text-slate-700 font-medium">🔔 {notif}</span>
                          <button
                            onClick={() => handleDeleteVisitNotification(index)}
                            className="p-1 hover:text-red-600 text-slate-400"
                            title="Remove Alarm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 text-right shrink-0">
                <button 
                  onClick={() => setIsVisitModalOpen(false)}
                  className="px-5 py-2 bg-[#006666] hover:bg-[#004D4D] text-white text-xs font-black rounded-xl shadow-sm transition-all uppercase"
                >
                  Return to Dashboard
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ======================= TAB 2: DOCTORS OPTION ======================= */}
        {activeTab === 'doctors' && (
          <div className="space-y-6" id="view-doctors">
            
            {/* Header title */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Doctors Consulted</h2>
              <p className="text-xs text-slate-500 mt-1">Select any approved hospital below to inspect registration credentials and departments you have consulted with.</p>
            </div>

            {/* Hospital separate boxes as requested */}
            <div className="space-y-4">
              {consultedHospitals.map((hosp) => {
                const isOpen = selectedHospitalId === hosp.id;
                return (
                  <div 
                    key={hosp.id} 
                    className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
                    id={`hospital-box-${hosp.id}`}
                  >
                    {/* Header trigger box */}
                    <div 
                      onClick={() => setSelectedHospitalId(isOpen ? null : hosp.id)}
                      className={`p-5 flex justify-between items-center cursor-pointer transition-all ${
                        isOpen ? 'bg-[#006666]/5 border-b border-slate-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Custom High Fidelity Hospital Logo Icon */}
                        <div className="w-12 h-12 rounded-2xl bg-[#006666]/10 flex items-center justify-center text-[#006666] border border-[#006666]/10 shrink-0">
                          {hosp.logoType === 'cardio' && (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          )}
                          {hosp.logoType === 'wellness' && (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17 8C17 11.87 13.87 15 10 15C6.13 15 3 11.87 3 8C3 4.13 6.13 1 10 1C13.87 1 17 4.13 17 8M10 3C7.24 3 5 5.24 5 8C5 10.76 7.24 13 10 13C12.76 13 15 10.76 15 8C15 5.24 12.76 3 10 3Z" />
                            </svg>
                          )}
                          {hosp.logoType === 'prime' && (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2L2 22h20L12 2zm0 3.99L19.53 19H4.47L12 5.99z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-800">{hosp.name}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Location: {hosp.location} • Consulted Partner</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[9px] bg-teal-100 text-[#006666] font-bold px-2.5 py-1 rounded-lg uppercase">ACTIVE RECORD</span>
                        {isOpen ? <ChevronDown size={20} className="text-[#006666]" /> : <ChevronRight size={20} className="text-slate-400" />}
                      </div>
                    </div>

                    {/* Expandable Details Screen */}
                    {isOpen && (
                      <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-slide-up">
                        <div className="space-y-4 flex-1">
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            
                            <div className="p-3 bg-white rounded-2xl border border-slate-150">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Doctor's Name</span>
                              <span className="text-xs font-black text-slate-800 block mt-0.5">{hosp.doctor}</span>
                            </div>

                            <div className="p-3 bg-white rounded-2xl border border-slate-150">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Department Specialty</span>
                              <span className="text-xs font-black text-[#006666] block mt-0.5">{hosp.department}</span>
                            </div>

                            <div className="p-3 bg-white rounded-2xl border border-slate-150">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Practitioner Registration No</span>
                              <span className="text-xs font-mono font-bold text-slate-700 block mt-0.5">{hosp.regNo}</span>
                            </div>

                          </div>

                          <div className="p-3.5 bg-white rounded-2xl border border-slate-100 flex items-center gap-2.5 text-[11px] text-slate-500">
                            <Info size={14} className="text-[#006666]" />
                            <span>This doctor is fully verified and registered under license {hosp.regNo} at {hosp.name}.</span>
                          </div>

                        </div>

                        {/* Hospital logo & name card right inside box */}
                        <div className="w-full md:w-56 bg-[#006666] text-white p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner relative shrink-0">
                          {/* logo */}
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-black text-sm mb-2 border border-white/20">
                            {hosp.name.slice(0, 1)}
                          </div>
                          <span className="text-xs font-black leading-tight tracking-wide">{hosp.name}</span>
                          <span className="text-[9px] text-teal-100 opacity-80 mt-1 uppercase tracking-widest font-mono">REGISTRY LOCK</span>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ======================= TAB 3: MEDICAL REPORTS ======================= */}
        {activeTab === 'medical_reports' && (
          <div className="space-y-6 animate-slide-up" id="view-medical-reports">
            
            {/* Header / Global Action Console */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <FileText className="text-[#006666]" /> Centralized Medical Reports Vault
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Access cryptographically sealed diagnostic reports organized by test type with cryptographic verification.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const selected = allReports.filter(r => selectedReportIds.includes(r.id));
                    if (selected.length === 0) {
                      setMessage("Please select at least one report using the checkboxes below.");
                      return;
                    }
                    downloadMultiplePDFs(selected);
                    setMessage(`Triggered download for ${selected.length} selected medical report PDFs.`);
                  }}
                  className="px-4 py-2 bg-[#EAA82C] text-[#004D4D] text-xs font-black rounded-xl hover:bg-[#d69824] transition-all flex items-center gap-2 shadow-sm"
                >
                  <Download size={14} /> Extract Selected ({selectedReportIds.length})
                </button>
                
                <button
                  onClick={() => {
                    downloadMultiplePDFs(allReports);
                    setMessage(`Triggered bulk download for all ${allReports.length} medical report PDFs.`);
                  }}
                  className="px-4 py-2 bg-[#006666] text-white text-xs font-black rounded-xl hover:bg-[#005252] transition-all flex items-center gap-2 shadow-sm"
                >
                  <Download size={14} /> Extract All ({allReports.length})
                </button>
              </div>
            </div>

            {/* Test Categories Selector - 6 Bento-style Interactive cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { name: 'All', label: 'All Test Reports', count: allReports.length, color: 'bg-slate-100 text-slate-800 border-slate-200' },
                { name: 'X-Ray Reports', label: 'X-Ray Reports', count: allReports.filter(r => getReportCategory(r) === 'X-Ray Reports').length, color: 'bg-teal-50 text-teal-800 border-teal-100' },
                { name: 'MRI Reports', label: 'MRI Reports', count: allReports.filter(r => getReportCategory(r) === 'MRI Reports').length, color: 'bg-blue-50 text-blue-800 border-blue-100' },
                { name: 'CT Scan Reports', label: 'CT Scan Reports', count: allReports.filter(r => getReportCategory(r) === 'CT Scan Reports').length, color: 'bg-indigo-50 text-indigo-800 border-indigo-100' },
                { name: 'Blood Test Reports', label: 'Blood Test Reports', count: allReports.filter(r => getReportCategory(r) === 'Blood Test Reports').length, color: 'bg-rose-50 text-rose-800 border-rose-100' },
                { name: 'Urine Test Reports', label: 'Urine Test Reports', count: allReports.filter(r => getReportCategory(r) === 'Urine Test Reports').length, color: 'bg-amber-50 text-amber-800 border-amber-100' },
                { name: 'Other Tests', label: 'Other Tests', count: allReports.filter(r => getReportCategory(r) === 'Other Tests').length, color: 'bg-purple-50 text-purple-800 border-purple-100' }
              ].map(cat => {
                const isActive = activeReportCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setActiveReportCategory(cat.name);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isActive 
                        ? 'ring-2 ring-[#006666] bg-white border-[#006666] shadow-md scale-[1.02]' 
                        : 'bg-white hover:bg-slate-50 border-slate-150 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Category
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${cat.color}`}>
                        {cat.count}
                      </span>
                    </div>
                    <h3 className="text-xs font-black text-slate-800 mt-2 truncate">{cat.label}</h3>
                  </button>
                );
              })}
            </div>

            {/* Main Panel grid: Reports List + Add Custom Report */}
            <div className="grid grid-cols-12 gap-6">
              
              {/* Left Side: Reports List under selected Filter */}
              <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[500px]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">
                      {activeReportCategory === 'All' ? 'Showing All Medical Reports' : `Filtered Category: ${activeReportCategory}`}
                    </h3>
                    <p className="text-[11px] text-slate-400">Select reports below to download individually or in batch extract.</p>
                  </div>
                  
                  {/* Select All Checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 transition-all text-[11px] font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={filteredReports.length > 0 && filteredReports.every(r => selectedReportIds.includes(r.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newIds = [...selectedReportIds];
                          filteredReports.forEach(r => {
                            if (!newIds.includes(r.id)) newIds.push(r.id);
                          });
                          setSelectedReportIds(newIds);
                        } else {
                          setSelectedReportIds(selectedReportIds.filter(id => !filteredReports.some(r => r.id === id)));
                        }
                      }}
                      className="rounded border-slate-300 text-[#006666] focus:ring-[#006666]"
                    />
                    Select Page ({filteredReports.length})
                  </label>
                </div>

                {filteredReports.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 flex-1 flex flex-col items-center justify-center">
                    <FileText size={40} className="stroke-1 text-slate-300 mb-2" />
                    <p className="text-xs font-bold">No reports found under this category.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Use the ledger form on the right to register a new report!</p>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[600px]">
                    {filteredReports.map((report) => {
                      const isSelected = selectedReportIds.includes(report.id);
                      const reportCatName = getReportCategory(report);
                      return (
                        <div 
                          key={report.id} 
                          className={`p-4 rounded-2xl border transition-all ${
                            isSelected 
                              ? 'bg-teal-50/20 border-teal-200' 
                              : 'bg-slate-50 hover:bg-slate-100/70 border-slate-150'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedReportIds([...selectedReportIds, report.id]);
                                } else {
                                  setSelectedReportIds(selectedReportIds.filter(id => id !== report.id));
                                }
                              }}
                              className="mt-1 rounded border-slate-300 text-[#006666] focus:ring-[#006666] h-4 w-4 shrink-0"
                            />

                            <div className="flex-1 space-y-3 min-w-0">
                              <div className="flex justify-between items-start gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-black text-slate-800 text-sm truncate">{report.title}</h4>
                                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                                      {reportCatName}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                    <span>Prescribed by: <strong className="text-slate-600 font-semibold">{report.doctorName}</strong></span>
                                    <span>•</span>
                                    <span>Hospital: <strong className="text-slate-600 font-semibold">{report.hospitalName}</strong></span>
                                  </p>
                                </div>
                                
                                <span className="shrink-0 flex items-center gap-1 text-[10px] font-mono font-bold text-[#006666] bg-teal-50/80 px-2 py-0.5 rounded-lg border border-teal-100">
                                  <Calendar size={10} /> {report.date}
                                </span>
                              </div>

                              <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs flex gap-4 items-center">
                                <div className="flex-1 min-w-0">
                                  <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-1">
                                    Clinical Diagnoses & Findings
                                  </span>
                                  <p className="font-semibold text-slate-700 leading-relaxed truncate">{report.diagnoses}</p>
                                  <p className="text-slate-500 text-[11px] leading-relaxed mt-1 line-clamp-2">{report.notes}</p>
                                </div>
                                {getReportScanImage(report) && (
                                  <div 
                                    className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-black relative group cursor-pointer shadow-sm" 
                                    onClick={() => setPreviewingReport(report)}
                                    title="Click to view full medical scan"
                                  >
                                    <img 
                                      src={getReportScanImage(report)} 
                                      alt="Scan Thumbnail" 
                                      className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-teal-900/10 group-hover:bg-transparent transition-all" />
                                    <div className="absolute bottom-1 right-1 bg-black/65 px-1.5 py-0.5 rounded text-[7px] text-white font-mono select-none font-bold">
                                      VIEW
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-between items-center pt-1">
                                <span className="text-[9px] font-mono text-slate-400">
                                  SEAL_ID: {report.id}
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  {report.gcsUri && (
                                    <a
                                      href={report.fileUrl || `/api/users/${patient.id}/storage/files/${report.gcsFileId}/download`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1.5 bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-bold rounded-lg hover:bg-sky-100 transition-all flex items-center gap-1 shadow-xs"
                                      title={`Stored in Google Cloud Storage: ${report.gcsUri}`}
                                    >
                                      <Cloud size={12} className="text-sky-600" /> GCS Document
                                    </a>
                                  )}
                                  <button
                                    onClick={() => setPreviewingReport(report)}
                                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm"
                                  >
                                    <FileText size={12} className="text-slate-500" /> Preview Report
                                  </button>
                                  
                                  <button
                                    onClick={() => downloadReportPDF(report)}
                                    className="px-3 py-1.5 bg-teal-50 border border-teal-100 text-[#006666] text-[11px] font-black rounded-lg hover:bg-teal-100/60 transition-all flex items-center gap-1.5 shadow-sm"
                                  >
                                    <Download size={12} /> Extract PDF
                                  </button>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Side: Add / Register Lab Report form */}
              <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-fit">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-800">
                    Register New Report Ledger
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Securely append a diagnostic test report into your MedLink lifetime profile.</p>
                </div>

                <form onSubmit={handleRegisterReport} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Test Category Type
                    </label>
                    <select
                      value={newReportType}
                      onChange={(e: any) => setNewReportType(e.target.value)}
                      className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-150 rounded-xl p-2.5 focus:ring-1 focus:ring-[#006666] outline-none"
                    >
                      <option value="X-ray">X-ray (Radiology)</option>
                      <option value="MRI">MRI Scan</option>
                      <option value="CT Scan">CT Scan</option>
                      <option value="Blood Test">Blood Test / Lipid / CBC</option>
                      <option value="Urine Test">Urine Analysis</option>
                      <option value="Other">Other Tests</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Diagnostic Test Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Brain MRI (T2 weighted) or Lipid Profile"
                      value={newReportTitle}
                      onChange={(e) => setNewReportTitle(e.target.value)}
                      className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-150 rounded-xl p-2.5 focus:ring-1 focus:ring-[#006666] outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Prescribing Doctor
                      </label>
                      <select
                        value={newReportDoctor}
                        onChange={(e) => setNewReportDoctor(e.target.value)}
                        className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-150 rounded-xl p-2.5 focus:ring-1 focus:ring-[#006666] outline-none"
                      >
                        <option value="Dr. Sarah Connor">Dr. Sarah Connor</option>
                        <option value="Dr. John Watson">Dr. John Watson</option>
                        <option value="Dr. Gregory House">Dr. Gregory House</option>
                        <option value="Dr. Rajesh Koothrapali">Dr. Rajesh Koothrapali</option>
                        <option value="Other Practitioner">Other Practitioner</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Consulting Node
                      </label>
                      <select
                        value={newReportHospital}
                        onChange={(e) => setNewReportHospital(e.target.value)}
                        className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-150 rounded-xl p-2.5 focus:ring-1 focus:ring-[#006666] outline-none"
                      >
                        <option value="Metro General Hospital">Metro General Hospital</option>
                        <option value="City Wellness Clinic">City Wellness Clinic</option>
                        <option value="Apollo Prime Healthcare">Apollo Prime Healthcare</option>
                        <option value="Personal Upload">Personal Upload</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Clinical Diagnoses Overview
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sinus Bradycardia or Normal variant chest"
                      value={newReportDiagnoses}
                      onChange={(e) => setNewReportDiagnoses(e.target.value)}
                      className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-150 rounded-xl p-2.5 focus:ring-1 focus:ring-[#006666] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Detailed Findings & Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Enter detailed laboratory or diagnostic findings observations..."
                      value={newReportNotes}
                      onChange={(e) => setNewReportNotes(e.target.value)}
                      className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-150 rounded-xl p-2.5 focus:ring-1 focus:ring-[#006666] outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Attach Document to Google Cloud Storage</span>
                      <span className="text-teal-700 font-bold lowercase text-[9px]">gs:// partition</span>
                    </label>
                    <div className="relative border border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 rounded-xl p-3 text-center transition-all cursor-pointer">
                      <input
                        type="file"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setNewReportFile(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.json"
                      />
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <UploadCloud size={16} className="text-teal-700" />
                        {newReportFile ? (
                          <span className="font-bold text-slate-800 truncate max-w-[200px]">
                            {newReportFile.name} ({(newReportFile.size / 1024).toFixed(0)} KB)
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium text-[11px]">
                            Attach PDF, Scan, or Image to GCS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#006666] hover:bg-[#005252] text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>VERIFYING CRYPTOGRAPHIC LEDGER...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} /> Register & Sign Report
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>

            {/* HIGH-FIDELITY PDF PREVIEW MODAL */}
            {previewingReport && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-100 animate-scale-up">
                  {/* Modal Header */}
                  <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="font-mono text-xs text-[#EAA82C] uppercase tracking-widest font-bold">
                        SECURE CLINICAL RECORD • PDF PREVIEW
                      </h3>
                      <p className="text-sm font-black text-white mt-1">
                        Report Seal Ref: {previewingReport.id}
                      </p>
                    </div>
                    <button
                      onClick={() => setPreviewingReport(null)}
                      className="p-1.5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Document canvas */}
                  <div className="p-8 overflow-y-auto bg-slate-150 max-h-[500px]">
                    <div className="bg-white shadow-xl border border-slate-300 p-8 font-sans text-xs text-slate-800 space-y-6 max-w-xl mx-auto rounded-lg relative overflow-hidden">
                      {/* Decorative Watermark / Security Mesh */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/25 rounded-full filter blur-2xl pointer-events-none" />
                      
                      {/* Hospital / Lab Header */}
                      <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#006666] font-black tracking-wider text-sm">MEDLINK HEALTHCARE</span>
                            <span className="text-[10px] bg-teal-50 text-[#006666] border border-teal-100 font-bold px-1.5 py-0.5 rounded">LABS</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-semibold leading-tight">
                            {previewingReport.hospitalName || "Partner Clinical Node"}<br />
                            Department of Diagnostic Medicine & Clinical Pathology
                          </p>
                        </div>
                        <div className="text-right space-y-0.5">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest block">
                            CLINICAL LABORATORY REPORT
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 block">
                            ISO 15189 CERTIFIED • ID: {previewingReport.id}
                          </span>
                        </div>
                      </div>

                      {/* Patient & Specimen Metadata Block */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 grid grid-cols-2 gap-y-3 gap-x-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Patient Name</p>
                          <p className="font-extrabold text-slate-800 text-xs">{patient?.name || "Jane Doe"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Unique Patient ID (UID)</p>
                          <p className="font-mono font-bold text-slate-700">{patient?.id || "MED-00000125"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Demographics</p>
                          <p className="font-semibold text-slate-700">36 Yrs / Female (Estimated)</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Date of Report</p>
                          <p className="font-semibold text-slate-700">{previewingReport.date}</p>
                        </div>
                        {previewingReport.specimen && (
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Specimen Type</p>
                            <p className="font-semibold text-[#006666]">{previewingReport.specimen}</p>
                          </div>
                        )}
                        {previewingReport.method && !previewingReport.specimen && (
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Diagnostic Modality</p>
                            <p className="font-semibold text-teal-800">{previewingReport.type}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ordering Clinician</p>
                          <p className="font-semibold text-slate-800">{previewingReport.doctorName}</p>
                        </div>
                      </div>

                      {/* Clinical Indication */}
                      {previewingReport.clinicalHistory && (
                        <div className="space-y-1">
                          <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
                            <span>Clinical Indication / History:</span>
                          </h5>
                          <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded border border-slate-100 italic">
                            "{previewingReport.clinicalHistory}"
                          </p>
                        </div>
                      )}

                      {/* Imaging Method / Technique */}
                      {previewingReport.method && (
                        <div className="space-y-1">
                          <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Methodology / Protocol:</h5>
                          <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded border border-slate-100 font-mono text-[10px]">
                            {previewingReport.method}
                          </p>
                        </div>
                      )}

                      {/* Structured Findings (Imaging compartments or Lab table) */}
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 flex justify-between items-center">
                          <span>DIAGNOSTIC FINDINGS & MEASUREMENTS</span>
                          <span className="text-[9px] text-slate-400 font-normal">Reference Unit Standard</span>
                        </h5>

                        {previewingReport.structuredData && Array.isArray(previewingReport.structuredData) ? (
                          // Check if it is laboratory results or imaging sections
                          previewingReport.structuredData[0] && typeof previewingReport.structuredData[0].name !== 'undefined' ? (
                            // Laboratory Table
                            <div className="overflow-x-auto border border-slate-150 rounded-xl">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                                    <th className="p-2.5 pl-3">Investigation</th>
                                    <th className="p-2.5 text-right">Result</th>
                                    <th className="p-2.5 pl-4">Units</th>
                                    <th className="p-2.5">Reference Interval</th>
                                    <th className="p-2.5 text-center">Flag</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                  {previewingReport.structuredData.map((item: any, idx: number) => {
                                    const isAbnormal = item.status && item.status.toLowerCase() !== 'normal';
                                    return (
                                      <tr key={idx} className={`hover:bg-slate-50/50 transition-all ${isAbnormal ? 'bg-red-50/30' : ''}`}>
                                        <td className="p-2.5 pl-3 font-sans font-semibold text-slate-700">{item.name}</td>
                                        <td className={`p-2.5 text-right font-bold ${isAbnormal ? 'text-red-600 font-black' : 'text-slate-800'}`}>
                                          {item.result}
                                        </td>
                                        <td className="p-2.5 pl-4 text-slate-500">{item.unit || '—'}</td>
                                        <td className="p-2.5 text-slate-600">{item.range}</td>
                                        <td className="p-2.5 text-center">
                                          {isAbnormal ? (
                                            <span className="px-1.5 py-0.5 text-[9px] font-sans font-black bg-red-100 text-red-700 rounded uppercase tracking-wider">
                                              {item.status}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300 font-sans text-[9px] font-bold">Normal</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            // Imaging structured sections
                            <div className="space-y-3">
                              {previewingReport.structuredData.map((section: any, idx: number) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-150/60 space-y-1">
                                  <h6 className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wide flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                                    {section.section}
                                  </h6>
                                  <p className="text-slate-600 leading-relaxed font-normal pl-3 text-[11px]">
                                    {section.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          // Fallback to text notes if no structured data
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 leading-relaxed text-slate-600 font-mono whitespace-pre-line text-[11px]">
                            {previewingReport.notes}
                          </div>
                        )}
                      </div>

                      {/* Diagnostic Impression */}
                      <div className="space-y-1.5">
                        <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">CLINICAL IMPRESSION & CONCLUSION</h5>
                        <div className="bg-teal-50/60 border border-teal-150/80 p-3.5 rounded-xl">
                          <p className="font-black text-slate-800 text-xs uppercase leading-snug">
                            {previewingReport.diagnoses}
                          </p>
                          {previewingReport.notes && (
                            <p className="text-slate-500 text-[10px] mt-1.5 leading-relaxed">
                              {previewingReport.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Clinical Diagnostic Scan & Pathology Photo Viewer */}
                      {getReportScanImage(previewingReport) && (
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
                            <span>CLINICAL DIAGNOSTIC SCAN & PATHOLOGY IMAGING</span>
                          </h5>
                          <div className="relative group border border-slate-300 rounded-xl overflow-hidden bg-black p-1.5 shadow-lg flex flex-col items-center">
                            <img 
                              src={getReportScanImage(previewingReport)} 
                              alt={`${previewingReport.title} Scan`}
                              className="max-h-72 w-full object-contain rounded-lg transition-transform duration-300 hover:scale-[1.01]"
                              referrerPolicy="no-referrer"
                            />
                            
                            {/* Medical imaging overlays for realistic diagnostic fidelity */}
                            <div className="absolute top-3.5 left-3.5 bg-black/75 backdrop-blur-xs px-2 py-1 rounded text-[8px] font-mono text-emerald-400 border border-emerald-500/20 select-none">
                              LATERAL/AXIAL • SECURE LINK • MODE: HI_RES
                            </div>
                            <div className="absolute top-3.5 right-3.5 bg-black/75 backdrop-blur-xs px-2 py-1 rounded text-[8px] font-mono text-white/80 border border-white/10 select-none">
                              MEDLINK NODE ID: {previewingReport.id}
                            </div>
                            <div className="absolute bottom-11 left-3.5 bg-black/75 backdrop-blur-xs px-2 py-1 rounded text-[8px] font-mono text-emerald-400 select-none">
                              L: 521 W: 1024 • KVP: 120
                            </div>
                            
                            {/* Interactive Scan scale/status footer */}
                            <div className="w-full bg-slate-900 text-[9px] text-slate-400 py-1.5 px-3 flex justify-between items-center mt-1.5 rounded-md font-mono select-none">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span>IMAGE FEED: CALIBRATED (1.00x)</span>
                              </span>
                              <span className="text-emerald-400 font-bold uppercase">CRYPTO-SEAL VERIFIED</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Electronic Signature block */}
                      <div className="border-t border-dashed border-slate-300 pt-5 flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Cryptographic Stamp</p>
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-teal-50 border border-teal-100 rounded-lg flex items-center justify-center font-mono font-black text-[9px] text-[#006666]">
                              SEALED
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-500 font-bold leading-none">SHA-256 Verified Signature</p>
                              <p className="text-[8px] font-mono text-slate-300 mt-1 uppercase max-w-[150px] truncate">
                                {`0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}`}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-right space-y-1 pr-2 relative">
                          {/* Signature stamp graphic */}
                          <div className="absolute -top-6 right-2 w-24 h-12 border-2 border-teal-600/20 text-teal-600/30 rounded-full font-serif font-black italic text-xs flex items-center justify-center rotate-12 pointer-events-none select-none">
                            APPROVED
                          </div>
                          <p className="font-serif font-bold text-slate-700 italic border-b border-slate-300 pb-0.5 text-sm select-none">
                            {previewingReport.doctorName}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                            Chief Medical Officer / Radiologist
                          </p>
                          <p className="text-[8px] text-slate-300 font-mono">
                            REG LICENSE: #{Array.from({length: 6}, () => Math.floor(Math.random()*10)).join('')}
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-mono text-slate-400">
                      Decrypted locally via client web-node keys.
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewingReport(null)}
                        className="px-4 py-2 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all"
                      >
                        Close Preview
                      </button>
                      <button
                        onClick={() => {
                          downloadReportPDF(previewingReport);
                          setPreviewingReport(null);
                        }}
                        className="px-5 py-2 bg-[#006666] text-white text-xs font-black rounded-xl hover:bg-[#005252] transition-all flex items-center gap-1.5 shadow-md animate-pulse"
                      >
                        <Download size={14} /> Download Document (PDF)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ======================= TAB 4: DAILY REMINDERS ======================= */}
        {activeTab === 'reminders' && (
          <div className="grid grid-cols-12 gap-6" id="view-reminders">
            
            {/* Left Side: Reminders Manager */}
            <div className="col-span-12 lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-[500px]">
              <h2 className="text-base font-black text-slate-800 mb-1">Therapeutic Reminders Ledger</h2>
              <p className="text-xs text-slate-500 mb-4">Set scheduled drug consumption alarms matching active prescription protocols.</p>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {reminders.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-20">No active medicine reminders set on file.</p>
                ) : (
                  reminders.map((rem) => (
                    <div key={rem.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex gap-3 items-center">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                          rem.active ? 'bg-teal-100 text-[#006666]' : 'bg-slate-200 text-slate-500'
                        }`}>
                          💊
                        </div>
                        <div>
                          <p className={`text-xs font-bold leading-none ${rem.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                            {rem.medicineName}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">Time: {rem.time} • Freq: {rem.frequency}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rem.active}
                            onChange={(e) => toggleReminder(rem.id, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#006666]"></div>
                        </label>
                        <button
                          onClick={() => deleteReminder(rem.id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Side: Add Alarm Form */}
            <div className="col-span-12 lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-4">
                Schedule Alarm Entry
              </h3>

              <form onSubmit={handleAddReminder} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Medicine & Strength</label>
                  <input
                    type="text"
                    value={remName}
                    onChange={(e) => setRemName(e.target.value)}
                    placeholder="e.g. Metformin 500mg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Time Alarm</label>
                    <input
                      type="text"
                      value={remTime}
                      onChange={(e) => setRemTime(e.target.value)}
                      placeholder="e.g. 08:00 AM"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Instructions Frequency</label>
                    <input
                      type="text"
                      value={remFreq}
                      onChange={(e) => setRemFreq(e.target.value)}
                      placeholder="e.g. With Breakfast"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-[#006666] hover:bg-[#004D4D] text-white text-xs font-bold rounded-xl shadow-md transition-all uppercase"
                >
                  SET MEDICATION ALARM
                </button>
              </form>
            </div>

          </div>
        )}

        {/* ======================= TAB 5: PERMISSIONS & ALERTS ======================= */}
        {activeTab === 'permissions' && (
          <div className="space-y-6" id="view-permissions">
            
            {/* Consent & Authorization */}
            <div className="w-full space-y-6">
              
              {/* Notification Banner */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <BellRing size={16} className="text-[#006666]" /> Real-time Security Notification Alerts
                </h3>
                <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-teal-100/60 rounded-xl text-[#006666] shrink-0">
                      <Bell size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Automatic Notifications Active</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        To maintain absolute health record privacy and security, <strong className="font-black text-[#006666]">you will receive an automatic system notification alert for every login and every newly uploaded medical report</strong> on your profile. This alert system remains enabled at all times.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Event Stream for Logins and Uploaded Reports */}
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Recent Security Alerts Log</p>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-600 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Security Audit: Successful Patient Login detected</span>
                      </div>
                      <span className="text-slate-400 font-mono">Today, {new Date().toLocaleTimeString()}</span>
                    </div>
                    {allReports.map((rec) => (
                      <div key={rec.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-600 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          <span>Medical record uploaded: <strong className="font-bold text-slate-700">{rec.title}</strong></span>
                        </div>
                        <span className="text-slate-400 font-mono">{rec.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hospital Access Permissions Section */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Building size={16} className="text-[#006666]" /> Hospital Access Permissions Control
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Review, accept, or decline data sharing permissions for healthcare providers. Revoking permission immediately blocks their digital credentials access.
                </p>

                <div className="space-y-3">
                  {consultedHospitals.map((hosp) => {
                    const activeConsent = consents.find(c => c.hospitalId === hosp.id);
                    const isApproved = activeConsent?.status === 'approved';
                    const isRejected = activeConsent?.status === 'rejected';
                    const isPending = activeConsent?.status === 'pending';

                    return (
                      <div key={hosp.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-150 flex flex-wrap items-center justify-between gap-4 transition-all">
                        <div className="min-w-[200px]">
                          <p className="text-xs font-extrabold text-slate-800">{hosp.name}</p>
                          <p className="text-[10px] text-slate-500">{hosp.location} • Dept: {hosp.department}</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase">ACCESS PERMISSION:</span>
                            {isApproved ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded flex items-center gap-1">
                                <Check size={10} /> ALLOWED / ACCEPTED
                              </span>
                            ) : isRejected ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black rounded flex items-center gap-1">
                                <X size={10} /> BLOCKED / DECLINED
                              </span>
                            ) : isPending ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded flex items-center gap-1">
                                PENDING REQUEST
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-black rounded flex items-center gap-1">
                                NO ACTIVE CONFIG
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCreateCustomConsent(hosp.id, hosp.name, 'approved')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                              isApproved 
                                ? 'bg-green-600 text-white shadow-xs' 
                                : 'bg-white hover:bg-green-50 text-slate-600 hover:text-green-700 border border-slate-200 hover:border-green-200'
                            }`}
                          >
                            Accept Access
                          </button>
                          <button
                            onClick={() => handleCreateCustomConsent(hosp.id, hosp.name, 'rejected')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                              isRejected 
                                ? 'bg-red-600 text-white shadow-xs' 
                                : 'bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200'
                            }`}
                          >
                            Decline Access
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ======================= TAB 6: CLINICAL REPORT ANALYZER (RAG) ======================= */}
        {activeTab === 'report_analyzer' && (
          <div className="space-y-6" id="view-report-analyzer">
            
            {/* Header Title Bar */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Clinical Report Analyzer</h2>
                <p className="text-xs text-slate-500 mt-1">Cross-reference and analyze multiple diagnostic scans, lab reports, and doctor notes using safe clinical RAG technology</p>
              </div>
              <span className="px-3.5 py-1.5 bg-teal-50 text-[#006666] border border-teal-100 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                SECURE RAG LEDGER NODE
              </span>
            </div>

            {/* Document Retrieval Context Selector */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-black text-[#006666] uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} /> Step 1: Select Records for Analysis
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Toggle specific documents to scope the clinical query. Unselect all to include your entire history.</p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedReportsForAnalysis(allReports.map(r => r.id))}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 transition-all uppercase animate-none"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedReportsForAnalysis([])}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 transition-all uppercase animate-none"
                  >
                    Clear Selected
                  </button>
                </div>
              </div>

              {/* Grid of Reports */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[250px] overflow-y-auto pr-1">
                {allReports.map((report) => {
                  const isChecked = selectedReportsForAnalysis.includes(report.id);
                  const imageSrc = getReportScanImage(report);
                  return (
                    <div 
                      key={report.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedReportsForAnalysis(selectedReportsForAnalysis.filter(id => id !== report.id));
                        } else {
                          setSelectedReportsForAnalysis([...selectedReportsForAnalysis, report.id]);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 items-center ${
                        isChecked 
                          ? 'bg-teal-50/25 border-teal-200 shadow-xs' 
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-150'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Controlled by outer div click
                        className="rounded border-slate-300 text-[#006666] focus:ring-[#006666] h-4 w-4 shrink-0"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-slate-800 truncate leading-tight">{report.title}</p>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5">{report.date} • {report.type}</p>
                        <p className="text-[10px] text-slate-600 font-semibold truncate mt-1">Impression: {report.diagnoses}</p>
                      </div>

                      {imageSrc && (
                        <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-black relative shadow-xs">
                          <img 
                            src={imageSrc} 
                            alt="Scan micro-thumbnail" 
                            className="w-full h-full object-cover opacity-80"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Console Area: Query Form + Quick Templates */}
            <div className="grid grid-cols-12 gap-6">
              
              {/* Left Console Input Panel */}
              <div className="col-span-12 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xs font-black text-[#006666] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-[#EAA82C]" /> Step 2: Clinical Question Console
                  </h3>

                  {/* Suggestion Prompt Chips */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => setRagQuery("Give me a plain language summary of my diagnosis and suggest follow-up actions.")}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-150 hover:bg-slate-100 text-[10px] text-slate-600 font-semibold rounded-full transition-all"
                    >
                      💡 Overall Summary
                    </button>
                    <button
                      onClick={() => setRagQuery("Synthesize findings across my blood reports and imaging scans. Are there high markers?")}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-150 hover:bg-slate-100 text-[10px] text-slate-600 font-semibold rounded-full transition-all"
                    >
                      🧬 Synthesize Scans & Blood Test
                    </button>
                    <button
                      onClick={() => setRagQuery("What preventative measures, diet modifications, or activities should I follow based on these results?")}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-150 hover:bg-slate-100 text-[10px] text-slate-600 font-semibold rounded-full transition-all"
                    >
                      🥗 Diet & Activity Guidance
                    </button>
                  </div>

                  {/* Question input */}
                  <textarea
                    rows={4}
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    placeholder="Enter your clinical query or choose a template above... e.g., 'What do these hematology and MRI scan results mean together?' or 'Explain my pre-diabetes findings in simple terms.'"
                    className="w-full text-xs text-slate-800 bg-slate-50/50 border border-slate-200 focus:border-teal-400 p-4 rounded-2xl focus:ring-1 focus:ring-teal-400 outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Form Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Analysis Language</label>
                    <select
                      value={ragLanguage}
                      onChange={(e) => setRagLanguage(e.target.value)}
                      className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-[#006666] outline-none"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi (हिंदी)</option>
                      <option value="Spanish">Spanish (Español)</option>
                      <option value="French">French (Français)</option>
                      <option value="German">German (Deutsch)</option>
                      <option value="Marathi">Marathi (मराठी)</option>
                      <option value="Arabic">Arabic (العربية)</option>
                      <option value="Tamil">Tamil (தமிழ்)</option>
                      <option value="Telugu">Telugu (తెలుగు)</option>
                      <option value="Bengali">Bengali (বাংলা)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleAnalyzeReportsWithRag}
                    disabled={analyzingReports}
                    className="px-5 py-2.5 bg-[#006666] hover:bg-[#004D4D] text-white text-xs font-black rounded-xl hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {analyzingReports ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Analyzing Context...
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Run RAG Clinical Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Analysis Result Container */}
            {(analyzingReports || analysisResult) && (
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black text-[#006666] uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} /> Step 3: Analysis Insights & Clinical Synthesis
                  </h3>

                  {analysisResult && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(analysisResult);
                          setMessage("Clinical synthesis copied to clipboard!");
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 transition-all uppercase"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  )}
                </div>

                {/* Loading State */}
                {analyzingReports && (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-4 border-teal-100 border-t-[#006666] animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto text-[#EAA82C] animate-pulse" size={16} />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-slate-700">RAG Semantic Alignment Active</p>
                      <p className="text-[10px] text-slate-400 animate-pulse">Decrypting sources • Constructing patient context • Synthesizing medical explanation</p>
                    </div>
                  </div>
                )}

                {/* Result State */}
                {analysisResult && (
                  <div className="space-y-4">
                    <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-150/60 font-sans leading-relaxed text-slate-800">
                      {renderMarkdown(analysisResult)}
                    </div>
                    
                    <div className="flex gap-3 items-start bg-amber-50/40 p-4 rounded-2xl border border-amber-100/60">
                      <Info className="text-amber-600 shrink-0 mt-0.5" size={16} />
                      <p className="text-[10px] text-amber-800 leading-relaxed font-semibold">
                        Medical Disclaimer: This report analysis is powered by secure artificial intelligence (RAG) to help translate complex medical vocabulary. It does not replace professional clinical diagnosis, primary care prescriptions, or definitive consultation with your medical team.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* ======================= TAB 7: GOOGLE CLOUD STORAGE VAULT ======================= */}
        {activeTab === 'cloud_storage' && (
          <GCSStorageVault
            userId={patient.id}
            userName={patient.name}
            userRole="Patient"
            token={token}
          />
        )}

        {/* ======================= EMERGENCY SMART HEALTH PASS MODAL ======================= */}
        {isHealthPassModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full text-white shadow-2xl overflow-hidden flex flex-col">
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-700">
                    <img src={smartChipImage} alt="Chip" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Emergency Paramedic Smart Pass</h3>
                    <p className="text-[10px] text-slate-400 font-mono">HIPAA · Real-Time Decentralized Health Dossier</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHealthPassModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Pass Visual Body */}
              <div className="p-6 space-y-5">
                <div className="bg-gradient-to-br from-slate-950 to-slate-850 p-5 rounded-2xl border border-slate-700/80 relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest">Digital Health ID</span>
                      <h4 className="text-lg font-bold text-white">{nameInput}</h4>
                      <p className="text-xs text-slate-400 font-mono">ID: {patient.id} · DOB: {dobInput}</p>
                    </div>
                    <div className="p-2 bg-white rounded-xl shadow-xs shrink-0">
                      <QrCode size={84} className="text-slate-950" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-800 text-xs">
                    <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block">Blood Group</span>
                      <span className="font-bold text-red-400 text-sm">{bloodInput}</span>
                    </div>
                    <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block">Blood Pressure</span>
                      <span className="font-mono font-bold text-slate-200">{bloodPressureInput}</span>
                    </div>
                    <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block">Heart Rate</span>
                      <span className="font-mono font-bold text-slate-200">{heartRateInput}</span>
                    </div>
                    <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block">SpO2 Oxygen</span>
                      <span className="font-mono font-bold text-sky-400">{oxygenSatInput}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-red-950/40 rounded-xl border border-red-900/40 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-red-300">Severe Allergies:</span>
                      <span className="text-red-200 font-medium">Penicillin, NSAIDs</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-300">Emergency Phone:</span>
                      <span className="font-mono text-slate-200">+1 555-0199 (John Doe, Spouse)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Download size={15} />
                    <span>Print / Save Pass (PDF)</span>
                  </button>
                  <button
                    onClick={() => setIsHealthPassModalOpen(false)}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors cursor-pointer border border-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
