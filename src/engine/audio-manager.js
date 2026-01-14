import { devLog, devWarn } from '../utils/dev-logger.js';
import { getAssetPath } from '../utils/asset-path.js';

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

    // Loop points configuration: { musicName: loopStartTime }
    // When a music with loop point ends, it will restart at this time instead of 0
    this.loopPoints = {};
    this.loopListeners = {}; // Store event listeners for cleanup
  }

  /**
   * Load a music track
   * @param {string} name - Music identifier
   * @param {string} path - Path to audio file
   * @param {boolean} loop - Whether to loop (ignored if loopPoint is set)
   * @param {number|null} loopPoint - Time in seconds where the loop should restart (null = loop from start)
   */
  loadMusic(name, path, loop = true, loopPoint = null) {
    const audio = new Audio(path);
    audio.volume = this.musicVolume;
    audio.preload = 'auto'; // Preload the audio file

    // If loopPoint is specified, we handle looping manually
    if (loopPoint !== null) {
      audio.loop = false; // Disable native loop
      this.loopPoints[name] = loopPoint;
    } else {
      audio.loop = loop;
    }

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
    this.loadMusic('title', getAssetPath('music/01-BGM-01.mp3'));

    // Power-up music
    this.loadMusic('invincible', getAssetPath('music/22-BGM-12.mp3'));
    this.loadMusic('frozen-time', getAssetPath('music/23-BGM-13.mp3'));

    // Game state music
    this.loadMusic('miss', getAssetPath('music/25-Jingle-11.mp3'), false); // Don't loop defeat music
    this.loadMusic('game-over', getAssetPath('music/26-Jingle-12.mp3'), false); // Don't loop game over music
    this.loadMusic('stage-clear', getAssetPath('music/24-BGM-14.mp3'), false); // Generic stage clear music
    this.loadMusic('ending', getAssetPath('music/29-BGM-16.mp3'), true); // Ending screen music (loops)

    // Stage music (all 9 stages)
    this.loadMusic('stage-bgm-2', getAssetPath('music/02-BGM-02.mp3'));
    this.loadMusic('stage-clear-1', getAssetPath('music/03-Jingle-01.mp3'), false);

    this.loadMusic('stage-bgm-3', getAssetPath('music/04-BGM-03.mp3'));
    this.loadMusic('stage-clear-2', getAssetPath('music/05-Jingle-02.mp3'), false);

    this.loadMusic('stage-bgm-4', getAssetPath('music/06-BGM-04.mp3'));
    this.loadMusic('stage-clear-3', getAssetPath('music/07-Jingle-03.mp3'), false);

    this.loadMusic('stage-bgm-5', getAssetPath('music/08-BGM-05.mp3'));
    this.loadMusic('stage-clear-4', getAssetPath('music/09-Jingle-04.mp3'), false);

    this.loadMusic('stage-bgm-6', getAssetPath('music/10-BGM-06.mp3'));
    this.loadMusic('stage-clear-5', getAssetPath('music/11-Jingle-05.mp3'), false);

    this.loadMusic('stage-bgm-7', getAssetPath('music/12-BGM-07.mp3'));
    this.loadMusic('stage-clear-6', getAssetPath('music/13-Jingle-06.mp3'), false);

    this.loadMusic('stage-bgm-8', getAssetPath('music/14-BGM-08.mp3'));
    this.loadMusic('stage-clear-7', getAssetPath('music/15-Jingle-07.mp3'), false);

    this.loadMusic('stage-bgm-9', getAssetPath('music/16-BGM-09.mp3'));
    this.loadMusic('stage-clear-8', getAssetPath('music/17-Jingle-08.mp3'), false);

    this.loadMusic('stage-bgm-10', getAssetPath('music/18-BGM-10.mp3'));
    this.loadMusic('stage-clear-9', getAssetPath('music/19-Jingle-09.mp3'), false);

    // stage-bgm-11 with custom loop point
    this.loadMusic('stage-bgm-11', getAssetPath('music/20-BGM-11.mp3'), true, 1.75);
    this.loadMusic('stage-clear-10', getAssetPath('music/21-Jingle-10.mp3'), false);

    // Sound effects
    this.loadSfx('powerup-time', getAssetPath('sfx/34.mp3'));
    this.loadSfx('powerup-god', getAssetPath('sfx/34.mp3'));
    this.loadSfx('ball-collision', getAssetPath('sfx/35.mp3'));
    this.loadSfx('woodstock-collect', getAssetPath('sfx/36.mp3'));
    this.loadSfx('block-break', getAssetPath('sfx/37.mp3'));
    this.loadSfx('block-break-item', getAssetPath('sfx/38.mp3'));
    this.loadSfx('pause', getAssetPath('sfx/39.mp3'));
    this.loadSfx('timer', getAssetPath('sfx/40.mp3'));
    this.loadSfx('teleport', getAssetPath('sfx/41.mp3'));
  }

  /**
   * Play a music track
   */
  playMusic(name) {
    const audio = this.music[name];
    if (!audio) {
      devWarn(`Music '${name}' not found`);
      return;
    }

    // Stop current music if playing
    this.stopMusic();

    // Reset and prepare for playback
    audio.currentTime = 0;
    audio.playbackRate = 1.0; // Reset playback speed to normal

    // Set as current music immediately (before play promise)
    this.currentMusic = audio;

    // Setup custom loop if loopPoint is defined for this music
    if (this.loopPoints[name] !== undefined) {
      // Remove previous listener if exists
      if (this.loopListeners[name]) {
        audio.removeEventListener('ended', this.loopListeners[name]);
      }

      // Create loop handler
      const loopHandler = () => {
        // Restart at loop point
        audio.currentTime = this.loopPoints[name];
        audio.play().catch(error => {
          devWarn(`Could not restart music '${name}' at loop point:`, error);
        });
      };

      // Store listener for cleanup
      this.loopListeners[name] = loopHandler;
      audio.addEventListener('ended', loopHandler);
    }

    // Function to attempt playback
    const attemptPlay = () => {
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Playback started successfully
            devLog(`Music '${name}' playing`);
          })
          .catch(error => {
            devWarn(`Could not play music '${name}':`, error);
            // Clear current music if playback failed
            if (this.currentMusic === audio) {
              this.currentMusic = null;
            }
          });
      }
    };

    // Check if audio is ready to play
    // readyState 4 = HAVE_ENOUGH_DATA, 3 = HAVE_FUTURE_DATA (both are playable)
    if (audio.readyState >= 3) {
      // Audio is ready, play immediately
      attemptPlay();
    } else {
      // Audio not ready yet, wait for it to load
      devLog(`Waiting for music '${name}' to load...`);

      const onCanPlay = () => {
        devLog(`Music '${name}' loaded, playing now`);
        attemptPlay();
        audio.removeEventListener('canplay', onCanPlay);
      };

      audio.addEventListener('canplay', onCanPlay);

      // Fallback timeout (5 seconds - enough for optimized files)
      setTimeout(() => {
        if (audio.readyState < 3) {
          devWarn(`Music '${name}' failed to load in time`);
          audio.removeEventListener('canplay', onCanPlay);
          if (this.currentMusic === audio) {
            this.currentMusic = null;
          }
        }
      }, 5000);
    }
  }

  /**
   * Stop current music
   */
  stopMusic() {
    // Remove all loop listeners before stopping
    Object.keys(this.loopListeners).forEach(musicName => {
      const audio = this.music[musicName];
      const listener = this.loopListeners[musicName];
      if (audio && listener) {
        audio.removeEventListener('ended', listener);
      }
    });

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
        devWarn('Could not resume music:', error);
      });
    }
  }

  /**
   * Play a sound effect
   */
  playSfx(name) {
    const audio = this.sfx[name];
    if (!audio) {
      devWarn(`Sound effect '${name}' not found`);
      return;
    }

    // Check if audio is ready (readyState >= 3 means we have enough data)
    if (audio.readyState < 3) {
      devWarn(`Sound effect '${name}' not ready yet (readyState: ${audio.readyState})`);
      return;
    }

    // Clone the audio to allow multiple instances
    const sfxInstance = audio.cloneNode();
    sfxInstance.volume = this.sfxVolume;
    sfxInstance.play().catch(error => {
      devWarn(`Could not play sound effect '${name}':`, error);
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
