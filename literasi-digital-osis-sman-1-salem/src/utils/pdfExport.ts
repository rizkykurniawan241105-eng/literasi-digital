import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReadingReport, UserProfile } from '../types';
import { calculateReportPoints } from './pointsAndSchedule';

export interface GeneratePdfReportOptions {
  reports: ReadingReport[];
  selectedClass?: string;
  dateFilter?: string;
  currentUser?: UserProfile | null;
  filename?: string;
}

export function exportLiteracyReportToPdf({
  reports,
  selectedClass = 'Semua Kelas',
  dateFilter = 'all',
  currentUser,
  filename = 'Laporan_Literasi_Sekolah.pdf',
}: GeneratePdfReportOptions): void {
  // A4 Portrait dimensions: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // --- 1. KOP SURAT RESMI SEKOLAH ---
  let y = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text('PEMERINTAH PROVINSI / DINAS PENDIDIKAN DAN KEBUDAYAAN', pageWidth / 2, y, { align: 'center' });

  y += 5.5;
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('SMA NEGERI 1 LITERASI DIGITAL INDONESIA', pageWidth / 2, y, { align: 'center' });

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Jl. Pendidikan Karakter Literasi No. 12 | Telp: (021) 555-0123 | Website: www.literasidigital.sch.id', pageWidth / 2, y, { align: 'center' });

  y += 3;
  // Double lines for Kop Surat
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 0.8;
  doc.setLineWidth(0.25);
  doc.line(margin, y, pageWidth - margin, y);

  // --- 2. JUDUL DOKUMEN & METADATA ---
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text('LAPORAN REKAPITULASI KEGIATAN LITERASI DIGITAL SISWA', pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text('Rekapitulasi Aktivitas Membaca, Refleksi Rangkuman & Validasi Poin Siswa', pageWidth / 2, y, { align: 'center' });

  y += 4.5;
  const periodText =
    dateFilter === 'today'
      ? 'Hari Ini'
      : dateFilter === 'week'
      ? '7 Hari Terakhir'
      : dateFilter === 'month'
      ? '30 Hari Terakhir'
      : 'Semua Data';

  const dateNowText = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text(
    `Kelas: ${selectedClass}   •   Periode: ${periodText}   •   Tanggal Cetak: ${dateNowText}   •   Jumlah: ${reports.length} Laporan`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );

  y += 4;

  // --- 3. DATA TABEL REKAPITULASI ---
  const tableData = reports.map((rep, idx) => {
    const formattedTime = rep.timestamp
      ? new Date(rep.timestamp).toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';

    const pts = calculateReportPoints(rep);

    let statusText = 'Menunggu';
    if (rep.status === 'Setujui_Bonus') {
      statusText = 'Disetujui (+Bonus)';
    } else if (rep.status === 'Setujui_Standar' || rep.status === 'Diverifikasi') {
      statusText = 'Disetujui';
    } else if (rep.status === 'Ditolak') {
      statusText = 'Ditolak / Revisi';
    }

    const studentInfo = `${rep.userName || 'Siswa'}\nKelas: ${rep.kelas || (rep as any).userClass || '-'}\n${rep.userEmail || ''}`;
    const bookInfo = `${rep.bookTitle}\nHal: ${rep.pagesRead || '-'}`;
    const summaryInfo = `${rep.summary}\n(${pts.wordCount} Kata)`;
    const pointsInfo = `+${pts.totalPoints} Poin`;

    return [
      (idx + 1).toString(),
      formattedTime,
      studentInfo,
      bookInfo,
      summaryInfo,
      pointsInfo,
      statusText,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['No', 'Tanggal & Waktu', 'Siswa & Kelas', 'Judul Buku', 'Rangkuman / Refleksi', 'Poin', 'Status']],
    body: tableData.length > 0 ? tableData : [['-', '-', 'Tidak ada data laporan', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.15,
      lineColor: [200, 205, 215],
    },
    styles: {
      fontSize: 7,
      textColor: [20, 25, 35],
      valign: 'top',
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: [220, 225, 230],
      overflow: 'linebreak',
    },
    alternateRowStyles: {
      fillColor: [250, 252, 255],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 23 },
      2: { cellWidth: 34 },
      3: { cellWidth: 32 },
      4: { cellWidth: 55 },
      5: { cellWidth: 15, halign: 'center', fontStyle: 'bold', textColor: [0, 90, 193] },
      6: { cellWidth: 19, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Footer page numbers
      const str = `Halaman ${doc.getNumberOfPages()}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(str, pageWidth - margin, pageHeight - 8, { align: 'right' });
      doc.text('Aplikasi Literasi Digital Sekolah • Dokumen Resmi', margin, pageHeight - 8);
    },
  });

  // --- 4. TANDA TANGAN VALIDASI ---
  const lastTableY = (doc as any).lastAutoTable?.finalY || y + 50;
  let signY = lastTableY + 8;

  // If signatures would overflow page, add new page
  if (signY + 38 > pageHeight - 12) {
    doc.addPage();
    signY = 20;
  }

  const leftSignX = margin + 35;
  const rightSignX = pageWidth - margin - 35;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);

  // Kiri: Kepala Sekolah
  doc.text('Mengetahui,', leftSignX, signY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('KEPALA SEKOLAH', leftSignX, signY + 4, { align: 'center' });

  // Kanan: Pembina Literasi
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Kota Literasi, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    rightSignX,
    signY,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'bold');
  doc.text('PEMBINA / KOORDINATOR LITERASI', rightSignX, signY + 4, { align: 'center' });

  // Space for Signatures
  const nameY = signY + 24;

  // Nama & NIP Kepala Sekolah
  doc.setFont('helvetica', 'bold');
  doc.text('Dr. H. Ahmad Dahlan, M.Pd.', leftSignX, nameY, { align: 'center' });
  doc.setLineWidth(0.2);
  doc.line(leftSignX - 24, nameY + 0.8, leftSignX + 24, nameY + 0.8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text('NIP. 19750817 200003 1 001', leftSignX, nameY + 4.5, { align: 'center' });

  // Nama & NIP Pembina Literasi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 20, 20);
  const teacherName = currentUser?.name || 'Siti Rahmawati, S.Pd.';
  doc.text(teacherName, rightSignX, nameY, { align: 'center' });
  doc.setLineWidth(0.2);
  doc.line(rightSignX - 24, nameY + 0.8, rightSignX + 24, nameY + 0.8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text('NIP. 19821124 200801 2 005', rightSignX, nameY + 4.5, { align: 'center' });

  // Direct trigger download in browser
  doc.save(filename);
}
