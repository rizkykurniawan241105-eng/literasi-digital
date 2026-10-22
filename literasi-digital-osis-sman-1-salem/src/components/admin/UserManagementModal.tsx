import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  X, 
  LogOut, 
  RotateCcw, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  Flame, 
  RefreshCw,
  UserCheck,
  UserX,
  Mail,
  Shield,
  Clock,
  Sparkles
} from 'lucide-react';
import { UserProfile, ReadingReport } from '../../types';
import { calculateReportPoints } from '../../utils/pointsAndSchedule';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: UserProfile[];
  reports: ReadingReport[];
  classList?: string[];
  onForceLogoutUser?: (userId: string) => Promise<void>;
  onDeleteUser?: (userId: string, userEmail?: string) => Promise<void>;
  onResetUserData?: (userId: string, userEmail?: string) => Promise<void>;
}

type ConfirmActionType = 'logout' | 'reset' | 'delete';

interface ConfirmActionState {
  type: ConfirmActionType;
  user: UserProfile;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  allUsers,
  reports,
  classList = [],
  onForceLogoutUser,
  onDeleteUser,
  onResetUserData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('Semua Kelas');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'zero_points'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmActionState | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Only student accounts (filter out role === 'admin')
  const studentList = useMemo(() => {
    return allUsers.filter((u) => u.role !== 'admin');
  }, [allUsers]);

  // Aggregate stats per student
  const studentDataMap = useMemo(() => {
    const map = new Map<string, { totalPoints: number; reportCount: number; lastReportDate: string }>();

    studentList.forEach((u) => {
      const userReports = reports.filter((r) => r.userId === u.uid || r.userEmail === u.email);
      let points = 0;
      let latestDate = '';

      userReports.forEach((rep) => {
        points += calculateReportPoints(rep).totalPoints;
        const repDate = rep.dateStr || (rep as any).createdAt || '';
        if (repDate && (!latestDate || repDate > latestDate)) {
          latestDate = repDate;
        }
      });

      // If user profile doc has points stored and no reports, fall back
      const finalPoints = points > 0 ? points : (u.points || 0);

      map.set(u.uid, {
        totalPoints: finalPoints,
        reportCount: userReports.length,
        lastReportDate: latestDate,
      });
    });

    return map;
  }, [studentList, reports]);

  // Available classes for dropdown
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    classList.forEach((c) => set.add(c));
    studentList.forEach((u) => {
      if (u.kelas) set.add(u.kelas);
    });
    return Array.from(set).sort();
  }, [classList, studentList]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return studentList.filter((user) => {
      // 1. Search Query (Name, Email, UID)
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (user.name && user.name.toLowerCase().includes(q)) ||
        (user.email && user.email.toLowerCase().includes(q)) ||
        user.uid.toLowerCase().includes(q);

      // 2. Class filter
      const matchClass =
        selectedClass === 'Semua Kelas' ||
        user.kelas === selectedClass;

      // 3. Status filter
      const stats = studentDataMap.get(user.uid) || { totalPoints: 0, reportCount: 0, lastReportDate: '' };
      let matchStatus = true;
      if (statusFilter === 'active') {
        matchStatus = stats.reportCount > 0 || stats.totalPoints > 0;
      } else if (statusFilter === 'zero_points') {
        matchStatus = stats.reportCount === 0 && stats.totalPoints === 0;
      }

      return matchSearch && matchClass && matchStatus;
    });
  }, [studentList, searchQuery, selectedClass, statusFilter, studentDataMap]);

  // Quick Overview Numbers
  const totalStudentsCount = studentList.length;
  const activeStudentsCount = useMemo(() => {
    return studentList.filter((u) => {
      const st = studentDataMap.get(u.uid);
      return st && (st.reportCount > 0 || st.totalPoints > 0);
    }).length;
  }, [studentList, studentDataMap]);
  const zeroPointStudentsCount = totalStudentsCount - activeStudentsCount;

  // Action Executions
  const executeConfirmAction = async () => {
    if (!confirmState) return;
    const { type, user } = confirmState;
    setActionInProgress(user.uid);

    try {
      if (type === 'logout') {
        if (onForceLogoutUser) {
          await onForceLogoutUser(user.uid);
          showToast(`Sesi login untuk ${user.name || user.email} berhasil diakhiri.`);
        }
      } else if (type === 'reset') {
        if (onResetUserData) {
          await onResetUserData(user.uid, user.email);
          showToast(`Data progress, poin, dan riwayat baca untuk ${user.name || user.email} berhasil direset ke 0.`);
        }
      } else if (type === 'delete') {
        if (onDeleteUser) {
          await onDeleteUser(user.uid, user.email);
          showToast(`Akun siswa ${user.name || user.email} berhasil dihapus dari database.`);
        }
      }
      setConfirmState(null);
    } catch (err: any) {
      console.error('Error executing user action:', err);
      showToast(`Gagal memproses aksi: ${err?.message || 'Terjadi kesalahan sistem.'}`, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs p-2 sm:p-4 md:p-6 flex justify-center items-start animate-fade-in"
      style={{ WebkitOverflowScrolling: 'touch' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-5xl bg-white rounded-[24px] sm:rounded-[28px] shadow-2xl border border-slate-200 overflow-hidden my-2 sm:my-6 flex flex-col relative"
        id="user-management-modal-container"
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-[#001A41] via-[#005AC1] to-[#1E40AF] px-5 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-inner shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Manajemen & Pengontrolan Akun Siswa
                </h2>
                <span className="text-[10px] sm:text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30">
                  {totalStudentsCount} Akun
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-100 mt-0.5">
                Kelola data akun, reset sesi login, reset progress literasi ke 0, dan hapus akun duplikat.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer shrink-0 ml-2"
            title="Tutup Modal"
            id="close-user-management-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className={`mx-6 mt-3 p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-md animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Overview Stats Strip */}
        <div className="px-6 py-3 bg-[#EEF3FF]/70 border-b border-blue-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 text-xs">
          <div className="p-2.5 bg-white rounded-xl border border-blue-100 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#005AC1] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-semibold">Total Siswa</div>
              <div className="text-sm font-black text-slate-900">{totalStudentsCount}</div>
            </div>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-emerald-100 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-emerald-700 font-semibold">Aktif Membaca</div>
              <div className="text-sm font-black text-emerald-900">{activeStudentsCount}</div>
            </div>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-amber-100 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <UserX className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-amber-700 font-semibold">0 Poin / Belum Aktif</div>
              <div className="text-sm font-black text-amber-900">{zeroPointStudentsCount}</div>
            </div>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-indigo-700 font-semibold">Jumlah Kelas</div>
              <div className="text-sm font-black text-indigo-900">{availableClasses.length}</div>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa, email Google, atau UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#005AC1] focus:ring-2 focus:ring-blue-500/20 outline-hidden transition-all"
              id="search-students-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                title="Hapus Pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {/* Filter Kelas */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-class-select" className="text-xs font-bold text-slate-600 hidden sm:inline">
                Kelas:
              </label>
              <select
                id="filter-class-select"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#005AC1] focus:ring-2 focus:ring-blue-500/20 outline-hidden cursor-pointer"
              >
                <option value="Semua Kelas">Semua Kelas ({totalStudentsCount})</option>
                {availableClasses.map((cls) => {
                  const cnt = studentList.filter((u) => u.kelas === cls).length;
                  return (
                    <option key={cls} value={cls}>
                      {cls} ({cnt})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filter Status Aktivitas */}
            <div className="flex items-center gap-1.5">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#005AC1] focus:ring-2 focus:ring-blue-500/20 outline-hidden cursor-pointer"
                id="filter-status-select"
              >
                <option value="all">Semua Status ({studentList.length})</option>
                <option value="active">Aktif Ada Poin / Laporan ({activeStudentsCount})</option>
                <option value="zero_points">0 Poin / Belum Membaca ({zeroPointStudentsCount})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Flexible Table Area (Natural height, no fixed max-h constraint) */}
        <div className="p-3 sm:p-6 space-y-4 flex-1">
          {filteredStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Users className="w-7 h-7" />
              </div>
              <div className="font-bold text-sm text-slate-700">Tidak ada akun siswa yang sesuai filter</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Coba sesuaikan kata kunci pencarian atau pilih filter kelas "Semua Kelas".
              </p>
              {(searchQuery || selectedClass !== 'Semua Kelas' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedClass('Semua Kelas');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#005AC1] rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Semua Filter</span>
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Petunjuk Visual Scroll untuk Layar Mobile */}
              <div className="flex items-center justify-between gap-2 md:hidden mb-2.5 px-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl shadow-2xs">
                  <span className="text-sm">👉</span>
                  <span>Geser ke samping (scroll horizontal) untuk aksi & detail</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                  {filteredStudents.length} siswa
                </div>
              </div>

              {/* Responsive Horizontal Scroll Wrapper */}
              <div 
                className="w-full overflow-x-auto shadow-xs rounded-2xl border border-slate-200 bg-white"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <table className="w-full min-w-[760px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFF] border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider whitespace-nowrap">
                      <th className="py-3.5 px-3.5 w-12 text-center">No</th>
                      <th className="py-3.5 px-4 min-w-[220px]">Identitas Siswa</th>
                      <th className="py-3.5 px-4 min-w-[110px]">Kelas</th>
                      <th className="py-3.5 px-4 min-w-[140px]">Poin & Aktivitas</th>
                      <th className="py-3.5 px-4 min-w-[120px]">Terdaftar</th>
                      <th className="py-3.5 px-4 text-center min-w-[190px] whitespace-nowrap sticky right-0 bg-[#F8FAFF] shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.08)] border-l border-slate-200">
                        Aksi Kontrol Akun
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student, idx) => {
                      const stats = studentDataMap.get(student.uid) || {
                        totalPoints: 0,
                        reportCount: 0,
                        lastReportDate: '',
                      };

                      const registeredDateStr = student.createdAt
                        ? new Date(student.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Akun Tersimpan';

                      const isProcessing = actionInProgress === student.uid;

                      return (
                        <tr 
                          key={student.uid} 
                          className="hover:bg-blue-50/40 transition-colors group"
                          id={`user-row-${student.uid}`}
                        >
                          {/* 1. No */}
                          <td className="py-3.5 px-3.5 text-center font-bold text-slate-400 whitespace-nowrap">
                            {idx + 1}
                          </td>

                          {/* 2. Profil & Identitas */}
                          <td className="py-3.5 px-4 min-w-[220px]">
                            <div className="flex items-center gap-3">
                              {student.photoURL ? (
                                <img
                                  src={student.photoURL}
                                  alt={student.name || 'Siswa'}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[#EEF3FF] text-[#005AC1] font-black text-xs flex items-center justify-center border border-blue-200 shadow-2xs shrink-0">
                                  {(student.name || student.email || 'S').charAt(0).toUpperCase()}
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 truncate">
                                  <span className="truncate">{student.name || 'Nama Belum Diisi'}</span>
                                  {stats.totalPoints >= 100 && (
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Siswa Berprestasi" />
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate max-w-[190px]">{student.email || '-'}</span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
                                  UID: {student.uid.substring(0, 12)}...
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 3. Kelas */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] border ${
                              student.kelas 
                                ? 'bg-blue-50 text-[#005AC1] border-blue-200' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              <GraduationCap className="w-3 h-3 shrink-0" />
                              <span>{student.kelas || 'Belum Set'}</span>
                            </span>
                          </td>

                          {/* 4. Poin & Aktivitas */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-black text-xs text-emerald-700">
                                <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>+{stats.totalPoints} Poin</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <span>{stats.reportCount} Ulasan</span>
                                </span>
                                {(student.streakCount || 0) > 0 && (
                                  <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                                    <Flame className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                                    <span>{student.streakCount} Hari</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 5. Terdaftar */}
                          <td className="py-3.5 px-4 text-slate-600 text-[11px] font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{registeredDateStr}</span>
                            </div>
                          </td>

                          {/* 6. Aksi Kontrol Akun (Sticky Right Column with Touch Friendly Targets) */}
                          <td className="py-3 px-4 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-blue-50/90 transition-colors shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.08)] border-l border-slate-100">
                            {isProcessing ? (
                              <div className="flex items-center justify-center gap-2 text-slate-500 font-semibold text-[11px] min-h-[44px]">
                                <div className="w-4 h-4 border-2 border-[#005AC1] border-t-transparent rounded-full animate-spin" />
                                <span>Memproses...</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                                {/* 1. Tombol Force Logout Sesi */}
                                <button
                                  type="button"
                                  onClick={() => setConfirmState({ type: 'logout', user: student })}
                                  className="w-10 h-10 sm:w-9 sm:h-9 min-w-[40px] min-h-[40px] flex items-center justify-center bg-sky-50 hover:bg-sky-100 active:bg-sky-200 active:scale-95 text-sky-700 rounded-xl border border-sky-200 transition-all cursor-pointer group/btn shadow-2xs touch-manipulation"
                                  title="Reset / Logout Sesi Siswa (Keluarkan dari HP/Browser)"
                                  aria-label="Logout Sesi Siswa"
                                  id={`btn-logout-${student.uid}`}
                                >
                                  <LogOut className="w-4.5 h-4.5 group-hover/btn:scale-110 transition-transform" />
                                </button>

                                {/* 2. Tombol Reset Data Literasi (0 Poin) */}
                                <button
                                  type="button"
                                  onClick={() => setConfirmState({ type: 'reset', user: student })}
                                  className="w-10 h-10 sm:w-9 sm:h-9 min-w-[40px] min-h-[40px] flex items-center justify-center bg-amber-50 hover:bg-amber-100 active:bg-amber-200 active:scale-95 text-amber-700 rounded-xl border border-amber-200 transition-all cursor-pointer group/btn shadow-2xs touch-manipulation"
                                  title="Reset Seluruh Poin, Badge & Riwayat Ulasan Siswa ke 0"
                                  aria-label="Reset Data Literasi"
                                  id={`btn-reset-${student.uid}`}
                                >
                                  <RotateCcw className="w-4.5 h-4.5 group-hover/btn:scale-110 transition-transform" />
                                </button>

                                {/* 3. Tombol Hapus Akun */}
                                <button
                                  type="button"
                                  onClick={() => setConfirmState({ type: 'delete', user: student })}
                                  className="w-10 h-10 sm:w-9 sm:h-9 min-w-[40px] min-h-[40px] flex items-center justify-center bg-rose-50 hover:bg-rose-100 active:bg-rose-200 active:scale-95 text-rose-700 rounded-xl border border-rose-200 transition-all cursor-pointer group/btn shadow-2xs touch-manipulation"
                                  title="Hapus Akun Siswa & Data Terkait Permanen"
                                  aria-label="Hapus Akun Siswa"
                                  id={`btn-delete-${student.uid}`}
                                >
                                  <Trash2 className="w-4.5 h-4.5 group-hover/btn:scale-110 transition-transform" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal (At the end of the single card) */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-xs text-slate-500 rounded-b-[24px] sm:rounded-b-[28px]">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-sky-800 font-bold bg-sky-50 border border-sky-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">
              <LogOut className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Reset Sesi: Paksa Siswa Login Ulang</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-800 font-bold bg-amber-50 border border-amber-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">
              <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Reset Data: Poin & Ulasan Jadi 0</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-800 font-bold bg-rose-50 border border-rose-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">
              <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Hapus: Hapus Akun Permanen</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-3 sm:py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white rounded-full font-bold text-xs transition-all shadow-md active:scale-98 cursor-pointer w-full sm:w-auto shrink-0 text-center touch-manipulation"
            id="close-user-management-footer-btn"
          >
            Tutup Modal
          </button>
        </div>
      </div>
    </div>

    {/* ================= CONFIRMATION DIALOG MODAL OVERLAY (FIXED CENTER VIEWPORT) ================= */}
    {confirmState && (
      <div 
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget && actionInProgress === null) {
            setConfirmState(null);
          }
        }}
      >
        <div 
          className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative animate-fade-in"
          id="confirmation-dialog-card"
        >
          {/* Confirm Header */}
          <div className={`p-5 sm:p-6 text-white text-center ${
            confirmState.type === 'logout'
              ? 'bg-gradient-to-r from-sky-600 via-sky-700 to-blue-800'
              : confirmState.type === 'reset'
              ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-700'
              : 'bg-gradient-to-r from-rose-600 via-rose-700 to-red-800'
          }`}>
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-white/20 flex items-center justify-center mb-2.5 backdrop-blur-md shadow-inner">
              {confirmState.type === 'logout' && <LogOut className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
              {confirmState.type === 'reset' && <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
              {confirmState.type === 'delete' && <Trash2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />}
            </div>

            <h3 className="text-base sm:text-lg font-black tracking-tight">
              {confirmState.type === 'logout' && 'Konfirmasi Reset Sesi / Logout'}
              {confirmState.type === 'reset' && 'Konfirmasi Reset Data Siswa ke 0'}
              {confirmState.type === 'delete' && 'Konfirmasi Hapus Akun Siswa'}
            </h3>
            <p className="text-xs text-white/90 mt-1 truncate max-w-xs mx-auto">
              Akun: <strong>{confirmState.user.name || confirmState.user.email}</strong>
            </p>
          </div>

          {/* Confirm Body */}
          <div className="p-4 sm:p-5 space-y-3.5 text-xs text-slate-700">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 text-xs">
                Detail Siswa Terpilih:
              </div>
              <div className="truncate">Nama: <strong>{confirmState.user.name || '-'}</strong></div>
              <div className="truncate">Email: <strong>{confirmState.user.email}</strong></div>
              <div>Kelas: <strong>{confirmState.user.kelas || 'Belum Set'}</strong></div>
            </div>

            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
              confirmState.type === 'logout'
                ? 'bg-sky-50 border-sky-200 text-sky-950'
                : confirmState.type === 'reset'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                confirmState.type === 'logout'
                  ? 'text-sky-600'
                  : confirmState.type === 'reset'
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`} />
              <div className="text-[11px] leading-relaxed">
                {confirmState.type === 'logout' && (
                  <span>
                    Sesi login siswa di perangkat HP / Komputernya akan <strong>otomatis diputus</strong> dan dikembalikan ke halaman login. Siswa dapat login kembali kapan saja dengan data poin yang tetap utuh.
                  </span>
                )}
                {confirmState.type === 'reset' && (
                  <span>
                    Apakah Anda yakin ingin <strong>mereset seluruh poin, badge, streak, dan riwayat ulasan siswa ini ke 0</strong>? Akun siswa TIDAK dihapus, tetapi seluruh riwayat membaca akan kembali bersih seperti akun baru.
                  </span>
                )}
                {confirmState.type === 'delete' && (
                  <span>
                    Apakah Anda yakin ingin <strong>menghapus akun siswa ini secara permanen</strong> dari database Firestore? Seluruh data laporan dan profil siswa akan dihapus dan tidak dapat dipulihkan.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Confirm Buttons */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setConfirmState(null)}
              disabled={actionInProgress !== null}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 font-bold text-xs transition-all cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={executeConfirmAction}
              disabled={actionInProgress !== null}
              className={`px-5 py-2.5 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                confirmState.type === 'logout'
                  ? 'bg-sky-600 hover:bg-sky-700'
                  : confirmState.type === 'reset'
                  ? 'bg-amber-600 hover:bg-orange-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
              id="confirm-execute-action-btn"
            >
              {actionInProgress ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sedang Memproses...</span>
                </>
              ) : (
                <>
                  {confirmState.type === 'logout' && <LogOut className="w-3.5 h-3.5" />}
                  {confirmState.type === 'reset' && <RotateCcw className="w-3.5 h-3.5" />}
                  {confirmState.type === 'delete' && <Trash2 className="w-3.5 h-3.5" />}
                  <span>
                    {confirmState.type === 'logout' && 'Ya, Logout Sesi Siswa'}
                    {confirmState.type === 'reset' && 'Ya, Reset Data ke 0'}
                    {confirmState.type === 'delete' && 'Ya, Hapus Akun Permanen'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
};
