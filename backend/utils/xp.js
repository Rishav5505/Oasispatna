// XP / level helpers for the gamified practice system (FEATURES_CONTRACT A2)
const StudentStats = require('../models/StudentStats');
const { istDateString, addDays } = require('./time');

const XP = {
  DPP_CORRECT: 10,
  DPP_COMPLETION: 20,
  TEST_CORRECT: 5,
  STUDY_PER_MINUTE: 2,
  STUDY_DAILY_CAP: 120,
};

// level = floor(sqrt(xp/100)) + 1
const levelFor = (xp) => Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100)) + 1;
// XP at which the next level starts: level L+1 needs 100 * L^2
const nextLevelXpFor = (xp) => 100 * Math.pow(levelFor(xp), 2);

// IST week key = 'YYYY-MM-DD' of that week's Monday
function weekKey(date = new Date()) {
  const today = istDateString(date);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(today, -((dow + 6) % 7));
}

// weeklyXp is only meaningful when weekKey matches the current week
const currentWeeklyXp = (stats, wk = weekKey()) => (stats && stats.weekKey === wk ? stats.weeklyXp || 0 : 0);

/**
 * Add XP to a student (creates the stats row if needed). Never throws; returns the updated stats or null.
 */
async function awardXp(studentId, amount) {
  try {
    if (!studentId) return null;
    const inc = Math.max(0, Math.round(Number(amount) || 0));
    const wk = weekKey();
    // Roll the weekly counter over when the week changed
    await StudentStats.updateOne({ studentId, weekKey: { $ne: wk } }, { $set: { weekKey: wk, weeklyXp: 0 } });
    const stats = await StudentStats.findOneAndUpdate(
      { studentId },
      { $inc: { xp: inc, weeklyXp: inc }, $set: { weekKey: wk } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const level = levelFor(stats.xp);
    if (stats.level !== level) {
      stats.level = level;
      await StudentStats.updateOne({ _id: stats._id }, { $set: { level } });
    }
    return stats;
  } catch (err) {
    console.error('awardXp error:', err.message);
    return null;
  }
}

module.exports = { XP, levelFor, nextLevelXpFor, weekKey, currentWeeklyXp, awardXp };
