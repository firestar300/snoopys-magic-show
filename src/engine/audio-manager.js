/**
 * Manages game audio (music and sound effects)
 */
export class AudioManager {
  constructor() {
    this.music = {};
    this.sfx = {};
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
   * Load a sound effect
   */
  loadSfx(name, path) {
    const audio = new Audio(path);
    audio.loop = false;
    audio.volume = this.sfxVolume;
    audio.preload = 'auto';
    audio.load();
    this.sfx[name] = audio;
  }

  /**
   * Load all music tracks and sound effects
   */
  loadAll() {
    // UI music
    this.loadMusic('title', '/music/01-BGM-01.mp3');

    // Power-up music
    this.loadMusic('invincible', '/music/22-BGM-12.mp3');
    this.loadMusic('frozen-time', '/music/23-BGM-13.mp3');

    // Game state music
    this.loadMusic('miss', '/music/25-Jingle-11.mp3', false); // Don't loop defeat music
    this.loadMusic('game-over', '/music/26-Jingle-12.mp3', false); // Don't loop game over music
    this.loadMusic('stage-clear', '/music/24-BGM-14.mp3', false); // Generic stage clear music

    // Stage music (all 9 stages)
    this.loadMusic('stage-bgm-2', '/music/02-BGM-02.mp3');
    this.loadMusic('stage-clear-1', '/music/03-Jingle-01.mp3', false);

    this.loadMusic('stage-bgm-3', '/music/04-BGM-03.mp3');
    this.loadMusic('stage-clear-2', '/music/05-Jingle-02.mp3', false);

    this.loadMusic('stage-bgm-4', '/music/06-BGM-04.mp3');
    this.loadMusic('stage-clear-3', '/music/07-Jingle-03.mp3', false);

    this.loadMusic('stage-bgm-5', '/music/08-BGM-05.mp3');
    this.loadMusic('stage-clear-4', '/music/09-Jingle-04.mp3', false);

    this.loadMusic('stage-bgm-6', '/music/10-BGM-06.mp3');
    this.loadMusic('stage-clear-5', '/music/11-Jingle-05.mp3', false);

    this.loadMusic('stage-bgm-7', '/music/12-BGM-07.mp3');
    this.loadMusic('stage-clear-6', '/music/13-Jingle-06.mp3', false);

    this.loadMusic('stage-bgm-8', '/music/14-BGM-08.mp3');
    this.loadMusic('stage-clear-7', '/music/15-Jingle-07.mp3', false);

    this.loadMusic('stage-bgm-9', '/music/16-BGM-09.mp3');
    this.loadMusic('stage-clear-8', '/music/17-Jingle-08.mp3', false);

    this.loadMusic('stage-bgm-10', '/music/19-BGM-10.mp3');
    this.loadMusic('stage-clear-9', '/music/18-Jingle-09.mp3', false);

    this.loadMusic('stage-bgm-11', '/music/20-BGM-11.mp3');
    this.loadMusic('stage-clear-10', '/music/21-Jingle-10.mp3', false);

    // Sound effects
    this.loadSfx('teleport', '/sfx/teleportation.mp3');
    this.loadSfx('block-break', '/sfx/block-broken.mp3');
    this.loadSfx('powerup-time', '/sfx/powerup-time.mp3');
    this.loadSfx('powerup-god', '/sfx/powerup-god.mp3');
    this.loadSfx('ball-collision', '/sfx/ball-collision.mp3');
    this.loadSfx('pause', '/sfx/pause.mp3');
    this.loadSfx('woodstock-collect', '/sfx/woodstock-collected.mp3');
    this.loadSfx('timer', '/sfx/timer.mp3');
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
    audio.playbackRate = 1.0; // Reset playback speed to normal

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
    // Stop all music (not just currentMusic) to prevent race conditions
    Object.values(this.music).forEach(audio => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    this.currentMusic = null;
  }

  /**
   * Pause current music (without resetting)
   */
  pauseMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause();
    }
  }

  /**
   * Resume current music
   */
  resumeMusic() {
    if (this.currentMusic) {
      this.currentMusic.play().catch(error => {
        console.warn('Could not resume music:', error);
      });
    }
  }

  /**
   * Play a sound effect
   */
  playSfx(name) {
    const audio = this.sfx[name];
    if (!audio) return;

    // Clone the audio to allow multiple instances
    const sfxInstance = audio.cloneNode();
    sfxInstance.volume = this.sfxVolume;
    sfxInstance.play().catch(error => {
      console.warn('Could not play sound effect:', error);
    });
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

  /**
   * Set music playback speed
   */
  setMusicSpeed(speed) {
    if (this.currentMusic) {
      this.currentMusic.playbackRate = speed;
    }
  }

  /**
   * Reset music playback speed to normal
   */
  resetMusicSpeed() {
    if (this.currentMusic) {
      this.currentMusic.playbackRate = 1.0;
    }
  }
}
