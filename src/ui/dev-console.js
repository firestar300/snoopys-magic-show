import { CONFIG } from '../config.js';

/**
 * Developer console for executing commands in dev mode
 */
export class DevConsole {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.input = '';
    this.history = [];
    this.historyIndex = -1;
    this.output = [];
    this.maxOutputLines = 10;

    // Commands registry
    this.commands = {
      level: this.cmdLevel.bind(this),
      god: this.cmdGod.bind(this),
      time: this.cmdTime.bind(this),
      lives: this.cmdLives.bind(this),
      score: this.cmdScore.bind(this),
      help: this.cmdHelp.bind(this),
      clear: this.cmdClear.bind(this),
    };
  }

  /**
   * Toggle console visibility
   */
  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.input = '';
    }
  }

  /**
   * Handle key input for console
   */
  handleInput(event) {
    if (!this.isOpen) return false;

    // Prevent default to avoid game input
    event.preventDefault();

    if (event.key === 'Enter') {
      this.executeCommand();
      return true;
    } else if (event.key === 'Escape') {
      this.toggle();
      return true;
    } else if (event.key === 'Backspace') {
      this.input = this.input.slice(0, -1);
      return true;
    } else if (event.key === 'ArrowUp') {
      this.navigateHistory(-1);
      return true;
    } else if (event.key === 'ArrowDown') {
      this.navigateHistory(1);
      return true;
    } else if (event.key.length === 1) {
      this.input += event.key;
      return true;
    }

    return false;
  }

  /**
   * Navigate command history
   */
  navigateHistory(direction) {
    if (this.history.length === 0) return;

    this.historyIndex += direction;
    this.historyIndex = Math.max(-1, Math.min(this.historyIndex, this.history.length - 1));

    if (this.historyIndex === -1) {
      this.input = '';
    } else {
      this.input = this.history[this.history.length - 1 - this.historyIndex];
    }
  }

  /**
   * Execute the current command
   */
  executeCommand() {
    const cmd = this.input.trim();
    if (!cmd) {
      this.toggle();
      return;
    }

    // Add to history
    this.history.push(cmd);
    this.historyIndex = -1;

    // Parse command
    const parts = cmd.split(/\s+/);
    const commandName = parts[0].replace(/^\//, '').toLowerCase();
    const args = parts.slice(1);

    // Add to output
    this.addOutput(`> ${cmd}`, '#9bbc0f');

    // Execute command
    if (this.commands[commandName]) {
      this.commands[commandName](args);
    } else {
      this.addOutput(`Unknown command: ${commandName}. Type /help for available commands.`, '#ff6b6b');
    }

    // Clear input
    this.input = '';
  }

  /**
   * Add line to output
   */
  addOutput(text, color = '#8bac0f') {
    this.output.push({ text, color, timestamp: Date.now() });
    if (this.output.length > this.maxOutputLines) {
      this.output.shift();
    }
  }

  /**
   * Command: /level <number>
   */
  cmdLevel(args) {
    if (args.length === 0) {
      this.addOutput(`Current level: ${this.game.state.level}`, '#8bac0f');
      return;
    }

    const level = parseInt(args[0]);
    if (isNaN(level) || level < 0) {
      this.addOutput('Invalid level number', '#ff6b6b');
      return;
    }

    this.game.loadDevLevel(level);
    this.addOutput(`Loading level ${level}...`, '#8bac0f');
    this.toggle();
  }

  /**
   * Command: /god <on|off|1|0>
   */
  cmdGod(args) {
    if (args.length === 0) {
      const status = this.game.player?.godMode ? 'ON' : 'OFF';
      this.addOutput(`God mode is ${status}`, '#8bac0f');
      return;
    }

    const arg = args[0].toLowerCase();
    const enable = arg === 'on' || arg === '1' || arg === 'true';
    const disable = arg === 'off' || arg === '0' || arg === 'false';

    if (!enable && !disable) {
      this.addOutput('Usage: /god <on|off|1|0>', '#ff6b6b');
      return;
    }

    if (this.game.player) {
      this.game.player.godMode = enable;
      this.addOutput(`God mode ${enable ? 'enabled' : 'disabled'}`, '#8bac0f');
    } else {
      this.addOutput('No player available', '#ff6b6b');
    }
  }

  /**
   * Command: /time <on|off|1|0>
   */
  cmdTime(args) {
    if (args.length === 0) {
      const status = this.game.timer.isActive ? 'ACTIVE' : 'STOPPED';
      this.addOutput(`Timer is ${status}`, '#8bac0f');
      return;
    }

    const arg = args[0].toLowerCase();
    const enable = arg === 'on' || arg === '1' || arg === 'true';
    const disable = arg === 'off' || arg === '0' || arg === 'false';

    if (!enable && !disable) {
      this.addOutput('Usage: /time <on|off|1|0>', '#ff6b6b');
      return;
    }

    this.game.timer.isActive = enable;
    this.addOutput(`Timer ${enable ? 'started' : 'stopped'}`, '#8bac0f');
  }

  /**
   * Command: /lives <number>
   */
  cmdLives(args) {
    if (args.length === 0) {
      this.addOutput(`Current lives: ${this.game.state.lives}`, '#8bac0f');
      return;
    }

    const lives = parseInt(args[0]);
    if (isNaN(lives) || lives < 0) {
      this.addOutput('Invalid number of lives', '#ff6b6b');
      return;
    }

    this.game.state.lives = lives;
    this.game.updateUI();
    this.addOutput(`Lives set to ${lives}`, '#8bac0f');
  }

  /**
   * Command: /score <number>
   */
  cmdScore(args) {
    if (args.length === 0) {
      this.addOutput(`Current score: ${this.game.state.score}`, '#8bac0f');
      return;
    }

    const score = parseInt(args[0]);
    if (isNaN(score) || score < 0) {
      this.addOutput('Invalid score', '#ff6b6b');
      return;
    }

    this.game.state.score = score;
    this.game.updateUI();
    this.addOutput(`Score set to ${score}`, '#8bac0f');
  }

  /**
   * Command: /help
   */
  cmdHelp(args) {
    this.addOutput('Available commands:', '#9bbc0f');
    this.addOutput('/level <n>     - Load level n', '#8bac0f');
    this.addOutput('/god <on|off>  - Toggle god mode', '#8bac0f');
    this.addOutput('/time <on|off> - Toggle timer', '#8bac0f');
    this.addOutput('/lives <n>     - Set lives', '#8bac0f');
    this.addOutput('/score <n>     - Set score', '#8bac0f');
    this.addOutput('/clear         - Clear output', '#8bac0f');
    this.addOutput('/help          - Show this help', '#8bac0f');
  }

  /**
   * Command: /clear
   */
  cmdClear(args) {
    this.output = [];
    this.addOutput('Console cleared', '#8bac0f');
  }

  /**
   * Render the console
   */
  render(ctx) {
    if (!this.isOpen) return;

    const width = CONFIG.CANVAS_WIDTH;
    const height = 200;
    const y = CONFIG.CANVAS_HEIGHT - height;

    // Background
    ctx.fillStyle = 'rgba(15, 56, 15, 0.95)';
    ctx.fillRect(0, y, width, height);

    // Border
    ctx.strokeStyle = CONFIG.COLORS.LIGHT;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, y, width, height);

    // Title
    ctx.fillStyle = CONFIG.COLORS.LIGHT;
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DEV CONSOLE', 10, y + 20);

    // Output
    let outputY = y + 40;
    for (let i = Math.max(0, this.output.length - 8); i < this.output.length; i++) {
      const line = this.output[i];
      ctx.fillStyle = line.color;
      ctx.font = '11px "Courier New", monospace';
      ctx.fillText(line.text, 10, outputY);
      outputY += 15;
    }

    // Input line
    const inputY = y + height - 30;
    ctx.fillStyle = CONFIG.COLORS.LIGHT;
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText('> ' + this.input + '_', 10, inputY);

    // Help text
    ctx.fillStyle = CONFIG.COLORS.MID_LIGHT;
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ESC to cancel', 10, y + height - 10);
    ctx.textAlign = 'right';
    ctx.fillText('Type /help for commands', width - 10, y + height - 10);
  }
}
