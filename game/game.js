const STORAGE_KEY = "farmCourseGameStateV1";

const CONFIG = {
  width: 8,
  height: 6,
  goalMoney: 120,
  startMoney: 20,
  startSeeds: 3,
  startWater: 3,
  maxWater: 5,
  seedPrice: 5,
  cropPrice: 9,
  growTimeMs: 25000
};

const tileNames = {
  grass: "",
  path: "Тропа",
  shop: "Магазин",
  sell: "Рынок",
  well: "Колодец",
  home: "Дом",
  "plot-empty": "Грядка",
  "plot-tilled": "Обработано",
  "plot-planted": "Посажено",
  "plot-watered": "Рост",
  "plot-grown": "Урожай"
};

const boardElement = document.getElementById("board");
const resetButton = document.getElementById("reset-game");
const interactButton = document.getElementById("interact-button");
const goalMoneyElement = document.getElementById("goal-money");

const ui = {
  money: document.getElementById("money-value"),
  seeds: document.getElementById("seed-value"),
  water: document.getElementById("water-value"),
  harvest: document.getElementById("harvest-value"),
  progressLabel: document.getElementById("progress-label"),
  progressFill: document.getElementById("progress-fill"),
  actionTitle: document.getElementById("action-title"),
  actionDescription: document.getElementById("action-description"),
  eventLog: document.getElementById("event-log")
};

function hasRequiredDom() {
  return Boolean(
    boardElement &&
    resetButton &&
    interactButton &&
    goalMoneyElement &&
    ui.money &&
    ui.seeds &&
    ui.water &&
    ui.harvest &&
    ui.progressLabel &&
    ui.progressFill &&
    ui.actionTitle &&
    ui.actionDescription &&
    ui.eventLog
  );
}

function storageAvailable() {
  try {
    const probeKey = "__farm_game_probe__";
    localStorage.setItem(probeKey, "1");
    localStorage.removeItem(probeKey);
    return true;
  } catch (error) {
    return false;
  }
}

const canUseStorage = storageAvailable();

goalMoneyElement.textContent = String(CONFIG.goalMoney);

function createBaseTiles() {
  const tiles = [];

  const specialTiles = {
    "0,0": { kind: "home", label: "Дом" },
    "6,1": { kind: "shop", label: "Семена" },
    "6,3": { kind: "well", label: "Вода" },
    "6,4": { kind: "sell", label: "Рынок" }
  };

  const plotCells = new Set([
    "1,1", "2,1", "3,1", "4,1",
    "1,2", "2,2", "3,2", "4,2",
    "1,3", "2,3", "3,3", "4,3"
  ]);

  const pathCells = new Set([
    "0,1", "0,2", "0,3", "0,4",
    "1,4", "2,4", "3,4", "4,4", "5,4", "6,4",
    "5,1", "5,2", "5,3"
  ]);

  for (let y = 0; y < CONFIG.height; y += 1) {
    for (let x = 0; x < CONFIG.width; x += 1) {
      const key = `${x},${y}`;
      if (plotCells.has(key)) {
        tiles.push({
          x,
          y,
          id: key,
          kind: "plot-empty",
          label: "Грядка",
          plantedAt: null
        });
      } else if (specialTiles[key]) {
        tiles.push({
          x,
          y,
          id: key,
          plantedAt: null,
          ...specialTiles[key]
        });
      } else if (pathCells.has(key)) {
        tiles.push({
          x,
          y,
          id: key,
          kind: "path",
          label: ""
        });
      } else {
        tiles.push({
          x,
          y,
          id: key,
          kind: "grass",
          label: ""
        });
      }
    }
  }

  return tiles;
}

function createDefaultState() {
  return {
    player: { x: 0, y: 2 },
    money: CONFIG.startMoney,
    seeds: CONFIG.startSeeds,
    water: CONFIG.startWater,
    harvest: 0,
    plots: createBaseTiles()
      .filter((tile) => tile.kind.startsWith("plot"))
      .map((tile) => ({ id: tile.id, kind: tile.kind, plantedAt: tile.plantedAt })),
    events: [
      "Добро пожаловать на ферму. Начните с обработки грядки.",
      "Купите семена в магазине, если запас закончится.",
      "Полейте посаженную грядку, чтобы запустить рост растения."
    ],
    won: false
  };
}

function loadState() {
  if (!canUseStorage) {
    return createDefaultState();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }

    const parsed = JSON.parse(raw);
    return {
      ...createDefaultState(),
      ...parsed,
      player: parsed.player || { x: 0, y: 2 },
      plots: Array.isArray(parsed.plots) ? parsed.plots : createDefaultState().plots,
      events: Array.isArray(parsed.events) ? parsed.events : []
    };
  } catch (error) {
    return createDefaultState();
  }
}

function saveState() {
  if (!canUseStorage) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Если браузер блокирует storage, игра продолжает работать без сохранения.
  }
}

const state = loadState();

function logEvent(message) {
  state.events.unshift(message);
  state.events = state.events.slice(0, 10);
}

function getBoardTiles() {
  const base = createBaseTiles();
  const plotMap = new Map(state.plots.map((plot) => [plot.id, plot]));

  return base.map((tile) => {
    if (!tile.kind.startsWith("plot")) {
      return tile;
    }

    const plot = plotMap.get(tile.id);
    return {
      ...tile,
      kind: plot.kind,
      plantedAt: plot.plantedAt
    };
  });
}

function getTileAt(x, y) {
  return getBoardTiles().find((tile) => tile.x === x && tile.y === y);
}

function getPlotById(id) {
  return state.plots.find((plot) => plot.id === id);
}

function updateGrowth() {
  const now = Date.now();

  state.plots.forEach((plot) => {
    if (plot.kind === "plot-watered" && plot.plantedAt) {
      if (now - plot.plantedAt >= CONFIG.growTimeMs) {
        plot.kind = "plot-grown";
        plot.plantedAt = null;
        logEvent(`Грядка ${plot.id} готова к сбору.`);
      }
    }
  });
}

function getActionCopy(tile) {
  if (!tile) {
    return {
      title: "Вне поля",
      description: "Переместите персонажа обратно на ферму."
    };
  }

  switch (tile.kind) {
    case "plot-empty":
      return {
        title: "Обработать землю",
        description: "Нажмите действие, чтобы подготовить грядку к посадке."
      };
    case "plot-tilled":
      return {
        title: state.seeds > 0 ? "Посадить семя" : "Нет семян",
        description: state.seeds > 0
          ? "Нажмите действие, чтобы посадить 1 семя."
          : "Сначала купите семена в магазине."
      };
    case "plot-planted":
      return {
        title: state.water > 0 ? "Полить растение" : "Нет воды",
        description: state.water > 0
          ? "Полив запускает рост растения."
          : "Сходите к колодцу и пополните запас воды."
      };
    case "plot-watered":
      return {
        title: "Растение растет",
        description: "Подождите немного. Таймер роста показан на клетке."
      };
    case "plot-grown":
      return {
        title: "Собрать урожай",
        description: "Нажмите действие, чтобы получить урожай и вернуть грядку в рабочее состояние."
      };
    case "shop":
      return {
        title: "Купить семя",
        description: "Одно семя стоит 5 монет."
      };
    case "sell":
      return {
        title: "Продать урожай",
        description: "Рынок продает весь собранный урожай по 9 монет за штуку."
      };
    case "well":
      return {
        title: "Пополнить воду",
        description: "Колодец наполняет запас воды до максимума."
      };
    case "home":
      return {
        title: "Дом фермера",
        description: "Здесь можно только перевести дух. Основная работа идет на поле."
      };
    default:
      return {
        title: "Свободная клетка",
        description: "Перемещайтесь по тропе и ищите полезные точки."
      };
  }
}

function movePlayer(dx, dy) {
  const nextX = state.player.x + dx;
  const nextY = state.player.y + dy;

  if (nextX < 0 || nextX >= CONFIG.width || nextY < 0 || nextY >= CONFIG.height) {
    logEvent("Дальше граница участка.");
    render();
    return;
  }

  state.player.x = nextX;
  state.player.y = nextY;
  saveState();
  render();
}

function checkWin() {
  if (!state.won && state.money >= CONFIG.goalMoney) {
    state.won = true;
    logEvent(`Цель достигнута: вы заработали ${state.money} монет и развили ферму.`);
  }
}

function interact() {
  updateGrowth();
  const tile = getTileAt(state.player.x, state.player.y);

  if (!tile) {
    logEvent("Здесь нет доступного действия.");
    render();
    return;
  }

  switch (tile.kind) {
    case "plot-empty": {
      const plot = getPlotById(tile.id);
      plot.kind = "plot-tilled";
      logEvent(`Грядка ${tile.id} обработана.`);
      break;
    }
    case "plot-tilled": {
      if (state.seeds <= 0) {
        logEvent("Семена закончились. Сходите в магазин.");
        break;
      }
      const plot = getPlotById(tile.id);
      plot.kind = "plot-planted";
      plot.plantedAt = null;
      state.seeds -= 1;
      logEvent(`На грядке ${tile.id} посажено семя.`);
      break;
    }
    case "plot-planted": {
      if (state.water <= 0) {
        logEvent("Воды нет. Наберите ее у колодца.");
        break;
      }
      const plot = getPlotById(tile.id);
      plot.kind = "plot-watered";
      plot.plantedAt = Date.now();
      state.water -= 1;
      logEvent(`Грядка ${tile.id} полита. Рост запущен.`);
      break;
    }
    case "plot-watered":
      logEvent("Растению нужно время, чтобы вырасти.");
      break;
    case "plot-grown": {
      const plot = getPlotById(tile.id);
      plot.kind = "plot-tilled";
      plot.plantedAt = null;
      state.harvest += 1;
      logEvent(`С грядки ${tile.id} собран урожай.`);
      break;
    }
    case "shop":
      if (state.money < CONFIG.seedPrice) {
        logEvent("Недостаточно монет для покупки семян.");
        break;
      }
      state.money -= CONFIG.seedPrice;
      state.seeds += 1;
      logEvent("Куплено 1 семя.");
      break;
    case "sell":
      if (state.harvest <= 0) {
        logEvent("Продавать пока нечего.");
        break;
      }
      state.money += state.harvest * CONFIG.cropPrice;
      logEvent(`Продан урожай: ${state.harvest} шт. за ${state.harvest * CONFIG.cropPrice} монет.`);
      state.harvest = 0;
      break;
    case "well":
      if (state.water === CONFIG.maxWater) {
        logEvent("Вода уже заполнена полностью.");
        break;
      }
      state.water = CONFIG.maxWater;
      logEvent("Запас воды пополнен.");
      break;
    case "home":
      logEvent("Дом уютный, но ферма ждет работы.");
      break;
    default:
      logEvent("Здесь нет полезного действия.");
  }

  checkWin();
  saveState();
  render();
}

function createTileElement(tile) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "tile";
  element.dataset.kind = tile.kind;
  element.dataset.x = String(tile.x);
  element.dataset.y = String(tile.y);

  if (state.player.x === tile.x && state.player.y === tile.y) {
    element.classList.add("is-player");
  }

  if (state.won) {
    element.classList.add("is-win");
  }

  if (tile.label || tileNames[tile.kind]) {
    const label = document.createElement("span");
    label.className = "tile-label";
    label.textContent = tile.label || tileNames[tile.kind];
    element.appendChild(label);
  }

  if (tile.kind === "plot-watered" && tile.plantedAt) {
    const timer = document.createElement("span");
    timer.className = "tile-timer";
    const remainMs = Math.max(0, CONFIG.growTimeMs - (Date.now() - tile.plantedAt));
    timer.textContent = `${Math.ceil(remainMs / 1000)}с`;
    element.appendChild(timer);
  }

  element.addEventListener("click", () => {
    const dx = tile.x - state.player.x;
    const dy = tile.y - state.player.y;

    if (dx === 0 && dy === 0) {
      interact();
      return;
    }

    if (Math.abs(dx) + Math.abs(dy) === 1) {
      movePlayer(dx, dy);
      return;
    }

    logEvent("Можно кликать только по соседним клеткам или по текущей позиции.");
    render();
  });

  return element;
}

function renderBoard() {
  const tiles = getBoardTiles();
  boardElement.innerHTML = "";
  tiles.forEach((tile) => {
    boardElement.appendChild(createTileElement(tile));
  });
}

function renderStats() {
  ui.money.textContent = String(state.money);
  ui.seeds.textContent = String(state.seeds);
  ui.water.textContent = `${state.water} / ${CONFIG.maxWater}`;
  ui.harvest.textContent = String(state.harvest);

  const progress = Math.min(100, Math.round((state.money / CONFIG.goalMoney) * 100));
  ui.progressLabel.textContent = `${progress}%`;
  ui.progressFill.style.width = `${progress}%`;
}

function renderAction() {
  const tile = getTileAt(state.player.x, state.player.y);
  const copy = getActionCopy(tile);
  ui.actionTitle.textContent = state.won ? "Цель достигнута" : copy.title;
  ui.actionDescription.textContent = state.won
    ? "Вы уже собрали устойчивое хозяйство. Можно продолжать выращивать урожай или сбросить прогресс и начать заново."
    : copy.description;
}

function renderLog() {
  ui.eventLog.innerHTML = "";
  state.events.forEach((entry) => {
    const paragraph = document.createElement("p");
    paragraph.className = "event-item";
    paragraph.innerHTML = `<strong>Событие:</strong> ${entry}`;
    ui.eventLog.appendChild(paragraph);
  });
}

function render() {
  updateGrowth();
  renderBoard();
  renderStats();
  renderAction();
  renderLog();
}

function resetGame() {
  const confirmed = window.confirm("Сбросить ферму и начать заново?");
  if (!confirmed) {
    return;
  }
  const next = createDefaultState();
  state.player = next.player;
  state.money = next.money;
  state.seeds = next.seeds;
  state.water = next.water;
  state.harvest = next.harvest;
  state.plots = next.plots;
  state.events = next.events;
  state.won = false;
  saveState();
  render();
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();
  if (["arrowup", "w", "ц"].includes(key)) {
    event.preventDefault();
    movePlayer(0, -1);
  } else if (["arrowdown", "s", "ы"].includes(key)) {
    event.preventDefault();
    movePlayer(0, 1);
  } else if (["arrowleft", "a", "ф"].includes(key)) {
    event.preventDefault();
    movePlayer(-1, 0);
  } else if (["arrowright", "d", "в"].includes(key)) {
    event.preventDefault();
    movePlayer(1, 0);
  } else if (["e", "у", " ", "enter"].includes(key)) {
    event.preventDefault();
    interact();
  }
}

if (!hasRequiredDom()) {
  document.body.innerHTML = `
    <main style="max-width:760px;margin:48px auto;padding:24px;color:#eff8ff;font-family:Bahnschrift,'Segoe UI',sans-serif;">
      <h1>Игра временно недоступна</h1>
      <p>Страница игры загрузилась не полностью, поэтому интерфейс не удалось инициализировать.</p>
      <p><a href="../index.html" style="color:#72d2ff;">Вернуться на главную сайта</a></p>
      <p><a href="../index.html" style="color:#72d2ff;">Перейти на главную курса</a></p>
    </main>
  `;
} else {
  document.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.move;
      if (direction === "up") movePlayer(0, -1);
      if (direction === "down") movePlayer(0, 1);
      if (direction === "left") movePlayer(-1, 0);
      if (direction === "right") movePlayer(1, 0);
    });
  });

  interactButton.addEventListener("click", interact);
  resetButton.addEventListener("click", resetGame);
  window.addEventListener("keydown", handleKeydown);

  setInterval(() => {
    const before = JSON.stringify(state.plots);
    updateGrowth();
    const after = JSON.stringify(state.plots);
    if (before !== after) {
      saveState();
      render();
    } else {
      renderBoard();
      renderAction();
    }
  }, 1000);

  render();
}
