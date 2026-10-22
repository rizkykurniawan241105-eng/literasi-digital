import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Download, 
  Search, 
  Filter, 
  Calendar, 
  BookOpen, 
  Eye, 
  X,
  GraduationCap,
  BarChart3,
  TrendingUp,
  Edit3,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Flame,
  Sparkles,
  User,
  UserCog,
  BarChart2,
  LineChart as LineChartIcon,
  ChevronDown,
  Save,
  Check,
  Printer,
  BookCheck,
  UserX,
  Inbox,
  FileCheck2,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Building2,
  PenTool,
  Coins,
  Award,
  Bookmark,
  Lock,
  Clock,
  MinusCircle,
  PlusCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import ExcelJS from 'exceljs';
import { ReadingReport, UserProfile } from '../../types';
import { calculateReportPoints, countWords, getReportLocalDate } from '../../utils/pointsAndSchedule';
import { exportLiteracyReportToDoc } from '../../utils/docExport';
import { UserManagementModal } from './UserManagementModal';

interface DashboardMonitoringTabProps {
  reports: ReadingReport[];
  classList?: string[];
  loading: boolean;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
  onValidateReport?: (
    reportId: string, 
    status: 'Diverifikasi' | 'Setujui_Bonus' | 'Setujui_Standar' | 'Ditolak', 
    bonusPoints: number, 
    penaltyPoints: number, 
    note: string,
    summaryGrade?: number
  ) => Promise<void>;
  allUsers?: UserProfile[];
  onForceLogoutUser?: (userId: string) => Promise<void>;
  onDeleteUser?: (userId: string, userEmail?: string) => Promise<void>;
  onResetUserData?: (userId: string, userEmail?: string) => Promise<void>;
}

const AVATAR_PRESETS = [
  { id: '1', name: 'Guru Pria', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
  { id: '2', name: 'Guru Wanita', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200' },
  { id: '3', name: 'Petugas Perpustakaan', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200' },
  { id: '4', name: 'Koordinator Literasi', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200' },
];

export const DashboardMonitoringTab: React.FC<DashboardMonitoringTabProps> = ({
  reports,
  classList = [],
  loading,
  currentUser,
  onLogout,
  onUpdateProfile,
  onValidateReport,
  allUsers = [],
  onForceLogoutUser,
  onDeleteUser,
  onResetUserData,
}) => {
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  // Table filters
  const [selectedClass, setSelectedClass] = useState('Semua Kelas');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportDetail, setSelectedReportDetail] = useState<ReadingReport | null>(null);

  // Chart state & filters
  const [chartRange, setChartRange] = useState<'7days' | '30days' | 'month'>('7days');
  const [chartSelectedMonth, setChartSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [chartMetric, setChartMetric] = useState<'all' | 'reports' | 'students'>('all');

  // Edit Profile Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editJabatan, setEditJabatan] = useState(currentUser?.kelas || 'Pengelola Literasi / Guru');
  const [editPhotoURL, setEditPhotoURL] = useState(currentUser?.photoURL || '');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Modal Validation, Bonus, Penalty Points & Summary Grade State
  const [modalCustomPoints, setModalCustomPoints] = useState<number>(0);
  const [modalPenaltyPoints, setModalPenaltyPoints] = useState<number>(0);
  const [modalSummaryGrade, setModalSummaryGrade] = useState<number>(85);
  const [modalValidationStatus, setModalValidationStatus] = useState<'Diverifikasi' | 'Setujui_Bonus' | 'Setujui_Standar' | 'Ditolak'>('Diverifikasi');
  const [modalValidationNote, setModalValidationNote] = useState<string>('');
  const [isSavingValidation, setIsSavingValidation] = useState(false);

  useEffect(() => {
    if (selectedReportDetail) {
      const initialBonus = selectedReportDetail.adminBonusPoints !== undefined 
        ? selectedReportDetail.adminBonusPoints 
        : (selectedReportDetail.status === 'Setujui_Bonus' ? 30 : 0);
      const initialPenalty = selectedReportDetail.adminPenaltyPoints !== undefined
        ? selectedReportDetail.adminPenaltyPoints
        : 0;
      const initialGrade = selectedReportDetail.summaryGrade !== undefined
        ? Math.min(100, Math.max(0, selectedReportDetail.summaryGrade))
        : Math.min(100, Math.max(0, selectedReportDetail.baseTotalPoints ?? 85));

      setModalCustomPoints(initialBonus);
      setModalPenaltyPoints(initialPenalty);
      setModalSummaryGrade(initialGrade);
      setModalValidationStatus(
        selectedReportDetail.status && selectedReportDetail.status !== 'Terkirim'
          ? (selectedReportDetail.status as any)
          : 'Diverifikasi'
      );
      setModalValidationNote(selectedReportDetail.validationNote || '');
    }
  }, [selectedReportDetail]);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingDoc, setIsExportingDoc] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportDOC = async () => {
    if (isExportingDoc) return;
    if (filteredReports.length === 0) {
      showToast('Tidak ada data laporan untuk diekspor!');
      return;
    }
    setIsExportingDoc(true);
    showToast('Sedang menyiapkan file DOC (Word)...');

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      exportLiteracyReportToDoc({
        reports: filteredReports,
        selectedClass: selectedClass,
        dateFilter: dateFilter,
        currentUser: currentUser,
        filename: `Laporan_Literasi_Sekolah_${selectedClass.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.doc`,
      });
      showToast('File DOC (Word) berhasil diunduh!');
    } catch (error) {
      console.error('Error generating DOC:', error);
      showToast('Gagal membuat file DOC Word.');
    } finally {
      setIsExportingDoc(false);
    }
  };

  const handleValidateAction = async (
    reportId: string,
    status: 'Diverifikasi' | 'Setujui_Bonus' | 'Setujui_Standar' | 'Ditolak',
    bonusPts: number,
    penaltyPts: number,
    note: string,
    summaryGrade?: number
  ) => {
    if (!onValidateReport) return;
    setValidatingId(reportId);
    try {
      await onValidateReport(reportId, status, bonusPts, penaltyPts, note, summaryGrade);
      if (selectedReportDetail && selectedReportDetail.id === reportId) {
        setSelectedReportDetail({
          ...selectedReportDetail,
          status,
          adminBonusPoints: bonusPts,
          adminPenaltyPoints: penaltyPts,
          validationNote: note,
          summaryGrade: summaryGrade,
          validatedAt: new Date().toISOString(),
          validatedBy: currentUser?.name || 'Guru / Admin Perpustakaan',
        });
      }
    } catch (err) {
      console.error('Failed to validate report:', err);
    } finally {
      setValidatingId(null);
    }
  };

  const handleSaveModalValidation = async () => {
    if (!selectedReportDetail) return;
    setIsSavingValidation(true);
    try {
      const finalBonus = modalValidationStatus === 'Ditolak' ? 0 : Math.max(0, Number(modalCustomPoints) || 0);
      const finalPenalty = modalValidationStatus === 'Ditolak' ? 0 : Math.max(0, Number(modalPenaltyPoints) || 0);
      const finalGrade = modalValidationStatus === 'Ditolak' 
        ? 0 
        : Math.min(100, Math.max(0, Number(modalSummaryGrade) || 0));
      const finalStatus = modalValidationStatus === 'Ditolak' 
        ? 'Ditolak' 
        : (finalBonus > 0 ? 'Setujui_Bonus' : 'Diverifikasi');

      await handleValidateAction(
        selectedReportDetail.id,
        finalStatus,
        finalBonus,
        finalPenalty,
        modalValidationNote,
        finalGrade
      );
      showToast(`Status laporan (${finalStatus === 'Ditolak' ? 'Ditolak ❌' : 'Selesai / Terverifikasi ✔️'}) & Nilai (${finalGrade}/100) berhasil disimpan!`);
      setSelectedReportDetail(null);
    } catch (e) {
      console.error('Error saving modal validation:', e);
      showToast('Gagal menyimpan validasi poin.');
    } finally {
      setIsSavingValidation(false);
    }
  };

  // Accurate Local Date Helpers
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const sevenDaysAgoDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const thirtyDaysAgoDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  // --- DYNAMIC DASHBOARD STATISTICS ---
  // 1. Total Siswa Terdaftar (Count of all student accounts in database)
  const totalRegisteredStudents = useMemo(() => {
    const studentAccounts = allUsers.filter(u => u.role !== 'admin');
    const uniqueUserIdsFromReports = new Set(reports.map(r => r.userId || r.userEmail || r.userName).filter(Boolean));
    return Math.max(studentAccounts.length, uniqueUserIdsFromReports.size);
  }, [allUsers, reports]);

  // 2. Aktif Membaca (Jumlah siswa yang membaca / kirim laporan bulan ini)
  const activeStudentsThisMonth = useMemo(() => {
    const ids = new Set<string>();
    reports.forEach((rep) => {
      const repDate = getReportLocalDate(rep);
      if (repDate && typeof repDate === 'string' && repDate.startsWith(currentMonthStr)) {
        ids.add(rep.userId || rep.userEmail || rep.userName);
      }
    });
    return ids.size;
  }, [reports, currentMonthStr]);

  // 3. Belum Membaca (Jumlah siswa yang belum ada aktivitas membaca bulan ini)
  const inactiveStudentsThisMonth = useMemo(() => {
    return Math.max(0, totalRegisteredStudents - activeStudentsThisMonth);
  }, [totalRegisteredStudents, activeStudentsThisMonth]);

  // 4. Laporan Masuk (Jumlah rangkuman siswa yang menunggu validasi/disetujui)
  const pendingValidationReportsCount = useMemo(() => {
    return reports.filter(r => !r.status || r.status === 'Terkirim' || r.status === 'Menunggu_Validasi' || r.status === 'Pending').length;
  }, [reports]);

  // Unique students who read today
  const studentsReadToday = useMemo(() => {
    const idsToday = new Set<string>();
    reports.forEach((rep) => {
      if (getReportLocalDate(rep) === todayStr) {
        idsToday.add(rep.userId || rep.userEmail || rep.userName);
      }
    });
    return idsToday.size;
  }, [reports, todayStr]);

  const reportsTodayCount = useMemo(() => {
    return reports.filter((rep) => getReportLocalDate(rep) === todayStr).length;
  }, [reports, todayStr]);

  // --- REAL-TIME CHART DATA GENERATION ---
  const chartData = useMemo(() => {
    const dates: string[] = [];
    const now = new Date();

    if (chartRange === '7days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${day}`);
      }
    } else if (chartRange === '30days') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${day}`);
      }
    } else if (chartRange === 'month') {
      const [year, month] = chartSelectedMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dayFormatted = String(day).padStart(2, '0');
        const monthFormatted = String(month).padStart(2, '0');
        dates.push(`${year}-${monthFormatted}-${dayFormatted}`);
      }
    }

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

    return dates.map((dateStr) => {
      const matchingReports = reports.filter((r) => {
        const rDate = getReportLocalDate(r);
        return rDate === dateStr;
      });

      const uniqueStudentsSet = new Set(
        matchingReports.map((r) => r.userId || r.userEmail || r.userName).filter(Boolean)
      );

      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);

      const formattedLabel = `${dayNames[dateObj.getDay()]}, ${d} ${monthNames[m - 1]}`;
      const shortLabel = chartRange === '30days' 
        ? `${d}/${m}` 
        : `${d} ${monthNames[m - 1]}`;

      return {
        dateStr,
        formattedLabel,
        shortLabel,
        totalReports: matchingReports.length,
        uniqueStudents: uniqueStudentsSet.size,
      };
    });
  }, [reports, chartRange, chartSelectedMonth]);

  // Chart Summary Indicators
  const peakDay = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    let maxItem = chartData[0];
    for (const item of chartData) {
      if (item.totalReports > maxItem.totalReports) {
        maxItem = item;
      }
    }
    return maxItem.totalReports > 0 ? maxItem : null;
  }, [chartData]);

  const averageReportsPerDay = useMemo(() => {
    if (!chartData || chartData.length === 0) return '0';
    const total = chartData.reduce((acc, curr) => acc + curr.totalReports, 0);
    return (total / chartData.length).toFixed(1);
  }, [chartData]);

  // Filtered reports for table
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      if (selectedClass !== 'Semua Kelas' && rep.kelas !== selectedClass) {
        return false;
      }

      const repDateStr = getReportLocalDate(rep);

      if (dateFilter === 'today') {
        if (repDateStr !== todayStr) return false;
      } else if (dateFilter === 'week') {
        if (!repDateStr) return false;
        const [y, m, d] = repDateStr.split('-').map(Number);
        const repDate = new Date(y, m - 1, d);
        if (repDate < sevenDaysAgoDate) return false;
      } else if (dateFilter === 'month') {
        if (!repDateStr) return false;
        const [y, m, d] = repDateStr.split('-').map(Number);
        const repDate = new Date(y, m - 1, d);
        if (repDate < thirtyDaysAgoDate) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (rep.userName || '').toLowerCase().includes(q) ||
          (rep.userEmail || '').toLowerCase().includes(q) ||
          (rep.kelas || '').toLowerCase().includes(q) ||
          (rep.bookTitle || '').toLowerCase().includes(q) ||
          (rep.summary || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [reports, selectedClass, dateFilter, searchQuery, todayStr, sevenDaysAgoDate, thirtyDaysAgoDate]);

  // Save profile edits
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

  // Export to Excel / CSV function using ExcelJS
  const exportToExcel = async () => {
    if (filteredReports.length === 0) {
      alert('Tidak ada data laporan untuk diekspor!');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap Literasi Sekolah');

      // Requested columns: [ No | Nama Siswa | Kelas | Judul Buku | Tanggal Baca | Durasi Baca | Rangkuman | Poin Utama | Bonus Poin | Total Poin | Status Validasi ]
      worksheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Nama Siswa', key: 'userName', width: 25 },
        { header: 'Kelas', key: 'kelas', width: 12 },
        { header: 'Judul Buku', key: 'bookTitle', width: 30 },
        { header: 'Tanggal Baca', key: 'tanggalBaca', width: 22 },
        { header: 'Durasi Baca', key: 'durasiBaca', width: 16 },
        { header: 'Rangkuman', key: 'summary', width: 50 },
        { header: 'Poin Utama', key: 'poinUtama', width: 14 },
        { header: 'Bonus Poin', key: 'bonusPoin', width: 14 },
        { header: 'Total Poin', key: 'totalPoin', width: 14 },
        { header: 'Status Validasi', key: 'statusValidasi', width: 22 },
      ];

      filteredReports.forEach((rep, index) => {
        const pts = calculateReportPoints(rep);
        worksheet.addRow({
          no: index + 1,
          userName: rep.userName || '-',
          kelas: rep.kelas || '-',
          bookTitle: rep.bookTitle || '-',
          tanggalBaca: rep.timestamp 
            ? new Date(rep.timestamp).toLocaleString('id-ID')
            : (rep.dateStr || '-'),
          durasiBaca: rep.pagesRead || 'Halaman Dibaca',
          summary: rep.summary || '-',
          poinUtama: pts.baseReadingPoints + pts.summaryWordCountPoints,
          bonusPoin: pts.adminBonusPoints,
          totalPoin: pts.totalPoints,
          statusValidasi: pts.statusLabel,
        });
      });

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF005AC1' }
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Laporan_Literasi_Sekolah_${selectedClass.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      showToast("Data Laporan Literasi Berhasil Diunduh (File Excel/CSV)");
    } catch (err) {
      console.error('Error exporting excel:', err);
      alert('Gagal mengekspor data ke Excel.');
    }
  };

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs border border-slate-700 space-y-1">
          <div className="font-bold text-amber-300">{data.formattedLabel}</div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">Total Laporan:</span>
            <span className="font-black text-sky-400">{data.totalReports} Kiriman</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">Siswa Unik Membaca:</span>
            <span className="font-black text-emerald-400">{data.uniqueStudents} Siswa</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in print-container">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#005AC1] via-blue-700 to-indigo-800 p-6 sm:p-7 rounded-[28px] text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 no-print">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-blue-100 text-xs font-bold mb-2 border border-white/25">
            <Users className="w-3.5 h-3.5 text-amber-300" />
            <span>Dasbor Pemantauan Guru & Petugas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Dasbor Monitoring & Analisis Literasi Digital Sekolah
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl leading-relaxed">
            Pantau aktivitas membaca, evaluasi rangkuman, dan rekap poin siswa secara terpadu.
          </p>
        </div>

        {/* Dual Export Buttons (Excel & DOC Word) */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={exportToExcel}
            className="py-2.5 px-4 bg-white hover:bg-[#EEF3FF] active:bg-blue-50 text-[#001A41] font-extrabold text-xs rounded-full transition-all shadow-md flex items-center gap-2 border border-[#D8E2FF] cursor-pointer"
            title="Ekspor Data Laporan yang Sedang Difilter ke Format Excel (XLSX)"
          >
            <Download className="w-4 h-4 text-[#005AC1]" />
            <span>Ekspor XLS (Sesuai Filter)</span>
          </button>

          <button
            onClick={handleExportDOC}
            disabled={isExportingDoc}
            className="py-2.5 px-4 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-75 text-slate-950 font-black text-xs rounded-full transition-all shadow-md flex items-center gap-2 cursor-pointer"
            title="Unduh Laporan Resmi Sesuai Filter ke Format Microsoft Word (.doc)"
          >
            {isExportingDoc ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Sedang Mengunduh...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-slate-950" />
                <span>Ekspor DOC (Word)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 DYNAMIC SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* a. Total Siswa Terdaftar (Clickable to open User Management Modal) */}
        <div 
          onClick={() => setIsUserManagementModalOpen(true)}
          className="bg-white p-5 rounded-[24px] border border-[#E2E8F8] shadow-xs hover:shadow-lg hover:border-[#005AC1]/50 active:scale-[0.99] transition-all flex items-center justify-between group cursor-pointer"
          title="Klik untuk membuka Manajemen & Pengontrolan Akun Siswa"
          id="stat-card-total-students"
        >
          <div>
            <div className="text-2xl font-black text-slate-900 group-hover:text-[#005AC1] transition-colors flex items-center gap-2">
              <span>{totalRegisteredStudents}</span>
              <span className="text-xs font-semibold text-slate-500">Siswa</span>
              <span className="text-[10px] font-extrabold bg-[#EEF3FF] text-[#005AC1] px-2 py-0.5 rounded-full border border-blue-200 group-hover:bg-[#005AC1] group-hover:text-white transition-colors">
                Kelola ⚙️
              </span>
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#005AC1]" />
              <span>Total Siswa Terdaftar</span>
            </div>
            <div className="text-[10px] text-[#005AC1] font-bold mt-0.5 group-hover:underline flex items-center gap-1">
              <span>Kelola & Kontrol Akun Siswa</span>
              <span>→</span>
            </div>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-[#EEF3FF] text-[#005AC1] flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs group-hover:scale-110 group-hover:bg-[#005AC1] group-hover:text-white transition-all">
            <Users className="w-7 h-7" />
          </div>
        </div>

        {/* b. Aktif Membaca Bulan Ini */}
        <div className="bg-white p-5 rounded-[24px] border border-emerald-100 shadow-xs hover:shadow-md transition-all flex items-center justify-between group">
          <div>
            <div className="text-2xl font-black text-emerald-700">
              {activeStudentsThisMonth} <span className="text-xs font-semibold text-slate-500">Siswa</span>
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1.5">
              <BookCheck className="w-4 h-4 text-emerald-600" />
              <span>Aktif Membaca</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Siswa membaca / kirim laporan bulan ini</div>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        </div>

        {/* c. Belum Membaca Bulan Ini */}
        <div className="bg-white p-5 rounded-[24px] border border-amber-100 shadow-xs hover:shadow-md transition-all flex items-center justify-between group">
          <div>
            <div className="text-2xl font-black text-amber-600">
              {inactiveStudentsThisMonth} <span className="text-xs font-semibold text-slate-500">Siswa</span>
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-amber-600" />
              <span>Belum Membaca</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Belum ada aktivitas membaca bulan ini</div>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 shadow-2xs group-hover:scale-105 transition-transform">
            <AlertCircle className="w-7 h-7" />
          </div>
        </div>

        {/* d. Laporan Masuk Pending Validasi */}
        <div 
          onClick={() => {
            setDateFilter('all');
            const el = document.getElementById('report-table-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white p-5 rounded-[24px] border border-indigo-100 shadow-xs hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
          title="Klik untuk ke tabel validasi laporan"
        >
          <div>
            <div className="text-2xl font-black text-indigo-700">
              {pendingValidationReportsCount} <span className="text-xs font-semibold text-slate-500">Laporan</span>
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1.5">
              <Inbox className="w-4 h-4 text-indigo-600" />
              <span>Laporan Masuk</span>
            </div>
            <div className="text-[10px] text-indigo-500 font-semibold mt-0.5">Menunggu validasi guru / petugas</div>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200 shadow-2xs group-hover:scale-105 transition-transform">
            <FileText className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* ================= 2. GRAFIK MONITORING LITERASI HARIAN ================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6 no-print">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 text-[#1E40AF] font-black text-base">
              <BarChart3 className="w-5 h-5 text-[#1E40AF]" />
              <h3>Grafik Monitoring Literasi Harian</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Statistik visual tren aktivitas membaca dan kiriman laporan siswa dengan skala otomatis (Auto-Scale Y-Axis).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Metric Selector (Semua / Laporan / Siswa) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-700">
              <button
                onClick={() => setChartMetric('all')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  chartMetric === 'all' ? 'bg-white text-[#1E40AF] shadow-xs font-black' : 'hover:text-slate-900'
                }`}
                title="Tampilkan Laporan & Siswa Membaca"
              >
                Semua
              </button>
              <button
                onClick={() => setChartMetric('reports')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  chartMetric === 'reports' ? 'bg-white text-[#1E40AF] shadow-xs font-black' : 'hover:text-slate-900'
                }`}
                title="Hanya Total Laporan"
              >
                Laporan
              </button>
              <button
                onClick={() => setChartMetric('students')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  chartMetric === 'students' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'hover:text-slate-900'
                }`}
                title="Hanya Siswa Membaca"
              >
                Siswa
              </button>
            </div>

            {/* Range Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-700">
              <button
                onClick={() => setChartRange('7days')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  chartRange === '7days' ? 'bg-white text-[#1E40AF] shadow-xs font-black' : 'hover:text-slate-900'
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => setChartRange('30days')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  chartRange === '30days' ? 'bg-white text-[#1E40AF] shadow-xs font-black' : 'hover:text-slate-900'
                }`}
              >
                30 Hari
              </button>
              <button
                onClick={() => setChartRange('month')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  chartRange === 'month' ? 'bg-white text-[#1E40AF] shadow-xs font-black' : 'hover:text-slate-900'
                }`}
              >
                Bulan
              </button>
            </div>

            {/* Month Dropdown if Month Filter is selected */}
            {chartRange === 'month' && (
              <select
                value={chartSelectedMonth}
                onChange={(e) => setChartSelectedMonth(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-hidden"
              >
                <option value="2026-08">Agustus 2026</option>
                <option value="2026-07">Juli 2026</option>
                <option value="2026-06">Juni 2026</option>
                <option value="2026-05">Mei 2026</option>
                <option value="2026-04">April 2026</option>
                <option value="2026-03">Maret 2026</option>
              </select>
            )}

            {/* Chart Type Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  chartType === 'bar' ? 'bg-[#1E40AF] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grafik Batang"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  chartType === 'line' ? 'bg-[#1E40AF] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grafik Garis"
              >
                <LineChartIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 3 Summary Indicators Above Chart */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E40AF] text-white flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500">Total Laporan Hari Ini</div>
              <div className="text-base font-black text-slate-900">{reportsTodayCount} Laporan</div>
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500">Hari Paling Aktif</div>
              <div className="text-xs font-black text-emerald-900 truncate max-w-[170px]">
                {peakDay ? `${peakDay.formattedLabel} (${peakDay.totalReports} Lap)` : 'Belum Ada Data'}
              </div>
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500">Rata-rata Laporan / Hari</div>
              <div className="text-base font-black text-slate-900">{averageReportsPerDay} Laporan/Hari</div>
            </div>
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="flex flex-wrap items-center justify-end gap-4 text-xs font-bold px-1">
          {(chartMetric === 'all' || chartMetric === 'reports') && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#1E40AF]" />
              <span className="text-slate-700">Total Laporan Masuk</span>
            </div>
          )}
          {(chartMetric === 'all' || chartMetric === 'students') && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#10B981]" />
              <span className="text-slate-700">Siswa Aktif Membaca</span>
            </div>
          )}
          <span className="text-[11px] font-medium text-slate-400">
            • Auto-Scale Y-Axis Aktif
          </span>
        </div>

        {/* Recharts Container with Auto-Scale Sumbu Y */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="shortLabel" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} 
                />
                <YAxis 
                  allowDecimals={false}
                  domain={[
                    0,
                    (dataMax: number) => {
                      if (dataMax <= 0) return 5;
                      if (dataMax <= 5) return 6;
                      if (dataMax <= 20) return Math.ceil((dataMax + 2) / 5) * 5;
                      if (dataMax <= 50) return Math.ceil((dataMax * 1.15) / 5) * 5;
                      if (dataMax <= 100) return Math.ceil((dataMax * 1.15) / 10) * 10;
                      if (dataMax <= 500) return Math.ceil((dataMax * 1.12) / 25) * 25;
                      if (dataMax <= 1000) return Math.ceil((dataMax * 1.1) / 50) * 50;
                      return Math.ceil((dataMax * 1.08) / 100) * 100;
                    }
                  ]}
                  tickLine={false} 
                  axisLine={false} 
                  width={38}
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                  tickFormatter={(val: number) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`)}
                />
                <Tooltip content={<CustomChartTooltip />} />
                {(chartMetric === 'all' || chartMetric === 'reports') && (
                  <Bar 
                    dataKey="totalReports" 
                    name="Total Laporan" 
                    fill="#1E40AF" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={36}
                  />
                )}
                {(chartMetric === 'all' || chartMetric === 'students') && (
                  <Bar 
                    dataKey="uniqueStudents" 
                    name="Siswa Membaca" 
                    fill="#10B981" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={36}
                  />
                )}
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="shortLabel" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} 
                />
                <YAxis 
                  allowDecimals={false}
                  domain={[
                    0,
                    (dataMax: number) => {
                      if (dataMax <= 0) return 5;
                      if (dataMax <= 5) return 6;
                      if (dataMax <= 20) return Math.ceil((dataMax + 2) / 5) * 5;
                      if (dataMax <= 50) return Math.ceil((dataMax * 1.15) / 5) * 5;
                      if (dataMax <= 100) return Math.ceil((dataMax * 1.15) / 10) * 10;
                      if (dataMax <= 500) return Math.ceil((dataMax * 1.12) / 25) * 25;
                      if (dataMax <= 1000) return Math.ceil((dataMax * 1.1) / 50) * 50;
                      return Math.ceil((dataMax * 1.08) / 100) * 100;
                    }
                  ]}
                  tickLine={false} 
                  axisLine={false} 
                  width={38}
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                  tickFormatter={(val: number) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`)}
                />
                <Tooltip content={<CustomChartTooltip />} />
                {(chartMetric === 'all' || chartMetric === 'reports') && (
                  <Line 
                    type="monotone" 
                    dataKey="totalReports" 
                    name="Total Laporan"
                    stroke="#1E40AF" 
                    strokeWidth={3} 
                    dot={{ fill: '#1E40AF', r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                )}
                {(chartMetric === 'all' || chartMetric === 'students') && (
                  <Line 
                    type="monotone" 
                    dataKey="uniqueStudents" 
                    name="Siswa Membaca"
                    stroke="#10B981" 
                    strokeWidth={3} 
                    dot={{ fill: '#10B981', r: 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Toolbar for Table */}
      <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs space-y-3 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Class Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
              <span>Filter Kelas</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-hidden font-medium text-slate-800"
            >
              <option value="Semua Kelas">Semua Kelas (X - XII)</option>
              {classList.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>Filter Waktu / Tanggal</span>
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-[11px] font-medium">
              <button
                onClick={() => setDateFilter('today')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateFilter === 'today' ? 'bg-white text-sky-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setDateFilter('week')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateFilter === 'week' ? 'bg-white text-sky-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => setDateFilter('month')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateFilter === 'month' ? 'bg-white text-sky-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 Hari
              </button>
              <button
                onClick={() => setDateFilter('all')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateFilter === 'all' ? 'bg-white text-sky-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
            </div>
          </div>

          {/* Search Query */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-sky-600" />
              <span>Pencarian Data</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama, email, atau judul..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Official School Letterhead Kop Surat (@media print only) */}
      <div className="print-only mb-6 text-black">
        {/* Kop Surat Header */}
        <div className="text-center space-y-0.5 border-b-4 border-double border-black pb-3">
          <h3 className="text-xs font-bold tracking-widest uppercase text-black">
            PEMERINTAH PROVINSI / DINAS PENDIDIKAN DAN KEBUDAYAAN
          </h3>
          <h1 className="text-base sm:text-lg font-black tracking-wide uppercase text-black">
            SMA NEGERI 1 LITERASI DIGITAL INDONESIA
          </h1>
          <p className="text-[9.5pt] text-black font-medium">
            Jl. Pendidikan Karakter Literasi No. 12 | Telp: (021) 555-0123 | Website: www.literasidigital.sch.id
          </p>
        </div>

        {/* Sub-Header Document Title */}
        <div className="text-center mt-3 space-y-1">
          <h2 className="text-sm font-black underline tracking-tight uppercase text-black">
            LAPORAN REKAPITULASI KEGIATAN LITERASI DIGITAL SISWA
          </h2>
          <p className="text-[8.5pt] font-semibold text-black">
            Rekapitulasi Aktivitas Membaca, Refleksi Rangkuman & Validasi Poin Siswa
          </p>

          <div className="text-[8pt] text-black pt-1 flex items-center justify-center gap-4 mt-1 font-medium">
            <span>Kelas: <strong className="font-bold">{selectedClass}</strong></span>
            <span>•</span>
            <span>Periode: <strong className="font-bold">{dateFilter === 'today' ? 'Hari Ini' : dateFilter === 'week' ? '7 Hari Terakhir' : dateFilter === 'month' ? '30 Hari Terakhir' : 'Semua Data'}</strong></span>
            <span>•</span>
            <span>Tanggal Cetak: <strong className="font-bold">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
            <span>•</span>
            <span>Jumlah: <strong className="font-bold">{filteredReports.length} Laporan</strong></span>
          </div>
        </div>
      </div>

      {/* Monitoring Table */}
      <div id="report-table-section" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden scroll-mt-20">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between no-print">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Tabel Rekap Laporan Literasi Real-Time ({filteredReports.length})</span>
          </h2>

          <div className="text-xs text-slate-500 font-medium">
            Tampilkan: <span className="text-emerald-700 font-bold">{selectedClass}</span> • <span className="text-slate-700 font-bold">{dateFilter.toUpperCase()}</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Menyingkronkan data rekap dari Firestore...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Tidak ada laporan sesuai filter</p>
            <p className="text-xs text-slate-400">Coba atur ulang kelas, tanggal, atau kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-4">Tanggal & Waktu</th>
                  <th className="py-2.5 px-4">Siswa & Kelas</th>
                  <th className="py-2.5 px-4">Judul Buku</th>
                  <th className="py-2.5 px-4">Rangkuman / Refleksi</th>
                  <th className="py-2.5 px-4">Total Poin</th>
                  <th className="py-2.5 px-4">Status Validasi</th>
                  <th className="py-2.5 px-4 text-center no-print">Aksi Validasi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((rep, idx) => {
                  const formattedTime = rep.timestamp
                    ? new Date(rep.timestamp).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : rep.dateStr || '-';
                  const pts = calculateReportPoints(rep);
                    const isVerified = rep.status === 'Diverifikasi' || rep.status === 'Setujui_Bonus' || rep.status === 'Setujui_Standar';
                    const isRejected = rep.status === 'Ditolak';
                    const isPending = !isVerified && !isRejected;
                    const isLocked = isVerified || isRejected;

                    return (
                      <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                          {formattedTime}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{rep.userName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-2 py-0.5 bg-[#EEF3FF] text-[#005AC1] rounded-md font-extrabold text-[10px]">
                              {rep.kelas}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{rep.userEmail}</span>
                          </div>
                          {rep.isLockedDueToCheating ? (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-rose-100 text-rose-700 font-bold text-[9px] rounded-md">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              <span>Terkunci (Pelanggaran Tab)</span>
                            </span>
                          ) : rep.tabSwitchCount && rep.tabSwitchCount > 0 ? (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 font-medium text-[9px] rounded-md">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>{rep.tabSwitchCount}x Pindah Tab</span>
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 max-w-[150px]">
                          <div>{rep.bookTitle}</div>
                          <div className="text-[10px] text-slate-500 font-normal">Hal: {rep.pagesRead}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-[220px]">
                          <p className="line-clamp-2">{rep.ringkasanIsi || rep.summary}</p>
                          <span className="text-[10px] font-bold text-slate-400">({pts.wordCount} Kata)</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {pts.isRejected ? (
                            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-full text-[11px] border border-rose-200">
                              0 Poin (Ditolak)
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="font-extrabold text-[#005AC1] text-xs">
                                +{pts.totalPoints} Poin
                              </div>
                              <div className="text-[10px] text-slate-500 no-print">
                                Dasar +{pts.baseTotalPoints} 
                                {pts.adminBonusPoints > 0 ? ` | Bonus +${pts.adminBonusPoints}` : ''}
                                {pts.adminPenaltyPoints > 0 ? ` | Penalti -${pts.adminPenaltyPoints}` : ''}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isVerified && (
                            <div className="space-y-1">
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-full text-[10px] inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 no-print" />
                                <span>Selesai / Terverifikasi ✔️</span>
                              </span>
                              {rep.summaryGrade !== undefined && (
                                <div className="mt-1">
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-md font-extrabold text-[10px] inline-flex items-center gap-1">
                                    <Award className="w-3 h-3 text-amber-600" />
                                    <span>Nilai: {rep.summaryGrade}/100</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {isRejected && (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-full text-[10px] inline-flex items-center gap-1">
                              <X className="w-3.5 h-3.5 text-rose-600 no-print" />
                              <span>Ditolak ❌</span>
                            </span>
                          )}
                          {isPending && (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px] inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600 no-print" />
                              <span>Menunggu Validasi</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            {isLocked ? (
                              <button
                                onClick={() => setSelectedReportDetail(rep)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
                                title="Laporan sudah diverifikasi dan berstatus terkunci. Klik untuk melihat ulasan lengkap & feedback guru."
                              >
                                <Lock className="w-3 h-3 text-slate-500" />
                                <span>Lihat Detail (Terkunci)</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedReportDetail(rep)}
                                className="px-3 py-1.5 bg-[#005AC1] hover:bg-[#00479A] text-white rounded-xl text-[10px] font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                title="Buka Detail Review Lengkap, Input Bonus / Penalti, dan Catatan Feedback Guru"
                              >
                                <FileCheck2 className="w-3.5 h-3.5 text-amber-300" />
                                <span>Verifikasi & Nilai</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Validation Signatures Block (@media print only) */}
      <div className="print-only signature-section mt-10 pt-6 border-t border-slate-400">
        <div className="flex items-start justify-between px-8 text-black">
          {/* Sebelah Kiri: Kepala Sekolah */}
          <div className="text-center w-64 space-y-1">
            <p className="text-xs font-semibold">Mengetahui,</p>
            <p className="text-xs font-bold uppercase tracking-wider">Kepala Sekolah</p>
            <div className="h-20" />
            <p className="text-xs font-bold underline">Dr. H. Ahmad Dahlan, M.Pd.</p>
            <p className="text-[10px] text-black font-medium">NIP. 19750817 200003 1 001</p>
          </div>

          {/* Sebelah Kanan: Pembina / Koordinator Literasi */}
          <div className="text-center w-64 space-y-1">
            <p className="text-xs font-semibold">
              Kota Literasi, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider">Pembina / Koordinator Literasi</p>
            <div className="h-20" />
            <p className="text-xs font-bold underline">{currentUser?.name || 'Siti Rahmawati, S.Pd.'}</p>
            <p className="text-[10px] text-black font-medium">NIP. 19821124 200801 2 005</p>
          </div>
        </div>
      </div>

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

      {/* Detail Modal with 4 Structured Review Sections, Bonus & Penalty Points, and Teacher Feedback */}
      {selectedReportDetail && (() => {
        const breakdown = calculateReportPoints(selectedReportDetail);
        const rawSummaryText = selectedReportDetail.ringkasanIsi || selectedReportDetail.summary || '';
        const modalWordCount = selectedReportDetail.summaryWordCount ?? countWords(rawSummaryText);
        const has50Words = modalWordCount >= 50;

        // Current prospective calculation based on modal inputs
        const currentCustomBonus = modalValidationStatus === 'Ditolak' ? 0 : Math.max(0, Number(modalCustomPoints) || 0);
        const currentPenalty = modalValidationStatus === 'Ditolak' ? 0 : Math.max(0, Number(modalPenaltyPoints) || 0);
        const currentBasePoints = modalValidationStatus === 'Ditolak' ? 0 : breakdown.baseTotalPoints;
        const currentTotalCalculated = modalValidationStatus === 'Ditolak' 
          ? 0 
          : Math.max(0, currentBasePoints + currentCustomBonus - currentPenalty);

        const isVerified = selectedReportDetail.status === 'Diverifikasi' || selectedReportDetail.status === 'Setujui_Bonus' || selectedReportDetail.status === 'Setujui_Standar';
        const isRejected = selectedReportDetail.status === 'Ditolak';
        const isLocked = isVerified || isRejected;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-[28px] shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#005AC1] via-blue-700 to-indigo-700 text-white p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <FileCheck2 className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Review & Verifikasi Laporan Siswa</h3>
                    <p className="text-xs text-blue-100">Penilaian Poin Komponen, Bonus, Penalti, dan Catatan Feedback Guru</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReportDetail(null)}
                  className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-6 space-y-5 text-xs overflow-y-auto flex-1 scrollbar-thin">
                {/* 0. Status Terkunci Banner (if already verified or rejected) */}
                {isLocked && (
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-2xs ${
                    isRejected
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-2 font-bold">
                      {isRejected ? (
                        <X className="w-5 h-5 text-rose-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      <div>
                        <div className="font-black text-sm flex items-center gap-1.5">
                          <Lock className="w-4 h-4" />
                          <span>Status: {isRejected ? 'Ditolak ❌' : 'Selesai / Terverifikasi ✔️'}</span>
                        </div>
                        <div className="text-[11px] font-normal opacity-90 mt-0.5">
                          {isRejected 
                            ? 'Laporan ini telah ditolak oleh guru/admin (0 Poin).'
                            : `Total Poin: +${breakdown.totalPoints} Poin (Dasar: ${breakdown.baseTotalPoints}${breakdown.adminBonusPoints > 0 ? `, Bonus: +${breakdown.adminBonusPoints}` : ''}${breakdown.adminPenaltyPoints > 0 ? `, Penalti: -${breakdown.adminPenaltyPoints}` : ''})`
                          }
                        </div>
                      </div>
                    </div>

                    {selectedReportDetail.validatedBy && (
                      <div className="text-right text-[11px] text-slate-600 bg-white/70 px-3 py-1.5 rounded-xl border border-black/5 shrink-0">
                        <div>Diverifikasi oleh: <strong className="text-slate-900">{selectedReportDetail.validatedBy}</strong></div>
                        {selectedReportDetail.validatedAt && (
                          <div className="text-[10px] text-slate-500">
                            {new Date(selectedReportDetail.validatedAt).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 1. Student Identity Header */}
                <div className="bg-[#EEF3FF] p-4 rounded-2xl border border-blue-100 space-y-2">
                  <div className="text-[11px] font-bold text-[#001A41] uppercase tracking-wider flex items-center justify-between">
                    <span>Identitas Siswa Pengirim</span>
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-extrabold">
                      {selectedReportDetail.kelas}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-bold">Nama Lengkap</div>
                      <div className="font-bold text-[#001A41] text-xs truncate">{selectedReportDetail.userName}</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-bold">Email Akun</div>
                      <div className="text-slate-600 text-xs truncate">{selectedReportDetail.userEmail}</div>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-bold">Waktu Pengiriman</div>
                      <div className="text-slate-700 font-medium text-xs">
                        {selectedReportDetail.timestamp
                          ? new Date(selectedReportDetail.timestamp).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : selectedReportDetail.dateStr}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exambro Anti-Cheat & Integrity Audit Status */}
                {(selectedReportDetail.tabSwitchCount !== undefined || selectedReportDetail.isLockedDueToCheating) && (
                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                    selectedReportDetail.isLockedDueToCheating || (selectedReportDetail.tabSwitchCount && selectedReportDetail.tabSwitchCount >= 4)
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : selectedReportDetail.tabSwitchCount && selectedReportDetail.tabSwitchCount > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {selectedReportDetail.isLockedDueToCheating ? (
                        <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                      ) : selectedReportDetail.tabSwitchCount && selectedReportDetail.tabSwitchCount > 0 ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      <div>
                        <div className="font-black text-xs">
                          Integritas Exambro: {selectedReportDetail.isLockedDueToCheating ? 'Form Terkunci (Pelanggaran Berulang)' : selectedReportDetail.tabSwitchCount ? `${selectedReportDetail.tabSwitchCount}x Pindah Tab Terdeteksi` : 'Pengerjaan Bersih (0x Pindah Tab)'}
                        </div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          {selectedReportDetail.isLockedDueToCheating
                            ? 'Siswa terdeteksi meninggalkan halaman pengerjaan melebihi batas toleransi 3x.'
                            : selectedReportDetail.tabSwitchCount && selectedReportDetail.tabSwitchCount > 0
                            ? 'Siswa terdeteksi berpindah tab browser atau meminimalkan jendela pengerjaan saat mengisi ulasan.'
                            : 'Siswa menyelesaikan laporan ulasan tanpa berpindah tab browser atau aplikasi.'}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] shrink-0 border ${
                      selectedReportDetail.isLockedDueToCheating
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : selectedReportDetail.tabSwitchCount
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      {selectedReportDetail.isLockedDueToCheating ? '🔒 Terkunci / Curang' : `${selectedReportDetail.tabSwitchCount || 0}x Pindah Tab`}
                    </span>
                  </div>
                )}

                {/* 2. 4-Section Structured Review Display with Point Badges */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-[#001A41] uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#005AC1]" />
                      <span>Rincian Ulasan Buku Terstruktur</span>
                    </div>
                    <span className="text-[11px] font-black text-[#005AC1] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      Poin Dasar: {breakdown.baseTotalPoints} / 100 Poin
                    </span>
                  </div>

                  {/* Section A: Identitas Buku (+10 Poin) */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5 text-[#005AC1]">
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Identitas Buku & Halaman</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        breakdown.q1IdentitasPoints > 0
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}>
                        +{breakdown.q1IdentitasPoints} / 10 Poin
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px]">Judul Buku: </span>
                        <strong className="text-slate-900">{selectedReportDetail.identitasBuku?.judul || selectedReportDetail.bookTitle}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Penulis: </span>
                        <span className="text-slate-800 font-medium">{selectedReportDetail.identitasBuku?.penulis || selectedReportDetail.bookAuthor || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Penerbit: </span>
                        <span className="text-slate-800 font-medium">{selectedReportDetail.identitasBuku?.penerbit || selectedReportDetail.bookPublisher || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Tahun / Halaman: </span>
                        <span className="text-slate-800 font-medium">
                          {selectedReportDetail.identitasBuku?.tahunTerbit || selectedReportDetail.bookPublishYear || '-'} (Hal: {selectedReportDetail.identitasBuku?.halamanDibaca || selectedReportDetail.pagesRead})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 1. Ringkasan Isi Buku (+30 Poin) */}
                  <div className="bg-blue-50/40 p-4 rounded-2xl border border-blue-100 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-[11px] flex items-center gap-2 text-[#005AC1]">
                        <span className="text-sm">📝</span>
                        <FileText className="w-4 h-4 text-[#005AC1]" />
                        <span className="text-xs font-bold text-[#001A41]">1. Ringkasan Isi Buku</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        breakdown.q2RingkasanPoints > 0
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        +{breakdown.q2RingkasanPoints} / 30 Poin ({modalWordCount} Kata {has50Words ? '✓ Min 50 Kata' : 'Kurang 50 kata'})
                      </span>
                    </div>
                    <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-xs bg-white p-3.5 rounded-xl border border-blue-100 font-medium">
                      {selectedReportDetail.ringkasanIsi || selectedReportDetail.summary || 'Belum diisi'}
                    </div>
                  </div>

                  {/* 2. Kelebihan Buku (+15 Poin) */}
                  <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-emerald-900 text-[11px] flex items-center gap-2">
                        <span className="text-sm">✨</span>
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-950">2. Kelebihan Buku</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        breakdown.q3KelebihanPoints > 0
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        +{breakdown.q3KelebihanPoints} / 15 Poin
                      </span>
                    </div>
                    <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-xs bg-white p-3 rounded-xl border border-emerald-100 font-medium">
                      {selectedReportDetail.kelebihanBuku && selectedReportDetail.kelebihanBuku.trim()
                        ? selectedReportDetail.kelebihanBuku
                        : <span className="text-slate-400 italic">Belum diisi / Tidak dicantumkan</span>
                      }
                    </div>
                  </div>

                  {/* 3. Kekurangan Buku (+15 Poin) */}
                  <div className="bg-rose-50/40 p-4 rounded-2xl border border-rose-100 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-rose-900 text-[11px] flex items-center gap-2">
                        <span className="text-sm">⚠️</span>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span className="text-xs font-bold text-rose-950">3. Kekurangan Buku</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        breakdown.q4KekuranganPoints > 0
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        +{breakdown.q4KekuranganPoints} / 15 Poin
                      </span>
                    </div>
                    <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-xs bg-white p-3 rounded-xl border border-rose-100 font-medium">
                      {selectedReportDetail.kekuranganBuku && selectedReportDetail.kekuranganBuku.trim()
                        ? selectedReportDetail.kekuranganBuku
                        : <span className="text-slate-400 italic">Belum diisi / Tidak dicantumkan</span>
                      }
                    </div>
                  </div>

                  {/* 4. Saran & Kelayakan Dibaca (+20 Poin) */}
                  <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-amber-950 text-[11px] flex items-center gap-2">
                        <span className="text-sm">💡</span>
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-950">4. Saran & Kelayakan Dibaca</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        breakdown.q5SaranPoints > 0
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        +{breakdown.q5SaranPoints} / 20 Poin
                      </span>
                    </div>
                    <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-xs bg-white p-3 rounded-xl border border-amber-100 font-medium">
                      {selectedReportDetail.saranKelayakan && selectedReportDetail.saranKelayakan.trim()
                        ? selectedReportDetail.saranKelayakan
                        : <span className="text-slate-400 italic">Belum diisi / Tidak dicantumkan</span>
                      }
                    </div>
                  </div>
                </div>

                {/* 3. PENILAIAN, BONUS, PENALTI & FEEDBACK GURU */}
                <div className="p-4 bg-gradient-to-br from-[#F0F5FF] to-indigo-50/50 rounded-2xl border-2 border-blue-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#001A41] uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#005AC1]" />
                      <span>Penilaian & Verifikasi Guru:</span>
                    </span>
                    <span className="text-xs font-black text-[#005AC1] bg-white px-3 py-1 rounded-full border border-blue-200 shadow-2xs">
                      Simulasi Poin Akhir: +{currentTotalCalculated} Poin
                    </span>
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Keputusan Persetujuan Laporan:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setModalValidationStatus('Diverifikasi');
                        }}
                        className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          modalValidationStatus !== 'Ditolak'
                            ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Setujui & Berikan Poin</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModalValidationStatus('Ditolak');
                        }}
                        className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          modalValidationStatus === 'Ditolak'
                            ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-600'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <X className="w-4 h-4" />
                        <span>Tolak / Minta Revisi (0 Poin)</span>
                      </button>
                    </div>
                  </div>

                  {/* Input Nilai Rangkuman (Skala 0-100) */}
                  {modalValidationStatus !== 'Ditolak' && (
                    <div className="space-y-2 bg-gradient-to-r from-amber-50/80 to-yellow-50/80 p-4 rounded-xl border border-amber-200 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-black text-amber-950 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-600" />
                          <span>Nilai Rangkuman Siswa (Skala 0 - 100):</span>
                        </label>
                        <span className="text-[10px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                          Tampil di Profil Siswa
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={modalSummaryGrade}
                            onChange={(e) => setModalSummaryGrade(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                            placeholder="85"
                            className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-hidden shadow-2xs"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-amber-700">
                            / 100
                          </span>
                        </div>

                        {/* Quick Presets for Summary Grade */}
                        <div className="flex items-center gap-1">
                          {[70, 75, 80, 85, 90, 95, 100].map((grade) => (
                            <button
                              key={`g-${grade}`}
                              type="button"
                              onClick={() => setModalSummaryGrade(grade)}
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                modalSummaryGrade === grade
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              {grade}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-900 leading-tight">
                        *Nilai ini akan dihitung sebagai rata-rata pada <strong>Kartu Kualitas Rangkuman</strong> di halaman Profil Siswa.
                      </p>
                    </div>
                  )}

                  {/* Bonus & Penalty Inputs (Only if approved) */}
                  {modalValidationStatus !== 'Ditolak' && (
                    <div className="space-y-3 bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
                      {/* Input Bonus Poin */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Bonus Poin Guru (Opsional):</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-medium">Beri apresiasi ulasan luar biasa</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={modalCustomPoints}
                              onChange={(e) => setModalCustomPoints(Math.max(0, parseInt(e.target.value) || 0))}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-950 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-hidden"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600">
                              +Poin
                            </span>
                          </div>

                          {/* Quick Presets for Bonus */}
                          <div className="flex items-center gap-1">
                            {[0, 10, 25, 30, 50].map((preset) => (
                              <button
                                key={`b-${preset}`}
                                type="button"
                                onClick={() => setModalCustomPoints(preset)}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  modalCustomPoints === preset
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                +{preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Input Penalti / Pengurangan Poin */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-rose-800 flex items-center gap-1.5">
                            <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Pengurangan / Penalti Poin (Opsional):</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-medium">Jika ulasan copy-paste / tidak sesuai</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={modalPenaltyPoints}
                              onChange={(e) => setModalPenaltyPoints(Math.max(0, parseInt(e.target.value) || 0))}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-rose-50/50 border border-rose-200 rounded-xl text-xs font-bold text-rose-950 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-hidden"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-600">
                              -Poin
                            </span>
                          </div>

                          {/* Quick Presets for Penalty */}
                          <div className="flex items-center gap-1">
                            {[0, 10, 20, 30, 50].map((preset) => (
                              <button
                                key={`p-${preset}`}
                                type="button"
                                onClick={() => setModalPenaltyPoints(preset)}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  modalPenaltyPoints === preset
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                }`}
                              >
                                -{preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Points Simulation Grid */}
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-4 gap-2 text-center text-[10px]">
                        <div className="p-1.5 bg-slate-50 rounded-lg">
                          <div className="text-slate-400 font-medium">Dasar</div>
                          <div className="font-bold text-slate-700">+{currentBasePoints}</div>
                        </div>
                        <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                          <div className="text-emerald-700 font-medium">Bonus</div>
                          <div className="font-bold text-emerald-700">+{modalCustomPoints}</div>
                        </div>
                        <div className="p-1.5 bg-rose-50 rounded-lg border border-rose-100">
                          <div className="text-rose-700 font-medium">Penalti</div>
                          <div className="font-bold text-rose-700">-{modalPenaltyPoints}</div>
                        </div>
                        <div className="p-1.5 bg-[#EEF3FF] rounded-lg border border-blue-200">
                          <div className="text-[#005AC1] font-bold">Total Akhir</div>
                          <div className="font-black text-[#005AC1]">+{currentTotalCalculated} Poin</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feedback / Note for Student */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Catatan Feedback Guru untuk Siswa (Akan tampil di Dashboard Siswa):
                    </label>
                    <textarea
                      rows={3}
                      value={modalValidationNote}
                      onChange={(e) => setModalValidationNote(e.target.value)}
                      placeholder="Contoh: Ulasan sangat bagus dan kritis! Pemahaman jalan cerita sangat mendalam. Pertahankan!"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:border-[#005AC1] focus:ring-2 focus:ring-blue-500/20 outline-hidden font-medium resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer with "Simpan & Kunci Verifikasi" */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedReportDetail(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  Batal / Tutup
                </button>

                <button
                  type="button"
                  onClick={handleSaveModalValidation}
                  disabled={isSavingValidation}
                  className="px-6 py-2.5 bg-[#005AC1] hover:bg-[#00479A] text-white font-bold rounded-full text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingValidation ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Simpan & Kunci Verifikasi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* User Management & Account Control Modal */}
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        allUsers={allUsers}
        reports={reports}
        classList={classList}
        onForceLogoutUser={onForceLogoutUser}
        onDeleteUser={onDeleteUser}
        onResetUserData={onResetUserData}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-slide-up no-print">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
