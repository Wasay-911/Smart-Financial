// js/systems/MaintenanceSystem.js – Truck wear, mileage, and service logic

export class MaintenanceSystem {
  constructor() {
    this.SERVICE_INTERVAL = 500;  // km between recommended services
    this.WEAR_PER_KM      = 0.012; // wear% per km driven
  }

  /**
   * Called every frame while driving.
   * @param {Truck} truck
   * @param {number} dt  delta time in seconds
   */
  update(truck, dt) {
    const kmPerSec = Math.abs(truck.speed) / 200; // rough km equivalent
    const kmDriven = kmPerSec * dt;

    truck.mileage    += kmDriven;
    truck.wear        = Math.min(100, truck.wear + this.WEAR_PER_KM * kmDriven);
    truck.totalKm    += kmDriven;

    // Wear affects performance at high degradation
    // >70% wear: fuel efficiency −10%
    // >90% wear: max speed −15%, random breakdown risk
    if (truck.wear > 90 && Math.random() < 0.001) {
      // Breakdown: engine sputter (momentary speed loss)
      truck.speed *= 0.7;
    }
  }

  /** Multiplier applied to truck fuelRate based on wear */
  getFuelMult(truck) {
    if (truck.wear > 70) return 1 + (truck.wear - 70) / 100;
    return 1.0;
  }

  /** Multiplier applied to truck maxSpeed based on wear */
  getSpeedMult(truck) {
    if (truck.wear > 90) return 0.85;
    return 1.0;
  }

  /**
   * Service the truck (reset wear).
   * @returns {{success:boolean, cost:number}}
   */
  service(truck, economy, notif) {
    const cost = this.getServiceCost(truck);
    if (!economy.canAfford(cost)) {
      notif?.notify(`Need $${cost} for service`, '#E74C3C', 2.5);
      return { success: false, cost };
    }
    economy.spend(cost, 'Truck Service');
    truck.wear = 0;
    notif?.notify('🔧 Truck serviced! Running like new.', '#2ECC71', 3);
    return { success: true, cost };
  }

  getServiceCost(truck) {
    return Math.max(200, Math.round(truck.wear * 8)); // $0-800
  }

  getWearLabel(wear) {
    if (wear < 20) return {label:'Excellent', color:'#2ECC71'};
    if (wear < 45) return {label:'Good',      color:'#27AE60'};
    if (wear < 65) return {label:'Fair',      color:'#F39C12'};
    if (wear < 85) return {label:'Poor',      color:'#E67E22'};
    return                {label:'Critical',  color:'#E74C3C'};
  }
}
