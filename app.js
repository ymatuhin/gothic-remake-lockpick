const MIN_PLATES = 4;
const MAX_PLATES = 9;
const POSITIONS = 7;
const TARGET_POSITION = 4;
const DEFAULT_PLATES = 5;

const plateCountSelect = document.querySelector("#plate-count");
const lockBody = document.querySelector("#lock-body");
const solveButton = document.querySelector("#solve-button");
const messages = document.querySelector("#messages");
const result = document.querySelector("#result");

let plateCount = DEFAULT_PLATES;
let positions = Array.from({ length: DEFAULT_PLATES }, () => TARGET_POSITION);
let links = Array.from({ length: DEFAULT_PLATES }, () => ({ same: "", opposite: "" }));

function init() {
  const urlConfig = readUrlConfig();
  if (urlConfig) {
    plateCount = urlConfig.plateCount;
    positions = urlConfig.positions;
    links = urlConfig.links;
  }

  for (let count = MIN_PLATES; count <= MAX_PLATES; count += 1) {
    const option = document.createElement("option");
    option.value = String(count);
    option.textContent = String(count);
    plateCountSelect.append(option);
  }

  plateCountSelect.value = String(plateCount);
  plateCountSelect.addEventListener("change", handlePlateCountChange);
  solveButton.addEventListener("click", solve);
  renderLock();
  writeUrlConfig();
}

function handlePlateCountChange(event) {
  const nextCount = Number(event.target.value);
  const nextPositions = Array.from({ length: nextCount }, (_, index) => positions[index] ?? TARGET_POSITION);
  const nextLinks = Array.from({ length: nextCount }, (_, index) => {
    const existing = links[index] ?? { same: "", opposite: "" };
    return {
      same: filterLinkText(existing.same, nextCount),
      opposite: filterLinkText(existing.opposite, nextCount),
    };
  });

  plateCount = nextCount;
  positions = nextPositions;
  links = nextLinks;
  clearOutput();
  renderLock();
  writeUrlConfig();
}

function readUrlConfig() {
  const params = new URLSearchParams(window.location.search);
  const nextPlateCount = Number(params.get("plates"));
  if (!Number.isInteger(nextPlateCount) || nextPlateCount < MIN_PLATES || nextPlateCount > MAX_PLATES) {
    return null;
  }

  const rawPositions = params.get("positions") ?? "";
  const nextPositions = Array.from({ length: nextPlateCount }, (_, index) => {
    const position = Number(rawPositions[index]);
    return Number.isInteger(position) && position >= 1 && position <= POSITIONS ? position : TARGET_POSITION;
  });

  const nextLinks = Array.from({ length: nextPlateCount }, (_, index) => ({
    same: filterLinkText(params.get(`same${index + 1}`) ?? "", nextPlateCount),
    opposite: filterLinkText(params.get(`opposite${index + 1}`) ?? "", nextPlateCount),
  }));

  return {
    plateCount: nextPlateCount,
    positions: nextPositions,
    links: nextLinks,
  };
}

function writeUrlConfig() {
  const params = new URLSearchParams(window.location.search);
  params.delete("config");
  params.set("plates", String(plateCount));
  params.set("positions", positions.join(""));

  for (let plate = 1; plate <= MAX_PLATES; plate += 1) {
    params.delete(`same${plate}`);
    params.delete(`opposite${plate}`);
  }

  links.forEach((link, index) => {
    const same = filterLinkText(link.same, plateCount);
    const opposite = filterLinkText(link.opposite, plateCount);
    if (same) {
      params.set(`same${index + 1}`, same);
    }
    if (opposite) {
      params.set(`opposite${index + 1}`, opposite);
    }
  });

  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}

function filterLinkText(text, maxPlate) {
  return parseRawNumbers(text)
    .filter((value, index, list) => value >= 1 && value <= maxPlate && list.indexOf(value) === index)
    .join("");
}

function renderLock() {
  lockBody.innerHTML = "";

  for (let plate = plateCount; plate >= 1; plate -= 1) {
    const row = document.createElement("tr");
    const plateIndex = plate - 1;

    const header = document.createElement("th");
    header.scope = "row";
    header.className = "plate-number";
    header.textContent = String(plate);
    row.append(header);

    for (let position = 1; position <= POSITIONS; position += 1) {
      const cell = document.createElement("td");
      if (position === TARGET_POSITION) {
        cell.className = "center-cell";
      }

      const label = document.createElement("label");
      label.className = "position-radio";
      label.title = `Plate ${plate}, position ${position}`;

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `plate-${plate}-position`;
      radio.value = String(position);
      radio.checked = positions[plateIndex] === position;
      radio.setAttribute("aria-label", `Plate ${plate}, position ${position}`);
      radio.addEventListener("change", () => {
        positions[plateIndex] = position;
        clearOutput();
        writeUrlConfig();
      });

      const dot = document.createElement("span");
      label.append(radio, dot);
      cell.append(label);
      row.append(cell);
    }

    const rightHeader = document.createElement("th");
    rightHeader.scope = "row";
    rightHeader.className = "plate-number plate-number-right";
    rightHeader.textContent = String(plate);
    row.append(rightHeader);

    row.append(createLinkCell(plateIndex, "same", "Same"));
    row.append(createLinkCell(plateIndex, "opposite", "Opposite"));
    lockBody.append(row);
  }
}

function createLinkCell(plateIndex, field, labelText) {
  const cell = document.createElement("td");
  const input = document.createElement("input");
  input.className = "link-input";
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.value = links[plateIndex][field];
  input.placeholder = "24";
  input.setAttribute("aria-label", `Plate ${plateIndex + 1} ${labelText}`);
  input.dataset.plate = String(plateIndex + 1);
  input.dataset.field = field;
  input.addEventListener("input", () => {
    links[plateIndex][field] = input.value;
    input.classList.remove("invalid");
    clearOutput();
    writeUrlConfig();
  });
  cell.append(input);
  return cell;
}

function parseRawNumbers(text) {
  const compact = text.trim();
  if (!compact) {
    return [];
  }

  if (!/^[\d,\s]+$/.test(compact)) {
    return [Number.NaN];
  }

  if (/[, \t\n\r]/.test(compact)) {
    return compact
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(Number);
  }

  return compact.split("").map(Number);
}

function validateLinks() {
  const errors = [];
  const parsed = [];
  document.querySelectorAll(".link-input").forEach((input) => input.classList.remove("invalid"));

  links.forEach((link, index) => {
    const plate = index + 1;
    const same = parseRawNumbers(link.same);
    const opposite = parseRawNumbers(link.opposite);
    const sameSet = new Set();
    const oppositeSet = new Set();

    validateList(errors, same, sameSet, plate, "Same");
    validateList(errors, opposite, oppositeSet, plate, "Opposite");

    sameSet.forEach((value) => {
      if (oppositeSet.has(value)) {
        errors.push(`Plate ${plate}: plate ${value} is listed in both Same and Opposite.`);
        markInvalidInput(plate, "same");
        markInvalidInput(plate, "opposite");
      }
    });

    parsed[index] = {
      same: Array.from(sameSet),
      opposite: Array.from(oppositeSet),
    };
  });

  return { errors, parsed };
}

function validateList(errors, list, seen, plate, label) {
  list.forEach((value) => {
    const field = label.toLowerCase();
    if (!Number.isInteger(value)) {
      errors.push(`Plate ${plate}: ${label} contains unsupported characters.`);
      markInvalidInput(plate, field);
      return;
    }

    if (value < 1 || value > plateCount) {
      errors.push(`Plate ${plate}: plate ${value} does not exist.`);
      markInvalidInput(plate, field);
      return;
    }

    if (value === plate) {
      errors.push(`Plate ${plate}: do not list the moved plate in ${label}.`);
      markInvalidInput(plate, field);
      return;
    }

    if (seen.has(value)) {
      errors.push(`Plate ${plate}: plate ${value} is repeated in ${label}.`);
      markInvalidInput(plate, field);
      return;
    }

    seen.add(value);
  });
}

function markInvalidInput(plate, field) {
  const input = document.querySelector(`.link-input[data-plate="${plate}"][data-field="${field}"]`);
  if (input) {
    input.classList.add("invalid");
  }
}

function solve() {
  clearOutput();
  const { errors, parsed } = validateLinks();
  if (errors.length > 0) {
    showErrors(errors);
    return;
  }

  solveButton.disabled = true;
  solveButton.textContent = "Solving...";

  requestAnimationFrame(() => {
    const solution = findShortestSolution(positions, parsed);
    solveButton.disabled = false;
    solveButton.textContent = "Solve";
    showSolution(solution);
  });
}

function findShortestSolution(start, parsedLinks) {
  const targetKey = Array.from({ length: plateCount }, () => TARGET_POSITION).join("");
  const startKey = start.join("");
  if (startKey === targetKey) {
    return { status: "already-open", moves: [], states: [] };
  }

  const visited = new Set([startKey]);
  const parents = new Map([[startKey, null]]);
  const queue = [startKey];
  let head = 0;

  while (head < queue.length) {
    const currentKey = queue[head];
    const state = keyToState(currentKey);
    head += 1;

    for (let plateIndex = 0; plateIndex < plateCount; plateIndex += 1) {
      for (const direction of [-1, 1]) {
        const nextState = applyMove(state, parsedLinks, plateIndex, direction);
        if (!nextState) {
          continue;
        }

        const key = nextState.join("");
        if (visited.has(key)) {
          continue;
        }

        const move = { plate: plateIndex + 1, direction };
        visited.add(key);
        parents.set(key, { previous: currentKey, move });

        if (key === targetKey) {
          return reconstructSolution(parents, startKey, key);
        }

        queue.push(key);
      }
    }
  }

  return { status: "no-solution", moves: [], states: [] };
}

function keyToState(key) {
  return key.split("").map(Number);
}

function reconstructSolution(parents, startKey, targetKey) {
  const moves = [];
  const states = [];
  let currentKey = targetKey;

  while (currentKey !== startKey) {
    const entry = parents.get(currentKey);
    moves.push(entry.move);
    states.push(keyToState(currentKey));
    currentKey = entry.previous;
  }

  moves.reverse();
  states.reverse();
  return { status: "solved", moves, states };
}

function applyMove(state, parsedLinks, plateIndex, direction) {
  const deltas = Array.from({ length: plateCount }, () => 0);
  addDelta(deltas, plateIndex, direction);

  parsedLinks[plateIndex].same.forEach((plate) => addDelta(deltas, plate - 1, direction));
  parsedLinks[plateIndex].opposite.forEach((plate) => addDelta(deltas, plate - 1, direction * -1));

  const next = state.map((position, index) => {
    const physicalDirection = deltas[index];
    const positionDelta = physicalDirection * -1;
    return position + positionDelta;
  });

  if (next.some((position) => position < 1 || position > POSITIONS)) {
    return null;
  }

  return next;
}

function addDelta(deltas, plateIndex, direction) {
  deltas[plateIndex] += direction;
}

function showErrors(errors) {
  messages.className = "messages visible";
  messages.innerHTML = `<h2>Fix the lock scheme</h2><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`;
}

function showSolution(solution) {
  result.className = "result visible";

  if (solution.status === "already-open") {
    result.innerHTML = `<h2>Already open</h2><p class="status">All plates are already in position 4.</p>`;
    return;
  }

  if (solution.status === "no-solution") {
    result.innerHTML = `<h2>No solution found</h2><p class="status">Check the starting positions and linked plates.</p>`;
    return;
  }

  const compact = solution.moves.map(formatMove).join(" ");
  const rows = solution.moves.map((move, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${formatMove(move)}</td>
      <td>${solution.states[index].join(" ")}</td>
    </tr>
  `).join("");

  result.innerHTML = `
    <h2>Compact solution</h2>
    <p class="solution-line">${compact}</p>
    <table class="steps">
      <thead>
        <tr>
          <th>#</th>
          <th>Move</th>
          <th>Positions after move</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function formatMove(move) {
  return `${move.plate}${move.direction === -1 ? "←" : "→"}`;
}

function clearOutput() {
  messages.className = "messages";
  messages.innerHTML = "";
  result.className = "result";
  result.innerHTML = "";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

init();
