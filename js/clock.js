/**
 * AnalogClock - Renders a kid-friendly analog clock with a colored time-block overlay.
 */
class AnalogClock {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.overlay = null; // { startAngle, endAngle, color }
    this.dpr = window.devicePixelRatio || 1;
    this._setupHiDPI();

    // Kid-friendly colors for each hour number
    this.numberColors = [
      '#E53E3E', '#DD6B20', '#D69E2E', '#38A169',
      '#319795', '#3182CE', '#5A67D8', '#805AD5',
      '#B83280', '#E53E3E', '#DD6B20', '#D69E2E'
    ];
  }

  _setupHiDPI() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.size = rect.width;
    this.center = this.size / 2;
    this.radius = this.center - 10;
  }

  /**
   * Set the overlay wedge for the current task.
   * @param {Date} startTime - When the task started
   * @param {Date} endTime - When the task ends
   * @param {string} color - CSS color for the overlay
   */
  setOverlay(startTime, endTime, color) {
    this.overlay = { startTime, endTime, color };
  }

  clearOverlay() {
    this.overlay = null;
  }

  /**
   * Convert a Date to an angle on the clock face (12 o'clock = -PI/2).
   * Uses hours and minutes for a smooth position on the 12-hour dial.
   */
  _timeToAngle(date) {
    const hours = date.getHours() % 12;
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const totalMinutes = hours * 60 + minutes + seconds / 60;
    // 720 minutes = full circle, 12 o'clock = -PI/2
    return ((totalMinutes / 720) * Math.PI * 2) - Math.PI / 2;
  }

  _drawFace() {
    const ctx = this.ctx;
    const cx = this.center;
    const cy = this.center;
    const r = this.radius;

    // Clock background
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fefefe';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Minute ticks
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const isHour = i % 5 === 0;
      const innerR = isHour ? r - 18 : r - 10;
      const outerR = r - 4;

      ctx.beginPath();
      ctx.moveTo(
        cx + Math.cos(angle) * innerR,
        cy + Math.sin(angle) * innerR
      );
      ctx.lineTo(
        cx + Math.cos(angle) * outerR,
        cy + Math.sin(angle) * outerR
      );
      ctx.strokeStyle = isHour ? '#4a5568' : '#cbd5e0';
      ctx.lineWidth = isHour ? 2.5 : 1;
      ctx.stroke();
    }

    // Hour numbers
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${r * 0.15}px 'Segoe UI', system-ui, sans-serif`;

    for (let i = 1; i <= 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const numR = r - 35;
      const x = cx + Math.cos(angle) * numR;
      const y = cy + Math.sin(angle) * numR;

      // Colored circle behind number
      ctx.beginPath();
      ctx.arc(x, y, r * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = this.numberColors[i - 1];
      ctx.fill();

      // White number
      ctx.fillStyle = '#ffffff';
      ctx.fillText(i.toString(), x, y);
    }
  }

  /**
   * Convert a Date to an angle on the minute-hand scale (60 min = full circle).
   * Used for the overlay so that task durations are visually proportional.
   */
  _timeToMinuteAngle(date) {
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return ((minutes + seconds / 60) / 60) * Math.PI * 2 - Math.PI / 2;
  }

  _drawOverlay(now) {
    if (!this.overlay) return;

    const ctx = this.ctx;
    const cx = this.center;
    const cy = this.center;
    const r = this.radius - 22;

    const { startTime, endTime, color } = this.overlay;

    // Only draw if there's still time left
    if (now >= endTime) return;

    // Use minute-hand scale: 60 min = full circle
    // This way a 15-min task covers a quarter of the clock
    const currentAngle = this._timeToMinuteAngle(now);
    const remainingMs = endTime.getTime() - now.getTime();
    const remainingMinutes = remainingMs / 60000;
    const sweepAngle = (remainingMinutes / 60) * Math.PI * 2;
    const endAngle = currentAngle + sweepAngle;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, currentAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = color + '40'; // 25% opacity
    ctx.fill();
    ctx.strokeStyle = color + '80';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  _drawHands(now) {
    const ctx = this.ctx;
    const cx = this.center;
    const cy = this.center;
    const r = this.radius;

    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const millis = now.getMilliseconds();

    // Hour hand
    const hourAngle = ((hours + minutes / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    this._drawHand(ctx, cx, cy, hourAngle, r * 0.5, 5, '#2d3748');

    // Minute hand
    const minuteAngle = ((minutes + seconds / 60) / 60) * Math.PI * 2 - Math.PI / 2;
    this._drawHand(ctx, cx, cy, minuteAngle, r * 0.7, 3, '#4a5568');

    // Second hand
    const secondAngle = ((seconds + millis / 1000) / 60) * Math.PI * 2 - Math.PI / 2;
    this._drawHand(ctx, cx, cy, secondAngle, r * 0.75, 1.5, '#e53e3e');

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#2d3748';
    ctx.fill();
  }

  _drawHand(ctx, cx, cy, angle, length, width, color) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(angle) * length,
      cy + Math.sin(angle) * length
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  render(now) {
    const ctx = this.ctx;
    // Clear
    ctx.clearRect(0, 0, this.size, this.size);

    this._drawFace();
    this._drawOverlay(now);
    this._drawHands(now);
  }
}
