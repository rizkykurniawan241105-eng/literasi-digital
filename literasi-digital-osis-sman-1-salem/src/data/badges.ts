import { UserProfile, ReadingReport, Book } from '../types';

export interface Badge {
  id: string;
  name: string;
  description: string;
  reqText: string;
  icon: string;
  category: 'buku' | 'streak' | 'kategori' | 'waktu' | 'laporan';
  color: string;
  bgGradient: string;
  borderColor: string;
  target: number;
  points: number;
}

export const BADGE_DEFINITIONS: Badge[] = [
  {
    id: 'pemula',
    name: 'Pembaca Pemula',
    description: 'Menyelesaikan pembiasaan membaca 1 buku digital pertama Anda.',
    reqText: 'Membaca 1 Buku',
    icon: '🥉',
    category: 'buku',
    color: 'amber',
    bgGradient: 'from-amber-500/20 to-orange-500/10',
    borderColor: 'border-amber-400',
    target: 1,
    points: 20,
  },
  {
    id: 'kutubuku',
    name: 'Kutu Buku',
    description: 'Menuntaskan membaca 5 judul buku digital berbeda di perpustakaan.',
    reqText: 'Membaca 5 Buku',
    icon: '🥈',
    category: 'buku',
    color: 'slate',
    bgGradient: 'from-slate-400/20 to-slate-600/10',
    borderColor: 'border-slate-400',
    target: 5,
    points: 50,
  },
  {
    id: 'bintang',
    name: 'Bintang Literasi',
    description: 'Pencapaian hebat! Berhasil membaca 10 judul buku digital.',
    reqText: 'Membaca 10 Buku',
    icon: '🥇',
    category: 'buku',
    color: 'yellow',
    bgGradient: 'from-yellow-400/20 to-amber-500/10',
    borderColor: 'border-yellow-400',
    target: 10,
    points: 100,
  },
  {
    id: 'master',
    name: 'Master Literasi',
    description: 'Tingkat tertinggi! Telah menuntaskan 20 koleksi buku digital.',
    reqText: 'Membaca 20 Buku',
    icon: '💎',
    category: 'buku',
    color: 'cyan',
    bgGradient: 'from-cyan-500/20 to-blue-600/10',
    borderColor: 'border-cyan-400',
    target: 20,
    points: 250,
  },
  {
    id: 'streak3',
    name: 'Streak Master',
    description: 'Konsisten membaca dan mengunggah laporan 3 hari berturut-turut.',
    reqText: 'Streak 3 Hari',
    icon: '🔥',
    category: 'streak',
    color: 'rose',
    bgGradient: 'from-rose-500/20 to-orange-500/10',
    borderColor: 'border-rose-400',
    target: 3,
    points: 60,
  },
  {
    id: 'streak7',
    name: 'Super Streak',
    description: 'Luar biasa! Disiplin membaca 7 hari berturut-turut tanpa terputus.',
    reqText: 'Streak 7 Hari',
    icon: '⚡',
    category: 'streak',
    color: 'indigo',
    bgGradient: 'from-indigo-500/20 to-purple-600/10',
    borderColor: 'border-indigo-400',
    target: 7,
    points: 150,
  },
  {
    id: 'streak14',
    name: 'Maraton Literasi',
    description: 'Dedikasi tinggi membaca selama 14 hari berturut-turut.',
    reqText: 'Streak 14 Hari',
    icon: '🏆',
    category: 'streak',
    color: 'purple',
    bgGradient: 'from-purple-500/20 to-pink-600/10',
    borderColor: 'border-purple-400',
    target: 14,
    points: 300,
  },
  {
    id: 'genre3',
    name: 'Kolektor Genre',
    description: 'Wawasan luas dengan membaca buku dari 3 kategori berbeda.',
    reqText: '3 Kategori Berbeda',
    icon: '🌈',
    category: 'kategori',
    color: 'emerald',
    bgGradient: 'from-emerald-500/20 to-teal-500/10',
    borderColor: 'border-emerald-400',
    target: 3,
    points: 40,
  },
  {
    id: 'genre5',
    name: 'Penjelajah Literatur',
    description: 'Menjelajahi buku dari 5 bidang dan kategori sains/sastra yang beragam.',
    reqText: '5 Kategori Berbeda',
    icon: '🗺️',
    category: 'kategori',
    color: 'sky',
    bgGradient: 'from-sky-500/20 to-blue-600/10',
    borderColor: 'border-sky-400',
    target: 5,
    points: 80,
  },
  {
    id: 'refleksi10',
    name: 'Pena Refleksi',
    description: 'Aktif menyusun 10 laporan dan rangkuman refleksi bacaan.',
    reqText: '10 Laporan Terkirim',
    icon: '✍️',
    category: 'laporan',
    color: 'blue',
    bgGradient: 'from-blue-500/20 to-sky-500/10',
    borderColor: 'border-blue-400',
    target: 10,
    points: 75,
  },
  {
    id: 'earlybird',
    name: 'Early Bird Literasi',
    description: 'Semangat pagi! Mengirimkan laporan membaca sebelum pukul 08:00 WIB.',
    reqText: 'Laporan Pagi Pagi',
    icon: '🌅',
    category: 'waktu',
    color: 'amber',
    bgGradient: 'from-amber-400/20 to-yellow-500/10',
    borderColor: 'border-amber-300',
    target: 1,
    points: 30,
  },
  {
    id: 'nightowl',
    name: 'Pengulas Senja',
    description: 'Menutup hari dengan membaca dan mengirimkan laporan setelah pukul 20:00 WIB.',
    reqText: 'Laporan Malam Hari',
    icon: '🌙',
    category: 'waktu',
    color: 'violet',
    bgGradient: 'from-violet-500/20 to-indigo-600/10',
    borderColor: 'border-violet-400',
    target: 1,
    points: 30,
  },
];

/**
 * Calculate consecutive daily reading streak
 */
export function calculateReadingStreak(userReports: ReadingReport[]): number {
  if (!userReports || userReports.length === 0) return 0;

  // Extract unique dates sorted descending
  const datesSet = new Set<string>();
  userReports.forEach((r) => {
    if (r.dateStr) {
      datesSet.add(r.dateStr);
    } else if (r.timestamp) {
      datesSet.add(r.timestamp.split('T')[0]);
    }
  });

  const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  if (sortedDates.length === 0) return 0;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // If latest report is not today or yesterday, streak is broken
  const latestDate = sortedDates[0];
  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    return 0;
  }

  let streak = 1;
  let currentDate = new Date(latestDate);

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    if (sortedDates.includes(prevDateStr)) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Evaluate all badge criteria for a given user and return earned/new badges
 */
export function evaluateBadges(
  user: UserProfile,
  userReports: ReadingReport[],
  booksList: Book[]
): {
  updatedBadges: string[];
  newlyUnlockedBadges: Badge[];
  streakCount: number;
  badgeEarnedDates: Record<string, string>;
} {
  const safeReports = Array.isArray(userReports) ? userReports : [];
  const safeBooks = Array.isArray(booksList) ? booksList : [];

  const existingBadges = new Set<string>(user?.badges || []);
  const existingEarnedDates: Record<string, string> = { ...(user?.badgeEarnedDates || {}) };
  const newlyUnlockedBadges: Badge[] = [];
  const nowIso = new Date().toISOString();

  // Metrics
  const totalReportsCount = safeReports.length;
  const uniqueBooksCount = new Set(safeReports.map((r) => r.bookId || r.bookTitle)).size;

  // Categories count
  const bookCategoryMap = new Map<string, string>();
  safeBooks.forEach((b) => {
    bookCategoryMap.set(b.id, b.category);
    bookCategoryMap.set(b.title, b.category);
  });

  const uniqueCategories = new Set<string>();
  safeReports.forEach((r) => {
    const cat = bookCategoryMap.get(r.bookId) || bookCategoryMap.get(r.bookTitle);
    if (cat) uniqueCategories.add(cat);
  });
  const categoriesCount = uniqueCategories.size;

  // Streak
  const streakCount = calculateReadingStreak(safeReports);

  // Time check
  let hasEarlyBird = false;
  let hasNightOwl = false;

  safeReports.forEach((r) => {
    if (r.timestamp) {
      const dateObj = new Date(r.timestamp);
      const hour = dateObj.getHours();
      if (hour < 8) hasEarlyBird = true;
      if (hour >= 20) hasNightOwl = true;
    }
  });

  // Evaluate each badge
  BADGE_DEFINITIONS.forEach((badge) => {
    let unlocked = false;

    switch (badge.id) {
      case 'pemula':
        unlocked = uniqueBooksCount >= 1;
        break;
      case 'kutubuku':
        unlocked = uniqueBooksCount >= 5;
        break;
      case 'bintang':
        unlocked = uniqueBooksCount >= 10;
        break;
      case 'master':
        unlocked = uniqueBooksCount >= 20;
        break;
      case 'streak3':
        unlocked = streakCount >= 3;
        break;
      case 'streak7':
        unlocked = streakCount >= 7;
        break;
      case 'streak14':
        unlocked = streakCount >= 14;
        break;
      case 'genre3':
        unlocked = categoriesCount >= 3;
        break;
      case 'genre5':
        unlocked = categoriesCount >= 5;
        break;
      case 'refleksi10':
        unlocked = totalReportsCount >= 10;
        break;
      case 'earlybird':
        unlocked = hasEarlyBird;
        break;
      case 'nightowl':
        unlocked = hasNightOwl;
        break;
      default:
        break;
    }

    if (unlocked) {
      if (!existingBadges.has(badge.id)) {
        existingBadges.add(badge.id);
        existingEarnedDates[badge.id] = nowIso;
        newlyUnlockedBadges.push(badge);
      }
    }
  });

  return {
    updatedBadges: Array.from(existingBadges),
    newlyUnlockedBadges,
    streakCount,
    badgeEarnedDates: existingEarnedDates,
  };
}

/**
 * Get current progress for a badge
 */
export function getBadgeProgress(
  badge: Badge,
  userReports: ReadingReport[],
  booksList: Book[]
): { current: number; target: number; percentage: number } {
  const safeReports = Array.isArray(userReports) ? userReports : [];
  const safeBooks = Array.isArray(booksList) ? booksList : [];

  const uniqueBooksCount = new Set(safeReports.map((r) => r.bookId || r.bookTitle)).size;

  const bookCategoryMap = new Map<string, string>();
  safeBooks.forEach((b) => {
    bookCategoryMap.set(b.id, b.category);
    bookCategoryMap.set(b.title, b.category);
  });

  const uniqueCategories = new Set<string>();
  safeReports.forEach((r) => {
    const cat = bookCategoryMap.get(r.bookId) || bookCategoryMap.get(r.bookTitle);
    if (cat) uniqueCategories.add(cat);
  });

  const streakCount = calculateReadingStreak(safeReports);

  let current = 0;
  switch (badge.id) {
    case 'pemula':
    case 'kutubuku':
    case 'bintang':
    case 'master':
      current = uniqueBooksCount;
      break;
    case 'streak3':
    case 'streak7':
    case 'streak14':
      current = streakCount;
      break;
    case 'genre3':
    case 'genre5':
      current = uniqueCategories.size;
      break;
    case 'refleksi10':
      current = safeReports.length;
      break;
    case 'earlybird':
    case 'nightowl':
      current = 0; // boolean achievement
      break;
  }

  const target = badge.target;
  const percentage = Math.min(100, Math.round((current / target) * 100));

  return { current, target, percentage };
}
