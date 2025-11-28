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
    this.loadSfx('powerup-time', '/sfx/34.mp3');
    this.loadSfx('powerup-god', '/sfx/34.mp3');
    this.loadSfx('ball-collision', '/sfx/35.mp3');
    this.loadSfx('woodstock-collect', '/sfx/36.mp3');
    this.loadSfx('block-break', '/sfx/37.mp3');
    this.loadSfx('block-break-item', '/sfx/38.mp3');
    this.loadSfx('pause', '/sfx/39.mp3');
    this.loadSfx('timer', '/sfx/40.mp3');
    this.loadSfx('teleport', '/sfx/41.mp3');
  }

  /**
   * Play a music track
   */
  playMusic(name) {
    const audio = this.music[name];
    if (!audio) {
      console.warn(`Music '${name}' not found`);
      return;
    }

    // Stop current music if playing
    this.stopMusic();

    // Reset and prepare for playback
    audio.currentTime = 0;
    audio.playbackRate = 1.0; // Reset playback speed to normal

    // Set as current music immediately (before play promise)
    this.currentMusic = audio;

    // Function to attempt playback
    const attemptPlay = () => {
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Playback started successfully
            console.log(`Music '${name}' playing`);
          })
          .catch(error => {
            console.warn(`Could not play music '${name}':`, error);
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
      console.log(`Waiting for music '${name}' to load...`);

      const onCanPlay = () => {
        console.log(`Music '${name}' loaded, playing now`);
        attemptPlay();
        audio.removeEventListener('canplay', onCanPlay);
      };

      audio.addEventListener('canplay', onCanPlay);

      // Fallback timeout (15 seconds for heavy files)
      setTimeout(() => {
        if (audio.readyState < 3) {
          console.warn(`Music '${name}' failed to load in time`);
          audio.removeEventListener('canplay', onCanPlay);
          if (this.currentMusic === audio) {
            this.currentMusic = null;
          }
        }
      }, 15000);
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
    if (!audio) {
      console.warn(`Sound effect '${name}' not found`);
      return;
    }

    // Check if audio is ready (readyState >= 3 means we have enough data)
    if (audio.readyState < 3) {
      console.warn(`Sound effect '${name}' not ready yet (readyState: ${audio.readyState})`);
      return;
    }

    // Clone the audio to allow multiple instances
    const sfxInstance = audio.cloneNode();
    sfxInstance.volume = this.sfxVolume;
    sfxInstance.play().catch(error => {
      console.warn(`Could not play sound effect '${name}':`, error);
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
