import React, { useState, useEffect } from 'react';
import { GraduationCap, CheckCircle, AlertCircle, UserCheck, X } from 'lucide-react';
import { DEFAULT_CLASSES, sortClassNames } from '../data/schoolConstants';

interface ClassSelectorModalProps {
  isOpen: boolean;
  currentName?: string;
  currentClass: string;
  classList?: string[];
  onSelectClass: (selectedClass: string, realName?: string) => Promise<void>;
  isMandatory?: boolean;
  onClose?: () => void;
}

export const ClassSelectorModal: React.FC<ClassSelectorModalProps> = ({
  isOpen,
  currentName = '',
  currentClass,
  classList = [],
  onSelectClass,
  isMandatory = false,
  onClose,
}) => {
  // Use reactive classList prop synchronized from App-level Firestore listener, with school constant fallback
  const rawList = (classList && classList.length > 0) ? classList : DEFAULT_CLASSES;
  const effectiveClassList = sortClassNames(rawList);

  const [fullName, setFullName] = useState<string>(currentName);
  const [selectedClass, setSelectedClass] = useState<string>(currentClass || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (currentName) {
      setFullName(currentName);
    }
    if (currentClass) {
      setSelectedClass(currentClass);
    } else {
      setSelectedClass('');
    }
  }, [currentName, currentClass]);

  if (!isOpen) return null;

  const isFormComplete = Boolean(fullName.trim() && selectedClass.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const finalClass = selectedClass.trim();

    if (!cleanName || !finalClass) {
      setError('Harap isi Nama Lengkap dan pilih Kelas Anda terlebih dahulu!');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSelectClass(finalClass, cleanName);
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan data profil. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttemptSubmit = () => {
    if (!isFormComplete && !loading) {
      setError('Harap isi Nama Lengkap dan pilih Kelas Anda terlebih dahulu!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl border border-[#E2E8F8] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#005AC1] via-blue-700 to-indigo-700 p-6 text-white text-center relative">
          {!isMandatory && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black">Formulir Lengkapi Profil Siswa</h2>
          <p className="text-blue-100 text-xs mt-1 leading-relaxed">
            {isMandatory 
              ? 'Selamat datang! Silakan isi nama asli sesuai absen dan pilih kelas aktif Anda untuk mulai membaca.'
              : 'Perbarui data nama lengkap dan kelas Anda di perpustakaan sekolah.'}
          </p>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2.5 font-bold shadow-xs animate-fade-in">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Input Nama Lengkap */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#005AC1]" />
              <span>Nama Lengkap Siswa (Sesuai Absen)</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Ahmad Rizky Pratama"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#005AC1] focus:bg-white transition-all"
            />
            <p className="text-[11px] text-slate-500 font-medium">
              *Tuliskan nama asli Anda sesuai yang tercantum di daftar hadir/absen kelas di sekolah.
            </p>
          </div>

          {/* Pilih Kelas dari Daftar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#005AC1]" />
                <span>Pilih Kelas Anda</span>
              </label>
              {selectedClass ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Terpilih: {selectedClass}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  *Wajib Pilih Kelas
                </span>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-3 gap-2 scrollbar-thin p-1">
              {effectiveClassList.map((cls) => {
                const isSelected = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      setSelectedClass(cls);
                      if (error) setError('');
                    }}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#005AC1] border-[#005AC1] text-white shadow-md scale-[1.02]'
                        : 'bg-slate-100 border-transparent text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-[#005AC1]'
                    }`}
                  >
                    <span>{cls}</span>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              *Wajib klik salah satu kelas di atas dari daftar resmi sekolah. Pilihan manual ditiadakan.
            </p>
          </div>

          <div className="pt-2" onClick={handleAttemptSubmit}>
            <button
              type="submit"
              disabled={loading || !isFormComplete}
              className={`w-full py-3.5 px-4 bg-[#005AC1] hover:bg-[#00479A] text-white font-black text-xs sm:text-sm rounded-full transition-all shadow-md flex items-center justify-center gap-2 ${
                !isFormComplete || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Simpan Profil & Masuk Perpustakaan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

