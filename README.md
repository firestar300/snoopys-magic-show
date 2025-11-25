# 🎪 Snoopy's Magic Show

Une recréation du jeu Game Boy classique construite avec ViteJS et Canvas.

![Game Boy Style](https://img.shields.io/badge/style-Game%20Boy-9bbc0f)
![ViteJS](https://img.shields.io/badge/ViteJS-7.2.4-646cff)

## 🎮 Description

Incarnez Snoopy dans ce jeu de puzzle/action où vous devez collecter tous les Woodstock tout en évitant les boules rebondissantes ! Traversez 7 niveaux remplis de défis avec des blocs déplaçables, des téléporteurs, des flèches directionnelles et plus encore.

## ✨ Fonctionnalités

### Mécaniques de Jeu
- ✅ **Mouvement sur grille** (9x8 cases)
- ✅ **Collectibles** - Récupérez tous les Woodstock pour terminer le niveau
- ✅ **Ennemis** - Boules rebondissantes qui vous font perdre une vie
- ✅ **Blocs déplaçables** - Poussez les blocs pour créer un chemin
- ✅ **Blocs cassables** - Utilisez le bouton d'action pour les détruire
- ✅ **Téléporteurs** - Sautez d'un portail à l'autre
- ✅ **Flèches directionnelles** - Forces qui vous propulsent dans une direction
- ✅ **Power-ups**
  - 🟢 Speed - Augmente votre vitesse
  - 🟡 Invincible - Protection temporaire contre les boules

### Interface & Expérience
- ✅ **Écran de menu** avec instructions
- ✅ **Écran Game Over** avec score final
- ✅ **Écran de victoire** pour finir tous les niveaux
- ✅ **Écran de transition** entre niveaux
- ✅ **Système de vies** (3 vies)
- ✅ **Score** (Woodstock: 500pts, Power-ups: 200pts, Boules détruites: 100pts)
- ✅ **Support mobile/tactile** avec contrôles virtuels

### Niveaux
- 🎯 **7 niveaux** avec difficulté progressive
  1. Welcome to the Show! - Introduction
  2. Bouncing Around - Blocs poussables et flèches
  3. Push and Slide - Maîtrise du push
  4. Teleport Maze - Labyrinthe avec téléporteurs
  5. The Gauntlet - Flèches et multiples boules
  6. Break Out - Blocs cassables
  7. Final Show - Boss final avec toutes les mécaniques

## 🎯 Contrôles

### Clavier
- **Flèches / WASD** - Déplacement
- **Espace / Entrée** - Action (casser les blocs, menu)
- **P** - Pause

### Mobile/Tactile
- **D-Pad virtuel** - Déplacement
- **Bouton A** - Action

## 🚀 Installation & Lancement

```bash
# Installation des dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview
```

## 🏗️ Architecture du Projet

```
snoopys-magic-show/
├── src/
│   ├── config.js              # Configuration du jeu
│   ├── main.js                # Point d'entrée
│   ├── style.css              # Styles globaux
│   ├── engine/                # Moteur du jeu
│   │   ├── game.js           # Boucle de jeu principale
│   │   ├── renderer.js       # Rendu Canvas
│   │   ├── input-manager.js  # Gestion des entrées
│   │   ├── level-manager.js  # Gestion des niveaux
│   │   └── entity-manager.js # Gestion des entités
│   ├── entities/              # Entités du jeu
│   │   ├── entity.js         # Classe de base
│   │   ├── player.js         # Joueur (Snoopy)
│   │   ├── ball.js           # Boules ennemies
│   │   ├── woodstock.js      # Collectibles
│   │   └── power-up.js       # Power-ups
│   ├── tiles/                 # Système de tuiles
│   │   └── tile-types.js     # Types de tuiles
│   ├── ui/                    # Interface utilisateur
│   │   ├── game-states.js    # États du jeu
│   │   ├── ui-manager.js     # Gestion des écrans
│   │   └── touch-controls.js # Contrôles tactiles
│   └── levels/                # Niveaux JSON
│       ├── level-1.json
│       ├── level-2.json
│       ├── level-3.json
│       ├── level-4.json
│       ├── level-5.json
│       ├── level-6.json
│       └── level-7.json
├── public/
├── index.html
└── package.json
```

## 🎨 Système de Tuiles

Les niveaux sont définis en JSON avec un système de caractères :

- `0` - Vide
- `1` - Mur (collision)
- `2` - Bloc poussable
- `3` - Bloc cassable
- `4` - Téléporteur A
- `5` - Téléporteur B
- `6` - Flèche Haut
- `7` - Flèche Droite
- `8` - Flèche Bas
- `9` - Flèche Gauche

### Exemple de niveau

```json
{
  "id": 1,
  "name": "Welcome to the Show!",
  "width": 9,
  "height": 8,
  "startPosition": { "x": 1, "y": 1 },
  "tiles": [
    "111111111",
    "100000001",
    "101020101",
    "100000001",
    "100030001",
    "101000101",
    "100000001",
    "111111111"
  ],
  "entities": [
    { "type": "woodstock", "x": 7, "y": 6 },
    { "type": "ball", "x": 4, "y": 4, "vx": 1, "vy": 1 },
    { "type": "powerup", "x": 2, "y": 4, "powerType": "speed" }
  ]
}
```

## 🎨 Palette de Couleurs Game Boy

Le jeu utilise une palette authentique Game Boy :
- **#0f380f** - Vert foncé
- **#306230** - Vert moyen foncé
- **#8bac0f** - Vert moyen clair
- **#9bbc0f** - Vert clair

## 🔧 Technologies

- **ViteJS** - Build tool et serveur de développement
- **Vanilla JavaScript** (ES6+)
- **Canvas API** - Rendu 2D
- **JSON** - Définition des niveaux

## 🎯 Prochaines Améliorations Possibles

- [ ] Sons et musique
- [ ] Effets de particules
- [ ] Plus d'animations
- [ ] Sauvegarde du high score (localStorage)
- [ ] Plus de types de power-ups
- [ ] Éditeur de niveaux
- [ ] Mode multijoueur

## 📝 Licence

Ce projet est une recréation fan-made à des fins éducatives.

## 👤 Auteur

Développé avec ❤️ et ViteJS

---

**Bon jeu ! 🎮**
