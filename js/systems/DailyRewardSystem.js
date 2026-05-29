// js/systems/DailyRewardSystem.js – Daily login rewards with streak bonuses

const STREAK_REWARDS = [
  {day:1, money:500,   xp:50,  label:'Day 1'},
  {day:2, money:750,   xp:75,  label:'Day 2'},
  {day:3, money:1000,  xp:100, label:'Day 3'},
  {day:4, money:1500,  xp:150, label:'Day 4'},
  {day:5, money:2000,  xp:200, label:'Day 5'},
  {day:6, money:2500,  xp:250, label:'Day 6'},
  {day:7, money:5000,  xp:500, label:'Day 7 🎉 BONUS WEEK!'},
];

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export class DailyRewardSystem {
  constructor() {
    this.lastLoginDate = null;   // YYYY-MM-DD
    this.streak        = 0;
    this.pendingClaim  = false;  // true = reward screen should show
  }

  /** Call on game startup (before main menu) */
  checkLogin() {
    const today = todayStr();
    if (this.lastLoginDate === today) {
      this.pendingClaim = false;
      return false; // Already claimed today
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);

    if (this.lastLoginDate === yStr) {
      this.streak = Math.min(this.streak + 1, 7); // max shown streak = 7
    } else {
      this.streak = 1; // streak broken (or first time)
    }

    this.lastLoginDate = today;
    this.pendingClaim  = true;
    return true;
  }

  getCurrentReward() {
    const idx = Math.min(this.streak - 1, STREAK_REWARDS.length - 1);
    return STREAK_REWARDS[idx];
  }

  /** Claim the pending reward. Returns {money, xp} */
  claim() {
    if (!this.pendingClaim) return null;
    this.pendingClaim = false;
    return this.getCurrentReward();
  }

  get streakDays() { return STREAK_REWARDS; }

  // ── Serialize ─────────────────────────────────────────────
  toJSON()  { return { lastLoginDate: this.lastLoginDate, streak: this.streak }; }
  fromJSON(d) {
    if (!d) return;
    this.lastLoginDate = d.lastLoginDate || null;
    this.streak        = d.streak        || 0;
  }
}
