// ----------------------------------------------------
// STATE VARIABLES & UTILITIES
// ----------------------------------------------------
let model = null;
let videoStream = null;
let animationFrameId = null;
let isSensorRunning = false;

// Audio state
let isMuted = false;
let audioCtx = null;

// Sensor configurations
let lineOrientation = 'horizontal'; // 'horizontal' or 'vertical'
let linePositionNormalized = 0.5; // Position of line from 0 to 1
let invertDirections = false; // invert In/Out mapping
let maxCapacity = 20;

// Tracking state
let currentCount = 0;
let totalIns = 0;
let totalOuts = 0;
let trackedObjects = [];
let nextObjectId = 1;
const maxTrackHistory = 10; // keep last 10 centroids
const trackingDistanceThreshold = 80; // max pixels distance to match object
const maxFramesMissing = 15; // frames to keep missing objects before deleting

// Drag and drop for crossing line
let isDraggingLine = false;

// UI elements
const elVideo = document.getElementById('webcam-video');
const elCanvas = document.getElementById('output-canvas');
const ctx = elCanvas.getContext('2d');
const elLoadingOverlay = document.getElementById('loading-overlay');
const elLoadingMessage = document.getElementById('loading-message');
const elStatusIndicator = document.getElementById('status-indicator');
const elStatusText = document.getElementById('status-text');
const elCameraSelect = document.getElementById('camera-select');
const elLineOrientation = document.getElementById('line-orientation');
const elCrossingDirection = document.getElementById('crossing-direction');
const elCapacityInput = document.getElementById('capacity-input');
const elToggleSensorBtn = document.getElementById('toggle-sensor-btn');
const elResetCountsBtn = document.getElementById('reset-counts-btn');
const elMuteSoundBtn = document.getElementById('mute-sound-btn');
const elCurrentPassengers = document.getElementById('current-passengers-count');
const elCapacityLimit = document.getElementById('capacity-limit-val');
const elCapacityProgress = document.getElementById('capacity-progress');
const elTotalBoardings = document.getElementById('total-boardings');
const elTotalAlightings = document.getElementById('total-alightings');
const elCrowdDensityBadge = document.getElementById('crowd-density-badge');
const elJsonPayload = document.getElementById('json-payload-display');
const elGatewayStatus = document.getElementById('gateway-status');
const elGatewayPanel = document.querySelector('.gateway-panel');
const elLogsContainer = document.getElementById('logs-container');
const elEmptyLogMessage = document.getElementById('empty-log-message');
const elLogsList = document.getElementById('logs-list');
const elClearLogsBtn = document.getElementById('clear-logs-btn');
const elCounterCard = document.querySelector('.main-counter-card');
const elDirectionHelper = document.getElementById('direction-helper');

// Audio Chime Synthesizer using Web Audio API
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playChime(type) {
  if (isMuted) return;
  try {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'in') {
      // Boarding chime: cheerful rising synthesizer chord
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // Alighting chime: double pulse descending
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(392.00, now + 0.08); // G4
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    console.error('Audio synthesizer error:', e);
  }
}

// ----------------------------------------------------
// CAMERA & MODEL LIFE CYCLE
// ----------------------------------------------------
async function initializeApp() {
  try {
    updateLoadingStatus('Loading AI Models...', 'This runs locally in your browser.');
    
    // Check if cocoSsd is loaded via script tag
    if (typeof cocoSsd === 'undefined') {
      throw new Error('TensorFlow.js / COCO-SSD script failed to load. Check internet connection.');
    }

    // Load COCO-SSD model
    model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    
    updateLoadingStatus('Accessing Camera...', 'Please grant camera permissions when prompted.');
    
    // Start webcam (requests camera permission to allow listing actual names)
    await startCamera();
    
    // Setup camera sources list with actual device names
    await enumerateCameras();

    // Enable buttons
    elToggleSensorBtn.disabled = false;
    elCameraSelect.disabled = false;
    
    // Hide loading overlay
    elLoadingOverlay.style.display = 'none';
    
    setSystemStatus('online', 'SENSOR STANDBY');
    
    // Log startup
    logEvent('SYSTEM', 'Virtual Crowd Sensor initialized successfully.', 'info');
  } catch (err) {
    console.error('Initialization error:', err);
    updateLoadingStatus('Initialization Failed', err.message);
    setSystemStatus('offline', 'ERROR');
  }
}

function updateLoadingStatus(heading, subheading) {
  elLoadingMessage.textContent = heading;
  const elSub = elLoadingOverlay.querySelector('.loading-sub-text');
  if (elSub) elSub.textContent = subheading;
}

function setSystemStatus(statusClass, text) {
  elStatusIndicator.className = `status-indicator ${statusClass}`;
  elStatusText.textContent = text;
}

async function enumerateCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    
    elCameraSelect.innerHTML = '';
    
    if (videoDevices.length === 0) {
      const opt = document.createElement('option');
      opt.text = 'No cameras found';
      elCameraSelect.add(opt);
      return;
    }

    videoDevices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Camera ${index + 1}`;
      elCameraSelect.add(option);
    });
  } catch (err) {
    console.error('Error enumerating cameras:', err);
  }
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Webcam API is blocked (requires a secure context like localhost or HTTPS). Please open http://localhost:5173/ in your browser instead of file://.');
  }

  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
  }

  const deviceId = elCameraSelect.value;
  const constraints = {
    video: deviceId ? { deviceId: { exact: deviceId }, width: 640, height: 480 } : { width: 640, height: 480 },
    audio: false
  };

  try {
    videoStream = await navigator.mediaDevices.getUserMedia(constraints);
    elVideo.srcObject = videoStream;
    
    // Wait for metadata to load so dimensions are correct
    await new Promise((resolve) => {
      elVideo.onloadedmetadata = () => {
        resolve();
      };
    });
    
    // Ensure canvas matches video aspect ratio
    elCanvas.width = 640;
    elCanvas.height = 480;
    
    // Draw initial standby frame
    drawStandbyFrame();
  } catch (err) {
    console.error('Error starting camera:', err);
    throw new Error('Webcam access was denied or device is busy.');
  }
}

function drawStandbyFrame() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, elCanvas.width, elCanvas.height);
  
  // Paint centered camera icon and text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.arc(elCanvas.width / 2, elCanvas.height / 2 - 30, 40, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.font = '24px Outfit';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('CAMERA INSTALLED', elCanvas.width / 2, elCanvas.height / 2 + 30);
  ctx.font = '14px JetBrains Mono';
  ctx.fillText('Press "Start Sensor" to begin detection', elCanvas.width / 2, elCanvas.height / 2 + 55);
  
  drawSensorLine();
}

// ----------------------------------------------------
// OBJECT DETECTION & CORE LOOP
// ----------------------------------------------------
async function sensorLoop() {
  if (!isSensorRunning) return;
  
  try {
    // 1. Draw video onto canvas mirrored
    ctx.save();
    ctx.translate(elCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(elVideo, 0, 0, elCanvas.width, elCanvas.height);
    ctx.restore();
    
    // 2. Perform object detection
    const detections = await model.detect(elVideo);
    
    // Filter only "person" detections with score > 0.45
    const peopleDetections = detections.filter(d => d.class === 'person' && d.score > 0.45);
    
    // 3. Track people and identify line crossing
    trackPeople(peopleDetections);
    
    // 4. Draw labels, boxes, trails, and sensor line
    drawTrackingOverlays(peopleDetections);
    
  } catch (err) {
    console.error('Error in sensor loop:', err);
  }
  
  // Continue animation loop
  animationFrameId = requestAnimationFrame(sensorLoop);
}

// ----------------------------------------------------
// MULTI-OBJECT CENTROID TRACKING ALGORITHM
// ----------------------------------------------------
function trackPeople(detections) {
  // Convert detections to mirrored space coordinates
  const currentDetections = detections.map(d => {
    const [x, y, w, h] = d.bbox;
    // Bbox is mirrored
    const xMirrored = elCanvas.width - (x + w);
    const cx = xMirrored + w / 2;
    const cy = y + h / 2;
    return {
      bbox: [xMirrored, y, w, h],
      centroid: [cx, cy],
      score: d.score,
      matched: false
    };
  });
  
  // Match current detections with existing tracked objects using Euclidean distance
  for (let obj of trackedObjects) {
    obj.matchedInThisFrame = false;
    
    if (currentDetections.length === 0) continue;
    
    let closestIndex = -1;
    let minDistance = Infinity;
    
    const [ox, oy] = obj.centroid;
    
    for (let i = 0; i < currentDetections.length; i++) {
      if (currentDetections[i].matched) continue;
      
      const [cx, cy] = currentDetections[i].centroid;
      const dist = Math.hypot(cx - ox, cy - oy);
      
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }
    
    // If the distance is below threshold, match the object
    if (closestIndex !== -1 && minDistance < trackingDistanceThreshold) {
      const match = currentDetections[closestIndex];
      match.matched = true;
      
      // Update object state
      obj.centroid = match.centroid;
      obj.bbox = match.bbox;
      obj.history.push(match.centroid);
      if (obj.history.length > maxTrackHistory) {
        obj.history.shift();
      }
      obj.framesMissing = 0;
      obj.matchedInThisFrame = true;
      
      // Check for line crossing event
      checkLineCrossing(obj);
    }
  }
  
  // Handle unmatched tracked objects (missing in this frame)
  for (let obj of trackedObjects) {
    if (!obj.matchedInThisFrame) {
      obj.framesMissing++;
    }
  }
  
  // Create new tracked objects for unmatched detections
  for (let det of currentDetections) {
    if (!det.matched) {
      trackedObjects.push({
        id: nextObjectId++,
        centroid: det.centroid,
        bbox: det.bbox,
        history: [det.centroid],
        framesMissing: 0,
        lineSide: null,  // Which side of the sensor line they are on
        matchedInThisFrame: true
      });
    }
  }
  
  // Remove tracked objects missing for too long
  trackedObjects = trackedObjects.filter(obj => obj.framesMissing < maxFramesMissing);
}

// ----------------------------------------------------
// LINE CROSSING DETECTION — SIDE TRACKING WITH HYSTERESIS
// ----------------------------------------------------
// Each tracker remembers which side of the line they are on (lineSide).
// A 25px hysteresis buffer prevents jitter from triggering false events.
// When the side changes cleanly (above→below or left→right), an event fires.
// This allows a single person to board AND later alight correctly.
function checkLineCrossing(obj) {
  const buffer = 25; // hysteresis dead-zone around the line
  const [cx, cy] = obj.centroid;

  let newSide = null;

  if (lineOrientation === 'horizontal') {
    const lineY = linePositionNormalized * elCanvas.height;
    if (cy < lineY - buffer)      newSide = 'above';
    else if (cy > lineY + buffer) newSide = 'below';
    // else: centroid is inside buffer zone — don't update
  } else {
    const lineX = linePositionNormalized * elCanvas.width;
    if (cx < lineX - buffer)      newSide = 'left';
    else if (cx > lineX + buffer) newSide = 'right';
  }

  // In the dead-zone: wait until they exit it
  if (newSide === null) return;

  // First clear detection — initialise side, no event yet
  if (obj.lineSide === null) {
    obj.lineSide = newSide;
    return;
  }

  // Side changed → crossing event
  if (newSide !== obj.lineSide) {
    const prevSide = obj.lineSide;
    obj.lineSide = newSide; // update before firing to allow future crossings

    let direction;
    if (lineOrientation === 'horizontal') {
      // above → below : default BOARDING
      direction = (prevSide === 'above') ?
        (invertDirections ? 'out' : 'in') :
        (invertDirections ? 'in'  : 'out');
    } else {
      // left → right : default BOARDING
      direction = (prevSide === 'left') ?
        (invertDirections ? 'out' : 'in') :
        (invertDirections ? 'in'  : 'out');
    }

    handleCrossingEvent(direction, obj.id);
  }
}

// Spawn dynamic floating text overlay on the camera viewport (+1 / -1)
function spawnFloatingAlert(text, type, x, y) {
  const alertEl = document.createElement('div');
  alertEl.className = `floating-alert ${type}`;
  alertEl.textContent = text;
  
  const wrapper = document.querySelector('.camera-viewport-wrapper');
  if (!wrapper) return;
  
  // Convert coordinates to percentages of wrapper overlay
  const pctX = (x / elCanvas.width) * 100;
  const pctY = (y / elCanvas.height) * 100;
  
  alertEl.style.left = `${pctX}%`;
  alertEl.style.top = `${pctY}%`;
  
  wrapper.appendChild(alertEl);
  
  setTimeout(() => {
    alertEl.remove();
  }, 1000);
}

// Handle trigger event
function handleCrossingEvent(direction, objId) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Find tracked object coordinate to place floating text
  const trackedObj = trackedObjects.find(o => o.id === objId);
  const x = trackedObj ? trackedObj.centroid[0] : elCanvas.width / 2;
  const y = trackedObj ? trackedObj.centroid[1] : elCanvas.height / 2;
  
  if (direction === 'in') {
    currentCount++;
    totalIns++;
    playChime('in');
    flashCounterCard('in');
    spawnFloatingAlert('+1', 'in', x, y);
    logEvent('BOARDING', `Passenger (ID #${objId}) boarded bus.`, 'in');
  } else {
    if (currentCount > 0) {
      currentCount--;
      totalOuts++;
      playChime('out');
      flashCounterCard('out');
      spawnFloatingAlert('-1', 'out', x, y);
      logEvent('ALIGHTING', `Passenger (ID #${objId}) exited bus.`, 'out');
    } else {
      // In case sensor registers exit when count is already 0, log it but don't go negative
      totalOuts++;
      playChime('out');
      flashCounterCard('out');
      spawnFloatingAlert('-1', 'out', x, y);
      logEvent('ALIGHTING', `Passenger (ID #${objId}) exited empty bus.`, 'out');
    }
  }
  
  updateDashboardUI();
  dispatchMockIoTPayload(direction, objId, timestamp);
}

// ----------------------------------------------------
// UI STATE UPDATES
// ----------------------------------------------------
function updateDashboardUI() {
  elCurrentPassengers.textContent = currentCount;
  elTotalBoardings.textContent = totalIns;
  elTotalAlightings.textContent = totalOuts;
  
  // Progress bar
  const percent = Math.min((currentCount / maxCapacity) * 100, 100);
  elCapacityProgress.style.width = `${percent}%`;
  
  // Update colors based on density
  elCounterCard.className = 'main-counter-card';
  if (currentCount >= maxCapacity) {
    elCounterCard.classList.add('density-high');
    elCrowdDensityBadge.textContent = 'OVERCAPACITY';
    elCrowdDensityBadge.className = 'badge info-badge';
    elCrowdDensityBadge.style.backgroundColor = 'rgba(244, 63, 94, 0.2)';
    elCrowdDensityBadge.style.color = '#fda4af';
    elCrowdDensityBadge.style.borderColor = 'var(--color-out)';
  } else if (currentCount >= maxCapacity * 0.75) {
    elCounterCard.classList.add('density-high');
    elCrowdDensityBadge.textContent = 'CRITICAL';
    elCrowdDensityBadge.className = 'badge info-badge';
    elCrowdDensityBadge.style.backgroundColor = 'rgba(244, 63, 94, 0.15)';
    elCrowdDensityBadge.style.color = '#f43f5e';
    elCrowdDensityBadge.style.borderColor = 'rgba(244, 63, 94, 0.4)';
  } else if (currentCount >= maxCapacity * 0.4) {
    elCounterCard.classList.add('density-medium');
    elCrowdDensityBadge.textContent = 'MEDIUM';
    elCrowdDensityBadge.className = 'badge info-badge';
    elCrowdDensityBadge.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
    elCrowdDensityBadge.style.color = '#fbbf24';
    elCrowdDensityBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
  } else {
    elCounterCard.classList.add('density-low');
    elCrowdDensityBadge.textContent = 'LOW';
    elCrowdDensityBadge.className = 'badge info-badge';
    elCrowdDensityBadge.style.backgroundColor = 'rgba(6, 182, 212, 0.1)';
    elCrowdDensityBadge.style.color = '#22d3ee';
    elCrowdDensityBadge.style.borderColor = 'rgba(6, 182, 212, 0.2)';
  }
}

function flashCounterCard(direction) {
  const flashClass = direction === 'in' ? 'flash-in' : 'flash-out';
  elCounterCard.classList.add(flashClass);
  
  // Flash sensor line on canvas by setting a state variable checked during draw
  lineFlashTimer = 10; // flash for 10 frames
  lineFlashColor = direction === 'in' ? 'var(--color-in)' : 'var(--color-out)';
  
  setTimeout(() => {
    elCounterCard.classList.remove(flashClass);
  }, 400);
}

let lineFlashTimer = 0;
let lineFlashColor = '';

function logEvent(type, text, classModifier = '') {
  elEmptyLogMessage.style.display = 'none';
  
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  
  const li = document.createElement('li');
  li.className = `log-item ${classModifier}`;
  
  let changeIndicator = '';
  if (classModifier === 'in') changeIndicator = '<span class="log-right in">+1</span>';
  if (classModifier === 'out') changeIndicator = '<span class="log-right out">-1</span>';
  
  li.innerHTML = `
    <div class="log-left">
      <span class="log-time">${timeStr}</span>
      <span class="log-event">[${type}] ${text}</span>
    </div>
    ${changeIndicator}
  `;
  
  elLogsList.insertBefore(li, elLogsList.firstChild);
  
  // Limit logs list length to 30 items
  while (elLogsList.children.length > 30) {
    elLogsList.removeChild(elLogsList.lastChild);
  }
}

// Simulated IoT HTTP POST Payload dispatch
function dispatchMockIoTPayload(event, passengerId, timestamp) {
  const payload = {
    sensor_id: "V-SENSOR-09X",
    event_type: event === 'in' ? "PASSENGER_BOARDING" : "PASSENGER_ALIGHTING",
    passenger_tracker_id: passengerId,
    timestamp: timestamp,
    data: {
      change_value: event === 'in' ? 1 : -1,
      current_occupancy: currentCount,
      bus_capacity: maxCapacity,
      occupancy_rate: Number((currentCount / maxCapacity).toFixed(2)),
      density_level: elCrowdDensityBadge.textContent
    }
  };
  
  // Update Terminal GUI
  elJsonPayload.textContent = JSON.stringify(payload, null, 2);
  
  // Visual Gateway Transmission pulse
  elGatewayStatus.textContent = 'TRANSMITTING';
  elGatewayStatus.style.backgroundColor = 'var(--color-in)';
  elGatewayStatus.style.color = '#fff';
  elGatewayPanel.classList.add('active');
  
  setTimeout(() => {
    elGatewayStatus.textContent = 'STANDBY';
    elGatewayStatus.style.backgroundColor = '';
    elGatewayStatus.style.color = '';
    elGatewayPanel.classList.remove('active');
  }, 1000);
}

// ----------------------------------------------------
// CANVAS RENDERING & DRAWING
// ----------------------------------------------------
function drawTrackingOverlays(detections) {
  // Clear canvas has been handled by drawImage in loop.
  // Draw tracked object trails and centroids
  for (let obj of trackedObjects) {
    if (obj.framesMissing > 0) continue; // don't draw trailing boxes for missing objects
    
    const [x, y, w, h] = obj.bbox;
    
    // Draw bounding box
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    
    // Draw semi-transparent background fill for bbox
    ctx.fillStyle = 'rgba(6, 182, 212, 0.05)';
    ctx.fillRect(x, y, w, h);
    
    // Bbox label
    ctx.font = '500 11px Outfit';
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(`TRACKER #${obj.id}`, x + 5, y + 16);
    
    // Draw trail trail points (history)
    if (obj.history.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
      ctx.lineWidth = 3;
      ctx.setLineDash([2, 3]);
      ctx.moveTo(obj.history[0][0], obj.history[0][1]);
      for (let i = 1; i < obj.history.length; i++) {
        ctx.lineTo(obj.history[i][0], obj.history[i][1]);
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset
    }
    
    // Centroid circle
    ctx.beginPath();
    ctx.arc(obj.centroid[0], obj.centroid[1], 5, 0, Math.PI * 2);
    ctx.fillStyle = 'var(--color-accent)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  
  // Draw sensor line
  drawSensorLine();
}

function drawSensorLine() {
  const xLine = linePositionNormalized * elCanvas.width;
  const yLine = linePositionNormalized * elCanvas.height;
  
  // Choose line color (flash vs normal)
  let strokeColor = 'rgba(99, 102, 241, 0.8)'; // Indigo
  if (lineFlashTimer > 0) {
    strokeColor = lineFlashColor;
    lineFlashTimer--;
  }
  
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  
  if (lineOrientation === 'horizontal') {
    ctx.moveTo(0, yLine);
    ctx.lineTo(elCanvas.width, yLine);
  } else {
    ctx.moveTo(xLine, 0);
    ctx.lineTo(xLine, elCanvas.height);
  }
  ctx.stroke();
  
  // Highlight label overlay on the line
  ctx.fillStyle = strokeColor;
  ctx.font = 'bold 10px JetBrains Mono';
  ctx.textAlign = 'center';
  
  const labelText = 'PASSENGER COUNTER BOUNDARY LINE (DRAGGABLE)';
  
  if (lineOrientation === 'horizontal') {
    ctx.fillRect(elCanvas.width / 2 - 130, yLine - 10, 260, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(labelText, elCanvas.width / 2, yLine + 4);
  } else {
    ctx.save();
    ctx.translate(xLine, elCanvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillRect(-130, -10, 260, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(labelText, 0, 4);
    ctx.restore();
  }
}

// ----------------------------------------------------
// EVENT LISTENERS & INTERACTION
// ----------------------------------------------------
function setupEventListeners() {
  
  // Toggle camera stream & detection
  elToggleSensorBtn.addEventListener('click', async () => {
    initAudio(); // Initialize audio context on user interaction
    
    if (isSensorRunning) {
      // Stop sensor
      isSensorRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      elToggleSensorBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start Sensor';
      elToggleSensorBtn.className = 'btn btn-primary';
      elCameraSelect.disabled = false;
      setSystemStatus('online', 'SENSOR STANDBY');
      drawStandbyFrame();
      logEvent('SYSTEM', 'Virtual Crowd Sensor stopped.', 'warning');
    } else {
      // Start sensor
      isSensorRunning = true;
      elToggleSensorBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Sensor';
      elToggleSensorBtn.className = 'btn btn-secondary';
      elCameraSelect.disabled = true;
      setSystemStatus('online', 'SENSOR ACTIVE');
      
      // Update arrows visibility helper
      elDirectionHelper.classList.remove('hidden');
      updateDirectionHelpers();
      
      logEvent('SYSTEM', 'Virtual Crowd Sensor active and scanning.', 'in');
      sensorLoop();
    }
  });
  
  // Reset counts
  elResetCountsBtn.addEventListener('click', () => {
    currentCount = 0;
    totalIns = 0;
    totalOuts = 0;
    trackedObjects = [];
    updateDashboardUI();
    logEvent('SYSTEM', 'Crowd counters reset to zero.', 'warning');
    
    // Update API log
    elJsonPayload.textContent = JSON.stringify({
      status: "counters_reset",
      sensor_id: "V-SENSOR-09X",
      timestamp: Math.floor(Date.now() / 1000)
    }, null, 2);
  });
  
  // Mute audio toggling
  elMuteSoundBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    if (isMuted) {
      elMuteSoundBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
      elMuteSoundBtn.title = 'Unmute audio chime';
      logEvent('SYSTEM', 'Audio feedback muted.', 'info');
    } else {
      elMuteSoundBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      elMuteSoundBtn.title = 'Mute audio chime';
      logEvent('SYSTEM', 'Audio feedback unmuted.', 'info');
      // play a quick chime to verify
      playChime('in');
    }
  });
  
  // Camera Selection source change
  elCameraSelect.addEventListener('change', async () => {
    await startCamera();
    logEvent('SYSTEM', `Camera source switched.`, 'info');
  });
  
  // Line Orientation change
  elLineOrientation.addEventListener('change', () => {
    lineOrientation = elLineOrientation.value;
    updateDirectionHelpers();
    if (!isSensorRunning) {
      drawStandbyFrame();
    }
    logEvent('SYSTEM', `Crossing line changed to ${lineOrientation} layout.`, 'info');
  });

  // Crossing direction mapping change
  elCrossingDirection.addEventListener('change', () => {
    invertDirections = (elCrossingDirection.value === 'reverse');
    updateDirectionHelpers();
    logEvent('SYSTEM', `Sensor entry/exit boundary directions inverted.`, 'info');
  });
  
  // Capacity inputs
  elCapacityInput.addEventListener('input', () => {
    const val = parseInt(elCapacityInput.value, 10);
    if (!isNaN(val) && val >= 5) {
      maxCapacity = val;
      elCapacityLimit.textContent = maxCapacity;
      updateDashboardUI();
    }
  });

  // Clear Event Logs button
  elClearLogsBtn.addEventListener('click', () => {
    elLogsList.innerHTML = '';
    elEmptyLogMessage.style.display = 'flex';
  });
  
  // Draggable crossing line canvas events
  elCanvas.addEventListener('mousedown', handleMouseDown);
  elCanvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  
  // Mobile touch event drag support
  elCanvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    elCanvas.dispatchEvent(mouseEvent);
  }, { passive: true });

  elCanvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    elCanvas.dispatchEvent(mouseEvent);
  }, { passive: true });

  window.addEventListener('touchend', () => {
    const mouseEvent = new MouseEvent('mouseup', {});
    window.dispatchEvent(mouseEvent);
  });
}

function updateDirectionHelpers() {
  const elIn = elDirectionHelper.querySelector('.arrow-in');
  const elOut = elDirectionHelper.querySelector('.arrow-out');
  
  if (lineOrientation === 'horizontal') {
    if (!invertDirections) {
      elIn.innerHTML = '<i class="fa-solid fa-arrow-down"></i> ENTRY';
      elOut.innerHTML = 'EXIT <i class="fa-solid fa-arrow-up"></i>';
    } else {
      elIn.innerHTML = '<i class="fa-solid fa-arrow-up"></i> ENTRY';
      elOut.innerHTML = 'EXIT <i class="fa-solid fa-arrow-down"></i>';
    }
  } else {
    // Vertical line directions
    if (!invertDirections) {
      elIn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> ENTRY';
      elOut.innerHTML = 'EXIT <i class="fa-solid fa-arrow-left"></i>';
    } else {
      elIn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> ENTRY';
      elOut.innerHTML = 'EXIT <i class="fa-solid fa-arrow-right"></i>';
    }
  }
}

// Drag & drop line coordinators helper
function getCanvasMouseCoords(event) {
  const rect = elCanvas.getBoundingClientRect();
  const scaleX = elCanvas.width / rect.width;
  const scaleY = elCanvas.height / rect.height;
  
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function handleMouseDown(e) {
  const coords = getCanvasMouseCoords(e);
  const lineY = linePositionNormalized * elCanvas.height;
  const lineX = linePositionNormalized * elCanvas.width;
  
  const tolerance = 15; // drag activation pixel range
  
  if (lineOrientation === 'horizontal') {
    if (Math.abs(coords.y - lineY) < tolerance) {
      isDraggingLine = true;
    }
  } else {
    if (Math.abs(coords.x - lineX) < tolerance) {
      isDraggingLine = true;
    }
  }
}

function handleMouseMove(e) {
  if (!isDraggingLine) return;
  
  const coords = getCanvasMouseCoords(e);
  
  if (lineOrientation === 'horizontal') {
    // Clamp to 10% - 90% range to keep boundary on screen
    const clampedY = Math.max(48, Math.min(coords.y, elCanvas.height - 48));
    linePositionNormalized = clampedY / elCanvas.height;
  } else {
    const clampedX = Math.max(64, Math.min(coords.x, elCanvas.width - 64));
    linePositionNormalized = clampedX / elCanvas.width;
  }
  
  // Re-draw frame if sensor is currently stopped
  if (!isSensorRunning) {
    drawStandbyFrame();
  }
}

function handleMouseUp() {
  if (isDraggingLine) {
    isDraggingLine = false;
    logEvent('SENSOR', `Sensor crossing boundary line calibrated to position ${Math.round(linePositionNormalized * 100)}%.`, 'info');
  }
}

// ----------------------------------------------------
// INITIALIZATION KICK-OFF
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initializeApp();
  updateDashboardUI();
});
