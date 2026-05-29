// js/systems/TutorialSystem.js – First-time player onboarding

export const TUTORIAL_STEPS = Object.freeze([
  {
    icon:  '🚛',
    title: 'Welcome to Mohallah Logestic!',
    body:  'You are a truck driver starting your career in Pakistan. Accept contracts, deliver cargo, earn money, and build your logistics empire from the ground up.',
    hint:  null,
  },
  {
    icon:  '🎮',
    title: 'Control Your Truck',
    body:  'Use W or ↑ to accelerate, S or ↓ to brake. A/D or arrow keys to steer. The truck turns tighter at higher speeds. Try reversing with S when stopped.',
    hint:  'On mobile: use the virtual buttons at the bottom of the screen.',
  },
  {
    icon:  '📦',
    title: 'Pick Up Your Cargo',
    body:  'Drive to the pulsing GREEN marker to load your cargo. An arrow on the screen always points toward your next objective when it is off-screen.',
    hint:  'Tip: Stay on the road – driving off-road slows you down significantly.',
  },
  {
    icon:  '🗺',
    title: 'Navigate the Route',
    body:  'Follow the highway to your destination. Press M during driving to open the full Pakistan country map and see all available cities.',
    hint:  'The minimap in the bottom-left shows your position and city dots.',
  },
  {
    icon:  '⛽',
    title: 'Manage Your Fuel',
    body:  'Watch the FUEL gauge at the top-right. Drive to orange fuel stations along the route and press F to refuel. Running out of fuel ends your mission!',
    hint:  'Press R at a station to repair damage, T for full maintenance service.',
  },
  {
    icon:  '💥',
    title: 'Avoid Collisions',
    body:  'Collisions with other vehicles and roadside obstacles damage your truck and reduce your delivery reward. Fragile cargo loses extra value when damaged.',
    hint:  'Upgrade your Brakes to react faster and Handling for better steering.',
  },
  {
    icon:  '💰',
    title: 'Earn & Upgrade',
    body:  'Complete deliveries to earn money. Visit the Upgrade Garage (U key) to improve Engine, Fuel Tank, Handling, and Brakes. Unlock new cities as you level up!',
    hint:  'Press U anytime to open the Upgrade Garage. ESC to pause.',
  },
  {
    icon:  '🏢',
    title: 'Build Your Empire',
    body:  'Reach higher levels to unlock more cities, better trucks, and the Fleet screen. Hire drivers to earn passive income even while you\'re offline!',
    hint:  'Good luck, driver. Pakistan\'s roads await!',
  },
]);

export class TutorialSystem {
  constructor() {
    this.shown        = false;   // has the tutorial been completed?
    this.active       = false;   // is it showing right now?
    this.stepIdx      = 0;
    this._skipped     = false;
  }

  /** Call before first mission. Returns true if tutorial should be shown. */
  shouldShow(missionCount) {
    return !this.shown && missionCount === 0;
  }

  /** Start the tutorial */
  start() {
    this.active  = true;
    this.stepIdx = 0;
  }

  /** Advance or finish */
  next() {
    this.stepIdx++;
    if (this.stepIdx >= TUTORIAL_STEPS.length) {
      this.finish();
      return true; // done
    }
    return false;
  }

  /** Skip everything */
  skip() {
    this._skipped = true;
    this.finish();
  }

  finish() {
    this.shown  = true;
    this.active = false;
  }

  get currentStep() { return TUTORIAL_STEPS[this.stepIdx]; }
  get totalSteps()  { return TUTORIAL_STEPS.length; }
  get progress()    { return this.stepIdx / this.totalSteps; }
  get isLastStep()  { return this.stepIdx === this.totalSteps - 1; }

  // ── Serialise ─────────────────────────────────────────────
  toJSON()  { return { shown: this.shown }; }
  fromJSON(d) { if (d) this.shown = d.shown ?? false; }
}
