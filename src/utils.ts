/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeeklyPoints, MovementPoints } from './types';

export const calculateWeeklyNeNep = (points: WeeklyPoints): number => {
  let score = 0;

  // A. NỀ NẾP (100 điểm + 10 điểm thưởng)
  
  // 1. Chuyên cần (Trừ điểm từ tổng)
  const att = points.attendance || {};
  const attendanceDeduction = ((att.late || 0) * 1 + (att.absentWithPermission || 0) * 1 + (att.absentWithoutPermission || 0) * 3 + (att.skippedClass || 0) * 3);
  
  // 2. Tự quản (30đ)
  let selfMgmtScore = 0;
  const groupSM = points.selfManagement?.groupViolations || {};
  if (!groupSM.quick) selfMgmtScore += 10;
  if (!groupSM.full) selfMgmtScore += 5;
  if (!groupSM.orderly) selfMgmtScore += 10;
  if (!groupSM.lightsOff) selfMgmtScore += 5;
  selfMgmtScore = Math.max(0, selfMgmtScore - (points.selfManagement?.individualViolations || 0) * 1);

  // 3. Tác phong (25đ)
  let mannersScore = 0;
  const groupManners = points.manners?.groupViolations || {};
  if (!groupManners.uniform) mannersScore += 10;
  if (!groupManners.tuckedIn) mannersScore += 5;
  if (!groupManners.shoes) mannersScore += 5;
  if (!groupManners.hair) mannersScore += 5;
  mannersScore = Math.max(0, mannersScore - (points.manners?.individualViolations || 0) * 1);

  // 4. Vệ sinh (20đ)
  let hygieneScore = 0;
  const hygiene = points.hygiene || {};
  if (hygiene.cleanClass) hygieneScore += 8;
  if (hygiene.orderlyFurniture) hygieneScore += 3;
  if (hygiene.cleanCorridor) hygieneScore += 3;
  if (hygiene.tablecloth) hygieneScore += 3;
  if (hygiene.eraser) hygieneScore += 3;
  hygieneScore = Math.max(0, hygieneScore - (hygiene.litteringCount || 0) * 1);

  // 5. Kỷ luật (25đ)
  let disciplineScore = 25;
  const disc = points.discipline || {};
  disciplineScore -= ((disc.fighting || 0) * 10);
  disciplineScore -= ((disc.swearing || 0) * 3);
  disciplineScore -= ((disc.vandalism || 0) * 10);
  disciplineScore -= ((disc.cyclingInYard || 0) * 3);
  disciplineScore -= ((disc.trafficViolation || 0) * 10);
  disciplineScore = Math.max(0, disciplineScore);

  score = selfMgmtScore + mannersScore + hygieneScore + disciplineScore - attendanceDeduction;
  score += (points.redStarBonus || 0);

  return score;
};

export const calculateMovementPoints = (movement: MovementPoints): number => {
  if (movement.activities.length === 0) return 0;
  
  const standardPointPerActivity = 100 / movement.activities.length;
  let total = 0;

  movement.activities.forEach(act => {
    switch (act.participationLevel) {
      case 'full_award': total += standardPointPerActivity; break;
      case 'full': total += standardPointPerActivity * 0.95; break;
      case 'partial': total += standardPointPerActivity * 0.70; break;
      case 'none': total += 0; break;
    }
  });

  total += movement.bonus.organization + movement.bonus.districtAward + movement.bonus.leaderBonus;
  return total;
};
