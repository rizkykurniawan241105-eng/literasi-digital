import React, { useState } from 'react';
import { 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Search, 
  BookOpen, 
  Bookmark, 
  Filter,
  Award,
  Sparkles,
  X,
  MessageSquareQuote,
  ShieldCheck,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { ReadingReport } from '../../types';
import { calculateReportPoints } from '../../utils/pointsAndSchedule';

interface MyReportsTabProps {
  reports: ReadingReport[];
  loading: boolean;
}

export const MyReportsTab: React.FC<MyReportsTabProps> = ({ reports, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = reports.filter(
    (rep) =>
      rep.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rep.ringkasanIsi || rep.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rep.pagesRead || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E2E8F8] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#005AC1]" />
            <span>Laporan Saya</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Riwayat, verifikasi nilai, dan catatan feedback guru atas laporan membaca buku Anda
          </p>
        </div>

        <div className="px-4 py-2 bg-[#EEF3FF] border border-[#D8E2FF] rounded-full text-xs font-bold text-[#001A41] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#005AC1]" />
          <span>Total Laporan: {reports.length}</span>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-3.5 rounded-[20px] border border-[#E2E8F8] shadow-xs">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari dalam riwayat laporan (judul buku/isi ulasan)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F3F4F9] border border-[#74777F]/30 rounded-full focus:bg-white focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 transition-all outline-hidden font-medium"
          />
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="bg-white rounded-[24px] border border-[#E2E8F8] p-12 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#005AC1] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Memuat riwayat laporan Anda...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-[#E2E8F8] p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-[#EEF3FF] rounded-full flex items-center justify-center mx-auto text-[#005AC1]">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">Belum Ada Laporan Membaca</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Tidak ada laporan yang cocok dengan pencarian Anda.'
              : 'Anda belum pernah mengirim laporan literasi. Pilih buku di Perpustakaan dan klik "Selesai Membaca & Kirim Laporan".'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((rep) => {
            const reportDate = rep.timestamp 
              ? new Date(rep.timestamp).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : rep.dateStr || 'Tanggal tidak dicatat';

            const pts = calculateReportPoints(rep);
            const isVerified = rep.status === 'Diverifikasi' || rep.status === 'Setujui_Bonus' || rep.status === 'Setujui_Standar' || rep.status === 'verified';
            const isRejected = rep.status === 'Ditolak' || rep.status === 'rejected';
            const isPending = !isVerified && !isRejected;

            const teacherFeedback = rep.validationNote || (rep as any).feedbackGuru;

            return (
              <div
                key={rep.id}
                className="bg-white rounded-[24px] border border-[#E2E8F8] p-5 shadow-xs hover:border-[#005AC1]/40 transition-all space-y-3.5"
              >
                {/* Card Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F8]">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2.5 bg-[#EEF3FF] text-[#005AC1] rounded-2xl">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{rep.bookTitle}</h3>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {rep.bookAuthor ? `Karya: ${rep.bookAuthor}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    {isVerified && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Terverifikasi ✔️ (+{pts.totalPoints} Poin)</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
                        <X className="w-3.5 h-3.5 text-rose-600" />
                        <span>Ditolak ❌ (0 Poin)</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Menunggu Validasi</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Report Details & Points Pill */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 bg-[#F3F4F9] p-2.5 rounded-xl border border-slate-100">
                    <Bookmark className="w-4 h-4 text-[#005AC1] shrink-0" />
                    <span>Halaman: <strong className="text-slate-900">{rep.pagesRead}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 bg-[#F3F4F9] p-2.5 rounded-xl border border-slate-100">
                    <Calendar className="w-4 h-4 text-[#005AC1] shrink-0" />
                    <span className="truncate">{reportDate}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 bg-[#EEF3FF] p-2.5 rounded-xl border border-blue-100">
                    <Award className="w-4 h-4 text-[#005AC1] shrink-0" />
                    <div className="text-[11px]">
                      {isVerified ? (
                        <>Poin: <strong className="text-[#005AC1]">+{pts.totalPoints} Poin</strong></>
                      ) : isRejected ? (
                        <>Poin: <strong className="text-rose-600">0 Poin (Ditolak)</strong></>
                      ) : (
                        <>Poin: <strong className="text-amber-700">+{pts.totalPoints} Poin (Menunggu)</strong></>
                      )}
                      {pts.adminBonusPoints > 0 && (
                        <span className="text-emerald-700 font-semibold text-[10px] ml-1">(+{pts.adminBonusPoints} Bonus)</span>
                      )}
                      {pts.adminPenaltyPoints > 0 && (
                        <span className="text-rose-700 font-semibold text-[10px] ml-1">(-{pts.adminPenaltyPoints} Penalti)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Structured Review Blocks */}
                <div className="space-y-2">
                  {/* 1. Ringkasan Isi */}
                  <div className="bg-[#EEF3FF]/70 p-3.5 rounded-2xl border border-[#D8E2FF] space-y-1">
                    <div className="text-[11px] font-bold text-[#001A41] uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>📝</span>
                        <span>Ringkasan Isi Buku:</span>
                      </span>
                      <span className="text-[10px] text-blue-700 font-semibold">
                        +{pts.q2RingkasanPoints} / 30 Poin ({pts.wordCount} Kata)
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                      {rep.ringkasanIsi || rep.summary}
                    </p>
                  </div>

                  {/* 2, 3, 4: Kelebihan, Kekurangan, Saran */}
                  {(rep.kelebihanBuku || rep.kekuranganBuku || rep.saranKelayakan) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {rep.kelebihanBuku && (
                        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 space-y-1">
                          <div className="text-[10px] font-bold text-emerald-950 uppercase flex items-center justify-between">
                            <span>✨ Kelebihan:</span>
                            <span className="text-[9px] text-emerald-700 font-bold">+{pts.q3KelebihanPoints} Poin</span>
                          </div>
                          <p className="text-slate-800 text-[11px] leading-relaxed whitespace-pre-wrap">{rep.kelebihanBuku}</p>
                        </div>
                      )}
                      {rep.kekuranganBuku && (
                        <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-100 space-y-1">
                          <div className="text-[10px] font-bold text-rose-950 uppercase flex items-center justify-between">
                            <span>⚠️ Kekurangan:</span>
                            <span className="text-[9px] text-rose-700 font-bold">+{pts.q4KekuranganPoints} Poin</span>
                          </div>
                          <p className="text-slate-800 text-[11px] leading-relaxed whitespace-pre-wrap">{rep.kekuranganBuku}</p>
                        </div>
                      )}
                      {rep.saranKelayakan && (
                        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100 space-y-1">
                          <div className="text-[10px] font-bold text-amber-950 uppercase flex items-center justify-between">
                            <span>💡 Saran:</span>
                            <span className="text-[9px] text-amber-700 font-bold">+{pts.q5SaranPoints} Poin</span>
                          </div>
                          <p className="text-slate-800 text-[11px] leading-relaxed whitespace-pre-wrap">{rep.saranKelayakan}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* TEACHER FEEDBACK BLOCK (CATATAN DARI GURU / FEEDBACK) */}
                {teacherFeedback && (
                  <div className={`p-4 rounded-2xl border transition-all space-y-1.5 shadow-2xs ${
                    isRejected
                      ? 'bg-rose-50/90 border-rose-200 text-rose-950'
                      : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <MessageSquareQuote className={`w-4 h-4 ${isRejected ? 'text-rose-600' : 'text-emerald-600'}`} />
                        <span>Catatan dari Guru / Feedback Penguji:</span>
                      </div>
                      {rep.validatedBy && (
                        <div className="text-[10px] font-semibold opacity-80">
                          Oleh: <strong>{rep.validatedBy}</strong>
                          {rep.validatedAt && ` • ${new Date(rep.validatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs leading-relaxed p-3 bg-white/80 rounded-xl border font-medium whitespace-pre-wrap ${
                      isRejected ? 'border-rose-200 text-rose-900' : 'border-emerald-200 text-emerald-900'
                    }`}>
                      "{teacherFeedback}"
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
