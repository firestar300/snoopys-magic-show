# 🎮 Snoopy's Magic Show - TODO List

## 📊 Progression des Niveaux

**Objectif : 100 niveaux**

### ✅ Niveaux Terminés (31/100)

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

### 🚧 Niveaux En Cours (0/100)

### 📝 Niveaux Planifiés (75/100)

#### Zone 1 : Introduction (Levels 1-10) ✅ 10/10 - COMPLÈTE

Mécaniques de base, apprentissage progressif

- [x] Level 1-10

#### Zone 2 : Toggle Blocks (Levels 11-20) ✅ 10/10 - COMPLÈTE

Focus sur les blocs qui alternent entre solide et passable

- [x] Level 11-20

#### Zone 3 : Téléportation (Levels 21-30) ✅ 10/10 - COMPLÈTE

Maîtrise des portails et téléportation

- [x] Level 21-30

#### Zone 4 : Power-ups Avancés (Levels 31-40) 0/10

Utilisation stratégique des power-ups

- [ ] Level 31-40

#### Zone 5 : Puzzles Complexes (Levels 41-50) 0/10

Combinaison de plusieurs mécaniques

- [ ] Level 41-50

#### Zone 6 : Précision (Levels 51-60) 0/10

Timing et précision requis

- [ ] Level 51-60

#### Zone 7 : Chaos Contrôlé (Levels 61-70) 0/10

Multiples balles, situations chaotiques

- [ ] Level 61-70

#### Zone 8 : Maîtrise (Levels 71-80) 0/10

Niveaux très difficiles

- [ ] Level 71-80

#### Zone 9 : Expert (Levels 81-90) 0/10

Pour les joueurs expérimentés

- [ ] Level 81-90

#### Zone 10 : Finale (Levels 91-100) 0/10

Boss finals et défis ultimes

- [ ] Level 91-100

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

### Zone 6 (51-60) - Précision

- Timer serré
- Mouvements précis requis
- Patterns de balles complexes

### Zone 7 (61-70) - Chaos Contrôlé

- 5+ balles simultanées
- Espaces restreints
- Évitement pur

### Zone 8 (71-80) - Maîtrise

- Combinaison de toutes les mécaniques
- Puzzles multi-étapes
- Niveaux longs

### Zone 9 (81-90) - Expert

- Défis de vitesse
- Perfection requise
- Mécaniques extrêmes

### Zone 10 (91-100) - Finale

- Boss levels
- Niveaux marathon
- Défi ultime au niveau 100

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

- **Niveaux complétés :** 31/100 (31%)
- **Niveaux en cours :** 0/100 (0%)
- **Niveaux restants :** 69/100 (69%)
- **Zones complètes :** 3/10 (Zone 1: Introduction, Zone 2: Toggle Blocks, Zone 3: Téléportation) 🎉🎉🎉

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

## 🐛 Bugs Connus & Améliorations à Faire

### Collision Balle vs Bloc Poussable

- **Priorité :** Moyenne
- **Description :** Problème de collision quand une balle se trouve dans une case qui pourrait être comblée par un bloc poussable (cas particulier)
- **Impact :** Peut causer des comportements inattendus dans certaines configurations de niveaux
- **Solution potentielle :** Forcer la balle à continuer sa trajectoire au lieu de bloquer le mouvement du bloc
- **Fichiers concernés :** `src/engine/level-manager.js`, `src/entities/ball.js`
- **Statut :** À corriger plus tard

---
Dernière mise à jour : 2025-11-29
