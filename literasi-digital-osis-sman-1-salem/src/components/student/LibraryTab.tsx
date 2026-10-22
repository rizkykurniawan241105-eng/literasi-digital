import React, { useState, useMemo } from 'react';
import { Search, Sparkles, BookOpen, Clock, Tag, BookCheck, ArrowRight, BookX, Lock, AlertTriangle } from 'lucide-react';
import { Book, AppSettings } from '../../types';
import { CATEGORIES } from '../../data/schoolConstants';
import { checkLiteracyAccess } from '../../utils/pointsAndSchedule';

interface LibraryTabProps {
  books: Book[];
  appSettings?: AppSettings;
  isLoading?: boolean;
  onOpenReader: (book: Book) => void;
  onOpenReportDirectly: (book: Book) => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  books,
  appSettings,
  isLoading = false,
  onOpenReader,
  onOpenReportDirectly,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');

  const accessStatus = checkLiteracyAccess(appSettings);

  // Strictly filter books published by admin for students
  const publishedBooks = useMemo(() => {
    return books.filter((book) => book.isDraft !== true && book.status !== 'draft' && (book.status === 'published' || book.isPublished === true));
  }, [books]);

  const filteredBooks = useMemo(() => {
    return publishedBooks.filter((book) => {
      const matchesSearch =
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.description && book.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'Semua Kategori' || book.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [publishedBooks, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in">
      {/* Banner Informasi Akses Literasi jika Ditutup */}
      {!accessStatus.isOpen && (
        <div className="p-4 rounded-[20px] bg-rose-50 border border-rose-200 text-rose-900 shadow-xs flex items-start gap-3 animate-fade-in">
          <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="font-bold text-rose-950 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Akses Kegiatan Literasi Sedang Ditutup oleh Admin.</span>
            </div>
            <p className="text-rose-800 leading-relaxed font-medium">
              {accessStatus.reason}
            </p>
            <p className="text-[11px] text-rose-600 font-semibold pt-0.5">
              Jadwal Literasi: {accessStatus.scheduleDescription}
            </p>
          </div>
        </div>
      )}

      {/* Banner Pengingat Literasi */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#005AC1] via-blue-700 to-indigo-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-40 h-40 bg-sky-200/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-blue-100 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>PENGINGAT LITERASI OSIS SMAN 1 SALEM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              "Membaca Adalah Jendela Dunia, Menulis Adalah Kuncinya."
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Luangkan waktu minimal 15 menit hari ini untuk membaca buku digital sekolah. Kumpulkan poin dan naikkan peringkat literasi Anda!
            </p>
          </div>

          <div className="shrink-0 bg-white/15 backdrop-blur-md border border-white/25 p-4 rounded-2xl text-center hidden sm:block">
            <div className="text-2xl font-extrabold text-white">{publishedBooks.length}</div>
            <div className="text-[11px] text-blue-100 font-semibold">Buku Digital Tersedia</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-[24px] shadow-xs border border-[#E2E8F8] space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari judul buku, penulis, atau kata kunci..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F3F4F9] border border-[#74777F]/30 rounded-full focus:bg-white focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 transition-all outline-hidden font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#005AC1] border-[#005AC1] text-white shadow-xs'
                    : 'bg-[#F3F4F9] border-transparent text-slate-700 hover:bg-[#D8E2FF] hover:text-[#001A41]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#005AC1]" />
            <span>Katalog Perpustakaan ({filteredBooks.length})</span>
          </h2>
          {selectedCategory !== 'Semua Kategori' && (
            <span className="text-xs text-slate-500">
              Kategori: <strong className="text-[#005AC1]">{selectedCategory}</strong>
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[#005AC1] font-bold text-xs bg-blue-50/90 px-4 py-3 rounded-2xl border border-blue-200 shadow-2xs">
              <div className="w-4 h-4 border-2 border-[#005AC1] border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Menyinkronkan katalog buku perpustakaan secara real-time...</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="bg-white rounded-[20px] border border-[#E2E8F8] overflow-hidden p-4 space-y-3 animate-pulse shadow-2xs">
                  <div className="h-44 bg-slate-200/80 rounded-xl w-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                    <div className="h-3 bg-slate-100 rounded-md w-full" />
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex gap-2">
                    <div className="h-9 bg-slate-200 rounded-full flex-1" />
                    <div className="h-9 w-9 bg-slate-200 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : publishedBooks.length === 0 ? (
          <div id="student-empty-books-state" className="bg-white rounded-[28px] border border-[#E2E8F8] p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-[#EEF3FF] rounded-full flex items-center justify-center mx-auto text-[#005AC1] border border-blue-100">
              <BookX className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Belum ada koleksi buku yang ditambahkan oleh Admin.</h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
                Buku perpustakaan digital akan tampil di sini setelah ditambahkan oleh Admin / Guru.
              </p>
            </div>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-[#E2E8F8] p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 bg-[#EEF3FF] rounded-full flex items-center justify-center mx-auto text-[#005AC1]">
              <BookX className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Buku Tidak Ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Coba gunakan kata kunci lain atau ubah filter kategori perpustakaan.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Semua Kategori');
              }}
              className="px-5 py-2.5 bg-[#EEF3FF] text-[#001A41] rounded-full text-xs font-bold hover:bg-[#D8E2FF] transition-colors cursor-pointer"
            >
              Tampilkan Semua Buku
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBooks.map((book, index) => (
              <div
                key={book.id || `book-${index}`}
                className="bg-white rounded-[20px] border border-[#E2E8F8] shadow-xs hover:shadow-md hover:border-[#005AC1]/40 transition-all duration-200 flex flex-col overflow-hidden group"
              >
                {/* Book Cover Image */}
                <div className="relative h-48 bg-slate-100 overflow-hidden shrink-0">
                  <img
                    src={book.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400'}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-60" />

                  <span className="absolute top-3 left-3 bg-[#001A41]/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/10">
                    {book.category}
                  </span>

                  {book.pageCount && (
                    <span className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-slate-100 text-[10px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#C2E8FF]" />
                      {book.pageCount} Hal.
                    </span>
                  )}
                </div>

                {/* Book Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#005AC1] transition-colors line-clamp-1">
                      {book.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1 font-medium">
                      Penulis: {book.author}
                    </p>
                    {book.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 pt-1 leading-relaxed">
                        {book.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => onOpenReader(book)}
                      className="flex-1 py-2.5 px-3 font-bold text-xs rounded-full transition-all shadow-xs flex items-center justify-center gap-1.5 bg-[#005AC1] hover:bg-[#00479A] text-white cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Buka & Baca Buku</span>
                    </button>

                    <button
                      onClick={() => onOpenReportDirectly(book)}
                      className="p-2.5 rounded-full transition-colors bg-[#EEF3FF] hover:bg-[#D8E2FF] text-[#001A41] cursor-pointer"
                      title="Kirim Laporan Literasi"
                    >
                      <BookCheck className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
