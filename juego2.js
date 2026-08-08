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

function getAbilityForMonster(name) {
    if (!name) return specialAbilities.comun;
    if (name === "Jefe Final") return specialAbilities.boss;
    if (name.includes("Mago")) return specialAbilities.mago;
    if (name.includes("Guerrero")) return specialAbilities.guerrero;
    if (name.includes("Explorador")) return specialAbilities.explorador;
    return specialAbilities.comun;
}

class Monster {
    constructor(name, hp, attack, avatar, ability) {
        this.name = name;
        this.hp = hp;
        this.maxHp = hp;
        this.attack = attack;
        this.avatar = avatar;
        this.ability = ability || getAbilityForMonster(name);
    }

    useSpecialAbility(player) {
        const abilityFn = this.ability || getAbilityForMonster(this.name);
        if (abilityFn) {
            abilityFn(player, this);
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
        
        // Sistema de Crafteo y Materiales
        this.materials = {
            cuero: 0,
            cabellos: 0,
            armaduraMetal: 0,
            huesosPesados: 0,
            veneno: 0,
            hilos: 0,
            polvoArcano: 0,
            esenciaMana: 0,
            nucleoTitan: 0
        };
        // Los manuales desbloqueados desde inicio son todos los que tienen defaultUnlocked:true
        // Se calcula dinámicamente para incluir brazaletes y pociones
        this.manuals = Object.values(RECIPES)
            .filter(r => r.defaultUnlocked)
            .map(r => r.key);
        this.selectedRecipeKey = 'comun';
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

const heroDataInfo = {
    Guerrero: {
        badge: '⚔️ Tanque & Fuerza Física',
        stats: 'Ataque: 🟢🟢🟢🟢⚪ | Defensa: 🟢🟢🟢🟢🟢 | Magia: 🟢⚪⚪⚪⚪',
        skill: 'Furia de Batalla',
        desc: 'Duplica tu daño de ataque y reduce el daño recibido un 50% durante esa ronda.',
        color: 'rgba(231, 76, 60, 0.4)'
    },
    Mago: {
        badge: '🔮 Curación & Magia Ancestral',
        stats: 'Ataque: 🟢🟢🟢⚪⚪ | Defensa: 🟢🟢🟢⚪⚪ | Magia: 🟢🟢🟢🟢🟢',
        skill: 'Meditación',
        desc: 'Recupera +15 de vida al instante y aumenta tu probabilidad de bloqueo permanentemente +5%.',
        color: 'rgba(142, 68, 173, 0.4)'
    },
    Explorador: {
        badge: '🛠️ Táctico & Adaptable',
        stats: 'Ataque: 🟢🟢🟢🟢⚪ | Defensa: 🟢🟢🟢⚪⚪ | Magia: 🟢🟢⚪⚪⚪',
        skill: 'Fabricación',
        desc: 'Repara tu escudo completamente y tiene un 50% de probabilidad de mejorar tu arma.',
        color: 'rgba(46, 204, 113, 0.4)'
    }
};

function selectClass(playerClass) {
    selectedClass = playerClass;
    
    document.querySelectorAll('.class-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    const selectedCard = document.getElementById(`card-${playerClass}`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }

    // Actualizar Aura de fondo
    const auraBg = document.getElementById('heroAuraBg');
    if (auraBg) {
        auraBg.setAttribute('data-class', playerClass);
    }

    // Actualizar Panel de Detalles del Héroe
    const detailPanel = document.getElementById('heroSelectedDetail');
    const detailContent = document.getElementById('heroDetailContent');
    const info = heroDataInfo[playerClass];

    if (detailPanel && detailContent && info) {
        detailContent.innerHTML = `
            <div class="hero-detail-header">
                <span class="hero-badge-tag">${info.badge}</span>
                <h4 class="hero-detail-title">${playerClass}</h4>
            </div>
            <p class="hero-detail-stats">${info.stats}</p>
            <div class="hero-detail-skill-box">
                <span class="hero-skill-label">Especial: <strong>${info.skill}</strong></span>
                <p class="hero-skill-text">${info.desc}</p>
            </div>
        `;
        detailPanel.classList.remove('hidden');
    }

    // Ocultar mensaje de error si existía
    const errorEl = document.getElementById('startError');
    if (errorEl) errorEl.style.display = 'none';
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

// ===================== SISTEMA DE STAMINA Y MAZO =====================
let currentStamina = 5;
let maxStamina = 10;
let staminaPerTurn = 5;

let drawPile = [];       // Mazo de robo
let discardPile = [];    // Mazo de descarte
// Nota: la mano actual se declara como `playerHand` más abajo, junto al sistema de cartas

let discardMode = false; // Mantener para compatibilidad
let discardCountThisTurn = 0;
let isPlayerTurn = false;
let extraDrawFromDiscard = 0; // Cartas extra por descartar

// ===================== SISTEMA DE MAPA =====================
// mapMonsters[i] = monstruo generado al inicio de la partida para el nodo i (fijo para toda la run)
let mapMonsters = [];
// defeatedNodes[i] = true si el nodo i fue derrotado al menos una vez
let defeatedNodes = Array(10).fill(false);
// Índice del nodo actualmente seleccionado para combatir
let currentNodeIndex = -1;
// Cuántos nodos únicos fueron derrotados (para el mercader)
// ===================== SISTEMA DE CRAFTEO Y MATERIALES =====================
const MATERIALS = {
    cuero: { id: "cuero", name: "Cuero Rasgado", icon: "🩹", rarity: "comun", desc: "Tiras de piel arrancadas a jirones de bestias vulgares." },
    cabellos: { id: "cabellos", name: "Pelaje & Fibra", icon: "🪢", rarity: "comun", desc: "Mechones y pelo crudo arrancados del cuero de criaturas muertas." },
    armaduraMetal: { id: "armaduraMetal", name: "Chatarra de Combate", icon: "⛓️", rarity: "pocoComun", desc: "Láminas retorcidas de metal de guerreros caídos, con sangre seca." },
    huesosPesados: { id: "huesosPesados", name: "Hueso Molido", icon: "🦷", rarity: "pocoComun", desc: "Fragmentos de hueso denso triturado, duro como roca." },
    veneno: { id: "veneno", name: "Bilis Tóxica", icon: "🫀", rarity: "pocoComun", desc: "Fluido oscuro segregado por las entrañas de bestias exploradoras." },
    hilos: { id: "hilos", name: "Tendón Seco", icon: "🧵", rarity: "pocoComun", desc: "Nervios y tendones arrancados, secos como cuerdas de ballesta." },
    polvoArcano: { id: "polvoArcano", name: "Ceniza de Hechizo", icon: "💀", rarity: "rara", desc: "Residuo carbonizado de magia corrupta. Quema al tacto." },
    esenciaMana: { id: "esenciaMana", name: "Sangre de Maná", icon: "🩸", rarity: "rara", desc: "Líquido espeso que supura de magos muertos. Vibra con poder." },
    nucleoTitan: { id: "nucleoTitan", name: "Corazón del Titán", icon: "💎", rarity: "exotica", desc: "Núcleo latente arrancado del pecho del jefe. Aún palpita." }
};

const ITEM_ICONS = {
    "Amuleto de Tendón Seco": "objetos/artefactos/Amuleto de Tendón Seco.png",
    "Brazalete de Colmillo": "objetos/artefactos/Brazalete de Colmillo.png",
    "Correa de Hueso Trenzado": "objetos/artefactos/Correa de Hueso Trenzado.png",
    "Brebaje de sangre coagulada": "objetos/consumibles/Brebaje de sangre coagulada.png",
    "Brebaje de Carne Cruda": "objetos/consumibles/Brebaje de sangre coagulada.png",
    "Elixir de Bilis Negra": "objetos/consumibles/Elixir de Bilis Negra.png",
    "Tónico de Ceniza Arcana": "objetos/consumibles/Tónico de Ceniza Arcana.png",
    "Ungüento de Hueso Molido": "objetos/consumibles/Ungüento de Hueso Molido.png"
};

function renderIconHTML(iconStr, altText = "") {
    if (!iconStr) return "";
    if (iconStr.includes("/") || iconStr.includes(".png") || iconStr.includes(".jpg")) {
        return `<img src="${iconStr}" class="item-icon-img" alt="${altText}">`;
    }
    return iconStr;
}

function getItemIconHTML(itemName) {
    const path = ITEM_ICONS[itemName];
    if (path) {
        return `<img src="${path}" class="item-icon-img" alt="${itemName}">`;
    }
    return "";
}

const RECIPES = {
    // ─── Armas ───────────────────────────────────────────────────────────────
    comun: {
        key: "comun", type: "weapon",
        name: "Forja de Piel y Tendón",
        tier: "comun", icon: "forjas/Forja de Piel y Tendón.png",
        cost: { cuero: 2, hilos: 2 },
        swordTier: "comun", shieldTier: "comun",
        desc: "Manual de Iniciado. Arma cosida con cuero rasgado y tendón seco. Daño ×1.5, escudo básico.",
        defaultUnlocked: true
    },
    pocoComon: {
        key: "pocoComon", type: "weapon",
        name: "Forja de Chatarra y Hueso",
        tier: "pocoComun", icon: "forjas/Forja de Chatarra y Hueso.png",
        cost: { armaduraMetal: 3, huesosPesados: 2, cuero: 2 },
        swordTier: "pocoComon", shieldTier: "pocoComon",
        desc: "Manual de Sangre. Reforzado con chatarra de combate y hueso molido. Daño ×2.0, bloqueo 20%.",
        defaultUnlocked: false
    },
    rara: {
        key: "rara", type: "weapon",
        name: "Forja de Ceniza y Sangre",
        tier: "rara", icon: "forjas/Forja de Ceniza y Sangre.png",
        cost: { polvoArcano: 4, esenciaMana: 2, armaduraMetal: 3, veneno: 1 },
        swordTier: "rara", shieldTier: "rara",
        desc: "Manual Profano. Imbuido en ceniza de hechizo y sangre de maná. Daño ×3.0, bloqueo 25%.",
        defaultUnlocked: false
    },
    exotica: {
        key: "exotica", type: "weapon",
        name: "Forja del Corazón Titán",
        tier: "exotica", icon: "forjas/Forja del Corazón Titán.png",
        cost: { nucleoTitan: 1, polvoArcano: 4, armaduraMetal: 4, veneno: 3 },
        swordTier: "exotica", shieldTier: "exotica",
        desc: "Manual del Abismo. Sellado con el corazón palpitante del Titán. Daño ×4.0, bloqueo 30%.",
        defaultUnlocked: false
    },
    // ─── Brazaletes ─────────────────────────────────────────────────────────
    brazaleteFuerza: {
        key: "brazaleteFuerza", type: "bracelet",
        name: "Brazalete de Colmillo",
        tier: "pocoComun", icon: "objetos/artefactos/Brazalete de Colmillo.png",
        cost: { huesosPesados: 3, cuero: 2 },
        braceletKey: "fuerza",
        desc: "Atado con huesos molidos y cuero rasgado. Aumenta el daño de ataque un 15%.",
        defaultUnlocked: true
    },
    brazaleteDefensa: {
        key: "brazaleteDefensa", type: "bracelet",
        name: "Correa de Hueso Trenzado",
        tier: "pocoComun", icon: "objetos/artefactos/Correa de Hueso Trenzado.png",
        cost: { huesosPesados: 2, hilos: 3 },
        braceletKey: "defensa",
        desc: "Tendones y hueso trenzados. Aumenta la probabilidad de bloqueo un 10%.",
        defaultUnlocked: true
    },
    brazaleteAgilidad: {
        key: "brazaleteAgilidad", type: "bracelet",
        name: "Amuleto de Tendón Seco",
        tier: "pocoComun", icon: "objetos/artefactos/Amuleto de Tendón Seco.png",
        cost: { hilos: 3, cabellos: 3 },
        braceletKey: "agilidad",
        desc: "Fibras secas de criaturas ágiles. Aumenta la probabilidad de esquivar un 10%.",
        defaultUnlocked: true
    },
    // ─── Pociones ────────────────────────────────────────────────────────────
    pocionCuracion: {
        key: "pocionCuracion", type: "potion",
        name: "Brebaje de sangre coagulada",
        tier: "comun", icon: "objetos/consumibles/Brebaje de sangre coagulada.png",
        cost: { cuero: 2, cabellos: 2 },
        potionKey: "curacion",
        desc: "Sangre coagulada y concentrada. Asqueroso pero efectivo. Recupera 20 HP.",
        defaultUnlocked: true
    },
    pocionFortaleza: {
        key: "pocionFortaleza", type: "potion",
        name: "Elixir de Bilis Negra",
        tier: "pocoComun", icon: "objetos/consumibles/Elixir de Bilis Negra.png",
        cost: { veneno: 2, huesosPesados: 2 },
        potionKey: "fortaleza",
        desc: "Bilis tóxica purificada. Aumenta el daño de ataque un 15% por el resto del combate.",
        defaultUnlocked: true
    },
    pocionProteccion: {
        key: "pocionProteccion", type: "potion",
        name: "Ungüento de Hueso Molido",
        tier: "pocoComun", icon: "objetos/consumibles/Ungüento de Hueso Molido.png",
        cost: { huesosPesados: 3, hilos: 2 },
        potionKey: "proteccion",
        desc: "Polvo de hueso mezclado con tendón. Aumenta el bloqueo un 10%.",
        defaultUnlocked: true
    },
    pocionEnergia: {
        key: "pocionEnergia", type: "potion",
        name: "Tónico de Ceniza Arcana",
        tier: "rara", icon: "objetos/consumibles/Tónico de Ceniza Arcana.png",
        cost: { polvoArcano: 3, esenciaMana: 1 },
        potionKey: "energia",
        desc: "Ceniza de hechizo disuelta en sangre de maná. Recarga 2 usos de habilidad.",
        defaultUnlocked: true
    }
};

const swords = {
    // ⚪ Básica — sin crafteo, equipo inicial oxidado
    basica: {
        Guerrero:    new Sword("Mandoble Oxidado",           1),
        Mago:        new Sword("Palo Carbonizado",           1),
        Explorador:  new Sword("Estilete Mellado",           1)
    },
    // 🟢 Común — cuero rasgado + tendón seco
    comun: {
        Guerrero:    new Sword("Tajo de Cuero Crudo",        1.5),
        Mago:        new Sword("Vara de Tendón Anudado",     1.5),
        Explorador:  new Sword("Cuchilla de Piel Curtida",   1.5)
    },
    // 🔵 Poco Común — chatarra de combate + hueso molido
    pocoComon: {
        Guerrero:    new Sword("Hachazo de Chatarra",        2),
        Mago:        new Sword("Bastón de Hueso Astillado",  2),
        Explorador:  new Sword("Garfio de Metal Roto",       2)
    },
    // 🟣 Rara — ceniza de hechizo + sangre de maná
    rara: {
        Guerrero:    new Sword("Mandoble de Ceniza Negra",   3),
        Mago:        new Sword("Cayado de Sangre de Maná",   3),
        Explorador:  new Sword("Estilete de Bilis Arcana",   3)
    },
    // 🟠 Exótica — corazón del titán
    exotica: {
        Guerrero:    new Sword("Destripador del Titán",      4),
        Mago:        new Sword("Sceptro del Corazón Latiente", 4),
        Explorador:  new Sword("Colmillo del Vacío",         4)
    },
};

const shields = {
    // ⚪ Básica
    basica: {
        Guerrero:    new Shield("Tablón Astillado",          0.1,  10),
        Mago:        new Shield("Sello de Papel Quemado",    0.1,  10),
        Explorador:  new Shield("Trapo Endurecido",          0.1,  10)
    },
    // 🟢 Común — cuero rasgado + tendón seco
    comun: {
        Guerrero:    new Shield("Escudo de Cuero Cosido",    0.15, 15),
        Mago:        new Shield("Manto de Tendón Trenzado",  0.15, 15),
        Explorador:  new Shield("Deflector de Piel Curtida", 0.15, 15)
    },
    // 🔵 Poco Común — chatarra + hueso
    pocoComon: {
        Guerrero:    new Shield("Placa de Chatarra Remachada", 0.2, 20),
        Mago:        new Shield("Barrera de Hueso Soldado",  0.2,  20),
        Explorador:  new Shield("Escudo de Metal Astillado", 0.2,  20)
    },
    // 🟣 Rara — ceniza + sangre de maná
    rara: {
        Guerrero:    new Shield("Égida de Ceniza Viva",      0.25, 25),
        Mago:        new Shield("Barrera de Sangre de Maná", 0.25, 25),
        Explorador:  new Shield("Pantalla de Bilis Arcana",  0.25, 25)
    },
    // 🟠 Exótica — corazón del titán
    exotica: {
        Guerrero:    new Shield("Coraza del Titán Despellejado", 0.3, 30),
        Mago:        new Shield("Velo del Corazón Latiente", 0.3,  30),
        Explorador:  new Shield("Caparazón del Vacío",       0.3,  30)
    },
};
const bracelets = {
    fuerza:   new Bracelet("Brazalete de Colmillo",    (player) => player.attackMultiplier += 0.15),
    defensa:  new Bracelet("Correa de Hueso Trenzado", (player) => player.shield.blockChance += 0.1),
    agilidad: new Bracelet("Amuleto de Tendón Seco",   (player) => player.dodgeChance += 0.1)
};

const potions = {
    curacion:   new Potion("Brebaje de sangre coagulada",   (player) => player.recoverHealth(20)),
    fortaleza:  new Potion("Elixir de Bilis Negra",    (player) => player.attackMultiplier += 0.15),
    proteccion: new Potion("Ungüento de Hueso Molido", (player) => player.shield.blockChance += 0.1),
    energia:    new Potion("Tónico de Ceniza Arcana",  (player) => {
        const max = player.curseName === "B" ? 2 : 3;
        player.skillUses = Math.min(player.skillUses + 2, max);
    })
};

const specialAbilities = {
    comun: (player, monster) => {
        // Ataque certero — ignora el esquive del jugador
        const damage = Math.floor(Math.random() * monster.attack) + 1;
        applyMonsterDamageToPlayer(damage);
        updateStats(`¡${monster.name} usó Ataque Certero! Causó ${damage} de daño.`);
        if (player.hp <= 0) { endGame(false); }
    },
    mago: (player, monster) => {
        const healAmount = 7;
        monster.hp = Math.min(monster.hp + healAmount, monster.maxHp);
        spawnFloatingNumber(healAmount, "heal", "monsterSprite");
        monsterSpriteAnim("monster-hit", 400);
        updateStats(`¡${monster.name} usó Meditación y recuperó ${healAmount} de vida!`);
    },
    guerrero: (player, monster) => {
        // Contraataque
        const damage = Math.floor(Math.random() * monster.attack) + 2;
        monsterSpriteAnim("monster-attacking", 450);
        applyMonsterDamageToPlayer(damage);
        updateStats(`¡${monster.name} usó Furia y causó ${damage} de daño!`);
        if (player.hp <= 0) { endGame(false); }
    },
    explorador: (player, monster) => {
        // Rompe escudo
        monsterSpriteAnim("monster-attacking", 450);
        if (player.shield && !player.shield.isUnbreakable) {
            player.shield.broken = true;
            player.shield.hp = 0;
            blockCardsAllowed = false;
            refreshBlockCards();
            updatePlayerStats();
            spawnShieldCrack("playerAvatar");
            updateStats(`¡${monster.name} usó Rompe Escudo y destruyó tu defensa!`);
        } else {
            const damage = Math.floor(Math.random() * monster.attack) + 1;
            applyMonsterDamageToPlayer(damage);
            updateStats(`¡${monster.name} intentó romper tu escudo! Causó ${damage} de daño.`);
            if (player.hp <= 0) { endGame(false); }
        }
    },
    boss: (player, monster) => {
        const roll = Math.random();
        if (roll < 0.33) {
            const healAmount = 7;
            monster.hp = Math.min(monster.hp + healAmount, monster.maxHp);
            spawnFloatingNumber(healAmount, "heal", "monsterSprite");
            updateStats(`¡El Jefe Final usó Poder Oscuro y se regeneró ${healAmount} de vida!`);
        } else if (roll < 0.66) {
            const damage = Math.floor(Math.random() * monster.attack) + 3;
            monsterSpriteAnim("monster-attacking", 450);
            applyMonsterDamageToPlayer(damage);
            updateStats(`¡El Jefe Final usó Poder Oscuro y causó ${damage} de daño masivo!`);
            if (player.hp <= 0) { endGame(false); }
        } else {
            monsterSpriteAnim("monster-attacking", 450);
            if (player.shield && !player.shield.isUnbreakable) {
                player.shield.hp = 0;
                player.shield.broken = true;
                blockCardsAllowed = false;
                refreshBlockCards();
                updatePlayerStats();
                updateStats(`¡El Jefe Final usó Poder Oscuro y destruyó tu escudo!`);
            } else {
                const damage = Math.floor(Math.random() * monster.attack) + 2;
                applyMonsterDamageToPlayer(damage);
                updateStats(`¡El Jefe Final atacó causando ${damage} de daño!`);
                if (player.hp <= 0) { endGame(false); }
            }
        }
    }
};
// Variable global del mercader
let merchantAppeared = false;
let hasCursionB = false;
let hasAncestralPact = false;
let hybridClass = null; // "Guerrero" o "Explorador" para el mago híbrido

const merchantSword = new Sword("❓ Arma No Identificada", 3);
const merchantShield = new Shield("❓ Defensa No Identificada", 0.35, Infinity);
const merchantBracelet = new Bracelet("Brazalete del Mercader", (player) => { });
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
    activeEffects.mantoLunarBonus = 0;
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
    monsterBlocking = false;
}
// Sobrescribir takeDamage para el escudo del mercader
const originalTakeDamage = Shield.prototype.takeDamage;


// Empezar el juego
let player, monster, monstersDefeated = 0, currentWeaponDrop;

function startGame() {
    const playerName = document.getElementById("playerNameInput").value.trim();
    const errorEl = document.getElementById("startError");
    if (!playerName) {
        errorEl.textContent = "⚠️ Por favor, ingresa tu nombre.";
        errorEl.style.display = "block";
        return;
    }
    if (!selectedClass) {
        errorEl.textContent = "⚠️ Por favor, elige tu clase.";
        errorEl.style.display = "block";
        return;
    }
    errorEl.style.display = "none";

    // Crear jugador
    player = new Player(playerName, selectedClass);

    // Generar los 10 monstruos de la run al inicio (fijos para toda la partida)
    mapMonsters = [];
    for (let i = 0; i < 10; i++) {
        mapMonsters.push(generateMonster(i));
    }

    // Resetear estado del mapa
    defeatedNodes = Array(10).fill(false);
    currentNodeIndex = -1;
    uniqueMonstersDefeated = 0;
    monstersDefeated = 0;

    // Ir al mapa para que el jugador elija primer combate
    showMapScreen();
}


function generateMonster(index) {
    if (index === 9) {
        return new Monster("Jefe Final", 100, 10, "images/boss.gif", specialAbilities.boss);
    }

    const monsterTypes = [
        { name: "Monstruo Comun", hp: 20 + index * 5, attack: 5 + index, avatar: "./images/monstruo_comun_silueta.png", ability: specialAbilities.comun },
        { name: "Monstruo Mago", hp: 20 + index * 5, attack: 5 + index, avatar: "./images/monstruo_comun_silueta.png", ability: specialAbilities.mago },
        { name: "Monstruo Guerrero", hp: 20 + index * 5, attack: 5 + index, avatar: "./images/monstruo_comun_silueta.png", ability: specialAbilities.guerrero },
        { name: "Monstruo Explorador", hp: 20 + index * 5, attack: 5 + index, avatar: "./images/monstruo_comun_silueta.png", ability: specialAbilities.explorador },
    ];

    const randomMonster = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
    return new Monster(randomMonster.name, randomMonster.hp, randomMonster.attack, randomMonster.avatar, randomMonster.ability);
}
// ===================== SISTEMA DE MAPA =====================

/**
 * Muestra la pantalla del mapa y oculta todo lo demás.
 * Se llama después del loot, al iniciar el juego, y desde config.
 */
function showMapScreen() {
    _forgeParticlesRunning = false;
    const forgeSc = document.getElementById("forge-screen");
    if (forgeSc) forgeSc.classList.add("hidden");
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("end-screen").classList.add("hidden");
    document.getElementById("map-screen").classList.remove("hidden");

    // Actualizar info del jugador en el header del mapa
    const mapInfo = document.getElementById("mapPlayerInfo");
    if (mapInfo && player) {
        mapInfo.innerHTML = `❤️ <strong>${player.hp}/50</strong> &nbsp; ⚔️ ${player.sword.name}`;
    }

    // Actualizar pista del footer
    const anyDefeated = defeatedNodes.some(Boolean);
    const hint = document.getElementById("mapHint");
    if (hint) {
        hint.textContent = anyDefeated
            ? "🔓 Los nodos con ✔ ya fueron derrotados — podés reentrar para buscar mejores items."
            : "⚔️ Seleccioná un nodo para iniciar tu primer combate.";
    }

    updateMapNodes();
}

/**
 * Determina si un nodo está disponible para ser jugado.
 * El nodo 0 siempre está disponible.
 * El nodo N (N > 0) está disponible si defeatedNodes[N-1] === true.
 * El nodo 9 (jefe) solo está disponible si todos los nodos 0-8 fueron derrotados.
 */
function isNodeAvailable(index) {
    if (index === 9) {
        // Jefe solo disponible cuando los 9 anteriores están derrotados
        return defeatedNodes.slice(0, 9).every(Boolean);
    }
    if (index === 0) return true;
    return defeatedNodes[index - 1] === true;
}

/**
 * El jugador selecciona un nodo del mapa para combatir.
 */
function selectMapNode(index) {
    if (!isNodeAvailable(index)) return; // Doble-check por seguridad

    currentNodeIndex = index;

    // Recrear el monstruo del nodo fijado en la run para este combate
    const template = mapMonsters[index] || generateMonster(index);
    const maxHp = template.maxHp || (index === 9 ? 100 : 20 + index * 5);
    monster = new Monster(
        template.name,
        maxHp,
        template.attack || (5 + index),
        template.avatar,
        template.ability || getAbilityForMonster(template.name)
    );

    // Ocultar mapa y mostrar pantalla de combate
    document.getElementById("map-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");

    startBattleFromMap();
}

/**
 * Inicializa la pantalla de combate cuando se entra desde el mapa.
 */
function startBattleFromMap() {
    if (!player || !monster) return;

    document.getElementById("playerName").innerText = player.name;
    document.getElementById("playerClass").innerText = player.playerClass;

    updateEquipment();
    updatePlayerStats();
    updatePlayerCard();
    updateMonsterCard(monster);
    initMonsterDeck();
    updateStats();

    // HUD del jugador
    document.getElementById("hudPlayerName").textContent = player.name;
    document.getElementById("hudPlayerClass").textContent = player.playerClass;
    const pct = (Math.max(player.hp, 0) / 50) * 100;
    document.getElementById("hudHpBar").style.width = `${pct}%`;
    document.getElementById("hudHpText").textContent = `${player.hp}/50`;

    buildPlayerDeck();
    currentStamina = 0;
    updateStaminaDisplay();

    hideAllLootButtons();
    resetCombatEffects();
    removeFreezeEffect();

    setTimeout(() => {
        initIdleAnims();
        startPlayerTurn();
    }, 300);
}

/**
 * Vuelve al mapa desde el panel de configuración.
 */
function toggleMapFromConfig() {
    // Cerrar config
    const configPanel = document.getElementById("configPanel");
    if (configPanel) configPanel.style.display = "none";

    // Mostrar mapa solo si hay una partida activa
    if (player) {
        showMapScreen();
    }
}



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
        "Monstruo Mago": "mago",
        "Monstruo Guerrero": "guerrero",
        "Monstruo Explorador": "explorador",
        "Jefe Final": "boss"
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
// applyFreezeEffect() y removeFreezeEffect() están definidas más abajo:
// actúan sobre el sprite del monstruo Y el avatar legacy (ambos elementos).
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
        // Bloqueo del monstruo — reduce daño a la mitad
        if (monsterBlocking) {
            finalDamage = Math.floor(finalDamage * 0.5);
            monsterBlocking = false;
            spawnFloatingNumber(0, "block", "monsterAvatar");
            monsterSpriteAnim("monster-hit", 300);
        }
        monster.hp -= finalDamage;

        if (player.lastAttackWasCritical) {
            spawnFloatingNumber(damage, "critical", "monsterAvatar");
            avatarAnim("monsterAvatar", "avatar-critical", 500);
        } else {
            spawnFloatingNumber(damage, "damage", "monsterAvatar");
            avatarAnim("monsterAvatar", "avatar-damage", 400);
        }
        // Animacion de daño en el nuevo sprite
        monsterSpriteAnim("monster-hit", 400);
        updateStats();

        if (monster.hp <= 0) {
            handleMonsterDeath();
        } else {
            // En el nuevo sistema el monstruo ataca al fin de turno
            updateStats();
            refreshBlockCards();
            updateStaminaDisplay();
            disableHand(false);
        }
    }, 200);
}
function playerBlock() {
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
    }
    restoreIdleAnim("playerAvatar");
}
function handleSpecialCard(action) {

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
            refreshBlockCards();
            disableHand(false);
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
                refreshBlockCards();
                updateStaminaDisplay();
                disableHand(false);
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
            refreshBlockCards();
            disableHand(false);
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
            // Robar del nuevo mazo
            const extra = drawCardsFromDeck(1);
            playerHand.push(...extra);
            renderHand();
            // El bonus de bloqueo se revierte al fin de turno
            // Guardamos el valor para revertirlo en endPlayerTurn
            activeEffects.mantoLunarBonus = bonusBlock;
            updatePlayerStats();
            refreshBlockCards();
            disableHand(false);
            break;
        }

        case "estudiar": {
            // Sin ataque — robás 2 cartas sin que el monstruo ataque
            triggerSkillAnim("Mago");
            const extra = drawCardsFromDeck(2);
            playerHand.push(...extra);
            renderHand();
            updateStats(`¡Estudiar! Robaste 2 cartas sin consecuencias.`);
            refreshBlockCards();
            disableHand(false);
            break;
        }

        case "escudoArcano": {
            // Sin ataque — el próximo daño recibido es 0
            activeEffects.shieldArcane = true;
            triggerSkillAnim("Mago");
            spawnFloatingNumber(0, "block", "playerAvatar");
            updateStats(`¡Escudo Arcano! El próximo daño que recibas será anulado.`);
            // Opción B: el monstruo ataca con delay visual
            refreshBlockCards();
            disableHand(false);
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
            refreshBlockCards();
            disableHand(false);
            break;
        }

        case "retiradaTactica": {
            // Esquiva garantizada este turno + roba 1 carta
            activeEffects.playerGuaranteedDodge = true;
            triggerSkillAnim("Explorador");
            // Simular el esquive visual
            avatarAnim("playerAvatar", "avatar-dodge", 450);
            spawnFloatingNumber(0, "dodge", "playerAvatar");
            const extra = drawCardsFromDeck(1);
            playerHand.push(...extra);
            renderHand();
            updateStats(`¡Retirada Táctica! Esquivaste y robaste 1 carta.`);
            refreshBlockCards();
            disableHand(false);
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
                if (hits >= 10) {
                    updateStats(`¡Lluvia de Dagas! 10 golpes por un total de ${totalDmg} de daño.`);
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
                    updateStats(`Lluvia de Dagas — golpe ${hits}/10...`);
                    nextDaggerHit();
                }, 250);
            }

            setTimeout(() => nextDaggerHit(), 200);
            break;
        }
    }
}
function monsterAttack() {
    // Si el monstruo esta aturdido, pierde su turno
    if (activeEffects.monsterStunned) {
        activeEffects.monsterStunned = false;
        removeFreezeEffect();
        discardCountThisTurn = 0;
        clearMonsterCardZone();
        // jugador puede robar
        setTimeout(() => startPlayerTurn(), 400);
        return;
    }

    // Veneno al inicio del turno
    if (activeEffects.monsterPoisonTurns > 0) {
        monster.hp -= activeEffects.monsterPoisonDamage;
        spawnFloatingNumber(activeEffects.monsterPoisonDamage, "poison", "monsterAvatar");
        monsterSpriteAnim("monster-hit", 400);
        activeEffects.monsterPoisonTurns--;
        updateStats(`El veneno hace ${activeEffects.monsterPoisonDamage} de daño al ${monster.name}. (${activeEffects.monsterPoisonTurns} turnos restantes)`);
        if (monster.hp <= 0) {
            setTimeout(() => handleMonsterDeath(), 400);
            return;
        }
    }

    // Determinar stamina y cartas a robar segun tipo de monstruo
    const isBoss = monster.name === "Jefe Final";
    const monsterStamina = isBoss ? 6 : 4;
    const cardsToDraw = isBoss ? 4 : 3;

    // Robar cartas
    drawMonsterCards(cardsToDraw);

    // Mostrar cartas boca abajo, luego flip y resolver
    renderMonsterHand(() => {
        flipAndResolveMonsterCards(0, monsterStamina, () => {
            // Termino el turno del monstruo
            setTimeout(() => {
                clearMonsterCardZone();
                activeEffects.novaIgnoresAbilities = false;
                activeEffects.preciseShot = false;
                resetTurnEffects();
                discardCountThisTurn = 0;
                updateStats();
                // Ahora si el jugador puede robar
                setTimeout(() => startPlayerTurn(), 400);
            }, 400);
        });
    });
}
function generateMonsterLoot(monsterName, nodeIndex) {
    const loot = { materials: {}, manual: null };

    if (monsterName.includes("Comun") || monsterName.includes("Común")) {
        loot.materials.cuero = Math.floor(Math.random() * 3) + 1; // 1-3
        loot.materials.cabellos = Math.floor(Math.random() * 2) + 1; // 1-2
    } else if (monsterName.includes("Guerrero")) {
        loot.materials.armaduraMetal = Math.floor(Math.random() * 2) + 1; // 1-2
        loot.materials.huesosPesados = Math.floor(Math.random() * 2) + 1; // 1-2
    } else if (monsterName.includes("Explorador")) {
        loot.materials.veneno = Math.floor(Math.random() * 2) + 1; // 1-2
        loot.materials.hilos = Math.floor(Math.random() * 3) + 1; // 1-3
    } else if (monsterName.includes("Mago")) {
        loot.materials.polvoArcano = Math.floor(Math.random() * 2) + 1; // 1-2
        loot.materials.esenciaMana = 1;
    } else if (monsterName.includes("Jefe") || nodeIndex === 9) {
        loot.materials.nucleoTitan = 1;
        loot.materials.polvoArcano = 3;
        loot.materials.armaduraMetal = 3;
        loot.materials.veneno = 2;
        loot.manual = "exotica";
    } else {
        loot.materials.cuero = 2;
        loot.materials.hilos = 1;
    }

    // Probabilidad de dropear manuales en nodos intermedios si no los posee
    if (!loot.manual) {
        if (nodeIndex >= 2 && nodeIndex <= 4 && !player.manuals.includes("pocoComon") && Math.random() < 0.6) {
            loot.manual = "pocoComon";
        } else if (nodeIndex >= 5 && nodeIndex <= 8 && !player.manuals.includes("rara") && Math.random() < 0.5) {
            loot.manual = "rara";
        }
    }

    return loot;
}

function handleMonsterDeath() {
    resetCombatEffects(); // Limpiar efectos al cambiar de monstruo
    removeFreezeEffect();
    let message = `¡Has derrotado al ${monster.name}!`;

    // Marcar como derrotado solo si es la primera vez en esta run
    const wasNewVictory = !defeatedNodes[currentNodeIndex];
    if (wasNewVictory) {
        defeatedNodes[currentNodeIndex] = true;
        uniqueMonstersDefeated++;
        monstersDefeated = uniqueMonstersDefeated; // Mantener compatibilidad
    }

    // Victoria: el jefe final fue derrotado
    if (currentNodeIndex === 9) {
        avatarAnim("playerAvatar", "avatar-victory", 1200);
        setTimeout(() => endGame(true), 1200);
        return;
    }

    // Limpiar mano y deshabilitar
    playerHand = [];
    renderHand();
    isPlayerTurn = false;
    updateEndTurnButton(false);
    disableHand(true);

    // Generar botín de materiales
    const drops = generateMonsterLoot(monster.name, currentNodeIndex);
    let lootLines = [];

    for (const [matId, qty] of Object.entries(drops.materials)) {
        if (qty > 0 && MATERIALS[matId]) {
            player.materials[matId] = (player.materials[matId] || 0) + qty;
            lootLines.push(`+${qty} ${MATERIALS[matId].icon} ${MATERIALS[matId].name}`);
        }
    }

    if (drops.manual && !player.manuals.includes(drops.manual)) {
        player.manuals.push(drops.manual);
        const rec = RECIPES[drops.manual];
        if (rec) {
            lootLines.push(`📜 ¡NUEVO MANUAL OBTENIDO: ${rec.name}!`);
        }
    }

    message += `\n\n📦 ¡MATERIALES CAÍDOS!:\n${lootLines.join("\n")}`;

    // Mostrar panel de botones de crafteo en loot
    const lootContainer = document.getElementById("craftLootContainer");
    if (lootContainer) lootContainer.classList.remove("hidden");
    hideAllLootButtons();

    updateStats(message);

    // Mercader: aparece en victorias únicas 1, 3, 5, 7
    if (!merchantAppeared && [1, 3, 5, 7].includes(uniqueMonstersDefeated)) {
        if (Math.random() < 0.20) {
            setTimeout(() => showMerchant(), 800);
        }
    }
}

function openCraftingFromLoot() {
    hideCraftLootButtons();
    openForgeScreen();
}

function openInventoryFromLoot() {
    hideCraftLootButtons();
    openInventoryModal();
}

function finishLootAndGoToMap() {
    hideCraftLootButtons();
    applyBetweenBattleEffects();
    setTimeout(() => showMapScreen(), 400);
}

function hideCraftLootButtons() {
    document.getElementById("craftLootContainer")?.classList.add("hidden");
}

// ===================== FUNCIONES DE INVENTARIO Y CRAFTEO =====================

function openInventoryModal() {
    renderInventoryUI();
    const modal = document.getElementById("inventoryModal");
    if (modal) modal.classList.remove("hidden");
}

function switchInventoryTab(tabName) {
    const tabMat = document.getElementById("inventoryTabMaterials");
    const tabMan = document.getElementById("inventoryTabManuals");
    const tabPot = document.getElementById("inventoryTabPotions");
    const btnMat = document.getElementById("tabMaterialsBtn");
    const btnMan = document.getElementById("tabManualsBtn");
    const btnPot = document.getElementById("tabPotionsBtn");

    tabMat?.classList.add("hidden");
    tabMan?.classList.add("hidden");
    tabPot?.classList.add("hidden");
    btnMat?.classList.remove("active");
    btnMan?.classList.remove("active");
    btnPot?.classList.remove("active");

    if (tabName === "materials") {
        tabMat?.classList.remove("hidden");
        btnMat?.classList.add("active");
    } else if (tabName === "manuals") {
        tabMan?.classList.remove("hidden");
        btnMan?.classList.add("active");
    } else if (tabName === "potions") {
        tabPot?.classList.remove("hidden");
        btnPot?.classList.add("active");
    }
}

function renderInventoryUI() {
    if (!player) return;

    // ─── Grid de Materiales
    const matGrid = document.getElementById("materialsGrid");
    if (matGrid) {
        matGrid.innerHTML = "";
        for (const [key, matInfo] of Object.entries(MATERIALS)) {
            const count = player.materials[key] || 0;
            const matCard = document.createElement("div");
            matCard.className = `mat-card rarity-${matInfo.rarity} ${count === 0 ? "empty-mat" : ""}`;
            matCard.innerHTML = `
                <div class="mat-icon">${matInfo.icon}</div>
                <div class="mat-info">
                    <span class="mat-name">${matInfo.name}</span>
                    <span class="mat-desc">${matInfo.desc}</span>
                </div>
                <span class="mat-count">x${count}</span>
            `;
            matGrid.appendChild(matCard);
        }
    }

    // ─── Grid de Manuales agrupados por tipo
    const manGrid = document.getElementById("manualsGrid");
    if (manGrid) {
        manGrid.innerHTML = "";

        const groups = [
            { label: "⚔️ Conjuntos de Armas",  typeFilter: "weapon"   },
            { label: "💍 Brazaletes",           typeFilter: "bracelet" },
            { label: "⚗️ Pociones",              typeFilter: "potion"   }
        ];

        groups.forEach(group => {
            const groupRecipes = Object.entries(RECIPES).filter(([, r]) => r.type === group.typeFilter);
            if (!groupRecipes.length) return;

            // Encabezado de sección
            const header = document.createElement("div");
            header.className = "manual-section-header";
            header.textContent = group.label;
            manGrid.appendChild(header);

            groupRecipes.forEach(([recipeKey, recipeInfo]) => {
                const isUnlocked = player.manuals.includes(recipeKey);
                const manCard = document.createElement("div");
                manCard.className = `manual-card ${isUnlocked ? "unlocked" : "locked"}`;
                manCard.innerHTML = `
                    <div class="manual-icon">${isUnlocked ? renderIconHTML(recipeInfo.icon, recipeInfo.name) : "🔒"}</div>
                    <div class="manual-details">
                        <h4 class="manual-title">${isUnlocked ? recipeInfo.name : "Manual Oculto"}</h4>
                        <p class="manual-desc">${isUnlocked ? recipeInfo.desc : "Explora la mazmorra y vence enemigos para hallarlo."}</p>
                    </div>
                    <span class="manual-badge ${isUnlocked ? 'owned' : 'missing'}">${isUnlocked ? "DISPONIBLE" : "BLOQUEADO"}</span>
                `;
                manGrid.appendChild(manCard);
            });
        });
    }

    // ─── Grid de Consumibles / Pociones
    const potGrid = document.getElementById("potionsGrid");
    if (potGrid) {
        potGrid.innerHTML = "";
        if (!player.potions || player.potions.length === 0) {
            potGrid.innerHTML = `<p class="empty-state">🧪 No tienes pociones en tu mochila.<br>Puedes fabricarlas en el Taller de Forja.</p>`;
        } else {
            player.potions.forEach((pot, index) => {
                const recipeMatch = Object.values(RECIPES).find(r => r.type === "potion" && r.name === pot.name);
                const icon = recipeMatch ? recipeMatch.icon : (ITEM_ICONS[pot.name] || "⚗️");
                const desc = recipeMatch ? recipeMatch.desc : "Consumible místico de batalla.";

                const potCard = document.createElement("div");
                potCard.className = "potion-card";
                potCard.innerHTML = `
                    <div class="potion-card-icon">${renderIconHTML(icon, pot.name)}</div>
                    <div class="potion-card-details">
                        <span class="potion-card-title">${pot.name}</span>
                        <span class="potion-card-desc">${desc}</span>
                    </div>
                    <button class="potion-use-btn" onclick="usePotionFromInventory(${index})">⚗️ BEBER</button>
                `;
                potGrid.appendChild(potCard);
            });
        }
    }
}

function usePotionFromInventory(index) {
    if (!player || !player.potions || !player.potions[index]) return;
    const pot = player.potions[index];
    const potName = pot.name;
    player.usePotion(pot);
    const soundEl = document.getElementById("blockSound");
    if (soundEl) soundEl.play();
    updateStats(`🧪 ¡Has consumido: ${potName}!`);
    renderInventoryUI();
}

// ─── Variable de control del canvas de chispas ───
let _forgeParticlesRunning = false;
let _forgeParticles = [];

function openForgeScreen() {
    renderCraftingUI();
    document.getElementById("map-screen").classList.add("hidden");
    const screen = document.getElementById("forge-screen");
    screen.classList.remove("hidden");
    startForgeParticles();
}

function closeForgeScreen() {
    _forgeParticlesRunning = false;
    document.getElementById("forge-screen").classList.add("hidden");
    document.getElementById("map-screen").classList.remove("hidden");
}

// Mantener compatibilidad si algo interno llama a openCraftingModal
function openCraftingModal() {
    openForgeScreen();
}

// ─── Canvas de partículas de chispas de fragua ───
function startForgeParticles() {
    const canvas = document.getElementById("forge-bg-canvas");
    if (!canvas) return;

    // Ajustar tamaño al viewport
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    _forgeParticles = [];
    _forgeParticlesRunning = true;

    // Colores cálidos para las chispas
    const SPARK_COLORS = [
        "rgba(255, 120,  20, ",   // naranja
        "rgba(255, 200,  40, ",   // dorado
        "rgba(255,  60,  10, ",   // rojo-naranja
        "rgba(255, 240, 100, ",   // amarillo brillante
        "rgba(220,  80,   0, ",   // ámbar
    ];

    function spawnSpark() {
        // Origen: base central ± algo de ancho
        const x = canvas.width * 0.5 + (Math.random() - 0.5) * canvas.width * 0.4;
        return {
            x,
            y:     canvas.height,
            vx:    (Math.random() - 0.5) * 60,   // drift lateral (px/s)
            vy:    -(80 + Math.random() * 220),   // velocidad hacia arriba (px/s)
            life:  0,
            maxLife: 1.2 + Math.random() * 2.0,  // segundos de vida
            size:  1.0 + Math.random() * 2.5,
            color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
            // algunos giran levemente
            rotV:  (Math.random() - 0.5) * 2,
        };
    }

    // Pre-poblar con chispas en distintos estados de vida
    for (let i = 0; i < 60; i++) {
        const s = spawnSpark();
        s.life = Math.random() * s.maxLife;
        s.y -= s.vy * -s.life; // posición adelantada
        _forgeParticles.push(s);
    }

    let lastTime = 0;
    function loop(timestamp) {
        if (!_forgeParticlesRunning) return;

        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Emitir nuevas chispas cada frame (densidad constante)
        if (_forgeParticles.length < 120) {
            const count = Math.floor(2 + Math.random() * 3);
            for (let i = 0; i < count; i++) {
                _forgeParticles.push(spawnSpark());
            }
        }

        // Actualizar y dibujar
        _forgeParticles = _forgeParticles.filter(s => {
            s.life += dt;
            if (s.life >= s.maxLife) return false;

            s.x  += s.vx * dt;
            s.y  += s.vy * dt;
            s.vy += 20 * dt; // gravedad suave
            s.vx += (Math.random() - 0.5) * 15 * dt; // turbulencia

            const progress = s.life / s.maxLife;
            const alpha    = (1 - progress) * (progress < 0.1 ? progress / 0.1 : 1);
            const radius   = s.size * (1 - progress * 0.5);

            // Glow exterior
            ctx.beginPath();
            const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, radius * 4);
            grd.addColorStop(0,   s.color + (alpha * 0.9).toFixed(2) + ")");
            grd.addColorStop(0.4, s.color + (alpha * 0.35).toFixed(2) + ")");
            grd.addColorStop(1,   s.color + "0)");
            ctx.arc(s.x, s.y, radius * 4, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();

            // Núcleo brillante
            ctx.beginPath();
            ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = s.color + Math.min(alpha * 1.5, 1).toFixed(2) + ")";
            ctx.fill();

            return true;
        });

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}


function selectRecipe(recipeKey) {
    if (!player) return;
    player.selectedRecipeKey = recipeKey;
    renderCraftingUI();
}

function renderCraftingUI() {
    if (!player) return;

    // Lista de manuales en panel izquierdo
    const listEl = document.getElementById("recipesList");
    if (listEl) {
        listEl.innerHTML = "";

        // Agrupar recetas por tipo para mostrarlas con separadores
        const groups = [
            { label: "⚔️ Armas", filter: r => r.type === "weapon" },
            { label: "💍 Brazaletes", filter: r => r.type === "bracelet" },
            { label: "⚗️ Pociones", filter: r => r.type === "potion" }
        ];

        groups.forEach(group => {
            const groupRecipes = Object.entries(RECIPES).filter(([,r]) => group.filter(r));
            if (!groupRecipes.length) return;

            // Separador de grupo
            const sep = document.createElement("div");
            sep.className = "recipe-group-sep";
            sep.textContent = group.label;
            listEl.appendChild(sep);

            // Contenedor en cuadrícula (Grid) para íconos
            const grid = document.createElement("div");
            grid.className = "recipe-grid-container";

            groupRecipes.forEach(([rKey, rInfo]) => {
                const isUnlocked = player.manuals.includes(rKey);
                const isSelected = player.selectedRecipeKey === rKey;

                let canCraft = isUnlocked;
                if (isUnlocked) {
                    for (const [mat, reqQty] of Object.entries(rInfo.cost)) {
                        if ((player.materials[mat] || 0) < reqQty) { canCraft = false; break; }
                    }
                }

                const item = document.createElement("div");
                item.className = `recipe-tile tier-${rInfo.tier} ${isUnlocked ? "unlocked" : "locked"} ${isSelected ? "selected" : ""}`;
                item.title = isUnlocked ? rInfo.name : "Manual Bloqueado";
                item.onclick = () => { if (isUnlocked) selectRecipe(rKey); };
                item.innerHTML = `
                    <div class="recipe-tile-icon">${isUnlocked ? renderIconHTML(rInfo.icon, rInfo.name) : "🔒"}</div>
                    ${isUnlocked && canCraft ? '<span class="tile-craft-dot" title="¡Listo para craftear!">✨</span>' : ''}
                `;
                grid.appendChild(item);
            });

            listEl.appendChild(grid);
        });
    }

    // Detalle en panel derecho
    const detailEl = document.getElementById("recipeDetailContainer");
    if (detailEl) {
        const activeKey = player.selectedRecipeKey || "comun";
        const rInfo = RECIPES[activeKey];
        const isUnlocked = rInfo && player.manuals.includes(activeKey);

        if (!rInfo || !isUnlocked) {
            detailEl.innerHTML = `<p class="empty-state">🔒 Este manual aún no ha sido descubierto.<br>Explora la mazmorra para encontrar nuevos manuales de forja.</p>`;
            return;
        }

        let allIngredientsMet = true;
        let reqsHTML = "";
        for (const [matId, reqQty] of Object.entries(rInfo.cost)) {
            const matObj = MATERIALS[matId];
            const currentQty = player.materials[matId] || 0;
            const hasEnough = currentQty >= reqQty;
            if (!hasEnough) allIngredientsMet = false;
            reqsHTML += `
                <div class="req-row ${hasEnough ? "met" : "missing"}">
                    <span class="req-name">${matObj.icon} ${matObj.name}</span>
                    <span class="req-count">${currentQty} / ${reqQty} ${hasEnough ? '✓' : '✕'}</span>
                </div>`;
        }

        // Preview según tipo de receta
        let previewHTML = "";
        if (rInfo.type === "weapon") {
            const classSword  = swords[rInfo.swordTier][player.playerClass];
            const classShield = shields[rInfo.shieldTier][player.playerClass];
            previewHTML = `
                <div class="stat-pill"><span>⚔️ ${classSword.name}</span><span>Daño x${classSword.multiplier}</span></div>
                <div class="stat-pill"><span>🛡️ ${classShield.name}</span><span>Bloqueo ${(classShield.blockChance*100).toFixed(0)}%, HP ${classShield.hp}</span></div>`;
        } else if (rInfo.type === "bracelet") {
            const b = bracelets[rInfo.braceletKey];
            previewHTML = `<div class="stat-pill"><span>${renderIconHTML(rInfo.icon, b.name)} ${b.name}</span><span>Brazalete</span></div>`;
            if (player.bracelet) {
                previewHTML += `<div class="stat-pill" style="border-left-color:rgba(180,50,50,0.6);color:#c05050"><span>Ya equipas: ${player.bracelet.name}</span><span>Se reemplazará</span></div>`;
            }
        } else if (rInfo.type === "potion") {
            const p = potions[rInfo.potionKey];
            const slots = 3 - player.potions.length;
            previewHTML = `<div class="stat-pill"><span>${renderIconHTML(rInfo.icon, p.name)} ${p.name}</span><span>Poción</span></div>`;
            previewHTML += slots > 0
                ? `<div class="stat-pill"><span>Espacio disponible</span><span>${slots} / 3</span></div>`
                : `<div class="stat-pill" style="border-left-color:rgba(180,50,50,0.6);color:#c05050"><span>Mochila llena (3/3)</span><span>Sin espacio</span></div>`;
            if (slots <= 0) allIngredientsMet = false;
        }

        const actionLabel = rInfo.type === "weapon" ? "🔥 CRAFTEAR E EQUIPAR"
            : rInfo.type === "bracelet" ? "💍 FORJAR BRAZALETE"
            : "⚗️ PREPARAR POCIÓN";

        detailEl.innerHTML = `
            <div class="craft-detail-card">
                <div class="craft-header-badge tier-${rInfo.tier}">
                    <div class="craft-header-flex">
                        <div class="craft-big-icon">${renderIconHTML(rInfo.icon, rInfo.name)}</div>
                        <div>
                            <span class="tier-label">${rInfo.tier.toUpperCase()}</span>
                            <h4>${rInfo.name}</h4>
                        </div>
                    </div>
                    <p class="craft-recipe-desc">${rInfo.desc}</p>
                </div>
                <div class="crafted-preview">
                    <h5>Resultado:</h5>
                    <div class="preview-stats">${previewHTML}</div>
                </div>
                <div class="craft-reqs-section">
                    <h5>Materiales Requeridos:</h5>
                    <div class="reqs-list">${reqsHTML}</div>
                </div>
                <button class="craft-action-btn ${allIngredientsMet ? 'enabled' : 'disabled'}"
                        ${allIngredientsMet ? `onclick="craftWeapon('${activeKey}')"` : 'disabled'}>
                    ${allIngredientsMet ? actionLabel : '❌ MATERIALES INSUFICIENTES'}
                </button>
            </div>`;
    }
}

function craftWeapon(recipeKey) {
    if (!player) return;
    const rInfo = RECIPES[recipeKey];
    if (!rInfo || !player.manuals.includes(recipeKey)) return;

    // Verificar materiales
    for (const [matId, reqQty] of Object.entries(rInfo.cost)) {
        if ((player.materials[matId] || 0) < reqQty) {
            updateStats("⚠️ No tienes suficientes materiales para esta receta.");
            return;
        }
    }
    // Si es poción verificar espacio
    if (rInfo.type === "potion" && player.potions.length >= 3) {
        updateStats("⚠️ La mochila de pociones está llena (máx. 3).");
        return;
    }

    // Descontar materiales
    for (const [matId, reqQty] of Object.entries(rInfo.cost)) {
        player.materials[matId] -= reqQty;
    }

    // Aplicar según tipo
    if (rInfo.type === "weapon") {
        player.sword  = swords[rInfo.swordTier][player.playerClass];
        player.shield = new Shield(
            shields[rInfo.shieldTier][player.playerClass].name,
            shields[rInfo.shieldTier][player.playerClass].blockChance,
            shields[rInfo.shieldTier][player.playerClass].hp
        );
        player.shield.playerClass = player.playerClass;
        updateStats(`🔥 ¡CRAFTEADO: ${player.sword.name} y ${player.shield.name}! Equipados de inmediato.`);
    } else if (rInfo.type === "bracelet") {
        const brac = bracelets[rInfo.braceletKey];
        player.equipBracelet(brac);
        updateStats(`💍 ¡CRAFTEADO: ${brac.name}! Equipado de inmediato.`);
    } else if (rInfo.type === "potion") {
        const pot = potions[rInfo.potionKey];
        player.potions.push(pot);
        updateStats(`🥺 ¡PREPARADO: ${pot.name}! Añadido a tu mochila (${player.potions.length}/3).`);
    }

    // Sonido de forja
    const soundEl = document.getElementById("blockSound");
    if (soundEl) soundEl.play();

    updatePlayerStats();
    renderCraftingUI();
    renderInventoryUI();
}

function afterPlayerAction() {
    refreshBlockCards();
    updateStaminaDisplay();
    disableHand(false);
}
function changeWeapon() {
    player.sword = currentWeaponDrop.sword;
    player.shield = new Shield(currentWeaponDrop.shield.name, currentWeaponDrop.shield.blockChance, currentWeaponDrop.shield.hp);
    player.shield.playerClass = player.playerClass;
    player.equipBracelet(currentWeaponDrop.bracelet);
    if (player.potions.length < 3) {
        player.potions.push(currentWeaponDrop.potion);
    }
    hideAllLootButtons();
    updatePlayerStats();
    applyBetweenBattleEffects();
    setTimeout(() => showMapScreen(), 400);
}

function keepWeapon() {
    // Mantiene el equipo actual y descarta las armas/pociones del drop.
    hideAllLootButtons();
    applyBetweenBattleEffects();
    setTimeout(() => showMapScreen(), 400);
}

/**
 * Aplica efectos que ocurren entre batallas (maldición C, reset habilidad guerrero).
 * Se llama antes de volver al mapa.
 */
function applyBetweenBattleEffects() {
    if (player.curseName === "C") {
        player.hp = Math.max(player.hp - 3, 1);
        spawnFloatingNumber(3, "damage", "playerAvatar");
    }
    if (player.playerClass === "Guerrero") {
        player.skillActive = false;
    }
    updatePlayerStats();
}

/**
 * prepareNextMonster se conserva para el flujo del mercader (uso de poción ancestral).
 * En el flujo normal de loot, se usa showMapScreen() directamente.
 */
function prepareNextMonster(message) {
    applyBetweenBattleEffects();
    hideAllLootButtons();
    updateEquipment();
    setTimeout(() => showMapScreen(), 400);
}

/** Oculta todos los botones de loot de una sola vez. */
function hideAllLootButtons() {
    ["changeWeaponButton", "keepWeaponButton",
     "usePotionButton", "ancestralLootButton"
    ].forEach(id => document.getElementById(id)?.classList.add("hidden"));
}

function updateEquipment() {
}

function updateStats(message = "") {
    // Guardia: no actualizar HUD si no hay jugador o monstruo activo
    if (!player || !monster) return;

    // — HP del jugador en el HUD —
    const playerHp = Math.max(player.hp, 0);
    const playerPct = (playerHp / 50) * 100;
    document.getElementById("hudHpBar").style.width = `${playerPct}%`;
    document.getElementById("hudHpText").textContent = `${playerHp}/50`;

    // Color de la barra segun HP
    const hudBar = document.getElementById("hudHpBar");
    if (playerPct < 30) {
        hudBar.style.background = "linear-gradient(to right, #7b241c, #e74c3c)";
    } else {
        hudBar.style.background = "linear-gradient(to right, #c0392b, #e74c3c)";
    }

    // — HP del monstruo en el HUD —
    const monsterHp = Math.max(monster.hp, 0);
    const monsterPct = (monsterHp / monster.maxHp) * 100;
    document.getElementById("hudMonsterHpBar").style.width = `${monsterPct}%`;
    document.getElementById("hudMonsterHpText").textContent = `${monsterHp}/${monster.maxHp}`;


    // Danger pulse en avatar viejo (lo mantenemos por compatibilidad)
    const playerEl = document.getElementById("playerAvatar");
    if (playerEl) {
        playerEl.classList.toggle("danger", playerHp < 20);
    }

    document.getElementById("message").innerText = message;

    // Danger state en el jugador
    if (player && player.hp < 20) {
        const el = document.getElementById("playerAvatar");
        if (el && !el.classList.contains("avatar-danger")) {
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
    const bracEl = document.getElementById("playerBracelet");
    if (bracEl) {
        bracEl.innerHTML = player.bracelet ? `${getItemIconHTML(player.bracelet.name)} ${player.bracelet.name}` : "Ninguno";
    }
    const potEl = document.getElementById("playerPotions");
    if (potEl) {
        potEl.innerHTML = player.potions.length > 0
            ? player.potions.map(p => `${getItemIconHTML(p.name)} ${p.name}`).join(", ")
            : "Ninguna";
    }
}
function updatePlayerCard() {
    const classBgs = {
        "Guerrero": "./images/card_guerrero.jpg",
        "Mago": "./images/card_mago.jpg",
        "Explorador": "./images/card_explorador.jpg"
    };
    const classIcons = {
        "Guerrero": '<i class="fa-solid fa-shield"></i>',
        "Mago": '<i class="fa-solid fa-hat-wizard"></i>',
        "Explorador": '<i class="fa-solid fa-binoculars"></i>'
    };
    document.getElementById("playerCardBg").style.backgroundImage = `url('${classBgs[player.playerClass]}')`;

}

function setHandVisible(visible) {
    const deck = document.getElementById("cardDeck");
    discardMode = false;
    document.getElementById("discardBtn")?.classList.remove("active");
    if (!deck) return;

    if (!visible) {
        // Solo limpiar la mano visualmente, no tocar drawPile ni discardPile
        playerHand = [];
        renderHand();
        deck.classList.add("deck-inactive");
        updateEndTurnButton(false);
        isPlayerTurn = false;
    }
    // Si visible=true, lo maneja startPlayerTurn()
}
// disableHand() está definida más abajo junto al sistema de cartas.
// La versión canónica llama a refreshBlockCards() para manejar el estado del escudo.


function updateMonsterCard(m) {
    // Actualizar sprite del monstruo (nueva vista)
    const spriteImg = document.getElementById("monsterSpriteImg");
    if (spriteImg) {
        spriteImg.src = m.avatar;
        spriteImg.alt = m.name;
        // Resetear animaciones anteriores
        spriteImg.classList.remove("monster-hit", "monster-death", "monster-frozen", "monster-attacking");
    }

    // Actualizar nombre en el HUD
    const hudName = document.getElementById("hudMonsterName");
    if (hudName) hudName.textContent = m.name;

    // Mantener compatibilidad con sistema viejo (oculto)
    const oldIcon = document.getElementById("monsterCardIcon");
    const oldName = document.getElementById("monsterCardName");
    const oldBg = document.getElementById("monsterCardBg");
    if (oldIcon) oldIcon.innerText = "";
    if (oldName) oldName.innerText = m.name;
    if (oldBg) oldBg.style.backgroundImage = `url('${m.avatar}')`;
}
function endGame(victory) {
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("map-screen").classList.add("hidden");
    document.getElementById("end-screen").classList.remove("hidden");

    document.getElementById("endMessage").innerText = victory
        ? `¡Felicidades ${player.name}! Has derrotado al jefe final.`
        : `¡${player.name} ha sido derrotado! Intenta de nuevo.`;

    document.getElementById("restartButton").classList.remove("hidden");
}


function restartGame() {
    drawPile = [];
    discardPile = [];
    currentStamina = staminaPerTurn;
    isPlayerTurn = false;
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
    // Resetear estado del mapa
    defeatedNodes = Array(10).fill(false);
    currentNodeIndex = -1;
    mapMonsters = [];
    uniqueMonstersDefeated = 0;
    const hand = document.getElementById("actionHand");
    if (hand) hand.innerHTML = "";

    document.getElementById("end-screen").classList.add("hidden");
    document.getElementById("map-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");
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
    // Resetear estado del mapa
    defeatedNodes = Array(10).fill(false);
    currentNodeIndex = -1;
    mapMonsters = [];
    uniqueMonstersDefeated = 0;
    resetCombatEffects();
    removeFreezeEffect();

    const hand = document.getElementById("actionHand");
    if (hand) hand.innerHTML = "";

    // Cerrar el panel de config si estaba abierto
    document.getElementById("configPanel")?.classList.remove("open");

    // Ocultar todas las pantallas
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("end-screen").classList.add("hidden");
    document.getElementById("map-screen").classList.add("hidden");

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
            const iconHtml = getItemIconHTML(potion.name);
            btn.innerHTML = iconHtml ? `${iconHtml} ${potion.name}` : potion.name;
            btn.onclick = () => {
                potion.effect(player);
                player.potions.splice(index, 1);
                updatePlayerStats();
                menu.remove();
                hideAllLootButtons();
                prepareNextMonster(`Usaste una poción de ${potion.name}.`);
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
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("intro-screen").classList.remove("hidden");
    document.getElementById("start-screen").classList.add("hidden");
    initBgMusic();
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
         ${player.shield ? `(HP: ${player.shield.hp}, Bloqueo: ${(player.shield.blockChance * 100).toFixed(0)}%)` : ""}</p>
      <p>💍 Brazalete: ${player.bracelet ? `${getItemIconHTML(player.bracelet.name)} ${player.bracelet.name}` : "Ninguno"}</p>
      <p>🧪 Pociones: ${player.potions.length > 0 ? player.potions.map(p => `${getItemIconHTML(p.name)} ${p.name}`).join(", ") : "Ninguna"}</p>
      <p>✨ Habilidades restantes: ${player.skillUses}</p>
    `;
    }

    // Cerrar al hacer clic fuera del contenido
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.add("hidden");
    };
}

function spawnFloatingNumber(amount, type, anchorElementId) {
    let anchor = document.getElementById(anchorElementId);
    if (!anchor || anchor.getBoundingClientRect().width === 0) {
        if (anchorElementId === "monsterAvatar" || anchorElementId === "monsterSprite") {
            anchor = document.getElementById("monsterSprite") || document.getElementById("hudMonster");
        } else if (anchorElementId === "playerAvatar" || anchorElementId === "hudPlayer") {
            anchor = document.getElementById("hudPlayer");
        }
    }
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();

    const el = document.createElement("div");
    el.classList.add("floating-number");

    // Tipo determina color y símbolo
    const config = {
        damage: { color: "#e74c3c", text: `-${amount}` },
        heal: { color: "#2ecc71", text: `+${amount}` },
        block: { color: "#3498db", text: `🛡️ Bloqueado` },
        dodge: { color: "#f1c40f", text: `💨 Esquivado` },
        shield: { color: "#e67e22", text: `-${amount} escudo` },
        critical: { color: "#f39c12", text: `💥 CRÍTICO! -${amount}` },
        poison: { color: "#8e44ad", text: `☠️ -${amount} veneno` },
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
    // Redirigir siempre a la pantalla de mapa si hay partida activa
    if (player) showMapScreen();
}

// Emojis de tipo de monstruo para el mapa
const MONSTER_TYPE_ICONS = {
    "Monstruo Comun":      { icon: "👾", color: "#a0a0c0" },
    "Monstruo Mago":       { icon: "🧙", color: "#9b59b6" },
    "Monstruo Guerrero":   { icon: "⚔️", color: "#e74c3c" },
    "Monstruo Explorador": { icon: "🗺️", color: "#2ecc71" },
    "Jefe Final":          { icon: "💀", color: "#f39c12" },
};

function createMapNodeElement(i) {
    const isBoss      = i === 9;
    const isDefeated  = defeatedNodes[i] === true;
    const available   = isNodeAvailable(i);
    const isLocked    = !available;

    const nodeMonster = mapMonsters[i];
    const typeInfo    = available && nodeMonster
        ? (MONSTER_TYPE_ICONS[nodeMonster.name] || { icon: "👾", color: "#a0a0c0" })
        : { icon: "🔒", color: "#555" };

    const node = document.createElement("div");
    node.className = "map-node";

    const numBadge = document.createElement("div");
    numBadge.className = "map-node-number";
    if (isLocked)   numBadge.classList.add("locked");
    if (isDefeated) numBadge.classList.add("defeated");
    numBadge.textContent = isBoss ? "JEFE" : `${i + 1}`;

    const circle = document.createElement("div");
    circle.className = "map-node-circle";
    if (isBoss)     circle.classList.add("boss");
    if (isDefeated) circle.classList.add("defeated", "re-challengeable");
    if (isLocked)   circle.classList.add("locked");
    if (!isLocked && !isDefeated) circle.classList.add("available");

    circle.style.borderColor = typeInfo.color;
    circle.innerHTML = isLocked
        ? "🔒"
        : isDefeated
            ? `<span class="node-check">✔</span><span class="node-type-icon">${typeInfo.icon}</span>`
            : typeInfo.icon;

    if (available && nodeMonster) {
        const hpInfo  = isBoss ? "100 HP" : `${nodeMonster.hp} HP`;
        const atkInfo = isBoss ? "10 ATK" : `${nodeMonster.attack} ATK`;
        circle.title  = `${nodeMonster.name}\n${hpInfo} · ${atkInfo}`;
    }

    const label = document.createElement("div");
    label.className = "map-node-label";
    if (isDefeated) label.classList.add("defeated");
    if (!isLocked && !isDefeated) label.classList.add("available");
    if (isBoss)     label.classList.add("boss");
    if (isLocked)   label.classList.add("locked");

    if (isLocked) {
        label.textContent = "???";
    } else if (isBoss) {
        label.textContent = "Jefe";
    } else if (isDefeated) {
        label.textContent = "✔ Reentrar";
    } else {
        const shortName = nodeMonster ? nodeMonster.name.replace("Monstruo ", "") : `N${i + 1}`;
        label.textContent = shortName;
    }

    node.appendChild(numBadge);
    node.appendChild(circle);
    node.appendChild(label);

    if (available) {
        node.classList.add("clickable");
        const onSelect = (e) => {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }
            selectMapNode(i);
        };
        node.onclick = onSelect;
        circle.onclick = onSelect;
    }

    return node;
}

function updateMapNodes() {
    const container = document.getElementById("mapNodes");
    if (!container) return;
    container.innerHTML = "";

    // ── Fila Superior (Nodos 1 a 5 -> Índices 0 a 4) ──
    const topRow = document.createElement("div");
    topRow.className = "map-row top-row";

    for (let i = 0; i <= 4; i++) {
        topRow.appendChild(createMapNodeElement(i));
        if (i < 4) {
            const conn = document.createElement("div");
            conn.className = "map-connector-h";
            if (defeatedNodes[i]) conn.classList.add("defeated");
            conn.innerHTML = "➔";
            topRow.appendChild(conn);
        }
    }
    container.appendChild(topRow);

    // ── Conector Vertical (Conecta Nodo 5 a Nodo 6) ──
    const vBox = document.createElement("div");
    vBox.className = "map-connector-v-box";
    const vConn = document.createElement("div");
    vConn.className = "map-connector-v";
    if (defeatedNodes[4]) vConn.classList.add("defeated");
    vConn.innerHTML = "<span class='v-arrow'>⬇</span>";
    vBox.appendChild(vConn);
    container.appendChild(vBox);

    // ── Fila Inferior (Nodos 10 a 6 -> Índices 9 a 5, desplegados de derecha a izquierda) ──
    const bottomRow = document.createElement("div");
    bottomRow.className = "map-row bottom-row";

    for (let i = 9; i >= 5; i--) {
        bottomRow.appendChild(createMapNodeElement(i));
        if (i > 5) {
            const conn = document.createElement("div");
            conn.className = "map-connector-h";
            if (defeatedNodes[i - 1]) conn.classList.add("defeated");
            conn.innerHTML = "";
            bottomRow.appendChild(conn);
        }
    }
    container.appendChild(bottomRow);
}
function getWeaponNames() {
    const weaponNames = {
        Guerrero: { sword: "Espada", shield: "Escudo" },
        Mago: { sword: "Báculo", shield: "Barrera" },
        Explorador: { sword: "Daga", shield: "Señuelo" }
    };
    return weaponNames[player.playerClass] || { sword: "Arma", shield: "Defensa" };
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

        const weapons = getWeaponNames();
        const comboAText = `${swords.exotica[player.playerClass].name} + ${shields.rara[player.playerClass].name}`;
        const comboBText = `${swords.rara[player.playerClass].name} + ${shields.exotica[player.playerClass].name}`;
        const commonDealHTML = `
    <div class="merchant-deal">
        <h4>⚔️ Trato del Mercader</h4>
        <p>${comboAText}<br><strong>O</strong><br>${comboBText}</p>
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
        <p>${merchantSword.name} + ${merchantShield.name} + ${merchantBracelet.name}<br>
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
    switch (curseId) {
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
    const comboA = {
        sword: swords.exotica[player.playerClass],
        shield: new Shield(shields.rara[player.playerClass].name, shields.rara[player.playerClass].blockChance, shields.rara[player.playerClass].hp)
    };
    const comboB = {
        sword: swords.rara[player.playerClass],
        shield: new Shield(shields.exotica[player.playerClass].name, shields.exotica[player.playerClass].blockChance, shields.exotica[player.playerClass].hp)
    };

    const combo = Math.random() < 0.5 ? comboA : comboB;
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
    player.shield.takeDamage = function (damage) {
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
    applyBetweenBattleEffects();
    hideAllLootButtons();
    updateEquipment();
    setTimeout(() => showMapScreen(), 400);
}
function takeAncestralPotion() {
    if (player.potions.length >= 3) {
        updateStats("Ya tenés 3 pociones, no podés cargar más.");
        return;
    }
    player.potions.push(currentWeaponDrop.potion);
    updatePlayerStats();
    hideAllLootButtons();
    applyBetweenBattleEffects();
    setTimeout(() => showMapScreen(), 400);
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
    document.getElementById("bgMusic").volume = value * 0.4; // La musica siempre un poco mas baja que los efectos
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
    attack: (cls) => ({ type: "attack", label: "Atacar", img: `./targetas/${cls}_ataque.jpg` }),
    block: (cls) => ({ type: "block", label: "Bloquear", img: `./targetas/${cls}_bloqueo.jpg` }),
    skill: (cls) => ({ type: "skill", label: labelForSkill(cls), img: `./targetas/${cls}_habilidad.jpg` }),
    hybrid: () => ({ type: "hybrid", label: labelForSkill(hybridClass), img: `./targetas/${(hybridClass || "guerrero").toLowerCase()}_habilidad.jpg` }),

    // — GUERRERO —
    golpeBrutal: () => ({ type: "golpeBrutal", label: "Golpe Brutal", img: "./targetas/guerrero/golpeBrutal.jpg" }),
    sedDeSangre: () => ({ type: "sedDeSangre", label: "Sed de Sangre", img: "./targetas/guerrero/sedDeSangre.jpg" }),
    posturaDefensiva: () => ({ type: "posturaDefensiva", label: "Postura Defensiva", img: "./targetas/guerrero/posturaDefensiva.jpg" }),
    golpeAturdidor: () => ({ type: "golpeAturdidor", label: "Golpe Aturdidor", img: "./targetas/guerrero/golpeAturdidor.jpg" }),
    contragolpe: () => ({ type: "contragolpe", label: "Contragolpe", img: "./targetas/guerrero/contraataque.jpg" }),
    ejecucion: () => ({ type: "ejecucion", label: "Ejecución", img: "./targetas/guerrero/guerrero_ulti.jpg" }),

    // — MAGO —
    helar: () => ({ type: "helar", label: "Helar", img: "./targetas/mago/helar.jpg" }),
    drenar: () => ({ type: "drenar", label: "Drenar", img: "./targetas/mago/drenar.jpg" }),
    mantoLunar: () => ({ type: "mantoLunar", label: "Manto Lunar", img: "./targetas/mago/mantoLunar.jpg" }),
    estudiar: () => ({ type: "estudiar", label: "Estudiar", img: "./targetas/mago/estudiar.jpg" }),
    escudoArcano: () => ({ type: "escudoArcano", label: "Escudo Arcano", img: "./targetas/mago/escudoArcano.jpg" }),
    novaArcana: () => ({ type: "novaArcana", label: "Nova Arcana", img: "./targetas/mago/NovaArcana.jpg" }),

    // — EXPLORADOR —
    disparoCertero: () => ({ type: "disparoCertero", label: "Disparo Certero", img: "./targetas/explorador/disparoCertero.jpg" }),
    veneno: () => ({ type: "veneno", label: "Veneno", img: "./targetas/explorador/veneno.jpg" }),
    ojoDeAguila: () => ({ type: "ojoDeAguila", label: "Ojo de Águila", img: "./targetas/explorador/ojoDeAguila.jpg" }),
    retiradaTactica: () => ({ type: "retiradaTactica", label: "Retirada Táctica", img: "./targetas/explorador/retiradaTactica.jpg" }),
    ataqueDoble: () => ({ type: "ataqueDoble", label: "Ataque Doble", img: "./targetas/explorador/AtaqueDoble.jpg" }),
    lluviaDeDagas: () => ({ type: "lluviaDeDagas", label: "Lluvia de Dagas", img: "./targetas/explorador/lluviaDeDagas.jpg" }),
};


function labelForSkill(cls) {
    const labels = { "Guerrero": "Furia", "Mago": "Meditar", "Explorador": "Fabricar" };
    return labels[cls] || "Habilidad";
}

// Mano actual
let playerHand = [];


// Contadores de carta por ronda
let skillCardsDealtThisRound = 0;
let blockCardsAllowed = true;


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

function handleDeckClick() {
}



function handleCardClick(card) {
    if (!isPlayerTurn) return;
    if (card.classList.contains("disabled") && !discardMode) return;

    const index = parseInt(card.dataset.index);

    if (discardMode) {
        handleDiscardClick(card, index);
        return;
    }

    if (card.classList.contains("disabled")) return;

    const action = card.dataset.action;
    const cost = getCardStaminaCost(action);

    // Verificar stamina suficiente
    if (currentStamina < cost) {
        spawnFloatingNumber(cost, "damage", "playerAvatar");
        updateStats("¡No tenés suficiente stamina!");
        return;
    }

    spendStamina(cost);
    card.classList.add("selecting");

    setTimeout(async () => {
        card.classList.remove("selecting");
        // Animar carta al descarte antes de ejecutar
        await new Promise(resolve => {
            animateSingleCardToDiscard(card, resolve);
        });
        discardPile.push(playerHand[index]);
        playerHand.splice(index, 1);
        updateDeckCounters();
        renderHand();

        if (action === "attack") {
            playerAttack();
        } else if (action === "block") {
            playerBlock();
        } else if (action === "skill") {
            player.applySkill(player.playerClass);
            refreshBlockCards();
        } else if (action === "hybrid") {
            const el = document.getElementById("playerAvatar");
            el.classList.add("avatar-hybrid-flash");
            setTimeout(() => el.classList.remove("avatar-hybrid-flash"), 800);
            player.applySkill(hybridClass);
            refreshBlockCards();
        } else {
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
    attack: "Realizás un ataque normal con tu arma actual. El daño depende del multiplicador de tu espada.",
    block: "Intentás bloquear el próximo ataque del monstruo. Si bloqueás, recuperás 15 vida. Si fallás, recibís daño y una parte va a tu escudo.",
    skill: "Usás tu habilidad de clase. Guerrero: daño x2 y reducción de daño 50%. Mago: +15 vida y +5% bloqueo. Explorador: repara escudo y 50% de mejorar el arma.",
    golpeBrutal: "Ataque x1.5 de daño. A cambio te cuesta 3 puntos de vida.",
    sedDeSangre: "Tu daño es igual a (50 - tu vida actual). Cuanto más herido estés, más daño hacés.",
    posturaDefensiva: "No atacás este turno. El próximo daño que recibás se reduce un 80%.",
    golpeAturdidor: "Atacás con daño normal y el monstruo pierde su siguiente turno, congelado.",
    contragolpe: "Solo disponible con 30 HP o menos. Daño doble aprovechando tu desesperación.",
    ejecucion: "Si el monstruo tiene 30% o menos de vida lo eliminás instantáneamente. Si no, hacés daño x2.",
    helar: "No atacás. El monstruo queda congelado y pierde su siguiente turno.",
    drenar: "Atacás por la mitad del daño normal pero recuperás exactamente lo que dañaste.",
    mantoLunar: "Sin ataque. Ganás +20% de bloqueo este turno y robás 1 carta extra.",
    estudiar: "Sin ataque ni consecuencias. Robás 2 cartas adicionales.",
    escudoArcano: "Sin ataque. El próximo daño que recibás este turno es completamente anulado.",
    novaArcana: "Daño fijo de 35. El monstruo no puede usar sus habilidades especiales este turno.",
    disparoCertero: "Ataque normal que ignora el contraataque del Monstruo Guerrero.",
    veneno: "Daño reducido ahora, pero el monstruo recibe 3 de daño adicional durante 3 turnos.",
    ojoDeAguila: "Sin ataque. Tu próximo ataque en este combate será un crítico garantizado (daño x2).",
    retiradaTactica: "Esquivás el ataque del monstruo de forma garantizada y robás 1 carta extra.",
    ataqueDoble: "Dos golpes de daño mitad cada uno. Pueden sumar más que un ataque normal.",
    lluviaDeDagas: "Cuatro golpes de daño base sin multiplicador de arma. Útil para romper regeneración.",
    hybrid: "Usás la habilidad de tu clase híbrida obtenida con el Pacto Ancestral.",
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
        guerrero: ["golpeBrutal", "sedDeSangre", "posturaDefensiva", "golpeAturdidor", "contragolpe", "ejecucion"],
        mago: ["helar", "drenar", "mantoLunar", "estudiar", "escudoArcano", "novaArcana"],
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

    // Badge de tipo con color semántico según la naturaleza de la carta
    const typeMeta = {
        attack:           { label: "⚔️ Ataque",     cls: "badge-attack" },
        block:            { label: "🛡️ Defensa",    cls: "badge-block" },
        skill:            { label: "✨ Habilidad",  cls: "badge-skill" },
        hybrid:           { label: "🌀 Híbrida",    cls: "badge-hybrid" },
        golpeBrutal:      { label: "⚔️ Ataque",     cls: "badge-attack" },
        sedDeSangre:      { label: "🩸 Sangre",     cls: "badge-blood" },
        posturaDefensiva: { label: "🛡️ Postura",   cls: "badge-block" },
        golpeAturdidor:   { label: "⚡ Control",    cls: "badge-control" },
        contragolpe:      { label: "⚔️ Reacción",   cls: "badge-attack" },
        ejecucion:        { label: "💀 Ejecución",  cls: "badge-attack" },
        helar:            { label: "❄️ Control",    cls: "badge-control" },
        drenar:           { label: "💜 Drenar",     cls: "badge-skill" },
        mantoLunar:       { label: "🌙 Apoyo",      cls: "badge-support" },
        estudiar:         { label: "📖 Apoyo",      cls: "badge-support" },
        escudoArcano:     { label: "🛡️ Arcano",    cls: "badge-block" },
        novaArcana:       { label: "🔮 Magia",      cls: "badge-skill" },
        disparoCertero:   { label: "🎯 Precisión",  cls: "badge-attack" },
        veneno:           { label: "☠️ Veneno",     cls: "badge-blood" },
        ojoDeAguila:      { label: "🦅 Apoyo",      cls: "badge-support" },
        retiradaTactica:  { label: "💨 Evasión",    cls: "badge-support" },
        ataqueDoble:      { label: "⚔️ Ataque",     cls: "badge-attack" },
        lluviaDeDagas:    { label: "🗡️ Multi",      cls: "badge-attack" },
    };
    const meta = typeMeta[card.type] || { label: "🃏 Carta", cls: "badge-default" };

    panel.innerHTML = `
        <div class="card-detail-inner ${isHybrid ? 'is-hybrid' : ''}">
            <span class="card-detail-badge ${meta.cls}">${meta.label}</span>
            <div class="card-detail-img-wrapper ${isHybrid ? 'hybrid-glow' : ''}">
                <img
                    src="${card.img}"
                    alt="${card.label}"
                    class="card-detail-img"
                >
            </div>
            <p class="card-detail-name ${isHybrid ? 'hybrid-name' : ''}">${card.label}</p>
            <div class="card-detail-separator">
                <span class="sep-gem">◆</span>
            </div>
            <p class="card-detail-desc">${cardDescriptions[card.type] || "Sin descripción disponible."}</p>
        </div>
    `;
}
// ===================== STAMINA =====================

function updateStaminaDisplay() {
    const orbs = document.getElementById("staminaOrbs");
    const text = document.getElementById("staminaText");
    if (!orbs || !text) return;

    orbs.innerHTML = "";
    for (let i = 0; i < maxStamina; i++) {
        const orb = document.createElement("div");
        orb.classList.add("stamina-orb");
        if (i >= currentStamina) {
            orb.classList.add("empty");
        } else if (i >= staminaPerTurn) {
            orb.classList.add("accumulated");
        }
        orbs.appendChild(orb);
    }
    text.textContent = `${currentStamina} / ${maxStamina}`;
}

function spendStamina(amount) {
    currentStamina = Math.max(currentStamina - amount, 0);
    updateStaminaDisplay();
}

function rechargeStamina() {
    currentStamina = Math.min(currentStamina + staminaPerTurn, maxStamina);
    updateStaminaDisplay();
}

function getCardStaminaCost(type) {
    if (type === "attack" || type === "block") return 1;
    if (type === "skill" || type === "hybrid") return 1;
    // Ulti — por ahora ejecucion y novaArcana
    if (type === "ejecucion" || type === "novaArcana" || type === "lluviaDeDagas") return 4;
    // Especiales
    return 2;
}

// ===================== MAZO Y DESCARTE =====================

function buildPlayerDeck() {
    const cls = player.playerClass.toLowerCase();
    const basicTypes = ["attack", "attack", "attack", "attack", "attack",
        "block", "block", "block", "block"];

    const classSpecial = {
        guerrero: ["golpeBrutal", "sedDeSangre", "posturaDefensiva", "golpeAturdidor", "ejecucion"],
        mago: ["helar", "drenar", "mantoLunar", "escudoArcano", "novaArcana"],
        explorador: ["disparoCertero", "veneno", "ojoDeAguila", "retiradaTactica", "lluviaDeDagas"],
    };

    const specials = classSpecial[cls] || [];
    // 2 especiales x2 copias + skill x1
    const specialCards = [specials[0], specials[1], specials[2], specials[3], "skill"];
    // Ulti
    const ulti = specials[4];

    const allTypes = [...basicTypes, ...specialCards, ulti];

    const basicTypesList = ["attack", "block", "skill", "hybrid"];
    drawPile = allTypes.map(type => {
        const data = basicTypesList.includes(type)
            ? cardTypes[type](cls)
            : cardTypes[type]();
        return { ...data, type };
    });

    discardPile = [];
    shuffleDeck(drawPile);
    updateDeckCounters();
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function updateDeckCounters() {
    const deckCount = document.getElementById("deckCount");
    const discardCount = document.getElementById("discardPileCount");
    const discardWrapper = document.getElementById("discardPile");
    const discardImg = document.getElementById("discardPileImg");

    if (deckCount) deckCount.textContent = drawPile.length;
    if (discardCount) discardCount.textContent = discardPile.length;

    if (discardWrapper) {
        if (discardPile.length === 0) {
            discardWrapper.classList.add("empty");
            if (discardImg) discardImg.style.display = "none";
        } else {
            discardWrapper.classList.remove("empty");
            if (discardImg) discardImg.style.display = "block";
        }
    }
}

async function reshuffleDiscardIntoDeck() {
    // Animacion de barajado
    await playShuffleAnimation();
    drawPile = [...discardPile];
    discardPile = [];
    shuffleDeck(drawPile);
    updateDeckCounters();
}

function playShuffleAnimation() {
    return new Promise(resolve => {
        const overlay = document.getElementById("shuffleOverlay");
        overlay.style.display = "flex";

        // Cartas volando
        const discardRect = document.getElementById("discardPile").getBoundingClientRect();
        const deckRect = document.getElementById("cardDeck").getBoundingClientRect();

        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const card = document.createElement("div");
                card.classList.add("shuffle-card");
                const tx = deckRect.left - discardRect.left + (Math.random() * 20 - 10);
                const ty = deckRect.top - discardRect.top + (Math.random() * 20 - 10);
                const rot = (Math.random() * 60 - 30) + "deg";
                const dur = (0.5 + Math.random() * 0.4) + "s";
                card.style.setProperty("--tx", `${tx}px`);
                card.style.setProperty("--ty", `${ty}px`);
                card.style.setProperty("--rot", rot);
                card.style.setProperty("--duration", dur);
                card.style.left = `${discardRect.left}px`;
                card.style.top = `${discardRect.top}px`;
                document.body.appendChild(card);
                setTimeout(() => card.remove(), 1000);
            }, i * 80);
        }

        setTimeout(() => {
            overlay.style.display = "none";
            resolve();
        }, 1800);
    });
}

function drawCardsFromDeck(amount) {
    const drawn = [];
    for (let i = 0; i < amount; i++) {
        if (drawPile.length === 0) {
            if (discardPile.length === 0) break;
            // Rebarajar sincrónicamente si no hay cartas
            drawPile = [...discardPile];
            discardPile = [];
            shuffleDeck(drawPile);
            updateDeckCounters();
        }
        drawn.push(drawPile.pop());
    }
    updateDeckCounters();
    return drawn;
}

function sendHandToDiscard() {
    discardPile.push(...playerHand);
    playerHand = [];
    updateDeckCounters();
}

async function startPlayerTurn() {
    isPlayerTurn = true;
    extraDrawFromDiscard = 0;
    discardCountThisTurn = 0;
    discardMode = false;
    const discardBtn = document.getElementById("discardBtn");
    if (discardBtn) {
        discardBtn.classList.remove("active", "disabled");
    }

    rechargeStamina();

    // Si el mazo está vacío antes de robar, rebarajar con animación
    if (drawPile.length === 0 && discardPile.length > 0) {
        await reshuffleDiscardIntoDeck();
    }

    const drawn = drawCardsFromDeck(5);
    playerHand = drawn;
    renderHand();
    updateDeckCounters();
    updateStaminaDisplay();
    updateEndTurnButton(true);
    refreshBlockCards();
}

function updateEndTurnButton(enabled) {
    const btn = document.getElementById("endTurnBtn");
    if (!btn) return;
    btn.disabled = !enabled;
}

function endPlayerTurn() {
    if (!isPlayerTurn) return;
    isPlayerTurn = false;
    updateEndTurnButton(false);
    // Revertir bonus de Manto Lunar si estaba activo
    if (activeEffects.mantoLunarBonus) {
        player.shield.blockChance = Math.max(
            player.shield.blockChance - activeEffects.mantoLunarBonus, 0.05
        );
        activeEffects.mantoLunarBonus = 0;
        updatePlayerStats();
    }
    // Animar cartas restantes yendo al descarte
    animateHandToDiscard(() => {
        sendHandToDiscard();
        renderHand();
        discardCountThisTurn = 0;

        setTimeout(() => {
            monsterAttack();
            updateStats();
            disableHand(false);
            refreshBlockCards();
        }, 500);
    });
}

function animateHandToDiscard(callback) {
    const cards = document.querySelectorAll(".action-card");
    const discardRect = document.getElementById("discardPile").getBoundingClientRect();

    if (cards.length === 0) { callback(); return; }

    cards.forEach((card, i) => {
        const cardRect = card.getBoundingClientRect();
        const dx = discardRect.left - cardRect.left + discardRect.width / 2;
        const dy = discardRect.top - cardRect.top;
        card.style.setProperty("--dx", `${dx}px`);
        card.style.setProperty("--dy", `${dy}px`);
        setTimeout(() => {
            card.classList.add("flying-to-discard");
        }, i * 60);
    });

    setTimeout(callback, cards.length * 60 + 500);
}

// ===================== DESCARTE VOLUNTARIO =====================

function toggleDiscardMode() {
    if (!isPlayerTurn || playerHand.length === 0) return;
    if (discardCountThisTurn >= 1) {
        document.getElementById("message").innerText = "⚠️ Solo podés descartar y robar 1 vez por turno.";
        return;
    }
    discardMode = !discardMode;

    const btn = document.getElementById("discardBtn");
    if (btn) btn.classList.toggle("active", discardMode);

    document.querySelectorAll(".action-card").forEach(c => {
        if (discardMode) {
            c.classList.add("discard-mode");
        } else {
            c.classList.remove("discard-mode");
        }
    });
}

function handleDiscardClick(card, index) {
    if (discardCountThisTurn >= 1) return;
    discardCountThisTurn++;
    discardMode = false;

    const btn = document.getElementById("discardBtn");
    if (btn) {
        btn.classList.remove("active");
        btn.classList.add("disabled");
    }

    const cardData = playerHand[index];
    animateSingleCardToDiscard(card, () => {
        discardPile.push(cardData);
        playerHand.splice(index, 1);
        extraDrawFromDiscard += 2;
        updateDeckCounters();

        // Robar 2 cartas extra si hay en el mazo
        const extra = drawCardsFromDeck(Math.min(2, drawPile.length + discardPile.length));
        playerHand.push(...extra);
        renderHand();
        refreshBlockCards();
        updateStaminaDisplay();
        updateStats("Descartaste 1 carta y robaste 2 nuevas.");
    });
}

function animateSingleCardToDiscard(cardEl, callback) {
    const discardRect = document.getElementById("discardPile").getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();
    const dx = discardRect.left - cardRect.left + discardRect.width / 2;
    const dy = discardRect.top - cardRect.top;
    cardEl.style.setProperty("--dx", `${dx}px`);
    cardEl.style.setProperty("--dy", `${dy}px`);
    cardEl.classList.add("flying-to-discard");
    setTimeout(callback, 450);
}
// ============ ANIMACIONES DEL SPRITE DEL MONSTRUO ============

function monsterSpriteAnim(className, duration = 500) {
    const img = document.getElementById("monsterSpriteImg");
    if (!img) return;
    // Pausar idle mientras dura la animacion
    img.style.animation = "none";
    img.classList.add(className);
    setTimeout(() => {
        img.classList.remove(className);
        // Restaurar idle
        img.style.animation = "";
    }, duration);
}

// Aplicar efecto congelado al sprite
function applyFreezeEffect() {
    const img = document.getElementById("monsterSpriteImg");
    if (img) img.classList.add("monster-frozen");
    // Mantener compatibilidad con sistema viejo
    const el = document.getElementById("monsterAvatar");
    if (el) el.classList.add("avatar-frozen");
}

// Quitar efecto congelado del sprite
function removeFreezeEffect() {
    const img = document.getElementById("monsterSpriteImg");
    if (img) img.classList.remove("monster-frozen");
    // Mantener compatibilidad con sistema viejo
    const el = document.getElementById("monsterAvatar");
    if (el) el.classList.remove("avatar-frozen");
}
// ============ PANEL DE AYUDA DESPLEGABLE ============

function toggleHelpPanel() {
    const panel = document.getElementById("helpButtons");
    const btn = document.getElementById("helpToggleBtn");
    const isOpen = panel.classList.contains("expanded");

    if (isOpen) {
        // Cerrar
        panel.classList.remove("expanded");
        btn.classList.remove("open");
        btn.textContent = "‹";
    } else {
        // Abrir
        panel.classList.add("expanded");
        btn.classList.add("open");
        btn.textContent = "›";
    }
}

// Mapa desde configuracion — cierra config y abre el mapa
function toggleMapFromConfig() {
    // Primero cerramos config
    toggleConfig();
    // Directamente abrimos el mapa siempre
    const map = document.getElementById("dungeonMap");
    map.classList.remove("hidden");
    updateMapNodes();
}
// Cerrar el mapa al clickear fuera de el
document.addEventListener("click", function (e) {
    const map = document.getElementById("dungeonMap");
    if (!map.classList.contains("hidden")) {
        // No cerrar si el click fue dentro del mapa, 
        // en el boton de config, o dentro del panel de config
        if (
            !map.contains(e.target) &&
            !document.getElementById("configPanel").contains(e.target) &&
            e.target.id !== "gameConfigBtn"
        ) {
            map.classList.add("hidden");
        }
    }
});
// ============ SISTEMA DE CARTAS DEL MONSTRUO ============

// Definicion del mazo del monstruo — igual para todos, cambia la habilidad especial
function buildMonsterDeck(monsterAbilityType) {
    // 4 ataques normales, 2 ataques fuertes, 2 bloqueos, 2 habilidades especiales
    const deck = [
        { type: "attack", label: "Ataque", icon: "⚔️", cost: 1 },
        { type: "attack", label: "Ataque", icon: "⚔️", cost: 1 },
        { type: "attack", label: "Ataque", icon: "⚔️", cost: 1 },
        { type: "attack", label: "Ataque", icon: "⚔️", cost: 1 },
        { type: "attack-strong", label: "Golpe Fuerte", icon: "💥", cost: 2 },
        { type: "attack-strong", label: "Golpe Fuerte", icon: "💥", cost: 2 },
        { type: "block", label: "Bloquear", icon: "🛡️", cost: 1 },
        { type: "block", label: "Bloquear", icon: "🛡️", cost: 1 },
        { type: "ability", label: getMonsterAbilityLabel(monsterAbilityType), icon: getMonsterAbilityIcon(monsterAbilityType), cost: 2 },
        { type: "ability", label: getMonsterAbilityLabel(monsterAbilityType), icon: getMonsterAbilityIcon(monsterAbilityType), cost: 2 },
    ];
    shuffleDeck(deck);
    return deck;
}

function getMonsterAbilityLabel(type) {
    const labels = {
        "mago": "Regenerar",
        "guerrero": "Contraataque",
        "explorador": "Rompe Escudo",
        "boss": "Poder Oscuro",
        "comun": "Ataque Certero"
    };
    return labels[type] || "Habilidad";
}

function getMonsterAbilityIcon(type) {
    const icons = {
        "mago": "✨",
        "guerrero": "⚡",
        "explorador": "💢",
        "boss": "☠️",
        "none": "👁️"
    };
    return icons[type] || "✨";
}

// Variables del mazo del monstruo
let monsterDrawPile = [];
let monsterDiscardPile = [];
let monsterHand = [];
let monsterBlocking = false; // Si el monstruo bloqueara el proximo ataque

// Inicializar mazo del monstruo al empezar combate
function initMonsterDeck() {
    // Determinar tipo de habilidad segun el monstruo actual
    const abilityMap = {
        "Monstruo Mago": "mago",
        "Monstruo Guerrero": "guerrero",
        "Monstruo Explorador": "explorador",
        "Jefe Final": "boss",
        "Monstruo Comun": "comun"
    };
    const abilityType = abilityMap[monster.name] || "none";
    monsterDrawPile = buildMonsterDeck(abilityType);
    monsterDiscardPile = [];
    monsterHand = [];
    monsterBlocking = false;
}

// Robar cartas para el monstruo
function drawMonsterCards(amount) {
    for (let i = 0; i < amount; i++) {
        if (monsterDrawPile.length === 0) {
            if (monsterDiscardPile.length === 0) break;
            // Rebarajar el descarte del monstruo
            monsterDrawPile = [...monsterDiscardPile];
            monsterDiscardPile = [];
            shuffleDeck(monsterDrawPile);
        }
        monsterHand.push(monsterDrawPile.pop());
    }
}

// Mostrar cartas del monstruo en la zona — boca abajo primero
function renderMonsterHand(callback) {
    const zone = document.getElementById("monsterCardZone");
    zone.innerHTML = "";
    zone.classList.add("has-cards");

    monsterHand.forEach((card, i) => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("monster-card-wrapper");
        wrapper.dataset.index = i;

        wrapper.innerHTML = `
            <div class="monster-card" id="monsterCard${i}">
                <!-- Dorso -->
                <div class="monster-card-back">
                    <img src="./targetas/mazo.jpg" alt="Carta">
                </div>
                <!-- Frente -->
                <div class="monster-card-front type-${card.type}">
                    <div class="card-icon-big">${card.icon}</div>
                    <div class="card-name">${card.label}</div>
                    <div class="card-type-bar">${card.type === "attack" ? "Ataque" : card.type === "attack-strong" ? "Fuerte" : card.type === "block" ? "Bloqueo" : "Habilidad"}</div>
                </div>
            </div>
        `;

        zone.appendChild(wrapper);

        // Animacion de entrada escalonada
        setTimeout(() => {
            wrapper.classList.add("appearing");
        }, i * 150);
    });

    // Una vez que aparecieron todas, llamar al callback para empezar el flip
    setTimeout(callback, monsterHand.length * 150 + 500);
}

// Voltear cartas una por una y resolverlas
function flipAndResolveMonsterCards(cardIndex, stamina, onDone) {
    if (cardIndex >= monsterHand.length) {
        onDone();
        return;
    }

    const card = monsterHand[cardIndex];

    // Sin stamina suficiente — descartar sin jugar y pasar a la siguiente
    if (stamina < card.cost) {
        discardMonsterCard(cardIndex, () => {
            flipAndResolveMonsterCards(cardIndex + 1, stamina, onDone);
        });
        return;
    }

    const cardEl = document.getElementById(`monsterCard${cardIndex}`);
    const wrapper = cardEl ? cardEl.parentElement : null;

    if (wrapper) wrapper.classList.add("playing");

    setTimeout(() => {
        if (cardEl) cardEl.classList.add("flipped");

        setTimeout(() => {
            // Restar stamina ANTES de pasar a la siguiente carta
            const newStamina = stamina - card.cost;

            resolveMonsterCard(card, cardIndex, () => {
                discardMonsterCard(cardIndex, () => {
                    setTimeout(() => {
                        // Pasar la stamina actualizada a la siguiente llamada
                        flipAndResolveMonsterCards(cardIndex + 1, newStamina, onDone);
                    }, 300);
                });
            });
        }, 650);
    }, 350);
}

// Resolver el efecto de una carta del monstruo
function resolveMonsterCard(card, index, callback) {
    if (activeEffects.monsterStunned) {
        // Si esta aturdido no hace nada
        callback();
        return;
    }

    switch (card.type) {
        case "attack": {
            // Verificar bloqueo del jugador activo
            monsterSpriteAnim("monster-attacking", 450);
            setTimeout(() => {
                let damage = Math.floor(Math.random() * monster.attack) + 1;
                applyMonsterDamageToPlayer(damage);
                callback();
            }, 500);
            break;
        }

        case "attack-strong": {
            // Daño x1.5
            monsterSpriteAnim("monster-attacking", 450);
            setTimeout(() => {
                let damage = Math.floor(Math.floor(Math.random() * monster.attack) + 1) * 1.5;
                damage = Math.floor(damage);
                applyMonsterDamageToPlayer(damage);
                callback();
            }, 500);
            break;
        }

        case "block": {
            // El monstruo se prepara para bloquear el proximo ataque del jugador
            monsterBlocking = true;
            spawnFloatingNumber(0, "block", "monsterAvatar");
            monsterSpriteAnim("monster-hit", 300);
            updateStats(`El ${monster.name} se prepara para bloquear.`);
            // Highlight visual en la carta
            const zone = document.getElementById("monsterCardZone");
            const wrapper = zone.children[index];
            if (wrapper) wrapper.classList.add("blocking");
            setTimeout(callback, 400);
            break;
        }

        case "ability": {
            // Usar la habilidad especial del monstruo
            const abilityFn = monster.ability || getAbilityForMonster(monster.name);
            if (abilityFn && !activeEffects.novaIgnoresAbilities) {
                triggerMonsterAbilityAnim(monster.name);
                abilityFn(player, monster);
                updatePlayerStats();
            }
            setTimeout(callback, 600);
            break;
        }

        default:
            callback();
    }
}

// Aplicar daño del monstruo al jugador con todos los checks
function applyMonsterDamageToPlayer(damage) {
    // Escudo Arcano
    if (activeEffects.shieldArcane) {
        damage = 0;
        activeEffects.shieldArcane = false;
        spawnFloatingNumber(0, "block", "playerAvatar");
        updateStats(`¡Escudo Arcano absorbió el ataque!`);
        return;
    }

    // Reduccion de daño activa
    if (activeEffects.playerDamageReduction < 1) {
        damage = Math.floor(damage * activeEffects.playerDamageReduction);
    }

    // Reduccion del Guerrero
    if (player.damageReductionActive) {
        damage = Math.floor(damage * 0.5);
        player.damageReductionActive = false;
    }

    // Esquive
    const dodged = activeEffects.playerGuaranteedDodge || player.dodge();
    activeEffects.playerGuaranteedDodge = false;

    if (dodged) {
        avatarAnim("playerAvatar", "avatar-dodge", 450);
        spawnFloatingNumber(0, "dodge", "playerAvatar");
        updateStats(`${player.name} esquivó el ataque.`);
        return;
    }

    player.hp -= damage;
    spawnFloatingNumber(damage, "damage", "playerAvatar");
    avatarAnim("playerAvatar", "avatar-damage", 400);
    updateStats(`El ${monster.name} atacó causando ${damage} de daño.`);

    if (player.hp <= 0) endGame(false);
}

// Animar carta del monstruo yendo al descarte
function discardMonsterCard(index, callback) {
    const zone = document.getElementById("monsterCardZone");
    const wrapper = zone.children[index];
    if (!wrapper) { callback(); return; }

    // Calcular direccion hacia algun punto fuera de la pantalla
    const rect = wrapper.getBoundingClientRect();
    wrapper.style.setProperty("--mdx", `${(Math.random() * 40 - 20)}px`);
    wrapper.style.setProperty("--mdy", `-${rect.top + 200}px`)
    wrapper.classList.add("discarding-monster");

    setTimeout(() => {
        monsterDiscardPile.push(monsterHand[index]);
        callback();
    }, 420);
}

// Limpiar la zona de cartas del monstruo
function clearMonsterCardZone() {
    const zone = document.getElementById("monsterCardZone");
    zone.innerHTML = "";
    zone.classList.remove("has-cards");
    zone.innerHTML = `<span id="monsterCardZonePlaceholder">...</span>`;
    monsterHand = [];
}
// Iniciar musica de fondo
function initBgMusic() {
    const music = document.getElementById("bgMusic");
    if (!music) return;
    music.volume = 0.4; // Volumen inicial bajo para que no tape los efectos
    music.play().catch(() => {
        // El navegador bloquea autoplay sin interaccion del usuario
        // La iniciamos en el primer click
        document.addEventListener("click", () => {
            music.play();
        }, { once: true }); // once: true para que solo se ejecute una vez
    });
}