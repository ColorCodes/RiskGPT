const rows = 5;
const cols = 6;
const players = [
  { id: 0, name: "You", color: "var(--player-0)", gold: 12, artifacts: [], isHuman: true, attack: 0, defense: 0, reroll: false, mercenary: false, mercenaryUsed: false, tempAttackLoss: 0 },
  { id: 1, name: "Ember Clan (AI)", color: "var(--player-1)", gold: 10, artifacts: [], isHuman: false, attack: 0, defense: 0, reroll: false, mercenary: false, mercenaryUsed: false, tempAttackLoss: 0 },
  { id: 2, name: "Solar Pact (AI)", color: "var(--player-2)", gold: 10, artifacts: [], isHuman: false, attack: 0, defense: 0, reroll: false, mercenary: false, mercenaryUsed: false, tempAttackLoss: 0 },
  { id: 3, name: "Violet Syndicate (AI)", color: "var(--player-3)", gold: 10, artifacts: [], isHuman: false, attack: 0, defense: 0, reroll: false, mercenary: false, mercenaryUsed: false, tempAttackLoss: 0 },
];

const traitCatalog = [
  { id: "fort", label: "Fortified Ridge", icon: "🛡️", defense: 1, attack: 0, income: 0, penalty: 0 },
  { id: "shrine", label: "Battle Shrine", icon: "⚔️", defense: 0, attack: 1, income: 0, penalty: 0 },
  { id: "ruin", label: "Haunted Ruin", icon: "💀", defense: 0, attack: 0, income: 0, penalty: -1 },
  { id: "mine", label: "Gold Mine", icon: "⛏️", defense: 0, attack: 0, income: 2, penalty: 0 },
];

const artifactCatalog = [
  { id: "warDrum", name: "War Drum", cost: 8, description: "+1 attack on all rolls.", apply: (p) => p.attack++ },
  { id: "shieldSigil", name: "Shield Sigil", cost: 8, description: "+1 defense while defending.", apply: (p) => p.defense++ },
  { id: "luckyCharm", name: "Lucky Charm", cost: 10, description: "Reroll once per attack and take the better result.", apply: (p) => (p.reroll = true) },
  { id: "mercenary", name: "Mercenary Contract", cost: 9, description: "+2 on the first attack roll each turn.", apply: (p) => (p.mercenary = true) },
];

let tiles = [];
let selectedTile = null;
let currentPlayerIndex = 0;
let gameOver = false;

const boardEl = document.getElementById("board");
const tileTemplate = document.getElementById("tileTemplate");
const playerPanelEl = document.getElementById("playerPanel");
const shopItemsEl = document.getElementById("shopItems");
const logEl = document.getElementById("log");
const turnStatusEl = document.getElementById("turnStatus");

function createBoard() {
  tiles = [];
  const tileCount = rows * cols;
  const shuffledTraits = new Array(tileCount).fill(null).map(() => sampleTrait());

  for (let i = 0; i < tileCount; i++) {
    const owner = i % players.length;
    const trait = shuffledTraits[i];
    tiles.push({
      id: i,
      row: Math.floor(i / cols),
      col: i % cols,
      owner,
      trait,
    });
  }
}

function sampleTrait() {
  const roll = Math.random();
  if (roll < 0.25) return traitCatalog[0];
  if (roll < 0.5) return traitCatalog[1];
  if (roll < 0.7) return traitCatalog[2];
  if (roll < 0.9) return traitCatalog[3];
  return null;
}

function renderBoard() {
  boardEl.innerHTML = "";
  tiles.forEach((tile) => {
    const node = tileTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = tile.id;
    node.style.background = tile.owner !== null ? `linear-gradient(145deg, rgba(255,255,255,0.08), transparent), ${players[tile.owner].color}` : "#222";

    const label = node.querySelector(".tile-label");
    label.textContent = `${players[tile.owner].name.split(" ")[0]} (${tile.row + 1},${tile.col + 1})`;

    const traitIcon = node.querySelector(".trait-icon");
    if (tile.trait) {
      traitIcon.textContent = tile.trait.icon;
      traitIcon.title = tile.trait.label;
      traitIcon.classList.add(tile.trait.id);
    } else {
      traitIcon.textContent = "";
      traitIcon.style.background = "transparent";
      traitIcon.style.border = "none";
    }

    if (selectedTile && selectedTile.id === tile.id) node.classList.add("selected");
    if (selectedTile && selectedTile.owner === currentPlayer().id && isNeighbor(selectedTile, tile) && tile.owner !== selectedTile.owner) {
      node.classList.add("enemy-target");
    }

    node.addEventListener("click", () => handleTileClick(tile));
    boardEl.appendChild(node);
  });
}

function renderPlayers() {
  playerPanelEl.innerHTML = "";
  players.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = `player-row ${idx === currentPlayerIndex ? "active" : ""}`;
    const dot = document.createElement("div");
    dot.className = "player-dot";
    dot.style.background = p.color;

    const info = document.createElement("div");
    const owned = tiles.filter((t) => t.owner === p.id).length;
    info.innerHTML = `<strong>${p.name}</strong><div class="stats">Gold: ${p.gold} • Tiles: ${owned} • Artifacts: ${p.artifacts.length}</div>`;

    const buttons = document.createElement("div");
    buttons.className = "button-row";
    if (p.isHuman) {
      const endTurnBtn = document.createElement("button");
      endTurnBtn.textContent = "End Turn";
      endTurnBtn.addEventListener("click", endTurn);
      buttons.appendChild(endTurnBtn);
    } else {
      const badge = document.createElement("button");
      badge.textContent = "AI";
      badge.classList.add("secondary");
      badge.disabled = true;
      buttons.appendChild(badge);
    }

    row.append(dot, info, buttons);
    playerPanelEl.appendChild(row);
  });
}

function renderShop() {
  shopItemsEl.innerHTML = "";
  artifactCatalog.forEach((item) => {
    const card = document.createElement("div");
    card.className = "shop-item";
    card.innerHTML = `<h4>${item.name}</h4><p>${item.description}</p><div class="cost">${item.cost} gold</div>`;
    const buyBtn = document.createElement("button");
    buyBtn.textContent = "Buy";
    buyBtn.disabled = !currentPlayer().isHuman || currentPlayer().gold < item.cost;
    buyBtn.addEventListener("click", () => buyArtifact(item));
    card.appendChild(buyBtn);
    shopItemsEl.appendChild(card);
  });
}

function buyArtifact(item) {
  const player = currentPlayer();
  if (player.gold < item.cost) return;
  player.gold -= item.cost;
  player.artifacts.push(item.id);
  item.apply(player);
  log(`${player.name} bought ${item.name}.`);
  renderPlayers();
  renderShop();
}

function log(message) {
  const entry = document.createElement("div");
  entry.textContent = message;
  logEl.prepend(entry);
}

function currentPlayer() {
  return players[currentPlayerIndex];
}

function handleTileClick(tile) {
  if (gameOver) return;
  const player = currentPlayer();
  if (!player.isHuman) return;

  if (!selectedTile) {
    if (tile.owner === player.id) {
      selectedTile = tile;
      renderBoard();
    }
    return;
  }

  if (tile.id === selectedTile.id) {
    selectedTile = null;
    renderBoard();
    return;
  }

  if (tile.owner === player.id) {
    selectedTile = tile;
    renderBoard();
    return;
  }

  if (tile.owner !== player.id && isNeighbor(selectedTile, tile)) {
    attack(selectedTile, tile);
  }
}

function isNeighbor(a, b) {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function rollWithReroll(player) {
  const first = rollDie();
  if (!player.reroll) return first;
  const second = rollDie();
  return Math.max(first, second);
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function attack(fromTile, toTile) {
  const attacker = players[fromTile.owner];
  const defender = players[toTile.owner];

  let attackRoll = rollWithReroll(attacker) + attacker.attack;
  let defenseRoll = rollWithReroll(defender) + defender.defense;

  if (attacker.mercenary && !attacker.mercenaryUsed) {
    attackRoll += 2;
    attacker.mercenaryUsed = true;
  }

  if (fromTile.trait?.attack) attackRoll += fromTile.trait.attack;
  if (fromTile.trait?.penalty) attackRoll += fromTile.trait.penalty;
  if (toTile.trait?.defense) defenseRoll += toTile.trait.defense;

  const attackerDesc = `${attacker.name} rolled ${attackRoll}`;
  const defenderDesc = `${defender.name} rolled ${defenseRoll}`;

  if (attackRoll >= defenseRoll) {
    toTile.owner = attacker.id;
    log(`${attackerDesc} vs ${defenderDesc}. ${attacker.name} conquered (${toTile.row + 1},${toTile.col + 1}).`);
    randomConquestEvent(attacker, toTile);
  } else {
    log(`${attackerDesc} vs ${defenderDesc}. ${defender.name} held the line.`);
    randomLossEvent(attacker);
  }

  selectedTile = null;
  checkWin();
  renderBoard();
  renderPlayers();
}

function randomConquestEvent(player, tile) {
  const roll = Math.random();
  if (roll < 0.35) {
    player.gold += 4;
    log(`Loot windfall! ${player.name} steals 4 gold.`);
  } else if (roll < 0.5 && tile.trait?.id === "mine") {
    player.gold += 6;
    log(`${player.name} taps the mine for 6 bonus gold!`);
  } else if (roll < 0.65) {
    applyRandomArtifact(player, true);
  }
}

function randomLossEvent(player) {
  const roll = Math.random();
  if (roll < 0.3) {
    player.gold = Math.max(0, player.gold - 3);
    log(`${player.name} drops supplies and loses 3 gold.`);
  } else if (roll < 0.5) {
    log(`${player.name} suffers shaken morale (-1 attack this turn).`);
    player.attack -= 1;
    player.tempAttackLoss += 1;
    renderPlayers();
  }
}

function applyRandomArtifact(player, free = false) {
  const available = artifactCatalog.filter((a) => !player.artifacts.includes(a.id));
  if (!available.length) return;
  const artifact = available[Math.floor(Math.random() * available.length)];
  player.artifacts.push(artifact.id);
  artifact.apply(player);
  if (!free) player.gold -= artifact.cost;
  log(`${player.name} discovers ${artifact.name}!`);
}

function grantIncome(player) {
  const ownedTiles = tiles.filter((t) => t.owner === player.id);
  const incomeFromTiles = ownedTiles.reduce((sum, t) => sum + 1 + (t.trait?.income || 0), 0);
  player.gold += 5 + incomeFromTiles;
}

function resetTurnBuffs(player) {
  player.mercenaryUsed = false;
  if (player.tempAttackLoss > 0) {
    player.attack += player.tempAttackLoss;
    player.tempAttackLoss = 0;
  }
}

function endTurn() {
  if (gameOver) return;
  const player = currentPlayer();
  resetTurnBuffs(player);
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  startTurn();
}

function startTurn() {
  const player = currentPlayer();
  grantIncome(player);
  renderPlayers();
  renderShop();
  renderBoard();
  updateStatus();
  if (player.isHuman) {
    log(`Your turn. Collect income and strike!`);
  } else {
    setTimeout(() => aiTurn(player), 600);
  }
}

function updateStatus() {
  const player = currentPlayer();
  turnStatusEl.textContent = `${player.name}'s turn — Gold: ${player.gold}`;
}

function aiTurn(player) {
  if (gameOver) return;
  const owned = tiles.filter((t) => t.owner === player.id);
  const options = [];
  owned.forEach((tile) => {
    const neighbors = tiles.filter((t) => isNeighbor(t, tile) && t.owner !== player.id);
    neighbors.forEach((n) => options.push({ from: tile, to: n }));
  });

  if (player.gold >= 9 && Math.random() > 0.4) {
    const affordable = artifactCatalog.filter((a) => player.gold >= a.cost && !player.artifacts.includes(a.id));
    if (affordable.length) {
      const pick = affordable[Math.floor(Math.random() * affordable.length)];
      player.gold -= pick.cost;
      player.artifacts.push(pick.id);
      pick.apply(player);
      log(`${player.name} buys ${pick.name}.`);
    }
  }

  if (options.length) {
    options.sort((a, b) => (a.to.trait?.defense || 0) - (b.to.trait?.defense || 0));
    const choice = options[0];
    attack(choice.from, choice.to);
  }

  setTimeout(() => endTurn(), 400);
}

function checkWin() {
  const owners = new Set(tiles.map((t) => t.owner));
  if (owners.size === 1) {
    gameOver = true;
    const winner = players[tiles[0].owner];
    turnStatusEl.textContent = `${winner.name} controls the world!`;
    log(`${winner.name} wins by domination.`);
  }
}

function setup() {
  createBoard();
  renderBoard();
  renderPlayers();
  renderShop();
  log("Frontier Odds initialized. Strike first and push your luck!");
  startTurn();
}

setup();
