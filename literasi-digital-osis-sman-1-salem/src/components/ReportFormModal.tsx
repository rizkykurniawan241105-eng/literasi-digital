import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  BookCheck, 
  User, 
  Mail, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Bookmark, 
  Lock, 
  Sparkles, 
  ThumbsUp, 
  ThumbsDown, 
  Lightbulb, 
  Info,
  Calendar,
  Building2,
  PenTool,
  CheckCircle2,
  AlertCircle,
  Award,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  CopyX,
  AlertTriangle,
  Save,
  Clock,
  Hourglass,
  LogOut
} from 'lucide-react';
import { Book, UserProfile, AppSettings } from '../types';
import { checkLiteracyAccess, countWords } from '../utils/pointsAndSchedule';

interface ReportFormModalProps {
  isOpen: boolean;
  user: UserProfile;
  book: Book | null;
  appSettings?: AppSettings;
  onClose: () => void;
  onForceLogout?: () => void;
  onSubmitReport: (data: {
    bookId: string;
    bookTitle: string;
    bookAuthor?: string;
    bookPublisher?: string;
    bookPublishYear?: string;
    pagesRead: string;
    identitasBuku?: {
      judul?: string;
      penulis?: string;
      penerbit?: string;
      tahunTerbit?: string;
      halamanDibaca?: string;
    };
    ringkasanIsi: string;
    kelebihanBuku: string;
    kekuranganBuku: string;
    saranKelayakan: string;
    summary: string;
    summaryWordCount: number;
    readingSessionPoints: number;
    q1IdentitasPoints: number;
    q2RingkasanPoints: number;
    q3KelebihanPoints: number;
    q4KekuranganPoints: number;
    q5SaranPoints: number;
    baseTotalPoints: number;
    baseReadingPoints: number;
    summaryWordCountPoints: number;
    adminBonusPoints: number;
    tabSwitchCount?: number;
    antiCheatViolations?: number;
    isLockedDueToCheating?: boolean;
  }) => Promise<void>;
}

export const ReportFormModal: React.FC<ReportFormModalProps> = ({
  isOpen,
  user,
  book,
  appSettings,
  onClose,
  onForceLogout,
  onSubmitReport,
}) => {
  // 1. Identitas Buku Fields
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookPublisher, setBookPublisher] = useState('');
  const [bookPublishYear, setBookPublishYear] = useState('');
  const [pagesRead, setPagesRead] = useState('');

  // 2. Structured Review Textarea Fields (5-Poin Ulasan)
  const [ringkasanIsi, setRingkasanIsi] = useState('');
  const [kelebihanBuku, setKelebihanBuku] = useState('');
  const [kekuranganBuku, setKekuranganBuku] = useState('');
  const [saranKelayakan, setSaranKelayakan] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 3. Fitur Auto-Save & Draf Recovery State
  const [isDraftRecovered, setIsDraftRecovered] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  // 4. Fitur Anti-Kecurangan (Exambro Style) State
  const [antiCheatViolations, setAntiCheatViolations] = useState(0);
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const [isFormLocked, setIsFormLocked] = useState(false);
  const [showPasteToast, setShowPasteToast] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);

  // 5. Individual Summary Countdown Timer (Waktu Merangkum)
  const summaryDurationMinutes = appSettings?.summaryDurationMinutes || 5;
  const [summarySecondsRemaining, setSummarySecondsRemaining] = useState<number>(summaryDurationMinutes * 60);
  const [showSummaryTimeUpModal, setShowSummaryTimeUpModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const summaryTimerFinishedRef = useRef<boolean>(false);

  // Refs for event debouncing & lifecycle
  const lastViolationTimeRef = useRef<number>(0);
  const isSubmittedRef = useRef<boolean>(false);

  // Storage key specific to user and book
  const draftKey = book && user ? `literal_report_draft_${user.uid}_${book.id}` : '';
  const timerKey = book && user ? `literal_report_start_${user.uid}_${book.id}` : '';

  // Summary Timer Effect
  useEffect(() => {
    if (!book || !isOpen || !user) {
      setShowSummaryTimeUpModal(false);
      summaryTimerFinishedRef.current = false;
      return;
    }

    const totalSeconds = (appSettings?.summaryDurationMinutes || 5) * 60;
    
    // Retrieve or record report session start timestamp
    let startTime = parseInt(sessionStorage.getItem(timerKey) || '0', 10);
    if (!startTime || isNaN(startTime)) {
      startTime = Date.now();
      sessionStorage.setItem(timerKey, startTime.toString());
    }

    const updateTimer = () => {
      if (isSubmittedRef.current) return;
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsedSeconds);
      setSummarySecondsRemaining(remaining);

      if (remaining === 0 && !summaryTimerFinishedRef.current && !isSubmittedRef.current) {
        summaryTimerFinishedRef.current = true;
        setShowSummaryTimeUpModal(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isOpen, book?.id, user?.uid, timerKey, appSettings?.summaryDurationMinutes]);

  // Initial Load / Draft Recovery
  useEffect(() => {
    if (!book || !isOpen) return;

    isSubmittedRef.current = false;
    setShowTabSwitchWarning(false);
    setShowPasteToast(false);
    setShowCloseConfirmModal(false);

    // Attempt to recover draft from localStorage
    if (draftKey) {
      const savedRaw = localStorage.getItem(draftKey);
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw);
          if (
            parsed && 
            (parsed.pagesRead || parsed.ringkasanIsi || parsed.kelebihanBuku || parsed.kekuranganBuku || parsed.saranKelayakan || parsed.bookAuthor)
          ) {
            setBookAuthor(parsed.bookAuthor ?? (book.author || ''));
            setBookPublisher(parsed.bookPublisher ?? '');
            setBookPublishYear(parsed.bookPublishYear ?? '');
            setPagesRead(parsed.pagesRead ?? '');
            setRingkasanIsi(parsed.ringkasanIsi ?? '');
            setKelebihanBuku(parsed.kelebihanBuku ?? '');
            setKekuranganBuku(parsed.kekuranganBuku ?? '');
            setSaranKelayakan(parsed.saranKelayakan ?? '');
            
            if (typeof parsed.antiCheatViolations === 'number') {
              setAntiCheatViolations(parsed.antiCheatViolations);
              if (parsed.antiCheatViolations >= 4) {
                setIsFormLocked(true);
              }
            } else {
              setAntiCheatViolations(0);
              setIsFormLocked(false);
            }

            setIsDraftRecovered(true);
            setDraftSavedAt(parsed.updatedAt ? new Date(parsed.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null);
            setError('');
            return;
          }
        } catch (e) {
          console.warn('Gagal membaca draf dari localStorage:', e);
        }
      }
    }

    // Default clean state if no draft exists
    setBookAuthor(book.author || '');
    setBookPublisher('');
    setBookPublishYear('');
    setPagesRead('');
    setRingkasanIsi('');
    setKelebihanBuku('');
    setKekuranganBuku('');
    setSaranKelayakan('');
    setAntiCheatViolations(0);
    setIsFormLocked(false);
    setIsDraftRecovered(false);
    setDraftSavedAt(null);
    setError('');
  }, [book, isOpen, draftKey]);

  // Real-time Auto-Save to localStorage on every field change
  useEffect(() => {
    if (!isOpen || !book || !draftKey || isSubmittedRef.current) return;

    const hasData = Boolean(
      pagesRead.trim() || 
      ringkasanIsi.trim() || 
      kelebihanBuku.trim() || 
      kekuranganBuku.trim() || 
      saranKelayakan.trim() ||
      bookPublisher.trim() ||
      bookPublishYear.trim()
    );

    if (hasData) {
      const nowIso = new Date().toISOString();
      const draftPayload = {
        bookId: book.id,
        bookTitle: book.title,
        bookAuthor,
        bookPublisher,
        bookPublishYear,
        pagesRead,
        ringkasanIsi,
        kelebihanBuku,
        kekuranganBuku,
        saranKelayakan,
        antiCheatViolations,
        updatedAt: nowIso,
      };

      try {
        localStorage.setItem(draftKey, JSON.stringify(draftPayload));
        setDraftSavedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.warn('Gagal menyimpan draf otomatis:', err);
      }
    }
  }, [
    bookAuthor, 
    bookPublisher, 
    bookPublishYear, 
    pagesRead, 
    ringkasanIsi, 
    kelebihanBuku, 
    kekuranganBuku, 
    saranKelayakan, 
    antiCheatViolations, 
    isOpen, 
    book, 
    draftKey
  ]);

  // Fitur Anti-Kecurangan: Visibility Change & Blur Listener (Exambro Style)
  useEffect(() => {
    if (!isOpen || isFormLocked || isSubmittedRef.current) return;

    const recordViolation = () => {
      const now = Date.now();
      // Debounce events within 1.5 seconds to prevent double triggers
      if (now - lastViolationTimeRef.current < 1500) return;
      lastViolationTimeRef.current = now;

      setAntiCheatViolations((prevCount) => {
        const updated = prevCount + 1;
        if (updated >= 4) {
          setIsFormLocked(true);
        }
        setShowTabSwitchWarning(true);
        return updated;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordViolation();
      }
    };

    const handleWindowBlur = () => {
      // Check if document truly lost focus
      if (!document.hasFocus()) {
        recordViolation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isOpen, isFormLocked]);

  // Fitur Konfirmasi Keluar (beforeunload) saat form memiliki isi
  useEffect(() => {
    if (!isOpen) return;

    const isDirty = Boolean(
      pagesRead.trim() || 
      ringkasanIsi.trim() || 
      kelebihanBuku.trim()
    );

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmittedRef.current) {
        e.preventDefault();
        e.returnValue = 'Apakah Anda yakin ingin meninggalkan halaman ini? Data yang belum dikirim mungkin akan hilang.';
        return 'Apakah Anda yakin ingin meninggalkan halaman ini? Data yang belum dikirim mungkin akan hilang.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, pagesRead, ringkasanIsi, kelebihanBuku]);

  if (!isOpen || !book) return null;

  const accessStatus = checkLiteracyAccess(appSettings);
  
  // Real-time Component Points Calculation from Admin Point Weights (Max 100 Base Points Schema)
  const q1Weight = appSettings?.pointWeights?.q1IdentitasPoints ?? 10;
  const q2Weight = appSettings?.pointWeights?.q2RingkasanPoints ?? 40;
  const q3Weight = appSettings?.pointWeights?.q3KelebihanPoints ?? 25;
  const q4Weight = appSettings?.pointWeights?.q4KekuranganPoints ?? 25;

  const readingSessionPoints = 0; // Reading session absorbed into structured Q1-Q4 weights (Total 100 max)
  const isQ1Filled = pagesRead.trim().length > 0;
  const q1IdentitasPoints = isQ1Filled ? q1Weight : 0;
  const wordCount = countWords(ringkasanIsi);
  const isQ2Filled = wordCount >= 10;
  const q2RingkasanPoints = isQ2Filled ? q2Weight : 0;
  const isQ3Filled = kelebihanBuku.trim().length > 0;
  const q3KelebihanPoints = isQ3Filled ? q3Weight : 0;
  const isQ4Filled = kekuranganBuku.trim().length > 0;
  const q4KekuranganPoints = isQ4Filled ? q4Weight : 0;
  const isQ5Filled = saranKelayakan.trim().length > 0;
  const q5SaranPoints = 0;

  const totalEstimatedBasePoints = Math.min(
    100,
    q1IdentitasPoints + 
    q2RingkasanPoints + 
    q3KelebihanPoints + 
    q4KekuranganPoints +
    q5SaranPoints
  );

  // Handle attempt to close modal safely
  const handleRequestClose = () => {
    const hasUnsavedContent = Boolean(
      pagesRead.trim() || 
      ringkasanIsi.trim() || 
      kelebihanBuku.trim() || 
      kekuranganBuku.trim()
    );

    if (hasUnsavedContent) {
      setShowCloseConfirmModal(true);
    } else {
      onClose();
    }
  };

  // Block Paste Event Handler
  const handlePreventPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setShowPasteToast(true);
    setTimeout(() => {
      setShowPasteToast(false);
    }, 4000);
  };

  // Block Copy & Cut Handlers
  const handlePreventCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
  };

  // Clear draft manually if requested
  const handleClearDraft = () => {
    if (draftKey) {
      localStorage.removeItem(draftKey);
    }
    setBookAuthor(book.author || '');
    setBookPublisher('');
    setBookPublishYear('');
    setPagesRead('');
    setRingkasanIsi('');
    setKelebihanBuku('');
    setKekuranganBuku('');
    setSaranKelayakan('');
    setIsDraftRecovered(false);
    setDraftSavedAt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessStatus.isOpen) {
      setError(accessStatus.reason);
      return;
    }

    if (!pagesRead.trim()) {
      setError('Bagian/Halaman dibaca wajib diisi.');
      return;
    }

    if (!ringkasanIsi.trim() || ringkasanIsi.trim().length < 10) {
      setError('Ringkasan Isi Buku wajib diisi (minimal 10 karakter).');
      return;
    }

    const cleanRingkasan = ringkasanIsi.trim();
    const cleanKelebihan = kelebihanBuku.trim();
    const cleanKekurangan = kekuranganBuku.trim();
    const cleanSaran = saranKelayakan.trim();

    setLoading(true);
    setError('');

    try {
      isSubmittedRef.current = true;

      await onSubmitReport({
        bookId: book.id,
        bookTitle: book.title,
        bookAuthor: bookAuthor.trim() || book.author || '',
        bookPublisher: bookPublisher.trim(),
        bookPublishYear: bookPublishYear.trim(),
        pagesRead: pagesRead.trim(),
        identitasBuku: {
          judul: book.title,
          penulis: bookAuthor.trim() || book.author || '',
          penerbit: bookPublisher.trim(),
          tahunTerbit: bookPublishYear.trim(),
          halamanDibaca: pagesRead.trim(),
        },
        ringkasanIsi: cleanRingkasan,
        kelebihanBuku: cleanKelebihan,
        kekuranganBuku: cleanKekurangan,
        saranKelayakan: cleanSaran,
        summary: cleanRingkasan,
        summaryWordCount: wordCount,
        readingSessionPoints,
        q1IdentitasPoints,
        q2RingkasanPoints,
        q3KelebihanPoints,
        q4KekuranganPoints,
        q5SaranPoints,
        baseTotalPoints: totalEstimatedBasePoints,
        baseReadingPoints: readingSessionPoints + q1IdentitasPoints,
        summaryWordCountPoints: q2RingkasanPoints,
        adminBonusPoints: 0,
        tabSwitchCount: antiCheatViolations,
        antiCheatViolations,
        isLockedDueToCheating: isFormLocked || antiCheatViolations >= 4,
      });

      // Clear draft & session timer ONLY AFTER successful submit
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      if (timerKey) {
        sessionStorage.removeItem(timerKey);
      }
      if (book?.id) {
        sessionStorage.removeItem(`literal_read_start_${book.id}`);
      }

      // Show success modal confirmation
      setShowSuccessModal(true);
    } catch (err: any) {
      isSubmittedRef.current = false;
      setError(err?.message || 'Gagal mengirim laporan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setPagesRead('');
    setRingkasanIsi('');
    setKelebihanBuku('');
    setKekuranganBuku('');
    setSaranKelayakan('');
    setAntiCheatViolations(0);
    setIsFormLocked(false);
    onClose();
  };

  // Format MM:SS for summary timer
  const formatSummaryTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isSummaryLowTime = summarySecondsRemaining <= 60; // 1 minute warning

  const handleTimeOutLogout = () => {
    setShowSummaryTimeUpModal(false);
    if (timerKey) sessionStorage.removeItem(timerKey);
    if (book?.id) sessionStorage.removeItem(`literal_read_start_${book.id}`);
    onClose();
    if (onForceLogout) {
      onForceLogout();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-[28px] shadow-2xl border border-[#E2E8F8] overflow-hidden my-6 max-h-[92vh] flex flex-col relative">
        
        {/* Floating Toast Notification for Blocked Paste */}
        {showPasteToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[75] bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-rose-500/50 animate-bounce">
            <CopyX className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Menempel teks (Paste) dinonaktifkan demi menjaga orisinalitas ulasan siswa!</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#005AC1] via-blue-700 to-indigo-700 p-4 sm:p-5 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md shrink-0">
              <BookCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-base font-bold truncate">Form Laporan Ulasan Literasi</h3>
                <span className="hidden xs:flex bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-[10px] font-black px-2 py-0.5 rounded-full items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Exambro Shield</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-blue-100 truncate">Anti-Kecurangan Aktif • Auto-Save Draf Realtime</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Countdown Timer Waktu Merangkum */}
            <div 
              className={`flex items-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-full border transition-all shadow-xs ${
                isSummaryLowTime
                  ? 'bg-rose-500 text-white border-rose-300 animate-pulse'
                  : 'bg-white/15 text-white border-white/25 backdrop-blur-md'
              }`}
              title="Sisa waktu pengisian rangkuman literasi"
            >
              <Clock className={`w-3.5 h-3.5 ${isSummaryLowTime ? 'text-white' : 'text-amber-300'}`} />
              <div className="flex items-baseline gap-1 leading-none">
                <span className="hidden sm:inline text-[10px] font-bold opacity-80 uppercase">Sisa:</span>
                <span className="font-mono font-black text-xs sm:text-sm tracking-wider">
                  {formatSummaryTime(summarySecondsRemaining)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequestClose}
              className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Tutup Form"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-thin">
          
          {/* Status Bar: Anti-Cheat Info & Auto-Save */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <span className={`w-2.5 h-2.5 rounded-full ${antiCheatViolations > 0 ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
              <span className="text-[11px]">
                Mode Integritas: Toleransi Pindah Tab <strong className={antiCheatViolations >= 3 ? 'text-rose-600' : 'text-[#005AC1]'}>{Math.max(0, 3 - antiCheatViolations)}x tersisa</strong> (Maks. 3x)
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium self-end sm:self-auto">
              <Save className="w-3.5 h-3.5 text-emerald-600" />
              <span>{draftSavedAt ? `Draf tersimpan (${draftSavedAt})` : 'Auto-save aktif'}</span>
            </div>
          </div>

          {/* Draf Recovery Notification Banner */}
          {isDraftRecovered && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Draf tulisan Anda sebelumnya telah dipulihkan otomatis.</span>
              </div>
              <button
                type="button"
                onClick={handleClearDraft}
                className="px-2.5 py-1 text-[11px] bg-white hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Mulai Ulang Draf</span>
              </button>
            </div>
          )}

          {/* Locked Notice if Form is Locked */}
          {isFormLocked && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 text-xs space-y-2 animate-pulse">
              <div className="font-extrabold flex items-center gap-2 text-rose-700 text-sm">
                <Lock className="w-5 h-5" />
                <span>Formulir Terkunci: Pelanggaran Integritas Berulang</span>
              </div>
              <p className="font-medium text-rose-800">
                Anda telah terdeteksi meninggalkan halaman pengerjaan laporan sebanyak <strong>{antiCheatViolations} kali</strong> (melampaui batas toleransi 3 kali). Catatan pelanggaran telah direkam dan laporan ini akan ditandai untuk pemeriksaan guru/admin.
              </p>
            </div>
          )}

          {/* Banner Informasi Kunci Akses jika Ditutup */}
          {!accessStatus.isOpen && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
              <div className="font-bold text-rose-950 flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Akses Kegiatan Literasi Sedang Ditutup oleh Admin.</span>
              </div>
              <p className="text-rose-800 font-medium pl-6">
                {accessStatus.reason}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-bold flex items-center gap-2">
              <Info className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Info Card (Auto-filled) */}
          <div className="bg-[#EEF3FF] p-3.5 rounded-2xl border border-blue-100 space-y-2">
            <div className="text-[11px] font-bold text-[#001A41] uppercase tracking-wider flex items-center justify-between">
              <span>Identitas Siswa Pengirim</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#005AC1] bg-blue-100/70 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-[#005AC1]" />
                <span>Sesi Membaca Selesai</span>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 bg-white p-2 rounded-xl border border-slate-200/80">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate font-medium">{user.name}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 bg-white p-2 rounded-xl border border-slate-200/80">
                <GraduationCap className="w-3.5 h-3.5 text-[#005AC1] shrink-0" />
                <span className="font-bold text-[#005AC1]">{user.kelas || 'Belum Ada Kelas'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 bg-white p-2 rounded-xl border border-slate-200/80">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            </div>
          </div>

          {/* ================= BAGIAN 1 (Q1): IDENTITAS BUKU ================= */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#001A41] uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-[#005AC1]" />
                <span>Q1. Identitas Buku & Halaman Dibaca</span>
              </div>
            </div>

            {/* Judul Buku (Read Only) */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Judul Buku:
              </label>
              <div className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl text-xs font-bold text-[#001A41] shadow-2xs">
                {book.title}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Penulis Buku */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <PenTool className="w-3 h-3 text-[#005AC1]" />
                  <span>Penulis / Pengarang</span>
                </label>
                <input
                  type="text"
                  disabled={!accessStatus.isOpen || isFormLocked}
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                  placeholder="Nama Penulis"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 outline-hidden font-medium disabled:bg-slate-100"
                />
              </div>

              {/* Penerbit Buku */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#005AC1]" />
                  <span>Penerbit (Opsional)</span>
                </label>
                <input
                  type="text"
                  disabled={!accessStatus.isOpen || isFormLocked}
                  value={bookPublisher}
                  onChange={(e) => setBookPublisher(e.target.value)}
                  placeholder="Contoh: Balai Pustaka"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 outline-hidden font-medium disabled:bg-slate-100"
                />
              </div>

              {/* Tahun Terbit */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#005AC1]" />
                  <span>Tahun Terbit (Opsional)</span>
                </label>
                <input
                  type="text"
                  disabled={!accessStatus.isOpen || isFormLocked}
                  value={bookPublishYear}
                  onChange={(e) => setBookPublishYear(e.target.value)}
                  placeholder="Contoh: 2022"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 outline-hidden font-medium disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Halaman Dibaca */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-[#005AC1]" />
                  <span>Bagian / Halaman yang Dibaca <span className="text-red-500">*</span></span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">(Wajib diisi)</span>
              </div>
              <input
                type="text"
                required
                disabled={!accessStatus.isOpen || isFormLocked}
                placeholder="Contoh: Hal. 1 - 35, atau Bab 1 s.d. Bab 2"
                value={pagesRead}
                onChange={(e) => setPagesRead(e.target.value)}
                onPaste={handlePreventPaste}
                onCopy={handlePreventCopy}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 outline-hidden font-medium disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* ================= BAGIAN 2 (Q2): RINGKASAN ISI BUKU ================= */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-1 pb-1">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#005AC1]" />
                <label className="text-xs font-bold text-slate-800">
                  Q2. Ringkasan Isi Buku <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">Anti-Copas</span>
              </div>

              {/* Word Count Indicator */}
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {wordCount} Kata
              </span>
            </div>

            <textarea
              required
              rows={4}
              disabled={!accessStatus.isOpen || isFormLocked}
              placeholder="Tuliskan ringkasan isi buku secara mendalam dengan kalimat Anda sendiri (Ketik langsung, paste dinonaktifkan)..."
              value={ringkasanIsi}
              onChange={(e) => setRingkasanIsi(e.target.value)}
              onPaste={handlePreventPaste}
              onCopy={handlePreventCopy}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 transition-all outline-hidden resize-none font-medium disabled:bg-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* ================= BAGIAN 3 (Q3): KELEBIHAN BUKU ================= */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-1 pb-1">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                <span>Q3. Kelebihan Buku</span>
              </label>
            </div>

            <textarea
              rows={2}
              disabled={!accessStatus.isOpen || isFormLocked}
              placeholder="Tuliskan keunggulan buku (misal: gaya bahasa lugas, visual menarik, pesan moral berbobot)..."
              value={kelebihanBuku}
              onChange={(e) => setKelebihanBuku(e.target.value)}
              onPaste={handlePreventPaste}
              onCopy={handlePreventCopy}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all outline-hidden resize-none font-medium disabled:bg-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* ================= BAGIAN 4 (Q4): KEKURANGAN BUKU ================= */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-1 pb-1">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ThumbsDown className="w-4 h-4 text-rose-600" />
                <span>Q4. Kekurangan Buku</span>
              </label>
            </div>

            <textarea
              rows={2}
              disabled={!accessStatus.isOpen || isFormLocked}
              placeholder="Tuliskan kekurangan atau hal yang dirasa dapat diperbaiki dari buku ini..."
              value={kekuranganBuku}
              onChange={(e) => setKekuranganBuku(e.target.value)}
              onPaste={handlePreventPaste}
              onCopy={handlePreventCopy}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20 transition-all outline-hidden resize-none font-medium disabled:bg-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* ================= BAGIAN 5 (Q5): SARAN & KELAYAKAN BUKU ================= */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-1 pb-1">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Q5. Saran / Pertimbangan Kelayakan Dibaca</span>
              </label>
            </div>

            <textarea
              rows={2}
              disabled={!accessStatus.isOpen || isFormLocked}
              placeholder="Tuliskan rekomendasi atau pertimbangan kelayakan buku bagi pembaca lain..."
              value={saranKelayakan}
              onChange={(e) => setSaranKelayakan(e.target.value)}
              onPaste={handlePreventPaste}
              onCopy={handlePreventCopy}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all outline-hidden resize-none font-medium disabled:bg-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleRequestClose}
              className="py-2.5 px-5 text-xs font-bold text-slate-700 hover:bg-[#EEF3FF] rounded-full transition-colors cursor-pointer"
            >
              Batal
            </button>

            {accessStatus.isOpen ? (
              <button
                type="submit"
                disabled={loading}
                className={`py-2.5 px-6 text-white text-xs font-bold rounded-full transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                  isFormLocked
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20'
                    : 'bg-[#005AC1] hover:bg-[#00479A] shadow-blue-900/20'
                }`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isFormLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Kirim Laporan Terkunci (Catatan Pelanggaran)</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Laporan Lengkap</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="py-2.5 px-6 bg-slate-200 text-slate-500 text-xs font-bold rounded-full flex items-center gap-2 cursor-not-allowed opacity-80"
              >
                <Lock className="w-3.5 h-3.5 text-rose-500" />
                <span>Akses Pengiriman Ditutup</span>
              </button>
            )}
          </div>
        </form>

        {/* ================= MODAL PERINGATAN ANTI-KECURANGAN (EXAMBRO TAB SWITCH WARNING) ================= */}
        {showTabSwitchWarning && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border-2 border-rose-400 space-y-5 text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-rose-100 border-4 border-rose-200 text-rose-600 mx-auto flex items-center justify-center animate-bounce">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-black text-slate-900">
                  {antiCheatViolations >= 4 ? 'Akses Formulir Terkunci!' : 'Peringatan Pelanggaran Integritas!'}
                </h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {antiCheatViolations >= 4
                    ? 'Anda telah melampaui batas toleransi 3x perpindahan tab/jendela. Pengerjaan laporan terkunci otomatis.'
                    : 'Anda terdeteksi meninggalkan halaman pengerjaan laporan (berpindah tab browser, membuka aplikasi lain, atau meminimalkan jendela).'}
                </p>
              </div>

              {/* Violation Counter Indicators */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Frekuensi Pelanggaran Tercatat:</span>
                  <span className={`px-2 py-0.5 rounded-full font-black text-xs ${
                    antiCheatViolations >= 4
                      ? 'bg-rose-100 text-rose-700'
                      : antiCheatViolations === 3
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-[#005AC1]'
                  }`}>
                    {antiCheatViolations} / 3 Toleransi
                  </span>
                </div>

                <div className="flex gap-1.5">
                  {[1, 2, 3].map((slot) => (
                    <div
                      key={slot}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        antiCheatViolations >= slot
                          ? slot === 3
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-[10px] text-slate-500 text-left">
                  {antiCheatViolations < 3
                    ? `Perhatian: Jika Anda berpindah tab melebihi 3 kali, formulir akan terkunci dan dilaporkan ke Guru/Admin.`
                    : antiCheatViolations === 3
                    ? `PERINGATAN TERAKHIR: Satu kali lagi Anda meninggalkan halaman, form akan dikunci secara permanen!`
                    : `Form telah dikunci. Catatan kecurangan akan dicantumkan pada pengiriman laporan ini.`
                  }
                </p>
              </div>

              <div className="pt-1">
                {antiCheatViolations >= 4 ? (
                  <button
                    type="button"
                    onClick={() => setShowTabSwitchWarning(false)}
                    className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-xs transition-colors shadow-lg shadow-rose-900/20 cursor-pointer"
                  >
                    Saya Mengerti (Lanjut ke Form Terkunci)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTabSwitchWarning(false)}
                    className="w-full py-3 px-4 bg-[#005AC1] hover:bg-blue-800 text-white rounded-2xl font-bold text-xs transition-colors shadow-lg shadow-blue-900/20 cursor-pointer"
                  >
                    Saya Mengerti & Kembali Mengerjakan
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL WAKTU MERANGKUM HABIS (AUTO LOGOUT) ================= */}
        {showSummaryTimeUpModal && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-rose-300 space-y-4 text-center animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-inner border border-rose-200">
                <Hourglass className="w-8 h-8 animate-bounce text-rose-600" />
              </div>

              <div className="space-y-2">
                <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  ⏱️ Waktu Mengisi Rangkuman Telah Habis!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Batas waktu pengisian rangkuman literasi ({summaryDurationMinutes} menit) telah berakhir dan laporan belum terkirim. Sesuai aturan literasi, sistem otomatis mengeluarkan sesi Anda.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTimeOutLogout}
                  className="w-full py-3.5 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Sesi Literasi</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL KONFIRMASI PENGIRIMAN BERHASIL ================= */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-emerald-300 space-y-5 text-center animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner border border-emerald-200">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 animate-bounce" />
              </div>

              <div className="space-y-2.5">
                <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  🎉 Laporan Berhasil Dikirim!
                </h4>
                <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 text-xs sm:text-sm text-emerald-950 leading-relaxed font-medium text-left space-y-2.5 shadow-2xs">
                  <p>
                    Laporan rangkuman Anda berhasil dikirim! Laporan akan divalidasi dan dinilai oleh Pembina OSIS / Guru.
                  </p>
                  <p className="text-[11px] sm:text-xs text-emerald-900 font-bold bg-white p-3 rounded-xl border border-emerald-200 flex items-start sm:items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                    <span>Nilai dan pembaruan poin Anda akan ditampilkan pada pertemuan literasi berikutnya.</span>
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCloseSuccessModal}
                  className="w-full py-3.5 px-6 bg-[#005AC1] hover:bg-[#00479A] active:bg-[#003878] text-white font-black text-xs sm:text-sm rounded-2xl transition-all shadow-lg shadow-blue-900/25 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Tutup & Selesai</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

