// js/systems/EconomySystem.js

export class EconomySystem {
  constructor(initialMoney = 5000) {
    this._money = initialMoney;
    this.transactions = [];   // [{amount, reason, type, ts}]
    this.totalEarned  = 0;
    this.totalSpent   = 0;
  }

  get money() { return this._money; }

  canAfford(amount) { return this._money >= amount; }

  earn(amount, reason = '') {
    this._money   += amount;
    this.totalEarned += amount;
    this._log(amount, reason, 'earn');
  }

  spend(amount, reason = '') {
    this._money   = Math.max(0, this._money - amount);
    this.totalSpent  += amount;
    this._log(-amount, reason, 'spend');
  }

  _log(amount, reason, type) {
    this.transactions.push({amount, reason, type, ts: Date.now()});
    if (this.transactions.length > 100) this.transactions.shift();
  }

  toJSON() {
    return { money: this._money, totalEarned: this.totalEarned, totalSpent: this.totalSpent };
  }

  fromJSON(data) {
    if (!data) return;
    this._money      = data.money       ?? 5000;
    this.totalEarned = data.totalEarned ?? 0;
    this.totalSpent  = data.totalSpent  ?? 0;
  }
}
