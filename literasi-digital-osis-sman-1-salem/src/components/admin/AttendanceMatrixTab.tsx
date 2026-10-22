import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Calendar, 
  Download, 
  Settings, 
  Plus, 
  Trash2, 
  Check, 
  Search, 
  Users, 
  GraduationCap, 
  ChevronDown, 
  Sparkles, 
  RotateCcw, 
  FileSpreadsheet, 
  X, 
  CheckCircle2, 
  Info,
  CalendarCheck2,
  Filter,
  Eye,
  BookOpen
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ReadingReport, UserProfile, AttendanceConfig, AttendanceMonthSchedule } from '../../types';
import { sortClassNames } from '../../data/schoolConstants';

interface AttendanceMatrixTabProps {
  reports: ReadingReport[];
  classList: string[];
  allUsers: UserProfile[];
  currentUser?: UserProfile | null;
}

const INDONESIAN_MONTHS_MAP: Record<string, number> = {
  'JANUARI': 0,
  'FEBRUARI': 1,
  'MARET': 2,
  'APRIL': 3,
  'MEI': 4,
  'JUNI': 5,
  'JULI': 6,
  'AGUSTUS': 7,
  'SEPTEMBER': 8,
  'OKTOBER': 9,
  'NOVEMBER': 10,
  'DESEMBER': 11,
};

const MONTH_NAMES_LIST = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

const DEFAULT_SCHEDULE_CONFIG: AttendanceConfig = {
  academicYear: '2024/2025',
  semester: 'Ganjil',
  months: [
    {
      id: 'm-okt',
      monthName: 'OKTOBER',
      monthIndex: 9,
      dates: [1, 17, 24, 31],
    },
    {
      id: 'm-nov',
      monthName: 'NOVEMBER',
      monthIndex: 10,
      dates: [7, 14, 21, 28],
    },
    {
      id: 'm-des',
      monthName: 'DESEMBER',
      monthIndex: 11,
      dates: [5, 12, 19],
    },
  ],
};

export const AttendanceMatrixTab: React.FC<AttendanceMatrixTabProps> = ({
  reports,
  classList = [],
  allUsers = [],
  currentUser,
}) => {
  // Selected Filters
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('Ganjil');
  const [selectedYear, setSelectedYear] = useState<string>('2024/2025');
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');

  // Attendance Schedule Configuration
  const [config, setConfig] = useState<AttendanceConfig>(DEFAULT_SCHEDULE_CONFIG);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Edit State inside Config Modal
  const [editingConfig, setEditingConfig] = useState<AttendanceConfig>(DEFAULT_SCHEDULE_CONFIG);
  const [newMonthName, setNewMonthName] = useState<string>('OKTOBER');
  const [newMonthDatesInput, setNewMonthDatesInput] = useState<string>('1, 8, 15, 22, 29');

  // Hovered Cell Details
  const [hoveredReport, setHoveredReport] = useState<{
    studentName: string;
    dateLabel: string;
    report: ReadingReport;
    x: number;
    y: number;
  } | null>(null);

  // Initial Class Setup
  useEffect(() => {
    if (!selectedClass && classList.length > 0) {
      setSelectedClass(classList[0]);
    } else if (!selectedClass && allUsers.length > 0) {
      const firstClass = allUsers.find(u => u.kelas && u.kelas !== 'GURU')?.kelas;
      if (firstClass) setSelectedClass(firstClass);
    }
  }, [classList, allUsers, selectedClass]);

  // Load config from Firestore doc 'app_settings/attendance_schedule' with LocalStorage backup
  useEffect(() => {
    // 1. Try local storage first
    try {
      const savedLocal = localStorage.getItem('literal_attendance_matrix_config');
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (parsed && Array.isArray(parsed.months)) {
          setConfig(parsed);
          setEditingConfig(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not read attendance config from local storage', e);
    }

    // 2. Realtime listener from Firestore
    const unsub = onSnapshot(doc(db, 'app_settings', 'attendance_schedule'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AttendanceConfig;
        if (data && Array.isArray(data.months)) {
          setConfig(data);
          setEditingConfig(data);
          if (data.semester) setSelectedSemester(data.semester);
          if (data.academicYear) setSelectedYear(data.academicYear);
          localStorage.setItem('literal_attendance_matrix_config', JSON.stringify(data));
        }
      }
    }, (err) => {
      console.warn('Firestore attendance_schedule snapshot error:', err);
    });

    return () => unsub();
  }, []);

  // Sync editing config when opening modal
  const handleOpenConfigModal = () => {
    setEditingConfig(JSON.parse(JSON.stringify(config)));
    setIsConfigModalOpen(true);
  };

  // Save Schedule Config to Firestore & LocalStorage
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const updatedConfig: AttendanceConfig = {
        ...editingConfig,
        academicYear: selectedYear,
        semester: selectedSemester,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || 'Admin Literasi',
      };

      await setDoc(doc(db, 'app_settings', 'attendance_schedule'), updatedConfig, { merge: true });
      localStorage.setItem('literal_attendance_matrix_config', JSON.stringify(updatedConfig));
      setConfig(updatedConfig);

      setSaveSuccessMsg('Format dan jadwal absensi berhasil disimpan!');
      setTimeout(() => {
        setSaveSuccessMsg(null);
        setIsConfigModalOpen(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to save attendance schedule:', err);
      alert('Gagal menyimpan jadwal absensi ke database. Perubahan disimpan secara lokal.');
      localStorage.setItem('literal_attendance_matrix_config', JSON.stringify(editingConfig));
      setConfig(editingConfig);
      setIsConfigModalOpen(false);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Reset to standard sample config
  const handleResetToStandard = () => {
    setEditingConfig(JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_CONFIG)));
  };

  // Add a new Month block to editing schedule
  const handleAddMonth = () => {
    const cleanMonth = newMonthName.trim().toUpperCase();
    if (!cleanMonth) return;

    // Parse comma-separated dates
    const parsedDates = newMonthDatesInput
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= 31);

    const uniqueSorted: number[] = Array.from(new Set<number>(parsedDates)).sort((a: number, b: number) => a - b);
    if (uniqueSorted.length === 0) {
      alert('Masukkan minimal 1 tanggal yang valid (angka 1 s.d. 31)');
      return;
    }

    const monthIdx = INDONESIAN_MONTHS_MAP[cleanMonth] ?? 9;
    const newEntry: AttendanceMonthSchedule = {
      id: 'm-' + Date.now(),
      monthName: cleanMonth,
      monthIndex: monthIdx,
      dates: uniqueSorted,
    };

    setEditingConfig(prev => ({
      ...prev,
      months: [...prev.months, newEntry]
    }));

    setNewMonthDatesInput('1, 8, 15, 22, 29');
  };

  // Remove Month block
  const handleRemoveMonth = (monthId: string) => {
    setEditingConfig(prev => ({
      ...prev,
      months: prev.months.filter(m => m.id !== monthId)
    }));
  };

  // Add date to an existing month
  const handleAddDateToMonth = (monthId: string, dateNum: number) => {
    if (dateNum < 1 || dateNum > 31) return;
    setEditingConfig(prev => ({
      ...prev,
      months: prev.months.map(m => {
        if (m.id === monthId) {
          const nextDates: number[] = Array.from(new Set<number>([...m.dates, dateNum])).sort((a: number, b: number) => a - b);
          return { ...m, dates: nextDates };
        }
        return m;
      })
    }));
  };

  // Remove date from an existing month
  const handleRemoveDateFromMonth = (monthId: string, dateNum: number) => {
    setEditingConfig(prev => ({
      ...prev,
      months: prev.months.map(m => {
        if (m.id === monthId) {
          return { ...m, dates: m.dates.filter(d => d !== dateNum) };
        }
        return m;
      })
    }));
  };

  // 1. Get filtered list of students in the selected class
  const classStudents = useMemo(() => {
    const studentMap = new Map<string, { uid: string; name: string; email: string; kelas: string }>();

    // From allUsers
    allUsers.forEach(u => {
      if (u.role === 'siswa' || !u.role) {
        if (!selectedClass || u.kelas === selectedClass) {
          const key = (u.uid || u.email || u.name).toLowerCase();
          studentMap.set(key, {
            uid: u.uid || key,
            name: u.name || 'Siswa',
            email: u.email || '',
            kelas: u.kelas || selectedClass || 'Umum',
          });
        }
      }
    });

    // From reports in this class (in case student not in allUsers yet)
    reports.forEach(r => {
      if (!selectedClass || r.kelas === selectedClass) {
        const key = (r.userId || r.userEmail || r.userName).toLowerCase();
        if (!studentMap.has(key)) {
          studentMap.set(key, {
            uid: r.userId || key,
            name: r.userName || 'Siswa',
            email: r.userEmail || '',
            kelas: r.kelas || selectedClass || 'Umum',
          });
        }
      }
    });

    let list = Array.from(studentMap.values());

    // Search query filter
    if (searchStudentQuery.trim()) {
      const q = searchStudentQuery.toLowerCase().trim();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }

    // Sort alphabetically by name
    return list.sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
  }, [allUsers, reports, selectedClass, searchStudentQuery]);

  // Total schedule columns count
  const totalScheduledDatesCount = useMemo(() => {
    return config.months.reduce((acc, m) => acc + m.dates.length, 0);
  }, [config.months]);

  // Helper to match student attendance on a specific month and day
  const checkStudentAttendance = (
    student: { uid: string; name: string; email: string },
    monthObj: AttendanceMonthSchedule,
    day: number
  ): { hasReport: boolean; report?: ReadingReport } => {
    const targetMonthIdx = monthObj.monthIndex ?? INDONESIAN_MONTHS_MAP[monthObj.monthName.toUpperCase()] ?? -1;

    // Filter student reports
    const studentReps = reports.filter(r => {
      if (r.status === 'Ditolak') return false; // Rejected report doesn't count as attendance
      const uidMatch = r.userId && student.uid && r.userId === student.uid;
      const emailMatch = r.userEmail && student.email && r.userEmail.toLowerCase() === student.email.toLowerCase();
      const nameMatch = r.userName && student.name && r.userName.trim().toLowerCase() === student.name.trim().toLowerCase();
      return uidMatch || emailMatch || nameMatch;
    });

    for (const rep of studentReps) {
      // 1. Check by dateStr: YYYY-MM-DD
      if (rep.dateStr) {
        const parts = rep.dateStr.split('-');
        if (parts.length >= 3) {
          const repDay = parseInt(parts[2], 10);
          const repMonth = parseInt(parts[1], 10) - 1; // 0-indexed

          if (repDay === day) {
            if (targetMonthIdx === -1 || repMonth === targetMonthIdx) {
              return { hasReport: true, report: rep };
            }
          }
        }
      }

      // 2. Check by timestamp
      if (rep.timestamp) {
        const dt = new Date(rep.timestamp);
        if (!isNaN(dt.getTime())) {
          const repDay = dt.getDate();
          const repMonth = dt.getMonth();
          if (repDay === day) {
            if (targetMonthIdx === -1 || repMonth === targetMonthIdx) {
              return { hasReport: true, report: rep };
            }
          }
        }
      }
    }

    return { hasReport: false };
  };

  // Count attendance stats for student across current config
  const getStudentAttendanceCount = (student: { uid: string; name: string; email: string }) => {
    let count = 0;
    config.months.forEach(m => {
      m.dates.forEach(d => {
        if (checkStudentAttendance(student, m, d).hasReport) {
          count++;
        }
      });
    });
    return count;
  };

  // Overall attendance calculation for summary badges
  const classSummaryStats = useMemo(() => {
    if (classStudents.length === 0 || totalScheduledDatesCount === 0) {
      return { totalAttendance: 0, percentage: 0 };
    }
    let totalPresent = 0;
    classStudents.forEach(s => {
      totalPresent += getStudentAttendanceCount(s);
    });
    const totalPossible = classStudents.length * totalScheduledDatesCount;
    const pct = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
    return { totalAttendance: totalPresent, percentage: pct };
  }, [classStudents, totalScheduledDatesCount, config.months, reports]);

  // Export to Excel Matrix (.xlsx)
  const handleExportExcelMatrix = async () => {
    if (classStudents.length === 0) {
      alert('Tidak ada data siswa pada kelas terpilih untuk diekspor!');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'LITERAL - Literasi Digital';
      workbook.lastModifiedBy = currentUser?.name || 'Admin Literasi';
      workbook.created = new Date();
      workbook.modified = new Date();

      const sheetName = `Absensi ${selectedClass || 'Kelas'}`.substring(0, 31);
      const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ showGridLines: true }],
      });

      // Total columns: Col A (No) + Col B (Nama Siswa) + totalScheduledDates + Col (Total Hadir) + Col (% Kehadiran)
      const totalColumns = 2 + totalScheduledDatesCount + 2;

      // 1. Title Row 1: DAFTAR ABSENSI LITERASI DIGITAL
      const titleRow1 = worksheet.getRow(1);
      titleRow1.height = 26;
      worksheet.mergeCells(1, 1, 1, totalColumns);
      const cellTitle1 = titleRow1.getCell(1);
      cellTitle1.value = 'DAFTAR ABSENSI LITERASI DIGITAL';
      cellTitle1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
      cellTitle1.alignment = { horizontal: 'center', vertical: 'middle' };

      // 2. Title Row 2: KELAS [Nama Kelas] SEMESTER [Semester]
      const titleRow2 = worksheet.getRow(2);
      titleRow2.height = 22;
      worksheet.mergeCells(2, 1, 2, totalColumns);
      const cellTitle2 = titleRow2.getCell(1);
      cellTitle2.value = `KELAS ${selectedClass || 'SEMUA KELAS'} SEMESTER ${selectedSemester.toUpperCase()} T.A. ${selectedYear}`;
      cellTitle2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
      cellTitle2.alignment = { horizontal: 'center', vertical: 'middle' };

      // Row 3: Blank separator
      worksheet.getRow(3).height = 10;

      // 3. Header Rows (Rows 4 & 5) - Yellow Background (bg-yellow-300 / #FEF08A / ARGB: FFFEF08A)
      const headerRow1 = worksheet.getRow(4);
      const headerRow2 = worksheet.getRow(5);
      headerRow1.height = 25;
      headerRow2.height = 22;

      const yellowFill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF08A' }, // Yellow 300
      };

      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };

      // Merge Col A (Row 4 & 5): NO
      worksheet.mergeCells(4, 1, 5, 1);
      const cellNo = headerRow1.getCell(1);
      cellNo.value = 'NO';
      cellNo.font = { name: 'Calibri', size: 11, bold: true };
      cellNo.alignment = { horizontal: 'center', vertical: 'middle' };
      cellNo.fill = yellowFill;
      cellNo.border = thinBorder;
      headerRow2.getCell(1).border = thinBorder;
      headerRow2.getCell(1).fill = yellowFill;

      // Merge Col B (Row 4 & 5): NAMA SISWA
      worksheet.mergeCells(4, 2, 5, 2);
      const cellNama = headerRow1.getCell(2);
      cellNama.value = 'NAMA SISWA';
      cellNama.font = { name: 'Calibri', size: 11, bold: true };
      cellNama.alignment = { horizontal: 'center', vertical: 'middle' };
      cellNama.fill = yellowFill;
      cellNama.border = thinBorder;
      headerRow2.getCell(2).border = thinBorder;
      headerRow2.getCell(2).fill = yellowFill;

      // Iterate through months and render dates under months
      let currentCol = 3;
      config.months.forEach((month) => {
        const dateCount = month.dates.length;
        if (dateCount > 0) {
          const startCol = currentCol;
          const endCol = currentCol + dateCount - 1;

          // Merge month cells in Row 4
          if (startCol < endCol) {
            worksheet.mergeCells(4, startCol, 4, endCol);
          }

          const cellMonth = headerRow1.getCell(startCol);
          cellMonth.value = month.monthName.toUpperCase();
          cellMonth.font = { name: 'Calibri', size: 11, bold: true };
          cellMonth.alignment = { horizontal: 'center', vertical: 'middle' };
          cellMonth.fill = yellowFill;
          cellMonth.border = thinBorder;

          // Set borders and fill for each column in this month
          for (let c = startCol; c <= endCol; c++) {
            headerRow1.getCell(c).border = thinBorder;
            headerRow1.getCell(c).fill = yellowFill;
          }

          // Row 5: Dates under the month
          month.dates.forEach((dateNum, idx) => {
            const dateCol = startCol + idx;
            const cellDate = headerRow2.getCell(dateCol);
            cellDate.value = dateNum;
            cellDate.font = { name: 'Calibri', size: 10, bold: true };
            cellDate.alignment = { horizontal: 'center', vertical: 'middle' };
            cellDate.fill = yellowFill;
            cellDate.border = thinBorder;
          });

          currentCol = endCol + 1;
        }
      });

      // Merge Column TOTAL HADIR (Row 4 & 5)
      const totalColIndex = currentCol;
      worksheet.mergeCells(4, totalColIndex, 5, totalColIndex);
      const cellTot = headerRow1.getCell(totalColIndex);
      cellTot.value = 'TOTAL';
      cellTot.font = { name: 'Calibri', size: 10, bold: true };
      cellTot.alignment = { horizontal: 'center', vertical: 'middle' };
      cellTot.fill = yellowFill;
      cellTot.border = thinBorder;
      headerRow2.getCell(totalColIndex).border = thinBorder;
      headerRow2.getCell(totalColIndex).fill = yellowFill;

      // Merge Column % KEHADIRAN (Row 4 & 5)
      const pctColIndex = currentCol + 1;
      worksheet.mergeCells(4, pctColIndex, 5, pctColIndex);
      const cellPct = headerRow1.getCell(pctColIndex);
      cellPct.value = '%';
      cellPct.font = { name: 'Calibri', size: 10, bold: true };
      cellPct.alignment = { horizontal: 'center', vertical: 'middle' };
      cellPct.fill = yellowFill;
      cellPct.border = thinBorder;
      headerRow2.getCell(pctColIndex).border = thinBorder;
      headerRow2.getCell(pctColIndex).fill = yellowFill;

      // 4. Populate Student Rows (Starting Row 6)
      let currentRowIdx = 6;
      classStudents.forEach((student, sIdx) => {
        const row = worksheet.getRow(currentRowIdx);
        row.height = 20;

        // Col 1: NO
        const c1 = row.getCell(1);
        c1.value = sIdx + 1;
        c1.alignment = { horizontal: 'center', vertical: 'middle' };
        c1.font = { name: 'Calibri', size: 10 };
        c1.border = thinBorder;

        // Col 2: NAMA SISWA
        const c2 = row.getCell(2);
        c2.value = student.name;
        c2.alignment = { horizontal: 'left', vertical: 'middle' };
        c2.font = { name: 'Calibri', size: 10, bold: true };
        c2.border = thinBorder;

        // Date columns
        let colTracker = 3;
        let presentCount = 0;

        config.months.forEach((month) => {
          month.dates.forEach((dateNum) => {
            const cell = row.getCell(colTracker);
            const attendance = checkStudentAttendance(student, month, dateNum);

            if (attendance.hasReport) {
              cell.value = '✓';
              cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF15803D' } }; // Dark Green
              presentCount++;
            } else {
              cell.value = '';
            }

            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = thinBorder;
            colTracker++;
          });
        });

        // Total Column
        const cellTotal = row.getCell(totalColIndex);
        cellTotal.value = presentCount;
        cellTotal.alignment = { horizontal: 'center', vertical: 'middle' };
        cellTotal.font = { name: 'Calibri', size: 10, bold: true };
        cellTotal.border = thinBorder;

        // Percentage Column
        const cellPercentage = row.getCell(pctColIndex);
        const pct = totalScheduledDatesCount > 0 ? Math.round((presentCount / totalScheduledDatesCount) * 100) : 0;
        cellPercentage.value = `${pct}%`;
        cellPercentage.alignment = { horizontal: 'center', vertical: 'middle' };
        cellPercentage.font = { name: 'Calibri', size: 10, bold: true };
        cellPercentage.border = thinBorder;

        currentRowIdx++;
      });

      // 5. Total Rekapitulasi Hadir Baris Bawah
      const summaryRow = worksheet.getRow(currentRowIdx);
      summaryRow.height = 22;
      worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, 2);
      const sumLabelCell = summaryRow.getCell(1);
      sumLabelCell.value = 'JUMLAH SISWA HADIR';
      sumLabelCell.font = { name: 'Calibri', size: 10, bold: true };
      sumLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sumLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      sumLabelCell.border = thinBorder;
      summaryRow.getCell(2).border = thinBorder;
      summaryRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

      let colSumTracker = 3;
      let grandTotalPresent = 0;
      config.months.forEach((month) => {
        month.dates.forEach((dateNum) => {
          let datePresentCount = 0;
          classStudents.forEach((student) => {
            if (checkStudentAttendance(student, month, dateNum).hasReport) {
              datePresentCount++;
            }
          });
          grandTotalPresent += datePresentCount;

          const sumCell = summaryRow.getCell(colSumTracker);
          sumCell.value = datePresentCount;
          sumCell.font = { name: 'Calibri', size: 10, bold: true };
          sumCell.alignment = { horizontal: 'center', vertical: 'middle' };
          sumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          sumCell.border = thinBorder;
          colSumTracker++;
        });
      });

      // Total summary cells
      const sumTotCell = summaryRow.getCell(totalColIndex);
      sumTotCell.value = grandTotalPresent;
      sumTotCell.font = { name: 'Calibri', size: 10, bold: true };
      sumTotCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sumTotCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      sumTotCell.border = thinBorder;

      const sumPctCell = summaryRow.getCell(pctColIndex);
      const totalPossible = classStudents.length * totalScheduledDatesCount;
      const avgPct = totalPossible > 0 ? Math.round((grandTotalPresent / totalPossible) * 100) : 0;
      sumPctCell.value = `${avgPct}%`;
      sumPctCell.font = { name: 'Calibri', size: 10, bold: true };
      sumPctCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sumPctCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      sumPctCell.border = thinBorder;

      // Auto-fit Column Widths
      worksheet.getColumn(1).width = 6; // No
      worksheet.getColumn(2).width = 30; // Nama Siswa

      for (let c = 3; c <= 2 + totalScheduledDatesCount; c++) {
        worksheet.getColumn(c).width = 5.5; // Date columns
      }
      worksheet.getColumn(totalColIndex).width = 8; // Total
      worksheet.getColumn(pctColIndex).width = 7; // %

      // Write buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const cleanClass = (selectedClass || 'Semua_Kelas').replace(/[^a-zA-Z0-9]/g, '_');
      anchor.download = `Absensi_Literasi_${cleanClass}_${selectedSemester}_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating Excel matrix:', err);
      alert('Terjadi kesalahan saat membuat file Excel. Silakan periksa koneksi dan coba lagi.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* 1. Header Card with Title, Filters, and Action Buttons */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-blue-100 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#005AC1] border border-blue-200 text-xs font-bold">
              <CalendarCheck2 className="w-3.5 h-3.5" />
              <span>Matriks Presensi Otomatis</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Absensi Literasi Digital
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Sistem mencocokkan laporan rangkuman bacaan siswa secara otomatis pada tanggal jadwal literasi. Tanda centang (✓) otomatis terisi saat siswa telah mengirim laporan ulasan buku.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleOpenConfigModal}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-slate-200 shadow-2xs"
              title="Atur Bulan & Tanggal Pelaksanaan Literasi"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span>Pengaturan Jadwal & Tanggal</span>
            </button>

            <button
              onClick={handleExportExcelMatrix}
              className="px-4 py-2.5 bg-[#005AC1] hover:bg-[#00479b] text-white rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-900/15"
              title="Unduh file Excel Rekap Matriks"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Rekap Matriks Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* 2. Filter Bar: Dropdown Kelas, Semester, Tahun Ajaran, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          {/* Filter 1: Pilih Kelas */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#005AC1]" />
              <span>Pilih Kelas</span>
            </label>
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#005AC1] focus:ring-2 focus:ring-blue-100 rounded-2xl text-xs font-bold text-slate-800 transition-all cursor-pointer appearance-none"
              >
                {classList.length > 0 ? (
                  sortClassNames(classList).map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))
                ) : (
                  <option value="">Semua Siswa</option>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Filter 2: Semester */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#005AC1]" />
              <span>Semester</span>
            </label>
            <div className="relative">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#005AC1] focus:ring-2 focus:ring-blue-100 rounded-2xl text-xs font-bold text-slate-800 transition-all cursor-pointer appearance-none"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Filter 3: Tahun Ajaran */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Tahun Ajaran</span>
            </label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#005AC1] focus:ring-2 focus:ring-blue-100 rounded-2xl text-xs font-bold text-slate-800 transition-all cursor-pointer appearance-none"
              >
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
                <option value="2023/2024">2023/2024</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Filter 4: Cari Siswa */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Cari Nama Siswa</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                placeholder="Ketik nama siswa..."
                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#005AC1] focus:ring-2 focus:ring-blue-100 rounded-2xl text-xs font-medium text-slate-800 transition-all outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {searchStudentQuery && (
                <button
                  onClick={() => setSearchStudentQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Summary Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#005AC1] text-white flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Siswa Terdaftar</div>
              <div className="text-base font-black text-slate-900">{classStudents.length} Siswa</div>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-amber-800 uppercase">Jadwal Pertemuan</div>
              <div className="text-base font-black text-slate-900">{totalScheduledDatesCount} Tanggal</div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-800 uppercase">Laporan Terisi</div>
              <div className="text-base font-black text-slate-900">{classSummaryStats.totalAttendance} Centang</div>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-indigo-800 uppercase">% Partisipasi Kelas</div>
              <div className="text-base font-black text-slate-900">{classSummaryStats.percentage}% Hadir</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Attendance Matrix Table (Styled like the Excel Sheet) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table Title Banner */}
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-b border-amber-200/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                DAFTAR ABSENSI LITERASI DIGITAL — KELAS {selectedClass || 'SEMUA KELAS'}
              </h3>
              <p className="text-[11px] text-amber-800 font-medium">
                T.A. {selectedYear} • Semester {selectedSemester} • Format Kolom Bulan & Tanggal Bertingkat
              </p>
            </div>
          </div>

          <span className="text-[11px] font-bold text-slate-600 bg-white/90 border border-amber-300 px-3 py-1 rounded-full shadow-2xs self-start sm:self-auto">
            {config.months.length} Bulan Aktif • {totalScheduledDatesCount} Kolom Pertemuan
          </span>
        </div>

        {/* Scrollable Matrix Table (Full-width Horizontal Scroll on Mobile) */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-xs font-sans">
            {/* Header Rows */}
            <thead>
              {/* Header 1: NO, NAMA SISWA, BULAN MERGED, TOTAL, % */}
              <tr className="bg-[#FEF08A] text-slate-900 border-b border-amber-300">
                <th
                  rowSpan={2}
                  className="py-3 px-3.5 text-center font-black text-slate-900 border-r border-b border-amber-300 w-12 bg-[#FEF08A]"
                >
                  NO
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-4 font-black text-slate-900 border-r border-b border-amber-300 min-w-[200px] max-w-[260px] bg-[#FEF08A]"
                >
                  NAMA SISWA
                </th>

                {/* Sub-header Bulan menyatu (Merge Cells) di atas tanggal-tanggal terkait */}
                {config.months.map((month) => (
                  <th
                    key={month.id}
                    colSpan={month.dates.length || 1}
                    className="py-2.5 px-2 text-center font-black tracking-wider text-slate-900 border-r border-b border-amber-300 uppercase"
                  >
                    {month.monthName}
                  </th>
                ))}

                <th
                  rowSpan={2}
                  className="py-3 px-3 text-center font-black text-slate-900 border-r border-b border-amber-300 min-w-[60px]"
                >
                  TOTAL
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-3 text-center font-black text-slate-900 border-b border-amber-300 min-w-[55px]"
                >
                  %
                </th>
              </tr>

              {/* Header 2: Tanggal-tanggal di bawah masing-masing Bulan */}
              <tr className="bg-[#FEF08A] text-slate-900 border-b-2 border-amber-400">
                {config.months.map((month) =>
                  month.dates.length > 0 ? (
                    month.dates.map((dateNum) => (
                      <th
                        key={`${month.id}-${dateNum}`}
                        className="py-2 px-1 text-center font-black text-slate-800 border-r border-amber-300 min-w-[36px] max-w-[42px]"
                        title={`Bulan ${month.monthName} Tanggal ${dateNum}`}
                      >
                        {dateNum}
                      </th>
                    ))
                  ) : (
                    <th
                      key={`${month.id}-empty`}
                      className="py-2 px-2 text-center text-[10px] text-slate-500 italic border-r border-amber-300"
                    >
                      (Belum ada tgl)
                    </th>
                  )
                )}
              </tr>
            </thead>

            {/* Table Body (Students) */}
            <tbody className="divide-y divide-slate-200">
              {classStudents.length > 0 ? (
                classStudents.map((student, sIdx) => {
                  const presentCount = getStudentAttendanceCount(student);
                  const pct = totalScheduledDatesCount > 0 ? Math.round((presentCount / totalScheduledDatesCount) * 100) : 0;

                  return (
                    <tr
                      key={student.uid || student.email || sIdx}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      {/* Col 1: NO */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600 border-r border-slate-200 bg-white group-hover:bg-blue-50/50">
                        {sIdx + 1}
                      </td>

                      {/* Col 2: NAMA SISWA */}
                      <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200 bg-white group-hover:bg-blue-50/50">
                        <div className="truncate max-w-[220px]" title={student.name}>
                          {student.name}
                        </div>
                        {student.email && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-[220px]">
                            {student.email}
                          </div>
                        )}
                      </td>

                      {/* Columns Tanggal: Centang '✓' Otomatis jika siswa sudah mengirim rangkuman */}
                      {config.months.map((month) =>
                        month.dates.map((dateNum) => {
                          const att = checkStudentAttendance(student, month, dateNum);

                          return (
                            <td
                              key={`${student.uid}-${month.id}-${dateNum}`}
                              className={`py-2 px-1 text-center border-r border-slate-200 transition-colors ${
                                att.hasReport
                                  ? 'bg-emerald-50/40 text-emerald-700 font-black cursor-pointer hover:bg-emerald-100'
                                  : 'text-slate-300 hover:bg-slate-50'
                              }`}
                              onMouseEnter={(e) => {
                                if (att.hasReport && att.report) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredReport({
                                    studentName: student.name,
                                    dateLabel: `${dateNum} ${month.monthName}`,
                                    report: att.report,
                                    x: rect.left + window.scrollX,
                                    y: rect.bottom + window.scrollY + 6,
                                  });
                                }
                              }}
                              onMouseLeave={() => setHoveredReport(null)}
                            >
                              {att.hasReport ? (
                                <span
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100/90 text-emerald-800 font-black text-sm select-none"
                                  title={`✓ Hadir: Mengirim laporan ulasan buku pada tanggal ${dateNum} ${month.monthName}`}
                                >
                                  ✓
                                </span>
                              ) : (
                                <span className="text-slate-300 font-light select-none">-</span>
                              )}
                            </td>
                          );
                        })
                      )}

                      {/* Col TOTAL HADIR */}
                      <td className="py-2.5 px-2 text-center font-black text-slate-900 border-r border-slate-200 bg-slate-50/50">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                          presentCount === totalScheduledDatesCount && totalScheduledDatesCount > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : presentCount > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {presentCount}
                        </span>
                      </td>

                      {/* Col % KEHADIRAN */}
                      <td className="py-2.5 px-2 text-center font-black text-slate-800 bg-slate-50/50">
                        <span className={`text-[11px] font-bold ${
                          pct >= 75 ? 'text-emerald-700 font-black' : pct >= 50 ? 'text-blue-700' : 'text-slate-500'
                        }`}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={totalScheduledDatesCount + 4}
                    className="py-12 px-4 text-center text-slate-500"
                  >
                    <div className="max-w-md mx-auto space-y-2">
                      <Users className="w-10 h-10 text-slate-300 mx-auto" />
                      <div className="font-bold text-sm text-slate-700">
                        Tidak ada siswa terdaftar di Kelas {selectedClass}
                      </div>
                      <p className="text-xs text-slate-400">
                        Silakan pilih kelas lain dari menu filter di atas, atau tambahkan siswa ke kelas ini melalui tab Pengaturan Sekolah.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer: Rekapitulasi Jumlah Hadir per Tanggal */}
            {classStudents.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/90 font-black text-slate-800 border-t-2 border-slate-300">
                  <td
                    colSpan={2}
                    className="py-3 px-4 text-center font-black text-xs uppercase tracking-wider border-r border-slate-300 bg-slate-100"
                  >
                    JUMLAH SISWA HADIR
                  </td>

                  {/* Total Hadir per Kolom Tanggal */}
                  {config.months.map((month) =>
                    month.dates.map((dateNum) => {
                      let datePresentCount = 0;
                      classStudents.forEach((student) => {
                        if (checkStudentAttendance(student, month, dateNum).hasReport) {
                          datePresentCount++;
                        }
                      });

                      return (
                        <td
                          key={`footer-${month.id}-${dateNum}`}
                          className="py-2.5 px-1 text-center font-extrabold text-xs text-slate-800 border-r border-slate-300"
                        >
                          {datePresentCount}
                        </td>
                      );
                    })
                  )}

                  {/* Grand Total Hadir */}
                  <td className="py-3 px-2 text-center font-black text-xs text-blue-900 border-r border-slate-300 bg-blue-100/60">
                    {classSummaryStats.totalAttendance}
                  </td>

                  {/* Average % */}
                  <td className="py-3 px-2 text-center font-black text-xs text-blue-900 bg-blue-100/60">
                    {classSummaryStats.percentage}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Interactive Hover Tooltip for Verified Attendance Cell */}
      {hoveredReport && (
        <div
          className="fixed z-50 bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700 text-xs w-72 space-y-2 pointer-events-none animate-fade-in"
          style={{
            top: Math.min(hoveredReport.y, window.innerHeight - 220),
            left: Math.min(hoveredReport.x, window.innerWidth - 300),
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-black text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Laporan Hadir</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">{hoveredReport.dateLabel}</span>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-slate-200 truncate">{hoveredReport.studentName}</div>
            <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{hoveredReport.report.bookTitle}</span>
            </div>
            {hoveredReport.report.pagesRead && (
              <div className="text-[10px] text-slate-400">
                Halaman dibaca: {hoveredReport.report.pagesRead}
              </div>
            )}
          </div>

          {hoveredReport.report.summary && (
            <div className="text-[10px] text-slate-300 line-clamp-2 italic bg-slate-800/80 p-1.5 rounded-lg border border-slate-700">
              "{hoveredReport.report.summary}"
            </div>
          )}

          <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1">
            <span>Status: {hoveredReport.report.status}</span>
            <span>Poin: {hoveredReport.report.pointsTotal ?? 100}</span>
          </div>
        </div>
      )}

      {/* 3. MODAL: PENGATURAN BULAN & TANGGAL OLEH ADMIN */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-blue-100 space-y-6 my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#005AC1] text-white flex items-center justify-center shadow-md shadow-blue-900/15">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900">
                    Pengaturan Bulan & Tanggal Absensi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur susunan nama bulan dan tanggal pelaksanaan literasi untuk matriks presensi.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Toast */}
            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 space-y-6 pr-1">
              {/* Existing Months List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Daftar Bulan & Tanggal Terpasang
                  </span>
                  <button
                    type="button"
                    onClick={handleResetToStandard}
                    className="text-[11px] text-[#005AC1] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Kembalikan Contoh Standar</span>
                  </button>
                </div>

                {editingConfig.months.length > 0 ? (
                  <div className="space-y-3">
                    {editingConfig.months.map((month) => (
                      <div
                        key={month.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black text-xs uppercase border border-amber-300">
                              {month.monthName}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              ({month.dates.length} Tanggal Pelaksanaan)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveMonth(month.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Hapus Bulan Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Chips of Dates */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {month.dates.map((d) => (
                            <span
                              key={d}
                              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs"
                            >
                              <span>Tgl {d}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDateFromMonth(month.id, d)}
                                className="p-0.5 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}

                          {/* Quick Add Single Date Input */}
                          <div className="inline-flex items-center gap-1 pl-2">
                            <input
                              type="number"
                              min="1"
                              max="31"
                              placeholder="+ Tgl"
                              id={`add-date-${month.id}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = parseInt((e.target as HTMLInputElement).value, 10);
                                  if (val) {
                                    handleAddDateToMonth(month.id, val);
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                              className="w-16 px-2 py-1 bg-white border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:border-[#005AC1] outline-hidden text-center"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(`add-date-${month.id}`) as HTMLInputElement;
                                if (input && input.value) {
                                  handleAddDateToMonth(month.id, parseInt(input.value, 10));
                                  input.value = '';
                                }
                              }}
                              className="px-2 py-1 bg-slate-200 hover:bg-[#005AC1] hover:text-white rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              + Tambah
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-xs">
                    Belum ada bulan dan tanggal yang diatur. Silakan tambah di formulir bawah.
                  </div>
                )}
              </div>

              {/* Form to Add New Month */}
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
                <div className="text-xs font-extrabold text-[#005AC1] uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Tambah Bulan & Daftar Tanggal Baru</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Pilih / Nama Bulan:</label>
                    <select
                      value={newMonthName}
                      onChange={(e) => setNewMonthName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-[#005AC1] rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      {MONTH_NAMES_LIST.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">
                      Daftar Tanggal (Pisahkan dengan koma):
                    </label>
                    <input
                      type="text"
                      value={newMonthDatesInput}
                      onChange={(e) => setNewMonthDatesInput(e.target.value)}
                      placeholder="contoh: 1, 17, 24, 31"
                      className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-[#005AC1] rounded-xl text-xs font-bold text-slate-800 outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddMonth}
                    className="px-4 py-2 bg-[#005AC1] text-white hover:bg-[#00479b] rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambahkan Bulan Ini</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-900/15 transition-all disabled:opacity-50"
              >
                {isSavingConfig ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Simpan Format & Jadwal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
