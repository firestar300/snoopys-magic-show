# 🎮 Snoopy's Magic Show - TODO List

## 📊 Progression des Niveaux

**Objectif : 120 niveaux (60 + 60 avec Spike)**

### ✅ Niveaux Terminés (70/120)

- [x] Level 0 (Dev only)
- [x] Levels 1-60 (Partie 1 complète!)
- [x] Levels 61-70 (Partie 2 avec Spike: 10/60 complétés)

**Détail de la Partie 1 (60 niveaux) :**

- [x] Levels 1-10 (Zone 1: Introduction)
- [x] Levels 11-20 (Zone 2: Toggle Blocks)
- [x] Levels 21-30 (Zone 3: Téléportation)
- [x] Levels 31-40 (Zone 4: Power-ups Avancés)
- [x] Levels 41-50 (Zone 5: Puzzles Complexes)
- [x] Levels 51-60 (Zone 6: Finale)

**Détail de la Partie 2 avec Spike (60 niveaux) :**

- [x] Levels 61-70 (Zone 7: Spike Introduction) ✅ 10/60
- [ ] Levels 71-80 (Zone 8: À venir) 0/60
- [ ] Levels 81-90 (Zone 9: À venir) 0/60
- [ ] Levels 91-100 (Zone 10: À venir) 0/60
- [ ] Levels 101-110 (Zone 11: À venir) 0/60
- [ ] Levels 111-120 (Zone 12: Finale Ultime) 0/60

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

#### Zone 6 : Finale (Levels 51-60) ✅ 10/10 - COMPLÈTE

Boss levels, défis ultimes et maîtrise complète

- [x] Level 51-60

#### Zone 7 : Spike Introduction (Levels 61-70) ✅ 10/60 - EN COURS

Répliques des niveaux 1-10 avec l'ajout de Spike, l'ennemi IA

- [x] Level 61-70 (Duplicata de Levels 1-10 avec Spike)

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

- **🏆 NIVEAUX COMPLÉTÉS : 70/120 (58.3%) 🏆**
- **🎮 PARTIE 1 TERMINÉE (60/60) + PARTIE 2 EN COURS (10/60)**
- **Niveaux en cours :** 10/120 (8.3%)
- **Niveaux restants :** 50/120 (41.7%)
- **🎊 ZONES COMPLÈTES : 7/12 🎊**
  - ✅ Zone 1: Introduction (Levels 1-10)
  - ✅ Zone 2: Toggle Blocks (Levels 11-20)
  - ✅ Zone 3: Téléportation (Levels 21-30)
  - ✅ Zone 4: Power-ups Avancés (Levels 31-40)
  - ✅ Zone 5: Puzzles Complexes (Levels 41-50)
  - ✅ Zone 6: Finale (Levels 51-60)
  - ✅ Zone 7: Spike Introduction (Levels 61-70)
  - 🔄 Zone 8-12: À venir (Levels 71-120)

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

### Spike - Ennemi IA (Frère de Snoopy)

- **Date d'ajout :** 2025-11-30
- **Description :** Nouvel ennemi contrôlé par IA pour les niveaux 61-120
- **Capacités de Spike :**
  - ✅ Se déplace avec IA fluide (70% de la vitesse de Snoopy)
  - ✅ Continue 2-4 tiles dans une direction (mouvement fluide)
  - ✅ IA : 50% vers joueur, 50% aléatoire
  - ✅ Peut casser des blocs cassables (30% de chance)
  - ✅ Peut pousser des blocs poussables
  - ✅ Révèle les power-ups cachés (mais ne peut pas les utiliser)
  - ✅ Peut être entraîné par les flèches directionnelles (forcé de suivre la direction)
  - ✅ Peut se téléporter sur portails
  - ✅ Gelé par le power-up "time" (comme les balles)
  - ❌ Ne peut PAS utiliser de power-ups
  - ❌ Ne peut PAS être touché par les balles
- **Interactions :**
  - Snoopy avec invincibilité + Spike → Spike vaincu (animation defeat)
  - Snoopy sans invincibilité + Spike → Snoopy vaincu (musique miss)
  - Spike ne peut pas toucher Snoopy en phase victory
- **Équilibrage :**
  - Vitesse : 70% de celle de Snoopy (30% plus lent)
  - Casse blocs : 30% de chance seulement (pas systématique)
  - IA réactive : délai de décision de 20ms
- **Sprite :** `/sprites/spike.png` (même layout que snoopy.png)
- **Fichiers :** `src/entities/spike.js`, `src/engine/game.js`, `src/engine/sprite-manager.js`

## 🐛 Bugs Connus & Améliorations à Faire

### Collision Balle vs Bloc Poussable

- **Priorité :** Moyenne
- **Description :** Problème de collision quand une balle se trouve dans une case qui pourrait être comblée par un bloc poussable (cas particulier)
- **Impact :** Peut causer des comportements inattendus dans certaines configurations de niveaux
- **Solution potentielle :** Forcer la balle à continuer sa trajectoire au lieu de bloquer le mouvement du bloc
- **Fichiers concernés :** `src/engine/level-manager.js`, `src/entities/ball.js`
- **Statut :** À corriger plus tard

---
🎊🎉🏆 **PARTIE 2 DÉMARRÉE : SPIKE EST LÀ ! 70/120 NIVEAUX COMPLÉTÉS !** 🏆🎉🎊

Dernière mise à jour : 2025-11-30 (Snoopy's Magic Show - Partie 2 avec Spike en cours!)

**La première partie est complète (60 niveaux) ! La deuxième partie avec Spike a démarré (10/60 niveaux) ! Continuons l'aventure ! 🎮✨🐾**
