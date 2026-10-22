export type UserRole = 'siswa' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  kelas: string; // e.g. "X-1"
  role: UserRole;
  isProfileComplete?: boolean; // True if name & class are set
  createdAt?: string;
  updatedAt?: string;
  badges?: string[]; // Array of unlocked badge IDs
  badgeEarnedDates?: Record<string, string>; // Map of badgeId -> ISO string date
  equippedBadgeId?: string; // ID of currently equipped badge on profile
  streakCount?: number; // Current consecutive reading day streak
  lastReadDate?: string; // Last date YYYY-MM-DD
  points?: number;
  totalPoints?: number;
  forceLogout?: boolean;
  forceLogoutAt?: string;
  readingHistory?: any[];
  approvedReportsCount?: number;
  totalReports?: number;
  reportsCount?: number;
  totalPagesRead?: number;
  totalPages?: number;
  pagesRead?: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  coverUrl: string;
  pdfUrl: string;
  description?: string;
  pageCount?: number;
  createdAt?: string;
  status?: 'draft' | 'published'; // 'draft' = Disembunyikan, 'published' = Tampil di Siswa
  isPublished?: boolean;
  isDraft?: boolean;
  isUserUploaded?: boolean;
}

export interface ReadingReport {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  kelas: string;
  bookId: string;
  bookTitle: string;
  bookAuthor?: string;
  bookPublisher?: string;
  bookPublishYear?: string;
  pagesRead: string;
  
  // 5 Structured review fields
  identitasBuku?: {
    judul?: string;
    penulis?: string;
    penerbit?: string;
    tahunTerbit?: string;
    halamanDibaca?: string;
  };
  ringkasanIsi?: string; // b. Ringkasan Isi Buku
  kelebihanBuku?: string; // c. Kelebihan Buku
  kekuranganBuku?: string; // d. Kekurangan Buku
  saranKelayakan?: string; // e. Saran / Pertimbangan Kelayakan Buku

  summary: string; // Unified review string combining all 5 sections
  summaryWordCount?: number;
  
  // Point system (Total 100 base component points + custom admin bonus)
  readingSessionPoints?: number; // Sesi Membaca E-Book (10 pts)
  q1IdentitasPoints?: number;    // Q1. Identitas Buku & Hal (10 pts)
  q2RingkasanPoints?: number;    // Q2. Ringkasan min 50 kata (30 pts)
  q3KelebihanPoints?: number;    // Q3. Kelebihan Buku (15 pts)
  q4KekuranganPoints?: number;   // Q4. Kekurangan Buku (15 pts)
  q5SaranPoints?: number;        // Q5. Saran & Kelayakan (20 pts)
  baseTotalPoints?: number;      // Total of 6 components above (up to 100 pts)

  // Legacy fallback fields for backward compatibility
  baseReadingPoints?: number; 
  summaryWordCountPoints?: number; 
  
  adminBonusPoints?: number; // Custom admin bonus points (e.g. 10, 25, 50, 100, etc.)
  adminPenaltyPoints?: number; // Penalty points (e.g. 10, 20, etc. subtracted from base points)
  pointsTotal?: number; // Total combined points for this report
  
  // Anti-Cheat (Exambro Web Style)
  tabSwitchCount?: number; // Number of tab/app switch infractions detected
  antiCheatViolations?: number; // Equivalent counter
  isLockedDueToCheating?: boolean; // True if violations exceeded tolerance (>3 times)
  
  status: 'Menunggu Validasi' | 'Terkirim' | 'Diverifikasi' | 'Setujui_Bonus' | 'Setujui_Standar' | 'Ditolak' | string;
  summaryGrade?: number; // Nilai Rangkuman skala 0 - 100 dari Guru/Admin
  validationNote?: string;
  validatedAt?: string;
  validatedBy?: string;
  timestamp: string; // ISO String or formatted timestamp
  dateStr: string;   // YYYY-MM-DD
}

export interface AppSettings {
  adminEmails: string[];
  classes: string[];
  // Literacy Access & Schedule Settings
  scheduleMode?: 'manual' | 'schedule'; // 'manual' force override vs 'schedule' automatic time check
  isAccessOpenManual?: boolean; // Manual toggle switch: true = Buka, false = Tutup
  activeDays?: string[]; // e.g. ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
  activeStartTime?: string; // e.g. "07:00"
  activeEndTime?: string; // e.g. "08:00"
  // Visibility of Student Points & Leaderboard
  isLeaderboardVisible?: boolean; // Default: true (true = Tampilkan, false = Sembunyikan)
  // Individual Student Session Timers
  readingDurationMinutes?: number; // Default: 10 menit
  summaryDurationMinutes?: number; // Default: 5 menit
  // Automatic Point Scheme Weights (Draft Nilai Awal Skala Max 100)
  pointWeights?: {
    q1IdentitasPoints?: number; // Default: 10
    q2RingkasanPoints?: number; // Default: 40
    q3KelebihanPoints?: number; // Default: 25
    q4KekuranganPoints?: number; // Default: 25
  };
}

export interface AdminWhitelistEntry {
  id?: string;
  email: string;
  name?: string;
  role?: 'admin';
  category?: 'tetap' | 'anggota'; // 'tetap' (Kategori 1: Admin Tetap) vs 'anggota' (Kategori 2: Admin Anggota)
  addedAt?: string;
  addedBy?: string;
}

export interface AttendanceMonthSchedule {
  id: string;
  monthName: string; // e.g. "OKTOBER", "NOVEMBER", "DESEMBER"
  year?: number; // e.g. 2026
  monthIndex?: number; // 0..11 (e.g. 9 for Oktober)
  dates: number[]; // e.g. [1, 17, 24, 31]
}

export interface AttendanceConfig {
  academicYear: string; // e.g. "2024/2025" or "2025/2026"
  semester: string; // e.g. "Ganjil" or "Genap"
  months: AttendanceMonthSchedule[];
  updatedAt?: string;
  updatedBy?: string;
}

