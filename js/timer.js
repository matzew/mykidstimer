/**
 * CountdownTimer - Digital countdown timer with callbacks.
 */
class CountdownTimer {
  constructor() {
    this.endTime = null;
    this.totalDuration = 0; // in ms
    this.running = false;
    this.paused = false;
    this.pausedRemaining = 0;

    this.onTick = null;   // (remainingMs) => void
    this.onFinish = null; // () => void
  }

  /**
   * Start the timer for a given duration in minutes.
   */
  start(durationMinutes) {
    this.totalDuration = durationMinutes * 60 * 1000;
    this.endTime = new Date(Date.now() + this.totalDuration);
    this.running = true;
    this.paused = false;
  }

  pause() {
    if (!this.running || this.paused) return;
    this.pausedRemaining = this.endTime.getTime() - Date.now();
    this.paused = true;
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.endTime = new Date(Date.now() + this.pausedRemaining);
    this.paused = false;
  }

  stop() {
    this.running = false;
    this.paused = false;
    this.endTime = null;
  }

  /**
   * Get the end time as a Date (for the clock overlay).
   */
  getEndTime() {
    if (this.paused) {
      return new Date(Date.now() + this.pausedRemaining);
    }
    return this.endTime;
  }

  /**
   * Get the start time as a Date (for the clock overlay).
   */
  getStartTime() {
    if (!this.endTime) return null;
    return new Date(this.endTime.getTime() - this.totalDuration);
  }

  /**
   * Call this every frame. Returns remaining ms or 0 if finished.
   */
  tick() {
    if (!this.running) return -1;
    if (this.paused) {
      if (this.onTick) this.onTick(this.pausedRemaining);
      return this.pausedRemaining;
    }

    const remaining = this.endTime.getTime() - Date.now();

    if (remaining <= 0) {
      this.running = false;
      if (this.onTick) this.onTick(0);
      if (this.onFinish) this.onFinish();
      return 0;
    }

    if (this.onTick) this.onTick(remaining);
    return remaining;
  }

  /**
   * Format milliseconds as MM:SS string.
   */
  static formatTime(ms) {
    if (ms <= 0) return '00:00';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
