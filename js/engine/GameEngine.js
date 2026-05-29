// js/engine/GameEngine.js – Phase 10+16: full Pakistan map, city unlocking, country map

import { GAME_STATE, NPC_DEFS, STATIC_OBSTACLE_DEFS, FUEL_STATION_DEFS, CITIES } from '../constants.js';
import { clamp } from '../utils.js';
import { NPCVehicle, StaticObstacle } from '../entities/Obstacle.js';
import { FuelStation } from '../entities/FuelStation.js';

export class GameEngine {
  constructor() {
    this.canvas=null; this.ctx=null; this.W=0; this.H=0;
    this.state=GAME_STATE.MAIN_MENU; this.lastTime=0; this._prevState=null;
    this._gameOverReason='fuel';

    // Injected modules
    this.input=null; this.camera=null; this.physics=null; this.renderer=null;
    this.truck=null; this.missions=null; this.economy=null; this.upgrades=null;
    this.saveSystem=null; this.notif=null; this.hud=null; this.menu=null;
    this.audio=null; this.weather=null; this.progression=null;
    this.achievements=null; this.dailyReward=null; this.maintenance=null;
    this.fleet=null; this.cities=null;   // ← NEW: CitySystem

    this.obstacles=[]; this.fuelStations=[];
    this.timeOfDay=0.25; this.dayDuration=300;

    this.stats = {
      maxSpeedReached:0, offRoadKm:0, maxSingleHit:0,
      lastRunClean:false, allUpgradesMax:false,
    };
  }

  init(canvas) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.W=canvas.width=window.innerWidth; this.H=canvas.height=window.innerHeight;
    window.addEventListener('resize',()=>{
      this.W=canvas.width=window.innerWidth; this.H=canvas.height=window.innerHeight;
      this.renderer?.resize(this.W,this.H);
    });
    this.renderer?.resize(this.W,this.H);
    return this;
  }

  loadSave() {
    const data=this.saveSystem.load();
    const state=this._stateObj();
    this.saveSystem.applyTo(data,state);
    this.fleet.applyToTruck(this.truck);
    // Sync city unlocks with player level (in case they loaded a save with higher level)
    this.cities.checkUnlocks(this.progression.level, null);
    // Daily reward
    if (this.dailyReward.checkLogin()) this.setState(GAME_STATE.DAILY_REWARD);
  }

  _stateObj() {
    return {
      economy:this.economy, fleet:this.fleet, progression:this.progression,
      achievements:this.achievements, dailyReward:this.dailyReward,
      cities:this.cities, missions:this.missions, truck:this.truck, stats:this.stats,
    };
  }

  _save() {
    this.fleet.syncFromTruck(this.truck);
    this.saveSystem.save(this._stateObj());
  }

  setState(s) { this._prevState=this.state; this.state=s; }

  _buildWorld() {
    this.obstacles    = NPC_DEFS.map(def=>new NPCVehicle(def));
    for (const def of STATIC_OBSTACLE_DEFS) this.obstacles.push(new StaticObstacle(def));
    this.fuelStations = FUEL_STATION_DEFS.map(def=>new FuelStation(def));
  }

  _startMission(idx) {
    this._buildWorld();
    const def = this.missions.displayMissions[idx];
    if (!def) return;

    // Spawn truck near origin city (on the road)
    const spawn = this.cities.spawnPosFor(def.fromCity || 'KARACHI');
    this.truck.x=spawn.x; this.truck.y=spawn.y; this.truck.angle=spawn.angle;
    this.fleet.applyToTruck(this.truck);
    this.truck.resetForMission();
    this.truck.x=spawn.x; this.truck.y=spawn.y; this.truck.angle=spawn.angle;

    this.camera.snapTo(this.truck.x,this.truck.y);
    this.missions.startMission(idx);
    this.timeOfDay=0.25; this.weather.forceWeather('SUNNY');
    this.audio?.startEngine();
    this.setState(GAME_STATE.DRIVING);
  }

  // ── Update ────────────────────────────────────────────────
  update(dt) {
    this.saveSystem.tick(dt,this._stateObj());
    this.weather?.update(dt,this.audio);
    this.fleet?.tick(dt,this.economy);

    if (this.state===GAME_STATE.DRIVING) this._updateDriving(dt);

    this.notif.update(dt);
  }

  _updateDriving(dt) {
    const {truck,input,physics,camera,missions,fuelStations,notif,economy,audio,weather}=this;
    const fx=weather.effects;

    if (input.wasPressed('Escape')){this.setState(GAME_STATE.PAUSED);return;}
    if (input.wasPressed('u')||input.wasPressed('U')){this.setState(GAME_STATE.GARAGE);return;}
    if (input.wasPressed('m')||input.wasPressed('M')){this.setState(GAME_STATE.COUNTRY_MAP);return;}
    if (input.wasPressed('h')||input.wasPressed('H')) audio?.horn();

    if (input.accel)      truck.accelerate(dt);
    else if(input.brakei) truck.brake(dt);
    else                  truck.coast(dt);
    if(input.steerL) truck.turnLeft(dt);
    if(input.steerR) truck.turnRight(dt);

    const onRoad=physics.distToRoad(truck.x,truck.y)<50;
    if (!onRoad){truck.speed*=(1-0.6*dt);this.stats.offRoadKm+=truck.speedAbs*dt;}
    truck.update(dt,fx.traction);
    truck.consumeFuel(dt,fx.fuelMult,this.maintenance.getFuelMult(truck));
    this.maintenance.update(truck,dt);

    if (truck.fuel<=0&&truck.speedAbs<0.5){missions.cancelMission(truck);this.setState(GAME_STATE.GAME_OVER);this._gameOverReason='fuel';return;}
    if (truck.health<=0){missions.cancelMission(truck);this.setState(GAME_STATE.GAME_OVER);this._gameOverReason='health';return;}

    for (const obs of this.obstacles) obs.update(dt);
    const dmg=physics.checkCollisions(truck,this.obstacles,camera,notif);
    if (dmg>this.stats.maxSingleHit) this.stats.maxSingleHit=dmg;
    if (dmg>0) audio?.collision(clamp(dmg/50,0.3,1.2));

    for (const st of fuelStations){
      if (st.isInRange(truck)){
        if(input.refuel){st.refuel(truck,economy,notif);audio?.refuel();truck.refueledThisMission=true;}
        if(input.wasPressed('r')||input.wasPressed('R')) st.repair(truck,economy,notif);
        if(input.wasPressed('t')||input.wasPressed('T')) this.maintenance.service(truck,economy,notif);
      }
    }

    const result=missions.update(truck,dt,notif,weather.isStorm,this.timeOfDay);
    if (result==='delivered'||result==='time_failed'){
      const lc=missions.lastCompleted;
      economy.earn(lc.reward,`Delivery: ${lc.mission.name}`);
      audio?.success();
      const xpGain=this.progression.calcDeliveryXP(lc.noDamage,missions.completedOnTime,truck.totalKm);
      this.progression.addXP(xpGain,notif);

      // Level-up rewards
      let lvlR=this.progression.popReward();
      while(lvlR){
        if(lvlR.reward?.money) economy.earn(lvlR.reward.money,`Level ${lvlR.level} bonus`);
        audio?.levelUp();
        // City unlocks triggered by level
        const newCities=this.cities.checkUnlocks(this.progression.level,notif);
        lvlR=this.progression.popReward();
      }
      // Mark city as delivered
      if (lc.toCity) this.cities.markDelivered(lc.toCity);

      this.stats.lastRunClean=lc.noDamage;
      this.stats.allUpgradesMax=truck.engineLevel===3&&truck.handlingLevel===3&&truck.brakeLevel===3&&truck.fuelTankLevel===3;
      if(truck.speedAbs>this.stats.maxSpeedReached) this.stats.maxSpeedReached=truck.speedAbs;

      const as={
        missionCount:missions.missionCount, totalEarned:economy.totalEarned,
        maxSpeedReached:this.stats.maxSpeedReached, totalKm:truck.totalKm,
        offRoadKm:this.stats.offRoadKm, lastRunClean:this.stats.lastRunClean,
        cleanStreak:missions.cleanStreak, maxSingleHit:this.stats.maxSingleHit,
        allUpgradesMax:this.stats.allUpgradesMax, fleetSize:this.fleet.fleetSize,
        playerLevel:this.progression.level,
        deliveredInStorm:missions.deliveredInStorm, deliveredAtNight:missions.deliveredAtNight,
        cargoTypesDelivered:missions.cargoTypesDelivered.size, lastNoRefuel:missions.lastNoRefuel,
        loginStreak:this.dailyReward.streak,
        citiesDelivered:missions.citiesDelivered,
      };
      this.achievements.check(as,notif,audio);
      this.fleet.syncFromTruck(truck);
      this._save();
      this.setState(GAME_STATE.MISSION_COMPLETE);
      return;
    }

    this.timeOfDay=(this.timeOfDay+dt/this.dayDuration)%1;
    audio?.updateEngine(truck.speedAbs,truck.maxSpeed);
    camera.follow(truck,dt);
  }

  // ── Render ────────────────────────────────────────────────
  render(dt) {
    const {ctx,W,H,renderer,truck,camera,missions,fuelStations,hud,menu,
           economy,upgrades,input,notif,progression,weather,maintenance,fleet,audio,cities}=this;
    ctx.clearRect(0,0,W,H);

    switch(this.state){
      case GAME_STATE.MAIN_MENU:{
        const act=menu.drawMainMenu(dt,missions.missionCount,economy.money,progression.level,progression.currentTitle,input.mouse,W,H);
        if(act==='play'){missions.refreshPool(progression.level,cities.getUnlocked());this.setState(GAME_STATE.MISSION_SELECT);}
        if(act==='garage')       this.setState(GAME_STATE.GARAGE);
        if(act==='achievements') this.setState(GAME_STATE.ACHIEVEMENTS);
        if(act==='fleet')        this.setState(GAME_STATE.FLEET);
        if(act==='profile')      this.setState(GAME_STATE.PROFILE);
        if(act==='settings')     this.setState(GAME_STATE.SETTINGS);
        break;}
      case GAME_STATE.DAILY_REWARD:{
        const act=menu.drawDailyReward(this.dailyReward,input.mouse,W,H);
        if(act==='claim'){
          const r=this.dailyReward.claim();
          if(r){economy.earn(r.money,'Daily Reward');progression.addXP(r.xp,notif);audio?.success();this._save();}
          this.setState(GAME_STATE.MAIN_MENU);
        }
        break;}
      case GAME_STATE.MISSION_SELECT:{
        const{action,selectedIdx}=menu.drawMissionSelect(missions,cities,input.mouse,W,H);
        missions.selectedIdx=selectedIdx;
        if(action==='accept') this._startMission(selectedIdx);
        if(action==='refresh'){missions.refreshPool(progression.level,cities.getUnlocked());notif.notify('New contracts available!','#3498DB',2);}
        if(action==='map')    this.setState(GAME_STATE.COUNTRY_MAP);
        if(action==='back')   this.setState(GAME_STATE.MAIN_MENU);
        break;}
      case GAME_STATE.COUNTRY_MAP:{
        renderer.drawCountryMap(ctx,W,H,CITIES,truck,missions,cities.getUnlocked());
        // Only ESC closes (not M, to avoid same-frame re-close when M was used to open)
        if(input.wasPressed('Escape'))
          this.setState(this._prevState||GAME_STATE.MAIN_MENU);
        const btnX=W-148, btnY=22;
        ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.strokeStyle='#888'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.roundRect(btnX,btnY,126,42,8); ctx.fill(); ctx.stroke();
        const hov=input.mouse.x>=btnX&&input.mouse.x<=btnX+126&&input.mouse.y>=btnY&&input.mouse.y<=btnY+42;
        ctx.fillStyle=hov?'#FFD700':'#FFF'; ctx.font='bold 14px Segoe UI'; ctx.textAlign='center';
        ctx.fillText('✕  Close (M)',btnX+63,btnY+26); ctx.textAlign='left';
        if(hov&&input.mouse.clicked) this.setState(this._prevState||GAME_STATE.MAIN_MENU);
        break;}
      case GAME_STATE.GARAGE:{
        const{action,upgradeKey,svcAction}=menu.drawGarage(truck,economy,upgrades,fleet,maintenance,input.mouse,W,H);
        if(upgradeKey){
          const res=upgrades.upgrade(truck,upgradeKey);
          notif.notify(res.message,res.success?'#2ECC71':'#E74C3C',2.5);
          if(res.success){audio?.uiClick();fleet.syncFromTruck(truck);this._save();}
        }
        if(svcAction==='service'){const r=maintenance.service(truck,economy,notif);if(r.success){fleet.syncFromTruck(truck);this._save();}}
        if(action==='back') this.setState(GAME_STATE.MAIN_MENU);
        break;}
      case GAME_STATE.DRIVING:
      case GAME_STATE.PAUSED:{
        this._renderWorld();
        hud.render(truck,missions,economy,progression,weather,W,H,this.timeOfDay);
        if(this.state===GAME_STATE.PAUSED){
          const act=menu.drawPause(input.mouse,W,H);
          if(act==='resume')  this.setState(GAME_STATE.DRIVING);
          if(act==='garage')  this.setState(GAME_STATE.GARAGE);
          if(act==='settings')this.setState(GAME_STATE.SETTINGS);
          if(act==='menu'){audio?.stopEngine();missions.cancelMission(truck);this.setState(GAME_STATE.MAIN_MENU);}
        }
        break;}
      case GAME_STATE.MISSION_COMPLETE:{
        this._renderWorld();
        hud.render(truck,missions,economy,progression,weather,W,H,this.timeOfDay);
        const act=menu.drawMissionComplete(missions.lastCompleted,input.mouse,W,H);
        if(act==='next'){truck.resetForMission();missions.refreshPool(progression.level,cities.getUnlocked());this.setState(GAME_STATE.MISSION_SELECT);}
        if(act==='garage'){truck.resetForMission();this.setState(GAME_STATE.GARAGE);}
        break;}
      case GAME_STATE.GAME_OVER:{
        this._renderWorld();
        hud.render(truck,missions,economy,progression,weather,W,H,this.timeOfDay);
        const act=menu.drawGameOver(this._gameOverReason,input.mouse,W,H);
        if(act==='retry'){truck.resetForMission();this._buildWorld();missions.refreshPool(progression.level,cities.getUnlocked());this.setState(GAME_STATE.MISSION_SELECT);}
        if(act==='menu'){audio?.stopEngine();truck.resetForMission();this.setState(GAME_STATE.MAIN_MENU);}
        break;}
      case GAME_STATE.ACHIEVEMENTS:{const act=menu.drawAchievements(this.achievements,input.mouse,W,H);if(act==='back') this.setState(GAME_STATE.MAIN_MENU);break;}
      case GAME_STATE.FLEET:{const act=menu.drawFleet(fleet,economy,progression,input.mouse,W,H);if(act==='back'){fleet.syncFromTruck(truck);this._save();this.setState(GAME_STATE.MAIN_MENU);}break;}
      case GAME_STATE.PROFILE:{const act=menu.drawProfile(progression,missions,economy,this.achievements,input.mouse,W,H);if(act==='back') this.setState(GAME_STATE.MAIN_MENU);break;}
      case GAME_STATE.SETTINGS:{
        const act=menu.drawSettings(audio,input.mouse,W,H);
        if(act==='toggleMute') audio?.toggleMute();
        if(act==='resetSave'){this.saveSystem.reset();notif.notify('Save reset!','#E74C3C',3);}
        if(act==='close') this.setState(this._prevState||GAME_STATE.MAIN_MENU);
        break;}
    }

    notif.draw(ctx,camera,W,H);
    if(this.state===GAME_STATE.DRIVING) this.input.drawTouchControls(ctx,W,H);
    if(this.state===GAME_STATE.DRIVING||this.state===GAME_STATE.PAUSED)
      weather?.drawOverlay(ctx,W,H,this.timeOfDay);

    this.input.clearFrame();
  }

  _renderWorld(){
    const{renderer,truck,camera,missions,fuelStations,obstacles}=this;
    renderer.drawBackground(this.timeOfDay, camera.x);
    renderer.drawTerrain(camera,this.timeOfDay);
    renderer.drawRoad(camera);
    renderer.drawFuelStations(fuelStations,camera,truck);
    renderer.drawCities(camera,this.cities.getUnlocked());
    renderer.drawMissionMarkers(missions.markerData,camera,truck);
    renderer.drawObstacles(obstacles,camera);
    renderer.drawTruck(truck,camera);
    renderer.drawDayNightOverlay(this.timeOfDay);
  }

  gameLoop(ts){
    const dt=clamp((ts-this.lastTime)/1000,0,0.05);
    this.lastTime=ts;
    this.update(dt);
    this.render(dt);
    requestAnimationFrame(t=>this.gameLoop(t));
  }
  start(){ requestAnimationFrame(ts=>{this.lastTime=ts;this.gameLoop(ts);}); }
}
