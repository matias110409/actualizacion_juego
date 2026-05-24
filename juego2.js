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
        if (this.isUnbreakable) return false; // Nunca se rompe
        this.hp -= damage;
        if (this.hp <= 0) {
            this.hp = 0;
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
          document.getElementById("blockButton").disabled = true;
      }
      updatePlayerStats();
  }

  recoverHealth(amount) {
      this.hp = Math.min(this.hp + amount, 50); // Recuperar vida del jugador
  }

  useSkill() {
    if (this.skillUses > 0) {
        // Si es mago con pacto ancestral, mostrar elección
        if (this.playerClass === "Mago" && hybridClass) {
            showHybridSkillChoice();
            return;
        }
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
            this.skillActive = true;
            this.damageReductionActive = true;
            document.getElementById("message").innerText += `\n¡Furia de Batalla activada! Daño x2 y reducción de daño 50%.`;
            break;
        case "Mago":
            this.recoverHealth(15);
            this.shield.blockChance += 0.05;
            document.getElementById("message").innerText += `\n¡Meditación activada! +15 vida y +5% bloqueo.`;
            updateStats();
            break;
        case "Explorador":
            if (this.shield.isUnbreakable) {
                // Reparar escudo del mercader
                this.shield.broken = false;
                this.shield.blockChance = Math.max(this.shield.blockChance, 0.10);
                // Si quedó en 0 por el monstruo, restaurar al mínimo jugable
                if (this.shield.blockChance === 0) this.shield.blockChance = 0.10;
            } else {
                this.shield.repair();
            }
            if (Math.random() < 0.5) {
                this.upgradeSword();
                document.getElementById("message").innerText += `\n¡Fabricación activada! Escudo reparado y espada mejorada.`;
            } else {
                document.getElementById("message").innerText += `\n¡Fabricación activada! Escudo reparado.`;
            }
            document.getElementById("blockButton").disabled = false;
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
  document.querySelectorAll('#classButtons button').forEach(button => {
      button.classList.remove('selected');
  });
  document.querySelector(`button[onclick="selectClass('${playerClass}')"]`).classList.add('selected');
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
          monster.hp += 7;
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
          document.getElementById("blockButton").disabled = true;
      }
  },
  boss: (player, monster) => {
        if (Math.random() < 0.40) {
            const roll = Math.random();
            if (roll < 0.33) {
                // Habilidad de mago: regeneración
                if (Math.random() < 0.3) {
                    monster.hp += 7;
                    spawnFloatingNumber(7, "heal", "monsterAvatar");
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
                    spawnFloatingNumber(0, "shield", "playerAvatar");
                    document.getElementById("message").innerText += `\n¡El Jefe Final destruyó tu escudo!`;
                    document.getElementById("blockButton").disabled = true;
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
merchantShield.isUnbreakable = true;

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
  document.getElementById("monsterAvatar").src = monster.avatar;
  updateEquipment();
  updateStats();
  updatePlayerStats();
  updateSkillButton();

  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");
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
function playerAttack() {
    const damage = player.attack();

    if (monster.ability && monster.ability === specialAbilities.guerrero && monster.ability(player, monster)) {
        updateStats();
        return;
    }

    monster.hp -= damage;

    if (player.lastAttackWasCritical) {
        spawnFloatingNumber(damage, "critical", "monsterAvatar");
    } else {
        spawnFloatingNumber(damage, "damage", "monsterAvatar");
    }

    addAnimation(document.getElementById('playerHealthFill'), 'attack-animation');

    if (monster.hp <= 0) {
        monstersDefeated++;
        let message = `¡Has derrotado al ${monster.name}!`;

        if (monstersDefeated === 10) {
            endGame(true);
            return;
        }

        currentWeaponDrop = {
            sword: getRandomSword(),
            shield: getRandomShield(),
            bracelet: getRandomBracelet(),
            potion: getRandomPotion(),
        };

        // Si tiene pacto ancestral, solo mostrar opción de poción
        if (hasAncestralPact) {
            message += `\nEl monstruo dejó caer una poción de ${currentWeaponDrop.potion.name}.`;
            document.getElementById("attackButton").classList.add("hidden");
            document.getElementById("blockButton").classList.add("hidden");
            document.getElementById("skillButton").classList.add("hidden");
            document.getElementById("keepWeaponButton").classList.add("hidden");
            document.getElementById("changeWeaponButton").classList.add("hidden");
            document.getElementById("usePotionButton").classList.remove("hidden");
            document.getElementById("ancestralLootButton").classList.remove("hidden");
        } else {
            message += `\nEl monstruo dejó caer una espada de ${currentWeaponDrop.sword.name}, un escudo de ${currentWeaponDrop.shield.name}, un brazalete de ${currentWeaponDrop.bracelet.name} y una poción de ${currentWeaponDrop.potion.name}.`;
            document.getElementById("attackButton").classList.add("hidden");
            document.getElementById("blockButton").classList.add("hidden");
            document.getElementById("skillButton").classList.add("hidden");
            document.getElementById("changeWeaponButton").classList.remove("hidden");
            document.getElementById("keepWeaponButton").classList.remove("hidden");
            document.getElementById("usePotionButton").classList.remove("hidden");
        }

        updateStats(message);

        // Verificar si aparece el mercader (rondas impares 1,3,5,7 y solo una vez)
        if (!merchantAppeared && [1,3,5,7].includes(monstersDefeated)) {
            if (Math.random() < 0.20) {
                setTimeout(() => showMerchant(), 800);
            }
        }

    } else {
        monsterAttack();
    }
}
function playerBlock() {
    const blocked = player.block();
    const blockSound = document.getElementById("blockSound");
    const shieldBreakSound = document.getElementById("shieldBreakSound");

    if (blocked) {
        blockSound.play();
        if (player.curseName === "E") {
            // Maldición E: bloquear exitoso cuesta 5 vida
            player.hp = Math.max(player.hp - 5, 1);
            spawnFloatingNumber(5, "damage", "playerAvatar");
            updateStats(`${player.name} bloqueó pero la maldición le costó 5 vida.`);
        } else {
            player.recoverHealth(15);
            spawnFloatingNumber(15, "heal", "playerAvatar");
            updateStats(`${player.name} bloqueó el ataque completamente.`);
        }
        spawnFloatingNumber(0, "block", "playerAvatar");
    } else {
        const damage = Math.floor(Math.random() * monster.attack) + 1;
        player.hp -= damage;
        spawnFloatingNumber(damage, "damage", "playerAvatar");
        player.takeShieldDamage(damage);
        if (player.shield && player.shield.hp === 0 && !player.shield.isUnbreakable) shieldBreakSound.play();
        player.recoverHealth(5);
        spawnFloatingNumber(5, "heal", "playerAvatar");
        updateStats(`No logró bloquear.`);
    }
    
    if (player.hp <= 0) { endGame(false); return; }
    addAnimation(document.getElementById('playerHealthFill'), 'block-animation');
}

function monsterAttack() {
    const dodged = player.dodge();

    if (dodged) {
        spawnFloatingNumber(0, "dodge", "playerAvatar");
        updateStats(`${player.name} esquivó el ataque.`);
    } else {
        const damage = Math.floor(Math.random() * monster.attack) + 1;
        player.hp -= damage;
        spawnFloatingNumber(damage, "damage", "playerAvatar");

        if (monster.ability) {
            monster.ability(player, monster);
        }

        if (player.hp <= 0) { endGame(false); return; }
        updateStats(`El ${monster.name} atacó.`);
    }
}

function changeWeapon() {
    player.sword = currentWeaponDrop.sword;
    player.shield = new Shield(currentWeaponDrop.shield.name, currentWeaponDrop.shield.blockChance, currentWeaponDrop.shield.hp);
    player.equipBracelet(currentWeaponDrop.bracelet);
    if (player.potions.length < 3) {
        player.potions.push(currentWeaponDrop.potion);
    }
    document.getElementById("blockButton").disabled = false;
    prepareNextMonster(`${player.name} ahora usa la espada de ${player.sword.name} y el escudo de ${player.shield.name}.`);
    addAnimation(document.getElementById('currentWeapon'), 'weapon-change');
    addAnimation(document.getElementById('currentShield'), 'weapon-change');
    updatePlayerStats();
}

function keepWeapon() {
    if (player.potions.length < 3) {
        player.potions.push(currentWeaponDrop.potion);
    }
    prepareNextMonster(`${player.name} mantiene su equipo actual.`);
}

function prepareNextMonster(message) {
    monster = generateMonster(monstersDefeated);
    document.getElementById("monsterAvatar").src = monster.avatar;
    document.getElementById("changeWeaponButton").classList.add("hidden");
    document.getElementById("keepWeaponButton").classList.add("hidden");
    document.getElementById("attackButton").classList.remove("hidden");
    document.getElementById("blockButton").classList.remove("hidden");
    document.getElementById("skillButton").classList.remove("hidden");
    document.getElementById("usePotionButton").classList.add("hidden");

    // Maldición C: perder 3 vida al inicio de cada combate
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
}

function updateEquipment() {
  document.getElementById("currentWeapon").innerText = player.sword.name;
  document.getElementById("currentShield").innerText = player.shield ? player.shield.name : "Sin Escudo";
}

function updateStats(message = "") {
  const playerHealthPercent = Math.max((player.hp / 50) * 100, 0);
  const monsterHealthPercent = Math.max((monster.hp / 100) * 100, 0);
  document.getElementById("playerHealthFill").style.width = `${playerHealthPercent}%`;
  document.getElementById("monsterHealthFill").style.width = `${monsterHealthPercent}%`;

  document.getElementById("message").innerText = message;
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
    player.shield = new Shield("Madera", 0.1, 10);
    player.curseName = null;
    document.getElementById("blockButton").disabled = false;
    player.skillUses = 3;
    player.skillActive = false;
    document.getElementById("monsterAvatar").src = "./images/monstruo_comun.jpg";
    document.getElementById("end-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");
    document.getElementById("mapToggleBtn").classList.add("hidden");
    document.getElementById("dungeonMap").classList.add("hidden");
    updatePlayerStats();
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
  if (player) {
      player.useSkill();
  }
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
            // Cerrar también el menú de cambiar/mantener si está abierto
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
  document.getElementById("intro-screen").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");
}

// Asegúrate de que la pantalla de selección de clase esté oculta al inicio
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
    if (player.playerClass === "Mago" && hybridClass) {
        document.getElementById("skillButton").innerText = `✨ Habilidad Dual`;
        return;
    }
    const skillNames = {
        "Guerrero": "⚔️ Furia de Batalla",
        "Mago": " Meditación",
        "Explorador": "🗺️ Fabricación"
    };
    document.getElementById("skillButton").innerText = skillNames[player.playerClass] || "Habilidad";
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

    const modal = document.createElement("div");
    modal.id = "merchantModal";
    modal.classList.add("modal");

    const isMage = player.playerClass === "Mago";

    // Opciones del trato común
    const canAfford = player.hp > 15;
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

    // Opción ancestral solo para magos
    const ancestralCurse = getRandomCurse();
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
            <p style="font-style:italic; text-align:center; color:#bdc3c7">"Tengo exactamente lo que necesitás... por un pequeño precio."</p>
            ${commonDealHTML}
            ${ancestralHTML}
            <button style="background:#555; margin-top:8px" onclick="closeMerchant()">Rechazar y continuar</button>
        </div>
    `;

    document.body.appendChild(modal);
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
    // Elegir combinación aleatoria
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

    document.getElementById("blockButton").disabled = false;
    updateEquipment();
    updatePlayerStats();
    updateStats(`El mercader te entregó una espada de ${combo.sword.name} y un escudo de ${combo.shield.name}.`);
    closeMerchant();
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

    // Pagar precio
    player.hp -= 15;
    applyCurse(curseId);

    // Mostrar elección de clase híbrida
    closeMerchant();
    showHybridClassChoice();

    updateEquipment();
    updatePlayerStats();
    document.getElementById("blockButton").disabled = false;
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
    updateSkillButton();
    updateStats(`¡Pacto Ancestral firmado! Ahora eres un Mago-${hybridClass}.`);
    updatePlayerStats();
    prepareNextMonsterAfterMerchant();
}

function showHybridSkillChoice() {
    const existing = document.getElementById("hybridSkillMenu");
    if (existing) { existing.remove(); return; }

    const menu = document.createElement("div");
    menu.id = "hybridSkillMenu";
    menu.innerHTML = `<p><strong>¿Qué habilidad querés usar?</strong></p>`;

    const btn1 = document.createElement("button");
    btn1.innerText = " Meditación (Mago)";
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

    document.getElementById("skillButton").insertAdjacentElement("afterend", menu);
}

function closeMerchant() {
    const modal = document.getElementById("merchantModal");
    if (modal) modal.remove();
}

function prepareNextMonsterAfterMerchant() {
    // Continuar el flujo normal
    monster = generateMonster(monstersDefeated);
    document.getElementById("monsterAvatar").src = monster.avatar;
    document.getElementById("changeWeaponButton").classList.add("hidden");
    document.getElementById("keepWeaponButton").classList.add("hidden");
    document.getElementById("attackButton").classList.remove("hidden");
    document.getElementById("blockButton").classList.remove("hidden");
    document.getElementById("skillButton").classList.remove("hidden");
    document.getElementById("usePotionButton").classList.add("hidden");
    updateEquipment();
    updateStats(`Un nuevo enemigo aparece: ${monster.name}`);
    updateMapNodes();
}
function takeAncestralPotion() {
    if (player.potions.length >= 3) {
        updateStats("Ya tenés 5 pociones, no podés cargar más.");
        return;
    }
    player.potions.push(currentWeaponDrop.potion);
    updatePlayerStats();
    document.getElementById("ancestralLootButton").classList.add("hidden");
    document.getElementById("attackButton").classList.remove("hidden");
    document.getElementById("blockButton").classList.remove("hidden");
    document.getElementById("skillButton").classList.remove("hidden");
    updateStats(`Tomaste una poción de ${currentWeaponDrop.potion.name}.`);
    prepareNextMonster(`Siguiente combate.`);
}