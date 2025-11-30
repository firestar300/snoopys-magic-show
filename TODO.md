# 🎮 Snoopy's Magic Show - TODO List

## 📊 Progression des Niveaux

**Objectif : 60 niveaux**

### ✅ Niveaux Terminés (56/60)

- [x] Level 0 (Dev only)
- [x] Level 1
- [x] Level 2
- [x] Level 3
- [x] Level 4
- [x] Level 5
- [x] Level 6
- [x] Level 7
- [x] Level 8
- [x] Level 9
- [x] Level 10
- [x] Level 11
- [x] Level 12
- [x] Level 13
- [x] Level 14
- [x] Level 15
- [x] Level 16
- [x] Level 17
- [x] Level 18
- [x] Level 19
- [x] Level 20
- [x] Level 21
- [x] Level 22
- [x] Level 23
- [x] Level 24
- [x] Level 25
- [x] Level 26
- [x] Level 27
- [x] Level 28
- [x] Level 29
- [x] Level 30
- [x] Level 31
- [x] Level 32
- [x] Level 33
- [x] Level 34
- [x] Level 35
- [x] Level 36
- [x] Level 37
- [x] Level 38
- [x] Level 39
- [x] Level 40
- [x] Level 41
- [x] Level 42
- [x] Level 43
- [x] Level 44
- [x] Level 45
- [x] Level 46
- [x] Level 47
- [x] Level 48
- [x] Level 49
- [x] Level 50
- [x] Level 51
- [x] Level 52
- [x] Level 53
- [x] Level 54
- [x] Level 55

### 🚧 Niveaux En Cours (0/60)

### 📝 Niveaux Planifiés (4/60)

#### Zone 1 : Introduction (Levels 1-10) ✅ 10/10 - COMPLÈTE

Mécaniques de base, apprentissage progressif

- [x] Level 1-10

#### Zone 2 : Toggle Blocks (Levels 11-20) ✅ 10/10 - COMPLÈTE

Focus sur les blocs qui alternent entre solide et passable

- [x] Level 11-20

#### Zone 3 : Téléportation (Levels 21-30) ✅ 10/10 - COMPLÈTE

Maîtrise des portails et téléportation

- [x] Level 21-30

#### Zone 4 : Power-ups Avancés (Levels 31-40) ✅ 10/10 - COMPLÈTE

Utilisation stratégique des power-ups

- [x] Level 31-40

#### Zone 5 : Puzzles Complexes (Levels 41-50) ✅ 10/10 - COMPLÈTE

Combinaison de plusieurs mécaniques

- [x] Level 41-50

#### Zone 6 : Finale (Levels 51-60) 5/10

Boss levels, défis ultimes et maîtrise complète

- [x] Level 51 ✅
- [x] Level 52 ✅
- [x] Level 53 ✅
- [x] Level 54 ✅
- [x] Level 55 ✅
- [ ] Level 56-60

## 🎯 Idées de Mécaniques par Zone

### Zone 1 (1-10) - Introduction

- Blocs cassables
- Blocs poussables
- Flèches directionnelles
- Téléporteurs basiques
- Power-up invincible et speed

### Zone 2 (11-20) - Toggle Blocks

- Puzzles basés sur le timing des toggle blocks
- Combinaison toggle blocks + flèches
- Toggle blocks + téléportation

### Zone 3 (21-30) - Téléportation

- Chaînes de téléportation
- Téléportation avec balles
- Labyrinthes de portails

### Zone 4 (31-40) - Power-ups Avancés

- Power-ups cachés avec targets directionnels
- Utilisation obligatoire de power-ups
- Séquences de power-ups

### Zone 5 (41-50) - Puzzles Complexes

- Multiples types de blocs
- Séquences d'actions requises
- Chemins alternatifs

### Zone 6 (51-60) - Finale

- Boss levels et défis ultimes
- Combinaison de toutes les mécaniques apprises
- Timer serré et mouvements précis requis
- Patterns de balles complexes
- Multiples balles simultanées
- Puzzles multi-étapes
- Défis de vitesse et perfection requise
- Défi ultime au niveau 60

## 📋 Notes de Design

### Principes de Design

- Progression linéaire de difficulté
- Introduction d'une nouvelle mécanique tous les 5-10 niveaux
- Variété dans le gameplay
- Récompense de la maîtrise des mécaniques

### Considérations

- Chaque niveau doit être unique
- Timer ajusté selon la difficulté
- Placement stratégique des Woodstocks
- Équilibre entre puzzle et action

## 🎵 Musiques Disponibles

- stage-bgm-1 à stage-bgm-9
- stage-clear-1 à stage-clear-9
- À assigner aux niveaux selon l'ambiance

## 📈 Statistiques

- **Niveaux complétés :** 56/60 (93.3%) 🎯🎯🎯
- **Niveaux en cours :** 0/60 (0%)
- **Niveaux restants :** 4/60 (6.7%)
- **Zones complètes :** 5/6 (Zone 1: Introduction, Zone 2: Toggle Blocks, Zone 3: Téléportation, Zone 4: Power-ups Avancés, Zone 5: Puzzles Complexes) 🎉🎉🎉🎉🎉
- **Zone 6 en cours :** 5/10 niveaux complétés (Finale)

## 🆕 Nouvelles Fonctionnalités

### Portails à Sens Unique (One-Way Portals)

- **Date d'ajout :** 2025-11-27
- **Description :** Portails entités qui téléportent vers une destination fixe (contrairement aux portails bidirectionnels)
- **Peut être caché :** Oui, dans des blocs poussables
- **Fichiers :** `src/entities/portal.js`, support dans `entity-manager.js` et `level-manager.js`
- **Schema :** Documenté dans `src/levels/schema.json`

### Système Audio Complet

- **Date d'ajout :** 2025-11-29
- **Effets sonores :**
  - `block-break` : Casse de bloc vide
  - `block-break-item` : Casse de bloc contenant un power-up
  - `powerup-time` : Révélation power-up Time
  - `powerup-god` : Révélation power-up Speed/Invincible
  - `ball-collision` : Rebond de balle sur bloc solide
  - `pause` : Activation de la pause
  - `woodstock-collect` : Collecte de Woodstock
  - `timer` : Décompte du time bonus (fin de niveau)
- **Optimisation :** Fichiers musicaux réduits de 85% (6.9MB → 500KB-1.1MB)
- **Chargement intelligent :** Vérification readyState et attente du chargement

### Dev Console Améliorée

- **Date d'ajout :** 2025-11-29
- **Améliorations :**
  - Blocage de tous les inputs du jeu quand la console est ouverte
  - Fix du bug `/level` depuis l'écran titre
  - Commande `noclip` pour désactiver les collisions
- **Fichiers :** `src/ui/dev-console.js`, `src/engine/game.js`

### Blocs Poussables Bidirectionnels

- **Date d'ajout :** 2025-11-29
- **Description :** Les blocs poussables peuvent maintenant être poussés dans la direction opposée
- **Comportement :**
  - Bloc `PUSHABLE_RIGHT` poussé vers la droite → devient `PUSHABLE_LEFT`
  - Bloc `PUSHABLE_LEFT` poussé vers la gauche → devient `PUSHABLE_RIGHT`
  - Idem pour les directions haut/bas
- **Impact gameplay :** Permet de repositionner les blocs et créer des puzzles plus complexes
- **Fichiers :** `src/engine/level-manager.js`

### Protections et Mécaniques Avancées

- **Date d'ajout :** 2025-11-29
- **Protections :**
  - Blocs poussables ne peuvent plus écraser les Woodstocks
  - Portails jouent le son même si destination bloquée (bloc solide)
- **Comportement portails :**
  - Si destination = bloc solide → son de téléportation + cooldown mais pas de téléportation
  - Si destination = libre → son + téléportation + cooldown
- **Impact gameplay :** Ajoute une dimension stratégique et évite la perte de collectibles
- **Fichiers :** `src/engine/level-manager.js`, `src/entities/portal.js`

## 🐛 Bugs Connus & Améliorations à Faire

### Collision Balle vs Bloc Poussable

- **Priorité :** Moyenne
- **Description :** Problème de collision quand une balle se trouve dans une case qui pourrait être comblée par un bloc poussable (cas particulier)
- **Impact :** Peut causer des comportements inattendus dans certaines configurations de niveaux
- **Solution potentielle :** Forcer la balle à continuer sa trajectoire au lieu de bloquer le mouvement du bloc
- **Fichiers concernés :** `src/engine/level-manager.js`, `src/entities/ball.js`
- **Statut :** À corriger plus tard

---
Dernière mise à jour : 2025-11-29 (Zone 6 à mi-parcours - 93.3% complété! Plus que 4 niveaux! 🎯)
