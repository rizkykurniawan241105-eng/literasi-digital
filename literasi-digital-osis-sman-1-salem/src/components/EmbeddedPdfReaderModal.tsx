import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  BookOpen, 
  ExternalLink, 
  Edit3, 
  Lock, 
  Clock, 
  Hourglass, 
  ArrowRight,
  FileText,
  RefreshCw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Book, AppSettings } from '../types';
import { formatPdfEmbedUrl } from '../lib/firebase';
import { checkLiteracyAccess } from '../utils/pointsAndSchedule';

interface EmbeddedPdfReaderModalProps {
  book: Book | null;
  isOpen: boolean;
  appSettings?: AppSettings;
  onClose: () => void;
  onCompleteReading: (book: Book) => void;
  onOpenReport?: (book: Book) => void;
}

export const EmbeddedPdfReaderModal: React.FC<EmbeddedPdfReaderModalProps> = ({
  book,
  isOpen,
  appSettings,
  onClose,
  onCompleteReading,
  onOpenReport,
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const readerContainerRef = useRef<HTMLDivElement | null>(null);

  // Timer State (Individual reading session per book)
  const durationMinutes = appSettings?.readingDurationMinutes || 10;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(durationMinutes * 60);
  const [showTimeUpModal, setShowTimeUpModal] = useState<boolean>(false);
  const timerFinishedRef = useRef<boolean>(false);

  // Initialize and run individual reading countdown timer
  useEffect(() => {
    if (!isOpen || !book) {
      setShowTimeUpModal(false);
      timerFinishedRef.current = false;
      return;
    }

    const totalSeconds = (appSettings?.readingDurationMinutes || 10) * 60;
    const sessionKey = `literal_read_start_${book.id}`;
    
    let startTime = parseInt(sessionStorage.getItem(sessionKey) || '0', 10);
    if (!startTime || isNaN(startTime)) {
      startTime = Date.now();
      sessionStorage.setItem(sessionKey, startTime.toString());
    }

    const updateTimer = () => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsedSeconds);
      setSecondsRemaining(remaining);

      if (remaining === 0 && !timerFinishedRef.current) {
        timerFinishedRef.current = true;
        setShowTimeUpModal(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isOpen, book?.id, appSettings?.readingDurationMinutes]);

  // Reset iframe state when book changes
  useEffect(() => {
    if (book) {
      setIframeLoaded(false);
    }
  }, [book?.id]);

  if (!isOpen || !book) return null;

  const accessStatus = checkLiteracyAccess(appSettings);
  const embedUrl = formatPdfEmbedUrl(book.pdfUrl);

  const handleOpenReportForm = () => {
    setShowTimeUpModal(false);
    if (onOpenReport) {
      onOpenReport(book);
    } else {
      onCompleteReading(book);
    }
  };

  const handleReloadIframe = () => {
    setIframeLoaded(false);
    setIframeKey((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    if (!readerContainerRef.current) return;
    if (!document.fullscreenElement) {
      readerContainerRef.current.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        // Fallback if browser denies
      });
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = secondsRemaining <= 120; // 2 minutes remaining

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xs p-0 sm:p-2 md:p-3 animate-fade-in select-none">
      <div 
        ref={readerContainerRef}
        className="bg-slate-900 rounded-none sm:rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col transition-all duration-300 w-full h-full max-w-6xl max-h-full sm:max-h-[96vh] mx-auto relative"
      >
        
        {/* ================= TOP HEADER BAR ================= */}
        <div className="bg-slate-950 text-white px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 shrink-0 border-b border-slate-800 shadow-md z-30">
          
          {/* Pojok Kiri Atas: Judul Buku, Kategori, & Nama Penulis */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30 shadow-inner">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 max-w-[180px] xs:max-w-[240px] sm:max-w-md md:max-w-xl">
              <div className="flex items-center gap-2">
                <h3 
                  className="text-xs sm:text-base font-extrabold text-white truncate leading-tight overflow-hidden text-ellipsis" 
                  title={book.title}
                >
                  {book.title}
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase tracking-wider border border-slate-700 shrink-0">
                  {book.category}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate mt-0.5 overflow-hidden text-ellipsis">
                Penulis: <span className="text-slate-200 font-medium">{book.author || '-'}</span>
              </p>
            </div>
          </div>

          {/* Pojok Kanan Atas: Timer Hitung Mundur Membaca & Tombol Kontrol */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Timer Hitung Mundur Membaca (10 Menit) */}
            <div 
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-full border transition-all shadow-sm ${
                isLowTime
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                  : 'bg-blue-950/70 border-sky-500/30 text-sky-200'
              }`}
              title="Waktu membaca aktif"
            >
              <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isLowTime ? 'text-rose-400' : 'text-sky-400'}`} />
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-1.5 leading-none">
                <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 hidden sm:inline uppercase tracking-wider">
                  Sisa Waktu
                </span>
                <span className={`font-mono font-black text-xs sm:text-sm tracking-widest ${isLowTime ? 'text-rose-300 font-extrabold' : 'text-white'}`}>
                  {formatTime(secondsRemaining)}
                </span>
              </div>
            </div>

            {/* Tombol Buka Tab Baru / Fullscreen */}
            <div className="hidden xs:flex items-center gap-1">
              <a
                href={book.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Buka PDF di Tab Baru"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Tombol Tutup Silang (X) */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-full transition-colors cursor-pointer"
              title="Tutup Mode Baca"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Access Warning Banner if admin closed literacy access */}
        {!accessStatus.isOpen && (
          <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md shrink-0 border-b border-rose-700 z-20">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-200 shrink-0" />
              <span>Akses Kegiatan Literasi Sedang Ditutup oleh Admin. Tombol pengiriman laporan dikunci.</span>
            </div>
          </div>
        )}

        {/* ================= MAIN EMBEDDED PDF VIEWER WORKSPACE ================= */}
        <div className="relative flex-1 bg-slate-950 overflow-hidden flex flex-col items-center justify-center">
          
          {/* Loading Indicator while Iframe initializes */}
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 text-slate-300 gap-3 pointer-events-none">
              <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-white tracking-wide">Memuat Dokumen PDF Buku...</p>
                <p className="text-[11px] text-slate-400">Menghubungkan ke Google Drive / Dokumen Penampil</p>
              </div>
            </div>
          )}

          {/* Embedded PDF iframe (Google Drive Preview / Google Docs Viewer) */}
          <iframe
            key={iframeKey}
            src={embedUrl}
            title={`PDF Viewer - ${book.title}`}
            className="w-full h-full border-0 bg-slate-900"
            allow="autoplay; fullscreen; encrypted-media"
            loading="lazy"
            onLoad={() => setIframeLoaded(true)}
          />

          {/* Fallback helper pill if student browser blocks third-party cookies or sandbox */}
          <div className="absolute bottom-2 right-2 z-20 hidden md:flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 shadow-lg text-[11px] text-slate-300">
            <span>Teks tidak muncul?</span>
            <button
              type="button"
              onClick={handleReloadIframe}
              className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Muat Ulang</span>
            </button>
            <span className="text-slate-600">•</span>
            <a
              href={book.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 font-bold inline-flex items-center gap-1 transition-colors"
            >
              <span>Buka di Tab Baru</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* ================= BOTTOM BAR NAVIGASI ================= */}
        <div className="bg-slate-950 px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-30">
          
          {/* Keterangan PDF Viewer Asli */}
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <div className="px-2.5 py-1 bg-slate-900 rounded-full border border-slate-800 flex items-center gap-1.5 text-sky-400 font-medium text-[11px]">
              <FileText className="w-3.5 h-3.5" />
              <span>Embedded PDF Viewer Asli</span>
            </div>
            <span className="hidden sm:inline text-slate-500 text-[11px]">
              Gunakan scroll atau kontrol Google Docs Viewer untuk membaca dokumen asli.
            </span>
          </div>

          {/* Action Buttons: Tutup & Tulis Laporan Rangkuman */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer w-1/3 sm:w-auto text-center"
            >
              Tutup
            </button>

            {/* Tombol Tulis Laporan Rangkuman */}
            {accessStatus.isOpen ? (
              <button
                type="button"
                onClick={handleOpenReportForm}
                className="py-2.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-full transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer hover:scale-105 active:scale-95"
              >
                <Edit3 className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Tulis Laporan Rangkuman</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="py-2.5 px-5 bg-slate-800 text-slate-500 font-bold text-xs rounded-full flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-not-allowed border border-slate-700"
              >
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="whitespace-nowrap">Akses Laporan Ditutup</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL POPUP: WAKTU MEMBACA HABIS ================= */}
      {showTimeUpModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-amber-200 text-center space-y-4 animate-scale-up">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-amber-200">
              <Hourglass className="w-8 h-8 animate-bounce text-amber-600" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                ⏰ Waktu Membaca Telah Habis!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Waktu membaca telah habis! Silakan isi laporan rangkuman literasi Anda sekarang untuk memperoleh poin kehadiran & literasi.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenReportForm}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <span>Lanjut Isi Rangkuman Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
