/**
 * Manages game audio (music and sound effects)
 */
export class AudioManager {
  constructor() {
    this.music = {};
    this.currentMusic = null;
    this.musicVolume = 0.5;
    this.sfxVolume = 0.7;
  }

  /**
   * Load a music track
   */
  loadMusic(name, path, loop = true) {
    const audio = new Audio(path);
    audio.loop = loop;
    audio.volume = this.musicVolume;
    audio.preload = 'auto'; // Preload the audio file

    // Force load by calling load()
    audio.load();

    this.music[name] = audio;
  }

  /**
   * Load all music tracks
   */
  loadAll() {
    // UI music
    this.loadMusic('title', '/music/01-title-screen.mp3');

    // Power-up music
    this.loadMusic('invincible', '/music/03-invincible.mp3');
    this.loadMusic('frozen-time', '/music/07-frozen-time.mp3');

    // Game state music
    this.loadMusic('miss', '/music/08-miss.mp3', false); // Don't loop defeat music

    // Stage music (all 9 stages)
    this.loadMusic('stage-bgm-1', '/music/02-stage-bgm-1.mp3');
    this.loadMusic('stage-clear-1', '/music/02-stage-clear-1.mp3', false);

    this.loadMusic('stage-bgm-2', '/music/05-stage-bgm-2.mp3');
    this.loadMusic('stage-clear-2', '/music/05-stage-clear-2.mp3', false);

    this.loadMusic('stage-bgm-3', '/music/06-stage-bgm-3.mp3');
    this.loadMusic('stage-clear-3', '/music/06-stage-clear-3.mp3', false);

    this.loadMusic('stage-bgm-4', '/music/10-stage-bgm-4.mp3');
    this.loadMusic('stage-clear-4', '/music/10-stage-clear-4.mp3', false);

    this.loadMusic('stage-bgm-5', '/music/11-stage-bgm-5.mp3');
    this.loadMusic('stage-clear-5', '/music/11-stage-clear-5.mp3', false);

    this.loadMusic('stage-bgm-6', '/music/12-stage-bgm-6.mp3');
    this.loadMusic('stage-clear-6', '/music/12-stage-clear-6.mp3', false);

    this.loadMusic('stage-bgm-7', '/music/13-stage-bgm-7.mp3');
    this.loadMusic('stage-clear-7', '/music/13-stage-clear-7.mp3', false);

    this.loadMusic('stage-bgm-8', '/music/14-stage-bgm-8.mp3');
    this.loadMusic('stage-clear-8', '/music/14-stage-clear-8.mp3', false);

    this.loadMusic('stage-bgm-9', '/music/15-stage-bgm-9.mp3');
    this.loadMusic('stage-clear-9', '/music/15-stage-clear-9.mp3', false);
  }

  /**
   * Play a music track
   */
  playMusic(name) {
    const audio = this.music[name];
    if (!audio) return;

    // Stop current music if playing
    this.stopMusic();

    // Reset and play immediately
    audio.currentTime = 0;

    // Set as current music immediately (before play promise)
    this.currentMusic = audio;

    // Use play() with promise handling for better control
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Playback started successfully
        })
        .catch(error => {
          console.warn('Could not play music:', error);
          // Clear current music if playback failed
          if (this.currentMusic === audio) {
            this.currentMusic = null;
          }
        });
    }
  }

  /**
   * Stop current music
   */
  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
      this.currentMusic = null;
    }
  }

  /**
   * Set music volume
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    Object.values(this.music).forEach(audio => {
      audio.volume = this.musicVolume;
    });
  }

  /**
   * Set sound effects volume
   */
  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }
}
