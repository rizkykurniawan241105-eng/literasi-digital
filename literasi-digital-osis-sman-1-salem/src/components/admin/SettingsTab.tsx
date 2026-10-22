import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Mail, 
  GraduationCap, 
  Plus, 
  Trash2, 
  Edit2,
  Edit3,
  ShieldCheck,
  Shield,
  Crown,
  UserCheck, 
  CheckCircle2, 
  Save, 
  AlertCircle,
  AlertTriangle,
  User,
  UserCog,
  LogOut,
  X,
  Check,
  Clock,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Lock,
  Unlock,
  Info,
  Award,
  Sparkles,
  BookOpen,
  FileText,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Trophy,
  Eye,
  EyeOff
} from 'lucide-react';
import { AppSettings, UserProfile, AdminWhitelistEntry } from '../../types';
import { db } from '../../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { DEFAULT_CLASSES, sortClassNames } from '../../data/schoolConstants';

interface SettingsTabProps {
  settings: AppSettings;
  adminWhitelistDocs?: AdminWhitelistEntry[];
  onSaveSettings: (newSettings: AppSettings, customWhitelists?: AdminWhitelistEntry[]) => Promise<void>;
  loading: boolean;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
}

const ALL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const SUPER_ADMIN_EMAIL = 'rizkykurniawan241105@gmail.com';

const AVATAR_PRESETS = [
  { id: '1', name: 'Guru Pria', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
  { id: '2', name: 'Guru Wanita', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200' },
  { id: '3', name: 'Petugas Perpustakaan', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200' },
  { id: '4', name: 'Koordinator Literasi', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200' },
];

export const SettingsTab: React.FC<SettingsTabProps> = ({ 
  settings, 
  adminWhitelistDocs = [],
  onSaveSettings, 
  loading,
  currentUser,
  onLogout,
  onUpdateProfile
}) => {
  // Strict Whitelist Hierarchy State
  const [whitelists, setWhitelists] = useState<AdminWhitelistEntry[]>(() => {
    if (adminWhitelistDocs && adminWhitelistDocs.length > 0) {
      const hasSuper = adminWhitelistDocs.some(d => (d.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL);
      let list = adminWhitelistDocs.map(d => {
        if ((d.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL) {
          return { ...d, category: 'tetap' as const, name: d.name || 'Pengembang App' };
        }
        return d;
      });
      if (!hasSuper) {
        list.unshift({
          email: SUPER_ADMIN_EMAIL,
          name: 'Pengembang App',
          role: 'admin',
          category: 'tetap',
        });
      }
      return list;
    }
    return [
      { email: SUPER_ADMIN_EMAIL, name: 'Pengembang App', role: 'admin', category: 'tetap' },
    ];
  });

  // Sync with incoming Firestore adminWhitelistDocs in real-time
  React.useEffect(() => {
    if (adminWhitelistDocs && adminWhitelistDocs.length > 0) {
      const hasSuper = adminWhitelistDocs.some(d => (d.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL);
      let list = adminWhitelistDocs.map(d => {
        if ((d.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL) {
          return { ...d, category: 'tetap' as const, name: d.name || 'Pengembang App' };
        }
        return d;
      });
      if (!hasSuper) {
        list.unshift({
          email: SUPER_ADMIN_EMAIL,
          name: 'Pengembang App',
          role: 'admin',
          category: 'tetap',
        });
      }
      setWhitelists(list);
    }
  }, [adminWhitelistDocs]);

  // Current logged in admin role tier verification
  const currentUserEmail = (currentUser?.email || '').toLowerCase().trim();
  const isSuperAdminUtama = currentUserEmail === SUPER_ADMIN_EMAIL;
  const currentWhitelistEntry = whitelists.find(w => (w.email || '').toLowerCase().trim() === currentUserEmail);
  const isAdminTetap = isSuperAdminUtama || (currentWhitelistEntry?.category === 'tetap');
  const isAdminAnggota = !isAdminTetap; // Kategori 2: Admin Anggota

  // Partitioned categories for visual separation
  const adminTetapList = useMemo(() => {
    return whitelists.filter(w => {
      const em = (w.email || '').toLowerCase().trim();
      return em === SUPER_ADMIN_EMAIL || w.category === 'tetap';
    });
  }, [whitelists]);

  const adminAnggotaList = useMemo(() => {
    return whitelists.filter(w => {
      const em = (w.email || '').toLowerCase().trim();
      return em !== SUPER_ADMIN_EMAIL && w.category !== 'tetap';
    });
  }, [whitelists]);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'tetap' | 'anggota'>('anggota');
  const [adminEmails, setAdminEmails] = useState<string[]>(settings.adminEmails || []);
  const [classList, setClassList] = useState<string[]>(() => {
    const init = settings.classes && settings.classes.length > 0 ? settings.classes : DEFAULT_CLASSES;
    return sortClassNames(init);
  });

  // Schedule & Access Control States
  const [scheduleMode, setScheduleMode] = useState<'manual' | 'schedule'>(settings.scheduleMode || 'schedule');
  const [isAccessOpenManual, setIsAccessOpenManual] = useState<boolean>(settings.isAccessOpenManual ?? true);
  const [activeDays, setActiveDays] = useState<string[]>(settings.activeDays || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
  const [activeStartTime, setActiveStartTime] = useState<string>(settings.activeStartTime || '07:00');
  const [activeEndTime, setActiveEndTime] = useState<string>(settings.activeEndTime || '08:00');

  // Session Duration Settings (Minutes)
  const [readingDurationMinutes, setReadingDurationMinutes] = useState<number>(settings.readingDurationMinutes || 10);
  const [summaryDurationMinutes, setSummaryDurationMinutes] = useState<number>(settings.summaryDurationMinutes || 5);

  // Automatic Point Scheme Weights (Default: Q1: 10, Q2: 40, Q3: 25, Q4: 25)
  const [q1Weight, setQ1Weight] = useState<number>(settings.pointWeights?.q1IdentitasPoints ?? 10);
  const [q2Weight, setQ2Weight] = useState<number>(settings.pointWeights?.q2RingkasanPoints ?? 40);
  const [q3Weight, setQ3Weight] = useState<number>(settings.pointWeights?.q3KelebihanPoints ?? 25);
  const [q4Weight, setQ4Weight] = useState<number>(settings.pointWeights?.q4KekuranganPoints ?? 25);

  // Student Leaderboard & Points Visibility Control (Default: true)
  const [isLeaderboardVisible, setIsLeaderboardVisible] = useState<boolean>(settings.isLeaderboardVisible ?? true);

  const [newEmail, setNewEmail] = useState('');
  const [newClass, setNewClass] = useState('');

  // Class Edit & Delete Confirmation States
  const [editingClassOriginal, setEditingClassOriginal] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState<string>('');
  const [classToDelete, setClassToDelete] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scheduleMsg, setScheduleMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [durationMsg, setDurationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pointSchemeMsg, setPointSchemeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [visibilityMsg, setVisibilityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [classMsg, setClassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isEditingPointsRef = React.useRef<boolean>(false);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const triggerDebouncedPointWeightsSave = (weights: { q1: number; q2: number; q3: number; q4: number }) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const payload = {
          q1IdentitasPoints: weights.q1,
          q2RingkasanPoints: weights.q2,
          q3KelebihanPoints: weights.q3,
          q4KekuranganPoints: weights.q4,
        };
        // Langsung simpan ke dokumen Firestore 'settings/config'
        await setDoc(doc(db, 'settings', 'config'), {
          pointWeights: payload,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        await onSaveSettings({
          adminEmails,
          scheduleMode,
          isAccessOpenManual,
          activeDays,
          activeStartTime,
          activeEndTime,
          readingDurationMinutes,
          summaryDurationMinutes,
          isLeaderboardVisible,
          pointWeights: payload,
        });
        setPointSchemeMsg({
          type: 'success',
          text: `Skema bobot poin otomatis tersimpan ke Firestore (${weights.q1 + weights.q2 + weights.q3 + weights.q4} Poin)!`,
        });
        setTimeout(() => setPointSchemeMsg(null), 3500);
      } catch (e: any) {
        console.warn('Debounced save points warning:', e);
      }
    }, 450);
  };

  // Sync with Firestore settings whenever prop updates
  React.useEffect(() => {
    if (settings) {
      if (settings.adminEmails) setAdminEmails(settings.adminEmails);
      if (settings.classes !== undefined && settings.classes.length > 0) {
        setClassList(sortClassNames(settings.classes));
      }
      if (settings.scheduleMode) setScheduleMode(settings.scheduleMode);
      if (settings.isAccessOpenManual !== undefined) setIsAccessOpenManual(settings.isAccessOpenManual);
      if (settings.activeDays) setActiveDays(settings.activeDays);
      if (settings.activeStartTime) setActiveStartTime(settings.activeStartTime);
      if (settings.activeEndTime) setActiveEndTime(settings.activeEndTime);
      if (settings.readingDurationMinutes !== undefined) setReadingDurationMinutes(settings.readingDurationMinutes);
      if (settings.summaryDurationMinutes !== undefined) setSummaryDurationMinutes(settings.summaryDurationMinutes);
      if (settings.isLeaderboardVisible !== undefined) setIsLeaderboardVisible(settings.isLeaderboardVisible);
      if (settings.pointWeights && !isEditingPointsRef.current) {
        if (settings.pointWeights.q1IdentitasPoints !== undefined) setQ1Weight(settings.pointWeights.q1IdentitasPoints);
        if (settings.pointWeights.q2RingkasanPoints !== undefined) setQ2Weight(settings.pointWeights.q2RingkasanPoints);
        if (settings.pointWeights.q3KelebihanPoints !== undefined) setQ3Weight(settings.pointWeights.q3KelebihanPoints);
        if (settings.pointWeights.q4KekuranganPoints !== undefined) setQ4Weight(settings.pointWeights.q4KekuranganPoints);
      }
    }
  }, [settings]);

  // Edit Profile Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editJabatan, setEditJabatan] = useState(currentUser?.kelas || 'Pengelola Literasi / Guru');
  const [editPhotoURL, setEditPhotoURL] = useState(currentUser?.photoURL || '');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateProfile) {
      onUpdateProfile({
        name: editName.trim() || 'Admin Literasi',
        kelas: editJabatan.trim() || 'Pengelola Literasi / Guru',
        photoURL: editPhotoURL || undefined,
      });
      setProfileSaveSuccess(true);
      setTimeout(() => {
        setProfileSaveSuccess(false);
        setIsEditProfileOpen(false);
      }, 1200);
    }
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminAnggota) {
      setMsg({ type: 'error', text: 'Akses Ditolak: Admin Anggota tidak memiliki hak untuk menambah Whitelist Admin.' });
      return;
    }
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setMsg({ type: 'error', text: 'Masukkan format email admin yang valid!' });
      return;
    }
    if (whitelists.some(w => (w.email || '').toLowerCase().trim() === cleanEmail)) {
      setMsg({ type: 'error', text: `Email ${cleanEmail} sudah ada dalam daftar Whitelist Admin.` });
      return;
    }

    // Only Pengembang App can add Admin Tetap (Kategori 1)
    const categoryToSet: 'tetap' | 'anggota' = (newCategory === 'tetap' && isSuperAdminUtama) ? 'tetap' : 'anggota';

    const newEntry: AdminWhitelistEntry = {
      email: cleanEmail,
      name: newName.trim() || (categoryToSet === 'tetap' ? 'Admin Tetap' : 'Admin Anggota'),
      role: 'admin',
      category: categoryToSet,
      addedAt: new Date().toISOString(),
      addedBy: currentUser?.name || (isSuperAdminUtama ? 'Pengembang App' : 'Admin Tetap'),
    };

    const updated = [...whitelists, newEntry];
    setWhitelists(updated);
    setAdminEmails(updated.map(w => w.email.toLowerCase().trim()));
    setNewEmail('');
    setNewName('');
    setNewCategory('anggota');
    setMsg({
      type: 'success',
      text: `Admin ${cleanEmail} berhasil ditambahkan sebagai ${categoryToSet === 'tetap' ? 'Admin Tetap (Kategori 1)' : 'Admin Anggota (Kategori 2)'}! Tekan "Simpan Pengaturan" di atas untuk menyimpan ke database.`
    });
  };

  const handleRemoveAdmin = (targetEmail: string) => {
    const cleanTarget = targetEmail.toLowerCase().trim();

    // Rule 1: Pengembang App (rizkykurniawan241105@gmail.com) can NEVER be deleted!
    if (cleanTarget === SUPER_ADMIN_EMAIL) {
      setMsg({
        type: 'error',
        text: 'Perlindungan Sistem: Pengembang App (rizkykurniawan241105@gmail.com) bersifat PERMANEN dan tidak dapat dihapus!'
      });
      return;
    }

    // Rule 2: Admin Anggota cannot delete anyone!
    if (isAdminAnggota) {
      setMsg({
        type: 'error',
        text: 'Akses Ditolak: Admin Anggota tidak memiliki hak akses untuk mengelola atau menghapus daftar Whitelist Admin.'
      });
      return;
    }

    const targetEntry = whitelists.find(w => (w.email || '').toLowerCase().trim() === cleanTarget);
    const isTargetTetap = targetEntry?.category === 'tetap';

    // Rule 3: Only Pengembang App can delete other Admin Tetap!
    if (isTargetTetap && !isSuperAdminUtama) {
      setMsg({
        type: 'error',
        text: 'Akses Ditolak: Hanya Pengembang App yang berhak menghapus Admin Tetap lain!'
      });
      return;
    }

    // Rule 4: Admin Tetap biasa can delete Admin Anggota
    const updated = whitelists.filter(w => (w.email || '').toLowerCase().trim() !== cleanTarget);
    setWhitelists(updated);
    setAdminEmails(updated.map(w => w.email.toLowerCase().trim()));
    setMsg({
      type: 'success',
      text: `Admin ${targetEmail} berhasil dihapus dari daftar whitelist.`
    });
  };

  const handleRemoveEmail = (email: string) => {
    handleRemoveAdmin(email);
  };

  // Class Management Handlers
  const handleSaveClassesList = async (updatedList: string[]) => {
    const sorted = sortClassNames(updatedList);
    setClassList(sorted);
    setSaving(true);
    setClassMsg(null);
    try {
      // 1. Direct write to 'school_settings/classes'
      await setDoc(doc(db, 'school_settings', 'classes'), {
        list: sorted,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // 2. Direct write to 'settings/config'
      await setDoc(doc(db, 'settings', 'config'), {
        classes: sorted,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // 3. Direct write to 'school_classes/list'
      await setDoc(doc(db, 'school_classes', 'list'), {
        list: sorted,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // 4. Update individual class documents
      for (const cls of sorted) {
        const key = cls.trim().toUpperCase().replace(/[^a-zA-Z0-9]/g, '_');
        if (key) {
          await setDoc(doc(db, 'school_classes', key), {
            name: cls.trim().toUpperCase(),
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      await onSaveSettings({
        adminEmails,
        classes: sorted,
        scheduleMode,
        isAccessOpenManual,
        activeDays,
        activeStartTime,
        activeEndTime,
        readingDurationMinutes,
        summaryDurationMinutes,
        isLeaderboardVisible,
        pointWeights: {
          q1IdentitasPoints: Math.max(0, q1Weight || 0),
          q2RingkasanPoints: Math.max(0, q2Weight || 0),
          q3KelebihanPoints: Math.max(0, q3Weight || 0),
          q4KekuranganPoints: Math.max(0, q4Weight || 0),
        },
      });

      setClassMsg({ type: 'success', text: `Daftar ${sorted.length} kelas berhasil disimpan permanen ke database Firestore!` });
      setTimeout(() => setClassMsg(null), 4000);
    } catch (err: any) {
      console.error('Error saving classes:', err);
      setClassMsg({ type: 'error', text: err?.message || 'Gagal menyimpan kelas ke database.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaultClasses = async () => {
    await handleSaveClassesList(DEFAULT_CLASSES);
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.trim()) return;
    const clean = newClass.trim().toUpperCase();
    if (classList.includes(clean)) {
      setClassMsg({ type: 'error', text: `Kelas "${clean}" sudah ada dalam daftar!` });
      return;
    }
    const updated = sortClassNames([...classList, clean]);
    setNewClass('');
    await handleSaveClassesList(updated);
  };

  const handleStartEditClass = (cls: string) => {
    setEditingClassOriginal(cls);
    setEditingClassName(cls);
    setClassMsg(null);
  };

  const handleSaveEditClass = async () => {
    if (!editingClassOriginal) return;
    const cleanNew = editingClassName.trim().toUpperCase();
    if (!cleanNew) {
      setClassMsg({ type: 'error', text: 'Nama kelas tidak boleh kosong!' });
      return;
    }
    if (cleanNew !== editingClassOriginal && classList.includes(cleanNew)) {
      setClassMsg({ type: 'error', text: `Kelas "${cleanNew}" sudah ada!` });
      return;
    }

    const updated = sortClassNames(classList.map((c) => (c === editingClassOriginal ? cleanNew : c)));
    setEditingClassOriginal(null);
    setEditingClassName('');
    await handleSaveClassesList(updated);
  };

  const handleCancelEditClass = () => {
    setEditingClassOriginal(null);
    setEditingClassName('');
  };

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;
    const deletedName = classToDelete;
    const updated = classList.filter((c) => c !== deletedName);
    setClassToDelete(null);

    const key = deletedName.trim().toUpperCase().replace(/[^a-zA-Z0-9]/g, '_');
    if (key) {
      deleteDoc(doc(db, 'school_classes', key)).catch(() => {});
    }

    await handleSaveClassesList(updated);
  };

  const toggleDay = (day: string) => {
    if (activeDays.includes(day)) {
      if (activeDays.length <= 1) {
        setMsg({ type: 'error', text: 'Pilih minimal 1 hari aktif literasi!' });
        return;
      }
      setActiveDays(activeDays.filter((d) => d !== day));
    } else {
      setActiveDays([...activeDays, day]);
    }
    setMsg(null);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMsg(null);
    setScheduleMsg(null);
    setDurationMsg(null);
    setClassMsg(null);
    try {
      const allEmails = whitelists.map(w => (w.email || '').toLowerCase().trim());
      await onSaveSettings({
        adminEmails: allEmails,
        classes: classList,
        scheduleMode,
        isAccessOpenManual,
        activeDays,
        activeStartTime,
        activeEndTime,
        readingDurationMinutes,
        summaryDurationMinutes,
        isLeaderboardVisible,
        pointWeights: {
          q1IdentitasPoints: Math.max(0, q1Weight || 0),
          q2RingkasanPoints: Math.max(0, q2Weight || 0),
          q3KelebihanPoints: Math.max(0, q3Weight || 0),
          q4KekuranganPoints: Math.max(0, q4Weight || 0),
        },
      }, whitelists);
      setMsg({ type: 'success', text: '✅ MASTER SAVE BERHASIL: Seluruh modul sistem (Jadwal Literasi, Durasi Waktu, Bobot Poin, Visibilitas Leaderboard, Whitelist Admin & Daftar Kelas) telah disimpan serentak ke Database Firestore!' });
      setScheduleMsg({ type: 'success', text: 'Jadwal Waktu Literasi Berhasil Diperbarui!' });
      setDurationMsg({ type: 'success', text: 'Durasi waktu membaca & merangkum berhasil disimpan!' });
      setPointSchemeMsg({ type: 'success', text: 'Skema Bobot Poin Otomatis Berhasil Diperbarui!' });
      setVisibilityMsg({ type: 'success', text: 'Visibilitas Leaderboard Siswa Berhasil Diperbarui!' });
      setClassMsg({ type: 'success', text: 'Daftar Kelas berhasil disimpan ke database Firestore!' });
      setTimeout(() => {
        setScheduleMsg(null);
        setDurationMsg(null);
        setPointSchemeMsg(null);
        setVisibilityMsg(null);
        setClassMsg(null);
      }, 4000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Gagal menyimpan pengaturan.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScheduleOnly = async () => {
    setSaving(true);
    setScheduleMsg(null);
    setMsg(null);
    try {
      await onSaveSettings({
        adminEmails,
        scheduleMode,
        isAccessOpenManual,
        activeDays,
        activeStartTime,
        activeEndTime,
        readingDurationMinutes,
        summaryDurationMinutes,
        isLeaderboardVisible,
        pointWeights: {
          q1IdentitasPoints: Math.max(0, q1Weight || 0),
          q2RingkasanPoints: Math.max(0, q2Weight || 0),
          q3KelebihanPoints: Math.max(0, q3Weight || 0),
          q4KekuranganPoints: Math.max(0, q4Weight || 0),
        },
      });
      setScheduleMsg({ type: 'success', text: 'Jadwal Waktu Literasi Berhasil Diperbarui!' });
      setTimeout(() => setScheduleMsg(null), 5000);
    } catch (err: any) {
      setScheduleMsg({ type: 'error', text: err?.message || 'Gagal memperbarui jadwal.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDurationsOnly = async () => {
    setSaving(true);
    setDurationMsg(null);
    setMsg(null);
    try {
      await onSaveSettings({
        adminEmails,
        scheduleMode,
        isAccessOpenManual,
        activeDays,
        activeStartTime,
        activeEndTime,
        readingDurationMinutes: Math.max(1, readingDurationMinutes || 10),
        summaryDurationMinutes: Math.max(1, summaryDurationMinutes || 5),
        isLeaderboardVisible,
        pointWeights: {
          q1IdentitasPoints: Math.max(0, q1Weight || 0),
          q2RingkasanPoints: Math.max(0, q2Weight || 0),
          q3KelebihanPoints: Math.max(0, q3Weight || 0),
          q4KekuranganPoints: Math.max(0, q4Weight || 0),
        },
      });
      setDurationMsg({ type: 'success', text: 'Durasi membaca & merangkum berhasil disimpan ke database!' });
      setTimeout(() => setDurationMsg(null), 5000);
    } catch (err: any) {
      setDurationMsg({ type: 'error', text: err?.message || 'Gagal memperbarui durasi waktu.' });
    } finally {
      setSaving(false);
    }
  };

  // Instant Access Switch Toggle Handler - Persists directly to Firestore in real-time
  const handleToggleAccessManual = async (nextValue: boolean) => {
    setIsAccessOpenManual(nextValue);
    setSaving(true);
    try {
      await onSaveSettings({
        adminEmails,
        scheduleMode: 'manual',
        isAccessOpenManual: nextValue,
        activeDays,
        activeStartTime,
        activeEndTime,
        readingDurationMinutes,
        summaryDurationMinutes,
        isLeaderboardVisible,
        pointWeights: {
          q1IdentitasPoints: Math.max(0, q1Weight || 0),
          q2RingkasanPoints: Math.max(0, q2Weight || 0),
          q3KelebihanPoints: Math.max(0, q3Weight || 0),
          q4KekuranganPoints: Math.max(0, q4Weight || 0),
        },
      });
      setScheduleMsg({
        type: 'success',
        text: nextValue
          ? 'Sakelar Akses Laporan Berhasil LANGSUNG DIBUKA (Tersinkronisasi Realtime ke Seluruh HP Siswa)!'
          : 'Sakelar Akses Laporan Berhasil LANGSUNG DITUTUP (Tersinkronisasi Realtime ke Seluruh HP Siswa)!'
      });
      setTimeout(() => setScheduleMsg(null), 4000);
    } catch (err: any) {
      setScheduleMsg({ type: 'error', text: err?.message || 'Gagal mengubah sakelar akses laporan.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePointSchemeOnly = async () => {
    setSaving(true);
    setPointSchemeMsg(null);
    setMsg(null);
    try {
      isEditingPointsRef.current = false;
      const totalWeight = Math.max(0, q1Weight || 0) + Math.max(0, q2Weight || 0) + Math.max(0, q3Weight || 0) + Math.max(0, q4Weight || 0);
      const payload = {
        q1IdentitasPoints: Math.max(0, q1Weight || 0),
        q2RingkasanPoints: Math.max(0, q2Weight || 0),
        q3KelebihanPoints: Math.max(0, q3Weight || 0),
        q4KekuranganPoints: Math.max(0, q4Weight || 0),
      };

      // Simpan langsung ke Firestore 'settings/config'
      await setDoc(doc(db, 'settings', 'config'), {
        pointWeights: payload,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      await onSaveSettings({
        adminEmails,
        scheduleMode,
        isAccessOpenManual,
        activeDays,
        activeStartTime,
        activeEndTime,
        readingDurationMinutes: Math.max(1, readingDurationMinutes || 10),
        summaryDurationMinutes: Math.max(1, summaryDurationMinutes || 5),
        isLeaderboardVisible,
        pointWeights: payload,
      });
      setPointSchemeMsg({ 
        type: 'success', 
        text: `Skema bobot poin otomatis berhasil disimpan ke Firestore! (Total Bobot: ${totalWeight} Poin, Maksimal 100)` 
      });
      setTimeout(() => setPointSchemeMsg(null), 5000);
    } catch (err: any) {
      setPointSchemeMsg({ type: 'error', text: err?.message || 'Gagal memperbarui skema poin.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVisibilityOnly = async () => {
    setSaving(true);
    setVisibilityMsg(null);
    setMsg(null);
    try {
      await onSaveSettings({
        adminEmails,
        scheduleMode,
        isAccessOpenManual,
        activeDays,
        activeStartTime,
        activeEndTime,
        readingDurationMinutes: Math.max(1, readingDurationMinutes || 10),
        summaryDurationMinutes: Math.max(1, summaryDurationMinutes || 5),
        isLeaderboardVisible,
        pointWeights: {
          q1IdentitasPoints: Math.max(0, q1Weight || 0),
          q2RingkasanPoints: Math.max(0, q2Weight || 0),
          q3KelebihanPoints: Math.max(0, q3Weight || 0),
          q4KekuranganPoints: Math.max(0, q4Weight || 0),
        },
      });
      setVisibilityMsg({
        type: 'success',
        text: isLeaderboardVisible 
          ? 'Papan Peringkat (Leaderboard) & Poin Siswa berhasil DIAKTIFKAN (Terlihat oleh Siswa)!'
          : 'Papan Peringkat (Leaderboard) & Poin Siswa berhasil DISEMBUNYIKAN dari Siswa!',
      });
      setTimeout(() => setVisibilityMsg(null), 5000);
    } catch (err: any) {
      setVisibilityMsg({ type: 'error', text: err?.message || 'Gagal memperbarui visibilitas leaderboard.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in max-w-5xl mx-auto">
      {/* ================= 1. PROFIL ADMIN CARD ================= */}
      <div className="bg-white rounded-[28px] border border-[#E2E8F8] shadow-xs overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-[#005AC1] via-blue-700 to-indigo-800 relative flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-white/90 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Portal Otentikasi Admin / Pengelola Sekolah</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1 rounded-full text-white text-[11px] font-bold border border-white/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sistem Otentikasi Aktif</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            {/* Avatar Photo */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-[#005AC1] p-0.5 shadow-md overflow-hidden">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#005AC1] to-blue-800 text-white font-black text-2xl flex items-center justify-center rounded-full">
                    {(currentUser?.name || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#006399] text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white shadow-xs">
                GURU
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {currentUser?.name || 'Drs. Kenzo Kurniawan'}
                </h2>
                <span className="px-3 py-0.5 bg-[#C2E8FF] text-[#001E30] text-[10px] font-bold rounded-full">
                  Admin Utama
                </span>
              </div>

              <p className="text-xs text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Email/Username: <strong className="text-slate-800">{currentUser?.email || 'admin@sekolah.sch.id'}</strong></span>
              </p>

              <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full inline-block mt-1">
                Jabatan: {currentUser?.kelas || 'Pengelola Literasi / Guru Bahasa'}
              </p>
            </div>
          </div>

          {/* Actions: Edit Profil & Logout */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
            <button
              onClick={() => {
                setEditName(currentUser?.name || '');
                setEditJabatan(currentUser?.kelas || 'Pengelola Literasi / Guru');
                setEditPhotoURL(currentUser?.photoURL || '');
                setIsEditProfileOpen(true);
              }}
              className="flex-1 md:flex-initial py-2.5 px-4 bg-[#EEF3FF] hover:bg-[#D8E2FF] text-[#001A41] rounded-full text-xs font-bold transition-all border border-[#D8E2FF] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <UserCog className="w-4 h-4 text-[#005AC1]" />
              <span>Edit Profil Admin</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Keluar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-600" />
            <span>Pengaturan Sistem & Hak Akses Admin</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola daftar email berhak akses Admin / Guru serta daftar kelas siswa sekolah
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          title="Master Save: Simpan seluruh modul pengaturan, jadwal, durasi, bobot poin, whitelist admin & daftar kelas sekaligus ke database"
          className="py-3 px-6 bg-gradient-to-r from-[#005AC1] via-blue-600 to-indigo-700 hover:from-[#00479A] hover:to-indigo-800 active:from-[#003878] text-white text-xs sm:text-sm font-black rounded-2xl transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2.5 cursor-pointer shrink-0"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4.5 h-4.5 text-amber-300" />
              <span>SIMPAN PENGATURAN (MASTER SAVE)</span>
            </>
          )}
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-sky-50 border-sky-200 text-sky-900'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* ================= PENGATURAN JADWAL LITERASI & KONTROL AKSES ================= */}
      <div className="bg-white p-6 rounded-[28px] border border-[#E2E8F8] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#EEF3FF] text-[#005AC1] flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Pengaturan Jadwal Literasi & Kontrol Akses</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Atur hari & jam aktif pengiriman laporan literasi siswa atau sakelar manual akses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              (scheduleMode === 'manual' ? isAccessOpenManual : true)
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {(scheduleMode === 'manual' ? isAccessOpenManual : true) ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Akses Terbuka</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Akses Ditutup</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* 1. Mode Kontrol Akses */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Mode Kontrol Pengiriman Laporan:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScheduleMode('schedule')}
              className={`p-4 rounded-[20px] border text-left transition-all cursor-pointer flex items-start gap-3 ${
                scheduleMode === 'schedule'
                  ? 'bg-[#EEF3FF] border-[#005AC1] text-[#001A41] shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-5 h-5 text-[#005AC1] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-900">1. Mode Jadwal Otomatis</div>
                <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Akses dibuka otomatis hanya pada <strong>Hari Aktif</strong> & <strong>Jam Aktif</strong> yang telah ditentukan di bawah.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScheduleMode('manual')}
              className={`p-4 rounded-[20px] border text-left transition-all cursor-pointer flex items-start gap-3 ${
                scheduleMode === 'manual'
                  ? 'bg-[#EEF3FF] border-[#005AC1] text-[#001A41] shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ToggleLeft className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-900">2. Mode Kontrol Manual (Override)</div>
                <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Kontrol penuh lewat <strong>Sakelar Buka/Tutup</strong> langsung tanpa terikat jam/hari.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Sakelar Utama (Toggle Switch Buka/Tutup) */}
        <div className="p-4 bg-[#F8FAFF] rounded-[20px] border border-[#E2E8F8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>Sakelar Utama Access Override</span>
              {isAccessOpenManual ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">BUKA</span>
              ) : (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold rounded-full">TUTUP</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Gunakan sakelar ini untuk langsung membuka atau menutup akses pengiriman laporan literasi siswa.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleToggleAccessManual(!isAccessOpenManual)}
            className={`py-2.5 px-5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xs ${
              isAccessOpenManual
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {isAccessOpenManual ? (
              <>
                <ToggleRight className="w-5 h-5" />
                <span>Akses Sedang DIBUKA</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5" />
                <span>Akses Sedang DITUTUP</span>
              </>
            )}
          </button>
        </div>

        {/* 3. Pilihan Hari Aktif & Jam Aktif */}
        <div className={`space-y-4 pt-2 transition-opacity ${scheduleMode === 'manual' ? 'opacity-60' : 'opacity-100'}`}>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Hari Aktif Literasi Sekolah:
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => {
                const isSelected = activeDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`py-2 px-4 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#005AC1] text-white border-[#005AC1] shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {day} {isSelected ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Jam Mulai Aktif:
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="time"
                  value={activeStartTime}
                  onChange={(e) => setActiveStartTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#005AC1] outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Jam Selesai Aktif:
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="time"
                  value={activeEndTime}
                  onChange={(e) => setActiveEndTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#005AC1] outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button: Simpan Perubahan Jadwal */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {scheduleMsg ? (
            <div
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                scheduleMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {scheduleMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{scheduleMsg.text}</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 font-medium">
              *Klik tombol di samping untuk menyimpan pengaturan jadwal ke database secara langsung.
            </p>
          )}

          <button
            type="button"
            onClick={handleSaveScheduleOnly}
            disabled={saving}
            className="w-full sm:w-auto py-3 px-6 bg-[#005AC1] hover:bg-[#00479A] active:bg-[#003878] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-900/15 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Jadwal</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= PENGATURAN DURASI WAKTU LITERASI (TIMER INDIVIDUAL) ================= */}
      <div className="bg-white p-6 rounded-[28px] border border-[#E2E8F8] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Pengaturan Durasi Waktu Literasi</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Batas waktu hitung mundur membaca e-book dan mengisi rangkuman bagi setiap siswa
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-full border border-amber-200 self-start sm:self-auto flex items-center gap-1.5">
            <span>⏱️ Timer Individual Siswa</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Input 1: Durasi Membaca Buku (Menit) */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
            <label className="block text-xs font-extrabold text-slate-800">
              Durasi Membaca Buku (Menit) <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Waktu hitung mundur saat siswa membuka e-book (Default: 10 menit).
            </p>
            <div className="relative pt-1">
              <input
                type="number"
                min="1"
                max="180"
                value={readingDurationMinutes}
                onChange={(e) => setReadingDurationMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#005AC1]/20 focus:border-[#005AC1] outline-hidden shadow-2xs"
                placeholder="10"
              />
              <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                Menit
              </span>
            </div>
          </div>

          {/* Input 2: Durasi Mengisi Rangkuman (Menit) */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
            <label className="block text-xs font-extrabold text-slate-800">
              Durasi Mengisi Rangkuman (Menit) <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Batas waktu menulis ulasan sebelum auto-logout (Default: 5 menit).
            </p>
            <div className="relative pt-1">
              <input
                type="number"
                min="1"
                max="120"
                value={summaryDurationMinutes}
                onChange={(e) => setSummaryDurationMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#005AC1]/20 focus:border-[#005AC1] outline-hidden shadow-2xs"
                placeholder="5"
              />
              <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                Menit
              </span>
            </div>
          </div>
        </div>

        {/* Action Button: Simpan Pengaturan Waktu */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {durationMsg ? (
            <div
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                durationMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {durationMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{durationMsg.text}</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 font-medium">
              *Durasi ini berlaku individual per-siswa mulai dari saat siswa membuka buku.
            </p>
          )}

          <button
            type="button"
            onClick={handleSaveDurationsOnly}
            disabled={saving}
            className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:from-amber-800 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-900/15 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Waktu</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= PENGATURAN SKEMA POIN OTOMATIS (DRAFT NILAI AWAL) ================= */}
      <div className="bg-white p-6 rounded-[28px] border border-[#E2E8F8] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#005AC1] flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Pengaturan Skema Poin Otomatis</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Konfigurasi bobot poin ulasan siswa yang terakumulasi otomatis sebagai draft nilai awal (Maksimal 100 Poin)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="px-3 py-1 bg-blue-50 text-[#005AC1] text-[11px] font-extrabold rounded-full border border-blue-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Total Bobot: {q1Weight + q2Weight + q3Weight + q4Weight} / 100 Poin</span>
            </div>
          </div>
        </div>

        {/* 4 Point Weight Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Q1: Informasi Dasar Buku */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#005AC1]" />
                <span>Bobot Poin Q1</span>
              </label>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                Default: 10
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Informasi Dasar Buku & Halaman Dibaca.
            </p>
            <div className="relative pt-1">
              <input
                type="number"
                min="0"
                max="100"
                value={q1Weight}
                onChange={(e) => {
                  isEditingPointsRef.current = true;
                  const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                  setQ1Weight(val);
                  triggerDebouncedPointWeightsSave({ q1: val, q2: q2Weight, q3: q3Weight, q4: q4Weight });
                }}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#005AC1]/20 focus:border-[#005AC1] outline-hidden shadow-2xs"
                placeholder="10"
              />
              <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                Poin
              </span>
            </div>
          </div>

          {/* Q2: Ringkasan Isi Buku */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#005AC1]" />
                <span>Bobot Poin Q2</span>
              </label>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                Default: 40
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Ringkasan Isi Buku (Minimal 10 karakter).
            </p>
            <div className="relative pt-1">
              <input
                type="number"
                min="0"
                max="100"
                value={q2Weight}
                onChange={(e) => {
                  isEditingPointsRef.current = true;
                  const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                  setQ2Weight(val);
                  triggerDebouncedPointWeightsSave({ q1: q1Weight, q2: val, q3: q3Weight, q4: q4Weight });
                }}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#005AC1]/20 focus:border-[#005AC1] outline-hidden shadow-2xs"
                placeholder="40"
              />
              <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                Poin
              </span>
            </div>
          </div>

          {/* Q3: Kelebihan Buku */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                <span>Bobot Poin Q3</span>
              </label>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                Default: 25
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Kelebihan & Keunggulan Buku.
            </p>
            <div className="relative pt-1">
              <input
                type="number"
                min="0"
                max="100"
                value={q3Weight}
                onChange={(e) => {
                  isEditingPointsRef.current = true;
                  const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                  setQ3Weight(val);
                  triggerDebouncedPointWeightsSave({ q1: q1Weight, q2: q2Weight, q3: val, q4: q4Weight });
                }}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#005AC1]/20 focus:border-[#005AC1] outline-hidden shadow-2xs"
                placeholder="25"
              />
              <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                Poin
              </span>
            </div>
          </div>

          {/* Q4: Kekurangan Buku */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <ThumbsDown className="w-4 h-4 text-rose-600" />
                <span>Bobot Poin Q4</span>
              </label>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                Default: 25
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Kekurangan & Catatan Buku.
            </p>
            <div className="relative pt-1">
              <input
                type="number"
                min="0"
                max="100"
                value={q4Weight}
                onChange={(e) => {
                  isEditingPointsRef.current = true;
                  const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                  setQ4Weight(val);
                  triggerDebouncedPointWeightsSave({ q1: q1Weight, q2: q2Weight, q3: q3Weight, q4: val });
                }}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-[#005AC1]/20 focus:border-[#005AC1] outline-hidden shadow-2xs"
                placeholder="25"
              />
              <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                Poin
              </span>
            </div>
          </div>
        </div>

        {/* Action Button & Preset Reset */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setQ1Weight(10);
                setQ2Weight(40);
                setQ3Weight(25);
                setQ4Weight(25);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Default (10-40-25-25)</span>
            </button>
            {pointSchemeMsg && (
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                  pointSchemeMsg.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {pointSchemeMsg.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                )}
                <span>{pointSchemeMsg.text}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSavePointSchemeOnly}
            disabled={saving}
            className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-[#005AC1] to-blue-700 hover:from-[#00479A] hover:to-blue-800 active:from-[#003878] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-900/15 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Skema Poin</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= PENGATURAN VISIBILITAS POIN & LEADERBOARD SISWA ================= */}
      <div className="bg-white p-6 rounded-[28px] border border-[#E2E8F8] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 shadow-2xs">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Pengaturan Visibilitas Poin & Leaderboard Siswa</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Kontrol hak akses dan visibilitas papan peringkat / poin siswa sesuai jadwal pertemuan literasi sekolah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isLeaderboardVisible ? (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-extrabold rounded-full border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Leaderboard: AKTIF (Terlihat)</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-rose-50 text-rose-800 text-[11px] font-extrabold rounded-full border border-rose-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Leaderboard: DISEMBUNYIKAN</span>
              </span>
            )}
          </div>
        </div>

        {/* 2 Options Switch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option 1: ON / Aktifkan */}
          <button
            type="button"
            onClick={() => setIsLeaderboardVisible(true)}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              isLeaderboardVisible
                ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-950 shadow-xs'
                : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isLeaderboardVisible ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
            }`}>
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">1. [ON] Aktifkan & Tampilkan</span>
                {isLeaderboardVisible && (
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-extrabold">
                    Terpilih
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Menampilkan nilai/poin dan urutan peringkat siswa secara terbuka di halaman Papan Peringkat (Leaderboard).
              </p>
            </div>
          </button>

          {/* Option 2: OFF / Sembunyikan */}
          <button
            type="button"
            onClick={() => setIsLeaderboardVisible(false)}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              !isLeaderboardVisible
                ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/30 text-rose-950 shadow-xs'
                : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              !isLeaderboardVisible ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
            }`}>
              <EyeOff className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">2. [OFF] Sembunyikan Leaderboard</span>
                {!isLeaderboardVisible && (
                  <span className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-extrabold">
                    Terpilih
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Menyembunyikan poin & peringkat di sisi siswa (menampilkan pesan: <em>"Papan Peringkat belum dibuka oleh Admin"</em>).
              </p>
            </div>
          </button>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {visibilityMsg ? (
            <div
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                visibilityMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {visibilityMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{visibilityMsg.text}</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 font-medium">
              *Gunakan sakelar ini untuk menahan pengumuman poin/peringkat sebelum jadwal pertemuan literasi resmi.
            </p>
          )}

          <button
            type="button"
            onClick={handleSaveVisibilityOnly}
            disabled={saving}
            className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:from-amber-800 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-900/15 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Visibilitas</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Admin Email Manager & Firestore Whitelist with Strict Hierarchy & Visual Separation */}
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Whitelist Admin & Guru SMAN 1 Salem</h2>
                <p className="text-[11px] text-slate-500">Tersinkronisasi Realtime dengan Firestore ('admin_whitelists')</p>
              </div>
            </div>

            {/* Current Admin Role Tier Badge */}
            <div className="flex items-center gap-2">
              {isSuperAdminUtama ? (
                <span className="px-3 py-1 bg-amber-50 text-amber-900 text-[10px] font-black rounded-full border border-amber-300 flex items-center gap-1 shadow-2xs">
                  <Crown className="w-3 h-3 text-amber-600" />
                  <span>Pengembang App</span>
                </span>
              ) : isAdminTetap ? (
                <span className="px-3 py-1 bg-blue-50 text-blue-900 text-[10px] font-black rounded-full border border-blue-300 flex items-center gap-1 shadow-2xs">
                  <Shield className="w-3 h-3 text-blue-600" />
                  <span>Admin Tetap (Kategori 1)</span>
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-900 text-[10px] font-black rounded-full border border-emerald-300 flex items-center gap-1 shadow-2xs">
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  <span>Admin Anggota (Kategori 2)</span>
                </span>
              )}
            </div>
          </div>

          {/* Form Tambah Admin: Sembunyikan untuk Admin Anggota */}
          {isAdminAnggota ? (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center gap-2.5 font-medium leading-relaxed">
              <Lock className="w-4.5 h-4.5 text-amber-600 shrink-0" />
              <span>
                <strong>Akses Mode Lihat Saja:</strong> Akun Anda terdaftar sebagai <strong>Admin Anggota</strong>. Tombol kelola dan hapus Whitelist Admin disembunyikan. Hanya <strong>Admin Tetap</strong> dan <strong>Pengembang App</strong> yang berhak mengelola whitelist.
              </span>
            </div>
          ) : (
            <form onSubmit={handleAddEmail} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#005AC1]" />
                <span>Tambah Akun Admin Baru</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  required
                  placeholder="Email Google Admin (e.g. guru.literasi@gmail.com)"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#005AC1]/20 focus:border-[#005AC1] outline-hidden font-medium"
                />
                <input
                  type="text"
                  placeholder="Nama / Jabatan (e.g. Pembina OSIS)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#005AC1]/20 focus:border-[#005AC1] outline-hidden font-medium"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                {/* Pilihan Kategori Admin */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-slate-700 text-[11px]">Kategori:</span>
                  
                  {isSuperAdminUtama ? (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                        <input
                          type="radio"
                          name="adminCategory"
                          value="anggota"
                          checked={newCategory === 'anggota'}
                          onChange={() => setNewCategory('anggota')}
                          className="accent-emerald-600"
                        />
                        <span>Kategori 2 (Admin Anggota)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                        <input
                          type="radio"
                          name="adminCategory"
                          value="tetap"
                          checked={newCategory === 'tetap'}
                          onChange={() => setNewCategory('tetap')}
                          className="accent-[#005AC1]"
                        />
                        <span>Kategori 1 (Admin Tetap)</span>
                      </label>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-600 font-medium">
                      Kategori 2 (Admin Anggota) <em className="text-slate-400">*(Hanya Pengembang App yang dapat mengangkat Admin Tetap)</em>
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={saving || !newEmail.trim()}
                  className="w-full sm:w-auto py-2 px-4 bg-[#005AC1] hover:bg-[#00479A] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan ke Whitelist</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= SEKAT PEMISAH VISUAL KATEGORI 1: ADMIN TETAP ================= */}
          <div className="p-4 bg-gradient-to-br from-sky-50/60 to-blue-50/40 rounded-2xl border-2 border-sky-200/90 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-sky-200/70">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Kategori 1: Admin Tetap
                  </h3>
                </div>
              </div>
              <span className="px-2.5 py-0.5 bg-sky-100 text-sky-900 text-[10px] font-extrabold rounded-full border border-sky-300">
                {adminTetapList.length} Akun
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {adminTetapList.map((admin) => {
                const isSuperAdminEntry = (admin.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL;
                return (
                  <div
                    key={admin.email}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                      isSuperAdminEntry
                        ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                        : 'bg-white border-sky-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isSuperAdminEntry ? (
                        <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-inner">
                          <Crown className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                      )}
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 truncate">
                            {admin.name || (isSuperAdminEntry ? 'Pengembang App' : 'Admin Tetap')}
                          </span>
                          {isSuperAdminEntry ? (
                            <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full shrink-0 tracking-wider">
                              ⭐ PENGEMBANG APP (PERMANEN)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[9px] font-bold rounded-full shrink-0">
                              ADMIN TETAP
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700">{admin.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Hapus Admin Tetap:
                        - Pengembang App: TIDAK BISA DIHAPUS (Permanen, tombol hapus disembunyikan sepenuhnya)
                        - Admin Tetap lainnya: Hanya Pengembang App yang bisa menghapus
                    */}
                    {isSuperAdminEntry ? (
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-black rounded-lg border border-amber-300 shrink-0" title="Akun Pengembang App permanen tanpa tombol hapus">
                        Permanen
                      </span>
                    ) : isSuperAdminUtama ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveAdmin(admin.email)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Hapus Admin Tetap (Hanya Pengembang App)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= SEKAT PEMISAH VISUAL KATEGORI 2: ADMIN ANGGOTA ================= */}
          <div className="p-4 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 rounded-2xl border-2 border-emerald-200/90 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/70">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Kategori 2: Admin Anggota
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Operasional & Pembimbing (Pengurus OSIS / Guru Pendamping; dapat dihapus oleh Admin Tetap)
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] font-extrabold rounded-full border border-emerald-300">
                {adminAnggotaList.length} Akun
              </span>
            </div>

            {adminAnggotaList.length === 0 ? (
              <div className="p-3 bg-white/70 rounded-xl border border-dashed border-emerald-200 text-center text-[11px] text-slate-500 font-medium">
                Belum ada Admin Anggota yang ditambahkan.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {adminAnggotaList.map((admin) => (
                  <div
                    key={admin.email}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-200/80 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">
                            {admin.name || 'Admin Anggota'}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full shrink-0">
                            ADMIN ANGGOTA
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700">{admin.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Hapus Admin Anggota:
                        - Dapat dihapus oleh Pengembang App DAN Admin Tetap biasa
                        - Disembunyikan sepenuhnya jika pengguna yang login adalah Admin Anggota
                    */}
                    {(isSuperAdminUtama || isAdminTetap) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAdmin(admin.email)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Hapus Admin Anggota"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full py-2.5 px-4 bg-[#005AC1] hover:bg-[#00479A] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Perubahan Whitelist ke Database</span>
          </button>
        </div>

        {/* Card 2: Class List Manager */}
        <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Daftar Kelas Sekolah</h2>
                <p className="text-[11px] text-slate-500">Tersinkronisasi langsung dengan database Firestore</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                classList.length >= 27 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {classList.length} Kelas {classList.length === 27 ? '(Lengkap 27 Kelas)' : '(Standar: 27 Kelas)'}
              </span>
            </div>
          </div>

          {classMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                classMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {classMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{classMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleAddClass} className="flex gap-2">
            <input
              type="text"
              placeholder="Ketik nama kelas baru (contoh: XII-4)"
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-hidden uppercase placeholder:normal-case font-medium"
            />
            <button
              type="submit"
              disabled={saving || !newClass.trim()}
              className="py-2 px-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelas</span>
            </button>
          </form>

          {classList.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Info className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">Belum Ada Daftar Kelas di Database</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Daftar kelas bawaan telah dikosongkan. Silakan tambahkan nama kelas sekolah Anda (misal: X-1, XI-IPA-1, XII-4).
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 pr-1">
              {classList.map((cls) => {
                const isEditing = editingClassOriginal === cls;

                if (isEditing) {
                  return (
                    <div
                      key={cls}
                      className="p-1.5 bg-blue-50/90 rounded-xl border border-blue-300 flex items-center gap-1"
                    >
                      <input
                        type="text"
                        value={editingClassName}
                        onChange={(e) => setEditingClassName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditClass();
                          if (e.key === 'Escape') handleCancelEditClass();
                        }}
                        autoFocus
                        className="w-full px-2 py-1 text-xs font-bold bg-white border border-blue-300 rounded-lg uppercase outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleSaveEditClass}
                        disabled={saving}
                        className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Simpan Nama Kelas"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditClass}
                        className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Batal Edit"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={cls}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 transition-colors rounded-xl border border-slate-200 text-xs group"
                  >
                    <span className="font-bold text-slate-800">{cls}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditClass(cls)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Nama Kelas"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setClassToDelete(cls)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Kelas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSaveClassesList(classList)}
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-[#005AC1] hover:bg-[#00479A] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Daftar Kelas ke Firestore'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaultClasses}
              disabled={saving}
              className="py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Pulihkan seluruh 27 kelas: X-1 s.d. X-9, XI-1 s.d. XI-9, XII-1 s.d. XII-9"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
              <span>Isi Otomatis 27 Kelas SMAN 1 Salem</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL KONFIRMASI HAPUS KELAS ================= */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle className="w-7 h-7" />
              </div>
              
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Kelas</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus kelas <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">{classToDelete}</span> ini?
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Kelas akan dihapus secara permanen dari database Firestore dan siswa tidak dapat lagi memilih kelas ini.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setClassToDelete(null)}
                  disabled={saving}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteClass}
                  disabled={saving}
                  className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-red-600/30 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{saving ? 'Menghapus...' : 'Ya, Hapus Kelas'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIT PROFIL ADMIN ================= */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#1E40AF] text-white p-5 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserCog className="w-5 h-5 text-amber-300" />
                <span>Edit Profil Admin / Guru</span>
              </h3>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {profileSaveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Profil Admin berhasil diperbarui!</span>
                </div>
              )}

              {/* Nama Admin */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Nama Lengkap Admin / Guru:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Contoh: Drs. Kenzo Kurniawan"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-500/20 outline-hidden"
                />
              </div>

              {/* Jabatan / Peran */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Jabatan / Peran Pengelola:
                </label>
                <input
                  type="text"
                  value={editJabatan}
                  onChange={(e) => setEditJabatan(e.target.value)}
                  placeholder="Contoh: Pengelola Literasi / Guru Bahasa"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#1E40AF] focus:ring-2 focus:ring-blue-500/20 outline-hidden"
                />
              </div>

              {/* Avatar Preset Options */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Pilih Avatar Profil Preset:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_PRESETS.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setEditPhotoURL(avatar.url)}
                      className={`p-1 rounded-xl border-2 transition-all cursor-pointer ${
                        editPhotoURL === avatar.url ? 'border-[#1E40AF] bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={avatar.url} alt={avatar.name} className="w-full h-12 object-cover rounded-lg" />
                      <div className="text-[9px] font-bold text-slate-600 text-center mt-1 truncate">{avatar.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Atau URL Foto Kustom:
                </label>
                <input
                  type="url"
                  value={editPhotoURL}
                  onChange={(e) => setEditPhotoURL(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-[#1E40AF] outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1E40AF] hover:bg-blue-800 text-white rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
