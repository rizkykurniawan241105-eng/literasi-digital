import React from 'react';
import { Award, Sparkles, X, ChevronRight, CheckCircle, BookOpen } from 'lucide-react';
import { Badge } from '../data/badges';

interface BadgeUnlockedModalProps {
  isOpen: boolean;
  unlockedBadges: Badge[];
  onClose: () => void;
  onViewProfile?: () => void;
  onContinueReading?: () => void;
  onCloseToHome?: () => void;
}

export const BadgeUnlockedModal: React.FC<BadgeUnlockedModalProps> = ({
  isOpen,
  unlockedBadges,
  onClose,
  onViewProfile,
  onContinueReading,
  onCloseToHome,
}) => {
  if (!isOpen || !unlockedBadges || unlockedBadges.length === 0) return null;

  const handleCloseToHome = () => {
    if (onCloseToHome) {
      onCloseToHome();
    } else {
      onClose();
    }
  };

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile();
    } else {
      onClose();
    }
  };

  const handleContinueReading = () => {
    if (onContinueReading) {
      onContinueReading();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl shadow-2xl border border-amber-500/30 overflow-hidden relative z-10 my-8 animate-scale-up">
        {/* Top Celebration Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 p-6 text-slate-950 text-center relative overflow-hidden">
          {/* Tombol Silang (X): Mengembalikan pengguna ke Beranda / Perpustakaan */}
          <button
            type="button"
            onClick={handleCloseToHome}
            className="absolute top-3 right-3 p-1.5 text-slate-950/80 hover:text-slate-950 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
            title="Tutup dan Kembali ke Beranda"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-2 shadow-inner border border-white/40 animate-bounce">
            <Award className="w-9 h-9 text-slate-950" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950/20 rounded-full text-slate-950 text-[10px] font-black uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pencapaian Baru Diraih!</span>
          </div>

          <h2 className="text-xl font-black tracking-tight">
            🎉 Selamat! Anda Membuka Lencana Baru
          </h2>
        </div>

        {/* Unlocked Badges List */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300 text-center font-medium">
            Laporan membaca Anda telah diverifikasi. Berikut lencana prestisius yang berhasil Anda dapatkan:
          </p>

          <div className="space-y-3">
            {unlockedBadges.map((badge) => (
              <div
                key={badge.id}
                className="p-4 bg-slate-900/90 border-2 border-amber-500/40 rounded-2xl flex items-center gap-4 shadow-lg relative overflow-hidden"
              >
                <div className="text-4xl shrink-0 p-2 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  {badge.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-extrabold text-amber-300 truncate">{badge.name}</h3>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                      +{badge.points} Poin
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1 leading-snug">{badge.description}</p>

                  <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                    <CheckCircle className="w-3 h-3" />
                    <span>Terbuka Hari Ini</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2.5">
            {/* Tombol Lihat Koleksi Lencana di Profil >: Langsung ke Tab Profil */}
            <button
              type="button"
              onClick={handleViewProfile}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:from-amber-600 active:to-orange-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Lihat Koleksi Lencana di Profil</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Tombol Lanjut Membaca: Tetap di halaman membaca buku */}
            <button
              type="button"
              onClick={handleContinueReading}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Lanjut Membaca</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
