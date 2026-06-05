// Clases del juego

class Sword {
  constructor(name, multiplier) {
      this.name = name;
      this.multiplier = multiplier;
  }
}

class Shield {
  constructor(name, blockChance, hp) {
      this.name = name;
      this.blockChance = blockChance;
      this.hp = hp;
  }


    takeDamage(damage) {
        if (this.isUnbreakable) return false;
        this.hp -= damage;
        if (this.hp <= 0) {
            this.hp = 0;
            this.broken = true;
            blockCardsAllowed = false;  // <- agregar esta línea
            return true;
        }
        return false;
    }
    repair() {
        const keys = Object.keys(shields);
        for (const key of keys) {
            const s = shields[key][this.playerClass];
            if (s && s.name === this.name) {
                this.hp = s.hp;
                return;
            }
        }
    }
}

class Bracelet {
  constructor(name, effect) {
      this.name = name;
      this.effect = effect;
  }
}

class Potion {
  constructor(name, effect) {
      this.name = name;
      this.effect = effect;
  }
}

class Monster {
  constructor(name, hp, attack, avatar, ability) {
      this.name = name;
      this.hp = hp;
       this.maxHp = hp;
      this.attack = attack;
      this.avatar = avatar;
      this.ability = ability; // Nueva propiedad para habilidades especiales
  }

  useSpecialAbility(player) {
      if (this.ability) {
          this.ability(player, this);
      }
  }
}

class Player {
  constructor(name, playerClass) {
      this.name = name;
      this.hp = 50;
      this.sword = swords.basica[playerClass];
    this.shield = Object.assign(new Shield(), shields.basica[playerClass]);
    this.shield.playerClass = playerClass;
      this.playerClass = playerClass;
      this.skillUses = 3;
      this.skillActive = false;
      this.attackMultiplier = 1; // Nuevo multiplicador de ataque
      this.bracelet = null;
      this.potions = [];
      this.dodgeChance = 0.1; // Probabilidad de esquivar inicial
  }

  attack() {
    const baseDamage = Math.floor(Math.random() * 6) + 1;
    const damageMultiplier = this.skillActive && this.playerClass === "Guerrero" ? 2 : 1;
    let damage = Math.floor(baseDamage * this.sword.multiplier * this.attackMultiplier * damageMultiplier);
    
    // Golpe crítico si tiene espada del mercader
    if (this.sword === merchantSword && Math.random() < 0.15) {
        damage *= 2;
        this.lastAttackWasCritical = true;
    } else {
        this.lastAttackWasCritical = false;
    }
    
    // Maldición A: cada ataque cuesta 1 de vida
    if (this.curseName === "A") {
        this.hp = Math.max(this.hp - 1, 1); // No puede matarte sola
        updateStats();
    }
    
    return damage;
    }

  block() {
    return this.shield && !this.shield.broken && Math.random() < this.shield.blockChance;
    }

  dodge() {
      return Math.random() < this.dodgeChance;
  }

  takeShieldDamage(damage) {
        const shieldBreakSound = document.getElementById("shieldBreakSound");
        if (this.shield && this.shield.takeDamage(damage)) {
            shieldBreakSound.play();
            blockCardsAllowed = false;
            document.getElementById("message").innerText += `\n¡Tu defensa se ha roto!`;
            refreshBlockCards();
        }
        updatePlayerStats();
    }

  recoverHealth(amount) {
      this.hp = Math.min(this.hp + amount, 50); // Recuperar vida del jugador
  }

  useSkill() {
    if (this.skillUses > 0) {
        this.applySkill(this.playerClass);
    } else {
        document.getElementById("message").innerText += `\nNo te quedan habilidades para usar.`;
    }
}

applySkill(className) {
    if (this.skillUses <= 0) {
        document.getElementById("message").innerText += `\nNo te quedan habilidades para usar.`;
        return;
    }
    switch (className) {
        case "Guerrero":
            triggerSkillAnim("Guerrero");
            this.skillActive = true;
            this.damageReductionActive = true;
            document.getElementById("message").innerText += `\n¡Furia de Batalla activada! Daño x2 y reducción de daño 50%.`;
            break;
        case "Mago":
            triggerSkillAnim("Mago");
            spawnHealParticles("playerAvatar");
            this.recoverHealth(15);
            this.shield.blockChance += 0.05;
            document.getElementById("message").innerText += `\n¡Meditación activada! +15 vida y +5% bloqueo.`;
            updateStats();
            break;
        case "Explorador":
            triggerSkillAnim("Explorador");
            if (this.shield.isUnbreakable) {
                this.shield.broken = false;
                this.shield.blockChance = Math.max(this.shield.blockChance, 0.10);
            } else {
                this.shield.repair();
            }
            this.shield.broken = false;
            
            if (Math.random() < 0.5) {
                this.upgradeSword();
                document.getElementById("message").innerText += `\n¡Fabricación activada! Escudo reparado y espada mejorada.`;
            } else {
                document.getElementById("message").innerText += `\n¡Fabricación activada! Escudo reparado.`;
            }
            blockCardsAllowed = true;
            refreshBlockCards();
            break;
    }
    this.skillUses--;
    updatePlayerStats();
}
    upgradeSword() {
        const swordKeys = Object.keys(swords);
        const currentName = this.sword.name;
        const currentIndex = swordKeys.findIndex(k => swords[k][this.playerClass].name === currentName);
        if (currentIndex !== -1 && currentIndex < swordKeys.length - 1) {
            this.sword = swords[swordKeys[currentIndex + 1]][this.playerClass];
        }
    }

  usePotion(potion) {
      if (this.potions.includes(potion)) {
          potion.effect(this);
          this.potions = this.potions.filter(p => p !== potion); // Elimina la poción usada del inventario
          updatePlayerStats();
      }
  }

  equipBracelet(bracelet) {
      this.bracelet = bracelet;
      bracelet.effect(this); // Aplica el efecto del brazalete al jugador
  }
}

// Seleccionar la clase del jugador
let selectedClass = '';

function selectClass(playerClass) {
  selectedClass = playerClass;
  document.querySelectorAll('.class-card').forEach(card => {
    card.classList.remove('selected');
  });
  document.getElementById(`card-${playerClass}`).classList.add('selected');
}

// Variables globales
let activeEffects = {
    monsterStunned: false,          // Helar / Golpe Aturdidor — el monstruo pierde su turno
    playerDamageReduction: 1,       // Postura Defensiva (0.2) / Escudo Arcano (0) — multiplicador de daño recibido
    playerNextCritical: false,      // Ojo de Águila — el próximo ataque es crítico garantizado
    monsterPoisonTurns: 0,          // Veneno — turnos restantes de veneno
    monsterPoisonDamage: 3,         // Veneno — daño fijo por turno
    playerGuaranteedDodge: false,   // Retirada Táctica — esquiva garantizada este turno
    shieldArcane: false,            // Escudo Arcano — el próximo daño recibido se convierte en 0
    novaIgnoresAbilities: false,    // Nova Arcana — el monstruo no usa habilidades este turno
    eagleEyeActive: false,          // Ojo de Águila — bandera de crítico garantizado activa
    preciseShot: false,             // Disparo Certero — ignora el contraataque del monstruo guerrero
};

let discardMode = false;
let discardCountThisTurn = 0;
const swords = {
  basica:     { Guerrero: new Sword("⚪ Espada Oxidada", 1),     Mago: new Sword("⚪ Rama Tallada", 1),         Explorador: new Sword("⚪ Cuchillo Oxidado", 1)    },
  comun:      { Guerrero: new Sword("🟢 Espada de Hierro", 1.5), Mago: new Sword("🟢 Báculo de Roble", 1.5),   Explorador: new Sword("🟢 Daga Afilada", 1.5)     },
  pocoComon:  { Guerrero: new Sword("🔵 Espada del Cruzado", 2), Mago: new Sword("🔵 Báculo Arcano", 2),       Explorador: new Sword("🔵 Daga del Cazador", 2)   },
  rara:       { Guerrero: new Sword("🟣 Espada del Crepúsculo", 3), Mago: new Sword("🟣 Báculo del Oráculo", 3), Explorador: new Sword("🟣 Daga Venenosa", 3)    },
  exotica:    { Guerrero: new Sword("🟠 Espada del Abismo", 4),  Mago: new Sword("🟠 Báculo del Vacío", 4),    Explorador: new Sword("🟠 Daga de la Sombra", 4) },
};

const shields = {
  basica:    { Guerrero: new Shield("⚪ Tablón de Madera", 0.1, 10),      Mago: new Shield("⚪ Sello Débil", 0.1, 10),         Explorador: new Shield("⚪ Señuelo Frágil", 0.1, 10)    },
  comun:     { Guerrero: new Shield("🟢 Escudo de Hierro", 0.15, 15),     Mago: new Shield("🟢 Barrera Arcana", 0.15, 15),     Explorador: new Shield("🟢 Señuelo de Madera", 0.15, 15) },
  pocoComon: { Guerrero: new Shield("🔵 Escudo del Bastión", 0.2, 20),    Mago: new Shield("🔵 Barrera de Cristal", 0.2, 20),  Explorador: new Shield("🔵 Señuelo Táctico", 0.2, 20)  },
  rara:      { Guerrero: new Shield("🟣 Escudo del Juicio", 0.25, 25),    Mago: new Shield("🟣 Barrera del Éter", 0.25, 25),   Explorador: new Shield("🟣 Señuelo Ilusorio", 0.25, 25) },
  exotica:   { Guerrero: new Shield("🟠 Escudo Eterno", 0.3, 30),         Mago: new Shield("🟠 Barrera Absoluta", 0.3, 30),    Explorador: new Shield("🟠 Señuelo Fantasmal", 0.3, 30) },
};
const bracelets = {
  fuerza: new Bracelet("Fuerza", (player) => player.attackMultiplier += 0.15),
  defensa: new Bracelet("Defensa", (player) => player.shield.blockChance += 0.1),
  agilidad: new Bracelet("Agilidad", (player) => player.dodgeChance += 0.1)
};

const potions = {
    curacion: new Potion("Curación", (player) => player.recoverHealth(20)),
    fortaleza: new Potion("Fortaleza", (player) => player.attackMultiplier += 0.15),
    proteccion: new Potion("Protección", (player) => player.shield.blockChance += 0.1),
    energia: new Potion("Energía", (player) => {
        const max = player.curseName === "B" ? 2 : 3;
        player.skillUses = Math.min(player.skillUses + 2, max);
    })
};

const specialAbilities = {
    
  mago: (player, monster) => {
    if (Math.random() < 0.3) {
        monster.hp = Math.min(monster.hp + 7, monster.maxHp);
        spawnFloatingNumber(7, "heal", "monsterAvatar");
        spawnRegenWaves("monsterAvatar");
        document.getElementById("message").innerText += `\n¡${monster.name} ha recuperado 5 puntos de salud!`;
    }
    },
  guerrero: (player, monster) => {
      if (Math.random() < 0.20) {
          document.getElementById("message").innerText += `\n¡${monster.name} ha bloqueado el ataque de ${player.name} e inflige daño!`;
          const damage = Math.floor(Math.random() * monster.attack) + 1;
          player.hp -= damage;
          document.getElementById("message").innerText += `\n${player.name} ha recibido ${damage} puntos de daño.`;
          return true; // Ataque del jugador bloqueado
      }
      return false;
  },
  explorador: (player, monster) => {
        if (Math.random() < 0.15) {
            player.shield.broken = true;
            player.shield.hp = 0;
            document.getElementById("message").innerText += `\n¡${monster.name} ha roto el escudo de ${player.name}!`;
            blockCardsAllowed = false;
            refreshBlockCards();
            updatePlayerStats();
        }
    },
  boss: (player, monster) => {
        if (Math.random() < 0.40) {
            const roll = Math.random();
            if (roll < 0.33) {
                // Habilidad de mago: regeneración
                if (Math.random() < 0.3) {
                    monster.hp = Math.min(monster.hp + 7, monster.maxHp);
                    spawnFloatingNumber(7, "heal", "monsterAvatar");
                    spawnRegenWaves("monsterAvatar");
                    document.getElementById("message").innerText += `\n¡El Jefe Final se regenera!`;
                }
            } else if (roll < 0.66) {
                // Habilidad de guerrero: contraataque
                if (Math.random() < 0.20) {
                    const damage = Math.floor(Math.random() * monster.attack) + 1;
                    player.hp -= damage;
                    spawnFloatingNumber(damage, "damage", "playerAvatar");
                    document.getElementById("message").innerText += `\n¡El Jefe Final contraatacó!`;
                    if (player.hp <= 0) { endGame(false); }
                    return true;
                }
            } else {
                // Habilidad de explorador: rompe escudo
                if (Math.random() < 0.15 && player.shield && !player.shield.isUnbreakable) {
                    player.shield.hp = 0;
                    player.shield.broken = true;
                    spawnFloatingNumber(0, "shield", "playerAvatar");
                    document.getElementById("message").innerText += `\n¡El Jefe Final destruyó tu escudo!`;
                    blockCardsAllowed = false;
                    refreshBlockCards();
                }
            }
        }
        return false;
    }
};
// Variable global del mercader
let merchantAppeared = false;
let hasCursionB = false;
let hasAncestralPact = false;
let hybridClass = null; // "Guerrero" o "Explorador" para el mago híbrido

const merchantSword = new Sword("❓ Arma No Identificada", 3);
const merchantShield = new Shield("❓ Defensa No Identificada", 0.35, Infinity);
const merchantBracelet = new Bracelet("Brazalete del Mercader", (player) => {});
merchantShield.isUnbreakable = true;

// Resetear todos los efectos temporales al inicio de cada turno del monstruo
// IMPORTANTE: llamar a esto al inicio de monsterAttack()
function resetTurnEffects() {
    activeEffects.playerDamageReduction = 1;    // Sin reducción
    activeEffects.shieldArcane = false;
    activeEffects.novaIgnoresAbilities = false;
    activeEffects.playerGuaranteedDodge = false;
    activeEffects.preciseShot = false;
    // NO reseteamos: monsterStunned, monsterPoisonTurns, eagleEyeActive
    // porque esos persisten hasta que se consumen
}

// Resetear efectos al inicio de cada nuevo combate
// IMPORTANTE: llamar esto en prepareNextMonster()
function resetCombatEffects() {
    activeEffects.monsterStunned = false;
    activeEffects.playerDamageReduction = 1;
    activeEffects.playerNextCritical = false;
    activeEffects.monsterPoisonTurns = 0;
    activeEffects.monsterPoisonDamage = 3;
    activeEffects.playerGuaranteedDodge = false;
    activeEffects.shieldArcane = false;
    activeEffects.novaIgnoresAbilities = false;
    activeEffects.eagleEyeActive = false;
    activeEffects.preciseShot = false;
}
// Sobrescribir takeDamage para el escudo del mercader
const originalTakeDamage = Shield.prototype.takeDamage;


// Empezar el juego
let player, monster, monstersDefeated = 0, currentWeaponDrop;

function startGame() {
  const playerName = document.getElementById("playerNameInput").value.trim();
  if (!playerName) {
      alert("Por favor, ingresa tu nombre.");
      return;
  }
  if (!selectedClass) {
      alert("Por favor, elige tu clase.");
      return;
  }

  player = new Player(playerName, selectedClass);
  monster = generateMonster(monstersDefeated);
  document.getElementById("mapToggleBtn").classList.remove("hidden");
  document.getElementById("playerName").innerText = player.name;
  document.getElementById("playerClass").innerText = selectedClass;
 
  updateEquipment();
  updateStats();
  updatePlayerStats();

  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");
  updatePlayerCard();
  updateMonsterCard(monster);
  setHandVisible(true);
  initIdleAnims();
}

function generateMonster(index) {
  if (index === 9) {
      return new Monster("Jefe Final", 100, 10, "images/boss.gif", specialAbilities.boss);
  }

  const monsterTypes = [
      { name: "Monstruo Comun", hp: 20 + index * 5, attack: 5 + index, avatar: "./images/Monstruo_Comun.jpg" },
      { name: "Monstruo Mago", hp: 20 + index * 5, attack: 5 + index, avatar: "./images/Monstruo_Mago.jpg", ability: specialAbilities.mago },
      { name: "Monstruo Guerrero", hp: 20 + index * 5, attack: 5 + index, avatar: "./images/Monstruo_Guerrero.jpg", ability: specialAbilities.guerrero },
      { name: "Monstruo Explorador", hp: 20 + index * 5, attack: 5 + index, avatar: "./images/explorador_Ingeniero_de_Mazmorras.jpg", ability: specialAbilities.explorador },
  ];

  const randomMonster = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
  return new Monster(randomMonster.name, randomMonster.hp, randomMonster.attack, randomMonster.avatar, randomMonster.ability);
}
// ===================== ANIMACIONES DE AVATARS =====================

function avatarAnim(elementId, className, duration = 500) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.remove("avatar-idle", "avatar-danger");
  el.classList.add(className);
  setTimeout(() => {
    el.classList.remove(className);
    restoreIdleAnim(elementId);
  }, duration);
}

function restoreIdleAnim(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (elementId === "playerAvatar" && player && player.hp < 20) {
    el.classList.add("avatar-danger");
  } else {
    el.classList.add("avatar-idle");
  }
}

function spawnHealParticles(elementId) {
  const anchor = document.getElementById(elementId);
  const rect = anchor.getBoundingClientRect();
  const particles = ["✨", "💛", "🌟", "⭐"];
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      const el = document.createElement("div");
      el.classList.add("heal-particle");
      el.innerText = particles[Math.floor(Math.random() * particles.length)];
      el.style.left = `${rect.left + Math.random() * rect.width}px`;
      el.style.top = `${rect.top + window.scrollY + rect.height * 0.5}px`;
      el.style.position = "absolute";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }, i * 80);
  }
}

function spawnShieldCrack(elementId) {
  const anchor = document.getElementById(elementId);
  const crack = document.createElement("div");
  crack.classList.add("shield-crack");
  anchor.style.position = "relative";
  anchor.appendChild(crack);
  setTimeout(() => crack.remove(), 700);
}

function spawnRegenWaves(elementId) {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const anchor = document.getElementById(elementId);
      const wave = document.createElement("div");
      wave.classList.add("regen-wave");
      anchor.appendChild(wave);
      setTimeout(() => wave.remove(), 900);
    }, i * 250);
  }
}

function triggerMonsterAbilityAnim(monsterName) {
  const el = document.getElementById("monsterAvatar");
  const classMap = {
    "Monstruo Mago":       "mago",
    "Monstruo Guerrero":   "guerrero",
    "Monstruo Explorador": "explorador",
    "Jefe Final":          "boss"
  };
  const cls = classMap[monsterName] || "boss";
  el.classList.add("avatar-monster-ability", cls);
  setTimeout(() => el.classList.remove("avatar-monster-ability", cls), 700);
}

function triggerSkillAnim(className) {
  const el = document.getElementById("playerAvatar");
  el.classList.add("avatar-skill-flash", className.toLowerCase());
  setTimeout(() => el.classList.remove("avatar-skill-flash", className.toLowerCase()), 700);
}

function initIdleAnims() {
  document.getElementById("playerAvatar").classList.add("avatar-idle");
  document.getElementById("monsterAvatar").classList.add("avatar-idle");
}
// Aplica el efecto visual de congelado al avatar del monstruo
// Pone el avatar azulado y "temblando de frío"
function applyFreezeEffect() {
    const el = document.getElementById("monsterAvatar");
    el.classList.add("avatar-frozen");
    // Se quita al inicio del siguiente turno del monstruo
}
 
function removeFreezeEffect() {
    const el = document.getElementById("monsterAvatar");
    el.classList.remove("avatar-frozen");
}
function playerAttack() {
    avatarAnim("playerAvatar", "avatar-attack-player", 450);

    setTimeout(() => {
        const damage = player.attack();
         // Ojo de Águila: crítico garantizado
        let finalDamage = damage;
        if (activeEffects.eagleEyeActive) {
            finalDamage = damage * 2;
            activeEffects.eagleEyeActive = false; // Se consume al usarse
            player.lastAttackWasCritical = true;
        }
        monster.hp -= finalDamage;

        if (player.lastAttackWasCritical) {
            spawnFloatingNumber(damage, "critical", "monsterAvatar");
            avatarAnim("monsterAvatar", "avatar-critical", 500);
        } else {
            spawnFloatingNumber(damage, "damage", "monsterAvatar");
            avatarAnim("monsterAvatar", "avatar-damage", 400);
        }

        updateStats();

        if (monster.hp <= 0) {
            monstersDefeated++;
            let message = `¡Has derrotado al ${monster.name}!`;

            if (monstersDefeated === 10) {
                avatarAnim("playerAvatar", "avatar-victory", 1200);
                setTimeout(() => endGame(true), 1200);
                return;
            }

            currentWeaponDrop = {
                sword: getRandomSword(),
                shield: getRandomShield(),
                bracelet: getRandomBracelet(),
                potion: getRandomPotion(),
            };

            setHandVisible(false);
            disableHand(false);

            if (hasAncestralPact) {
                message += `\nEl monstruo dejó caer una poción de ${currentWeaponDrop.potion.name}.`;
                document.getElementById("keepWeaponButton").classList.add("hidden");
                document.getElementById("changeWeaponButton").classList.add("hidden");
                document.getElementById("usePotionButton").classList.remove("hidden");
                document.getElementById("ancestralLootButton").classList.remove("hidden");
            } else {
                message += `\nEl monstruo dejó caer:\n${currentWeaponDrop.sword.name}\n${currentWeaponDrop.shield.name}\n${currentWeaponDrop.bracelet.name}\n ${currentWeaponDrop.potion.name}`;
                document.getElementById("changeWeaponButton").classList.remove("hidden");
                document.getElementById("keepWeaponButton").classList.remove("hidden");
                document.getElementById("usePotionButton").classList.remove("hidden");
            }

            updateStats(message);

            if (!merchantAppeared && [1,3,5,7].includes(monstersDefeated)) {
                if (Math.random() < 0.20) {
                    setTimeout(() => showMerchant(), 800);
                }
            }

        } else {
            disableHand(true);
            discardCountThisTurn = 0;
            setTimeout(() => {
                monsterAttack();
                updateStats();
                disableHand(false);
                if (player.shield && player.shield.broken) {
                    refreshBlockCards();
                }
            }, 900);
        }
    }, 200);
}
function playerBlock() {
    disableHand(true);
    const blocked = player.block();
    const blockSound = document.getElementById("blockSound");
    const shieldBreakSound = document.getElementById("shieldBreakSound");

    if (blocked) {
        blockSound.play();
        document.getElementById("playerAvatar").classList.add("avatar-block-ray");
        setTimeout(() => document.getElementById("playerAvatar").classList.remove("avatar-block-ray"), 600);

        if (player.curseName === "E") {
            player.hp = Math.max(player.hp - 5, 1);
            spawnFloatingNumber(5, "damage", "playerAvatar");
            avatarAnim("playerAvatar", "avatar-damage", 400);
            updateStats(`${player.name} bloqueó pero la maldición le costó 5 vida.`);
        } else {
            player.recoverHealth(15);
            spawnFloatingNumber(15, "heal", "playerAvatar");
            spawnHealParticles("playerAvatar");
            updateStats(`${player.name} bloqueó el ataque completamente.`);
        }

        spawnFloatingNumber(0, "block", "playerAvatar");
        if (player.hp <= 0) { endGame(false); return; }
        setTimeout(() => disableHand(false), 400);
    } else {
        let damage = Math.floor(Math.random() * monster.attack) + 1;
        if (player.damageReductionActive) {
            damage = Math.floor(damage * 0.5);
            player.damageReductionActive = false;
        }
        player.hp -= damage;
        spawnFloatingNumber(damage, "damage", "playerAvatar");
        avatarAnim("playerAvatar", "avatar-damage", 400);
        player.takeShieldDamage(damage);
        if (player.shield && player.shield.hp === 0 && !player.shield.isUnbreakable) {
            shieldBreakSound.play();
            spawnShieldCrack("playerAvatar");
        }
        player.recoverHealth(5);
        spawnFloatingNumber(5, "heal", "playerAvatar");
        updateStats(`No logró bloquear.`);
        if (player.hp <= 0) { endGame(false); return; }
        setTimeout(() => disableHand(false), 400);
    }
    restoreIdleAnim("playerAvatar");
    discardCountThisTurn = 0;
}
function handleSpecialCard(action) {
    disableHand(true);
 
    switch (action) {
 
        // ——— GUERRERO ———
 
        case "golpeBrutal": {
            // Ataque x1.5 pero cuesta 3 vida al jugador
            avatarAnim("playerAvatar", "avatar-attack-player", 450);
            setTimeout(() => {
                const baseDamage = Math.floor(Math.random() * 6) + 1;
                const damage = Math.floor(baseDamage * player.sword.multiplier * player.attackMultiplier * 1.5);
                monster.hp -= damage;
                // Costo de vida
                player.hp = Math.max(player.hp - 3, 1);
                spawnFloatingNumber(3, "damage", "playerAvatar");
                spawnFloatingNumber(damage, "damage", "monsterAvatar");
                avatarAnim("monsterAvatar", "avatar-damage", 400);
                updateStats(`¡Golpe Brutal! ${damage} de daño. Te costó 3 de vida.`);
                if (monster.hp <= 0) { handleMonsterDeath(); return; }
                afterPlayerAction();
            }, 200);
            break;
        }
 
        case "sedDeSangre": {
            // Daño = 50 - hp actual del jugador
            avatarAnim("playerAvatar", "avatar-attack-player", 450);
            setTimeout(() => {
                const damage = Math.max(50 - player.hp, 1); // mínimo 1 de daño
                monster.hp -= damage;
                spawnFloatingNumber(damage, "critical", "monsterAvatar");
                avatarAnim("monsterAvatar", "avatar-critical", 500);
                updateStats(`¡Sed de Sangre! Tu dolor se convierte en ${damage} de daño.`);
                if (monster.hp <= 0) { handleMonsterDeath(); return; }
                afterPlayerAction();
            }, 200);
            break;
        }
 
        case "posturaDefensiva": {
            // Sin ataque — reduce el próximo daño recibido un 80%
            activeEffects.playerDamageReduction = 0.2; // Solo el 20% del daño pasa
            triggerSkillAnim("Guerrero");
            spawnFloatingNumber(0, "block", "playerAvatar");
            updateStats(`¡Postura Defensiva! El próximo daño se reduce un 80%.`);
            // Opción B: el monstruo ataca igual con delay visual
            setTimeout(() => {
                monsterAttack();
                updateStats();
                disableHand(false);
                refreshBlockCards();
            }, 900);
            discardCountThisTurn = 0;
            break;
        }
 
        case "golpeAturdidor": {
            avatarAnim("playerAvatar", "avatar-attack-player", 450);
            setTimeout(() => {
                const damage = player.attack();
                monster.hp -= damage;
                activeEffects.monsterStunned = true;
                applyFreezeEffect();
                spawnFloatingNumber(damage, "damage", "monsterAvatar");
                avatarAnim("monsterAvatar", "avatar-damage", 400);
                updateStats(`¡Golpe Aturdidor! ${damage} de daño. El monstruo pierde su turno.`);
                if (monster.hp <= 0) { handleMonsterDeath(); return; }
                // Pasamos turno al monstruo — el check de stun en monsterAttack() lo bloquea
                setTimeout(() => {
                    monsterAttack();
                    disableHand(false);
                    refreshBlockCards();
                    discardCountThisTurn = 0;
                }, 800);
            }, 200);
            break;
        }
 
        case "contragolpe": {
            // Solo jugable con 30hp o menos — daño doble
            avatarAnim("playerAvatar", "avatar-attack-player", 450);
            setTimeout(() => {
                const baseDamage = player.attack(); // attack() ya incluye multiplicador de espada
                const damage = baseDamage * 2;
                monster.hp -= damage;
                spawnFloatingNumber(damage, "critical", "monsterAvatar");
                avatarAnim("monsterAvatar", "avatar-critical", 500);
                updateStats(`¡Contragolpe! El dolor te da fuerza: ${damage} de daño.`);
                if (monster.hp <= 0) { handleMonsterDeath(); return; }
                afterPlayerAction();
            }, 200);
            break;
        }
 
        case "ejecucion": {
            avatarAnim("playerAvatar", "avatar-attack-player", 450);
            setTimeout(() => {
                const threshold = monster.maxHp * 0.30;
                if (monster.hp <= threshold) {
                    // Muerte instantánea
                    monster.hp = 0;
                    spawnFloatingNumber(999, "critical", "monsterAvatar");
                    avatarAnim("monsterAvatar", "avatar-death", 900);
                    updateStats(`¡EJECUCIÓN! El ${monster.name} es eliminado instantáneamente.`);
                    setTimeout(() => handleMonsterDeath(), 500);
                } else {
                    // Daño normal alto (base x2 sin multiplicador extra)
                    const baseDamage = Math.floor(Math.random() * 6) + 1;
                    const damage = Math.floor(baseDamage * player.sword.multiplier * player.attackMultiplier * 2);
                    monster.hp -= damage;
                    spawnFloatingNumber(damage, "damage", "monsterAvatar");
                    avatarAnim("monsterAvatar", "avatar-damage", 400);
                    updateStats(`Ejecución fallida — el ${monster.name} resiste. ${damage} de daño.`);
                    if (monster.hp <= 0) { handleMonsterDeath(); return; }
                    afterPlayerAction();
                }
            }, 200);
            break;
        }
 
        // ——— MAGO ———
 
        case "helar": {
            activeEffects.monsterStunned = true;
            applyFreezeEffect();
            triggerSkillAnim("Mago");
            spawnFloatingNumber(0, "block", "monsterAvatar");
            updateStats(`¡Helar! El ${monster.name} está congelado y pierde su turno.`);
            // El flag y el visual se limpian en monsterAttack() cuando detecta el stun
            // Igual pasamos turno al monstruo para que el check se ejecute
            setTimeout(() => {
                monsterAttack();
                disableHand(false);
                refreshBlockCards();
                discardCountThisTurn = 0;
            }, 1000);
            break;
        }
 
        case "drenar": {
            // Daño mitad del normal, curás lo que dañaste
            avatarAnim("playerAvatar", "avatar-attack-player", 450);
            setTimeout(() => {
                const baseDamage = Math.floor(Math.random() * 6) + 1;
                const damage = Math.floor(baseDamage * player.sword.multiplier * player.attackMultiplier * 0.5);
                monster.hp -= damage;
                player.recoverHealth(damage); // Curas exactamente lo que dañaste
                spawnFloatingNumber(damage, "damage", "monsterAvatar");
                spawnFloatingNumber(damage, "heal", "playerAvatar");
                spawnHealParticles("playerAvatar");
                avatarAnim("monsterAvatar", "avatar-damage", 400);
                updateStats(`¡Drenar! ${damage} de daño y recuperaste ${damage} de vida.`);
                if (monster.hp <= 0) { handleMonsterDeath(); return; }
                afterPlayerAction();
            }, 200);
            break;
        }
 
        case "mantoLunar": {
            // Sin ataque — +20% bloqueo este turno, robás 1 carta extra
            // El +20% se aplica temporalmente modificando blockChance
            const bonusBlock = 0.20;
            player.shield.blockChance += bonusBlock;
            triggerSkillAnim("Mago");
            spawnFloatingNumber(0, "block", "playerAvatar");
            updateStats(`¡Manto Lunar! +20% de bloqueo este turno. Robás 1 carta extra.`);
            // Robar 1 carta extra sin que el monstruo ataque
            drawCards(1);
            // Revertir el bonus al final del turno (cuando el monstruo ataque)
            // Opción B: el monstruo ataca con delay visual
            disableHand(true);
            setTimeout(() => {
                monsterAttack();
                // Quitar el bonus después del ataque
                player.shield.blockChance = Math.max(player.shield.blockChance - bonusBlock, 0.05);
                updatePlayerStats();
                disableHand(false);
                refreshBlockCards();
            }, 900);
            discardCountThisTurn = 0;
            break;
        }
 
        case "estudiar": {
            // Sin ataque — robás 2 cartas sin que el monstruo ataque
            triggerSkillAnim("Mago");
            drawCards(2);
            updateStats(`¡Estudiar! Robaste 2 cartas sin consecuencias.`);
            disableHand(false);
            refreshBlockCards();
            discardCountThisTurn = 0;
            break;
        }
 
        case "escudoArcano": {
            // Sin ataque — el próximo daño recibido es 0
            activeEffects.shieldArcane = true;
            triggerSkillAnim("Mago");
            spawnFloatingNumber(0, "block", "playerAvatar");
            updateStats(`¡Escudo Arcano! El próximo daño que recibas será anulado.`);
            // Opción B: el monstruo ataca con delay visual
            setTimeout(() => {
                monsterAttack(); // El flag shieldArcane se consume dentro de monsterAttack()
                updateStats();
                disableHand(false);
                refreshBlockCards();
            }, 900);
            discardCountThisTurn = 0;
            break;
        }
 
        case "novaArcana": {
            // Daño fijo 35 — ignora habilidades del monstruo este turno
            avatarAnim("playerAvatar", "avatar-attack-player", 450);
            activeEffects.novaIgnoresAbilities = true;
            setTimeout(() => {
                const damage = 35;
                monster.hp -= damage;
                spawnFloatingNumber(damage, "critical", "monsterAvatar");
                avatarAnim("monsterAvatar", "avatar-critical", 500);
                triggerSkillAnim("Mago");
                updateStats(`¡Nova Arcana! 35 de daño puro. El ${monster.name} no puede reaccionar.`);
                if (monster.hp <= 0) { handleMonsterDeath(); return; }
                afterPlayerAction();
            }, 200);
            break;
        }
 
        // ——— EXPLORADOR ———
 
        case "disparoCertero": {
            // Daño normal — ignora el contraataque del Monstruo Guerrero
            activeEffects.preciseShot = true;
            avatarAnim("playerAvatar", "avatar-attack-player", 450);
            setTimeout(() => {
                const damage = player.attack();
                monster.hp -= damage;
                spawnFloatingNumber(damage, "damage", "monsterAvatar");
                avatarAnim("monsterAvatar", "avatar-damage", 400);
                updateStats(`¡Disparo Certero! ${damage} de daño, ignorando el contraataque.`);
                
                if (monster.hp <= 0) { handleMonsterDeath(); return; }
                afterPlayerAction();
            }, 200);
            break;
        }
 
        case "veneno": {
            // Daño bajo ahora + 3 daño por 3 turnos
            avatarAnim("playerAvatar", "avatar-attack-player", 450);
            setTimeout(() => {
                const baseDamage = Math.floor(Math.random() * 6) + 1;
                const damage = Math.floor(baseDamage * player.sword.multiplier * 0.5);
                monster.hp -= damage;
                // Aplicar veneno (acumula si ya había veneno)
                activeEffects.monsterPoisonTurns = 3;
                activeEffects.monsterPoisonDamage = 3;
                spawnFloatingNumber(damage, "damage", "monsterAvatar");
                // Número flotante verde para el veneno
                spawnFloatingNumber(3, "poison", "monsterAvatar");
                avatarAnim("monsterAvatar", "avatar-damage", 400);
                updateStats(`¡Veneno! ${damage} de daño + 3 de veneno durante 3 turnos.`);
                if (monster.hp <= 0) { handleMonsterDeath(); return; }
                afterPlayerAction();
            }, 200);
            break;
        }
 
        case "ojoDeAguila": {
            // Sin ataque — próximo ataque de ese combate es crítico garantizado
            activeEffects.eagleEyeActive = true;
            triggerSkillAnim("Explorador");
            spawnFloatingNumber(0, "block", "playerAvatar");
            updateStats(`¡Ojo de Águila! Tu próximo ataque será un crítico garantizado.`);
            // No ataca — el monstruo sí ataca (Opción B)
            setTimeout(() => {
                monsterAttack();
                updateStats();
                disableHand(false);
                refreshBlockCards();
            }, 900);
            discardCountThisTurn = 0;
            break;
        }
 
        case "retiradaTactica": {
            // Esquiva garantizada este turno + roba 1 carta
            activeEffects.playerGuaranteedDodge = true;
            triggerSkillAnim("Explorador");
            // Simular el esquive visual
            avatarAnim("playerAvatar", "avatar-dodge", 450);
            spawnFloatingNumber(0, "dodge", "playerAvatar");
            drawCards(1);
            updateStats(`¡Retirada Táctica! Esquivaste y robaste 1 carta.`);
            // El monstruo ataca pero el esquive está garantizado
            setTimeout(() => {
                monsterAttack(); // dodge() retorna true por el flag
                updateStats();
                disableHand(false);
                refreshBlockCards();
                discardCountThisTurn = 0;
            }, 900);
            break;
        }
 
        case "ataqueDoble": {
            // Dos ataques de daño mitad
            avatarAnim("playerAvatar", "avatar-attack-player", 450);
            setTimeout(() => {
                const base1 = Math.floor(Math.random() * 6) + 1;
                const dmg1 = Math.floor(base1 * player.sword.multiplier * player.attackMultiplier * 0.5);
                monster.hp -= dmg1;
                spawnFloatingNumber(dmg1, "damage", "monsterAvatar");
 
                // Segundo golpe con delay para que se vea
                setTimeout(() => {
                    if (monster.hp <= 0) { handleMonsterDeath(); return; }
                    avatarAnim("playerAvatar", "avatar-attack-player", 450);
                    setTimeout(() => {
                        const base2 = Math.floor(Math.random() * 6) + 1;
                        const dmg2 = Math.floor(base2 * player.sword.multiplier * player.attackMultiplier * 0.5);
                        monster.hp -= dmg2;
                        spawnFloatingNumber(dmg2, "damage", "monsterAvatar");
                        avatarAnim("monsterAvatar", "avatar-damage", 400);
                        const total = dmg1 + dmg2;
                        updateStats(`¡Ataque Doble! Dos golpes: ${dmg1} + ${dmg2} = ${total} de daño.`);
                        if (monster.hp <= 0) { handleMonsterDeath(); return; }
                        afterPlayerAction();
                    }, 200);
                }, 500);
            }, 200);
            break;
        }
 
        case "lluviaDeDagas": {
            // 4 ataques de daño base sin multiplicador de arma
            avatarAnim("playerAvatar", "avatar-attack-player", 450);
            let totalDmg = 0;
            let hits = 0;
 
            function nextDaggerHit() {
                if (hits >= 4) {
                    updateStats(`¡Lluvia de Dagas! 4 golpes por un total de ${totalDmg} de daño.`);
                    if (monster.hp <= 0) { handleMonsterDeath(); return; }
                    afterPlayerAction();
                    return;
                }
                setTimeout(() => {
                    // Detener si el monstruo ya murió en un golpe anterior
                    if (monster.hp <= 0) { handleMonsterDeath(); return; }
                    const dmg = Math.floor(Math.random() * 6) + 1;
                    monster.hp -= dmg;
                    totalDmg += dmg;
                    spawnFloatingNumber(dmg, "damage", "monsterAvatar");
                    hits++;
                    updateStats(`Lluvia de Dagas — golpe ${hits}/4...`);
                    nextDaggerHit();
                }, 250);
            }
 
            setTimeout(() => nextDaggerHit(), 200);
            break;
        }
    }
}
function monsterAttack() {
    // Si el monstruo está aturdido (Helar / Golpe Aturdidor), pierde su turno
    if (activeEffects.monsterStunned) {
        activeEffects.monsterStunned = false;
        removeFreezeEffect();
        discardCountThisTurn = 0;
        return;
    }
    // Aplicar daño de veneno al inicio del turno del monstruo
    if (activeEffects.monsterPoisonTurns > 0) {
        monster.hp -= activeEffects.monsterPoisonDamage;
        spawnFloatingNumber(activeEffects.monsterPoisonDamage, "poison", "monsterAvatar");
        activeEffects.monsterPoisonTurns--;
        updateStats(`El veneno hace ${activeEffects.monsterPoisonDamage} de daño al ${monster.name}. (${activeEffects.monsterPoisonTurns} turnos restantes)`);
        if (monster.hp <= 0) {
            setTimeout(() => handleMonsterDeath(), 400);
            return;
        }
    }
 
    // Esquive garantizado por Retirada Táctica
    const dodged = activeEffects.playerGuaranteedDodge || player.dodge();
    activeEffects.playerGuaranteedDodge = false; // Consumir el flag
 
    if (dodged) {
        avatarAnim("monsterAvatar", "avatar-attack-monster", 450);
        setTimeout(() => {
            avatarAnim("playerAvatar", "avatar-dodge", 450);
            spawnFloatingNumber(0, "dodge", "playerAvatar");
            updateStats(`${player.name} esquivó el ataque.`);
            resetTurnEffects();
        }, 200);
    } else {
        avatarAnim("monsterAvatar", "avatar-attack-monster", 450);
        setTimeout(() => {
            let damage = Math.floor(Math.random() * monster.attack) + 1;
 
            // Escudo Arcano: anular el daño completamente
            if (activeEffects.shieldArcane) {
                damage = 0;
                activeEffects.shieldArcane = false;
                spawnFloatingNumber(0, "block", "playerAvatar");
                updateStats(`¡Escudo Arcano absorbió el ataque!`);
                resetTurnEffects();
                return;
            }
 
            // Postura Defensiva / reducción de daño activa
            if (activeEffects.playerDamageReduction < 1) {
                damage = Math.floor(damage * activeEffects.playerDamageReduction);
            }
 
            // Reducción del Guerrero (habilidad de clase)
            if (player.damageReductionActive) {
                damage = Math.floor(damage * 0.5);
                player.damageReductionActive = false;
            }
 
            player.hp -= damage;
            spawnFloatingNumber(damage, "damage", "playerAvatar");
            avatarAnim("playerAvatar", "avatar-damage", 400);
 
            // Habilidades del monstruo — respetando Nova Arcana y Disparo Certero
            if (monster.ability && !activeEffects.novaIgnoresAbilities) {
                // Contraataque del Guerrero ignorado por Disparo Certero
                if (monster.name === "Monstruo Guerrero" && activeEffects.preciseShot) {
                    // No ejecutar contraataque
                } else {
                    triggerMonsterAbilityAnim(monster.name);
                    monster.ability(player, monster);
                }
            }
            activeEffects.novaIgnoresAbilities = false; // consumir después de que el monstruo atacó
            activeEffects.preciseShot = false; 
            if (player.hp <= 0) { endGame(false); return; }
            updateStats(`El ${monster.name} atacó causando ${damage} de daño.`);
            restoreIdleAnim("playerAvatar");
            resetTurnEffects(); // Limpiar efectos temporales al final del turno
        }, 200);
    }
    discardCountThisTurn = 0;
}
function handleMonsterDeath() {
    monstersDefeated++;
    resetCombatEffects(); // Limpiar efectos al cambiar de monstruo
    removeFreezeEffect();
    let message = `¡Has derrotado al ${monster.name}!`;
 
    if (monstersDefeated === 10) {
        avatarAnim("playerAvatar", "avatar-victory", 1200);
        setTimeout(() => endGame(true), 1200);
        return;
    }
 
    currentWeaponDrop = {
        sword: getRandomSword(),
        shield: getRandomShield(),
        bracelet: getRandomBracelet(),
        potion: getRandomPotion(),
    };
 
    setHandVisible(false);
    disableHand(false);
 
    if (hasAncestralPact) {
        message += `\nEl monstruo dejó caer una poción de ${currentWeaponDrop.potion.name}.`;
        document.getElementById("keepWeaponButton").classList.add("hidden");
        document.getElementById("changeWeaponButton").classList.add("hidden");
        document.getElementById("usePotionButton").classList.remove("hidden");
        document.getElementById("ancestralLootButton").classList.remove("hidden");
    } else {
        message += `\nEl monstruo dejó caer:\n${currentWeaponDrop.sword.name}\n${currentWeaponDrop.shield.name}\n${currentWeaponDrop.bracelet.name}\n${currentWeaponDrop.potion.name}`;
        document.getElementById("changeWeaponButton").classList.remove("hidden");
        document.getElementById("keepWeaponButton").classList.remove("hidden");
        document.getElementById("usePotionButton").classList.remove("hidden");
    }
 
    updateStats(message);
 
    if (!merchantAppeared && [1, 3, 5, 7].includes(monstersDefeated)) {
        if (Math.random() < 0.20) {
            setTimeout(() => showMerchant(), 800);
        }
    }
}
function afterPlayerAction() {
    disableHand(true);
    discardCountThisTurn = 0;
    setTimeout(() => {
        monsterAttack();
        updateStats();
        disableHand(false);
        if (player.shield && player.shield.broken) {
            refreshBlockCards();
        }
    }, 900);
}
function changeWeapon() {
    player.sword = currentWeaponDrop.sword;
    player.shield = new Shield(currentWeaponDrop.shield.name, currentWeaponDrop.shield.blockChance, currentWeaponDrop.shield.hp);
    player.shield.playerClass = player.playerClass;
    player.equipBracelet(currentWeaponDrop.bracelet);
    if (player.potions.length < 3) {
        player.potions.push(currentWeaponDrop.potion);
    }
    document.getElementById("changeWeaponButton").classList.add("hidden");
    document.getElementById("keepWeaponButton").classList.add("hidden");
    document.getElementById("usePotionButton").classList.add("hidden");

    updatePlayerStats();
    prepareNextMonster(`${player.name} ahora usa la espada de ${player.sword.name} y el escudo de ${player.shield.name}.`);
}

function keepWeapon() {
    if (player.potions.length < 3) {
        player.potions.push(currentWeaponDrop.potion);
    }
    document.getElementById("changeWeaponButton").classList.add("hidden");
    document.getElementById("keepWeaponButton").classList.add("hidden");
    document.getElementById("usePotionButton").classList.add("hidden");
    prepareNextMonster(`${player.name} mantiene su equipo actual.`);
}

function prepareNextMonster(message) {
    resetCombatEffects();
    removeFreezeEffect();
    monster = generateMonster(monstersDefeated);
    updateMonsterCard(monster);
    document.getElementById("changeWeaponButton").classList.add("hidden");
    document.getElementById("keepWeaponButton").classList.add("hidden");
    document.getElementById("usePotionButton").classList.add("hidden");
    document.getElementById("ancestralLootButton").classList.add("hidden");

    if (player.curseName === "C") {
        player.hp = Math.max(player.hp - 3, 1);
        message += `\nLa Deuda Eterna te cobra 3 puntos de vida.`;
        spawnFloatingNumber(3, "damage", "playerAvatar");
    }

    if (player.playerClass === "Guerrero") {
        player.skillActive = false;
    }

    updateEquipment();
    updateStats(message);
    updateMapNodes();
    setHandVisible(true);
}

function updateEquipment() {
}

function updateStats(message = "") {
    const playerEl = document.getElementById("playerHpDisplay");
    const monsterEl = document.getElementById("monsterHpDisplay");

    const playerHp = Math.max(player.hp, 0);
    const monsterHp = Math.max(monster.hp, 0);

    playerEl.textContent = `❤️ ${playerHp}/50`;
    monsterEl.textContent = `❤️ ${monsterHp}/${monster.maxHp}`;

    playerEl.classList.toggle("danger", playerHp < 20);
    monsterEl.classList.toggle("danger", monsterHp < 20);
    document.getElementById("message").innerText = message;
    if (player && player.hp < 20) {
    const el = document.getElementById("playerAvatar");
    if (!el.classList.contains("avatar-danger")) {
        el.classList.remove("avatar-idle");
        el.classList.add("avatar-danger");
    }
}
}

function updatePlayerStats() {
    document.getElementById("playerSword").innerText = player.sword.name;
    document.getElementById("playerSwordDamage").innerText = player.sword.multiplier;
    document.getElementById("playerShield").innerText = player.shield ? player.shield.name : "Sin Defensa";
    document.getElementById("playerShieldHp").innerText = player.shield
        ? (player.shield.isUnbreakable ? "∞" : player.shield.hp)
        : "N/A";
    document.getElementById("playerShieldBlock").innerText = player.shield
        ? (player.shield.blockChance * 100).toFixed(1) + '%'
        : "N/A";
    document.getElementById("skillUses").innerText = player.skillUses;
    document.getElementById("playerBracelet").innerText = player.bracelet ? player.bracelet.name : "Ninguno";
    document.getElementById("playerPotions").innerText = player.potions.length > 0
        ? player.potions.map(p => p.name).join(", ")
        : "Ninguna";
}
function updatePlayerCard() {
    const classBgs = {
        "Guerrero": "./images/card_guerrero.jpg",
        "Mago":     "./images/card_mago.jpg",
        "Explorador": "./images/card_explorador.jpg"
    };
    const classIcons = {
        "Guerrero":   '<i class="fa-solid fa-shield"></i>',
        "Mago":       '<i class="fa-solid fa-hat-wizard"></i>',
        "Explorador": '<i class="fa-solid fa-binoculars"></i>'
    };
    document.getElementById("playerCardBg").style.backgroundImage = `url('${classBgs[player.playerClass]}')`;

}

function setHandVisible(visible) {
  const deck = document.getElementById("cardDeck");
  discardMode = false;
  discardCountThisTurn = 0;
  document.getElementById("discardBtn")?.classList.remove("active");
  if (!deck) return;
  
  if (visible) {
    playerHand = [];
    skillCardsDealtThisRound = 0;
    blockCardsAllowed = player.shield && !player.shield.broken;
    renderHand();
    deck.classList.remove("deck-inactive");
  } else {
    playerHand = [];
    skillCardsDealtThisRound = 0;
    blockCardsAllowed = player.shield && !player.shield.broken;
    renderHand();
    deck.classList.add("deck-inactive");
  }
}
function disableHand(disabled) {
    document.querySelectorAll(".action-card").forEach(c => {
        if (disabled) {
            c.classList.add("disabled");
        } else {
            if (c.dataset.action === "block" && (!player.shield || player.shield.broken)) return;
            c.classList.remove("disabled");
        }
    });
}


function updateMonsterCard(m) {
    const icons = {
        "Monstruo Comun":      "",
        "Monstruo Mago":       "",
        "Monstruo Guerrero":   "",
        "Monstruo Explorador": "",
        "Jefe Final":          ""
    };
    document.getElementById("monsterCardBg").style.backgroundImage = `url('${m.avatar}')`;
    document.getElementById("monsterCardIcon").innerText = icons[m.name] || "";
    document.getElementById("monsterCardName").innerText = m.name;
}
function endGame(victory) {
  document.getElementById("game-screen").classList.add("hidden");
  document.getElementById("end-screen").classList.remove("hidden");

  document.getElementById("endMessage").innerText = victory
      ? `¡Felicidades ${player.name}! Has derrotado al jefe final.`
      : `¡${player.name} ha sido derrotado! Intenta de nuevo.`;

  document.getElementById("restartButton").classList.remove("hidden");
}

function restartGame() {
    monstersDefeated = 0;
    merchantAppeared = false;
    hasAncestralPact = false;
    hybridClass = null;
    player = null;
    skillCardsDealtThisRound = 0;
    blockCardsAllowed = true;
    playerHand = [];
    discardMode = false;
    discardCountThisTurn = 0;
    const hand = document.getElementById("actionHand");
    if (hand) hand.innerHTML = "";

    document.getElementById("end-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");
    document.getElementById("mapToggleBtn").classList.add("hidden");
    document.getElementById("dungeonMap").classList.add("hidden");
}
function goToIntro() {
    // Reiniciar todo el estado del juego
    monstersDefeated = 0;
    merchantAppeared = false;
    hasAncestralPact = false;
    hybridClass = null;
    player = null;
    skillCardsDealtThisRound = 0;
    blockCardsAllowed = true;
    playerHand = [];
    discardMode = false;
    discardCountThisTurn = 0;
    resetCombatEffects();
    removeFreezeEffect();

    const hand = document.getElementById("actionHand");
    if (hand) hand.innerHTML = "";

    // Cerrar el panel de config
    toggleConfig();

    // Ocultar todas las pantallas
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("end-screen").classList.add("hidden");
    document.getElementById("mapToggleBtn").classList.add("hidden");
    document.getElementById("dungeonMap").classList.add("hidden");

    // Volver a la intro con fundido
    const overlay = document.createElement("div");
    overlay.style.cssText = `
        position: fixed; inset: 0; background: black;
        opacity: 0; z-index: 1000;
        transition: opacity 0.6s ease; pointer-events: none;
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => { overlay.style.opacity = "1"; });
    });

    setTimeout(() => {
        document.getElementById("intro-screen").style.display = "";
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 600);
    }, 600);
}
function getRandomSword() {
  const keys = Object.keys(swords);
  return swords[keys[Math.floor(Math.random() * keys.length)]][player.playerClass];
}

function getRandomShield() {
  const keys = Object.keys(shields);
  const key = keys[Math.floor(Math.random() * keys.length)];
  const s = shields[key][player.playerClass];
  const newShield = new Shield(s.name, s.blockChance, s.hp);
  newShield.playerClass = player.playerClass;
  return newShield;
}

function getRandomBracelet() {
  const keys = Object.keys(bracelets);
  return bracelets[keys[Math.floor(Math.random() * keys.length)]];
}

function getRandomPotion() {
  const keys = Object.keys(potions);
  return potions[keys[Math.floor(Math.random() * keys.length)]];
}

// Funciones de animación
function addAnimation(element, animationClass) {
  element.classList.add(animationClass);
  setTimeout(() => {
      element.classList.remove(animationClass);
  }, 500);
}

function useSkill() {
    if (player) player.applySkill(player.playerClass);
}

function usePotion() {
  if (player && player.potions.length > 0) {
    // Si ya hay un menú abierto, lo cerramos
    const existing = document.getElementById("potionMenu");
    if (existing) { existing.remove(); return; }

    // Crear el menú
    const menu = document.createElement("div");
    menu.id = "potionMenu";
    menu.innerHTML = `<p><strong>¿Qué poción querés usar?</strong></p>`;

    // Un botón por poción
    player.potions.forEach((potion, index) => {
      const btn = document.createElement("button");
      btn.innerText = potion.name;
      btn.onclick = () => {
            potion.effect(player);
            player.potions.splice(index, 1);
            updatePlayerStats();
            menu.remove();
            document.getElementById("changeWeaponButton").classList.add("hidden");
            document.getElementById("keepWeaponButton").classList.add("hidden");
            document.getElementById("usePotionButton").classList.add("hidden");
            document.getElementById("ancestralLootButton").classList.add("hidden");
            prepareNextMonster(`Usaste una poción de ${potion.name} y avanzás al siguiente combate.`);
        };
      menu.appendChild(btn);
    });

    // Botón cancelar
    const cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Cancelar";
    cancelBtn.style.backgroundColor = "#555";
    cancelBtn.onclick = () => menu.remove();
    menu.appendChild(cancelBtn);

    // Insertar el menú debajo del botón
    document.getElementById("usePotionButton").insertAdjacentElement("afterend", menu);
  } else {
    document.getElementById("message").innerText += `\nNo tenés pociones disponibles.`;
  }
}
function goToClassSelection() {
  const overlay = document.createElement("div");
  overlay.id = "transitionOverlay";
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: black;
    opacity: 0;
    z-index: 1000;
    transition: opacity 0.6s ease;
    pointer-events: none;
  `;
  document.body.appendChild(overlay);

  // Fase 1: oscurecer
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });
  });

  // Fase 2: cambiar pantalla cuando está negro
  setTimeout(() => {
    document.getElementById("intro-screen").style.display = "none";
    document.getElementById("start-screen").classList.remove("hidden");

    // Fase 3: aclarar
    overlay.style.opacity = "0";
    setTimeout(() => overlay.remove(), 600);
  }, 600);
}
// Asegurar de que la pantalla de selección de clase esté oculta al inicio
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("intro-screen").classList.remove("hidden");
  document.getElementById("start-screen").classList.add("hidden");
});

function toggleModal(id) {
  const modal = document.getElementById(id);
  modal.classList.toggle("hidden");
    // Construir grilla de cartas al abrir
  if (id === "cardDeckModal" && player && !modal.classList.contains("hidden")) {
    buildCardDeckGrid();
  }
  // Si es el modal del jugador, actualizamos sus stats al abrirlo
  if (id === "playerInfoModal" && player && !modal.classList.contains("hidden")) {
    document.getElementById("modalPlayerStats").innerHTML = `
      <p>👤 <strong>${player.name}</strong> — ${player.playerClass}</p>
      <p>❤️ Vida: ${player.hp} / 50</p>
      <p>⚔️ Espada: ${player.sword.name} (x${player.sword.multiplier})</p>
      <p>🛡️ Escudo: ${player.shield ? player.shield.name : "Sin escudo"} 
         ${player.shield ? `(HP: ${player.shield.hp}, Bloqueo: ${(player.shield.blockChance*100).toFixed(0)}%)` : ""}</p>
      <p>💍 Brazalete: ${player.bracelet ? player.bracelet.name : "Ninguno"}</p>
      <p>🧪 Pociones: ${player.potions.length > 0 ? player.potions.map(p => p.name).join(", ") : "Ninguna"}</p>
      <p>✨ Habilidades restantes: ${player.skillUses}</p>
    `;
  }

  // Cerrar al hacer clic fuera del contenido
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };
}

function spawnFloatingNumber(amount, type, anchorElementId) {
  const anchor = document.getElementById(anchorElementId);
  const rect = anchor.getBoundingClientRect();

  const el = document.createElement("div");
  el.classList.add("floating-number");

  // Tipo determina color y símbolo
  const config = {
    damage:   { color: "#e74c3c", text: `-${amount}` },
    heal:     { color: "#2ecc71", text: `+${amount}` },
    block:    { color: "#3498db", text: `🛡️ Bloqueado` },
    dodge:    { color: "#f1c40f", text: `💨 Esquivado` },
    shield:   { color: "#e67e22", text: `-${amount} escudo` },
    critical: { color: "#f39c12", text: `💥 CRÍTICO! -${amount}` },
    poison:   { color: "#8e44ad", text: `☠️ -${amount} veneno` },
  };

  const c = config[type] || config.damage;
  el.innerText = c.text;
  el.style.color = c.color;

  // Posición aleatoria levemente desplazada sobre el avatar
  el.style.left = `${rect.left + rect.width / 2 + (Math.random() * 30 - 15)}px`;
  el.style.top = `${rect.top + window.scrollY}px`;
  el.style.position = "absolute";

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}
function toggleMap() {
  const map = document.getElementById("dungeonMap");
  map.classList.toggle("hidden");
  updateMapNodes();
}

function updateMapNodes() {
  const container = document.getElementById("mapNodes");
  container.innerHTML = "";

  for (let i = 0; i < 10; i++) {
    const isBoss = i === 9;
    const isDefeated = i < monstersDefeated;
    const isCurrent = i === monstersDefeated;

    // Nodo
    const node = document.createElement("div");
    node.classList.add("map-node");

    const circle = document.createElement("div");
    circle.classList.add("map-node-circle");
    if (isBoss) circle.classList.add("boss");
    if (isDefeated) circle.classList.add("defeated");
    if (isCurrent) circle.classList.add("current");

    circle.innerText = isBoss ? "☠️" : isDefeated ? "✓" : isCurrent ? "⚔️" : `${i + 1}`;

    const label = document.createElement("div");
    label.classList.add("map-node-label");
    if (isDefeated) label.classList.add("defeated");
    if (isCurrent) label.classList.add("current");
    if (isBoss) label.classList.add("boss");

    label.innerText = isBoss
      ? "Jefe Final"
      : isDefeated
      ? `Monstruo ${i + 1} — Derrotado`
      : isCurrent
      ? `Monstruo ${i + 1} — Actual`
      : `Monstruo ${i + 1}`;

    node.appendChild(circle);
    node.appendChild(label);
    container.appendChild(node);

    // Línea conectora (excepto después del último)
    if (i < 9) {
      const connector = document.createElement("div");
      connector.classList.add("map-connector");
      if (isDefeated) connector.classList.add("defeated");
      container.appendChild(connector);
    }
  }
}
function showMerchant() {
  merchantAppeared = true;
  const randomCurse = getRandomCurse();
  const isMage = player.playerClass === "Mago";
  const canAfford = player.hp > 15;
  const ancestralCurse = getRandomCurse();

  showMerchantWithEffects(() => {
    const modal = document.createElement("div");
    modal.id = "merchantModal";
    modal.classList.add("modal");

    const commonDealHTML = `
      <div class="merchant-deal">
        <h4>⚔️ Trato del Mercader</h4>
        <p>Espada de Obsidiana + Escudo de Diamante<br><strong>O</strong><br>Espada de Diamante + Escudo de Obsidiana</p>
        <p>A cambio de: <strong>15 pts de vida</strong> O <strong>Maldición: ${randomCurse.name}</strong><br>
        <em>${randomCurse.description}</em></p>
        ${canAfford ? `
        <button onclick="acceptMerchantDeal('life', '${randomCurse.id}')">Pagar 15 pts de vida</button>
        <button onclick="acceptMerchantDeal('curse', '${randomCurse.id}')">Aceptar maldición</button>
        ` : `<p style="color:#e74c3c">⚠️ No te queda suficiente sangre para este trato.</p>
        <button onclick="acceptMerchantDeal('curse', '${randomCurse.id}')">Aceptar maldición</button>`}
      </div>
    `;

    const ancestralHTML = isMage ? `
      <hr style="border-color:#8e44ad; margin: 16px 0">
      <div class="merchant-deal">
        <h4>🔮 Pacto Ancestral <em>(solo magos)</em></h4>
        <p>Espada del Mercader + Escudo del Mercader + Brazalete del Mercader<br>
        Golpes críticos 15% · Escudo irrompible (35% bloqueo, mín 10%) · Clase híbrida</p>
        <p>A cambio de: <strong>15 pts de vida</strong> + <strong>Maldición: ${ancestralCurse.name}</strong><br>
        <em>${ancestralCurse.description}</em></p>
        ${canAfford ? `<button style="background:#8e44ad" onclick="acceptAncestralPact('${ancestralCurse.id}')">Firmar Pacto Ancestral</button>`
        : `<p style="color:#e74c3c">⚠️ No te queda suficiente sangre.</p>`}
      </div>
    ` : '';

    modal.innerHTML = `
      <div class="modal-content">
        <div style="text-align:center; margin-bottom:12px">
          <img src="./images/mercader.jpg" alt="Mercader" style="width:80px;height:80px;border-radius:50%;border:2px solid #e67e22;object-fit:cover;">
        </div>
        <h3 style="color:#e67e22; text-align:center">El Mercader</h3>
        <p id="merchantTypewriter"></p>
        ${commonDealHTML}
        ${ancestralHTML}
        <button style="background:#555; margin-top:8px" onclick="closeMerchant()">Rechazar y continuar</button>
      </div>
    `;

    document.body.appendChild(modal);
  });
}

function getRandomCurse() {
    const curses = [
        { id: "A", name: "Marca de Sangre", description: "Cada ataque te cuesta 1 punto de vida." },
        { id: "B", name: "Sombra del Mercader", description: "Perdés 1 uso de habilidad permanentemente." },
        { id: "C", name: "Deuda Eterna", description: "Al inicio de cada combate perdés 3 puntos de vida." },
        { id: "D", name: "Ojo Maldito", description: "Tu probabilidad de esquivar cae a 0 permanentemente." },
        { id: "E", name: "Peso del Trato", description: "Al bloquear exitosamente perdés 5 vida en vez de ganar 15." },
    ];
    return curses[Math.floor(Math.random() * curses.length)];
}

function applyCurse(curseId) {
    player.curseName = curseId;
    switch(curseId) {
        case "B":
            player.skillUses = Math.max(player.skillUses - 1, 0);
            break;
        case "D":
            player.dodgeChance = 0;
            break;
    }
    updatePlayerStats();
}

function acceptMerchantDeal(paymentType, curseId) {
    const combo = Math.random() < 0.5
        ? { sword: swords.exotica[player.playerClass], shield: new Shield(shields.rara[player.playerClass].name, shields.rara[player.playerClass].blockChance, shields.rara[player.playerClass].hp) }
        : { sword: swords.rara[player.playerClass],   shield: new Shield(shields.exotica[player.playerClass].name, shields.exotica[player.playerClass].blockChance, shields.exotica[player.playerClass].hp) };

    player.sword = combo.sword;
    player.shield = combo.shield;
    player.shield.playerClass = player.playerClass;

    if (paymentType === 'life') {
        player.hp -= 15;
    } else {
        applyCurse(curseId);
    }

    updateEquipment();
    updatePlayerStats();
    closeMerchant();
    prepareNextMonsterAfterMerchant();
}

function acceptAncestralPact(curseId) {
    hasAncestralPact = true;

    // Equipar armas del mercader
    player.sword = merchantSword;
    player.shield = new Shield("❓ Defensa No Identificada", 0.35, Infinity);
    player.shield.isUnbreakable = true;
    player.shield.takeDamage = function(damage) {
        // Irrompible pero reduce bloqueo
        this.blockChance = Math.max(this.blockChance - 0.005, 0.10);
        updatePlayerStats();
        return false;
    };
    player.equipBracelet(merchantBracelet);
    // Pagar precio
    player.hp -= 15;
    applyCurse(curseId);

    // Mostrar elección de clase híbrida
    closeMerchant();
    showHybridClassChoice();

    updateEquipment();
    updatePlayerStats();
    
}

function showHybridClassChoice() {
    const modal = document.createElement("div");
    modal.id = "hybridModal";
    modal.classList.add("modal");
    modal.innerHTML = `
        <div class="modal-content">
            <h3 style="color:#8e44ad">🔮 Brazalete del Mercader</h3>
            <p>El brazalete pulsa con poder. Elegí tu combinación de clases:</p>
            <button style="background:#8e44ad" onclick="selectHybridClass('Guerrero')">
                <i class="fa-solid fa-shield"></i> Mago-Guerrero
            </button>
            <button style="background:#8e44ad" onclick="selectHybridClass('Explorador')">
                <i class="fa-solid fa-binoculars"></i> Mago-Explorador
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

function selectHybridClass(className) {
    hybridClass = className;
    const modal = document.getElementById("hybridModal");
    if (modal) modal.remove();

    updatePlayerStats();
    updateEquipment();

    document.getElementById("changeWeaponButton").classList.add("hidden");
    document.getElementById("keepWeaponButton").classList.add("hidden");
    document.getElementById("usePotionButton").classList.add("hidden");
    document.getElementById("ancestralLootButton").classList.add("hidden");

    prepareNextMonster(`¡Pacto Ancestral firmado! Ahora eres un Mago-${hybridClass}.`);
}

function closeMerchant() {
  const modal = document.getElementById("merchantModal");
  if (modal) modal.remove();
  const overlay = document.getElementById("merchantOverlay");
  if (overlay) overlay.remove();
}
function prepareNextMonsterAfterMerchant() {
    // Continuar el flujo normal
    monster = generateMonster(monstersDefeated);
    document.getElementById("monsterAvatar").src = monster.avatar;
    document.getElementById("changeWeaponButton").classList.add("hidden");
    document.getElementById("keepWeaponButton").classList.add("hidden");
    setHandVisible(true);
    document.getElementById("usePotionButton").classList.add("hidden");
    updateEquipment();
    updateStats(`Un nuevo enemigo aparece: ${monster.name}`);
    updateMapNodes();
}
function takeAncestralPotion() {
    if (player.potions.length >= 3) {
        updateStats("Ya tenés 3 pociones, no podés cargar más.");
        return;
    }
    player.potions.push(currentWeaponDrop.potion);
    updatePlayerStats();
    document.getElementById("ancestralLootButton").classList.add("hidden");
    document.getElementById("usePotionButton").classList.add("hidden");
    updateStats(`Tomaste una poción de ${currentWeaponDrop.potion.name}.`);
    prepareNextMonster(`Siguiente combate.`);
}
function spawnSmoke() {
  return new Promise(resolve => {
    const count = 30;
    const centerX = window.innerWidth / 2;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const particle = document.createElement("div");
        particle.classList.add("smoke-particle");

        const duration = 1.5 + Math.random() * 1.2;
        const offsetX = (Math.random() - 0.5) * 300;

        particle.style.setProperty("--duration", `${duration}s`);
        particle.style.left = `${centerX + offsetX}px`;
        particle.style.bottom = `${Math.random() * 80}px`;

        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), duration * 1000);
      }, i * 60);
    }

    // Resolver cuando termina el humo
    setTimeout(resolve, count * 60 + 800);
  });
}

function typewriterEffect(elementId, text, speed = 45) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = "";
  let i = 0;
  const interval = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) clearInterval(interval);
  }, speed);
}

async function showMerchantWithEffects(buildModalFn) {
  // 1 — Crear overlay y oscurecer pantalla
  const overlay = document.createElement("div");
  overlay.id = "merchantOverlay";
  document.body.appendChild(overlay);

  // Forzar reflow para que la transición arranque
  overlay.getBoundingClientRect();
  overlay.classList.add("dark");

  // 2 — Esperar que oscurezca
  await new Promise(r => setTimeout(r, 900));

  // 3 — Humo
  await spawnSmoke();

  // 4 — Construir y mostrar modal
  buildModalFn();

  // 5 — Typewriter después del zoom
  setTimeout(() => {
    typewriterEffect("merchantTypewriter", '"Tengo exactamente lo que necesitás... por un pequeño precio."', 45);
  }, 750);
}


let leafInterval = null;

function toggleConfig() {
  const panel = document.getElementById("configPanel");
  panel.classList.toggle("open");
}

function setVolume(value) {
  document.getElementById("blockSound").volume = value;
  document.getElementById("shieldBreakSound").volume = value;
}

function testSound() {
  const sound = document.getElementById("blockSound");
  sound.currentTime = 0;
  sound.play();
}
// ===================== SISTEMA DE MANO DE CARTAS =====================

// Definición de tipos de carta por clase — fácil de expandir
const cardTypes = {
    // — BÁSICAS (todas las clases) —
    attack:  (cls) => ({ type: "attack",  label: "Atacar",    img: `./targetas/${cls}_ataque.jpg`    }),
    block:   (cls) => ({ type: "block",   label: "Bloquear",  img: `./targetas/${cls}_bloqueo.jpg`   }),
    skill:   (cls) => ({ type: "skill",   label: labelForSkill(cls), img: `./targetas/${cls}_habilidad.jpg` }),
    hybrid:  ()    => ({ type: "hybrid",  label: labelForSkill(hybridClass), img: `./targetas/${(hybridClass||"guerrero").toLowerCase()}_habilidad.jpg` }),
 
    // — GUERRERO —
    golpeBrutal:      () => ({ type: "golpeBrutal",      label: "Golpe Brutal",      img: "./targetas/guerrero/golpeBrutal.jpg"      }),
    sedDeSangre:      () => ({ type: "sedDeSangre",      label: "Sed de Sangre",     img: "./targetas/guerrero/sedDeSangre.jpg"      }),
    posturaDefensiva: () => ({ type: "posturaDefensiva", label: "Postura Defensiva", img: "./targetas/guerrero/posturaDefensiva.jpg" }),
    golpeAturdidor:   () => ({ type: "golpeAturdidor",   label: "Golpe Aturdidor",   img: "./targetas/guerrero/golpeAturdidor.jpg"   }),
    contragolpe:      () => ({ type: "contragolpe",      label: "Contragolpe",       img: "./targetas/guerrero/contraataque.jpg"     }),
    ejecucion:        () => ({ type: "ejecucion",        label: "Ejecución",         img: "./targetas/guerrero/guerrero_ulti.jpg"    }),
 
    // — MAGO —
    helar:          () => ({ type: "helar",          label: "Helar",          img: "./targetas/mago/helar.jpg"          }),
    drenar:         () => ({ type: "drenar",         label: "Drenar",         img: "./targetas/mago/drenar.jpg"         }),
    mantoLunar:     () => ({ type: "mantoLunar",     label: "Manto Lunar",    img: "./targetas/mago/mantoLunar.jpg"     }),
    estudiar:       () => ({ type: "estudiar",       label: "Estudiar",       img: "./targetas/mago/estudiar.jpg"       }),
    escudoArcano:   () => ({ type: "escudoArcano",   label: "Escudo Arcano",  img: "./targetas/mago/escudoArcano.jpg"   }),
    novaArcana:     () => ({ type: "novaArcana",     label: "Nova Arcana",    img: "./targetas/mago/NovaArcana.jpg"     }),
 
    // — EXPLORADOR —
    disparoCertero: () => ({ type: "disparoCertero", label: "Disparo Certero", img: "./targetas/explorador/disparoCertero.jpg" }),
    veneno:         () => ({ type: "veneno",         label: "Veneno",          img: "./targetas/explorador/veneno.jpg"         }),
    ojoDeAguila:    () => ({ type: "ojoDeAguila",    label: "Ojo de Águila",   img: "./targetas/explorador/ojoDeAguila.jpg"    }),
    retiradaTactica:() => ({ type: "retiradaTactica",label: "Retirada Táctica",img: "./targetas/explorador/retiradaTactica.jpg"}),
    ataqueDoble:    () => ({ type: "ataqueDoble",    label: "Ataque Doble",    img: "./targetas/explorador/AtaqueDoble.jpg"   }),
    lluviaDeDagas:  () => ({ type: "lluviaDeDagas",  label: "Lluvia de Dagas", img: "./targetas/explorador/lluviaDeDagas.jpg"  }),
};
 

function labelForSkill(cls) {
  const labels = { "Guerrero": "Furia", "Mago": "Meditar", "Explorador": "Fabricar" };
  return labels[cls] || "Habilidad";
}

// Mano actual
let playerHand = [];

function getAvailableCardTypes() {
    const cls = player.playerClass;
    const clsLow = cls.toLowerCase();
 
    // Cartas básicas disponibles para todas las clases
    let types = ["attack", "block", "skill"];
    if (hasAncestralPact && hybridClass) types.push("hybrid");
 
    // Agregar cartas especiales según la clase del jugador
    if (cls === "Guerrero") {
        types.push("golpeBrutal", "sedDeSangre", "posturaDefensiva", "golpeAturdidor", "ejecucion");
        // Contragolpe solo aparece si el jugador tiene 30hp o menos
        if (player.hp <= 30) types.push("contragolpe");
    }
 
    if (cls === "Mago") {
        types.push("helar", "drenar", "mantoLunar", "estudiar", "escudoArcano", "novaArcana");
    }
 
    if (cls === "Explorador") {
        types.push("disparoCertero", "veneno", "ojoDeAguila", "retiradaTactica", "ataqueDoble", "lluviaDeDagas");
    }
 
    return types;
}

// Contadores de carta por ronda
let skillCardsDealtThisRound = 0;
let blockCardsAllowed = true;

function drawRandomCard() {
    const cls = player.playerClass.toLowerCase();
 
    // Filtrar tipos no disponibles según condiciones actuales
    const types = getAvailableCardTypes().filter(type => {
        // Cartas de habilidad: limitadas por usos restantes
        if (type === "skill" || type === "hybrid") {
            return skillCardsDealtThisRound < player.skillUses;
        }
        // Cartas de bloqueo: solo si el escudo no está roto
        if (type === "block") {
            return blockCardsAllowed;
        }
        // Contragolpe ya está filtrado en getAvailableCardTypes()
        // pero doble check por seguridad
        if (type === "contragolpe") {
            return player.hp <= 30;
        }
        return true;
    });
 
    // Fallback a ataque si no hay tipos válidos
    if (types.length === 0) return cardTypes.attack(cls);
 
    const type = types[Math.floor(Math.random() * types.length)];
 
    // Contar cartas de habilidad repartidas esta ronda
    if (type === "skill" || type === "hybrid") {
        skillCardsDealtThisRound++;
    }
 
    // Llamar la función del tipo correspondiente
    // Las básicas reciben (cls), las especiales no necesitan parámetro
    const basicTypes = ["attack", "block", "skill", "hybrid"];
    if (basicTypes.includes(type)) {
        return cardTypes[type](cls);
    } else {
        return cardTypes[type]();
    }
}

function drawCards(amount) {
  for (let i = 0; i < amount; i++) {
    if (playerHand.length < 5) {
      playerHand.push(drawRandomCard());
    }
  }
  renderHand();
  updateDeckState();
}

function renderHand() {
  const hand = document.getElementById("actionHand");
  hand.innerHTML = "";

  playerHand.forEach((cardData, index) => {
    const card = document.createElement("div");
    card.classList.add("action-card");
    if (cardData.type === "hybrid") card.classList.add("hybrid-card");
    card.dataset.action = cardData.type;
    card.dataset.index = index;

    card.innerHTML = `
      <img class="action-card-img" src="${cardData.img}" alt="${cardData.label}">
      <div class="action-card-label">${cardData.label}</div>
    `;

    // Deshabilitar bloqueo si escudo roto
    if (cardData.type === "block" && player.shield && player.shield.broken) {
      card.classList.add("disabled");
    }

    card.addEventListener("click", () => handleCardClick(card));
    card.addEventListener("contextmenu", (e) => e.preventDefault());

    hand.appendChild(card);

    // Animar entrada
    setTimeout(() => card.classList.add("in-play"), index * 120);
  });
}

function discardCard(cardElement, index) {
  return new Promise(resolve => {
    cardElement.classList.remove("in-play");
    cardElement.classList.add("discarding");
    setTimeout(() => {
      playerHand.splice(index, 1);
      renderHand();
      if (discardMode) {
        document.querySelectorAll(".action-card").forEach(c => {
          c.classList.add("discard-mode");
        });
      }
      updateDeckState();
      resolve();
    }, 400);
  });
}

function updateDeckState() {
  const deck = document.getElementById("cardDeck");
  if (!deck) return;
  if (playerHand.length <= 3) {
    deck.classList.remove("deck-inactive");
  } else {
    deck.classList.add("deck-inactive");
  }
}

function handleDeckClick() {
  const deck = document.getElementById("cardDeck");
  if (deck.classList.contains("deck-inactive")) return;

  if (playerHand.length === 0) {
    // Ronda nueva — robar 5
    drawCards(5);
  } else if (playerHand.length <= 3) {
    // Gastar turno para robar 2
    disableHand(true);
    drawCards(2);
    setTimeout(() => {
      monsterAttack();
      updateStats();
      disableHand(false);
      refreshBlockCards();
    }, 900);
  }
}
function getDiscardCost() {
  if (discardCountThisTurn < 2) return 1;
  if (discardCountThisTurn === 2) return 3;
  return 5;
}

function toggleDiscardMode() {
  if (playerHand.length === 0) return;
  discardMode = !discardMode;

  const btn = document.getElementById("discardBtn");
  btn.classList.toggle("active", discardMode);

  document.querySelectorAll(".action-card").forEach(c => {
    if (discardMode) {
      c.classList.add("discard-mode");
    } else {
      c.classList.remove("discard-mode");
    }
  });
}

function handleDiscardClick(card, index) {
  const cost = getDiscardCost();

  player.hp = Math.max(player.hp - cost, 1);
  spawnFloatingNumber(cost, "damage", "playerAvatar");
  discardCountThisTurn++;

  discardCard(card, index).then(() => {
    updateStats();
    refreshBlockCards();
    if (playerHand.length === 0) {
      discardMode = false;
      document.getElementById("discardBtn").classList.remove("active");
    }
  });
}
function handleCardClick(card) {
  if (card.classList.contains("disabled") && !discardMode) return;

  const index = parseInt(card.dataset.index);

  if (discardMode) {
    handleDiscardClick(card, index);
    return;
  }

  if (card.classList.contains("disabled")) return;

  const action = card.dataset.action;
  card.classList.add("selecting");
  disableHand(true);

  setTimeout(async () => {
    card.classList.remove("selecting");
    await discardCard(card, index);

    if (action === "attack") {
      playerAttack();
    } else if (action === "block") {
      playerBlock();
    } else if (action === "skill") {
      player.applySkill(player.playerClass);
      disableHand(false);
      refreshBlockCards();
    } else if (action === "hybrid") {
      const el = document.getElementById("playerAvatar");
      el.classList.add("avatar-hybrid-flash");
      setTimeout(() => el.classList.remove("avatar-hybrid-flash"), 800);
      player.applySkill(hybridClass);
      disableHand(false);
      refreshBlockCards();
    } else {
        // NUEVAS CARTAS — delegar al manejador de cartas especiales
        handleSpecialCard(action);
    }
  }, 380);
}

function refreshBlockCards() {
  document.querySelectorAll(".action-card").forEach(c => {
    if (c.dataset.action === "block") {
      if (player && player.shield && player.shield.broken) {
        c.classList.add("disabled");
      } else {
        c.classList.remove("disabled");
      }
    }
  });
}

function disableHand(disabled) {
  document.querySelectorAll(".action-card").forEach(c => {
    if (disabled) {
      c.classList.add("disabled");
    } else {
      c.classList.remove("disabled");
    }
  });
  if (!disabled) refreshBlockCards();
}

document.addEventListener("DOMContentLoaded", function () {
  const deck = document.getElementById("cardDeck");
  if (deck) deck.addEventListener("click", handleDeckClick);
  const discardBtn = document.getElementById("discardBtn");
  if (discardBtn) discardBtn.addEventListener("click", toggleDiscardMode);
});
// ===================== MODAL MAZO — CARRUSEL =====================
const cardDescriptions = {
    attack:           "Realizás un ataque normal con tu arma actual. El daño depende del multiplicador de tu espada.",
    block:            "Intentás bloquear el próximo ataque del monstruo. Si bloqueás, recuperás 15 vida. Si fallás, recibís daño y una parte va a tu escudo.",
    skill:            "Usás tu habilidad de clase. Guerrero: daño x2 y reducción de daño 50%. Mago: +15 vida y +5% bloqueo. Explorador: repara escudo y 50% de mejorar espada.",
    golpeBrutal:      "Ataque x1.5 de daño. A cambio te cuesta 3 puntos de vida.",
    sedDeSangre:      "Tu daño es igual a (50 - tu vida actual). Cuanto más herido estés, más daño hacés.",
    posturaDefensiva: "No atacás este turno. El próximo daño que recibás se reduce un 80%.",
    golpeAturdidor:   "Atacás con daño normal y el monstruo pierde su siguiente turno, congelado.",
    contragolpe:      "Solo disponible con 30 HP o menos. Daño doble aprovechando tu desesperación.",
    ejecucion:        "Si el monstruo tiene 30% o menos de vida lo eliminás instantáneamente. Si no, hacés daño x2.",
    helar:            "No atacás. El monstruo queda congelado y pierde su siguiente turno.",
    drenar:           "Atacás por la mitad del daño normal pero recuperás exactamente lo que dañaste.",
    mantoLunar:       "Sin ataque. Ganás +20% de bloqueo este turno y robás 1 carta extra.",
    estudiar:         "Sin ataque ni consecuencias. Robás 2 cartas adicionales.",
    escudoArcano:     "Sin ataque. El próximo daño que recibás este turno es completamente anulado.",
    novaArcana:       "Daño fijo de 35. El monstruo no puede usar sus habilidades especiales este turno.",
    disparoCertero:   "Ataque normal que ignora el contraataque del Monstruo Guerrero.",
    veneno:           "Daño reducido ahora, pero el monstruo recibe 3 de daño adicional durante 3 turnos.",
    ojoDeAguila:      "Sin ataque. Tu próximo ataque en este combate será un crítico garantizado (daño x2).",
    retiradaTactica:  "Esquivás el ataque del monstruo de forma garantizada y robás 1 carta extra.",
    ataqueDoble:      "Dos golpes de daño mitad cada uno. Pueden sumar más que un ataque normal.",
    lluviaDeDagas:    "Cuatro golpes de daño base sin multiplicador de arma. Útil para romper regeneración.",
    hybrid:           "Usás la habilidad de tu clase híbrida obtenida con el Pacto Ancestral.",
};
let carouselCards = [];
let carouselIndex = 0;
const CARDS_PER_PAGE = 3;

function buildCardDeckGrid() {
    carouselIndex = 0;
    carouselCards = [];

    const cls = player.playerClass.toLowerCase();

    const basicTypes = ["attack", "block", "skill"];
    const classSpecial = {
        guerrero:   ["golpeBrutal", "sedDeSangre", "posturaDefensiva", "golpeAturdidor", "contragolpe", "ejecucion"],
        mago:       ["helar", "drenar", "mantoLunar", "estudiar", "escudoArcano", "novaArcana"],
        explorador: ["disparoCertero", "veneno", "ojoDeAguila", "retiradaTactica", "ataqueDoble", "lluviaDeDagas"],
    };

    let allTypes = [...basicTypes, ...(classSpecial[cls] || [])];

    if (hasAncestralPact && hybridClass) {
        const hybridSpecial = classSpecial[hybridClass.toLowerCase()] || [];
        allTypes = [...allTypes, "hybrid", ...hybridSpecial];
    }

    // Construir objetos de carta
    const basicTypesList = ["attack", "block", "skill", "hybrid"];
    carouselCards = allTypes.map(type => {
        const data = basicTypesList.includes(type)
            ? cardTypes[type](cls)
            : cardTypes[type]();
        return { ...data, type };
    });

    renderCarousel();
    // Limpiar panel derecho
    document.getElementById("cardDetailPanel").innerHTML =
        `<p class="empty-state">← Seleccioná<br>una carta</p>`;
}

function renderCarousel() {
    const track = document.getElementById("carouselTrack");
    track.innerHTML = "";

    const start = carouselIndex;
    const end = Math.min(start + CARDS_PER_PAGE, carouselCards.length);
    const visible = carouselCards.slice(start, end);

    visible.forEach((card, i) => {
        const el = document.createElement("div");
        el.classList.add("carousel-card");
        if (card.type === "hybrid") el.classList.add("hybrid-thumb");

        el.innerHTML = `
            <img src="${card.img}" alt="${card.label}">
            <div class="carousel-card-label">${card.label}</div>
        `;

        el.addEventListener("click", () => {
            // Marcar activa
            document.querySelectorAll(".carousel-card").forEach(c => c.classList.remove("active"));
            el.classList.add("active");
            showCardDetail(card);
        });

        track.appendChild(el);

        // Animación de entrada escalonada
        el.style.opacity = "0";
        el.style.transform = "translateY(20px)";
        setTimeout(() => {
            el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
        }, i * 80);
    });

    // Actualizar flechas y contador
    const total = Math.ceil(carouselCards.length / CARDS_PER_PAGE);
    const current = Math.floor(carouselIndex / CARDS_PER_PAGE) + 1;
    document.getElementById("carouselCounter").textContent = `${current} / ${total}`;
    document.getElementById("carouselPrev").disabled = carouselIndex === 0;
    document.getElementById("carouselNext").disabled = end >= carouselCards.length;
}

function carouselMove(direction) {
    const newIndex = carouselIndex + direction * CARDS_PER_PAGE;
    if (newIndex < 0 || newIndex >= carouselCards.length) return;
    carouselIndex = newIndex;
    renderCarousel();
    // Limpiar detalle al cambiar página
    document.getElementById("cardDetailPanel").innerHTML =
        `<p class="empty-state">← Seleccioná<br>una carta</p>`;
}

function showCardDetail(card) {
    const panel = document.getElementById("cardDetailPanel");
    const isHybrid = card.type === "hybrid";

    panel.innerHTML = `
        <img
            src="${card.img}"
            alt="${card.label}"
            class="${isHybrid ? 'hybrid-detail' : ''}"
        >
        <p id="cardDetailName" class="${isHybrid ? 'hybrid-name' : ''}">${card.label}</p>
        <p id="cardDetailDesc">${cardDescriptions[card.type] || "Sin descripción disponible."}</p>
    `;
}