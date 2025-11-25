import './style.css';
import { Game } from './engine/game.js';

// Initialize the game
const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

// Make game accessible for debugging
window.game = game;
