import { ReadingReport, UserProfile } from '../types';
import { calculateReportPoints } from './pointsAndSchedule';

export interface GenerateDocReportOptions {
  reports: ReadingReport[];
  selectedClass?: string;
  dateFilter?: string;
  currentUser?: UserProfile | null;
  filename?: string;
}

/**
 * Exports literacy reports to a Microsoft Word (.doc) document formatted with official school letterhead,
 * clean styled tables, and validation signatures.
 */
export function exportLiteracyReportToDoc({
  reports,
  selectedClass = 'Semua Kelas',
  dateFilter = 'all',
  currentUser,
  filename,
}: GenerateDocReportOptions): void {
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

  const downloadFilename =
    filename ||
    `Laporan_Literasi_Sekolah_${selectedClass.replace(/\s+/g, '_')}_${new Date()
      .toISOString()
      .split('T')[0]}.doc`;

  // Build Table Rows HTML
  const rowsHtml =
    reports.length > 0
      ? reports
          .map((rep, idx) => {
            const formattedTime = rep.timestamp
              ? new Date(rep.timestamp).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : rep.dateStr || '-';

            const pts = calculateReportPoints(rep);

            let statusLabel = 'Menunggu Validasi';
            let statusColor = '#475569';
            if (rep.status === 'Setujui_Bonus') {
              statusLabel = 'Disetujui (+Bonus)';
              statusColor = '#15803d';
            } else if (rep.status === 'Setujui_Standar' || rep.status === 'Diverifikasi') {
              statusLabel = 'Disetujui';
              statusColor = '#0369a1';
            } else if (rep.status === 'Ditolak') {
              statusLabel = 'Ditolak / Revisi';
              statusColor = '#b91c1c';
            }

            const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

            return `
            <tr style="background-color: ${bgRow};">
              <td style="border: 1px solid #cbd5e1; padding: 7px 5px; text-align: center; font-weight: bold; font-size: 9.5pt;">${idx + 1}</td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 6px; font-size: 9pt; white-space: nowrap;">${formattedTime}</td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 6px; font-size: 9pt;">
                <strong>${escapeHtml(rep.userName || 'Siswa')}</strong><br/>
                <span style="color: #475569; font-size: 8.5pt;">Kelas: ${escapeHtml(rep.kelas || '-')}</span><br/>
                <span style="color: #64748b; font-size: 8pt;">${escapeHtml(rep.userEmail || '')}</span>
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 6px; font-size: 9pt;">
                <strong>${escapeHtml(rep.bookTitle || '-')}</strong><br/>
                <span style="color: #475569; font-size: 8.5pt;">Dibaca: ${escapeHtml(rep.pagesRead || '-')}</span>
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 6px; font-size: 9pt; text-align: justify; line-height: 1.4;">
                ${escapeHtml(rep.summary || '-')}
                <div style="font-size: 8pt; color: #64748b; margin-top: 4px; font-style: italic;">(${pts.wordCount} Kata)</div>
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 6px; font-size: 9.5pt; text-align: center; font-weight: bold; color: #005ac1;">
                +${pts.totalPoints}
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 7px 6px; font-size: 8.5pt; text-align: center; font-weight: bold; color: ${statusColor};">
                ${statusLabel}
              </td>
            </tr>
          `;
          })
          .join('')
      : `
        <tr>
          <td colspan="7" style="border: 1px solid #cbd5e1; padding: 18px; text-align: center; color: #64748b; font-style: italic;">
            Tidak ada data laporan literasi pada filter yang dipilih.
          </td>
        </tr>
      `;

  const teacherName = currentUser?.name || 'Siti Rahmawati, S.Pd.';

  // Word Document Template with Microsoft Word standard headers
  const wordDocumentHtml = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Laporan Rekapitulasi Literasi Sekolah</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: A4 portrait;
          margin: 1.5cm 1.5cm 1.5cm 1.5cm;
          mso-page-orientation: portrait;
        }
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          font-size: 10pt;
          color: #0f172a;
          line-height: 1.35;
          margin: 0;
          padding: 0;
        }
        .kop-container {
          text-align: center;
          margin-bottom: 8px;
        }
        .kop-instansi {
          font-size: 10pt;
          font-weight: bold;
          letter-spacing: 0.5px;
          margin: 0;
        }
        .kop-sekolah {
          font-size: 14pt;
          font-weight: bold;
          color: #001a41;
          margin: 3px 0;
        }
        .kop-alamat {
          font-size: 8.5pt;
          color: #334155;
          margin: 0;
        }
        .kop-divider {
          border-bottom: 2.5px solid #000000;
          margin-top: 6px;
          margin-bottom: 2px;
        }
        .kop-divider-sub {
          border-bottom: 0.8px solid #000000;
          margin-bottom: 14px;
        }
        .doc-title {
          text-align: center;
          font-size: 12pt;
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 3px;
          color: #001a41;
        }
        .doc-subtitle {
          text-align: center;
          font-size: 9pt;
          font-style: italic;
          color: #475569;
          margin-bottom: 10px;
        }
        .meta-box {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 7px 10px;
          margin-bottom: 14px;
          font-size: 8.5pt;
          text-align: center;
        }
        table.report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        table.report-table th {
          background-color: #005ac1;
          color: #ffffff;
          border: 1px solid #00479a;
          padding: 8px 6px;
          font-size: 9pt;
          font-weight: bold;
          text-align: center;
        }
        .signature-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 25px;
        }
        .signature-table td {
          border: none;
          vertical-align: top;
          padding: 4px;
          font-size: 9.5pt;
        }
      </style>
    </head>
    <body>
      <!-- KOP SURAT RESMI -->
      <div class="kop-container">
        <p class="kop-instansi">PEMERINTAH PROVINSI / DINAS PENDIDIKAN DAN KEBUDAYAAN</p>
        <p class="kop-sekolah">SMA NEGERI 1 LITERASI DIGITAL INDONESIA</p>
        <p class="kop-alamat">Jl. Pendidikan Karakter Literasi No. 12 | Telp: (021) 555-0123 | Website: www.literasidigital.sch.id</p>
        <div class="kop-divider"></div>
        <div class="kop-divider-sub"></div>
      </div>

      <!-- JUDUL DOKUMEN -->
      <div class="doc-title">LAPORAN REKAPITULASI KEGIATAN LITERASI DIGITAL SISWA</div>
      <div class="doc-subtitle">Rekapitulasi Aktivitas Membaca, Refleksi Rangkuman & Validasi Poin Siswa</div>

      <!-- METADATA FILTER -->
      <div class="meta-box">
        <strong>Kelas:</strong> ${escapeHtml(selectedClass)} &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>Periode:</strong> ${escapeHtml(periodText)} &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>Tanggal Unduh:</strong> ${escapeHtml(dateNowText)} &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>Jumlah Data:</strong> ${reports.length} Laporan
      </div>

      <!-- TABEL DATA LAPORAN -->
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 5%;">No</th>
            <th style="width: 14%;">Tanggal & Waktu</th>
            <th style="width: 20%;">Siswa & Kelas</th>
            <th style="width: 20%;">Judul Buku</th>
            <th style="width: 27%;">Rangkuman / Refleksi</th>
            <th style="width: 7%;">Poin</th>
            <th style="width: 7%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- TANDA TANGAN VALIDASI -->
      <table class="signature-table">
        <tr>
          <td style="width: 50%; text-align: center;">
            Mengetahui,<br/>
            <strong>KEPALA SEKOLAH</strong><br/><br/><br/><br/><br/>
            <strong><u>Dr. H. Ahmad Dahlan, M.Pd.</u></strong><br/>
            <span style="font-size: 8.5pt; color: #475569;">NIP. 19750817 200003 1 001</span>
          </td>
          <td style="width: 50%; text-align: center;">
            Kota Literasi, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
            <strong>PEMBINA / KOORDINATOR LITERASI</strong><br/><br/><br/><br/><br/>
            <strong><u>${escapeHtml(teacherName)}</u></strong><br/>
            <span style="font-size: 8.5pt; color: #475569;">NIP. 19821124 200801 2 005</span>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Create Blob and trigger download
  const blob = new Blob(['\ufeff' + wordDocumentHtml], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
