// Balance values and completion-time thresholds (seconds). No build step required.
window.CastleConfig = Object.freeze({
  worldWidth: 5600,
  maxHealth: 5,
  health: { skeleton: 1, bat: 1, boss: 10, skeleton_2: 2, bat_2: 1, boss_2: 10, skeleton_3: 2, bat_3: 1, boss_3: 10},
  points: { coin: 100, skeleton: 50, bat: 75, boss: 500, skeleton_2: 100, bat_2: 150, boss_2: 1000, skeleton_3: 150, bat_3: 175, boss_3: 2000, campaign: 2000, allCandles: 1000, allMonsters: 1000 },
  coinDropChance: 0.85,
  superPotionDropChance: 0.05,
  boss: { speed: 70, fireInterval: 4.6, doubleFireChance: 0.15, fireSpacing: 40 },
  boss2: { speed: 57.5, fireInterval: 3.5, projectileSpeed: 190, doubleFireChance: 0.25 },
  bat2: { speed: 100, fireInterval: 2.2, emberSpeed: 190 },
  skeleton2: { speed: 70, range: 35, windup: 0.35, activeTime: 0.2, cooldown: 1.2 },
  skeleton3: { speed: 60, fireInterval: 1.6, projectileSpeed: 210, range: 180 },
  bat3: { speed: 100, fireInterval: 2, projectileSpeed: 240, range: 480 },
  boss3: { speed: 90, attackInterval: 3, windup: 0.3, meleeRange: 60, meleeDuration: 0.22, sawSpeed: 260, sawRange: 2400, fireSpeed: 230, fireRange: 2400, scytheSpeed: 220, scytheRange: 240, burstChance: 0.15, meleeChance: 0.35, sawChance: 0.25, doubleSawChance: 0.25, sawSpacing: 50 },
  superPotion: { duration: 5 },
  playerAttack: { duration: 0.24, cooldown: 0.4, reach: 88 },
  ending: { burnDuration: 3, sitDuration: 1.2, danceDuration: 7, danceFps: 5, throneOffset: 144 },
  timeBonus: {
    enabled: true,
    stages: [
      [
        { name: 'Conclusão Veloz !', maxSeconds: 45, points: 1000 },
        { name: 'Conclusão Rápida !', maxSeconds: 105, points: 500 },
        { name: 'Concluída a tempo !', maxSeconds: 160, points: 200 },
        { name: 'Concluída !', maxSeconds: null, points: 0 }
      ],
      [
        { name: 'Conclusão Veloz !', maxSeconds: 65, points: 1500 },
        { name: 'Conclusão Rápida !', maxSeconds: 130, points: 750 },
        { name: 'Concluída a tempo !', maxSeconds: 180, points: 300 },
        { name: 'Concluída !', maxSeconds: null, points: 0 }
      ],
      [
        { name: 'Conclusão Veloz !', maxSeconds: 100, points: 2000 },
        { name: 'Conclusão Rápida !', maxSeconds: 150, points: 1000 },
        { name: 'Concluída a tempo !', maxSeconds: 220, points: 500 },
        { name: 'Concluída !', maxSeconds: null, points: 0 }
      ]
    ]
  }
});
