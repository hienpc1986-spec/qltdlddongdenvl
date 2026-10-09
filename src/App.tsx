/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  BarChart3, 
  Settings, 
  Plus, 
  ChevronRight, 
  Download, 
  Bell, 
  Search, 
  Trophy, 
  AlertCircle,
  Trash2,
  Pencil,
  Eye,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  X,
  Filter,
  FileSpreadsheet,
  Upload,
  KeyRound,
  RotateCcw,
  Lock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { ClassInfo, WeeklyPoints, MonthlyRanking, DailyPoints, MovementPoints, UserAccount, UserRole } from './types';
import { calculateWeeklyNeNep } from './utils';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      active 
        ? 'bg-blue-50 text-blue-600 font-semibold' 
        : 'text-slate-600 hover:bg-slate-50'
    }`}
  >
    <Icon size={20} />
    <span className="text-sm">{label}</span>
    {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
  </button>
);

const Card = ({ children, title, subtitle, action }: { children: React.ReactNode, title?: string, subtitle?: string, action?: React.ReactNode }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
    {(title || action) && (
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          {title && <h3 className="font-semibold text-slate-900">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classes' | 'scoring' | 'daily' | 'reports' | 'accounts'>('dashboard');
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyPoints[]>([]);
  const [dailyData, setDailyData] = useState<DailyPoints[]>([]);
  const [movementData, setMovementData] = useState<MovementPoints[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [lockedWeeks, setLockedWeeks] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [accountForm, setAccountForm] = useState<Partial<UserAccount>>({ username: '', password: '', role: 'TEACHER', displayName: '' });
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [resettingAccount, setResettingAccount] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('123');
  const [accountFilterRole, setAccountFilterRole] = useState<'ALL' | UserRole>('ALL');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [deletingAccount, setDeletingAccount] = useState<UserAccount | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassInfo | null>(null);
  const [deletingDailyRecord, setDeletingDailyRecord] = useState<DailyPoints | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 3500);
  };
  const [rankingWeek, setRankingWeek] = useState<number | 'all'>('all');
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [newClassForm, setNewClassForm] = useState({ name: '', teacher: '', grade: 6 });

  // Excel import states for classes
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelParsedClasses, setExcelParsedClasses] = useState<Array<{ name: string; teacher: string; grade: number; isExisting: boolean }>>([]);
  const [excelImportMode, setExcelImportMode] = useState<'update' | 'skip'>('update');
  const [excelCreateAccounts, setExcelCreateAccounts] = useState<boolean>(true);
  const [excelError, setExcelError] = useState<string | null>(null);
  const excelFileInputRef = useRef<HTMLInputElement | null>(null);

  // Permissions and Daily score management states
  const [editingDailyId, setEditingDailyId] = useState<string | null>(null);
  const [viewingDailyDetail, setViewingDailyDetail] = useState<DailyPoints | null>(null);
  const [dailyClassFilter, setDailyClassFilter] = useState<string>('all');

  // Weekly Summary View states
  const [summaryWeek, setSummaryWeek] = useState<number>(1);
  const [summaryGrade, setSummaryGrade] = useState<'all' | number>('all');
  const [scoringViewMode, setScoringViewMode] = useState<'input' | 'summary'>('input');
  const [weeklyDetailClassId, setWeeklyDetailClassId] = useState<string | null>(null);

  useEffect(() => {
    // Load data from localStorage
    const savedClasses = localStorage.getItem('liendoi_classes');
    const savedWeekly = localStorage.getItem('liendoi_weekly');

    let loadedClasses: ClassInfo[] = [];
    if (savedClasses) {
      loadedClasses = JSON.parse(savedClasses);
      setClasses(loadedClasses);
    } else {
      // Mock classes
      loadedClasses = [
        { id: '1', name: '6A1', grade: 6, teacher: 'Nguyễn Văn A' },
        { id: '2', name: '7A2', grade: 7, teacher: 'Trần Thị B' },
        { id: '3', name: '8A3', grade: 8, teacher: 'Lê Văn C' },
        { id: '4', name: '9A4', grade: 9, teacher: 'Phạm Thị D' },
      ];
      setClasses(loadedClasses);
      localStorage.setItem('liendoi_classes', JSON.stringify(loadedClasses));
    }

    if (savedWeekly && JSON.parse(savedWeekly).length > 0) {
      setWeeklyData(JSON.parse(savedWeekly));
    } else {
      const sampleWeekly: WeeklyPoints[] = [
        {
          classId: '1',
          week: 1,
          month: 9,
          attendance: { late: 1, absentWithPermission: 0, absentWithoutPermission: 0, skippedClass: 0 },
          selfManagement: {
            quick: true, full: true, orderly: true, lightsOff: true,
            individualViolations: 1,
            groupViolations: { quick: false, full: false, orderly: false, lightsOff: false },
            notes: '1 lượt ồn giờ sinh hoạt đầu tuần'
          },
          manners: {
            uniform: true, tuckedIn: true, shoes: true, hair: true,
            individualViolations: 2,
            groupViolations: { uniform: false, tuckedIn: false, shoes: false, hair: false },
            notes: '2 lượt quên khăn quàng'
          },
          hygiene: { cleanClass: true, orderlyFurniture: true, cleanCorridor: true, tablecloth: true, eraser: true, litteringCount: 1 },
          discipline: { fighting: 0, swearing: 0, vandalism: 0, cyclingInYard: 0, trafficViolation: 0, notes: '' },
          redStarBonus: 10,
          logbookPoints: 98.5
        },
        {
          classId: '2',
          week: 1,
          month: 9,
          attendance: { late: 0, absentWithPermission: 1, absentWithoutPermission: 0, skippedClass: 0 },
          selfManagement: {
            quick: true, full: true, orderly: true, lightsOff: true,
            individualViolations: 0,
            groupViolations: { quick: false, full: false, orderly: false, lightsOff: false },
            notes: ''
          },
          manners: {
            uniform: true, tuckedIn: true, shoes: true, hair: true,
            individualViolations: 1,
            groupViolations: { uniform: false, tuckedIn: false, shoes: false, hair: false },
            notes: '1 lượt dép lê không quai hậu'
          },
          hygiene: { cleanClass: true, orderlyFurniture: true, cleanCorridor: true, tablecloth: true, eraser: true, litteringCount: 0 },
          discipline: { fighting: 0, swearing: 1, vandalism: 0, cyclingInYard: 0, trafficViolation: 0, notes: 'Nhắc nhở học sinh nói tục trong giờ ra chơi' },
          redStarBonus: 10,
          logbookPoints: 96.0
        },
        {
          classId: '3',
          week: 1,
          month: 9,
          attendance: { late: 2, absentWithPermission: 0, absentWithoutPermission: 1, skippedClass: 0 },
          selfManagement: {
            quick: true, full: true, orderly: true, lightsOff: true,
            individualViolations: 2,
            groupViolations: { quick: false, full: false, orderly: false, lightsOff: false },
            notes: ''
          },
          manners: {
            uniform: true, tuckedIn: true, shoes: true, hair: true,
            individualViolations: 1,
            groupViolations: { uniform: false, tuckedIn: false, shoes: false, hair: false },
            notes: ''
          },
          hygiene: { cleanClass: true, orderlyFurniture: true, cleanCorridor: true, tablecloth: true, eraser: true, litteringCount: 2 },
          discipline: { fighting: 0, swearing: 0, vandalism: 0, cyclingInYard: 0, trafficViolation: 0, notes: '' },
          redStarBonus: 8,
          logbookPoints: 95.0
        },
        {
          classId: '4',
          week: 1,
          month: 9,
          attendance: { late: 1, absentWithPermission: 2, absentWithoutPermission: 0, skippedClass: 0 },
          selfManagement: {
            quick: true, full: true, orderly: true, lightsOff: true,
            individualViolations: 1,
            groupViolations: { quick: false, full: false, orderly: false, lightsOff: false },
            notes: ''
          },
          manners: {
            uniform: true, tuckedIn: true, shoes: true, hair: true,
            individualViolations: 0,
            groupViolations: { uniform: false, tuckedIn: false, shoes: false, hair: false },
            notes: ''
          },
          hygiene: { cleanClass: true, orderlyFurniture: true, cleanCorridor: true, tablecloth: true, eraser: true, litteringCount: 0 },
          discipline: { fighting: 0, swearing: 0, vandalism: 0, cyclingInYard: 0, trafficViolation: 0, notes: '' },
          redStarBonus: 10,
          logbookPoints: 97.0
        }
      ];
      setWeeklyData(sampleWeekly);
      localStorage.setItem('liendoi_weekly', JSON.stringify(sampleWeekly));
    }
    
    const savedDaily = localStorage.getItem('liendoi_daily');
    if (savedDaily && JSON.parse(savedDaily).length > 0) {
      setDailyData(JSON.parse(savedDaily));
    } else {
      // Sample daily records with violation notes for initial demonstration
      const sampleDaily: DailyPoints[] = [
        {
          id: 'd1',
          classId: '1',
          date: new Date().toISOString().split('T')[0],
          week: 1,
          month: 9,
          attendance: { late: 1, absentWithPermission: 0, absentWithoutPermission: 0, skippedClass: 0 },
          selfManagement: {
            quick: true, full: true, orderly: true, lightsOff: true,
            individualViolations: 1,
            groupViolations: { quick: false, full: false, orderly: false, lightsOff: false },
            notes: '1 học sinh làm ồn trong 15 phút đầu giờ sinh hoạt'
          },
          manners: {
            uniform: true, tuckedIn: true, shoes: true, hair: true,
            individualViolations: 2,
            groupViolations: { uniform: false, tuckedIn: false, shoes: false, hair: false },
            notes: '2 học sinh quên mang khăn quàng đỏ; đã nhắc nhở bổ sung'
          },
          hygiene: { cleanClass: true, orderlyFurniture: true, cleanCorridor: true, tablecloth: true, eraser: true, litteringCount: 1 },
          discipline: { fighting: 0, swearing: 0, vandalism: 0, cyclingInYard: 0, trafficViolation: 0, notes: '' }
        },
        {
          id: 'd2',
          classId: '2',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          week: 1,
          month: 9,
          attendance: { late: 0, absentWithPermission: 1, absentWithoutPermission: 0, skippedClass: 0 },
          selfManagement: {
            quick: true, full: true, orderly: true, lightsOff: true,
            individualViolations: 0,
            groupViolations: { quick: false, full: false, orderly: false, lightsOff: false },
            notes: ''
          },
          manners: {
            uniform: true, tuckedIn: true, shoes: true, hair: true,
            individualViolations: 1,
            groupViolations: { uniform: false, tuckedIn: false, shoes: false, hair: false },
            notes: '1 học sinh đi dép lê vào lớp không quai hậu'
          },
          hygiene: { cleanClass: true, orderlyFurniture: true, cleanCorridor: true, tablecloth: true, eraser: true, litteringCount: 0 },
          discipline: { fighting: 0, swearing: 1, vandalism: 0, cyclingInYard: 0, trafficViolation: 0, notes: 'Nhắc nhở học sinh nói tục trong giờ ra chơi tại hành lang tầng 2' }
        }
      ];
      setDailyData(sampleDaily);
      localStorage.setItem('liendoi_daily', JSON.stringify(sampleDaily));
    }

    const savedLocked = localStorage.getItem('liendoi_locked');
    if (savedLocked) {
      setLockedWeeks(JSON.parse(savedLocked));
    }

    const savedMovement = localStorage.getItem('liendoi_movement');
    if (savedMovement) {
      setMovementData(JSON.parse(savedMovement));
    }

    // Default accounts including GVCN for each class and Sao đỏ
    const defaultAccounts: UserAccount[] = [
      {
        id: 'admin',
        username: 'admin',
        password: '123',
        role: 'ADMIN',
        displayName: 'Ban chỉ huy Liên đội'
      },
      {
        id: 'gvcn_6a1',
        username: 'gvcn_6a1',
        password: '123',
        role: 'TEACHER',
        displayName: 'Thầy Nguyễn Văn A (GVCN 6A1)',
        classId: '1'
      },
      {
        id: 'gvcn_7a2',
        username: 'gvcn_7a2',
        password: '123',
        role: 'TEACHER',
        displayName: 'Cô Trần Thị B (GVCN 7A2)',
        classId: '2'
      },
      {
        id: 'gvcn_8a3',
        username: 'gvcn_8a3',
        password: '123',
        role: 'TEACHER',
        displayName: 'Thầy Lê Văn C (GVCN 8A3)',
        classId: '3'
      },
      {
        id: 'gvcn_9a4',
        username: 'gvcn_9a4',
        password: '123',
        role: 'TEACHER',
        displayName: 'Cô Phạm Thị D (GVCN 9A4)',
        classId: '4'
      },
      {
        id: 'saodo',
        username: 'saodo',
        password: '123',
        role: 'SAO_DO',
        displayName: 'Đội Sao đỏ chấm chéo'
      }
    ];

    const savedAccounts = localStorage.getItem('liendoi_accounts');
    if (savedAccounts) {
      const parsed: UserAccount[] = JSON.parse(savedAccounts);
      // Ensure teacher accounts exist in case legacy accounts only had admin
      const hasTeacher = parsed.some(a => a.role === 'TEACHER');
      if (!hasTeacher) {
        const merged = [...parsed, ...defaultAccounts.filter(d => !parsed.some(p => p.username === d.username))];
        setAccounts(merged);
        localStorage.setItem('liendoi_accounts', JSON.stringify(merged));
      } else {
        setAccounts(parsed);
      }
    } else {
      setAccounts(defaultAccounts);
      localStorage.setItem('liendoi_accounts', JSON.stringify(defaultAccounts));
    }

    const savedSession = sessionStorage.getItem('liendoi_user');
    if (savedSession) {
      const user: UserAccount = JSON.parse(savedSession);
      setCurrentUser(user);
      if (user.role === 'TEACHER' && user.classId) {
        setDailyClassFilter(user.classId);
      }
    }
    
    setLoading(false);
  }, []);

  // Update daily form classId, active tab, and filter when currentUser changes
  useEffect(() => {
    if (currentUser?.role === 'TEACHER') {
      if (currentUser.classId) {
        setDailyForm(prev => ({ ...prev, classId: currentUser.classId }));
        setDailyClassFilter(currentUser.classId);
        setWeeklyDetailClassId(currentUser.classId);
      }
      if (activeTab !== 'daily' && activeTab !== 'scoring') {
        setActiveTab('daily');
      }
    } else {
      setDailyClassFilter('all');
    }
  }, [currentUser]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = accounts.find(a => a.username === loginForm.username && a.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem('liendoi_user', JSON.stringify(user));
      setLoginForm({ username: '', password: '' });
      if (user.role === 'TEACHER' || user.role === 'SAO_DO') {
        setActiveTab('daily');
      } else {
        setActiveTab('dashboard');
      }
    } else {
      alert('Tên đăng nhập hoặc mật khẩu không đúng!');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('liendoi_user');
  };

  const handleSaveAccount = () => {
    if (!accountForm.username || !accountForm.password || !accountForm.displayName) {
      alert('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    const newAcc: UserAccount = {
      id: Math.random().toString(36).substr(2, 9),
      username: accountForm.username,
      password: accountForm.password,
      role: accountForm.role as UserRole,
      displayName: accountForm.displayName,
      classId: accountForm.classId
    };
    const updated = [...accounts, newAcc];
    setAccounts(updated);
    localStorage.setItem('liendoi_accounts', JSON.stringify(updated));
    setAccountForm({ username: '', password: '', role: 'TEACHER', displayName: '' });
    setIsAddingAccount(false);
    alert('Đã tạo tài khoản thành công!');
  };

  const handleRequestDeleteAccount = (acc: UserAccount) => {
    if (acc.username === 'admin') {
      showToast('Không thể xóa tài khoản Quản trị viên (Admin) mặc định!', 'error');
      return;
    }
    if (currentUser?.id === acc.id) {
      showToast('Bạn không thể tự xóa tài khoản bạn đang đăng nhập!', 'error');
      return;
    }
    setDeletingAccount(acc);
  };

  const handleConfirmDeleteAccount = () => {
    if (!deletingAccount) return;
    const acc = deletingAccount;
    const updated = accounts.filter(a => a.id !== acc.id);
    setAccounts(updated);
    localStorage.setItem('liendoi_accounts', JSON.stringify(updated));
    showToast(`Đã xóa thành công tài khoản "${acc.displayName}" (${acc.username})!`, 'success');
    setDeletingAccount(null);
  };

  const handleOpenResetPassword = (acc: UserAccount) => {
    setResettingAccount(acc);
    setNewPasswordInput('123');
  };

  const handleConfirmResetPassword = () => {
    if (!resettingAccount) return;
    if (!newPasswordInput.trim()) {
      showToast('Vui lòng nhập mật khẩu mới!', 'error');
      return;
    }

    const newPass = newPasswordInput.trim();
    const updated = accounts.map(a => 
      a.id === resettingAccount.id ? { ...a, password: newPass } : a
    );
    setAccounts(updated);
    localStorage.setItem('liendoi_accounts', JSON.stringify(updated));

    if (currentUser?.id === resettingAccount.id) {
      const updatedCur = { ...currentUser, password: newPass };
      setCurrentUser(updatedCur);
      sessionStorage.setItem('liendoi_user', JSON.stringify(updatedCur));
    }

    showToast(`Đã cấp lại mật khẩu cho "${resettingAccount.displayName}" thành: ${newPass}`, 'success');
    setResettingAccount(null);
  };

  const handleDownloadAccounts = () => {
    if (accounts.length === 0) {
      showToast('Không có dữ liệu tài khoản để tải xuống!', 'error');
      return;
    }

    const exportData = accounts.map(acc => ({
      'Tên hiển thị': acc.displayName,
      'Tên đăng nhập': acc.username,
      'Mật khẩu': acc.password,
      'Vai trò': acc.role === 'ADMIN' ? 'Ban chỉ huy' : acc.role === 'TEACHER' ? 'Giáo viên chủ nhiệm' : 'Sao đỏ',
      'Lớp phụ trách': acc.classId ? (classes.find(c => c.id === acc.classId)?.name || acc.classId) : 'Toàn liên đội'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TaiKhoan');
    const date = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    XLSX.writeFile(wb, `Danh_Sach_Tai_Khoan_${date}.xlsx`);
    showToast('Đã tải xuống danh sách tài khoản thành công!', 'success');
  };

  const toggleLockWeek = (week: number) => {
    const updated = lockedWeeks.includes(week) 
      ? lockedWeeks.filter(w => w !== week)
      : [...lockedWeeks, week];
    setLockedWeeks(updated);
    localStorage.setItem('liendoi_locked', JSON.stringify(updated));
  };

  const getRankings = (grade?: number) => {
    // Group by class and calculate total points
    const filteredClasses = grade ? classes.filter(c => c.grade === grade) : classes;
    
    const classTotals = filteredClasses.map(cls => {
      const classWeekly = rankingWeek === 'all' 
        ? weeklyData.filter(w => w.classId === cls.id)
        : weeklyData.filter(w => w.classId === cls.id && w.week === rankingWeek);
      
      let totalNeNep = 0;
      let totalLogbook = 0;
      
      classWeekly.forEach(w => {
        totalNeNep += calculateWeeklyNeNep(w);
        totalLogbook += w.logbookPoints;
      });

      const avgNeNep = classWeekly.length > 0 ? totalNeNep / classWeekly.length : 0;
      const avgLogbook = classWeekly.length > 0 ? totalLogbook / classWeekly.length : 0;

      // If viewing "all", we can factor in movement points for the current month (e.g. month 9)
      let movementBonus = 0;
      if (rankingWeek === 'all') {
        const classMovement = movementData.find(m => m.classId === cls.id);
        if (classMovement) {
          // Simplified: just add a portion or total. Let's say +10 points max for movement.
          movementBonus = classMovement.bonus.organization + classMovement.bonus.districtAward + classMovement.bonus.leaderBonus;
        }
      }

      return {
        ...cls,
        avgNeNep,
        avgLogbook,
        total: avgNeNep + avgLogbook + movementBonus,
        count: classWeekly.length
      };
    });

    return classTotals.sort((a, b) => b.total - a.total);
  };

  const rankings = getRankings();

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng số chi đội', value: classes.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Điểm cao nhất tuần', value: rankings.length > 0 ? rankings[0].total.toFixed(1) : '0.0', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Vi phạm tuần này', value: weeklyData.length > 0 ? weeklyData.reduce((acc, curr) => acc + (curr.attendance?.late || 0) + (curr.attendance?.absentWithoutPermission || 0), 0) : '0', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Trạng thái Tuần', value: typeof rankingWeek === 'number' ? (lockedWeeks.includes(rankingWeek) ? 'Đã khóa' : 'Đang mở') : 'Tổng hợp', icon: ClipboardCheck, color: lockedWeeks.includes(rankingWeek as number) ? 'text-rose-600' : 'text-emerald-600', bg: lockedWeeks.includes(rankingWeek as number) ? 'bg-rose-50' : 'bg-emerald-50' },
        ].map((stat, i) => (
          <Card key={i}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Xếp hạng Thi đua theo Khối</h2>
        <div className="flex items-center gap-3">
          {typeof rankingWeek === 'number' && (
            <button 
              onClick={() => toggleLockWeek(rankingWeek)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                lockedWeeks.includes(rankingWeek) 
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
            >
              {lockedWeeks.includes(rankingWeek) ? 'Mở khóa Tuần' : 'Khóa Tuần này'}
            </button>
          )}
          <select 
            value={rankingWeek}
            onChange={(e) => setRankingWeek(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none font-medium shadow-sm"
          >
            <option value="all">Tất cả tuần</option>
            {[1,2,3,4,5].map(w => <option key={w} value={w}>Tuần {w}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[6, 7, 8, 9].map(grade => {
          const gradeRankings = getRankings(grade).slice(0, 3);
          return (
            <Card key={grade} title={`Khối ${grade}`} subtitle="Top 3 chi đội xuất sắc nhất">
              <div className="space-y-3">
                {gradeRankings.length > 0 ? gradeRankings.map((cls, idx) => (
                  <div key={cls.id} className="relative overflow-hidden p-3 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-blue-200 transition-all group">
                    {idx === 0 && <div className="absolute top-0 right-0 p-1"><Trophy size={12} className="text-amber-500" /></div>}
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow-sm ${
                        idx === 0 ? 'bg-amber-400 text-white' : 
                        idx === 1 ? 'bg-slate-300 text-white' :
                        'bg-orange-300 text-white'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{cls.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">GV: {cls.teacher}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-blue-600 tabular-nums">{cls.total.toFixed(1)}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Điểm</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-[10px] text-slate-400 italic">Chưa có dữ liệu thi đua</p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card 
        title={`Chi tiết xếp hạng ${rankingWeek === 'all' ? 'Tổng hợp' : `Tuần ${rankingWeek}`}`} 
        subtitle={rankingWeek === 'all' ? "Trung bình cộng điểm nề nếp và sổ đầu bài các tuần" : "Điểm chi tiết của các chi đội trong tuần đã chọn"}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-400 border-b border-slate-100">
                <th className="pb-3 px-2">Hạng LĐ</th>
                <th className="pb-3 px-2">Chi đội</th>
                <th className="pb-3 px-2">Khối</th>
                <th className="pb-3 px-2">TB Nề nếp</th>
                <th className="pb-3 px-2 text-right">Tổng điểm</th>
                <th className="pb-3 px-2 text-center">Hạng Khối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rankings.map((cls, idx) => (
                <tr key={cls.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-slate-400">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{cls.name}</p>
                      <p className="text-[10px] text-slate-500">GVCN: {cls.teacher}</p>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-xs font-semibold text-slate-500">Khối {cls.grade}</td>
                  <td className="py-4 px-2 text-sm text-slate-600 tabular-nums">{cls.avgNeNep.toFixed(1)}</td>
                  <td className="py-4 px-2 text-right">
                    <span className="font-bold text-slate-900 tabular-nums">{cls.total.toFixed(1)}</span>
                  </td>
                  <td className="py-4 px-2 text-center">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-black text-xs">
                      {getRankings(cls.grade).findIndex(r => r.id === cls.id) + 1}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const handleSaveClass = () => {
    if (!newClassForm.name || !newClassForm.teacher) {
      alert('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    
    let updated: ClassInfo[];
    if (editingClassId) {
      updated = classes.map(cls => 
        cls.id === editingClassId 
          ? { ...cls, name: newClassForm.name, teacher: newClassForm.teacher, grade: newClassForm.grade }
          : cls
      );
      alert('Đã cập nhật thông tin chi đội!');
    } else {
      const newCls: ClassInfo = {
        id: Math.random().toString(36).substr(2, 9),
        name: newClassForm.name,
        teacher: newClassForm.teacher,
        grade: newClassForm.grade
      };
      updated = [...classes, newCls];
      alert('Đã thêm chi đội mới!');
    }
    
    setClasses(updated);
    localStorage.setItem('liendoi_classes', JSON.stringify(updated));
    setIsAddingClass(false);
    setEditingClassId(null);
    setNewClassForm({ name: '', teacher: '', grade: 6 });
  };

  const handleEditClass = (cls: ClassInfo) => {
    setNewClassForm({ name: cls.name, teacher: cls.teacher, grade: cls.grade });
    setEditingClassId(cls.id);
    setIsAddingClass(true);
  };

  const handleRequestDeleteClass = (cls: ClassInfo) => {
    setDeletingClass(cls);
  };

  const handleConfirmDeleteClass = () => {
    if (!deletingClass) return;
    const cls = deletingClass;
    const updated = classes.filter(c => c.id !== cls.id);
    setClasses(updated);
    localStorage.setItem('liendoi_classes', JSON.stringify(updated));
    showToast(`Đã xóa thành công chi đội ${cls.name}!`, 'success');
    setDeletingClass(null);
  };

  const handleDownloadExcelTemplate = () => {
    const templateData = [
      { 'Tên chi đội': '6A1', 'Giáo viên chủ nhiệm': 'Nguyễn Văn A', 'Khối': 6 },
      { 'Tên chi đội': '6A2', 'Giáo viên chủ nhiệm': 'Trần Thị B', 'Khối': 6 },
      { 'Tên chi đội': '7A1', 'Giáo viên chủ nhiệm': 'Lê Văn C', 'Khối': 7 },
      { 'Tên chi đội': '7A2', 'Giáo viên chủ nhiệm': 'Phạm Thị D', 'Khối': 7 },
      { 'Tên chi đội': '8A1', 'Giáo viên chủ nhiệm': 'Hoàng Văn E', 'Khối': 8 },
      { 'Tên chi đội': '8A2', 'Giáo viên chủ nhiệm': 'Đỗ Thị H', 'Khối': 8 },
      { 'Tên chi đội': '9A1', 'Giáo viên chủ nhiệm': 'Vũ Thị G', 'Khối': 9 },
      { 'Tên chi đội': '9A2', 'Giáo viên chủ nhiệm': 'Ngô Văn K', 'Khối': 9 },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 15 }, { wch: 26 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachChiDoi');
    XLSX.writeFile(wb, 'Mau_Danh_Sach_Chi_Doi.xlsx');
  };

  const handleProcessExcelFile = (file: File) => {
    setExcelError(null);
    setExcelFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setExcelError('File Excel không có trang tính (sheet) nào.');
          return;
        }
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        if (rawRows.length === 0) {
          setExcelError('File Excel rỗng, không tìm thấy dữ liệu.');
          return;
        }

        const parsed: Array<{ name: string; teacher: string; grade: number; isExisting: boolean }> = [];

        rawRows.forEach((row) => {
          let className = '';
          let teacher = '';
          let grade = 0;

          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase();
            const val = String(row[key]).trim();
            if (
              cleanKey === 'tên chi đội' || 
              cleanKey === 'tên lớp' || 
              cleanKey === 'chi đội' || 
              cleanKey === 'lớp' || 
              cleanKey === 'class' || 
              cleanKey === 'classname' ||
              cleanKey === 'ten chi doi' ||
              cleanKey === 'ten lop' ||
              cleanKey === 'chi doi' ||
              cleanKey === 'lop'
            ) {
              if (val) className = val;
            } else if (
              cleanKey === 'giáo viên chủ nhiệm' ||
              cleanKey === 'gvcn' ||
              cleanKey === 'giáo viên' ||
              cleanKey === 'teacher' ||
              cleanKey === 'giao vien chu nhiem' ||
              cleanKey === 'giao vien' ||
              cleanKey === 'gv'
            ) {
              if (val) teacher = val;
            } else if (
              cleanKey === 'khối' ||
              cleanKey === 'khối lớp' ||
              cleanKey === 'grade' ||
              cleanKey === 'khoi' ||
              cleanKey === 'khoi lop'
            ) {
              const num = parseInt(val.replace(/\D/g, ''));
              if (num >= 6 && num <= 9) grade = num;
            }
          }

          if (!className && (row['Tên chi đội'] || row['Tên lớp'] || row['Chi đội'] || row['Lớp'])) {
            className = String(row['Tên chi đội'] || row['Tên lớp'] || row['Chi đội'] || row['Lớp']).trim();
          }

          if (!className) {
            const values = Object.values(row).map(v => String(v).trim()).filter(Boolean);
            if (values.length > 0 && /^[6-9][A-Za-z0-9\/\-_]+$/.test(values[0])) {
              className = values[0];
              if (values.length > 1 && !teacher) teacher = values[1];
            }
          }

          if (className) {
            if (!grade) {
              const matchGrade = className.match(/[6-9]/);
              if (matchGrade) {
                grade = parseInt(matchGrade[0]);
              } else {
                grade = 6;
              }
            }

            const isExisting = classes.some(
              c => c.name.toLowerCase().trim() === className.toLowerCase().trim()
            );

            const alreadyInParsed = parsed.some(
              p => p.name.toLowerCase().trim() === className.toLowerCase().trim()
            );

            if (!alreadyInParsed) {
              parsed.push({
                name: className,
                teacher: teacher || 'Chưa phân công',
                grade,
                isExisting
              });
            }
          }
        });

        if (parsed.length === 0) {
          setExcelError('Không tìm thấy thông tin chi đội hợp lệ trong file. Vui lòng kiểm tra lại cột Tên chi đội và GVCN theo mẫu.');
          return;
        }

        setExcelParsedClasses(parsed);
      } catch (err: any) {
        console.error(err);
        setExcelError('Lỗi đọc file Excel: ' + (err?.message || 'Định dạng file không được hỗ trợ.'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmExcelImport = () => {
    if (excelParsedClasses.length === 0) return;

    let updatedClasses = [...classes];
    let updatedAccounts = [...accounts];
    let addedCount = 0;
    let updatedCount = 0;

    excelParsedClasses.forEach(item => {
      const existingIdx = updatedClasses.findIndex(
        c => c.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );

      let targetClassId = '';

      if (existingIdx >= 0) {
        targetClassId = updatedClasses[existingIdx].id;
        if (excelImportMode === 'update') {
          updatedClasses[existingIdx] = {
            ...updatedClasses[existingIdx],
            teacher: item.teacher,
            grade: item.grade
          };
          updatedCount++;
        }
      } else {
        const newId = Math.random().toString(36).substr(2, 9);
        targetClassId = newId;
        const newCls: ClassInfo = {
          id: newId,
          name: item.name,
          teacher: item.teacher,
          grade: item.grade
        };
        updatedClasses.push(newCls);
        addedCount++;
      }

      if (excelCreateAccounts && targetClassId) {
        const username = `gvcn_${item.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const existingAccIdx = updatedAccounts.findIndex(a => a.username === username || a.classId === targetClassId);
        if (existingAccIdx >= 0) {
          if (excelImportMode === 'update') {
            updatedAccounts[existingAccIdx] = {
              ...updatedAccounts[existingAccIdx],
              displayName: item.teacher,
              classId: targetClassId
            };
          }
        } else {
          updatedAccounts.push({
            id: Math.random().toString(36).substr(2, 9),
            username,
            password: '123',
            role: 'TEACHER',
            displayName: item.teacher,
            classId: targetClassId
          });
        }
      }
    });

    setClasses(updatedClasses);
    localStorage.setItem('liendoi_classes', JSON.stringify(updatedClasses));

    if (excelCreateAccounts) {
      setAccounts(updatedAccounts);
      localStorage.setItem('liendoi_accounts', JSON.stringify(updatedAccounts));
    }

    alert(`Thành công! Đã thêm mới ${addedCount} chi đội, cập nhật ${updatedCount} chi đội.${excelCreateAccounts ? ' Đã tự động tạo/đồng bộ tài khoản GVCN (Mật khẩu mặc định: 123).' : ''}`);
    setIsExcelModalOpen(false);
    setExcelParsedClasses([]);
    setExcelFile(null);
  };

  const renderClasses = () => (
    <div className="space-y-6">
      <Card 
        title="Quản lý Chi đội" 
        subtitle="Danh sách và thông tin các lớp trong liên đội (Thêm mới, sửa, xóa chi đội và nhập từ file Excel)"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setExcelError(null);
                setExcelParsedClasses([]);
                setExcelFile(null);
                setIsExcelModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
              title="Thêm danh sách chi đội từ file Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Thêm từ Excel</span>
            </button>
            <button 
              onClick={() => {
                if (isAddingClass) {
                  setIsAddingClass(false);
                  setEditingClassId(null);
                  setNewClassForm({ name: '', teacher: '', grade: 6 });
                } else {
                  setIsAddingClass(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {isAddingClass ? 'Hủy bỏ' : (
                <>
                  <Plus size={16} />
                  Thêm chi đội
                </>
              )}
            </button>
          </div>
        }
      >
        <AnimatePresence>
          {isAddingClass && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8 border-b border-slate-100 pb-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Tên Chi đội</label>
                  <input 
                    type="text" 
                    placeholder="VD: 6A1"
                    value={newClassForm.name}
                    onChange={(e) => setNewClassForm({...newClassForm, name: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Giáo viên chủ nhiệm</label>
                  <input 
                    type="text" 
                    placeholder="Nhập tên GV..."
                    value={newClassForm.teacher}
                    onChange={(e) => setNewClassForm({...newClassForm, teacher: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Khối</label>
                    <select 
                      value={newClassForm.grade}
                      onChange={(e) => setNewClassForm({...newClassForm, grade: parseInt(e.target.value)})}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                    >
                      {[6,7,8,9].map(g => <option key={g} value={g}>Khối {g}</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={handleSaveClass}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700"
                  >
                    {editingClassId ? 'Cập nhật' : 'Lưu'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(cls => (
          <div key={cls.id} className="p-4 border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all bg-slate-50/50 group relative">
            <div className="flex justify-between items-start mb-3">
              <div className="w-12 h-12 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm">
                {cls.name}
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => handleEditClass(cls)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white hover:bg-blue-50 hover:text-blue-600 rounded-lg border border-slate-200 transition-colors shadow-2xs"
                  title="Sửa thông tin chi đội"
                >
                  <Pencil size={12} />
                  <span>Sửa</span>
                </button>
                <button 
                  onClick={() => handleRequestDeleteClass(cls)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-lg border border-rose-200 transition-colors shadow-2xs cursor-pointer"
                  title="Xóa chi đội này"
                >
                  <Trash2 size={12} />
                  <span>Xóa chi đội</span>
                </button>
              </div>
            </div>
            <h4 className="font-bold text-slate-900">Chi đội {cls.name}</h4>
            <p className="text-xs text-slate-500 mt-1">GVCN: {cls.teacher}</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Khối {cls.grade}</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setDailyForm(prev => ({ ...prev, classId: cls.id }));
                    setActiveTab('daily');
                  }}
                  className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline"
                >
                  Chấm điểm ngày <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>

    {/* Modal Thêm chi đội từ Excel */}
    <AnimatePresence>
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Thêm Chi đội từ file Excel</h3>
                  <p className="text-xs text-slate-500">Hỗ trợ định dạng .xlsx, .xls, .csv</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsExcelModalOpen(false);
                  setExcelParsedClasses([]);
                  setExcelFile(null);
                  setExcelError(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Guidelines & Download Template */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 text-xs text-emerald-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    Cấu trúc file Excel cần các cột sau:
                  </p>
                  <p className="text-emerald-800 pl-5">
                    • <b>Tên chi đội</b> (VD: 6A1, 7A2, 8A3...)<br />
                    • <b>Giáo viên chủ nhiệm</b> (VD: Thầy Nguyễn Văn A...)<br />
                    • <b>Khối</b> (VD: 6, 7, 8, 9 - tự động nhận biết nếu để trống)
                  </p>
                </div>
                <button
                  onClick={handleDownloadExcelTemplate}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 shadow-2xs transition-colors shrink-0 self-start sm:self-center"
                >
                  <Download size={14} />
                  <span>Tải file mẫu Excel</span>
                </button>
              </div>

              {/* Upload or Drop area */}
              <input
                ref={excelFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleProcessExcelFile(file);
                  }
                  e.target.value = '';
                }}
              />

              {excelParsedClasses.length === 0 ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      handleProcessExcelFile(file);
                    }
                  }}
                  onClick={() => excelFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Upload size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Nhấn vào đây để tải file lên hoặc kéo thả file Excel vào khung
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Chấp nhận tập tin Microsoft Excel (.xlsx, .xls) hoặc CSV
                    </p>
                  </div>
                  {excelError && (
                    <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                      <AlertCircle size={16} />
                      <span>{excelError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File name & summary tags */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={16} className="text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800 truncate max-w-xs">{excelFile?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                        Tổng: {excelParsedClasses.length} lớp
                      </span>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                        Mới: {excelParsedClasses.filter(c => !c.isExisting).length}
                      </span>
                      {excelParsedClasses.filter(c => c.isExisting).length > 0 && (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                          Đã có: {excelParsedClasses.filter(c => c.isExisting).length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Import Settings */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                    {excelParsedClasses.some(c => c.isExisting) && (
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-700">Chi đội đã có:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={excelImportMode === 'update'}
                            onChange={() => setExcelImportMode('update')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Cập nhật GVCN</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="importMode"
                            checked={excelImportMode === 'skip'}
                            onChange={() => setExcelImportMode('skip')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Bỏ qua</span>
                        </label>
                      </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={excelCreateAccounts}
                        onChange={(e) => setExcelCreateAccounts(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Tự động cấp tài khoản GVCN cho các lớp mới (Tên đăng nhập: <b>gvcn_[tên lớp]</b>, Mật khẩu: <b>123</b>)</span>
                    </label>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">STT</th>
                          <th className="py-2.5 px-3">Tên Chi đội</th>
                          <th className="py-2.5 px-3">Khối</th>
                          <th className="py-2.5 px-3">Giáo viên chủ nhiệm</th>
                          <th className="py-2.5 px-3 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {excelParsedClasses.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-400 font-semibold">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{item.name}</td>
                            <td className="py-2 px-3 text-slate-600 font-semibold">Khối {item.grade}</td>
                            <td className="py-2 px-3 text-slate-700">{item.teacher}</td>
                            <td className="py-2 px-3 text-right">
                              {item.isExisting ? (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold">
                                  Đã tồn tại
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                                  Mới
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
              {excelParsedClasses.length > 0 ? (
                <>
                  <button
                    onClick={() => {
                      setExcelParsedClasses([]);
                      setExcelFile(null);
                      setExcelError(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Chọn file khác
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsExcelModalOpen(false);
                        setExcelParsedClasses([]);
                        setExcelFile(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleConfirmExcelImport}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={15} />
                      <span>Xác nhận thêm vào hệ thống</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    onClick={() => setIsExcelModalOpen(false)}
                    className="px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Modal Xác nhận Xóa Chi đội */}
    <AnimatePresence>
      {deletingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shadow-xs">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Xác nhận Xóa Chi đội</h3>
                  <p className="text-xs text-rose-600 font-medium">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingClass(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                Bạn có chắc chắn muốn xóa <b className="text-slate-900">Chi đội {deletingClass.name}</b> khỏi hệ thống thi đua?
              </p>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tên chi đội:</span>
                  <span className="font-bold text-slate-900">Chi đội {deletingClass.name} (Khối {deletingClass.grade})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Giáo viên chủ nhiệm:</span>
                  <span className="font-bold text-slate-800">{deletingClass.teacher}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>Chi đội này sẽ bị gỡ khỏi danh sách các lớp trong liên đội.</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingClass(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClass}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Xác nhận xóa chi đội</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </div>
);

  const [dailyForm, setDailyForm] = useState<Partial<DailyPoints>>({
    classId: '',
    date: new Date().toISOString().split('T')[0],
    week: 1,
    month: 9,
    attendance: { late: 0, absentWithPermission: 0, absentWithoutPermission: 0, skippedClass: 0 },
    selfManagement: { 
      quick: true, full: true, orderly: true, lightsOff: true, 
      individualViolations: 0, 
      groupViolations: { quick: false, full: false, orderly: false, lightsOff: false },
      notes: ''
    },
    manners: { 
      uniform: true, tuckedIn: true, shoes: true, hair: true, 
      individualViolations: 0, 
      groupViolations: { uniform: false, tuckedIn: false, shoes: false, hair: false },
      notes: ''
    },
    hygiene: { cleanClass: true, orderlyFurniture: true, cleanCorridor: true, tablecloth: true, eraser: true, litteringCount: 0 },
    discipline: { fighting: 0, swearing: 0, vandalism: 0, cyclingInYard: 0, trafficViolation: 0, notes: '' },
  });

  const handleEditDaily = (item: DailyPoints) => {
    if (currentUser?.role === 'TEACHER') {
      alert('Giáo viên chủ nhiệm chỉ có quyền xem thi đua ngày!');
      return;
    }
    setDailyForm({
      classId: item.classId,
      date: item.date,
      week: item.week,
      month: item.month,
      attendance: { ...item.attendance },
      selfManagement: { 
        ...item.selfManagement,
        groupViolations: { ...(item.selfManagement?.groupViolations || { quick: false, full: false, orderly: false, lightsOff: false }) },
        notes: item.selfManagement?.notes || ''
      },
      manners: { 
        ...item.manners,
        groupViolations: { ...(item.manners?.groupViolations || { uniform: false, tuckedIn: false, shoes: false, hair: false }) },
        notes: item.manners?.notes || ''
      },
      hygiene: { ...item.hygiene },
      discipline: { 
        ...item.discipline,
        notes: item.discipline?.notes || ''
      },
    });
    setEditingDailyId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditDaily = () => {
    setEditingDailyId(null);
    setDailyForm({
      classId: currentUser?.role === 'TEACHER' ? (currentUser.classId || '') : '',
      date: new Date().toISOString().split('T')[0],
      week: dailyForm.week || 1,
      month: dailyForm.month || 9,
      attendance: { late: 0, absentWithPermission: 0, absentWithoutPermission: 0, skippedClass: 0 },
      selfManagement: { 
        quick: true, full: true, orderly: true, lightsOff: true, 
        individualViolations: 0, 
        groupViolations: { quick: false, full: false, orderly: false, lightsOff: false },
        notes: ''
      },
      manners: { 
        uniform: true, tuckedIn: true, shoes: true, hair: true, 
        individualViolations: 0, 
        groupViolations: { uniform: false, tuckedIn: false, shoes: false, hair: false },
        notes: ''
      },
      hygiene: { cleanClass: true, orderlyFurniture: true, cleanCorridor: true, tablecloth: true, eraser: true, litteringCount: 0 },
      discipline: { fighting: 0, swearing: 0, vandalism: 0, cyclingInYard: 0, trafficViolation: 0, notes: '' },
    });
  };

  const handleSaveDaily = () => {
    if (currentUser?.role === 'TEACHER') {
      alert('Giáo viên chủ nhiệm chỉ có quyền xem thi đua ngày!');
      return;
    }
    if (!dailyForm.classId) {
      alert('Vui lòng chọn chi đội!');
      return;
    }

    if (editingDailyId) {
      const updated = dailyData.map(d => d.id === editingDailyId ? ({ ...dailyForm, id: editingDailyId } as DailyPoints) : d);
      setDailyData(updated);
      localStorage.setItem('liendoi_daily', JSON.stringify(updated));
      alert('Đã cập nhật điểm thi đua ngày thành công!');
      handleCancelEditDaily();
    } else {
      const newDaily = [...dailyData, { ...dailyForm, id: Math.random().toString(36).substr(2, 9) } as DailyPoints];
      setDailyData(newDaily);
      localStorage.setItem('liendoi_daily', JSON.stringify(newDaily));
      alert('Đã lưu điểm ngày thành công!');
      handleCancelEditDaily();
    }
  };

  const handleRequestDeleteDaily = (item: DailyPoints) => {
    if (currentUser?.role === 'TEACHER') {
      showToast('Giáo viên chủ nhiệm không có quyền xóa dữ liệu thi đua!', 'error');
      return;
    }
    setDeletingDailyRecord(item);
  };

  const handleConfirmDeleteDaily = () => {
    if (!deletingDailyRecord) return;
    const item = deletingDailyRecord;
    const updated = dailyData.filter(d => d.id !== item.id);
    setDailyData(updated);
    localStorage.setItem('liendoi_daily', JSON.stringify(updated));
    if (editingDailyId === item.id) {
      handleCancelEditDaily();
    }
    showToast('Đã xóa bản ghi điểm ngày thành công!', 'success');
    setDeletingDailyRecord(null);
  };

  const filteredDailyList = dailyData.filter(item => {
    if (dailyClassFilter === 'all') return true;
    return item.classId === dailyClassFilter;
  });

  const renderDaily = () => {
    const teacherClass = classes.find(c => c.id === currentUser?.classId);
    const teacherDailyRecords = dailyData.filter(d => d.classId === currentUser?.classId);
    const totalLateCount = teacherDailyRecords.reduce((acc, curr) => acc + (curr.attendance?.late || 0), 0);
    const totalMannersCount = teacherDailyRecords.reduce((acc, curr) => acc + (curr.manners?.individualViolations || 0), 0);
    const totalSMCount = teacherDailyRecords.reduce((acc, curr) => acc + (curr.selfManagement?.individualViolations || 0), 0);
    const totalRecordsWithNotes = teacherDailyRecords.filter(d => d.selfManagement?.notes || d.manners?.notes || d.discipline?.notes).length;

    return (
      <div className="space-y-6">
        {/* Teacher Role Info Banner & Stats */}
        {currentUser?.role === 'TEACHER' && (
          <div className="space-y-4">
            <div className="p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-200 shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-blue-900 uppercase">
                      THEO DÕI THI ĐUA HÀNG NGÀY - CHI ĐỘI {teacherClass?.name || ''}
                    </h3>
                    <span className="px-2.5 py-0.5 bg-blue-200 text-blue-800 rounded-full text-[10px] font-bold">
                      Chỉ xem
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Cơ chế phân quyền GVCN: Chỉ có chức năng xem thi đua ngày và xem tổng kết tuần (không có quyền nhập hoặc sửa điểm).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3.5 py-1.5 bg-white text-blue-800 rounded-xl text-xs font-bold border border-blue-200 shadow-2xs">
                  👨‍🏫 {currentUser.displayName}
                </span>
              </div>
            </div>

            {/* Quick Stat Cards for Teacher Class */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-2xs">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Số ngày đã chấm</p>
                <p className="text-2xl font-black text-slate-900">{teacherDailyRecords.length} <span className="text-xs font-normal text-slate-400">bản ghi</span></p>
                <p className="text-[10px] text-blue-600 font-semibold mt-1">Từ đội Sao đỏ</p>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-2xs">
                <p className="text-[10px] font-bold uppercase text-rose-500 mb-1">Lượt đi học trễ</p>
                <p className="text-2xl font-black text-rose-600">{totalLateCount} <span className="text-xs font-normal text-slate-400">lượt</span></p>
                <p className="text-[10px] text-slate-400 mt-1">Trừ 1đ / lượt</p>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-2xs">
                <p className="text-[10px] font-bold uppercase text-amber-500 mb-1">Vi phạm Tác phong & Tự quản</p>
                <p className="text-2xl font-black text-amber-600">{totalMannersCount + totalSMCount} <span className="text-xs font-normal text-slate-400">lượt</span></p>
                <p className="text-[10px] text-slate-400 mt-1">Khăn quàng, đồng phục...</p>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-2xs">
                <p className="text-[10px] font-bold uppercase text-indigo-500 mb-1">Ngày có ghi chú vi phạm</p>
                <p className="text-2xl font-black text-indigo-600">{totalRecordsWithNotes} <span className="text-xs font-normal text-slate-400">ngày</span></p>
                <p className="text-[10px] text-slate-400 mt-1">Xem chi tiết biên bản</p>
              </div>
            </div>
          </div>
        )}

        {/* Input / Editing Form - Only visible for ADMIN and SAO_DO */}
        {currentUser?.role !== 'TEACHER' && (
          <>
            {/* Editing State Banner */}
            {editingDailyId && (
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Pencil size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      Đang chỉnh sửa điểm thi đua ngày {new Date(dailyForm.date || '').toLocaleDateString('vi-VN')}
                    </h4>
                    <p className="text-xs text-amber-700">
                      Chi đội: <b className="text-amber-900">{classes.find(c => c.id === dailyForm.classId)?.name}</b> - Cập nhật số liệu, vi phạm hoặc ghi chú rồi nhấn <b>&quot;Cập nhật điểm ngày&quot;</b>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelEditDaily}
                  className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1 shrink-0"
                >
                  <X size={14} /> Hủy sửa
                </button>
              </div>
            )}

            <Card 
              title={editingDailyId ? "Chỉnh sửa điểm thi đua Hàng ngày" : "Nhập điểm thi đua Hàng ngày"} 
              subtitle="Ghi nhận chi tiết vi phạm, nề nếp và các ghi chú cụ thể trong ngày"
            >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Chọn Chi đội</label>
            <select 
              value={dailyForm.classId}
              onChange={(e) => setDailyForm({...dailyForm, classId: e.target.value})}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ngày</label>
            <input 
              type="date"
              value={dailyForm.date}
              onChange={(e) => setDailyForm({...dailyForm, date: e.target.value})}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tuần</label>
            <select 
              value={dailyForm.week}
              onChange={(e) => setDailyForm({...dailyForm, week: parseInt(e.target.value)})}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
            >
              {[1,2,3,4,5].map(w => <option key={w} value={w}>Tuần {w}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tháng</label>
            <select 
              value={dailyForm.month}
              onChange={(e) => setDailyForm({...dailyForm, month: parseInt(e.target.value)})}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
            >
              {[9,10,11,12,1,2,3,4,5].map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-12">
          {/* 1. Chuyên cần */}
          <section>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">1. Chuyên cần (Trừ điểm)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Đi học trễ (-1đ)', key: 'late' },
                { label: 'Vắng có phép (-1đ)', key: 'absentWithPermission' },
                { label: 'Vắng ko phép (-3đ)', key: 'absentWithoutPermission' },
                { label: 'Trốn tiết (-3đ)', key: 'skippedClass' },
              ].map(f => (
                <div key={f.key} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <label className="block text-[10px] font-bold text-slate-500 mb-2">{f.label}</label>
                  <input 
                    type="number" min="0"
                    value={(dailyForm.attendance as any)?.[f.key] ?? 0}
                    onChange={(e) => setDailyForm({...dailyForm, attendance: {...dailyForm.attendance!, [f.key]: parseInt(e.target.value) || 0}})}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-blue-600"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* 2. Tự quản */}
          <section>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">2. Tự quản (30đ)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                {[
                  { label: 'Nhanh chóng (10đ)', key: 'quick' },
                  { label: 'Đầy đủ (5đ)', key: 'full' },
                  { label: 'Giữ trật tự (10đ)', key: 'orderly' },
                  { label: 'Tắt đèn quạt (5đ)', key: 'lightsOff' },
                ].map(f => (
                  <div key={f.key} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-xs font-medium text-slate-700">{f.label}</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-[10px] text-rose-500 font-bold cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={(dailyForm.selfManagement?.groupViolations as any)?.[f.key] ?? false}
                          onChange={(e) => setDailyForm({
                            ...dailyForm, 
                            selfManagement: {
                              ...dailyForm.selfManagement!, 
                              groupViolations: {...(dailyForm.selfManagement?.groupViolations || { quick: false, full: false, orderly: false, lightsOff: false }), [f.key]: e.target.checked}
                            }
                          })}
                        /> VP Tập thể
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-6">
                <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                  <label className="block text-xs font-bold text-amber-700 mb-3">Số lượt vi phạm cá nhân (-1đ/lần)</label>
                  <input 
                    type="number" min="0"
                    value={dailyForm.selfManagement?.individualViolations ?? 0}
                    onChange={(e) => setDailyForm({...dailyForm, selfManagement: {...dailyForm.selfManagement!, individualViolations: parseInt(e.target.value) || 0}})}
                    className="w-full p-3 bg-white border border-amber-200 rounded-xl text-lg font-bold text-amber-600 outline-none mb-4"
                  />
                  <label className="block text-[10px] font-bold text-amber-600 mb-2 uppercase">Ghi chú vi phạm Tự quản</label>
                  <textarea 
                    value={dailyForm.selfManagement?.notes || ''}
                    onChange={(e) => setDailyForm({...dailyForm, selfManagement: {...dailyForm.selfManagement!, notes: e.target.value}})}
                    className="w-full p-3 bg-white border border-amber-200 rounded-xl text-xs outline-none focus:border-amber-400"
                    placeholder="VD: 1 học sinh nói chuyện trong giờ sinh hoạt 15 phút, chưa tắt quạt..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 3. Tác phong */}
          <section>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">3. Tác phong (25đ)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                {[
                  { label: 'Đồng phục, khăn quàng (10đ)', key: 'uniform' },
                  { label: 'Áo cho trong quần (5đ)', key: 'tuckedIn' },
                  { label: 'Giày, dép quai hậu (5đ)', key: 'shoes' },
                  { label: 'Đầu tóc, trang sức (5đ)', key: 'hair' },
                ].map(f => (
                  <div key={f.key} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-xs font-medium text-slate-700">{f.label}</span>
                    <label className="flex items-center gap-1.5 text-[10px] text-rose-500 font-bold cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={(dailyForm.manners?.groupViolations as any)?.[f.key] ?? false}
                        onChange={(e) => setDailyForm({
                          ...dailyForm, 
                          manners: {
                            ...dailyForm.manners!, 
                            groupViolations: {...(dailyForm.manners?.groupViolations || { uniform: false, tuckedIn: false, shoes: false, hair: false }), [f.key]: e.target.checked}
                          }
                        })}
                      /> VP Tập thể
                    </label>
                  </div>
                ))}
              </div>
              <div className="space-y-6">
                <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                  <label className="block text-xs font-bold text-indigo-700 mb-3">Số lượt vi phạm cá nhân (-1đ/lần)</label>
                  <input 
                    type="number" min="0"
                    value={dailyForm.manners?.individualViolations ?? 0}
                    onChange={(e) => setDailyForm({...dailyForm, manners: {...dailyForm.manners!, individualViolations: parseInt(e.target.value) || 0}})}
                    className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-lg font-bold text-indigo-600 outline-none mb-4"
                  />
                  <label className="block text-[10px] font-bold text-indigo-600 mb-2 uppercase">Ghi chú vi phạm Tác phong</label>
                  <textarea 
                    value={dailyForm.manners?.notes || ''}
                    onChange={(e) => setDailyForm({...dailyForm, manners: {...dailyForm.manners!, notes: e.target.value}})}
                    className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs outline-none focus:border-indigo-400"
                    placeholder="VD: 2 học sinh quên đeo khăn quàng, 1 học sinh đi dép lê..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 4. Vệ sinh */}
          <section>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">4. Vệ sinh (20đ)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Lớp sạch sàn, bảng (8đ)', key: 'cleanClass' },
                  { label: 'Bàn ghế ngay ngắn (3đ)', key: 'orderlyFurniture' },
                  { label: 'Hành lang sạch (3đ)', key: 'cleanCorridor' },
                  { label: 'Khăn bàn (3đ)', key: 'tablecloth' },
                  { label: 'Đồ lau bảng (3đ)', key: 'eraser' },
                ].map(f => (
                  <button 
                    key={f.key}
                    onClick={() => setDailyForm({...dailyForm, hygiene: {...dailyForm.hygiene!, [f.key]: !(dailyForm.hygiene as any)[f.key]}})}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all ${
                      (dailyForm.hygiene as any)?.[f.key] 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}
                  >
                    {(dailyForm.hygiene as any)?.[f.key] ? '✓' : '✗'} {f.label}
                  </button>
                ))}
              </div>
              <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                <label className="block text-xs font-bold text-emerald-700 mb-3">Số vị trí có rác (-1đ/lỗi)</label>
                <input 
                  type="number" min="0"
                  value={dailyForm.hygiene?.litteringCount ?? 0}
                  onChange={(e) => setDailyForm({...dailyForm, hygiene: {...dailyForm.hygiene!, litteringCount: parseInt(e.target.value) || 0}})}
                  className="w-full p-3 bg-white border border-emerald-200 rounded-xl text-lg font-bold text-emerald-600 outline-none"
                />
              </div>
            </div>
          </section>

          {/* 5. Kỷ luật */}
          <section>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">5. Kỷ luật (25đ) - Trừ điểm vi phạm</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Đánh nhau (-10đ)', key: 'fighting' },
                  { label: 'Chửi thề (-3đ)', key: 'swearing' },
                  { label: 'Phá hoại (-10đ)', key: 'vandalism' },
                  { label: 'Chạy xe sân (-3đ)', key: 'cyclingInYard' },
                  { label: 'Luật GT (-10đ)', key: 'trafficViolation' },
                ].map(f => (
                  <div key={f.key} className="bg-rose-50/30 p-4 rounded-xl border border-rose-100/50">
                    <label className="block text-[10px] font-bold text-rose-500 mb-2 uppercase">{f.label}</label>
                    <input 
                      type="number" min="0"
                      value={(dailyForm.discipline as any)?.[f.key] ?? 0}
                      onChange={(e) => setDailyForm({...dailyForm, discipline: {...dailyForm.discipline!, [f.key]: parseInt(e.target.value) || 0}})}
                      className="w-full p-2 bg-white border border-rose-200 rounded-lg text-sm font-bold text-rose-600"
                    />
                  </div>
                ))}
              </div>
              <div className="bg-rose-50/30 p-6 rounded-2xl border border-rose-100/50">
                <label className="block text-[10px] font-bold text-rose-500 mb-2 uppercase">Ghi chú vi phạm Kỷ luật</label>
                <textarea 
                  value={dailyForm.discipline?.notes || ''}
                  onChange={(e) => setDailyForm({...dailyForm, discipline: {...dailyForm.discipline!, notes: e.target.value}})}
                  className="w-full p-3 bg-white border border-rose-200 rounded-xl text-xs outline-none focus:border-rose-400"
                  placeholder="VD: Học sinh nói tục trong giờ chơi tại cầu thang, chạy xe đạp trong sân trường..."
                  rows={4}
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-8 border-t border-slate-100">
            {editingDailyId && (
              <button 
                onClick={handleCancelEditDaily}
                className="px-8 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm"
              >
                HỦY CHỈNH SỬA
              </button>
            )}
            <button 
              onClick={handleSaveDaily}
              className={`px-12 py-4 text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-sm ${
                editingDailyId 
                  ? 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700' 
                  : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'
              }`}
            >
              {editingDailyId ? 'CẬP NHẬT ĐIỂM NGÀY' : 'LƯU ĐIỂM NGÀY'}
            </button>
          </div>
        </div>
      </Card>
    </>
  )}
      
      {/* Daily Records History Table */}
      <Card 
        title="Lịch sử chấm điểm ngày" 
        subtitle="Danh sách các vi phạm và ghi chú đã ghi nhận"
        action={
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={dailyClassFilter}
              onChange={(e) => setDailyClassFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none font-medium"
            >
              <option value="all">Tất cả chi đội ({dailyData.length})</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  Chi đội {c.name} {currentUser?.role === 'TEACHER' && currentUser.classId === c.id ? '(Của tôi)' : ''}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-400 border-b border-slate-100">
                <th className="pb-3 px-2">Ngày</th>
                <th className="pb-3 px-2">Chi đội</th>
                <th className="pb-3 px-2">Tuần/Tháng</th>
                <th className="pb-3 px-2">Vi phạm nề nếp</th>
                <th className="pb-3 px-2">Ghi chú vi phạm</th>
                <th className="pb-3 px-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDailyList.slice().reverse().map(item => {
                const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'SAO_DO';
                
                return (
                  <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-2 text-sm font-medium text-slate-900 whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold whitespace-nowrap">
                        {classes.find(c => c.id === item.classId)?.name || item.classId}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs text-slate-500 whitespace-nowrap">
                      Tuần {item.week} - Th.{item.month}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {item.attendance?.late > 0 && <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-medium">Trễ: {item.attendance.late}</span>}
                        {item.attendance?.absentWithoutPermission > 0 && <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-medium">Vắng KP: {item.attendance.absentWithoutPermission}</span>}
                        {item.hygiene?.litteringCount > 0 && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">Rác: {item.hygiene.litteringCount}</span>}
                        {Object.values(item.selfManagement?.groupViolations || {}).some(v => v) && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">VP T.Thể TQ</span>}
                        {Object.values(item.manners?.groupViolations || {}).some(v => v) && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">VP T.Thể TP</span>}
                        {(item.discipline?.fighting > 0 || item.discipline?.swearing > 0) && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">Kỷ luật</span>}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="space-y-1 max-w-xs text-xs">
                        {item.selfManagement?.notes && (
                          <div className="text-[11px] text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60 truncate" title={item.selfManagement.notes}>
                            <span className="font-bold">TQ:</span> {item.selfManagement.notes}
                          </div>
                        )}
                        {item.manners?.notes && (
                          <div className="text-[11px] text-indigo-800 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-200/60 truncate" title={item.manners.notes}>
                            <span className="font-bold">TP:</span> {item.manners.notes}
                          </div>
                        )}
                        {item.discipline?.notes && (
                          <div className="text-[11px] text-rose-800 bg-rose-50/80 px-2 py-0.5 rounded border border-rose-200/60 truncate" title={item.discipline.notes}>
                            <span className="font-bold">KL:</span> {item.discipline.notes}
                          </div>
                        )}
                        {!item.selfManagement?.notes && !item.manners?.notes && !item.discipline?.notes && (
                          <span className="text-slate-400 text-[10px] italic">Không có ghi chú</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => setViewingDailyDetail(item)}
                          className="flex items-center gap-1 px-2.5 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md text-xs font-bold transition-colors"
                          title="Xem chi tiết toàn bộ vi phạm và ghi chú"
                        >
                          <Eye size={12} />
                          <span>Xem chi tiết</span>
                        </button>
                        {canEdit && (
                          <>
                            <button 
                              onClick={() => handleEditDaily(item)}
                              className="flex items-center gap-1 px-2 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md text-xs font-semibold transition-colors"
                              title="Chỉnh sửa bản ghi này"
                            >
                              <Pencil size={12} />
                              <span>Sửa</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleRequestDeleteDaily(item)}
                              className="flex items-center gap-1 px-2 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md text-xs font-semibold transition-colors"
                              title="Xóa bản ghi này"
                            >
                              <Trash2 size={12} />
                              <span>Xóa</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDailyList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400 italic">
                    Chưa có dữ liệu thi đua ngày phù hợp bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail View Modal */}
      {viewingDailyDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Chi tiết Thi đua Ngày {new Date(viewingDailyDetail.date).toLocaleDateString('vi-VN')}
                </h3>
                <p className="text-xs text-slate-500">
                  Chi đội: <b className="text-blue-600">{classes.find(c => c.id === viewingDailyDetail.classId)?.name}</b> - Tuần {viewingDailyDetail.week} (Tháng {viewingDailyDetail.month})
                </p>
              </div>
              <button 
                onClick={() => setViewingDailyDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              {/* Chuyên cần */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-blue-700 text-xs uppercase mb-2">1. Chuyên cần</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>Đi trễ: <b>{viewingDailyDetail.attendance?.late || 0}</b></div>
                  <div>Vắng có phép: <b>{viewingDailyDetail.attendance?.absentWithPermission || 0}</b></div>
                  <div>Vắng không phép: <b>{viewingDailyDetail.attendance?.absentWithoutPermission || 0}</b></div>
                  <div>Trốn tiết: <b>{viewingDailyDetail.attendance?.skippedClass || 0}</b></div>
                </div>
              </div>

              {/* Tự quản */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <h4 className="font-bold text-amber-900 text-xs uppercase mb-2">2. Tự quản (30đ)</h4>
                <div className="text-xs space-y-2">
                  <p>Số lượt vi phạm cá nhân: <b>{viewingDailyDetail.selfManagement?.individualViolations || 0} lần</b></p>
                  {Object.values(viewingDailyDetail.selfManagement?.groupViolations || {}).some(v => v) && (
                    <p className="text-rose-600 font-bold">Có vi phạm tập thể</p>
                  )}
                  <div className="pt-2 border-t border-amber-200">
                    <span className="font-bold text-amber-900">Ghi chú vi phạm Tự quản:</span>
                    <p className="mt-1 text-slate-700 bg-white p-2.5 rounded-xl border border-amber-100 whitespace-pre-wrap">
                      {viewingDailyDetail.selfManagement?.notes || 'Không có ghi chú vi phạm.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tác phong */}
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <h4 className="font-bold text-indigo-900 text-xs uppercase mb-2">3. Tác phong (25đ)</h4>
                <div className="text-xs space-y-2">
                  <p>Số lượt vi phạm cá nhân: <b>{viewingDailyDetail.manners?.individualViolations || 0} lần</b></p>
                  {Object.values(viewingDailyDetail.manners?.groupViolations || {}).some(v => v) && (
                    <p className="text-rose-600 font-bold">Có vi phạm tập thể</p>
                  )}
                  <div className="pt-2 border-t border-indigo-200">
                    <span className="font-bold text-indigo-900">Ghi chú vi phạm Tác phong:</span>
                    <p className="mt-1 text-slate-700 bg-white p-2.5 rounded-xl border border-indigo-100 whitespace-pre-wrap">
                      {viewingDailyDetail.manners?.notes || 'Không có ghi chú vi phạm.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vệ sinh */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <h4 className="font-bold text-emerald-900 text-xs uppercase mb-2">4. Vệ sinh (20đ)</h4>
                <p className="text-xs">Số vị trí có rác: <b>{viewingDailyDetail.hygiene?.litteringCount || 0}</b></p>
              </div>

              {/* Kỷ luật */}
              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                <h4 className="font-bold text-rose-900 text-xs uppercase mb-2">5. Kỷ luật (25đ)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-3">
                  <div>Đánh nhau: <b>{viewingDailyDetail.discipline?.fighting || 0}</b></div>
                  <div>Chửi thề: <b>{viewingDailyDetail.discipline?.swearing || 0}</b></div>
                  <div>Phá hoại: <b>{viewingDailyDetail.discipline?.vandalism || 0}</b></div>
                  <div>Chạy xe sân: <b>{viewingDailyDetail.discipline?.cyclingInYard || 0}</b></div>
                  <div>Luật GT: <b>{viewingDailyDetail.discipline?.trafficViolation || 0}</b></div>
                </div>
                <div className="pt-2 border-t border-rose-200 text-xs">
                  <span className="font-bold text-rose-900">Ghi chú vi phạm Kỷ luật:</span>
                  <p className="mt-1 text-slate-700 bg-white p-2.5 rounded-xl border border-rose-100 whitespace-pre-wrap">
                    {viewingDailyDetail.discipline?.notes || 'Không có ghi chú vi phạm.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setViewingDailyDetail(null)}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Đóng
              </button>
              {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SAO_DO') && (
                <button
                  onClick={() => {
                    const item = viewingDailyDetail;
                    setViewingDailyDetail(null);
                    handleEditDaily(item);
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <Pencil size={14} /> Chỉnh sửa bản ghi này
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa Điểm ngày */}
      <AnimatePresence>
        {deletingDailyRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shadow-xs">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Xác nhận Xóa Bản ghi</h3>
                    <p className="text-xs text-rose-600 font-medium">Xóa dữ liệu thi đua ngày này</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeletingDailyRecord(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  Bạn có chắc chắn muốn xóa bản ghi chấm điểm ngày của <b className="text-slate-900">Chi đội {classes.find(c => c.id === deletingDailyRecord.classId)?.name || deletingDailyRecord.classId}</b> vào ngày <b className="text-slate-900">{new Date(deletingDailyRecord.date).toLocaleDateString('vi-VN')}</b> (Tuần {deletingDailyRecord.week})?
                </p>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>Dữ liệu điểm thi đua của ngày này sẽ bị xóa khỏi hệ thống.</span>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingDailyRecord(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteDaily}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={15} />
                  <span>Xác nhận xóa bản ghi</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    );
  };

  const [scoringForm, setScoringForm] = useState<Partial<WeeklyPoints>>({
    classId: '',
    week: 1,
    month: 9,
    attendance: { late: 0, absentWithPermission: 0, absentWithoutPermission: 0, skippedClass: 0 },
    selfManagement: { 
      quick: true, full: true, orderly: true, lightsOff: true, 
      individualViolations: 0, 
      groupViolations: { quick: false, full: false, orderly: false, lightsOff: false },
      notes: ''
    },
    manners: { 
      uniform: true, tuckedIn: true, shoes: true, hair: true, 
      individualViolations: 0, 
      groupViolations: { uniform: false, tuckedIn: false, shoes: false, hair: false },
      notes: ''
    },
    hygiene: { cleanClass: true, orderlyFurniture: true, cleanCorridor: true, tablecloth: true, eraser: true, litteringCount: 0 },
    discipline: { fighting: 0, swearing: 0, vandalism: 0, cyclingInYard: 0, trafficViolation: 0, notes: '' },
    redStarBonus: 0,
    logbookPoints: 100
  });

  const handleSaveScoring = () => {
    if (!scoringForm.classId) {
      alert('Vui lòng chọn chi đội!');
      return;
    }
    
    if (lockedWeeks.includes(scoringForm.week as number)) {
      alert('Tuần này đã bị khóa, không thể lưu điểm mới!');
      return;
    }

    const newWeekly = [...weeklyData.filter(w => !(w.classId === scoringForm.classId && w.week === scoringForm.week)), scoringForm as WeeklyPoints];
    setWeeklyData(newWeekly);
    localStorage.setItem('liendoi_weekly', JSON.stringify(newWeekly));
    alert('Đã lưu điểm tuần thành công!');
    setActiveTab('dashboard');
  };

  const renderWeeklySummary = () => {
    const targetClasses = summaryGrade === 'all' ? classes : classes.filter(c => c.grade === summaryGrade);
    const weeklyRankings = targetClasses.map(cls => {
      const record = weeklyData.find(w => w.classId === cls.id && w.week === summaryWeek);
      const neNep = record ? calculateWeeklyNeNep(record) : 0;
      const logbook = record ? (record.logbookPoints || 0) : 0;
      const bonus = record ? (record.redStarBonus || 0) : 0;
      const total = neNep + logbook + bonus;
      return {
        ...cls,
        record,
        neNep,
        logbook,
        bonus,
        total,
        isLocked: lockedWeeks.includes(summaryWeek),
        rating: total >= 200 ? 'Xuất sắc' : total >= 185 ? 'Tốt' : total >= 170 ? 'Khá' : 'Trung bình'
      };
    }).sort((a, b) => b.total - a.total);

    const teacherClass = classes.find(c => c.id === currentUser?.classId);
    const teacherRankIndex = weeklyRankings.findIndex(r => r.id === currentUser?.classId);
    const teacherRecord = weeklyRankings.find(r => r.id === currentUser?.classId);
    const activeDetailClass = classes.find(c => c.id === (weeklyDetailClassId || currentUser?.classId || classes[0]?.id));
    const activeDetailRecord = weeklyData.find(w => w.classId === activeDetailClass?.id && w.week === summaryWeek);

    return (
      <div className="space-y-8">
        {/* Banner for GVCN or Admin */}
        {currentUser?.role === 'TEACHER' ? (
          <div className="p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-200 shrink-0">
                <Trophy size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-blue-900 uppercase">
                    BẢNG TỔNG KẾT & XẾP HẠNG THI ĐUA TUẦN {summaryWeek}
                  </h3>
                  <span className="px-2.5 py-0.5 bg-blue-200 text-blue-800 rounded-full text-[10px] font-bold">
                    Chỉ xem
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-0.5">
                  Phân quyền GVCN: Xem tổng hợp kết quả điểm Nề nếp hàng ngày, Sổ đầu bài, Phong trào và Xếp hạng tuần.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3.5 py-1.5 bg-white text-blue-800 rounded-xl text-xs font-bold border border-blue-200 shadow-2xs">
                Chi đội {teacherClass?.name || ''} • {currentUser?.displayName}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
                <Trophy size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Bảng Tổng kết Thi đua Tuần {summaryWeek}
                </h4>
                <p className="text-xs text-slate-500">
                  Xem bảng xếp hạng và chi tiết điểm tuần của tất cả các chi đội
                </p>
              </div>
            </div>
            <button
              onClick={() => setScoringViewMode('input')}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 self-start sm:self-center"
            >
              <Pencil size={14} /> Chuyển sang Nhập điểm Tuần
            </button>
          </div>
        )}

        {/* Teacher Class Spotlight Box */}
        {currentUser?.role === 'TEACHER' && teacherRecord && (
          <div className="bg-white border-2 border-blue-300 rounded-3xl p-6 shadow-md shadow-blue-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shrink-0 ${
                  teacherRankIndex === 0 ? 'bg-amber-400 text-white shadow-amber-200' :
                  teacherRankIndex === 1 ? 'bg-slate-300 text-white shadow-slate-200' :
                  teacherRankIndex === 2 ? 'bg-orange-300 text-white shadow-orange-200' :
                  'bg-blue-600 text-white shadow-blue-200'
                }`}>
                  {teacherRankIndex >= 0 ? `#${teacherRankIndex + 1}` : '-'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Chi đội của bạn</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                      {lockedWeeks.includes(summaryWeek) ? '🔒 Đã chốt sổ' : '🟢 Đang mở'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">
                    Chi đội {teacherClass?.name} - {teacherClass?.teacher}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Xếp hạng tuần {summaryWeek}: <b className="text-blue-600">Hạng {teacherRankIndex + 1}</b> trên tổng số {weeklyRankings.length} lớp {summaryGrade !== 'all' ? `(Khối ${summaryGrade})` : 'toàn trường'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Tổng điểm tuần {summaryWeek}</p>
                  <p className="text-3xl font-black text-blue-600 tracking-tight">{teacherRecord.total.toFixed(1)}</p>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    teacherRecord.rating === 'Xuất sắc' ? 'bg-emerald-100 text-emerald-700' :
                    teacherRecord.rating === 'Tốt' ? 'bg-blue-100 text-blue-700' :
                    teacherRecord.rating === 'Khá' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {teacherRecord.rating}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">A. Điểm Nề nếp</p>
                <p className="text-xl font-black text-slate-900">{teacherRecord.neNep.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 100đ</span></p>
                <p className="text-[10px] text-slate-500 mt-1 italic">Tổng hợp từ các ngày trong tuần</p>
              </div>
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-bold uppercase text-blue-500 mb-1">B. Sổ đầu bài</p>
                <p className="text-xl font-black text-blue-700">{teacherRecord.logbook.toFixed(1)} <span className="text-xs font-normal text-blue-400">/ 100đ</span></p>
                <p className="text-[10px] text-blue-600 mt-1 italic">Điểm trung bình các tiết học</p>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-bold uppercase text-emerald-500 mb-1">C. Phong trào & Thưởng</p>
                <p className="text-xl font-black text-emerald-700">+{teacherRecord.bonus} <span className="text-xs font-normal text-emerald-400">đ</span></p>
                <p className="text-[10px] text-emerald-600 mt-1 italic">Điểm cộng sao đỏ / phong trào</p>
              </div>
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-bold uppercase text-amber-600 mb-1">Xếp loại thi đua</p>
                <p className="text-xl font-black text-amber-800">{teacherRecord.rating}</p>
                <p className="text-[10px] text-amber-700 mt-1 italic">Danh hiệu thi đua tuần {summaryWeek}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Chọn Tuần:</span>
              <select
                value={summaryWeek}
                onChange={(e) => setSummaryWeek(parseInt(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(w => (
                  <option key={w} value={w}>
                    Tuần {w} {lockedWeeks.includes(w) ? '(Đã chốt sổ)' : '(Đang mở)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Lọc Khối:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['all', 6, 7, 8, 9] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setSummaryGrade(g)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      summaryGrade === g 
                        ? 'bg-white text-blue-600 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {g === 'all' ? 'Tất cả' : `Khối ${g}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrintReport(`Báo cáo Tổng kết Tuần ${summaryWeek}`)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Download size={14} /> In Báo cáo Tuần
            </button>
          </div>
        </div>

        {/* Full Weekly Ranking Table */}
        <Card 
          title={`Bảng Xếp hạng & Điểm Tổng kết Tuần ${summaryWeek}`}
          subtitle={`Toàn bộ ${weeklyRankings.length} chi đội ${summaryGrade !== 'all' ? `khối ${summaryGrade}` : 'toàn trường'}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-3 px-3 text-center">Hạng</th>
                  <th className="pb-3 px-3">Chi đội</th>
                  <th className="pb-3 px-3">GVCN</th>
                  <th className="pb-3 px-3 text-center">Khối</th>
                  <th className="pb-3 px-3 text-right">Nề nếp (A)</th>
                  <th className="pb-3 px-3 text-right">Sổ đầu bài (B)</th>
                  <th className="pb-3 px-3 text-right">Phong trào (C)</th>
                  <th className="pb-3 px-3 text-right">Tổng điểm</th>
                  <th className="pb-3 px-3 text-center">Xếp loại</th>
                  <th className="pb-3 px-3 text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {weeklyRankings.map((cls, idx) => {
                  const isMyClass = currentUser?.classId === cls.id;
                  return (
                    <tr 
                      key={cls.id} 
                      className={`group transition-colors ${
                        isMyClass 
                          ? 'bg-blue-50/70 border-l-4 border-blue-600 font-medium' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs ${
                          idx === 0 ? 'bg-amber-400 text-white shadow-sm' :
                          idx === 1 ? 'bg-slate-300 text-white' :
                          idx === 2 ? 'bg-orange-300 text-white' :
                          'text-slate-600 bg-slate-100'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isMyClass ? 'text-blue-700' : 'text-slate-900'}`}>
                            Chi đội {cls.name}
                          </span>
                          {isMyClass && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md uppercase tracking-wider">
                              Lớp của bạn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">{cls.teacher}</td>
                      <td className="py-3 px-3 text-center text-xs font-semibold text-slate-500">Khối {cls.grade}</td>
                      <td className="py-3 px-3 text-right text-xs font-bold text-slate-700 tabular-nums">
                        {cls.neNep.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right text-xs font-bold text-blue-600 tabular-nums">
                        {cls.logbook.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right text-xs font-bold text-emerald-600 tabular-nums">
                        +{cls.bonus}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-black text-slate-900 tabular-nums">
                          {cls.total.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          cls.rating === 'Xuất sắc' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          cls.rating === 'Tốt' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          cls.rating === 'Khá' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {cls.rating}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setWeeklyDetailClassId(cls.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            (weeklyDetailClassId || (currentUser?.classId || classes[0]?.id)) === cls.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Xem lỗi tuần
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Breakdown of Weekly Infractions and Notes for the Selected Class */}
        {activeDetailClass && (
          <Card
            title={`Chi tiết Vi phạm & Ghi chú Tuần ${summaryWeek} - Chi đội ${activeDetailClass.name}`}
            subtitle={`GVCN: ${activeDetailClass.teacher} • Tổng điểm Nề nếp tuần: ${(activeDetailRecord ? calculateWeeklyNeNep(activeDetailRecord) : 100).toFixed(1)}/100`}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. Chuyên cần */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h5 className="text-xs font-black text-slate-700 uppercase mb-3 flex items-center justify-between">
                    <span>1. Chuyên cần</span>
                    <span className="text-rose-600 font-bold">
                      -{(((activeDetailRecord?.attendance?.late || 0) * 1) + ((activeDetailRecord?.attendance?.absentWithPermission || 0) * 1) + ((activeDetailRecord?.attendance?.absentWithoutPermission || 0) * 3) + ((activeDetailRecord?.attendance?.skippedClass || 0) * 3))}đ
                    </span>
                  </h5>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between"><span>Đi học trễ:</span> <b className="text-slate-900">{activeDetailRecord?.attendance?.late || 0} lượt</b></div>
                    <div className="flex justify-between"><span>Vắng có phép:</span> <b className="text-slate-900">{activeDetailRecord?.attendance?.absentWithPermission || 0} buổi</b></div>
                    <div className="flex justify-between"><span>Vắng không phép:</span> <b className="text-rose-600">{activeDetailRecord?.attendance?.absentWithoutPermission || 0} buổi</b></div>
                    <div className="flex justify-between"><span>Trốn tiết:</span> <b className="text-rose-600">{activeDetailRecord?.attendance?.skippedClass || 0} lượt</b></div>
                  </div>
                </div>

                {/* 2. Tự quản */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h5 className="text-xs font-black text-slate-700 uppercase mb-3 flex items-center justify-between">
                    <span>2. Tự quản</span>
                    <span className="text-slate-500 font-bold">30đ tối đa</span>
                  </h5>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between"><span>Vi phạm cá nhân:</span> <b className="text-slate-900">{activeDetailRecord?.selfManagement?.individualViolations || 0} lượt</b></div>
                    <div className="flex justify-between"><span>Tập thể Nhanh chóng:</span> <b className={activeDetailRecord?.selfManagement?.groupViolations?.quick ? 'text-rose-600' : 'text-emerald-600'}>{activeDetailRecord?.selfManagement?.groupViolations?.quick ? 'Có vi phạm' : 'Đạt'}</b></div>
                    <div className="flex justify-between"><span>Tập thể Đầy đủ:</span> <b className={activeDetailRecord?.selfManagement?.groupViolations?.full ? 'text-rose-600' : 'text-emerald-600'}>{activeDetailRecord?.selfManagement?.groupViolations?.full ? 'Có vi phạm' : 'Đạt'}</b></div>
                    <div className="flex justify-between"><span>Tập thể Trật tự:</span> <b className={activeDetailRecord?.selfManagement?.groupViolations?.orderly ? 'text-rose-600' : 'text-emerald-600'}>{activeDetailRecord?.selfManagement?.groupViolations?.orderly ? 'Có vi phạm' : 'Đạt'}</b></div>
                  </div>
                </div>

                {/* 3. Tác phong */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h5 className="text-xs font-black text-slate-700 uppercase mb-3 flex items-center justify-between">
                    <span>3. Tác phong</span>
                    <span className="text-slate-500 font-bold">25đ tối đa</span>
                  </h5>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between"><span>Vi phạm cá nhân:</span> <b className="text-slate-900">{activeDetailRecord?.manners?.individualViolations || 0} lượt</b></div>
                    <div className="flex justify-between"><span>Đồng phục/Khăn quàng:</span> <b className={activeDetailRecord?.manners?.groupViolations?.uniform ? 'text-rose-600' : 'text-emerald-600'}>{activeDetailRecord?.manners?.groupViolations?.uniform ? 'Vi phạm' : 'Đạt'}</b></div>
                    <div className="flex justify-between"><span>Áo trong quần:</span> <b className={activeDetailRecord?.manners?.groupViolations?.tuckedIn ? 'text-rose-600' : 'text-emerald-600'}>{activeDetailRecord?.manners?.groupViolations?.tuckedIn ? 'Vi phạm' : 'Đạt'}</b></div>
                    <div className="flex justify-between"><span>Giày dép quai hậu:</span> <b className={activeDetailRecord?.manners?.groupViolations?.shoes ? 'text-rose-600' : 'text-emerald-600'}>{activeDetailRecord?.manners?.groupViolations?.shoes ? 'Vi phạm' : 'Đạt'}</b></div>
                  </div>
                </div>

                {/* 4. Kỷ luật & Vệ sinh */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h5 className="text-xs font-black text-slate-700 uppercase mb-3 flex items-center justify-between">
                    <span>4. Kỷ luật & Vệ sinh</span>
                    <span className="text-slate-500 font-bold">45đ tối đa</span>
                  </h5>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between"><span>Lượt rác:</span> <b className="text-slate-900">{activeDetailRecord?.hygiene?.litteringCount || 0} vị trí</b></div>
                    <div className="flex justify-between"><span>Đánh nhau:</span> <b className={activeDetailRecord?.discipline?.fighting ? 'text-rose-600' : 'text-slate-900'}>{activeDetailRecord?.discipline?.fighting || 0}</b></div>
                    <div className="flex justify-between"><span>Nói tục, chửi thề:</span> <b className={activeDetailRecord?.discipline?.swearing ? 'text-rose-600' : 'text-slate-900'}>{activeDetailRecord?.discipline?.swearing || 0}</b></div>
                    <div className="flex justify-between"><span>Vi phạm giao thông:</span> <b className={activeDetailRecord?.discipline?.trafficViolation ? 'text-rose-600' : 'text-slate-900'}>{activeDetailRecord?.discipline?.trafficViolation || 0}</b></div>
                  </div>
                </div>
              </div>

              {/* Ghi chú vi phạm tuần */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/70">
                  <p className="text-[10px] font-black text-amber-800 uppercase mb-1">Ghi chú vi phạm Tự quản</p>
                  <p className="text-xs text-amber-950 leading-relaxed italic">
                    {activeDetailRecord?.selfManagement?.notes || 'Không có ghi chú vi phạm tự quản trong tuần.'}
                  </p>
                </div>
                <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200/70">
                  <p className="text-[10px] font-black text-indigo-800 uppercase mb-1">Ghi chú vi phạm Tác phong</p>
                  <p className="text-xs text-indigo-950 leading-relaxed italic">
                    {activeDetailRecord?.manners?.notes || 'Không có ghi chú vi phạm tác phong trong tuần.'}
                  </p>
                </div>
                <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200/70">
                  <p className="text-[10px] font-black text-rose-800 uppercase mb-1">Ghi chú vi phạm Kỷ luật</p>
                  <p className="text-xs text-rose-950 leading-relaxed italic">
                    {activeDetailRecord?.discipline?.notes || 'Không có ghi chú kỷ luật trong tuần.'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderScoring = () => {
    if (currentUser?.role === 'TEACHER') {
      return renderWeeklySummary();
    }

    if (scoringViewMode === 'summary') {
      return renderWeeklySummary();
    }

    return (
    <div className="space-y-6">
      <Card title="Nhập điểm thi đua Tuần">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Tổng kết Thi đua Tuần</h2>
              <p className="text-xs text-slate-500 font-medium italic">* Đồng bộ dữ liệu từ đội Sao đỏ và nhập điểm Sổ đầu bài, Phong trào.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScoringViewMode('summary')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-2xl text-xs font-bold border border-emerald-200 shadow-2xs transition-all"
              >
                <Trophy size={14} /> Xem Bảng Tổng kết Tuần
              </button>
            <button 
              onClick={() => {
                const daily = dailyData.filter(d => d.classId === scoringForm.classId && d.week === scoringForm.week);
                if (daily.length > 0) {
                  const totalLate = daily.reduce((acc, curr) => acc + curr.attendance.late, 0);
                  const totalAbsentPerm = daily.reduce((acc, curr) => acc + curr.attendance.absentWithPermission, 0);
                  const totalAbsentNoPerm = daily.reduce((acc, curr) => acc + curr.attendance.absentWithoutPermission, 0);
                  const totalSkipped = daily.reduce((acc, curr) => acc + curr.attendance.skippedClass, 0);
                  
                  const totalLitter = daily.reduce((acc, curr) => acc + curr.hygiene.litteringCount, 0);
                  
                  const totalIndividualSM = daily.reduce((acc, curr) => acc + (curr.selfManagement.individualViolations || 0), 0);
                  const groupSMQuick = daily.some(d => d.selfManagement.groupViolations?.quick);
                  const groupSMFull = daily.some(d => d.selfManagement.groupViolations?.full);
                  const groupSMOrderly = daily.some(d => d.selfManagement.groupViolations?.orderly);
                  const groupSMLights = daily.some(d => d.selfManagement.groupViolations?.lightsOff);

                  const totalIndividualManners = daily.reduce((acc, curr) => acc + (curr.manners.individualViolations || 0), 0);
                  const groupMannersUniform = daily.some(d => d.manners.groupViolations?.uniform);
                  const groupMannersTucked = daily.some(d => d.manners.groupViolations?.tuckedIn);
                  const groupMannersShoes = daily.some(d => d.manners.groupViolations?.shoes);
                  const groupMannersHair = daily.some(d => d.manners.groupViolations?.hair);

                  const fighting = daily.reduce((acc, curr) => acc + curr.discipline.fighting, 0);
                  const swearing = daily.reduce((acc, curr) => acc + curr.discipline.swearing, 0);
                  const vandalism = daily.reduce((acc, curr) => acc + curr.discipline.vandalism, 0);
                  const cycling = daily.reduce((acc, curr) => acc + curr.discipline.cyclingInYard, 0);
                  const traffic = daily.reduce((acc, curr) => acc + curr.discipline.trafficViolation, 0);
                  
                  const smNotes = daily.map(d => d.selfManagement.notes).filter(n => n).join('\n');
                  const mannersNotes = daily.map(d => d.manners.notes).filter(n => n).join('\n');
                  const disciplineNotes = daily.map(d => d.discipline.notes).filter(n => n).join('\n');

                  setScoringForm({
                    ...scoringForm,
                    attendance: { late: totalLate, absentWithPermission: totalAbsentPerm, absentWithoutPermission: totalAbsentNoPerm, skippedClass: totalSkipped },
                    selfManagement: { 
                      quick: true, full: true, orderly: true, lightsOff: true, 
                      individualViolations: totalIndividualSM,
                      groupViolations: { quick: groupSMQuick, full: groupSMFull, orderly: groupSMOrderly, lightsOff: groupSMLights },
                      notes: smNotes
                    },
                    manners: { 
                      uniform: true, tuckedIn: true, shoes: true, hair: true, 
                      individualViolations: totalIndividualManners,
                      groupViolations: { uniform: groupMannersUniform, tuckedIn: groupMannersTucked, shoes: groupMannersShoes, hair: groupMannersHair },
                      notes: mannersNotes
                    },
                    hygiene: { 
                      cleanClass: !daily.some(d => !d.hygiene.cleanClass),
                      orderlyFurniture: !daily.some(d => !d.hygiene.orderlyFurniture),
                      cleanCorridor: !daily.some(d => !d.hygiene.cleanCorridor),
                      tablecloth: !daily.some(d => !d.hygiene.tablecloth),
                      eraser: !daily.some(d => !d.hygiene.eraser),
                      litteringCount: totalLitter 
                    },
                    discipline: { fighting, swearing, vandalism, cyclingInYard: cycling, trafficViolation: traffic, notes: disciplineNotes }
                  });
                  alert('Đã đồng bộ từ dữ liệu hàng ngày!');
                } else {
                  alert('Không tìm thấy dữ liệu hàng ngày cho lớp và tuần này.');
                }
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-700 rounded-2xl font-black text-[10px] hover:bg-blue-100 transition-all border border-blue-200 shadow-sm shadow-blue-50"
            >
              ĐỒNG BỘ DỮ LIỆU TỪ SAO ĐỎ
            </button>
          </div>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Chọn Chi đội</label>
            <select 
              value={scoringForm.classId}
              onChange={(e) => setScoringForm({...scoringForm, classId: e.target.value})}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Chọn Tuần</label>
            <select 
              value={scoringForm.week}
              onChange={(e) => setScoringForm({...scoringForm, week: parseInt(e.target.value)})}
              disabled={lockedWeeks.includes(scoringForm.week as number)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
            >
              {[1,2,3,4,5].map(w => <option key={w} value={w}>Tuần {w} {lockedWeeks.includes(w) ? '(Đã khóa)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tháng</label>
            <select 
              value={scoringForm.month}
              onChange={(e) => setScoringForm({...scoringForm, month: parseInt(e.target.value)})}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {[9,10,11,12,1,2,3,4,5].map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
          </div>
        </div>

        {lockedWeeks.includes(scoringForm.week as number) ? (
          <div className="p-12 text-center bg-rose-50 border border-rose-100 rounded-2xl">
            <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
            <h4 className="text-lg font-bold text-rose-900">Tuần này đã được khóa</h4>
            <p className="text-sm text-rose-700 mt-2">Dữ liệu thi đua của tuần {scoringForm.week} đã được chốt để tính điểm tổng kết. Vui lòng mở khóa để chỉnh sửa.</p>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <section className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100 shadow-sm">
              <h4 className="text-sm font-black text-blue-900 mb-6 flex items-center gap-3 uppercase tracking-wider">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center text-sm shadow-lg shadow-blue-200">B</span>
                Sổ đầu bài (Tối đa 100đ)
              </h4>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-3 uppercase tracking-widest">Điểm trung bình các tiết học</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    max="100" 
                    value={scoringForm.logbookPoints}
                    onChange={(e) => setScoringForm({...scoringForm, logbookPoints: parseFloat(e.target.value) || 0})}
                    className="w-full p-5 bg-white border-2 border-blue-200 rounded-2xl text-4xl font-black text-blue-600 shadow-inner outline-none focus:border-blue-400 transition-all" 
                    placeholder="0.0" 
                  />
                </div>
                <div className="p-4 bg-white/50 rounded-xl border border-blue-100">
                  <p className="text-[10px] text-blue-500 font-bold leading-relaxed italic">
                    * Ghi chú: Tiết học ghi thiếu thông tin hoặc thiếu chữ ký giáo viên chỉ tối đa đạt 50 điểm.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100 shadow-sm">
              <h4 className="text-sm font-black text-emerald-900 mb-6 flex items-center gap-3 uppercase tracking-wider">
                <span className="w-8 h-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-sm shadow-lg shadow-emerald-200">C</span>
                Phong trào (Tuần)
              </h4>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-3 uppercase tracking-widest">Điểm thi đua phong trào (Tối đa 100đ)</label>
                  <input 
                    type="number" 
                    max="115"
                    className="w-full p-5 bg-white border-2 border-emerald-200 rounded-2xl text-4xl font-black text-emerald-600 shadow-inner outline-none focus:border-emerald-400 transition-all" 
                    placeholder="0" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <label className="block text-[9px] font-bold text-emerald-500 mb-1 uppercase">Thưởng (Tối đa 15đ)</label>
                    <input type="number" max="15" className="w-full p-2 bg-emerald-50/30 border border-emerald-100 rounded-lg text-sm font-bold text-emerald-600" placeholder="0" />
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <label className="block text-[9px] font-bold text-emerald-500 mb-1 uppercase">Sao đỏ Bonus (10đ)</label>
                    <input 
                      type="number" max="10" 
                      value={scoringForm.redStarBonus}
                      onChange={(e) => setScoringForm({...scoringForm, redStarBonus: parseInt(e.target.value) || 0})}
                      className="w-full p-2 bg-emerald-50/30 border border-emerald-100 rounded-lg text-sm font-bold text-emerald-600" placeholder="0" 
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200 mb-12">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                <span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-sm shadow-lg shadow-slate-200">A</span>
                Tổng hợp Nề nếp từ dữ liệu ngày
              </h4>
              <p className="text-[10px] text-slate-500 font-bold italic">* Bạn có thể chỉnh sửa thủ công nếu cần thiết sau khi đồng bộ.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vi phạm Chuyên cần</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'Đi trễ', key: 'late' },
                    { label: 'Vắng CP', key: 'absentWithPermission' },
                    { label: 'Vắng KP', key: 'absentWithoutPermission' },
                    { label: 'Trốn tiết', key: 'skippedClass' },
                  ].map(f => (
                    <div key={f.key} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500">{f.label}</span>
                      <input 
                        type="number" min="0"
                        value={(scoringForm.attendance as any)[f.key]}
                        onChange={(e) => setScoringForm({...scoringForm, attendance: {...scoringForm.attendance!, [f.key]: parseInt(e.target.value) || 0}})}
                        className="w-12 text-right text-xs font-black text-blue-600"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vi phạm Tự quản</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'Nhanh chóng', key: 'quick' },
                    { label: 'Đầy đủ', key: 'full' },
                    { label: 'Trật tự', key: 'orderly' },
                    { label: 'Đèn quạt', key: 'lightsOff' },
                  ].map(f => (
                    <label key={f.key} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 cursor-pointer">
                      <span className="text-[10px] font-bold text-slate-500">{f.label}</span>
                      <input 
                        type="checkbox"
                        checked={(scoringForm.selfManagement?.groupViolations as any)[f.key]}
                        onChange={(e) => setScoringForm({
                          ...scoringForm,
                          selfManagement: {
                            ...scoringForm.selfManagement!,
                            groupViolations: {...scoringForm.selfManagement!.groupViolations, [f.key]: e.target.checked}
                          }
                        })}
                        className="w-3 h-3 text-rose-600 rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vi phạm Tác phong</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'Đồng phục', key: 'uniform' },
                    { label: 'Áo trong quần', key: 'tuckedIn' },
                    { label: 'Giày dép', key: 'shoes' },
                    { label: 'Đầu tóc', key: 'hair' },
                  ].map(f => (
                    <label key={f.key} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 cursor-pointer">
                      <span className="text-[10px] font-bold text-slate-500">{f.label}</span>
                      <input 
                        type="checkbox"
                        checked={(scoringForm.manners?.groupViolations as any)[f.key]}
                        onChange={(e) => setScoringForm({
                          ...scoringForm,
                          manners: {
                            ...scoringForm.manners!,
                            groupViolations: {...scoringForm.manners!.groupViolations, [f.key]: e.target.checked}
                          }
                        })}
                        className="w-3 h-3 text-rose-600 rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kỷ luật & Vệ sinh</p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500">Lượt rác</span>
                    <input 
                      type="number" min="0"
                      value={scoringForm.hygiene?.litteringCount}
                      onChange={(e) => setScoringForm({...scoringForm, hygiene: {...scoringForm.hygiene!, litteringCount: parseInt(e.target.value) || 0}})}
                      className="w-12 text-right text-xs font-black text-emerald-600"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500">Đánh nhau</span>
                    <input 
                      type="number" min="0"
                      value={scoringForm.discipline?.fighting}
                      onChange={(e) => setScoringForm({...scoringForm, discipline: {...scoringForm.discipline!, fighting: parseInt(e.target.value) || 0}})}
                      className="w-12 text-right text-xs font-black text-rose-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-xl border border-slate-100">
                <label className="block text-[10px] font-black text-amber-600 mb-2 uppercase tracking-widest">Ghi chú Tự quản</label>
                <textarea 
                  value={scoringForm.selfManagement?.notes || ''}
                  onChange={(e) => setScoringForm({...scoringForm, selfManagement: {...scoringForm.selfManagement!, notes: e.target.value}})}
                  className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] outline-none h-20"
                  placeholder="Ghi chú tổng hợp..."
                />
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100">
                <label className="block text-[10px] font-black text-indigo-600 mb-2 uppercase tracking-widest">Ghi chú Tác phong</label>
                <textarea 
                  value={scoringForm.manners?.notes || ''}
                  onChange={(e) => setScoringForm({...scoringForm, manners: {...scoringForm.manners!, notes: e.target.value}})}
                  className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] outline-none h-20"
                  placeholder="Ghi chú tổng hợp..."
                />
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100">
                <label className="block text-[10px] font-black text-rose-600 mb-2 uppercase tracking-widest">Ghi chú Kỷ luật</label>
                <textarea 
                  value={scoringForm.discipline?.notes || ''}
                  onChange={(e) => setScoringForm({...scoringForm, discipline: {...scoringForm.discipline!, notes: e.target.value}})}
                  className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] outline-none h-20"
                  placeholder="Ghi chú tổng hợp..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-100">
                <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Dự kiến tổng điểm</p>
                <p className="text-3xl font-black">{calculateWeeklyNeNep(scoringForm as WeeklyPoints) + (scoringForm.logbookPoints || 0)}</p>
              </div>
              <div className="text-slate-400">
                <p className="text-[10px] font-bold uppercase mb-1">Tuần {scoringForm.week} - Tháng {scoringForm.month}</p>
                <p className="text-sm font-semibold">{classes.find(c => c.id === scoringForm.classId)?.name || 'Chưa chọn lớp'}</p>
              </div>
            </div>
            <button 
              onClick={handleSaveScoring}
              className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Lưu và Hoàn tất
            </button>
          </div>
        </div>
      )}
      </Card>
    </div>
    );
  };

  const handlePrintReport = (title: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Cache grade rankings to avoid redundant calls
    const gradeRankingsMap: Record<number, any[]> = {};
    const getGradeRank = (grade: number, classId: string) => {
      if (!gradeRankingsMap[grade]) {
        gradeRankingsMap[grade] = getRankings(grade);
      }
      return gradeRankingsMap[grade].findIndex(r => r.id === classId) + 1;
    };

    const rankingRows = rankings.map((cls, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;"><b>${cls.name}</b><br/><small>GVCN: ${cls.teacher}</small></td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">Khối ${cls.grade}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${cls.avgNeNep.toFixed(1)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${cls.avgLogbook.toFixed(1)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;"><b>${cls.total.toFixed(1)}</b></td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold; color: #2563eb;">${getGradeRank(cls.grade, cls.id)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1e293b; }
            h1 { text-align: center; color: #0f172a; margin-bottom: 5px; }
            h2 { text-align: center; color: #64748b; font-size: 16px; margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: center; background: #f8fafc; padding: 12px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
            th:nth-child(2) { text-align: left; }
            th:nth-child(6) { text-align: right; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; }
            .sign { text-align: center; width: 200px; }
          </style>
        </head>
        <body>
          <h1>LIÊN ĐỘI THCS ĐỒNG ĐEN</h1>
          <h2>BÁO CÁO THI ĐUA - ${title.toUpperCase()}</h2>
          <table>
            <thead>
              <tr>
                <th>Hạng LĐ</th>
                <th>Chi đội</th>
                <th>Khối</th>
                <th>Nề nếp</th>
                <th>Sổ đầu bài</th>
                <th style="text-align: right;">Tổng điểm</th>
                <th>Hạng Khối</th>
              </tr>
            </thead>
            <tbody>
              ${rankingRows}
            </tbody>
          </table>
          <div class="footer">
            <div class="sign">
              <p><b>BAN GIÁM HIỆU DUYỆT</b></p>
              <br/><br/><br/>
              <p>............................</p>
            </div>
            <div class="sign">
              <p><b>TỔNG PHỤ TRÁCH</b></p>
              <br/><br/><br/>
              <p>Trần Thị Thanh</p>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderAccounts = () => {
    const filteredAccounts = accounts.filter(acc => {
      const matchRole = accountFilterRole === 'ALL' || acc.role === accountFilterRole;
      const matchSearch = !accountSearchQuery.trim() || 
        acc.displayName.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
        acc.username.toLowerCase().includes(accountSearchQuery.toLowerCase());
      return matchRole && matchSearch;
    });

    return (
    <div className="space-y-6">
      <Card 
        title="Quản lý Tài khoản" 
        subtitle="Cấp quyền truy cập, đặt lại mật khẩu và quản lý tài khoản cho GVCN, Ban chỉ huy, Sao đỏ"
        action={
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownloadAccounts}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs"
              title="Tải xuống danh sách tài khoản (Excel)"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Tải danh sách</span>
            </button>
            <button 
              onClick={() => setIsAddingAccount(!isAddingAccount)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-xs"
            >
              {isAddingAccount ? 'Hủy' : (
                <>
                  <Plus size={16} />
                  Thêm tài khoản
                </>
              )}
            </button>
          </div>
        }
      >
        <AnimatePresence>
          {isAddingAccount && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8 border-b border-slate-100 pb-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Tên hiển thị</label>
                  <input 
                    type="text" 
                    placeholder="VD: Thầy Nguyễn Văn A"
                    value={accountForm.displayName}
                    onChange={(e) => setAccountForm({...accountForm, displayName: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Tên đăng nhập</label>
                  <input 
                    type="text" 
                    placeholder="VD: gvcn_6a1"
                    value={accountForm.username}
                    onChange={(e) => setAccountForm({...accountForm, username: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Mật khẩu</label>
                  <input 
                    type="password" 
                    placeholder="VD: 123"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({...accountForm, password: e.target.value})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Vai trò</label>
                  <select 
                    value={accountForm.role}
                    onChange={(e) => setAccountForm({...accountForm, role: e.target.value as UserRole})}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                  >
                    <option value="TEACHER">Giáo viên chủ nhiệm</option>
                    <option value="ADMIN">Ban chỉ huy (Toàn quyền)</option>
                    <option value="SAO_DO">Đội Sao đỏ</option>
                  </select>
                </div>
                <div>
                  {accountForm.role === 'TEACHER' && (
                    <div className="mb-4">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Phụ trách lớp</label>
                      <select 
                        value={accountForm.classId}
                        onChange={(e) => setAccountForm({...accountForm, classId: e.target.value})}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                      >
                        <option value="">-- Chọn lớp --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  <button 
                    onClick={handleSaveAccount}
                    className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    Lưu tài khoản
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setAccountFilterRole('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                accountFilterRole === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({accounts.length})
            </button>
            <button
              type="button"
              onClick={() => setAccountFilterRole('TEACHER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                accountFilterRole === 'TEACHER'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Giáo viên ({accounts.filter(a => a.role === 'TEACHER').length})
            </button>
            <button
              type="button"
              onClick={() => setAccountFilterRole('ADMIN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                accountFilterRole === 'ADMIN'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Ban chỉ huy ({accounts.filter(a => a.role === 'ADMIN').length})
            </button>
            <button
              type="button"
              onClick={() => setAccountFilterRole('SAO_DO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                accountFilterRole === 'SAO_DO'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Sao đỏ ({accounts.filter(a => a.role === 'SAO_DO').length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc username..."
              value={accountSearchQuery}
              onChange={(e) => setAccountSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="pb-3 px-3">Tên hiển thị</th>
                <th className="pb-3 px-3">Tên đăng nhập</th>
                <th className="pb-3 px-3">Vai trò</th>
                <th className="pb-3 px-3">Phụ trách lớp</th>
                <th className="pb-3 px-3 text-right">Thao tác quản lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map(acc => {
                const isRootAdmin = acc.username === 'admin';
                const isCurrent = acc.id === currentUser?.id;

                return (
                  <tr key={acc.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          acc.role === 'ADMIN' ? 'bg-rose-100 text-rose-700' :
                          acc.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {acc.displayName ? acc.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{acc.displayName}</p>
                          {isCurrent && (
                            <span className="text-[10px] text-blue-600 font-semibold">(Tài khoản hiện tại)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-xs font-mono font-bold text-slate-700">
                      {acc.username}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        acc.role === 'ADMIN' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        acc.role === 'TEACHER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {acc.role === 'ADMIN' ? '🛡️ Ban chỉ huy' : acc.role === 'TEACHER' ? '👨‍🏫 GVCN' : '⭐ Sao đỏ'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-xs font-semibold text-slate-700">
                      {acc.classId ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-bold">
                          Chi đội {classes.find(c => c.id === acc.classId)?.name || acc.classId}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Toàn liên đội</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Nút cấp lại mật khẩu cho giáo viên, ban chỉ huy, sao đỏ */}
                        <button 
                          onClick={() => handleOpenResetPassword(acc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-all shadow-2xs"
                          title={`Cấp lại mật khẩu cho ${acc.displayName}`}
                        >
                          <KeyRound size={13} />
                          <span>Cấp lại MK</span>
                        </button>

                        {/* Nút xóa tài khoản */}
                        <button 
                          type="button"
                          onClick={() => handleRequestDeleteAccount(acc)}
                          disabled={isRootAdmin || isCurrent}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-all shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title={
                            isRootAdmin 
                              ? 'Không thể xóa tài khoản Quản trị viên (Admin) mặc định' 
                              : isCurrent 
                              ? 'Không thể xóa tài khoản bạn đang đăng nhập' 
                              : `Xóa tài khoản ${acc.displayName}`
                          }
                        >
                          <Trash2 size={13} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs italic">
                    Không tìm thấy tài khoản phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Xác nhận Xóa Tài khoản */}
      <AnimatePresence>
        {deletingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shadow-xs">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Xác nhận Xóa Tài khoản</h3>
                    <p className="text-xs text-rose-600 font-medium">Hành động này không thể hoàn tác</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeletingAccount(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  Bạn có chắc chắn muốn xóa tài khoản của <b className="text-slate-900">"{deletingAccount.displayName}"</b> khỏi hệ thống?
                </p>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Tên đăng nhập:</span>
                    <span className="font-mono font-bold text-slate-900">{deletingAccount.username}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Vai trò:</span>
                    <span className="font-bold text-slate-800">
                      {deletingAccount.role === 'ADMIN' ? '🛡️ Ban chỉ huy' : deletingAccount.role === 'TEACHER' ? `👨‍🏫 GVCN (${classes.find(c => c.id === deletingAccount.classId)?.name || 'Chưa phân công'})` : '⭐ Đội Sao đỏ'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>Sau khi xóa, tài khoản này sẽ bị thu hồi và không thể đăng nhập vào ứng dụng nữa.</span>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingAccount(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAccount}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={15} />
                  <span>Xác nhận xóa tài khoản</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Cấp lại mật khẩu cho tài khoản */}
      <AnimatePresence>
        {resettingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-xs">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Cấp lại Mật khẩu</h3>
                    <p className="text-xs text-slate-500">Đặt lại mật khẩu cho tài khoản người dùng</p>
                  </div>
                </div>
                <button
                  onClick={() => setResettingAccount(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Người dùng:</span>
                    <span className="font-bold text-slate-900">{resettingAccount.displayName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Tên đăng nhập:</span>
                    <span className="font-mono font-bold text-blue-600">{resettingAccount.username}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Vai trò:</span>
                    <span className="font-bold text-slate-700">
                      {resettingAccount.role === 'ADMIN' ? '🛡️ Ban chỉ huy' : resettingAccount.role === 'TEACHER' ? `👨‍🏫 GVCN (${classes.find(c => c.id === resettingAccount.classId)?.name || 'Chưa chọn lớp'})` : '⭐ Đội Sao đỏ'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Nhập mật khẩu mới..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-2">Gán nhanh mật khẩu mẫu:</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewPasswordInput('123')}
                      className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-200"
                    >
                      Mật khẩu: 123
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPasswordInput('123456')}
                      className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-200"
                    >
                      Mật khẩu: 123456
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResettingAccount(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetPassword}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-200 transition-all flex items-center gap-1.5"
                >
                  <KeyRound size={15} />
                  <span>Xác nhận cấp lại</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    );
  };

  const renderReports = () => (
    <div className="space-y-6">
      <Card title="Xuất báo cáo tự động" subtitle="Tạo file báo cáo PDF/Excel cho tuần hoặc tháng">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border border-slate-100 rounded-2xl bg-white hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Download size={24} />
            </div>
            <h4 className="font-bold text-slate-900">Báo cáo Tổng kết Tuần</h4>
            <p className="text-xs text-slate-500 mt-2">Dành cho buổi chào cờ đầu tuần, bao gồm xếp hạng và danh sách khen thưởng.</p>
            <div className="mt-6 flex items-center gap-3">
              <select className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none">
                <option>Tuần hiện tại</option>
                {[1,2,3,4,5].map(w => <option key={w}>Tuần {w}</option>)}
              </select>
              <button 
                onClick={() => handlePrintReport('Báo cáo Tuần')}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Tạo báo cáo
              </button>
            </div>
          </div>

          <div className="p-6 border border-slate-100 rounded-2xl bg-white hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <BarChart3 size={24} />
            </div>
            <h4 className="font-bold text-slate-900">Báo cáo Thi đua Tháng</h4>
            <p className="text-xs text-slate-500 mt-2">Tổng hợp 4 tuần và điểm phong trào, dùng để bình xét danh hiệu Chi đội xuất sắc.</p>
            <div className="mt-6 flex items-center gap-3">
              <select className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none">
                <option>Tháng hiện tại</option>
                {[9,10,11,12,1,2,3,4,5].map(m => <option key={m}>Tháng {m}</option>)}
              </select>
              <button 
                onClick={() => handlePrintReport('Báo cáo Tháng')}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Tạo báo cáo
              </button>
            </div>
          </div>
        </div>
      </Card>
      
      <Card title="Lịch sử báo cáo">
        <div className="space-y-3">
          {[
            { name: 'Báo cáo Tuần 3 - Tháng 9', date: '25/09/2026', type: 'Tuần' },
            { name: 'Báo cáo Tuần 2 - Tháng 9', date: '18/09/2026', type: 'Tuần' },
            { name: 'Báo cáo Tuần 1 - Tháng 9', date: '11/09/2026', type: 'Tuần' },
          ].map((report, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-slate-50 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 text-slate-400 rounded flex items-center justify-center">
                  <ClipboardCheck size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{report.name}</p>
                  <p className="text-[10px] text-slate-500">Đã tạo ngày: {report.date}</p>
                </div>
              </div>
              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Download size={16} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderLogin = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
        <div className="p-8 bg-blue-600 text-white text-center">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full overflow-hidden bg-white shadow-xl">
            <img src="/src/assets/images/logo_emblem_only_1791452125388.jpg" alt="Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Hệ thống Thi đua</h1>
          <p className="text-blue-100 text-sm font-medium mt-1 uppercase tracking-widest opacity-80">THCS Đồng Đen • Năm học 2026 - 2027</p>
        </div>
        <div className="p-8 space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên đăng nhập</label>
              <input 
                type="text" 
                required
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-sm font-bold"
                placeholder="Nhập username..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Mật khẩu</label>
              <input 
                type="password" 
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all text-sm font-bold"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 hover:scale-[1.01] active:scale-95 transition-all uppercase tracking-widest text-xs"
            >
              Đăng nhập ngay
            </button>
          </form>

          {/* Quick Demo Login Buttons */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Đăng nhập nhanh để trải nghiệm phân quyền:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const u = accounts.find(a => a.username === 'admin') || accounts[0];
                  if (u) {
                    setCurrentUser(u);
                    sessionStorage.setItem('liendoi_user', JSON.stringify(u));
                  }
                }}
                className="p-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold text-left border border-rose-200 transition-all"
              >
                <span className="block text-[10px] text-rose-500 uppercase font-black">Ban chỉ huy</span>
                🛡️ Admin (Toàn quyền)
              </button>
              <button
                type="button"
                onClick={() => {
                  const u = accounts.find(a => a.username === 'gvcn_6a1');
                  if (u) {
                    setCurrentUser(u);
                    sessionStorage.setItem('liendoi_user', JSON.stringify(u));
                  }
                }}
                className="p-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold text-left border border-blue-200 transition-all"
              >
                <span className="block text-[10px] text-blue-500 uppercase font-black">GVCN Lớp 6A1</span>
                👨‍🏫 Thầy Nguyễn Văn A
              </button>
              <button
                type="button"
                onClick={() => {
                  const u = accounts.find(a => a.username === 'gvcn_7a2');
                  if (u) {
                    setCurrentUser(u);
                    sessionStorage.setItem('liendoi_user', JSON.stringify(u));
                  }
                }}
                className="p-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold text-left border border-purple-200 transition-all"
              >
                <span className="block text-[10px] text-purple-500 uppercase font-black">GVCN Lớp 7A2</span>
                👩‍🏫 Cô Trần Thị B
              </button>
              <button
                type="button"
                onClick={() => {
                  const u = accounts.find(a => a.username === 'saodo');
                  if (u) {
                    setCurrentUser(u);
                    sessionStorage.setItem('liendoi_user', JSON.stringify(u));
                  }
                }}
                className="p-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold text-left border border-emerald-200 transition-all"
              >
                <span className="block text-[10px] text-emerald-500 uppercase font-black">Chấm chéo</span>
                ⭐ Đội Sao đỏ
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-2.5 italic">Mật khẩu mặc định cho tất cả tài khoản: 123</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return null;
  if (!currentUser) return renderLogin();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white p-6 hidden lg:flex flex-col shrink-0 sticky top-0 h-screen z-40">
        <div className="flex items-center gap-4 mb-10 p-2 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-12 h-12 flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-white border border-slate-100">
            <img src="/src/assets/images/logo_emblem_only_1791452125388.jpg" alt="Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-slate-900 leading-none text-sm truncate">THCS ĐỒNG ĐEN</h1>
            <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tighter mt-1">BCH LIÊN ĐỘI</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {currentUser.role === 'ADMIN' && (
            <SidebarItem 
              icon={LayoutDashboard} 
              label="Tổng quan" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
          )}
          {currentUser.role !== 'TEACHER' ? (
            <>
              {currentUser.role === 'ADMIN' && (
                <SidebarItem 
                  icon={Users} 
                  label="Danh sách Chi đội" 
                  active={activeTab === 'classes'} 
                  onClick={() => setActiveTab('classes')} 
                />
              )}
              <SidebarItem 
                icon={ClipboardCheck} 
                label="Chấm điểm ngày" 
                active={activeTab === 'daily'} 
                onClick={() => setActiveTab('daily')} 
              />
              {currentUser.role === 'ADMIN' && (
                <>
                  <SidebarItem 
                    icon={BarChart3} 
                    label="Tổng kết Tuần" 
                    active={activeTab === 'scoring'} 
                    onClick={() => setActiveTab('scoring')} 
                  />
                  <SidebarItem 
                    icon={BarChart3} 
                    label="Báo cáo & Thống kê" 
                    active={activeTab === 'reports'} 
                    onClick={() => setActiveTab('reports')} 
                  />
                  <SidebarItem 
                    icon={Settings} 
                    label="Quản lý Tài khoản" 
                    active={activeTab === 'accounts'} 
                    onClick={() => setActiveTab('accounts')} 
                  />
                </>
              )}
            </>
          ) : (
            <SidebarItem 
              icon={ClipboardCheck} 
              label="Chấm điểm ngày" 
              active={activeTab === 'daily'} 
              onClick={() => setActiveTab('daily')} 
            />
          )}
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.displayName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{currentUser.displayName}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase">
                  {currentUser.role === 'ADMIN' ? 'Ban chỉ huy' : currentUser.role === 'TEACHER' ? `GVCN ${classes.find(c => c.id === currentUser.classId)?.name || ''}` : 'Sao đỏ'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <AlertCircle size={14} /> Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Liên đội</span>
            <ChevronRight size={14} />
            <span className="font-medium text-slate-900 capitalize">{
              activeTab === 'dashboard' ? 'Tổng quan' :
              activeTab === 'classes' ? 'Quản lý Chi đội' :
              activeTab === 'daily' ? (currentUser.role === 'TEACHER' ? 'Xem thi đua ngày' : 'Chấm điểm ngày') :
              activeTab === 'scoring' ? (currentUser.role === 'TEACHER' ? 'Xem tổng kết tuần' : 'Nhập điểm tuần') : 
              activeTab === 'reports' ? 'Báo cáo & Thống kê' : 'Quản lý Tài khoản'
            }</span>
          </div>

          <div className="flex items-center gap-4">
            <PWAInstallButton />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl">
              <span className={`w-2 h-2 rounded-full ${currentUser.role === 'ADMIN' ? 'bg-rose-500' : currentUser.role === 'TEACHER' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
              <span className="text-xs font-bold text-slate-700">
                {currentUser.displayName}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">
                ({currentUser.role === 'ADMIN' ? 'Admin' : currentUser.role === 'TEACHER' ? 'GVCN' : 'Sao đỏ'})
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />
            <p className="text-xs font-semibold text-slate-600 hidden sm:block">Năm học 2026 - 2027</p>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {activeTab === 'dashboard' && currentUser.role === 'ADMIN' && renderDashboard()}
              {activeTab === 'classes' && currentUser.role === 'ADMIN' && renderClasses()}
              {activeTab === 'daily' && renderDaily()}
              {activeTab === 'scoring' && renderScoring()}
              {activeTab === 'reports' && currentUser.role === 'ADMIN' && renderReports()}
              {activeTab === 'accounts' && currentUser.role === 'ADMIN' && renderAccounts()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <OfflineIndicator />

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
              toastMessage.type === 'error'
                ? 'bg-rose-600 text-white border-rose-500 shadow-rose-900/20'
                : toastMessage.type === 'info'
                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-900/20'
                : 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle size={18} className="shrink-0" />
            ) : (
              <CheckCircle2 size={18} className="shrink-0" />
            )}
            <p className="text-xs font-bold leading-tight">{toastMessage.text}</p>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-auto text-white/80 hover:text-white p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
