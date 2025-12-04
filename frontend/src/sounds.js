// Sound effects using Web Audio API - no external files needed

class SoundEffects {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if it was suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // Check if user prefers reduced motion (accessibility)
  static prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  // Play a tone with given frequency, duration, and type
  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled) return;
    this.init();

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    // Envelope for smoother sound
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  // Letter click - short pleasant click
  letterClick() {
    this.playTone(800, 0.08, 'sine', 0.2);
  }

  // Letter deselect/backspace - lower pitch
  letterRemove() {
    this.playTone(400, 0.06, 'sine', 0.15);
  }

  // Clear all letters
  clearLetters() {
    this.playTone(300, 0.1, 'triangle', 0.15);
  }

  // Shuffle letters - whoosh effect
  shuffle() {
    if (!this.enabled) return;
    this.init();

    const now = this.audioContext.currentTime;

    // Create noise for whoosh
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  // Valid word found - ascending arpeggio
  wordValid() {
    if (!this.enabled) return;

    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.25), i * 80);
    });
  }

  // Full 6-letter word found - triumphant fanfare
  wordExcellent() {
    if (!this.enabled) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.3), i * 100);
    });
    // Add a final chord
    setTimeout(() => {
      this.playTone(523, 0.4, 'sine', 0.2);
      this.playTone(659, 0.4, 'sine', 0.2);
      this.playTone(784, 0.4, 'sine', 0.2);
      this.playTone(1047, 0.4, 'sine', 0.2);
    }, 400);
  }

  // Invalid word - buzzer
  wordInvalid() {
    if (!this.enabled) return;
    this.init();

    const now = this.audioContext.currentTime;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 150;

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  // Already found word
  wordDuplicate() {
    this.playTone(200, 0.15, 'square', 0.15);
    setTimeout(() => this.playTone(180, 0.15, 'square', 0.15), 100);
  }

  // Timer warning tick
  timerTick() {
    this.playTone(1000, 0.05, 'sine', 0.1);
  }

  // Timer critical (last 10 seconds)
  timerCritical() {
    this.playTone(880, 0.08, 'square', 0.15);
  }

  // Level complete - victory jingle
  levelComplete() {
    if (!this.enabled) return;

    const melody = [
      { freq: 523, delay: 0 },     // C5
      { freq: 587, delay: 100 },   // D5
      { freq: 659, delay: 200 },   // E5
      { freq: 784, delay: 300 },   // G5
      { freq: 1047, delay: 500 },  // C6
    ];

    melody.forEach(note => {
      setTimeout(() => this.playTone(note.freq, 0.25, 'sine', 0.25), note.delay);
    });
  }

  // Game over - descending sad sound
  gameOver() {
    if (!this.enabled) return;

    const notes = [392, 349, 330, 262]; // G4, F4, E4, C4
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.2), i * 200);
    });
  }

  // Game start
  gameStart() {
    if (!this.enabled) return;

    const notes = [262, 330, 392, 523]; // C4, E4, G4, C5
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.12, 'sine', 0.2), i * 60);
    });
  }

  // Button click
  buttonClick() {
    this.playTone(600, 0.05, 'sine', 0.15);
  }
}

// Export singleton instance and class (for static methods)
const sounds = new SoundEffects();
export default sounds;
export { SoundEffects };
