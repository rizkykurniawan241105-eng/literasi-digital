import React, { useState } from 'react';
import { BookPlus, Edit, Trash2, Search, BookOpen, ExternalLink, Plus, X, Save, Upload, Link as LinkIcon, Check, Image as ImageIcon, BookX, Eye, EyeOff, CheckCircle2, Clock } from 'lucide-react';
import { Book } from '../../types';
import { CATEGORIES } from '../../data/schoolConstants';

interface ManageBooksTabProps {
  books: Book[];
  onAddBook: (book: Omit<Book, 'id'>) => Promise<void>;
  onUpdateBook: (id: string, book: Partial<Book>) => Promise<void>;
  onDeleteBook: (id: string) => Promise<void>;
  loading: boolean;
}

export const ManageBooksTab: React.FC<ManageBooksTabProps> = ({
  books,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Novel & Sastra');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverMode, setCoverMode] = useState<'file' | 'url'>('file');
  const [pdfUrl, setPdfUrl] = useState('');
  const [description, setDescription] = useState('');
  const [pageCount, setPageCount] = useState<number>(200);
  const [bookStatus, setBookStatus] = useState<'draft' | 'published'>('draft');

  const [formError, setFormError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('File yang dipilih harus berupa foto/gambar (JPG, PNG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const scaleSize = MAX_WIDTH / img.width;
        if (scaleSize < 1) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCoverUrl(dataUrl);
        } else {
          setCoverUrl(event.target?.result as string);
        }
      };
      img.onerror = () => {
        setCoverUrl(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenNew = () => {
    setEditingBookId(null);
    setTitle('');
    setAuthor('');
    setCategory('Novel & Sastra');
    setCoverUrl('');
    setCoverMode('file');
    setPdfUrl('');
    setDescription('');
    setPageCount(150);
    setBookStatus('published'); // Default: Published (Langsung tampil di katalog siswa)
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (book: Book) => {
    setEditingBookId(book.id);
    setTitle(book.title);
    setAuthor(book.author);
    setCategory(book.category || 'Novel & Sastra');
    setCoverUrl(book.coverUrl || '');
    setCoverMode(book.coverUrl?.startsWith('data:') ? 'file' : 'file');
    setPdfUrl(book.pdfUrl || '');
    setDescription(book.description || '');
    setPageCount(book.pageCount || 150);
    setBookStatus(book.status === 'draft' || book.isDraft ? 'draft' : 'published');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanAuthor = author.trim();
    let cleanPdf = pdfUrl.trim();

    if (!cleanTitle || !cleanAuthor) {
      setFormError('Judul Buku dan Penulis wajib diisi!');
      return;
    }

    if (cleanPdf && !cleanPdf.startsWith('http://') && !cleanPdf.startsWith('https://')) {
      cleanPdf = 'https://' + cleanPdf;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const bookData: Omit<Book, 'id'> = {
        title: cleanTitle,
        author: cleanAuthor,
        category,
        coverUrl: coverUrl.trim() || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
        pdfUrl: cleanPdf,
        description: description.trim(),
        pageCount: Number(pageCount) || 100,
        status: bookStatus,
        isPublished: bookStatus === 'published',
        isDraft: bookStatus === 'draft',
        isUserUploaded: true,
      };

      if (editingBookId) {
        await onUpdateBook(editingBookId, bookData);
        setSuccessBanner(`Buku "${cleanTitle}" berhasil diperbarui!`);
      } else {
        await onAddBook(bookData);
        setSuccessBanner(`Buku "${cleanTitle}" berhasil ditambahkan ke katalog perpustakaan!`);
      }
      setTimeout(() => setSuccessBanner(''), 5000);
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Submit book error:', err);
      setFormError(err?.message || 'Gagal menyimpan data buku. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (book: Book) => {
    const isCurrentlyPublished = book.status === 'published' || book.isPublished === true;
    const newStatus: 'draft' | 'published' = isCurrentlyPublished ? 'draft' : 'published';
    setUpdatingStatusId(book.id);

    try {
      await onUpdateBook(book.id, {
        status: newStatus,
        isPublished: newStatus === 'published',
      });
    } catch (err) {
      console.error('Error toggling book status:', err);
      alert('Gagal mengubah status publikasi buku.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDelete = async (book: Book) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus buku "${book.title}" dari database perpustakaan secara permanen?`)) {
      try {
        await onDeleteBook(book.id);
      } catch (err) {
        alert('Gagal menghapus buku.');
      }
    }
  };

  const filteredBooks = books.filter((b) => {
    const isPublished = b.status === 'published' || b.isPublished === true;
    if (statusFilter === 'published' && !isPublished) return false;
    if (statusFilter === 'draft' && isPublished) return false;

    const q = searchQuery.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q)
    );
  });

  const publishedCount = books.filter((b) => b.status === 'published' || b.isPublished === true).length;
  const draftCount = books.length - publishedCount;

  return (
    <div className="space-y-6 pb-20 md:pb-6 animate-fade-in font-sans w-full max-w-full">
      {/* Header */}
      <div className="bg-white p-5 md:p-6 rounded-[24px] border border-[#E2E8F8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookPlus className="w-5 h-5 text-[#005AC1] shrink-0" />
            <span>Kelola Buku Perpustakaan Digital</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Manajemen koleksi buku mingguan, kontrol status publikasi (Draft / Tampil di Siswa), dan tautan PDF Google Drive
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenNew}
            className="py-2.5 px-5 bg-[#005AC1] hover:bg-[#00479A] text-white rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-2 justify-center cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Buku Baru</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Quick Status Stats & Filters (3 equal columns on desktop / laptop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
            statusFilter === 'all' 
              ? 'bg-[#EEF3FF] border-[#005AC1] shadow-xs' 
              : 'bg-white border-[#E2E8F8] hover:border-slate-300'
          }`}
        >
          <div>
            <div className="text-2xl font-black text-slate-900">{books.length}</div>
            <div className="text-xs font-bold text-slate-600 mt-0.5">Semua Koleksi Buku</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-100/70 text-[#005AC1] flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('published')}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
            statusFilter === 'published' 
              ? 'bg-emerald-50 border-emerald-500 shadow-xs' 
              : 'bg-white border-[#E2E8F8] hover:border-slate-300'
          }`}
        >
          <div>
            <div className="text-2xl font-black text-emerald-700">{publishedCount}</div>
            <div className="text-xs font-bold text-slate-600 mt-0.5">Tampil di Siswa (Aktif)</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('draft')}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
            statusFilter === 'draft' 
              ? 'bg-amber-50 border-amber-500 shadow-xs' 
              : 'bg-white border-[#E2E8F8] hover:border-slate-300'
          }`}
        >
          <div>
            <div className="text-2xl font-black text-amber-700">{draftCount}</div>
            <div className="text-xs font-bold text-slate-600 mt-0.5">Draft (Disembunyikan)</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <EyeOff className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-[20px] border border-[#E2E8F8] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 w-full">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul, penulis, atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F3F4F9] border border-[#74777F]/30 rounded-full focus:bg-white focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 transition-all outline-hidden font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#005AC1] text-white shadow-xs'
                : 'bg-[#F3F4F9] text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({books.length})
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'published'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-[#F3F4F9] text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tampil ({publishedCount})
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === 'draft'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-[#F3F4F9] text-slate-600 hover:bg-slate-200'
            }`}
          >
            Draft ({draftCount})
          </button>
        </div>
      </div>

      {/* Books Table / Grid */}
      <div className="bg-white rounded-[24px] border border-[#E2E8F8] shadow-xs overflow-hidden w-full">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#005AC1] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Memuat koleksi buku dari database...</p>
          </div>
        ) : books.length === 0 ? (
          <div id="admin-empty-books-state" className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-[#EEF3FF] rounded-full flex items-center justify-center mx-auto text-[#005AC1] border border-blue-100">
              <BookX className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Belum ada koleksi buku yang ditambahkan oleh Admin.</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Database koleksi buku masih kosong. Silakan klik tombol di bawah untuk menambahkan buku baru.
              </p>
            </div>
            <button
              onClick={handleOpenNew}
              className="py-2.5 px-6 bg-[#005AC1] text-white rounded-full text-xs font-bold hover:bg-[#00479A] transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Buku Pertama</span>
            </button>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Tidak ada buku yang cocok</h3>
            <p className="text-xs text-slate-400">
              Tidak ditemukan buku dengan filter status "{statusFilter}" dan kata kunci "{searchQuery}".
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="py-2 px-4 bg-[#EEF3FF] text-[#001A41] rounded-full text-xs font-bold hover:bg-[#D8E2FF] transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px] md:min-w-full">
              <thead className="bg-[#F3F4F9] text-slate-700 font-bold border-b border-[#E2E8F8]">
                <tr>
                  <th className="py-3.5 px-4">Buku & Sampul</th>
                  <th className="py-3.5 px-4">Penulis</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Jumlah Hal.</th>
                  <th className="py-3.5 px-4">Status Tampil</th>
                  <th className="py-3.5 px-4">Link PDF</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F8]">
                {filteredBooks.map((book, index) => {
                  const isPublished = book.status === 'published' || book.isPublished === true;
                  const isUpdating = updatingStatusId === book.id;

                  return (
                    <tr key={`${book.id}-${index}`} className="hover:bg-[#EEF3FF]/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={book.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400'}
                            alt={book.title}
                            className="w-10 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{book.title}</span>
                              {isPublished ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                  Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                                  Draft
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 max-w-[200px]">
                              {book.description || 'Tidak ada deskripsi'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {book.author}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-3 py-1 bg-[#F3F4F9] text-[#001A41] rounded-full text-[11px] font-bold border border-[#E2E8F8]">
                          {book.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {book.pageCount || 200} Hal.
                      </td>

                      {/* Status Column with Interactive Toggle */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggleStatus(book)}
                          className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                          } ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                          title="Klik untuk mengubah status publikasi"
                        >
                          {isUpdating ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : isPublished ? (
                            <Eye className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                          )}
                          <span>
                            {isPublished ? 'Tampil di Siswa' : 'Draft (Sembunyi)'}
                          </span>
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <a
                          href={book.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#005AC1] hover:underline font-bold text-[11px]"
                        >
                          <span>Tautan PDF</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(book)}
                            className="p-2 text-[#005AC1] hover:bg-[#EEF3FF] rounded-full transition-colors cursor-pointer"
                            title="Edit Data Buku"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(book)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                            title="Hapus Permanen Buku"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-[28px] shadow-2xl border border-[#E2E8F8] overflow-hidden my-8">
            <div className="bg-gradient-to-r from-[#005AC1] via-blue-700 to-indigo-700 p-5 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <BookPlus className="w-5 h-5 text-blue-100" />
                <span>{editingBookId ? 'Edit Buku Perpustakaan' : 'Tambah Buku Baru'}</span>
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl">
                  {formError}
                </div>
              )}

              {/* Status Selector in Modal */}
              <div className="p-3.5 bg-[#F3F4F9] rounded-2xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block">Status Publikasi Buku *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBookStatus('draft')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      bookStatus === 'draft'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <EyeOff className={`w-4 h-4 shrink-0 mt-0.5 ${bookStatus === 'draft' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-xs">Draft (Disimpan)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Belum tampil di halaman katalog siswa (Default)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookStatus('published')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      bookStatus === 'published'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Eye className={`w-4 h-4 shrink-0 mt-0.5 ${bookStatus === 'published' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-xs">Tampil di Siswa</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Langsung aktif dan dapat dibaca oleh seluruh siswa
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Judul Buku *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Menyelami Samudra Sains"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#74777F] rounded-xl focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Penulis *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Tim Literasi SMAN 1 Salem"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#74777F] rounded-xl focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#74777F] rounded-xl focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 font-medium"
                  >
                    {CATEGORIES.filter((c) => c !== 'Semua Kategori').map((cat, index) => (
                      <option key={`${cat}-${index}`} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Estimasi Jumlah Halaman</label>
                  <input
                    type="number"
                    value={pageCount}
                    onChange={(e) => setPageCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#74777F] rounded-xl focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">URL PDF (Google Drive / Direct PDF) *</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/file/d/.../view atau link PDF"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#74777F] rounded-xl focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 font-medium"
                />
                <p className="text-[10px] text-slate-500">
                  Tip: Copy link berbagi file dari Google Drive. Sistem otomatis mengubahnya ke pratinjau embed.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Gambar Sampul Buku</label>
                  <div className="flex items-center gap-1 bg-[#F3F4F9] p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCoverMode('file')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        coverMode === 'file'
                          ? 'bg-[#005AC1] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Foto (File)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverMode('url')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        coverMode === 'url'
                          ? 'bg-[#005AC1] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>Input Link URL</span>
                    </button>
                  </div>
                </div>

                {coverMode === 'file' ? (
                  <div className="space-y-2">
                    {coverUrl ? (
                      <div className="flex items-center gap-3 p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                        <img
                          src={coverUrl}
                          alt="Pratinjau Sampul"
                          className="w-14 h-18 object-cover rounded-xl border border-emerald-300 shadow-xs shrink-0"
                        />
                        <div className="space-y-1 grow">
                          <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                            <Check className="w-4 h-4 text-emerald-600" /> Foto Sampul Berhasil Diunggah
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Foto siap digunakan untuk sampul buku ini.
                          </p>
                          <button
                            type="button"
                            onClick={() => setCoverUrl('')}
                            className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer pt-0.5 block"
                          >
                            Ganti / Hapus Foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-[#005AC1]/40 hover:border-[#005AC1] bg-[#EEF3FF]/40 hover:bg-[#EEF3FF] rounded-2xl cursor-pointer transition-all text-center group">
                        <div className="w-9 h-9 rounded-full bg-[#EEF3FF] group-hover:bg-[#D8E2FF] flex items-center justify-center text-[#005AC1] mb-1.5 transition-colors">
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-[#001A41]">
                          Pilih File Foto Sampul (JPG / PNG)
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          Klik untuk mengambil foto dari Galeri HP atau dokumen komputer Anda
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#74777F] rounded-xl focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 font-medium"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Tempel tautan web gambar sampul jika Anda memiliki link gambar langsung.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ringkasan / Sinopsis Singkat</label>
                <textarea
                  rows={3}
                  placeholder="Gambaran singkat isi buku..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#74777F] rounded-xl focus:border-[#005AC1] focus:ring-2 focus:ring-[#005AC1]/20 font-medium resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="py-2.5 px-5 text-slate-700 font-bold hover:bg-[#EEF3FF] rounded-full transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2.5 px-6 bg-[#005AC1] text-white font-bold rounded-full hover:bg-[#00479A] shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingBookId ? 'Simpan Perubahan' : 'Tambah Buku'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
