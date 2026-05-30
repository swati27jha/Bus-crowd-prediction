// app.js

// Mock BMTC Route Database
const ROUTES_DB = {
  activeRoutes: [
    {
      id: "R-500D",
      name: "Route 500D (Hebbal to Central Silk Board)",
      buses: ["KA-57-F-0145", "KA-57-F-1209"],
      stations: [
        { name: "Hebbal", loadRate: "low", currentCrowd: 15, boardRatio: 0.1, alightRatio: 0.0, isHighlight: false },
        { name: "Tin Factory", loadRate: "high", currentCrowd: 65, boardRatio: 0.8, alightRatio: 0.1, isHighlight: true, highlightText: "HEAVY LOAD" },
        { name: "Marathahalli", loadRate: "high", currentCrowd: 90, boardRatio: 0.9, alightRatio: 0.2, isHighlight: true, highlightText: "MAX SURGE" },
        { name: "Bellandur", loadRate: "med", currentCrowd: 45, boardRatio: 0.3, alightRatio: 0.6, isHighlight: true, highlightText: "ALIGHT HUB" },
        { name: "Agara", loadRate: "low", currentCrowd: 30, boardRatio: 0.2, alightRatio: 0.4, isHighlight: false },
        { name: "Central Silk Board", loadRate: "low", currentCrowd: 10, boardRatio: 0.0, alightRatio: 0.9, isHighlight: false }
      ]
    },
    {
      id: "R-335E",
      name: "Route 335E (Majestic to Kadugodi)",
      buses: ["KA-57-F-0888"],
      stations: [
        { name: "Majestic", loadRate: "low", currentCrowd: 10, boardRatio: 0.2, alightRatio: 0.0, isHighlight: false },
        { name: "Corporation", loadRate: "high", currentCrowd: 70, boardRatio: 0.7, alightRatio: 0.1, isHighlight: true, highlightText: "HEAVY LOAD" },
        { name: "Domlur", loadRate: "med", currentCrowd: 40, boardRatio: 0.3, alightRatio: 0.4, isHighlight: false },
        { name: "Kadugodi", loadRate: "low", currentCrowd: 12, boardRatio: 0.0, alightRatio: 0.9, isHighlight: false }
      ]
    },
    {
      id: "R-201",
      name: "Route 201 (Srinagar to Domlur)",
      buses: ["KA-57-F-0201", "KA-57-F-0202"],
      stations: [
        { name: "Srinagar", loadRate: "low", currentCrowd: 12, boardRatio: 0.1, alightRatio: 0.0, isHighlight: false },
        { name: "Banashankari", loadRate: "high", currentCrowd: 75, boardRatio: 0.8, alightRatio: 0.2, isHighlight: true, highlightText: "HEAVY LOAD" },
        { name: "Jayanagar", loadRate: "med", currentCrowd: 50, boardRatio: 0.4, alightRatio: 0.3, isHighlight: false },
        { name: "Dairy Circle", loadRate: "med", currentCrowd: 45, boardRatio: 0.3, alightRatio: 0.4, isHighlight: false },
        { name: "Koramangala", loadRate: "high", currentCrowd: 85, boardRatio: 0.7, alightRatio: 0.5, isHighlight: true, highlightText: "MAX SURGE" },
        { name: "Domlur", loadRate: "low", currentCrowd: 8, boardRatio: 0.0, alightRatio: 0.9, isHighlight: false }
      ]
    },
    {
      id: "R-G3",
      name: "Route G-3 (Majestic to HSR Layout)",
      buses: ["KA-57-F-0303", "KA-57-F-0304"],
      stations: [
        { name: "Majestic", loadRate: "low", currentCrowd: 15, boardRatio: 0.2, alightRatio: 0.0, isHighlight: false },
        { name: "Richmond Circle", loadRate: "med", currentCrowd: 38, boardRatio: 0.4, alightRatio: 0.2, isHighlight: false },
        { name: "Shanthi Nagar", loadRate: "high", currentCrowd: 70, boardRatio: 0.7, alightRatio: 0.3, isHighlight: true, highlightText: "HEAVY LOAD" },
        { name: "Hosur Road", loadRate: "med", currentCrowd: 45, boardRatio: 0.3, alightRatio: 0.5, isHighlight: false },
        { name: "HSR Layout", loadRate: "low", currentCrowd: 12, boardRatio: 0.0, alightRatio: 0.8, isHighlight: false }
      ]
    },
    {
      id: "R-360G",
      name: "Route 360G (Majestic to Electronic City)",
      buses: ["KA-57-F-3601", "KA-57-F-3602"],
      stations: [
        { name: "Majestic", loadRate: "low", currentCrowd: 18, boardRatio: 0.2, alightRatio: 0.0, isHighlight: false },
        { name: "Shanthi Nagar", loadRate: "high", currentCrowd: 65, boardRatio: 0.7, alightRatio: 0.2, isHighlight: true, highlightText: "HEAVY LOAD" },
        { name: "Dairy Circle", loadRate: "med", currentCrowd: 42, boardRatio: 0.3, alightRatio: 0.4, isHighlight: false },
        { name: "Silk Board", loadRate: "high", currentCrowd: 88, boardRatio: 0.9, alightRatio: 0.5, isHighlight: true, highlightText: "MAX SURGE" },
        { name: "Kudlu Gate", loadRate: "med", currentCrowd: 35, boardRatio: 0.2, alightRatio: 0.5, isHighlight: false },
        { name: "Electronic City", loadRate: "low", currentCrowd: 10, boardRatio: 0.0, alightRatio: 0.9, isHighlight: false }
      ]
    }
  ]
};

// Global App State
let state = {
  currentRoute: ROUTES_DB.activeRoutes[0],
  currentBusId: "KA-57-F-0145",
  busOccupancy: 24,
  maxCapacity: 40,
  autoSimulate: true,
  logs: [],
  selectedStationIndex: 2, // Default focus on Metro Junction
  latency: 12,
  fps: 30.2,
  passengerDots: [], // Track animations inside canvas
  totalIn: 38,
  totalOut: 14
};

// SVG icons for use in rendering
const ICONS = {
  board: '<span class="log-action-in">BOARDED</span>',
  alight: '<span class="log-action-out">ALIGHTED</span>'
};

// Canvas variables
let canvas, ctx;
let lastTime = 0;
let simulationTimer = null;

// Backend Connection variables
let backendOnline = false;
const BACKEND_URL = "http://127.0.0.1:5000";

async function checkMLBackend() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout
    
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === "online" && !backendOnline) {
        backendOnline = true;
        document.getElementById("status-label").innerText = `ML Backend (${data.model_type})`;
        document.getElementById("status-dot").style.backgroundColor = "#06b6d4"; // Cyan color
        document.getElementById("status-dot").style.boxShadow = "0 0 10px #06b6d4";
        addLogEntry("SYSTEM", `ML Backend Connected! Active Model: ${data.model_type}`);
        renderRouteMap();
      }
    }
  } catch (error) {
    if (backendOnline) {
      backendOnline = false;
      document.getElementById("status-label").innerText = "Sensors Syncing";
      document.getElementById("status-dot").style.backgroundColor = ""; // Reset to CSS default
      document.getElementById("status-dot").style.boxShadow = "";
      addLogEntry("SYSTEM", "ML Backend Disconnected. Reverted to local edge simulation.");
      renderRouteMap();
    }
  }
}

// Initialize System
document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("cameraCanvas");
  ctx = canvas.getContext("2d");
  
  // Set explicit canvas dimensions
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Setup DOM Event Listeners
  setupEventListeners();

  // Populate dynamic bus dropdown
  populateBusDropdown();

  // Populate Initial UI State
  updateBusDisplay();
  renderRouteMap();
  addLogEntry("SYSTEM", "Initialized Edge-Vision AI Sync Protocol V4. Nodes: Online.");
  addLogEntry("YOLO", "Model weights yolov8n-pose.onnx loaded. Inference ready.");
  
  // Generate historical initial logs
  simulateInitialLogs();

  // Start Canvas Animation Loop
  requestAnimationFrame(animationLoop);

  // Start Simulation Engine
  startSimulation();
  
  // Start Fleet Telemetry Simulator
  startFleetTelemetry();
  
  // Start Latency Fluctuation
  setInterval(() => {
    state.latency = Math.floor(10 + Math.random() * 8);
    document.getElementById("latency-val").innerText = state.latency;
    state.fps = (29.5 + Math.random() * 1.5).toFixed(1);
    document.getElementById("hud-fps-val").innerText = state.fps;
  }, 3000);

  // Start checking for Python ML Backend
  checkMLBackend();
  setInterval(checkMLBackend, 4000);
});

// Resize simulated camera screen canvas
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
}

// Populate all buses from active routes into dropdown grouped by route name
function populateBusDropdown() {
  const busSelector = document.getElementById("bus-number-select");
  if (!busSelector) return;
  busSelector.innerHTML = "";
  
  ROUTES_DB.activeRoutes.forEach(route => {
    const optGroup = document.createElement("optgroup");
    optGroup.label = route.name;
    
    route.buses.forEach((bus, index) => {
      const option = document.createElement("option");
      option.value = bus;
      option.textContent = `${bus} ${index === 0 ? '(Active)' : '(Standby)'}`;
      if (bus === state.currentBusId) {
        option.selected = true;
      }
      optGroup.appendChild(option);
    });
    
    busSelector.appendChild(optGroup);
  });
}

// Register DOM hooks
function setupEventListeners() {
  // Bus select dropdown change
  const busSelector = document.getElementById("bus-number-select");
  busSelector.addEventListener("change", (e) => {
    const selectedBus = e.target.value;
    state.currentBusId = selectedBus;
    document.getElementById("hud-bus-id").innerText = selectedBus;
    
    // Select matching route depending on bus number
    const matchedRoute = ROUTES_DB.activeRoutes.find(r => r.buses.includes(selectedBus));
    if (matchedRoute) {
      state.currentRoute = matchedRoute;
      
      // Center Google Map on first station of new route
      updateGoogleMapLocation(matchedRoute.stations[0].name);
      
      // Synchronize search text inputs with terminal stops of this route
      const fromInput = document.getElementById("from-station");
      const toInput = document.getElementById("to-station");
      if (fromInput && toInput) {
        fromInput.value = matchedRoute.stations[0].name;
        toInput.value = matchedRoute.stations[matchedRoute.stations.length - 1].name;
      }
    }
    
    // Simulate reset counts for variation based on bus IDs
    if (selectedBus === "KA-57-F-0145" || selectedBus === "KA-57-F-0201" || selectedBus === "KA-57-F-3601") {
      state.busOccupancy = 28;
    } else if (selectedBus === "KA-57-F-1209" || selectedBus === "KA-57-F-0202" || selectedBus === "KA-57-F-3602") {
      state.busOccupancy = 12;
    } else if (selectedBus === "KA-57-F-0888" || selectedBus === "KA-57-F-0303") {
      state.busOccupancy = 34;
    } else {
      state.busOccupancy = 8;
    }

    // Consistent trip counters
    state.totalIn = state.busOccupancy + Math.floor(5 + Math.random() * 15);
    state.totalOut = state.totalIn - state.busOccupancy;
    
    addLogEntry("SYSTEM", `Channel switched to camera feed on ${selectedBus}.`);
    updateBusDisplay();
    renderRouteMap();
    triggerManualLog(`Initalized live sensor array for bus ${selectedBus}.`);
  });

  // Manual trigger buttons
  document.getElementById("btn-manual-in").addEventListener("click", () => {
    triggerPassengerEvent("IN");
  });

  document.getElementById("btn-manual-out").addEventListener("click", () => {
    triggerPassengerEvent("OUT");
  });

  // Toggle Auto-simulation
  const autoSimCheckbox = document.getElementById("auto-sim-toggle");
  autoSimCheckbox.addEventListener("change", (e) => {
    state.autoSimulate = e.target.checked;
    document.getElementById("toggle-status-text").innerText = state.autoSimulate ? "Auto Simulation" : "Manual Override";
    addLogEntry("SYSTEM", `Inference auto-mode toggled to: ${state.autoSimulate ? 'AUTOMATIC' : 'MANUAL'}`);
  });

  // Search Route Analyzer button
  document.getElementById("btn-search-route").addEventListener("click", () => {
    const fromVal = document.getElementById("from-station").value.trim();
    const toVal = document.getElementById("to-station").value.trim();
    
    const normalizedFrom = fromVal.toLowerCase();
    const normalizedTo = toVal.toLowerCase();
    
    let matched = null;
    
    // 1. Try to find a route that contains BOTH From and To stations
    for (const route of ROUTES_DB.activeRoutes) {
      const hasFrom = route.stations.some(s => s.name.toLowerCase().includes(normalizedFrom));
      const hasTo = route.stations.some(s => s.name.toLowerCase().includes(normalizedTo));
      if (hasFrom && hasTo) {
        matched = route;
        break;
      }
    }
    
    // 2. If not found, try to find a route that contains EITHER From or To station
    if (!matched) {
      for (const route of ROUTES_DB.activeRoutes) {
        const hasFrom = route.stations.some(s => s.name.toLowerCase().includes(normalizedFrom));
        const hasTo = route.stations.some(s => s.name.toLowerCase().includes(normalizedTo));
        if (hasFrom || hasTo) {
          matched = route;
          break;
        }
      }
    }
    
    // 3. Fallback: match by route name or ID
    if (!matched) {
      for (const route of ROUTES_DB.activeRoutes) {
        if (route.name.toLowerCase().includes(normalizedFrom) || route.id.toLowerCase().includes(normalizedFrom)) {
          matched = route;
          break;
        }
      }
    }
    
    // 4. Default fallback
    if (!matched) {
      matched = ROUTES_DB.activeRoutes[0];
    }

    state.currentRoute = matched;
    
    // Select the active bus for the matched route in the dropdown
    const busSelect = document.getElementById("bus-number-select");
    if (busSelect) {
      busSelect.value = matched.buses[0];
    }

    state.currentBusId = matched.buses[0];
    document.getElementById("hud-bus-id").innerText = state.currentBusId;
    state.busOccupancy = Math.floor(10 + Math.random() * 20); // random state

    // Consistent trip counters
    state.totalIn = state.busOccupancy + Math.floor(5 + Math.random() * 10);
    state.totalOut = state.totalIn - state.busOccupancy;

    addLogEntry("SEARCH", `Route query verified. Match: ${matched.name}. Analyzing crowds...`);
    updateBusDisplay();
    renderRouteMap();
    triggerStrategyNotification(fromVal, toVal);
    updateGoogleMapLocation(fromVal);
  });

  // Swap Stations button
  document.getElementById("btn-swap-stations").addEventListener("click", () => {
    const fromInput = document.getElementById("from-station");
    const toInput = document.getElementById("to-station");
    const temp = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = temp;
    addLogEntry("SEARCH", "Swapped routing endpoints. Recalculating forecasts...");
  });
}

// Generate some sample logs on start to make it look active
function simulateInitialLogs() {
  const currentBus = state.currentBusId;
  const time = new Date();
  
  for (let i = 5; i > 0; i--) {
    const pastTime = new Date(time.getTime() - i * 60000);
    const timeStr = formatTimestamp(pastTime);
    const simulatedIn = Math.random() > 0.4;
    const action = simulatedIn ? "BOARDED" : "ALIGHTED";
    const delta = simulatedIn ? 1 : -1;
    const pastOccupancy = Math.max(2, state.busOccupancy - (i * delta));
    
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="${simulatedIn ? 'log-action-in' : 'log-action-out'}">${action}</span> ${currentBus} door sensors triggered (+${simulatedIn ? '1' : '-1'}). Occupancy: ${pastOccupancy}/40`;
    
    const container = document.getElementById("edge-ledger-logs");
    container.insertBefore(entry, container.firstChild);
  }
}

// Core Dashboard HUD Renderer
function updateBusDisplay() {
  const countVal = document.getElementById("occupancy-count-val");
  const pctVal = document.getElementById("occupancy-percentage-val");
  const fillBar = document.getElementById("occupancy-bar-fill");
  const badge = document.getElementById("crowd-level-badge");
  
  const count = state.busOccupancy;
  const capacityPct = Math.round((count / state.maxCapacity) * 100);
  
  countVal.innerText = count;
  pctVal.innerText = `${capacityPct}%`;
  
  // Scale bar width
  fillBar.style.width = `${Math.min(capacityPct, 100)}%`;
  
  // Color scale & crowd label
  fillBar.className = "bar-inner";
  countVal.className = "stat-value";
  
  if (capacityPct < 40) {
    badge.innerText = "EMPTY / COMFORTABLE";
    badge.style.color = "var(--color-success)";
    fillBar.classList.add("success");
    countVal.classList.add("status-alert-low");
  } else if (capacityPct < 75) {
    badge.innerText = "MODERATE / STANDING ONLY";
    badge.style.color = "var(--color-warning)";
    fillBar.classList.add("warning");
    countVal.classList.add("status-alert-med");
  } else {
    badge.innerText = "HEAVILY CROWDED";
    badge.style.color = "var(--color-danger)";
    fillBar.classList.add("danger");
    countVal.classList.add("status-alert-high");
  }

  // Update HUD trip counters
  const inValEl = document.getElementById("hud-count-in-val");
  const outValEl = document.getElementById("hud-count-out-val");
  if (inValEl && outValEl) {
    inValEl.innerText = state.totalIn;
    outValEl.innerText = state.totalOut;
  }

  // Update advising strategy details
  recalculateStrategyAdvice();
}

// Real-Time Log Engine & Map Update
function addLogEntry(module, message) {
  const container = document.getElementById("edge-ledger-logs");
  if (!container) return; // Ledger was removed
  const entry = document.createElement("div");
  entry.className = "log-entry";
  
  const timeStr = formatTimestamp(new Date());
  entry.innerHTML = `<span class="log-time">[${timeStr}]</span> <strong style="color: var(--color-primary);">${module}:</strong> ${message}`;
  
  container.insertBefore(entry, container.firstChild);
  
  // Cap at 25 logs for memory
  while (container.children.length > 25) {
    container.removeChild(container.lastChild);
  }
}

function triggerManualLog(message) {
  const container = document.getElementById("edge-ledger-logs");
  if (!container) return;
  const entry = document.createElement("div");
  entry.className = "log-entry";
  
  const timeStr = formatTimestamp(new Date());
  entry.innerHTML = `<span class="log-time">[${timeStr}]</span> ${message}`;
  
  container.insertBefore(entry, container.firstChild);
}

function updateGoogleMapLocation(locationQuery) {
  const iframe = document.getElementById("gmap-iframe");
  if (iframe) {
    iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(locationQuery + ', Bengaluru')}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  }
}

// Setup simulated dots that traverse screen representing passengers
function spawnPassengerDot(direction) {
  const isEntering = direction === "IN";
  const startY = isEntering ? canvas.height + 20 : -20;
  const targetY = isEntering ? -20 : canvas.height + 20;
  
  state.passengerDots.push({
    x: canvas.width * (0.3 + Math.random() * 0.4),
    y: startY,
    targetY: targetY,
    speed: 3 + Math.random() * 3,
    direction: direction,
    crossedLine: false,
    color: isEntering ? "rgba(16, 185, 129, 0.9)" : "rgba(245, 158, 11, 0.9)",
    id: Math.floor(Math.random() * 100),
    label: `person: ${(85 + Math.random() * 14).toFixed(0)}%`,
    size: 25 + Math.random() * 10
  });
}

// Core Physics & Bounding Box Simulator
function animationLoop(timestamp) {
  if (!canvas || !ctx) return;
  
  // Handle clock timer
  document.getElementById("hud-timestamp").innerText = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Clear Canvas with sleek security-camera visual scanline alpha
  ctx.fillStyle = "rgba(10, 15, 25, 0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Camera perspective grid
  ctx.strokeStyle = "rgba(59, 130, 246, 0.05)";
  ctx.lineWidth = 1;
  const gridSpacing = 40;
  for (let x = 0; x < canvas.width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Draw Gate/Threshold sensor wireline
  const sensorLineY = canvas.height * 0.4;
  ctx.strokeStyle = "rgba(255, 255, 0, 0.4)";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(0, sensorLineY);
  ctx.lineTo(canvas.width, sensorLineY);
  ctx.stroke();
  ctx.setLineDash([]); // clear

  // Draw "Enter" / "Exit" sensor zones
  ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
  ctx.fillRect(0, sensorLineY, canvas.width, canvas.height - sensorLineY);
  ctx.fillStyle = "rgba(245, 158, 11, 0.03)";
  ctx.fillRect(0, 0, canvas.width, sensorLineY);

  // Update and render dots
  state.passengerDots.forEach((dot) => {
    // Move towards target
    if (dot.direction === "IN") {
      dot.y -= dot.speed;
      // Cross line check (moving upwards)
      if (dot.y <= sensorLineY && !dot.crossedLine) {
        dot.crossedLine = true;
        incrementOccupancy();
        triggerEdgeCounterVisual(dot, "BOARDED");
      }
    } else {
      dot.y += dot.speed;
      // Cross line check (moving downwards)
      if (dot.y >= sensorLineY && !dot.crossedLine) {
        dot.crossedLine = true;
        decrementOccupancy();
        triggerEdgeCounterVisual(dot, "ALIGHTED");
      }
    }

    // Render Bounding Box and Skeleton indicators representing neural network prediction
    ctx.strokeStyle = dot.crossedLine ? "rgba(59, 130, 246, 0.8)" : dot.color;
    ctx.lineWidth = 2;
    
    // Draw bounding box
    const boxW = dot.size * 1.5;
    const boxH = dot.size * 2.2;
    const boxX = dot.x - boxW/2;
    const boxY = dot.y - boxH/2;

    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // AI recognition overlay tag
    ctx.fillStyle = dot.crossedLine ? "rgba(59, 130, 246, 0.85)" : dot.color;
    ctx.fillRect(boxX, boxY - 18, boxW * 0.9, 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.max(10, canvas.width*0.02)}px monospace`;
    ctx.fillText(`[ID-${dot.id}] ${dot.label}`, boxX + 4, boxY - 5);

    // Render skeleton dots inside bounding box
    ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
    ctx.beginPath();
    ctx.arc(dot.x, dot.y - boxH*0.25, 4, 0, Math.PI*2); // Head joint
    ctx.arc(dot.x - boxW*0.2, dot.y, 3, 0, Math.PI*2);  // Arm left
    ctx.arc(dot.x + boxW*0.2, dot.y, 3, 0, Math.PI*2);  // Arm right
    ctx.fill();
  });

  // Filter out off-screen dots safely
  state.passengerDots = state.passengerDots.filter(dot => {
    return !((dot.direction === "IN" && dot.y < -50) || (dot.direction === "OUT" && dot.y > canvas.height + 50));
  });

  // Camera scanline effect overlay (pure premium style)
  ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
  for (let s = 0; s < canvas.height; s += 8) {
    ctx.fillRect(0, s, canvas.width, 1);
  }

  // Draw Camera Lens reflection artifact
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 40;
  ctx.beginPath();
  ctx.arc(canvas.width * 0.85, canvas.height * 0.2, canvas.width * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  requestAnimationFrame(animationLoop);
}

// Edge YOLO processing event feedback
function triggerEdgeCounterVisual(dot, eventType) {
  // Flash an alert inside log
  const timeStr = formatTimestamp(new Date());
  const change = eventType === "BOARDED" ? "+1" : "-1";
  
  if (eventType === "BOARDED") {
    addLogEntry("YOLO", `Sensor line crossed UP. Target [ID-${dot.id}] classified: BOARDED (+1). Occupancy: ${state.busOccupancy}/40`);
  } else {
    addLogEntry("YOLO", `Sensor line crossed DOWN. Target [ID-${dot.id}] classified: ALIGHTED (-1). Occupancy: ${state.busOccupancy}/40`);
  }
  
  // Update Live Camera Event Feed Overlay
  addCameraEvent(state.currentBusId, eventType, change);
}

// Add event log inside the camera overlay
function addCameraEvent(busId, action, change) {
  const container = document.getElementById("camera-events-list");
  if (!container) return;
  
  // Remove initial placeholder if present
  if (container.children.length === 1 && container.children[0].textContent.includes("Waiting")) {
    container.innerHTML = "";
  }
  
  const timeStr = formatTimestamp(new Date());
  const entry = document.createElement("div");
  entry.className = `camera-event-item ${action === "BOARDED" ? "in" : "out"}`;
  
  entry.innerHTML = `
    <span>
      <span class="camera-event-bus">${busId}</span>: 
      <span class="camera-event-action ${action === "BOARDED" ? "in" : "out"}">${action}</span> 
      <span>(${change})</span>
    </span>
    <span class="camera-event-time">${timeStr}</span>
  `;
  
  container.insertBefore(entry, container.firstChild);
  
  // Cap at 4 entries for visual space
  while (container.children.length > 4) {
    container.removeChild(container.lastChild);
  }
}

// Start fleet-wide background sensor simulator
function startFleetTelemetry() {
  setInterval(() => {
    if (!state.autoSimulate) return;
    
    // Pick a random bus that is NOT the currently active bus
    const otherBuses = [];
    ROUTES_DB.activeRoutes.forEach(route => {
      route.buses.forEach(bus => {
        if (bus !== state.currentBusId) {
          otherBuses.push(bus);
        }
      });
    });
    
    if (otherBuses.length === 0) return;
    
    const randomBus = otherBuses[Math.floor(Math.random() * otherBuses.length)];
    const isBoarding = Math.random() > 0.45;
    const action = isBoarding ? "BOARDED" : "ALIGHTED";
    const change = isBoarding ? "+1" : "-1";
    
    addCameraEvent(randomBus, action, change);
  }, 7000); // Trigger fleet events every 7 seconds
}

// Occupancy operators
function incrementOccupancy() {
  if (state.busOccupancy < state.maxCapacity) {
    state.busOccupancy++;
    state.totalIn++;
    updateBusDisplay();
  }
}

function decrementOccupancy() {
  if (state.busOccupancy > 0) {
    state.busOccupancy--;
    state.totalOut++;
    updateBusDisplay();
  }
}

// Manual Override Trigger Spawning
function triggerPassengerEvent(direction) {
  if (direction === "IN") {
    spawnPassengerDot("IN");
    addLogEntry("USER", `Manual Boarding event requested inside simulator interface.`);
  } else {
    spawnPassengerDot("OUT");
    addLogEntry("USER", `Manual Alighting event requested inside simulator interface.`);
  }
}

// Auto-simulation interval ticker
function startSimulation() {
  if (simulationTimer) clearInterval(simulationTimer);

  simulationTimer = setInterval(() => {
    if (!state.autoSimulate) return;

    // Randomize passenger movements based on bus load parameters
    const rand = Math.random();
    
    // If empty, favor boarding. If packed, favor exiting.
    const fillRatio = state.busOccupancy / state.maxCapacity;
    let boardThresh = 0.5;
    
    if (fillRatio < 0.2) {
      boardThresh = 0.8; // highly likely to board
    } else if (fillRatio > 0.85) {
      boardThresh = 0.15; // highly likely to exit
    } else {
      // standard random state
      boardThresh = 0.45;
    }

    if (rand < boardThresh) {
      spawnPassengerDot("IN");
    } else if (rand < 0.85) {
      spawnPassengerDot("OUT");
    }
  }, 4500); // Trigger person detection every 4.5 seconds
}

// Render dynamic route path (Bottom heatmap segment)
function renderRouteMap() {
  const container = document.getElementById("route-flow-container");
  
  // Keep the line element
  container.innerHTML = '<div class="route-tracker-line"></div>';

  const stations = state.currentRoute.stations;
  
  // Real-time inference to forecast crowd distributions at each stop
  stations.forEach((station, idx) => {
    // Generate real-time ML forecasting crowd percentage
    let simulatedForecastVal = station.currentCrowd;
    
    // Real-time factor adjustments: adapt predicted crowd based on current bus passenger deviations
    const deviation = state.busOccupancy - 24; 
    simulatedForecastVal = Math.max(10, Math.min(95, simulatedForecastVal + Math.floor(deviation * station.boardRatio)));

    const node = document.createElement("div");
    node.className = "map-node";
    node.id = `map-node-${idx}`;
    
    // Classify crowd density level colors
    if (simulatedForecastVal < 40) {
      node.classList.add("crowd-low");
    } else if (simulatedForecastVal < 70) {
      node.classList.add("crowd-med");
    } else {
      node.classList.add("crowd-high");
    }

    // Highlight key stations
    let highlightHtml = "";
    if (station.isHighlight) {
      // Choose alert type based on stop nature
      const alertClass = station.loadRate === "high" ? "" : "alight";
      highlightHtml = `<div class="node-highlight-marker ${alertClass}">${station.highlightText}</div>`;
    }

    node.innerHTML = `
      ${highlightHtml}
      <div class="node-circle"></div>
      <div class="node-name">${station.name}</div>
      <div class="node-crowd-tag" id="node-crowd-tag-${idx}">${simulatedForecastVal}% Loaded</div>
    `;

    // If Python ML Backend is online, fetch prediction from it asynchronously
    if (backendOnline) {
      fetch(`${BACKEND_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify({
          route_id: state.currentRoute.id,
          station: station.name,
          boarding_count: Math.round(station.boardRatio * 15),
          alighting_count: Math.round(station.alightRatio * 10),
          current_occupancy: state.busOccupancy,
          hour: new Date().getHours()
        })
      })
      .then(res => res.json())
      .then(data => {
        const val = data.predicted_crowd_load;
        const tag = document.getElementById(`node-crowd-tag-${idx}`);
        if (tag) {
          tag.innerHTML = `${val}% Loaded <span style="font-size:0.65rem; color:#06b6d4; font-weight:bold;">(AI)</span>`;
          
          // Dynamically adjust color classes based on live backend prediction
          const nodeCircle = document.getElementById(`map-node-${idx}`);
          if (nodeCircle) {
            nodeCircle.classList.remove("crowd-low", "crowd-med", "crowd-high");
            if (val < 40) {
              nodeCircle.classList.add("crowd-low");
            } else if (val < 70) {
              nodeCircle.classList.add("crowd-med");
            } else {
              nodeCircle.classList.add("crowd-high");
            }
          }
        }
      })
      .catch(err => {
        // Fallback silently if fetch fails
      });
    }

    // Interactive node focus click
    node.addEventListener("click", () => {
      state.selectedStationIndex = idx;
      addLogEntry("ML-MODEL", `Inference focused on station: ${station.name}. Rate of boarding delta: +${(station.boardRatio * 100).toFixed(0)}%/stop.`);
      recalculateStrategyAdvice();
      updateGoogleMapLocation(station.name);
      
      // Visual feedback: select stop glow outline
      document.querySelectorAll(".map-node").forEach(n => n.style.transform = "");
      node.style.transform = "scale(1.15)";
    });

    container.appendChild(node);
  });
}

// Seat Strategy algorithm calculations
function recalculateStrategyAdvice() {
  const adviceText = document.getElementById("advice-strategy-text");
  const stationsList = document.getElementById("advisor-stations-list");
  
  const stations = state.currentRoute.stations;
  const targetStation = stations[state.selectedStationIndex] || stations[2] || stations[0];

  // Strategy suggestions logic
  let advice = "";
  let listHtml = "";

  const highAlightStop = stations.find(s => s.alightRatio > 0.4) || stations[stations.length - 1];
  const highLoadStop = stations.find(s => s.loadRate === "high") || stations[0];
  const firstStop = stations[0];

  if (state.busOccupancy >= state.maxCapacity * 0.8) {
    advice = `<strong>Alert: Bus is highly packed (${state.busOccupancy}/${state.maxCapacity}).</strong> Most seats are currently occupied. However, our ML model estimates a <strong>${(highAlightStop.alightRatio * 100).toFixed(0)}% exit dispersion rate</strong> at <strong>${highAlightStop.name}</strong>. If you are nearby, relocate to board there to secure empty seats!`;
  } else {
    // Route loading calculations
    advice = `<strong>Seat Finder Advice:</strong> Current bus capacity is moderate. Note that <strong>${highLoadStop.name}</strong> is a high-boarding terminal/stop. Seats fill up by 75% here. Passengers waiting at preceding stops like <strong>${firstStop.name}</strong> should board immediately to guarantee seating.`;
  }

  adviceText.innerHTML = advice;

  // Render high-loading stops highlighted badge list
  stations.forEach(s => {
    if (s.isHighlight) {
      let bulletClass = "warning";
      if (s.loadRate === "high") bulletClass = "danger";
      if (s.loadRate === "med") bulletClass = "warning";
      if (s.loadRate === "low") bulletClass = "success";

      listHtml += `
        <div class="station-badge">
          <div class="station-badge-left">
            <span class="bullet ${bulletClass}"></span>
            <span class="station-name">${s.name}</span>
          </div>
          <span class="station-stats">${s.loadRate === "high" ? 'Crowd Load: +80%' : 'Exit Dispersion: +60%'}</span>
        </div>
      `;
    }
  });

  stationsList.innerHTML = listHtml;
}

// Action Trigger Search Strategy response
function triggerStrategyNotification(from, to) {
  const container = document.getElementById("advisor-stations-list");
  const adviceText = document.getElementById("advice-strategy-text");
  
  const currentBus = state.currentBusId;
  const activeRoute = state.currentRoute;
  const pivotStation = activeRoute.stations[2] || activeRoute.stations[0];
  
  adviceText.innerHTML = `
    <strong>Analyzing Route from ${from} to ${to}:</strong><br>
    Selected Bus: <strong>${currentBus}</strong> has an active occupancy of ${state.busOccupancy} passengers.<br>
    Our real-time prediction model indicates optimal seats are currently open. Avoid waiting at highly loaded hubs like <strong>${pivotStation.name}</strong>, where boarding rates surge by 80%.
  `;
}

// Helpers
function formatTimestamp(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
