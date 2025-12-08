import './style.css';
import './gameboy.css';
import './cartbridge.css';
import { Game } from './engine/game.js';
import { initCartridgeDrag } from './cartridge-drag.js';

// Initialize the game
const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

// Initialize cartridge drag interaction
initCartridgeDrag();

// Make game accessible for debugging
window.game = game;
