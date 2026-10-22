import { AppSettings, ReadingReport } from '../types';

/**
 * Counts words in a string
 */
export function countWords(text: string = ''): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Detailed points breakdown for a reading report according to the 100-point schema:
 * 1. Sesi Membaca E-Book: +10 Poin (Otomatis setelah durasi baca selesai)
 * 2. Q1. Identitas Buku & Halaman Dibaca: +10 Poin (Otomatis saat diisi)
 * 3. Q2. Ringkasan Isi Buku: +30 Poin (Otomatis jika >= 50 kata)
 * 4. Q3. Kelebihan Buku: +15 Poin (Otomatis saat diisi)
 * 5. Q4. Kekurangan Buku: +15 Poin (Otomatis saat diisi)
 * 6. Q5. Saran & Kelayakan Dibaca: +20 Poin (Otomatis saat diisi)
 * Total Dasar: 100 Poin Dasar
 * + Admin Custom Validation Bonus Points (Manual oleh Guru/Admin)
 */
export interface ReportPointsBreakdown {
  readingSessionPoints: number; // +10
  q1IdentitasPoints: number;    // +10
  q2RingkasanPoints: number;    // +30
  q3KelebihanPoints: number;    // +15
  q4KekuranganPoints: number;   // +15
  q5SaranPoints: number;        // +20
  baseTotalPoints: number;      // Total dari 6 komponen (maksimal 100)
  
  // Legacy aliases
  baseReadingPoints: number;
  summaryWordCountPoints: number;

  adminBonusPoints: number;     // Bonus poin bebas guru
  adminPenaltyPoints: number;   // Pengurangan / Penalti poin guru
  totalPoints: number;          // Math.max(0, baseTotalPoints + adminBonusPoints - adminPenaltyPoints)
  wordCount: number;
  isRejected: boolean;
  statusLabel: string;
}

export function calculateReportPoints(rep: ReadingReport): ReportPointsBreakdown {
  let ringkasanIsi = rep.ringkasanIsi || '';
  let kelebihanBuku = rep.kelebihanBuku || '';
  let kekuranganBuku = rep.kekuranganBuku || '';
  let saranKelayakan = rep.saranKelayakan || '';

  // Extract from legacy summary if separate fields are not present
  const rawSummaryText = rep.summary || '';
  if (!ringkasanIsi && rawSummaryText && rawSummaryText.includes('[RINGKASAN ISI BUKU]')) {
    const ringkasanMatch = rawSummaryText.match(/\[RINGKASAN ISI BUKU\]\s*([\s\S]*?)(?=\n\n\[|$)/);
    const kelebihanMatch = rawSummaryText.match(/\[KELEBIHAN BUKU\]\s*([\s\S]*?)(?=\n\n\[|$)/);
    const kekuranganMatch = rawSummaryText.match(/\[KEKURANGAN BUKU\]\s*([\s\S]*?)(?=\n\n\[|$)/);
    const saranMatch = rawSummaryText.match(/\[SARAN \/ PERTIMBANGAN KELAYAKAN BUKU\]\s*([\s\S]*?)(?=\n\n\[|$)/);
    
    if (ringkasanMatch && ringkasanMatch[1].trim()) ringkasanIsi = ringkasanMatch[1].trim();
    if (kelebihanMatch && kelebihanMatch[1].trim() && !kelebihanBuku) kelebihanBuku = kelebihanMatch[1].trim();
    if (kekuranganMatch && kekuranganMatch[1].trim() && !kekuranganBuku) kekuranganBuku = kekuranganMatch[1].trim();
    if (saranMatch && saranMatch[1].trim() && !saranKelayakan) saranKelayakan = saranMatch[1].trim();
  }

  const effectiveSummary = ringkasanIsi || rawSummaryText;
  const wordCount = rep.summaryWordCount ?? countWords(effectiveSummary);

  if (rep.status === 'Ditolak' || rep.status === 'rejected') {
    return {
      readingSessionPoints: 0,
      q1IdentitasPoints: 0,
      q2RingkasanPoints: 0,
      q3KelebihanPoints: 0,
      q4KekuranganPoints: 0,
      q5SaranPoints: 0,
      baseTotalPoints: 0,
      baseReadingPoints: 0,
      summaryWordCountPoints: 0,
      adminBonusPoints: 0,
      adminPenaltyPoints: 0,
      totalPoints: 0,
      wordCount,
      isRejected: true,
      statusLabel: 'Ditolak ❌',
    };
  }

  // 1. Sesi Membaca E-Book (10 Poin)
  const readingSessionPoints = rep.readingSessionPoints !== undefined
    ? rep.readingSessionPoints
    : 10;

  // 2. Q1. Identitas Buku & Halaman Dibaca (10 Poin)
  const hasQ1Filled = Boolean(
    (rep.pagesRead && rep.pagesRead.trim().length > 0) ||
    (rep.identitasBuku?.halamanDibaca && rep.identitasBuku.halamanDibaca.trim().length > 0)
  );
  const q1IdentitasPoints = rep.q1IdentitasPoints !== undefined
    ? rep.q1IdentitasPoints
    : (hasQ1Filled ? 10 : 0);

  // 3. Q2. Ringkasan Isi Buku (30 Poin if >= 50 words)
  const hasMin50Words = wordCount >= 50;
  const q2RingkasanPoints = rep.q2RingkasanPoints !== undefined
    ? rep.q2RingkasanPoints
    : (hasMin50Words ? 30 : 0);

  // 4. Q3. Kelebihan Buku (15 Poin)
  const hasQ3Filled = Boolean(
    kelebihanBuku &&
    kelebihanBuku.trim().length > 0 &&
    kelebihanBuku.trim().toLowerCase() !== 'tidak dicantumkan'
  );
  const q3KelebihanPoints = rep.q3KelebihanPoints !== undefined
    ? rep.q3KelebihanPoints
    : (hasQ3Filled ? 15 : 0);

  // 5. Q4. Kekurangan Buku (15 Poin)
  const hasQ4Filled = Boolean(
    kekuranganBuku &&
    kekuranganBuku.trim().length > 0 &&
    kekuranganBuku.trim().toLowerCase() !== 'tidak dicantumkan'
  );
  const q4KekuranganPoints = rep.q4KekuranganPoints !== undefined
    ? rep.q4KekuranganPoints
    : (hasQ4Filled ? 15 : 0);

  // 6. Q5. Saran & Pertimbangan Kelayakan (20 Poin)
  const hasQ5Filled = Boolean(
    saranKelayakan &&
    saranKelayakan.trim().length > 0 &&
    saranKelayakan.trim().toLowerCase() !== 'tidak dicantumkan'
  );
  const q5SaranPoints = rep.q5SaranPoints !== undefined
    ? rep.q5SaranPoints
    : (hasQ5Filled ? 20 : 0);

  // Calculate Base Total Points (0 to 100)
  let baseTotalPoints = rep.baseTotalPoints !== undefined
    ? Math.min(100, Math.max(0, rep.baseTotalPoints))
    : Math.min(100, Math.max(0, readingSessionPoints + q1IdentitasPoints + q2RingkasanPoints + q3KelebihanPoints + q4KekuranganPoints + q5SaranPoints));

  // Admin Custom Bonus & Penalty Points
  let adminBonusPoints = rep.adminBonusPoints ?? 0;
  if (rep.status === 'Setujui_Bonus' && rep.adminBonusPoints === undefined) {
    adminBonusPoints = 30; // default fallback for legacy data
  } else if (rep.status === 'Setujui_Standar' && rep.adminBonusPoints === undefined) {
    adminBonusPoints = 0;
  }

  let adminPenaltyPoints = rep.adminPenaltyPoints ?? 0;

  // Final Points formula strictly clamped between 0 and 100
  const totalPoints = rep.pointsTotal !== undefined 
    ? Math.min(100, Math.max(0, rep.pointsTotal))
    : Math.min(100, Math.max(0, baseTotalPoints + adminBonusPoints - adminPenaltyPoints));

  let statusLabel = 'Menunggu Validasi';
  const isVerified = rep.status === 'Diverifikasi' || rep.status === 'Setujui_Bonus' || rep.status === 'Setujui_Standar' || rep.status === 'approved' || rep.status === 'Disetujui' || rep.status === 'verified';

  if (isVerified) {
    if (adminBonusPoints > 0 && adminPenaltyPoints > 0) {
      statusLabel = `Selesai (+${adminBonusPoints} / -${adminPenaltyPoints} Poin)`;
    } else if (adminBonusPoints > 0) {
      statusLabel = `Disetujui (+Bonus ${adminBonusPoints} Poin)`;
    } else if (adminPenaltyPoints > 0) {
      statusLabel = `Disetujui (-Penalti ${adminPenaltyPoints} Poin)`;
    } else {
      statusLabel = 'Selesai / Terverifikasi ✔️';
    }
  }

  return {
    readingSessionPoints,
    q1IdentitasPoints,
    q2RingkasanPoints,
    q3KelebihanPoints,
    q4KekuranganPoints,
    q5SaranPoints,
    baseTotalPoints,
    baseReadingPoints: readingSessionPoints + q1IdentitasPoints,
    summaryWordCountPoints: q2RingkasanPoints,
    adminBonusPoints,
    adminPenaltyPoints,
    totalPoints,
    wordCount,
    isRejected: false,
    statusLabel,
  };
}

/**
 * Calculates total points for a student from all their reports and badge bonuses
 */
export function calculateStudentTotalPoints(
  reportsOrUser?: ReadingReport[] | AppSettings | any,
  badgePointsOrReports?: number | ReadingReport[] | any
): number {
  let reportsArray: ReadingReport[] = [];
  let badgePoints = 0;

  if (Array.isArray(reportsOrUser)) {
    reportsArray = reportsOrUser;
    if (typeof badgePointsOrReports === 'number') {
      badgePoints = badgePointsOrReports;
    }
  } else if (Array.isArray(badgePointsOrReports)) {
    reportsArray = badgePointsOrReports;
    if (typeof reportsOrUser === 'number') {
      badgePoints = reportsOrUser;
    }
  } else if (typeof reportsOrUser === 'number') {
    badgePoints = reportsOrUser;
  } else if (typeof badgePointsOrReports === 'number') {
    badgePoints = badgePointsOrReports;
  }

  if (!Array.isArray(reportsArray) || reportsArray.length === 0) {
    return badgePoints;
  }

  const reportsTotal = reportsArray.reduce((acc, rep) => {
    if (!rep) return acc;
    return acc + (calculateReportPoints(rep)?.totalPoints || 0);
  }, 0);

  return reportsTotal + badgePoints;
}

/**
 * Helper to evaluate Literacy Schedule Access
 */
export interface ScheduleAccessResult {
  isOpen: boolean;
  reason: string;
  scheduleDescription: string;
}

export function checkLiteracyAccess(settings?: AppSettings): ScheduleAccessResult {
  const defaultDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const activeDays = settings?.activeDays && settings.activeDays.length > 0
    ? settings.activeDays
    : defaultDays;
  const startTime = settings?.activeStartTime || '07:00';
  const endTime = settings?.activeEndTime || '08:00';

  const scheduleDescription = `Hari aktif: ${activeDays.join(', ')} • Jam aktif: ${startTime} - ${endTime} WIB`;

  if (!settings) {
    return {
      isOpen: true,
      reason: 'Akses Pengiriman Laporan Terbuka.',
      scheduleDescription,
    };
  }

  // 1. Check if schedule mode is 'manual' or isAccessOpenManual is explicitly controlled
  if (settings.scheduleMode === 'manual') {
    if (settings.isAccessOpenManual === false) {
      return {
        isOpen: false,
        reason: 'Akses Pengiriman Laporan Literasi Sedang Ditutup oleh Admin (Manual).',
        scheduleDescription,
      };
    }
    return {
      isOpen: true,
      reason: 'Akses Pengiriman Laporan Literasi Sedang Dibuka oleh Admin (Manual).',
      scheduleDescription,
    };
  }

  // 2. Check manual toggle if forced closed
  if (settings.isAccessOpenManual === false) {
    return {
      isOpen: false,
      reason: 'Akses Pengiriman Laporan Literasi Sedang Ditutup oleh Admin.',
      scheduleDescription,
    };
  }

  // 3. Automatic Schedule Check
  const daysOfWeekMap: Record<number, string> = {
    0: 'Minggu',
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat',
    6: 'Sabtu',
  };

  const now = new Date();
  const currentDayName = daysOfWeekMap[now.getDay()];

  if (!activeDays.includes(currentDayName)) {
    return {
      isOpen: false,
      reason: `Akses Pengiriman Laporan Literasi Sedang Ditutup oleh Admin. (Hari ini ${currentDayName} di luar hari aktif ${activeDays.join(', ')})`,
      scheduleDescription,
    };
  }

  const currentHH = String(now.getHours()).padStart(2, '0');
  const currentMM = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHH}:${currentMM}`;

  if (currentTimeStr < startTime || currentTimeStr > endTime) {
    return {
      isOpen: false,
      reason: `Akses Pengiriman Laporan Literasi Sedang Ditutup oleh Admin. (Jam saat ini ${currentTimeStr} WIB di luar jam aktif ${startTime} - ${endTime} WIB)`,
      scheduleDescription,
    };
  }

  return {
    isOpen: true,
    reason: 'Akses Pengiriman Laporan Literasi Terbuka (Sesuai Jadwal).',
    scheduleDescription,
  };
}

/**
 * Robust helper to extract a normalized local "YYYY-MM-DD" string from any report.
 * Accurately parses:
 * - Firestore Timestamp objects (with .toDate() or .seconds)
 * - ISO string timestamps (e.g. "2026-08-14T07:30:00.000Z")
 * - Numeric timestamp in milliseconds
 * - dateStr ("YYYY-MM-DD")
 * - createdAt / tanggal / date fields
 */
export function getReportLocalDate(rep: any): string {
  if (!rep) return '';

  // 1. If explicit dateStr in YYYY-MM-DD format exists and is valid
  if (rep.dateStr && typeof rep.dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rep.dateStr.trim())) {
    return rep.dateStr.trim();
  }

  // 2. Check various timestamp fields
  const raw = rep.timestamp || rep.createdAt || rep.tanggal || rep.date || rep.tanggalBaca;
  if (!raw) return '';

  let dt: Date | null = null;
  if (typeof raw.toDate === 'function') {
    dt = raw.toDate();
  } else if (typeof raw.seconds === 'number') {
    dt = new Date(raw.seconds * 1000);
  } else if (typeof raw === 'number') {
    dt = new Date(raw);
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      dt = parsed;
    }
  } else if (raw instanceof Date && !isNaN(raw.getTime())) {
    dt = raw;
  }

  if (dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
}

/**
 * Format report date into readable Indonesian text (e.g., "Kamis, 14 Agu 2026, 07:30 WIB")
 */
export function formatReportDisplayDate(rep: any): string {
  if (!rep) return '-';
  const raw = rep.timestamp || rep.createdAt || rep.tanggal || rep.date;
  let dt: Date | null = null;

  if (raw) {
    if (typeof raw.toDate === 'function') {
      dt = raw.toDate();
    } else if (typeof raw.seconds === 'number') {
      dt = new Date(raw.seconds * 1000);
    } else if (typeof raw === 'number') {
      dt = new Date(raw);
    } else if (typeof raw === 'string') {
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        dt = parsed;
      }
    } else if (raw instanceof Date) {
      dt = raw;
    }
  }

  if (!dt && rep.dateStr) {
    const [y, m, d] = rep.dateStr.split('-').map(Number);
    if (y && m && d) {
      dt = new Date(y, m - 1, d);
    }
  }

  if (dt) {
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const dayName = dayNames[dt.getDay()];
    const dateNum = dt.getDate();
    const monthName = monthNames[dt.getMonth()];
    const year = dt.getFullYear();
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${dayName}, ${dateNum} ${monthName} ${year} ${hh}:${mm}`;
  }

  return rep.dateStr || '-';
}
