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
        return true;
    }
    return false;
}
  repair() {
      this.hp = shields[this.name.toLowerCase()].hp;
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
      this.sword = swords.madera;
      this.shield = new Shield("Madera", 0.1, 10);
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
            document.getElementById("message").innerText += `\n¡Tu escudo se ha roto!`;
            document.getElementById("cardBloqueo").classList.add("disabled");
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
            document.getElementById("cardBloqueo").classList.remove("disabled");
            if (Math.random() < 0.5) {
                this.upgradeSword();
                document.getElementById("message").innerText += `\n¡Fabricación activada! Escudo reparado y espada mejorada.`;
            } else {
                document.getElementById("message").innerText += `\n¡Fabricación activada! Escudo reparado.`;
            }
            break;
    }
    this.skillUses--;
    updatePlayerStats();
}
  upgradeSword() {
      const swordKeys = Object.keys(swords);
      const currentSwordIndex = swordKeys.indexOf(this.sword.name.toLowerCase());
      if (currentSwordIndex < swordKeys.length - 1) {
          this.sword = swords[swordKeys[currentSwordIndex + 1]];
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
const swords = {
  madera: new Sword("Madera", 1),
  hierro: new Sword("Hierro", 1.5),
  oro: new Sword("Oro", 2),
  diamante: new Sword("Diamante", 3),
  obsidiana: new Sword("Obsidiana", 4),
};

const shields = {
  madera: new Shield("Madera", 0.1, 10),
  hierro: new Shield("Hierro", 0.15, 15),
  oro: new Shield("Oro", 0.2, 20),
  diamante: new Shield("Diamante", 0.25, 25),
  obsidiana: new Shield("Obsidiana", 0.3, 30),
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
            document.getElementById("cardBloqueo").classList.add("disabled");
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
                    document.getElementById("cardBloqueo").classList.add("disabled");
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

const merchantSword = new Sword("Espada del Mercader", 3);
const merchantShield = new Shield("Escudo del Mercader", 0.35, Infinity);
const merchantBracelet = new Bracelet("Brazalete del Mercader", (player) => {});
merchantShield.isUnbreakable = true;
//nuevos avatars


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
  updateSkillButton();

  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");
  updatePlayerCard();
  updateMonsterCard(monster);
  updateActionCards();
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
function playerAttack() {
    avatarAnim("playerAvatar", "avatar-attack-player", 450);

    setTimeout(() => {
        const damage = player.attack();
        monster.hp -= damage;

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
                message += `\nEl monstruo dejó caer una espada de ${currentWeaponDrop.sword.name}, un escudo de ${currentWeaponDrop.shield.name}, un brazalete de ${currentWeaponDrop.bracelet.name} y una poción de ${currentWeaponDrop.potion.name}.`;
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
            setTimeout(() => {
                monsterAttack();
                updateStats();
                disableHand(false);
                if (player.shield && player.shield.broken) {
                    document.getElementById("cardBloqueo").classList.add("disabled");
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
}

function monsterAttack() {
    const dodged = player.dodge();

    if (dodged) {
        avatarAnim("monsterAvatar", "avatar-attack-monster", 450);
        setTimeout(() => {
            avatarAnim("playerAvatar", "avatar-dodge", 450);
            spawnFloatingNumber(0, "dodge", "playerAvatar");
            updateStats(`${player.name} esquivó el ataque.`);
        }, 200);
    } else {
        avatarAnim("monsterAvatar", "avatar-attack-monster", 450);
        setTimeout(() => {
            let damage = Math.floor(Math.random() * monster.attack) + 1;
            if (player.damageReductionActive) {
                damage = Math.floor(damage * 0.5);
                player.damageReductionActive = false;
            }
            player.hp -= damage;
            spawnFloatingNumber(damage, "damage", "playerAvatar");
            avatarAnim("playerAvatar", "avatar-damage", 400);

            if (monster.ability) {
                triggerMonsterAbilityAnim(monster.name);
                monster.ability(player, monster);
            }

            if (player.hp <= 0) { endGame(false); return; }
            updateStats(`El ${monster.name} atacó causando ${damage} de daño.`);
            restoreIdleAnim("playerAvatar");
        }, 200);
    }
}
function changeWeapon() {
    player.sword = currentWeaponDrop.sword;
    player.shield = new Shield(currentWeaponDrop.shield.name, currentWeaponDrop.shield.blockChance, currentWeaponDrop.shield.hp);
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
    document.getElementById("playerShield").innerText = player.shield ? player.shield.name : "Sin Escudo";
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
function updateActionCards() {
    if (!player) return;
    const cls = player.playerClass.toLowerCase();
    document.getElementById("imgAtaque").src    = `./targetas/${cls}_ataque.jpg`;
    document.getElementById("imgBloqueo").src   = `./targetas/${cls}_bloqueo.jpg`;
    document.getElementById("imgHabilidad").src = `./targetas/${cls}_habilidad.jpg`;
}
function setHandVisible(visible) {
    const hand = document.getElementById("actionHand");
    const deck = document.getElementById("cardDeck");
    if (!hand || !deck) return;

    if (visible) {
        // Activar mazo para que el jugador lo clickee
        deck.classList.remove("deck-inactive");
        // Asegurar que las cartas estén en estado inicial (guardadas)
        ["cardAtaque", "cardBloqueo", "cardHabilidad", "cardHibrido"].forEach(id => {
            const c = document.getElementById(id);
            c.classList.remove("in-play", "returning", "selecting", "disabled");
        });
        hand.classList.add("hand-hidden");

        // Chequeo escudo
        if (player && player.shield && player.shield.broken) {
            document.getElementById("cardBloqueo").classList.add("disabled");
        }
        // Ocultar híbrido si no hay pacto
        if (!hasAncestralPact) {
            hand.classList.remove("four-cards");
        }
    } else {
        // Al derrotar monstruo: cartas vuelven al mazo
        returnCards();
    }
}
function disableHand(disabled) {
    document.querySelectorAll(".action-card").forEach(c => {
        if (disabled) {
            c.classList.add("disabled");
        } else {
            c.classList.remove("disabled");
        }
    });
    if (!disabled) {
        if (player && player.shield && player.shield.broken) {
            document.getElementById("cardBloqueo").classList.add("disabled");
        }
    }
}

function refreshBlockCard() {
    const card = document.getElementById("cardBloqueo");
    if (!card || !player) return;
    if (!player.shield || player.shield.broken) {
        card.classList.add("disabled");
    } else {
        card.classList.remove("disabled");
    }
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

    const hand = document.getElementById("actionHand");
    if (hand) {
        hand.classList.remove("four-cards");
        hand.classList.remove("expanded");
        hand.classList.add("hand-hidden");
    }

    // Limpiar disabled y expanded-pos de todas las cartas sin pasar por disableHand
    document.querySelectorAll(".action-card").forEach(c => {
        c.classList.remove("disabled");
        c.classList.remove("expanded-pos");
        c.classList.remove("selecting");
    });

    document.getElementById("end-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");
    document.getElementById("mapToggleBtn").classList.add("hidden");
    document.getElementById("dungeonMap").classList.add("hidden");
}
function getRandomSword() {
  const keys = Object.keys(swords);
  return swords[keys[Math.floor(Math.random() * keys.length)]];
}

function getRandomShield() {
  const keys = Object.keys(shields);
  return shields[keys[Math.floor(Math.random() * keys.length)]];
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
function updateSkillButton() {
    const labels = {
        "Guerrero":   "Furia",
        "Mago":       "Meditar",
        "Explorador": "Fabricar"
    };
    const labelEl = document.querySelector("#cardHabilidad .action-card-label");
    if (labelEl && player) {
        if (player.playerClass === "Mago" && hybridClass) {
            labelEl.textContent = "Dual";
        } else {
            labelEl.textContent = labels[player.playerClass] || "Habilidad";
        }
    }
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
        ? { sword: swords.obsidiana, shield: new Shield("Diamante", 0.25, 25) }
        : { sword: swords.diamante, shield: new Shield("Obsidiana", 0.3, 30) };

    player.sword = combo.sword;
    player.shield = combo.shield;

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
    player.shield = new Shield("Escudo del Mercader", 0.35, Infinity);
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

    const cls = className.toLowerCase();
    const labelNames = { "Guerrero": "Furia", "Explorador": "Fabricar" };
    document.getElementById("imgHibrido").src = `./targetas/${cls}_habilidad.jpg`;
    document.getElementById("labelHibrido").textContent = labelNames[className] || className;

    document.getElementById("actionHand").classList.add("four-cards");

    updatePlayerStats();
    updateEquipment();

    // Ocultar botones de loot y pasar al siguiente combate directamente
    document.getElementById("changeWeaponButton").classList.add("hidden");
    document.getElementById("keepWeaponButton").classList.add("hidden");
    document.getElementById("usePotionButton").classList.add("hidden");
    document.getElementById("ancestralLootButton").classList.add("hidden");

    prepareNextMonster(`¡Pacto Ancestral firmado! Ahora eres un Mago-${hybridClass}.`);
}

/*function showHybridSkillChoice() {
    const existing = document.getElementById("hybridSkillMenu");
    if (existing) { existing.remove(); return; }

    const menu = document.createElement("div");
    menu.id = "hybridSkillMenu";
    menu.innerHTML = `<p><strong>¿Qué habilidad querés usar?</strong></p>`;

    const btn1 = document.createElement("button");
    btn1.innerText = "Meditación (Mago)";
    btn1.onclick = () => { player.applySkill("Mago"); menu.remove(); updateSkillButton(); };

    const btn2 = document.createElement("button");
    btn2.innerText = hybridClass === "Guerrero" ? "⚔️ Furia de Batalla" : "🗺️ Fabricación";
    btn2.onclick = () => { player.applySkill(hybridClass); menu.remove(); updateSkillButton(); };

    const cancel = document.createElement("button");
    cancel.innerText = "Cancelar";
    cancel.style.backgroundColor = "#555";
    cancel.onclick = () => menu.remove();

    menu.appendChild(btn1);
    menu.appendChild(btn2);
    menu.appendChild(cancel);

    // Insertar en el game-screen en vez de junto al botón que ya no existe
    document.getElementById("game-screen").appendChild(menu);
}*/

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
// ---- Lógica de la mano de cartas ----
document.addEventListener("DOMContentLoaded", function () {
    const deck = document.getElementById("cardDeck");

    deck.addEventListener("click", () => {
        if (deck.classList.contains("deck-inactive")) return;
        dealCards();
    });

    document.querySelectorAll(".action-card").forEach(card => {
        card.addEventListener("click", () => handleCardClick(card));
    });
});

function dealCards() {
    const deck = document.getElementById("cardDeck");
    const hand = document.getElementById("actionHand");
    deck.classList.add("deck-inactive");
    hand.classList.remove("hand-hidden");

    const cards = ["cardAtaque", "cardBloqueo", "cardHabilidad"];
    if (hand.classList.contains("four-cards")) cards.push("cardHibrido");

    // Resetear estado visual antes de animar
    cards.forEach(id => {
        const c = document.getElementById(id);
        c.classList.remove("in-play", "returning", "selecting");
    });

    // Animar una por una con delay
    cards.forEach((id, i) => {
        setTimeout(() => {
            const c = document.getElementById(id);
            c.classList.add("in-play");
        }, i * 150);
    });
}

function returnCards() {
    const deck = document.getElementById("cardDeck");
    const hand = document.getElementById("actionHand");

    const cards = ["cardAtaque", "cardBloqueo", "cardHabilidad", "cardHibrido"];

    cards.forEach((id, i) => {
        setTimeout(() => {
            const c = document.getElementById(id);
            c.classList.remove("in-play");
            c.classList.add("returning");
        }, i * 100);
    });

    // Después de que todas volvieron, ocultar la mano y activar el mazo
    setTimeout(() => {
        cards.forEach(id => {
            document.getElementById(id).classList.remove("returning");
        });
        hand.classList.add("hand-hidden");
        deck.classList.remove("deck-inactive");
    }, cards.length * 100 + 450);
}

function handleCardClick(card) {
    if (card.classList.contains("disabled")) return;

    const action = card.dataset.action;
    card.classList.add("selecting");
    disableHand(true);

    setTimeout(() => {
        card.classList.remove("selecting");
        if (action === "attack") {
            playerAttack();
        } else if (action === "block") {
            playerBlock();
        } else if (action === "skill") {
            player.applySkill(player.playerClass);
            disableHand(false);
            if (player.shield && player.shield.broken) {
                document.getElementById("cardBloqueo").classList.add("disabled");
            }
        } else if (action === "hybrid") {
            const el = document.getElementById("playerAvatar");
            el.classList.add("avatar-hybrid-flash");
            setTimeout(() => el.classList.remove("avatar-hybrid-flash"), 800);
            player.applySkill(hybridClass);
            disableHand(false);
            if (player.shield && player.shield.broken) {
                document.getElementById("cardBloqueo").classList.add("disabled");
            }
        }
    }, 380);
}