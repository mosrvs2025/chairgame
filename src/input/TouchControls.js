// Pointer capture keeps each thumb attached to its control, even off the button.
export class TouchControls {
  constructor(input, onAction) {
    this.input = input;
    this.onAction = onAction;
    this.root = document.getElementById('touch-controls');
    this.stick = document.getElementById('touch-stick');
    this.knob = document.getElementById('touch-knob');
    this.buttons = new Map();
    this.enabled = false;
    this.stickPointer = null;
    this.input.move = { x: 0, z: 0 };
    this.input.touchKeys = {};
    const detect = () => document.body.classList.toggle('touch-layout',
      navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse), (max-width: 900px)').matches);
    detect();
    window.addEventListener('resize', detect);
    this.stick.addEventListener('pointerdown', e => {
      if (!this.enabled || this.stickPointer !== null) return;
      e.preventDefault();
      this.stickPointer = e.pointerId;
      this.stick.setPointerCapture(e.pointerId);
      this.moveStick(e);
    });
    this.stick.addEventListener('pointermove', e => {
      if (e.pointerId === this.stickPointer) this.moveStick(e);
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.stick.addEventListener(event, e => {
        if (e.pointerId !== this.stickPointer) return;
        this.stickPointer = null;
        this.input.move.x = this.input.move.z = 0;
        this.knob.style.transform = '';
      });
    }
    for (const button of this.root.querySelectorAll('[data-code]')) {
      const code = button.dataset.code;
      button.addEventListener('pointerdown', e => {
        if (!this.enabled || this.buttons.has(code)) return;
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        this.buttons.set(code, e.pointerId);
        this.input.touchKeys[code] = true;
        button.classList.add('pressed');
        this.onAction(code);
      });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        button.addEventListener(event, e => {
          if (this.buttons.get(code) !== e.pointerId) return;
          this.buttons.delete(code);
          this.input.touchKeys[code] = false;
          button.classList.remove('pressed');
        });
      }
    }
    this.root.addEventListener('contextmenu', e => e.preventDefault());
  }

  moveStick(e) {
    const rect = this.stick.getBoundingClientRect();
    const radius = rect.width * 0.32;
    let x = (e.clientX - rect.left - rect.width / 2) / radius;
    let z = (e.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.hypot(x, z);
    if (length > 1) { x /= length; z /= length; }
    this.input.move.x = length < 0.15 ? 0 : x;
    this.input.move.z = length < 0.15 ? 0 : z;
    this.knob.style.transform = `translate(${x * radius}px, ${z * radius}px)`;
  }

  clear() {
    this.stickPointer = null;
    this.input.move.x = this.input.move.z = 0;
    this.input.touchKeys = {};
    this.buttons.clear();
    this.knob.style.transform = '';
    this.root.querySelectorAll('.pressed').forEach(b => b.classList.remove('pressed'));
  }

  setEnabled(enabled) {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.root.hidden = !enabled;
    if (!enabled) this.clear();
  }

  update(player) {
    const cooldowns = { ShiftLeft: player.dashCooldown, KeyE: player.sabotageCooldown, KeyR: player.specialCooldown };
    for (const [code, value] of Object.entries(cooldowns)) {
      const button = this.root.querySelector(`[data-code="${code}"]`);
      button.classList.toggle('recharging', value > 0);
      button.querySelector('small').textContent = value > 0 ? `${value.toFixed(1)}s` : button.dataset.hint;
    }
    this.root.querySelector('[data-code="KeyQ"] span').textContent = player.occupiedBy ? 'LAUNCH' : player.trapMode === 'siphon' ? 'SIPHON' : 'CATAPULT';
  }
}
