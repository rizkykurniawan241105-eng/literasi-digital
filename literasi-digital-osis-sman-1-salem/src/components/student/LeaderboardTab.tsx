import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, 
  Award, 
  Crown, 
  Medal, 
  Sparkles, 
  Flame, 
  Search, 
  GraduationCap, 
  User as UserIcon, 
  CheckCircle2, 
  TrendingUp, 
  BarChart3,
  Star,
  Lock,
  RefreshCw
} from 'lucide-react';
import { ReadingReport, UserProfile, AppSettings } from '../../types';
import { calculateReportPoints } from '../../utils/pointsAndSchedule';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

interface LeaderboardTabProps {
  reports: ReadingReport[];
  currentUser: UserProfile;
  classList: string[];
  appSettings?: AppSettings;
  topUsers?: UserProfile[];
}

export interface StudentRank {
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

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({
  reports: propReports,
  currentUser,
  classList,
  appSettings,
  topUsers,
}) => {
  const [selectedScope, setSelectedScope] = useState<'sekolah' | 'kelas'>('sekolah');
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback internal listener only if topUsers is not provided externally
  const [internalTop20Users, setInternalTop20Users] = useState<UserProfile[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState<boolean>(!topUsers || topUsers.length === 0);

  useEffect(() => {
    if (topUsers && topUsers.length > 0) {
      setIsLoadingLeaderboard(false);
      return;
    }

    setIsLoadingLeaderboard(true);
    // Realtime query: strictly Top 20 students ordered by points desc
    const top20Query = query(
      collection(db, 'users'),
      orderBy('points', 'desc'),
      limit(20)
    );

    const unsubTop20 = onSnapshot(top20Query, (snap) => {
      const usersList: UserProfile[] = [];
      snap.forEach((d) => {
        const u = { uid: d.id, ...d.data() } as UserProfile;
        if (u.role !== 'admin') {
          usersList.push(u);
        }
      });
      setInternalTop20Users(usersList);
      setIsLoadingLeaderboard(false);
    }, (err) => {
      console.warn('Leaderboard top 20 query notice:', err);
      setIsLoadingLeaderboard(false);
    });

    return () => {
      unsubTop20();
    };
  }, [topUsers]);

  const effectiveTopUsers = useMemo(() => {
    return (topUsers && topUsers.length > 0) ? topUsers : internalTop20Users;
  }, [topUsers, internalTop20Users]);

  const reports = propReports;

  // When admin turns OFF leaderboard visibility, show clean informational lock state
  if (appSettings?.isLeaderboardVisible === false) {
    return (
      <div className="space-y-6 pb-20 md:pb-6 animate-fade-in max-w-4xl mx-auto">
        <div className="bg-white rounded-[28px] border border-[#E2E8F8] p-8 sm:p-12 text-center shadow-xs space-y-5">
          <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 text-amber-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-10 h-10 text-amber-600" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 border border-amber-200 text-amber-900 text-xs font-black">
              <span>🔒 Status Akses Ditahan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Papan Peringkat Belum Dibuka oleh Admin
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              Papan Peringkat belum dibuka oleh Admin. Nilai dan pembaruan poin Anda akan ditampilkan pada pertemuan literasi berikutnya setelah seluruh ulasan selesai divalidasi oleh Pembina OSIS / Guru.
            </p>
          </div>

          <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 max-w-md mx-auto text-xs text-blue-950 flex items-center gap-3 text-left">
            <Award className="w-5 h-5 text-[#005AC1] shrink-0" />
            <span>Teruslah membaca buku dan mengisi laporan ulasan Anda dengan penuh integritas!</span>
          </div>
        </div>
      </div>
    );
  }

  // Compute student rankings from Top 20 query (strictly 20 users max) with full robust fallbacks
  const studentRankings = useMemo(() => {
    let arr: StudentRank[] = effectiveTopUsers.map((u, index) => {
      // Find matching reports for this user to ensure complete synchronization
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

      // Sync name & class if missing or generic
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
        points: typeof points === 'number' && !isNaN(points) ? points : 0,
        rank: index + 1,
        photoURL: u.photoURL,
      };
    });

    // Filter scope if "kelas"
    if (selectedScope === 'kelas' && currentUser.kelas) {
      arr = arr.filter((s) => s.kelas === currentUser.kelas);
    }

    return arr;
  }, [effectiveTopUsers, selectedScope, currentUser.kelas, reports]);

  // Compute Class Rankings from active reports & top users (fully synced with points & reports)
  const classRankings = useMemo(() => {
    const classMap = new Map<
      string,
      { kelas: string; totalReports: number; totalPoints: number; studentCount: Set<string> }
    >();

    // 1. Process all available reports
    (reports || []).forEach((rep) => {
      const cls = rep.kelas || 'Lainnya';
      const pts = rep.pointsTotal ?? calculateReportPoints(rep).totalPoints;
      const studentId = rep.userId || rep.userEmail || rep.userName;
      if (!classMap.has(cls)) {
        classMap.set(cls, {
          kelas: cls,
          totalReports: 1,
          totalPoints: pts,
          studentCount: new Set([studentId]),
        });
      } else {
        const item = classMap.get(cls)!;
        item.totalReports += 1;
        item.totalPoints += pts;
        item.studentCount.add(studentId);
      }
    });

    // 2. Also incorporate Top 20 performers by class to ensure consistency
    effectiveTopUsers.forEach((u) => {
      const cls = u.kelas;
      if (!cls || cls === 'Umum' || cls === 'GURU') return;
      const userPts = (typeof u.points === 'number' ? u.points : u.totalPoints) || 0;
      const userReps = u.approvedReportsCount || u.totalReports || 1;
      const studentId = u.uid || u.email || u.name;

      if (!classMap.has(cls)) {
        classMap.set(cls, {
          kelas: cls,
          totalReports: userReps,
          totalPoints: userPts,
          studentCount: new Set([studentId]),
        });
      } else {
        const item = classMap.get(cls)!;
        if (!item.studentCount.has(studentId)) {
          item.studentCount.add(studentId);
          item.totalPoints += userPts;
          item.totalReports += userReps;
        }
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
  }, [reports, effectiveTopUsers]);

  // Find Current Student Rank in Top 20
  const currentKey = currentUser.uid || currentUser.email;
  const foundRank = studentRankings.find(
    (s) => s.userId === currentKey || (currentUser.email && s.userEmail.toLowerCase() === currentUser.email.toLowerCase())
  );
  const myRankInfo: StudentRank = foundRank || {
    userId: currentKey,
    userName: currentUser.name || 'Siswa',
    userEmail: currentUser.email || '',
    kelas: currentUser.kelas || 'Umum',
    reportCount: currentUser.approvedReportsCount ?? currentUser.totalReports ?? currentUser.reportsCount ?? (Array.isArray(currentUser.readingHistory) ? currentUser.readingHistory.length : (reports?.length || 0)),
    totalPagesRead: currentUser.totalPagesRead ?? currentUser.totalPages ?? currentUser.pagesRead ?? (Array.isArray(currentUser.readingHistory) ? currentUser.readingHistory.reduce((acc: number, item: any) => acc + (parseInt(item.pagesRead || item.pages || '0', 10) || 0), 0) : 0),
    points: (typeof currentUser.points === 'number' ? currentUser.points : currentUser.totalPoints) ?? 0,
    rank: 0, // 0 = di luar Top 20
    photoURL: currentUser.photoURL,
  };

  // Search filtered student list
  const filteredRankings = useMemo(() => {
    if (!searchQuery.trim()) return studentRankings;
    return studentRankings.filter(
      (s) =>
        s.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.kelas.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [studentRankings, searchQuery]);

  // Top 3 Podium
  const top1 = studentRankings[0];
  const top2 = studentRankings[1];
  const top3 = studentRankings[2];

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in font-sans">
      {/* Bright Sky Blue Hero Header */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#005AC1] via-blue-700 to-indigo-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-sky-200/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center justify-center text-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-blue-100 text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-center">PAPAN PERINGKAT LITERAL OSIS SMAN 1 SALEM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
              Ranking & Prestasi Membaca
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Dapatkan poin literasi setiap kali membaca dan mengirimkan rangkuman buku harian. Tingkatkan posisi kelas Anda menjadi Juara Literasi Sekolah!
            </p>
          </div>

          {/* Current User Quick Rank Widget */}
          <div className="shrink-0 bg-white/15 backdrop-blur-md border border-white/25 p-4 rounded-[20px] flex items-center gap-4 text-white w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black text-sm sm:text-base shadow-md shrink-0">
              {myRankInfo.rank > 0 ? `#${myRankInfo.rank}` : '>20'}
            </div>
            <div>
              <div className="text-xs font-semibold text-blue-100">Posisi Kamu ({selectedScope === 'sekolah' ? 'Sekolah' : 'Kelas'})</div>
              <div className="text-lg font-extrabold text-white">{myRankInfo.points.toLocaleString()} Poin</div>
              <div className="text-[11px] text-blue-200">
                {myRankInfo.rank > 0 ? `Peringkat #${myRankInfo.rank} di Top 20` : 'Kumpulkan poin untuk masuk Top 20'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Scope & Top 20 Realtime Status */}
      <div className="bg-white p-4 rounded-[24px] border border-[#E2E8F8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Scope Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F3F4F9] rounded-full border border-slate-200/60 w-full sm:w-auto">
          <button
            onClick={() => setSelectedScope('sekolah')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedScope === 'sekolah'
                ? 'bg-[#005AC1] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Seluruh Sekolah (Top 20)
          </button>
          <button
            onClick={() => setSelectedScope('kelas')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedScope === 'kelas'
                ? 'bg-[#005AC1] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Kelas Saya ({currentUser.kelas || 'X-1'})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Realtime Firestore (Top 20 Siswa Teratas)</span>
        </div>
      </div>

      {/* TOP 3 PODIUM DISPLAY */}
      {studentRankings.length > 0 && (
        <div className="pt-2">
          <div className="text-center mb-4">
            <h2 className="text-base font-black text-slate-900 inline-flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <span>Podium 3 Besar Juara Literasi ({selectedScope === 'sekolah' ? 'Seluruh Sekolah' : `Kelas ${currentUser.kelas}`})</span>
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
                  <div className="font-extrabold text-[#005AC1] text-base">{top2.points.toLocaleString()} Poin</div>
                  <div className="text-[11px] text-slate-500 font-medium">{top2.reportCount} Laporan • {top2.totalPagesRead} Hal.</div>
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
                  <div className="font-black text-amber-700 text-xl">{top1.points.toLocaleString()} Poin</div>
                  <div className="text-xs text-slate-600 font-semibold">{top1.reportCount} Laporan • {top1.totalPagesRead} Hal.</div>
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
                  <div className="font-extrabold text-[#005AC1] text-base">{top3.points.toLocaleString()} Poin</div>
                  <div className="text-[11px] text-slate-500 font-medium">{top3.reportCount} Laporan • {top3.totalPagesRead} Hal.</div>
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

      {/* FULL RANKING TABLE LIST */}
      <div className="bg-white rounded-[28px] border border-[#E2E8F8] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#005AC1]" />
              <span>Top 20 Peringkat Pembaca Teratas ({filteredRankings.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Peringkat 20 siswa teratas realtime berdasarkan akumulasi poin tertinggi
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#F3F4F9] border border-[#74777F]/30 rounded-full focus:bg-white focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 outline-hidden font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="bg-[#F3F4F9] text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-[#E2E8F8]">
              <tr>
                <th className="py-3.5 px-4 text-center">Rank</th>
                <th className="py-3.5 px-4">Siswa</th>
                <th className="py-3.5 px-4 min-w-[80px] text-center">Kelas</th>
                <th className="py-3.5 px-4 text-center">Laporan</th>
                <th className="py-3.5 px-4 text-center">Total Hal.</th>
                <th className="py-3.5 px-4 text-right">Skor Poin</th>
                <th className="py-3.5 px-4 text-center">Gelar Juara</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F8]">
              {filteredRankings.map((student, idx) => {
                const isMe = student.userId === currentKey;
                const uniqueRowKey = student.userId 
                  ? `student-row-${student.userId}-${student.rank}-${idx}` 
                  : `student-row-rank-${student.rank}-${idx}`;

                return (
                  <tr
                    key={uniqueRowKey}
                    className={`transition-colors ${
                      isMe ? 'bg-[#EEF3FF] font-semibold border-l-4 border-l-[#005AC1]' : 'hover:bg-[#F3F4F9]/60'
                    }`}
                  >
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
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isMe ? 'bg-[#005AC1] text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {student.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[200px] flex items-center gap-1.5">
                            <span className="truncate">{student.userName}</span>
                            {isMe && (
                              <span className="px-2 py-0.5 bg-[#005AC1] text-white text-[9px] font-bold rounded-full shrink-0">
                                Saya
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{student.userEmail}</div>
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
      </div>

      {/* CLASS LEADERBOARD SECTION */}
      <div className="bg-white rounded-3xl border border-sky-100 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-600" />
              <span>Papan Peringkat Kelas Teraktif</span>
            </h2>
            <p className="text-xs text-slate-500">
              Persaingan partisipasi membaca antar kelas di sekolah
            </p>
          </div>
        </div>

        {classRankings.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">Belum ada data aktivitas kelas.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {classRankings.slice(0, 6).map((cls, idx) => {
              const maxReports = classRankings[0]?.totalReports || 1;
              const percentage = Math.min(100, Math.round((cls.totalReports / maxReports) * 100));
              const uniqueClassKey = `class-rank-card-${cls.kelas || 'unknown'}-${idx}`;

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
                      <span className="font-extrabold text-sm text-slate-900">Kelas {cls.kelas}</span>
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
