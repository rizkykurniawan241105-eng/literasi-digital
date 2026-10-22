import React, { useState, useMemo } from 'react';
import { 
  Mail, 
  GraduationCap, 
  Award, 
  LogOut, 
  BookOpen, 
  CheckCircle, 
  CheckCircle2,
  CalendarCheck,
  Shield, 
  Edit3, 
  Sparkles, 
  Flame, 
  Lock, 
  Info, 
  X, 
  Check,
  Target,
  Trophy,
  Medal,
  FileCheck2,
  Star,
  BookMarked,
  FileText
} from 'lucide-react';
import { UserProfile, ReadingReport, Book } from '../../types';
import { BADGE_DEFINITIONS, Badge, getBadgeProgress, calculateReadingStreak } from '../../data/badges';
import { calculateStudentTotalPoints, calculateReportPoints } from '../../utils/pointsAndSchedule';

interface ProfileTabProps {
  user: UserProfile;
  reports: ReadingReport[];
  allReports?: ReadingReport[];
  allUsers?: UserProfile[];
  books: Book[];
  onChangeClassClick: () => void;
  onLogout: () => void;
  onEquipBadge?: (badgeId: string | null) => Promise<void> | void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  reports,
  allReports = [],
  allUsers = [],
  books,
  onChangeClassClick,
  onLogout,
  onEquipBadge,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedBadgeDetail, setSelectedBadgeDetail] = useState<Badge | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  const safeReports = Array.isArray(reports) ? reports : [];
  const totalReports = safeReports.length;
  const uniqueBooksCount = new Set(safeReports.map((r) => r.bookId || r.bookTitle)).size;
  const streakCount = user.streakCount ?? calculateReadingStreak(safeReports);

  const unlockedBadgeIds = new Set<string>(user.badges || []);
  const equippedBadge = BADGE_DEFINITIONS.find((b) => b.id === user.equippedBadgeId);

  // Filtered Badges
  const filteredBadges = BADGE_DEFINITIONS.filter((badge) => {
    const isUnlocked = unlockedBadgeIds.has(badge.id);
    if (filterCategory === 'unlocked') return isUnlocked;
    if (filterCategory === 'locked') return !isUnlocked;
    if (filterCategory !== 'all') return badge.category === filterCategory;
    return true;
  });

  // Total Points calculated from badges + tiered reading reports
  const badgePointsTotal = BADGE_DEFINITIONS.filter((b) => unlockedBadgeIds.has(b.id)).reduce((acc, b) => acc + b.points, 0);
  const totalPoints = calculateStudentTotalPoints(safeReports, badgePointsTotal);

  // 1. Target Literasi Semester & Kehadiran Sesi
  const totalTargetSessions = 12; // Standar target 12 sesi per semester
  const attendancePercentage = Math.min(100, Math.round((totalReports / totalTargetSessions) * 100));

  // 2. Hitung Peringkat Siswa di Kelas (Class Rank)
  const classRank = useMemo(() => {
    const userClass = user.kelas || 'Umum';
    const reportPool = allReports && allReports.length > 0 ? allReports : safeReports;

    const studentPointsMap = new Map<string, number>();

    reportPool.forEach((rep) => {
      if ((rep.kelas || 'Umum') === userClass) {
        const idKey = rep.userId || rep.userEmail || rep.userName;
        const pts = calculateReportPoints(rep).totalPoints;
        studentPointsMap.set(idKey, (studentPointsMap.get(idKey) || 0) + pts);
      }
    });

    const myKey = user.uid || user.email || user.name;
    if (!studentPointsMap.has(myKey)) {
      studentPointsMap.set(myKey, totalPoints);
    } else {
      studentPointsMap.set(myKey, Math.max(studentPointsMap.get(myKey) || 0, totalPoints));
    }

    const sorted = Array.from(studentPointsMap.entries()).sort((a, b) => b[1] - a[1]);
    const myIndex = sorted.findIndex(([k]) => k === myKey || k === user.uid || k === user.email);
    return myIndex >= 0 ? myIndex + 1 : 1;
  }, [allReports, safeReports, user, totalPoints]);

  // 3. Kualitas Rangkuman (Dihitung otomatis: Total Poin Laporan Terverifikasi / Jumlah Laporan Terverifikasi)
  const verifiedReports = useMemo(() => {
    return safeReports.filter((r) => {
      const isVerified = r.status === 'Diverifikasi' || r.status === 'Setujui_Bonus' || r.status === 'Setujui_Standar' || r.status === 'Disetujui';
      return isVerified;
    });
  }, [safeReports]);

  const hasVerifiedReports = verifiedReports.length > 0;
  const averageSummaryGrade = useMemo(() => {
    if (!hasVerifiedReports) return 0;
    const totalPoints = verifiedReports.reduce((acc, r) => {
      const pts = calculateReportPoints(r).totalPoints;
      return acc + pts;
    }, 0);
    return Math.round(totalPoints / verifiedReports.length);
  }, [verifiedReports, hasVerifiedReports]);

  const displaySummaryGrade = hasVerifiedReports ? `${averageSummaryGrade} / 100` : 'Belum Dinilai';

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in max-w-4xl mx-auto">
      {/* Profile Card Banner */}
      <div className="bg-white rounded-[28px] border border-[#E2E8F8] overflow-hidden shadow-xs">
        <div className="h-36 relative overflow-hidden rounded-t-[28px] bg-[#005AC1]">
          {/* Background Image: Education Pattern */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat rounded-t-[28px] transform scale-105 transition-transform duration-700"
            style={{ backgroundImage: `url('/education_pattern_bg.jpg')` }}
          />

          {/* Transparent Blue Gradient & Backdrop Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#003B8E]/90 via-[#005AC1]/80 to-[#1E3A8A]/85 backdrop-blur-[0.5px]" />

          {/* Ambient Glow & Highlights */}
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute left-1/3 -bottom-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-xl pointer-events-none" />

          {/* Watermark Pola Ikon Pendidikan (Buku & Toga) Transparan */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <GraduationCap className="absolute -top-3 left-[22%] w-18 h-18 text-white/[0.12] -rotate-12 transform" />
            <BookOpen className="absolute bottom-1 left-[38%] w-16 h-16 text-white/[0.12] rotate-12 transform" />
            <GraduationCap className="absolute top-2 right-[32%] w-14 h-14 text-white/[0.10] rotate-45 transform" />
            <BookOpen className="absolute -bottom-3 right-[20%] w-20 h-20 text-white/[0.12] -rotate-6 transform" />
            <GraduationCap className="absolute -bottom-2 left-6 w-14 h-14 text-white/[0.08] rotate-12 transform" />
          </div>

          {/* Watermark Siluet Lingkaran Lambang OSIS Latar Belakang */}
          <div className="absolute -right-4 -bottom-6 w-36 h-36 rounded-full border-4 border-white/[0.08] flex items-center justify-center pointer-events-none select-none rotate-12">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/[0.07] flex items-center justify-center">
              <GraduationCap className="w-14 h-14 text-white/[0.10]" />
            </div>
          </div>

          {/* Badge Status Kecil 'Siswa Aktif' di Pojok Kiri Atas */}
          <div className="absolute top-3.5 left-4 z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[11px] font-bold shadow-xs select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>Siswa Aktif</span>
          </div>

          {/* Logo / Siluet OSIS Transparan di Pojok Kanan Atas */}
          <div className="absolute top-3 right-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-white pointer-events-none select-none shadow-xs">
            <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center border border-white/35">
              <GraduationCap className="w-3 h-3 text-white" />
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[10px] font-black tracking-wider text-white drop-shadow-xs">OSIS</span>
              <span className="text-[7.5px] font-semibold text-blue-100 uppercase tracking-tight">SMAN 1 SALEM</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg shrink-0 border-2 border-[#D8E2FF] relative">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#005AC1] to-blue-800 text-white rounded-full flex items-center justify-center font-black text-2xl shadow-inner">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-white shadow-xs flex items-center gap-0.5">
                  <Award className="w-3 h-3 text-slate-950" />
                  <span>{unlockedBadgeIds.size} Badges</span>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
                  {equippedBadge && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-amber-400/20 via-yellow-400/15 to-amber-500/20 border border-amber-300 text-amber-950 rounded-full text-xs font-black shadow-2xs">
                      <span>{equippedBadge.icon}</span>
                      <span>{equippedBadge.name}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-1 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user.email}</span>
                </p>
                {equippedBadge ? (
                  <div className="mt-1.5 flex items-center justify-center sm:justify-start gap-1.5 text-[11px] font-semibold text-amber-800">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Lencana Terpasang: <strong className="font-extrabold">{equippedBadge.name}</strong></span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1 italic flex items-center justify-center sm:justify-start gap-1">
                    <Award className="w-3 h-3" />
                    <span>Belum ada lencana yang dipasang di profil</span>
                  </p>
                )}
              </div>
            </div>

            {/* Class Pill & Points */}
            <div className="flex items-center gap-2">
              <div className="px-4 py-1.5 bg-[#EEF3FF] border border-[#D8E2FF] text-[#001A41] rounded-full text-xs font-bold flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#005AC1]" />
                <span>Kelas: {user.kelas || 'Belum Set'}</span>
              </div>

              <button
                onClick={onChangeClassClick}
                className="p-2 text-slate-600 hover:text-[#005AC1] hover:bg-[#EEF3FF] rounded-full transition-colors border border-slate-200 cursor-pointer"
                title="Ubah Kelas"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 4 KARTU STATISTIK PROFIL SISWA ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {/* KARTU 1: Streak Pertemuan */}
        <div className="bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 p-3 sm:p-4 rounded-2xl sm:rounded-[20px] text-white shadow-md flex items-center gap-2.5 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center shrink-0 border border-white/30">
            <Flame className="w-4.5 h-4.5 sm:w-6 sm:h-6 animate-pulse text-amber-200" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm xs:text-base sm:text-xl font-black tracking-tight truncate leading-tight">
              {streakCount} Streak
            </div>
            <div className="text-[9px] xs:text-[10px] sm:text-[11px] font-bold text-orange-100 uppercase tracking-wider truncate mt-0.5">
              Streak Pertemuan
            </div>
          </div>
        </div>

        {/* KARTU 2: Kehadiran Sesi */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-[20px] border border-[#E2E8F8] shadow-xs flex items-center gap-2.5 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm xs:text-base sm:text-xl font-black text-slate-900 tracking-tight truncate leading-tight">
              {attendancePercentage}%
            </div>
            <div className="text-[9px] xs:text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-wider truncate mt-0.5">
              Kehadiran Sesi
            </div>
          </div>
        </div>

        {/* KARTU 3: Peringkat Literasi */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-[20px] border border-[#E2E8F8] shadow-xs flex items-center gap-2.5 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0 border border-amber-100">
            <Trophy className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs xs:text-sm sm:text-lg font-black text-slate-900 tracking-tight truncate leading-tight">
              Rank #{classRank} Kelas
            </div>
            <div className="text-[9px] xs:text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-wider truncate mt-0.5">
              Peringkat Literasi
            </div>
          </div>
        </div>

        {/* KARTU 4: Total Rangkuman */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-[20px] border border-[#E2E8F8] shadow-xs flex items-center gap-2.5 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-[#EEF3FF] text-[#005AC1] rounded-full flex items-center justify-center shrink-0 border border-blue-100">
            <FileText className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#005AC1]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs xs:text-sm sm:text-lg font-black text-slate-900 tracking-tight truncate leading-tight">
              {totalReports} Rangkuman
            </div>
            <div className="text-[9px] xs:text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-wider truncate mt-0.5">
              Total Rangkuman
            </div>
          </div>
        </div>
      </div>

      {/* ================= KARTU KUALITAS RANGKUMAN (PENILAIAN OSIS) ================= */}
      <div className="bg-gradient-to-br from-indigo-950 via-blue-900 to-[#005AC1] rounded-[24px] p-5 sm:p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-blue-300/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-60 h-60 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 text-amber-300 shrink-0 shadow-inner">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-white">Kualitas Rangkuman</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400/25 border border-amber-300/40 text-amber-200">
                Nilai OSIS
              </span>
            </div>
            <p className="text-xs text-blue-100 mt-1 leading-relaxed max-w-md">
              {hasVerifiedReports
                ? `Rata-rata nilai ulasan dari ${verifiedReports.length} laporan literasi yang telah diverifikasi oleh Pengurus OSIS SMAN 1 Salem.`
                : 'Belum ada laporan rangkuman yang diverifikasi oleh Pengurus OSIS SMAN 1 Salem. Nilai akan muncul setelah laporan Anda diperiksa.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto bg-white/15 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/25 relative z-10 shadow-xs">
          <div className="text-left sm:text-right">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-200">Rata-Rata Nilai</div>
            <div className={`font-black tracking-tight ${hasVerifiedReports ? 'text-amber-300 text-2xl' : 'text-blue-100 text-base'}`}>
              {displaySummaryGrade}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300 border border-amber-300/30 shrink-0">
            <Star className="w-5 h-5 fill-amber-300 text-amber-300" />
          </div>
        </div>
      </div>

      {/* Lencana & Pencapaian Section */}
      <div className="bg-white p-6 rounded-[28px] border border-[#E2E8F8] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F8]">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Sistem Lencana & Prestasi Literasi</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kumpulkan lencana prestisius dan pasang lencana favorit Anda untuk ditampilkan di profil!
            </p>
          </div>

          <div className="px-3.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-full text-xs font-bold self-start sm:self-auto flex items-center gap-1.5">
            <span>Selesai:</span>
            <span className="font-extrabold text-amber-950">
              {unlockedBadgeIds.size} / {BADGE_DEFINITIONS.length}
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'Semua Lencana' },
            { id: 'unlocked', label: `Terbuka (${unlockedBadgeIds.size})` },
            { id: 'locked', label: `Terkunci (${BADGE_DEFINITIONS.length - unlockedBadgeIds.size})` },
            { id: 'buku', label: '📚 Koleksi Buku' },
            { id: 'streak', label: '🔥 Streak' },
            { id: 'kategori', label: '🌈 Kategori' },
            { id: 'laporan', label: '✍️ Laporan' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterCategory === tab.id
                  ? 'bg-[#005AC1] text-white shadow-xs'
                  : 'bg-[#F3F4F9] hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
          {filteredBadges.map((badge) => {
            const isUnlocked = unlockedBadgeIds.has(badge.id);
            const isEquipped = user.equippedBadgeId === badge.id;
            const progress = getBadgeProgress(badge, safeReports, streakCount);

            return (
              <div
                key={badge.id}
                onClick={() => setSelectedBadgeDetail(badge)}
                className={`relative p-4 rounded-2xl border transition-all text-center flex flex-col items-center justify-between cursor-pointer group ${
                  isUnlocked
                    ? isEquipped
                      ? 'bg-gradient-to-b from-amber-50/80 to-yellow-50/40 border-amber-400 shadow-md ring-2 ring-amber-400/50'
                      : 'bg-white border-[#E2E8F8] hover:border-[#005AC1] hover:shadow-md'
                    : 'bg-slate-50/70 border-slate-200/80 opacity-70 hover:opacity-90'
                }`}
              >
                {/* Equipped Badge Tag */}
                {isEquipped && (
                  <span className="absolute -top-2.5 bg-amber-500 text-slate-950 font-black text-[9px] px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 border border-white">
                    <Sparkles className="w-2.5 h-2.5 fill-slate-950" />
                    <span>Terpasang</span>
                  </span>
                )}

                {/* Badge Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-2 transition-transform group-hover:scale-110 shadow-xs ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-amber-100 to-yellow-200 border border-amber-300'
                      : 'bg-slate-200 text-slate-400 grayscale'
                  }`}
                >
                  {badge.icon}
                </div>

                <div className="w-full space-y-1">
                  <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1 group-hover:text-[#005AC1]">
                    {badge.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                    {badge.description}
                  </p>
                </div>

                {/* Status / Points / Equip Button */}
                <div className="w-full mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="font-extrabold text-amber-600">
                    +{badge.points} Poin
                  </span>

                  {isUnlocked ? (
                    <span className="text-emerald-700 font-extrabold flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded">
                      <Check className="w-3 h-3" />
                      <span>Buka</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold flex items-center gap-0.5">
                      <Lock className="w-3 h-3" />
                      <span>{progress.current}/{progress.target}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= KARTU / TOMBOL KELUAR DARI AKUN (LOG OUT) ================= */}
      <div className="bg-white rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 border border-rose-100 shadow-xs hover:border-rose-200 transition-all">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/70 flex items-center justify-center shrink-0 shadow-xs">
              <LogOut className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Keluar dari Akun</h3>
                <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Siswa
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Akhiri sesi aktif Anda di perangkat ini. Seluruh poin, riwayat membaca, dan lencana Anda tetap tersimpan aman.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full sm:w-auto py-3 px-6 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 hover:text-red-700 border border-red-200/90 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 shrink-0"
          >
            <LogOut className="w-4.5 h-4.5 text-red-600 shrink-0" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </div>

      {/* Modal Konfirmasi Logout Siswa */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4 animate-scale-up">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
              <LogOut className="w-8 h-8 text-rose-600" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Konfirmasi Keluar Akun
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin keluar dari akun <span className="font-bold text-slate-800">{user.name}</span>? Sesi Anda akan diakhiri dan Anda perlu masuk kembali untuk mengakses fitur literasi.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Ya, Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Detail Modal & Equip Action */}
      {selectedBadgeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4 relative animate-scale-up">
            <button
              onClick={() => setSelectedBadgeDetail(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div
              className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl shadow-inner ${
                unlockedBadgeIds.has(selectedBadgeDetail.id)
                  ? 'bg-gradient-to-br from-amber-200 to-yellow-300 border-2 border-amber-400'
                  : 'bg-slate-200 grayscale text-slate-400'
              }`}
            >
              {selectedBadgeDetail.icon}
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {selectedBadgeDetail.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {selectedBadgeDetail.description}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs space-y-1">
              <div className="flex justify-between font-medium text-slate-600">
                <span>Bonus Poin:</span>
                <span className="font-extrabold text-amber-600">+{selectedBadgeDetail.points} Poin</span>
              </div>
              <div className="flex justify-between font-medium text-slate-600">
                <span>Kategori:</span>
                <span className="font-bold text-slate-800 capitalize">{selectedBadgeDetail.category}</span>
              </div>
            </div>

            {/* Equip / Unequip Action */}
            {unlockedBadgeIds.has(selectedBadgeDetail.id) ? (
              <div className="pt-2">
                {user.equippedBadgeId === selectedBadgeDetail.id ? (
                  <button
                    onClick={() => {
                      if (onEquipBadge) onEquipBadge(null);
                      setSelectedBadgeDetail(null);
                    }}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Lepas Lencana dari Profil
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (onEquipBadge) onEquipBadge(selectedBadgeDetail.id);
                      setSelectedBadgeDetail(null);
                    }}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-[#005AC1] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Pasang Lencana di Profil</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="pt-1 text-[11px] text-slate-400 font-medium italic">
                Lencana ini masih terkunci. Teruslah membaca dan menulis ulasan untuk membukanya!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
