import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Award, 
  Sparkles, 
  Search, 
  GraduationCap, 
  BarChart3, 
  TrendingUp, 
  Star,
  Users,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { ReadingReport, UserProfile } from '../../types';
import { calculateReportPoints } from '../../utils/pointsAndSchedule';

interface AdminLeaderboardTabProps {
  reports: ReadingReport[];
  classList?: string[];
  allUsers?: UserProfile[];
}

interface StudentRank {
  userId: string;
  userName: string;
  userEmail: string;
  kelas: string;
  reportCount: number;
  totalPagesRead: number;
  points: number;
  rank: number;
  photoURL?: string;
}

export const AdminLeaderboardTab: React.FC<AdminLeaderboardTabProps> = ({
  reports,
  classList = [],
  allUsers = [],
}) => {
  const [selectedClass, setSelectedClass] = useState('Semua Kelas');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'semua' | 'bulan_ini'>('semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Top 20 students state for admin leaderboard
  const [top20Users, setTop20Users] = useState<UserProfile[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState<boolean>(true);

  useEffect(() => {
    // If allUsers is already provided from App.tsx, compute Top 20 without opening duplicate Firestore listener
    if (allUsers && allUsers.length > 0) {
      const sorted = [...allUsers]
        .filter((u) => u.role !== 'admin')
        .sort((a, b) => {
          const ptsB = (typeof b.points === 'number' ? b.points : b.totalPoints) || 0;
          const ptsA = (typeof a.points === 'number' ? a.points : a.totalPoints) || 0;
          return ptsB - ptsA;
        })
        .slice(0, 20);
      setTop20Users(sorted);
      setIsLoadingLeaderboard(false);
      return;
    }

    setIsLoadingLeaderboard(true);
    // Realtime query fallback: strictly Top 20 students ordered by points desc
    const top20Query = query(
      collection(db, 'users'),
      orderBy('points', 'desc'),
      limit(20)
    );

    const unsubTop20 = onSnapshot(
      top20Query,
      (snap) => {
        const usersList: UserProfile[] = [];
        snap.forEach((d) => {
          const u = { uid: d.id, ...d.data() } as UserProfile;
          if (u.role !== 'admin') {
            usersList.push(u);
          }
        });
        setTop20Users(usersList);
        setIsLoadingLeaderboard(false);
      },
      (err) => {
        console.warn('Admin Leaderboard top 20 query notice:', err);
        setIsLoadingLeaderboard(false);
      }
    );

    return () => {
      unsubTop20();
    };
  }, [allUsers]);

  // Current Month String YYYY-MM
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Filtered reports by timeframe
  const activeReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedTimeframe === 'bulan_ini') {
        return r.dateStr && r.dateStr.startsWith(currentMonthStr);
      }
      return true;
    });
  }, [reports, selectedTimeframe, currentMonthStr]);

  // Compute student rankings from Top 20 query (strictly 20 users max) with full fallback
  const studentRankings = useMemo(() => {
    let arr: StudentRank[] = top20Users.map((u, index) => {
      const userReports = (reports || []).filter(
        (r) =>
          (r.userId && (r.userId === u.uid || r.userId === u.email)) ||
          (r.userEmail && u.email && r.userEmail.toLowerCase() === u.email.toLowerCase())
      );
      const approvedReports = userReports.filter(
        (r) =>
          r.status === 'approved' ||
          r.status === 'Diverifikasi' ||
          r.status === 'Setujui_Bonus' ||
          r.status === 'Setujui_Standar' ||
          r.status === 'Disetujui'
      );

      const reportPointsSum = userReports.reduce(
        (acc, r) => acc + (r.pointsTotal ?? calculateReportPoints(r).totalPoints),
        0
      );
      const reportPagesSum = userReports.reduce(
        (acc, r) => acc + (parseInt(r.pagesRead || r.identitasBuku?.halamanDibaca || '1', 10) || 1),
        0
      );

      // Robust fallback implementation as requested:
      // Poin: user.points || user.totalPoints || reportPointsSum || 0
      // Jumlah Laporan: user.approvedReportsCount || user.totalReports || user.reportsCount || 0
      // Jumlah Halaman: user.totalPagesRead || user.totalPages || user.pagesRead || 0
      const storedPoints = typeof u.points === 'number' ? u.points : u.totalPoints;
      const points = (storedPoints !== undefined && storedPoints !== null)
        ? storedPoints
        : (reportPointsSum > 0 ? reportPointsSum : 0);

      const reportCount =
        u.approvedReportsCount ??
        u.totalReports ??
        u.reportsCount ??
        (approvedReports.length > 0 ? approvedReports.length : (userReports.length > 0 ? userReports.length : 0));

      const totalPagesRead =
        u.totalPagesRead ??
        u.totalPages ??
        u.pagesRead ??
        (reportPagesSum > 0 ? reportPagesSum : 0);

      const matchedName =
        u.name && u.name !== 'Siswa'
          ? u.name
          : userReports.length > 0 && userReports[0].userName && userReports[0].userName !== 'Siswa'
          ? userReports[0].userName
          : u.name || 'Siswa';

      const matchedClass =
        u.kelas && u.kelas !== 'Umum'
          ? u.kelas
          : userReports.length > 0 && userReports[0].kelas && userReports[0].kelas !== 'Umum'
          ? userReports[0].kelas
          : u.kelas || 'Umum';

      return {
        userId: u.uid || u.email,
        userName: matchedName,
        userEmail: u.email || '',
        kelas: matchedClass,
        reportCount,
        totalPagesRead,
        points,
        rank: index + 1,
        photoURL: u.photoURL,
      };
    });

    // Filter by class if selected
    if (selectedClass !== 'Semua Kelas') {
      arr = arr.filter((s) => s.kelas === selectedClass);
    }

    return arr;
  }, [top20Users, selectedClass, reports]);

  // Compute Class Rankings Comparison
  const classRankings = useMemo(() => {
    const classMap = new Map<
      string,
      { kelas: string; totalReports: number; totalPoints: number; studentCount: Set<string> }
    >();

    activeReports.forEach((rep) => {
      const cls = rep.kelas || 'Lainnya';
      const pts = calculateReportPoints(rep).totalPoints;
      if (!classMap.has(cls)) {
        classMap.set(cls, {
          kelas: cls,
          totalReports: 1,
          totalPoints: pts,
          studentCount: new Set([rep.userId || rep.userEmail]),
        });
      } else {
        const item = classMap.get(cls)!;
        item.totalReports += 1;
        item.totalPoints += pts;
        item.studentCount.add(rep.userId || rep.userEmail);
      }
    });

    const arr = Array.from(classMap.values()).map((c) => ({
      kelas: c.kelas,
      totalReports: c.totalReports,
      totalPoints: c.totalPoints,
      activeStudents: c.studentCount.size,
      avgPerStudent: (c.totalReports / (c.studentCount.size || 1)).toFixed(1),
    }));

    arr.sort((a, b) => b.totalPoints - a.totalPoints || b.totalReports - a.totalReports);
    return arr;
  }, [activeReports]);

  // Filtered by Search Query
  const filteredRankings = useMemo(() => {
    if (!searchQuery.trim()) return studentRankings;
    const q = searchQuery.toLowerCase();
    return studentRankings.filter(
      (s) =>
        s.userName.toLowerCase().includes(q) ||
        s.userEmail.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q)
    );
  }, [studentRankings, searchQuery]);

  // Top 3 Podium
  const top1 = studentRankings[0];
  const top2 = studentRankings[1];
  const top3 = studentRankings[2];

  // Overall Statistics for Leaderboard
  const totalPointsDistributed = useMemo(() => {
    return studentRankings.reduce((sum, s) => sum + s.points, 0);
  }, [studentRankings]);

  const totalReportsInScope = useMemo(() => {
    return studentRankings.reduce((sum, s) => sum + s.reportCount, 0);
  }, [studentRankings]);

  // Export Leaderboard to Excel
  const exportLeaderboardToExcel = async () => {
    if (filteredRankings.length === 0) {
      alert('Tidak ada data peringkat untuk diekspor!');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Peringkat Literasi Siswa');

      worksheet.columns = [
        { header: 'Peringkat', key: 'rank', width: 12 },
        { header: 'Nama Siswa', key: 'userName', width: 28 },
        { header: 'Email Siswa', key: 'userEmail', width: 28 },
        { header: 'Kelas', key: 'kelas', width: 14 },
        { header: 'Total Laporan', key: 'reportCount', width: 16 },
        { header: 'Total Halaman Dibaca', key: 'totalPagesRead', width: 22 },
        { header: 'Total Poin', key: 'points', width: 16 },
        { header: 'Predikat / Lencana', key: 'badge', width: 22 },
      ];

      filteredRankings.forEach((s) => {
        let badge = 'Pembaca Aktif';
        if (s.rank === 1) badge = 'Juara 1 Literasi';
        else if (s.rank === 2) badge = 'Bintang Literasi (Juara 2)';
        else if (s.rank === 3) badge = 'Duta Baca (Juara 3)';
        else if (s.rank <= 10) badge = 'Kutu Buku Utama (Top 10)';

        worksheet.addRow({
          rank: s.rank,
          userName: s.userName,
          userEmail: s.userEmail,
          kelas: s.kelas,
          reportCount: s.reportCount,
          totalPagesRead: s.totalPagesRead,
          points: s.points,
          badge,
        });
      });

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF005AC1' },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Peringkat_Literasi_Siswa_${selectedClass.replace(
        /\s+/g,
        '_'
      )}_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting leaderboard excel:', err);
      alert('Gagal mengekspor data peringkat.');
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#005AC1] via-blue-700 to-indigo-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-sky-200/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center justify-center text-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-blue-100 text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-center">PAPAN PERINGKAT LITERAL OSIS SMAN 1 SALEM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Peringkat & Rekap Prestasi Literasi Digital
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Pantau akumulasi poin prestasi membaca siswa secara real-time, evaluasi partisipasi kelas, dan berikan apresiasi kepada duta baca sekolah.
            </p>
          </div>

          {/* Export Button */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={exportLeaderboardToExcel}
              className="py-2.5 px-5 bg-white hover:bg-blue-50 text-[#001A41] font-extrabold text-xs rounded-full transition-all shadow-md flex items-center gap-2 border border-[#D8E2FF] cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#005AC1]" />
              <span>Ekspor Peringkat (Excel)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[24px] border border-[#E2E8F8] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-[#005AC1]">{studentRankings.length}</div>
            <div className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#005AC1]" />
              <span>Total Siswa Terdata</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Dalam filter {selectedClass}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EEF3FF] text-[#005AC1] flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-amber-600">
              {totalPointsDistributed.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Total Poin Prestasi</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Poin terakumulasi dari membaca & refleksi</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-emerald-600">{totalReportsInScope}</div>
            <div className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Total Rangkuman Selesai</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Laporan kegiatan literasi</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-[24px] border border-[#E2E8F8] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Class Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-[#005AC1]" />
              <span>Kelas:</span>
            </span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3.5 py-2 text-xs bg-[#F3F4F9] border border-slate-200 rounded-full font-bold text-[#001A41] focus:bg-white focus:ring-2 focus:ring-[#005AC1]/20 outline-hidden cursor-pointer"
            >
              <option value="Semua Kelas">Semua Kelas (X - XII)</option>
              {classList.map((cls, idx) => (
                <option key={`admin-class-opt-${cls}-${idx}`} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F3F4F9] rounded-full border border-slate-200/60">
            <button
              onClick={() => setSelectedTimeframe('semua')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedTimeframe === 'semua'
                  ? 'bg-white text-[#001A41] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Waktu
            </button>
            <button
              onClick={() => setSelectedTimeframe('bulan_ini')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedTimeframe === 'bulan_ini'
                  ? 'bg-white text-[#001A41] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Ini
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, email, atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F3F4F9] border border-[#74777F]/30 rounded-full focus:bg-white focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 outline-hidden font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {studentRankings.length > 0 && (
        <div className="pt-2">
          <div className="text-center mb-4">
            <h2 className="text-base font-black text-slate-900 inline-flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <span>Podium 3 Besar Juara Literasi ({selectedClass})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end max-w-4xl mx-auto">
            {/* Rank #2 Silver - 🥈 Outstanding Reader #2 */}
            {top2 ? (
              <div className="bg-gradient-to-b from-slate-50 via-slate-100/80 to-slate-200/50 rounded-3xl border-2 border-slate-300 p-5 text-center shadow-md order-2 sm:order-1 relative group hover:shadow-lg transition-all">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-800 text-[11px] font-black px-3.5 py-1 rounded-full border border-slate-400/80 shadow-xs flex items-center gap-1.5 whitespace-nowrap">
                  <span>🥈</span>
                  <span>Outstanding Reader #2</span>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 text-slate-800 mx-auto mt-2 flex items-center justify-center font-black text-xl border-2 border-slate-400/60 shadow-inner">
                  {top2.userName.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 mt-3 truncate">{top2.userName}</h3>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold mt-1 border border-slate-300">
                  Kelas {top2.kelas}
                </span>
                <div className="mt-3 pt-3 border-t border-slate-200 text-xs">
                  <div className="font-extrabold text-[#005AC1] text-base">
                    {top2.points.toLocaleString()} Poin
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {top2.reportCount} Laporan • {top2.totalPagesRead} Hal.
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-6 text-center text-slate-400 order-2 sm:order-1">
                Belum Ada Juara 2
              </div>
            )}

            {/* Rank #1 Gold - 🏆 The Best Literat #1 */}
            {top1 ? (
              <div className="bg-gradient-to-b from-amber-500/15 via-amber-50/70 to-white rounded-3xl border-2 border-amber-400 p-6 text-center shadow-xl shadow-amber-500/15 order-1 sm:order-2 relative transform sm:-translate-y-2.5 group hover:scale-[1.02] transition-all ring-4 ring-amber-400/20">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 text-xs font-black px-4 py-1.5 rounded-full border border-amber-300 shadow-md flex items-center gap-1.5 whitespace-nowrap">
                  <span>🏆</span>
                  <span>The Best Literat #1</span>
                </div>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 mx-auto mt-2 flex items-center justify-center font-black text-2xl border-4 border-amber-200 shadow-lg">
                  {top1.userName.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-black text-base text-slate-900 mt-3 truncate">{top1.userName}</h3>
                <span className="inline-block px-3 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mt-1 border border-amber-300">
                  Kelas {top1.kelas}
                </span>
                <div className="mt-4 pt-3 border-t border-amber-200 text-xs">
                  <div className="font-black text-amber-700 text-xl">
                    {top1.points.toLocaleString()} Poin
                  </div>
                  <div className="text-xs text-slate-600 font-semibold">
                    {top1.reportCount} Laporan • {top1.totalPagesRead} Hal.
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-6 text-center text-slate-400 order-1 sm:order-2">
                Belum Ada Juara 1
              </div>
            )}

            {/* Rank #3 Bronze - 🥉 Great Literat #3 */}
            {top3 ? (
              <div className="bg-gradient-to-b from-amber-900/10 via-amber-800/5 to-slate-50 rounded-3xl border-2 border-amber-700/60 p-5 text-center shadow-md order-3 relative group hover:shadow-lg transition-all">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-700 text-white text-[11px] font-black px-3.5 py-1 rounded-full border border-amber-600 shadow-xs flex items-center gap-1.5 whitespace-nowrap">
                  <span>🥉</span>
                  <span>Great Literat #3</span>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 mx-auto mt-2 flex items-center justify-center font-black text-xl border-2 border-amber-400 shadow-inner">
                  {top3.userName.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 mt-3 truncate">{top3.userName}</h3>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold mt-1 border border-amber-300">
                  Kelas {top3.kelas}
                </span>
                <div className="mt-3 pt-3 border-t border-amber-200/80 text-xs">
                  <div className="font-extrabold text-[#005AC1] text-base">
                    {top3.points.toLocaleString()} Poin
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {top3.reportCount} Laporan • {top3.totalPagesRead} Hal.
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-6 text-center text-slate-400 order-3">
                Belum Ada Juara 3
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Ranking Table */}
      <div className="bg-white rounded-[28px] border border-[#E2E8F8] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F8] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#005AC1]" />
              <span>Tabel Peringkat Pembaca ({filteredRankings.length} Siswa)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Urutan berdasarkan akumulasi total poin dan jumlah laporan
            </p>
          </div>
        </div>

        {isLoadingLeaderboard && filteredRankings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 text-[#005AC1] animate-spin" />
            <span className="text-xs font-bold text-slate-600">Memuat Top 20 Peringkat Siswa dari Firestore...</span>
          </div>
        ) : filteredRankings.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Tidak ada siswa ditemukan sesuai pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-[#F3F4F9] text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-[#E2E8F8]">
                <tr>
                  <th className="py-3.5 px-4 text-center">Peringkat</th>
                  <th className="py-3.5 px-4">Nama Siswa</th>
                  <th className="py-3.5 px-4 min-w-[80px] text-center">Kelas</th>
                  <th className="py-3.5 px-4 text-center">Laporan Selesai</th>
                  <th className="py-3.5 px-4 text-center">Total Halaman</th>
                  <th className="py-3.5 px-4 text-right">Total Poin</th>
                  <th className="py-3.5 px-4 text-center">Gelar Juara</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F8]">
                {filteredRankings.map((student, idx) => {
                  const uniqueRowKey = student.userId 
                    ? `admin-student-row-${student.userId}-${student.rank}-${idx}` 
                    : `admin-student-rank-${student.rank}-${idx}`;
                  return (
                    <tr key={uniqueRowKey} className="hover:bg-[#EEF3FF]/40 transition-colors">
                      <td className="py-3.5 px-4 text-center font-black text-sm align-middle">
                        {student.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black shadow-xs">
                            1
                          </span>
                        ) : student.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black shadow-xs">
                            2
                          </span>
                        ) : student.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white font-black shadow-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-500 font-bold">#{student.rank}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#005AC1] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {student.userName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[200px]">
                              {student.userName}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                              {student.userEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 min-w-[80px] text-center align-middle font-semibold text-slate-700">
                        <span className="inline-block whitespace-nowrap px-2.5 py-0.5 text-[11px] font-bold bg-[#F3F4F9] text-slate-700 rounded-full border border-slate-200">
                          {student.kelas}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800 align-middle whitespace-nowrap">
                        {student.reportCount} Buku
                      </td>

                      <td className="py-3.5 px-4 text-center text-slate-600 font-medium align-middle whitespace-nowrap">
                        {student.totalPagesRead} Hal.
                      </td>

                      <td className="py-3.5 px-4 text-right font-extrabold text-[#005AC1] text-sm align-middle whitespace-nowrap">
                        {student.points.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                        {student.rank === 1 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            🏆 The Best Literat #1
                          </span>
                        ) : student.rank === 2 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs">
                            🥈 Outstanding Reader #2
                          </span>
                        ) : student.rank === 3 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-700 text-white border border-amber-600 shadow-2xs">
                            🥉 Great Literat #3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Class Leaderboard Comparison */}
      <div className="bg-white rounded-3xl border border-sky-100 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-600" />
              <span>Komparasi Aktivitas Literasi Antar Kelas</span>
            </h2>
            <p className="text-xs text-slate-500">
              Perbandingan akumulasi poin dan partisipasi membaca per kelas
            </p>
          </div>
        </div>

        {classRankings.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            Belum ada data aktivitas kelas.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {classRankings.map((cls, idx) => {
              const maxPoints = classRankings[0]?.totalPoints || 1;
              const percentage = Math.min(
                100,
                Math.round((cls.totalPoints / maxPoints) * 100)
              );
              const uniqueClassKey = `admin-class-card-${cls.kelas || 'unknown'}-${idx}`;

              return (
                <div
                  key={uniqueClassKey}
                  className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-sky-600 text-white font-black text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="font-extrabold text-sm text-slate-900">
                        Kelas {cls.kelas}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-sky-700">
                        {cls.totalPoints.toLocaleString()} Poin
                      </div>
                      <div className="text-[10px] text-slate-500">{cls.totalReports} Laporan</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>{cls.activeStudents} Siswa Berpartisipasi</span>
                    <span>Rata-rata: {cls.avgPerStudent} laporan/siswa</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
