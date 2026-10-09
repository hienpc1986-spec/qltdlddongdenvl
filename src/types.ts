/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ClassInfo {
  id: string;
  name: string; // e.g., "6A1", "9A2"
  grade: number; // 6, 7, 8, 9
  teacher: string;
}

export interface AttendanceViolation {
  late: number; // Đi học trễ: -1/hs/tiết
  absentWithPermission: number; // Vắng có phép: -1/hs/buổi
  absentWithoutPermission: number; // Vắng không phép: -3/hs/buổi
  skippedClass: number; // Trốn tiết: -3/hs/tiết
}

export interface SelfManagementPoints {
  quick: boolean; // Nhanh chóng: 10đ
  full: boolean; // Đầy đủ: 5đ
  orderly: boolean; // Giữ trật tự: 10đ
  lightsOff: boolean; // Tắt đèn quạt: 5đ
  individualViolations: number; // Vi phạm cá nhân: -1đ/lần
  groupViolations: {
    quick: boolean;
    full: boolean;
    orderly: boolean;
    lightsOff: boolean;
  };
  notes?: string;
}

export interface MannersPoints {
  uniform: boolean; // Áo, quần, khăn quàng, phù hiệu: 10đ
  tuckedIn: boolean; // Áo cho trong quần: 5đ
  shoes: boolean; // Giày dép quai hậu: 5đ
  hair: boolean; // Đầu tóc, trang sức: 5đ
  individualViolations: number; // Vi phạm cá nhân: -1đ/lần
  groupViolations: {
    uniform: boolean;
    tuckedIn: boolean;
    shoes: boolean;
    hair: boolean;
  };
  notes?: string;
}

export interface HygienePoints {
  cleanClass: boolean; // Sạch sàn, bảng: 8đ
  orderlyFurniture: boolean; // Bàn ghế: 3đ
  cleanCorridor: boolean; // Hành lang: 3đ
  tablecloth: boolean; // Khăn bàn: 3đ
  eraser: boolean; // Đồ lau bảng: 3đ
  litteringCount: number; // Mỗi vị trí có rác -1đ
}

export interface DisciplinePoints {
  fighting: number; // Đánh nhau: -10đ/lần
  swearing: number; // Chửi thề: -3đ/hs/lần
  vandalism: number; // Phá hoại: -10đ/lần
  cyclingInYard: number; // Chạy xe trong sân: -3đ/hs/lần
  trafficViolation: number; // Vi phạm giao thông: -10đ/hs
  notes?: string;
}

export interface DailyPoints {
  id: string;
  classId: string;
  date: string; // ISO string
  week: number;
  month: number;
  attendance: AttendanceViolation;
  selfManagement: SelfManagementPoints;
  manners: MannersPoints;
  hygiene: HygienePoints;
  discipline: DisciplinePoints;
}

export interface WeeklyPoints {
  classId: string;
  week: number;
  month: number;
  attendance: AttendanceViolation;
  selfManagement: SelfManagementPoints;
  manners: MannersPoints;
  hygiene: HygienePoints;
  discipline: DisciplinePoints;
  redStarBonus: number; // Thưởng sao đỏ: 10đ
  logbookPoints: number; // Sổ đầu bài: max 100đ
}

export interface MovementPoints {
  classId: string;
  month: number;
  activities: {
    name: string;
    participationLevel: 'full_award' | 'full' | 'partial' | 'none'; // 100%, 95%, 70%, 0%
  }[];
  bonus: {
    organization: number; // max 5
    districtAward: number; // 5
    leaderBonus: number; // 5
  };
}

export type UserRole = 'ADMIN' | 'TEACHER' | 'SAO_DO';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  classId?: string; // For TEACHER role
}

export interface MonthlyRanking {
  classId: string;
  month: number;
  averageWeeklyPoints: number;
  movementPoints: number;
  totalPoints: number;
  rank: number;
}
