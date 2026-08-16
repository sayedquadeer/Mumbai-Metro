let router = null;

document.addEventListener('DOMContentLoaded', async () => {
  initMobileNav();
  await loadMetroData();
  initRouteFinder();
});

function initMobileNav() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('active');
    });
  }
}

async function loadMetroData() {
  try {
    const response = await fetch('data/metro.json');
    const data = await response.json();
    router = new MetroRouter(data);
    
    if (document.getElementById('from-station')) {
      setupAutocomplete('from-station', 'from-suggestions');
      setupAutocomplete('to-station', 'to-suggestions');
    }

    // Trigger page-specific renders
    if (window.location.pathname.includes('stations.html')) renderStationsPage();
    if (window.location.pathname.includes('lines.html')) renderLinesPage();
  } catch (e) {
    console.error('Failed to load metro data', e);
  }
}

function setupAutocomplete(inputId, listId) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list) return;

  const stations = router.getAllStations();

  input.addEventListener('input', () => {
    const val = input.value.trim().toLowerCase();
    list.innerHTML = '';

    // Requirement 1 & 7: When input is empty, show NO suggestions
    if (val.length === 0) {
      list.classList.remove('active');
      return;
    }

    // Requirement 2 & 3: Match from 1+ character, case-insensitive partial match
    const matches = stations.filter(station => station.toLowerCase().includes(val));

    if (matches.length > 0) {
      matches.forEach(stationName => {
        const li = document.createElement('li');
        
        // Lookup line details for visual context tag
        const lineIds = Array.from(router.stationLinesMap[stationName] || []);
        const lineNames = lineIds.map(id => {
          const details = router.getLineDetails(id);
          return details ? details.name.split(' (')[0] : '';
        }).filter(Boolean).join(', ');

        li.innerHTML = `
          <div class="suggestion-item-main">
            <span class="suggestion-icon">🚇</span>
            <span>${stationName}</span>
          </div>
          ${lineNames ? `<span class="suggestion-line-tag">${lineNames}</span>` : ''}
        `;

        // Requirement 5: Tap/click puts station name into input, closes list, stores value
        li.addEventListener('click', () => {
          input.value = stationName;
          list.classList.remove('active');
          list.innerHTML = '';
        });

        list.appendChild(li);
      });

      list.classList.add('active');
    } else {
      list.classList.remove('active');
    }
  });

  // Close suggestion dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.classList.remove('active');
    }
  });
}

function initRouteFinder() {
  const btn = document.getElementById('find-route-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const from = document.getElementById('from-station').value.trim();
    const to = document.getElementById('to-station').value.trim();
    const errorEl = document.getElementById('route-error');
    const resultsContainer = document.getElementById('route-results');

    errorEl.textContent = '';
    
    if (!from || !to) {
      errorEl.textContent = 'Please enter both starting and destination stations.';
      return;
    }

    const route = router.findRoute(from, to);

    if (!route) {
      errorEl.textContent = 'No available route found or invalid station entered.';
      resultsContainer.classList.remove('active');
      return;
    }

    if (route.sameStation) {
      errorEl.textContent = 'Starting and destination stations are the same.';
      resultsContainer.classList.remove('active');
      return;
    }

    displayRouteResults(route, from, to);
  });
}

function displayRouteResults(route, start, end) {
  const resultsContainer = document.getElementById('route-results');
  const summaryEl = document.getElementById('route-summary-box');
  const timelineEl = document.getElementById('route-timeline');

  summaryEl.innerHTML = `
    <h3>Route: ${start} to ${end}</h3>
    <div class="summary-badges">
      <span class="badge">Total Stations: ${route.totalStations}</span>
      <span class="badge">Interchanges: ${route.interchanges}</span>
    </div>
  `;

  timelineEl.innerHTML = '';
  route.path.forEach((step) => {
    const div = document.createElement('div');
    div.className = `timeline-step ${step.type === 'interchange' ? 'interchange' : ''}`;
    
    let lineInfo = '';
    if (step.line && step.line !== 'interchange') {
      const lineDetails = router.getLineDetails(step.line);
      lineInfo = lineDetails ? `(${lineDetails.name})` : '';
    }

    div.innerHTML = `
      <h4>${step.station}</h4>
      <p>${step.type === 'interchange' ? 'Interchange / Line Change' : lineInfo}</p>
    `;
    timelineEl.appendChild(div);
  });

  resultsContainer.classList.add('active');
}

function selectPopularRoute(from, to) {
  document.getElementById('from-station').value = from;
  document.getElementById('to-station').value = to;
  document.getElementById('find-route-btn').click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStationsPage() {
  const container = document.getElementById('stations-list');
  if (!container) return;
  const stations = router.getAllStations();
  container.innerHTML = stations.map(s => `
    <div class="card">
      <h3>${s}</h3>
      <button onclick="navigateWithStation('${s}')" class="btn-primary" style="margin-top:0.5rem; padding:0.4rem;">Find Routes</button>
    </div>
  `).join('');
}

function navigateWithStation(station) {
  window.location.href = `index.html?from=${encodeURIComponent(station)}`;
}

function renderLinesPage() {
  const container = document.getElementById('lines-list');
  if (!container) return;
  container.innerHTML = router.lines.map(l => `
    <div class="card" style="border-left: 5px solid ${l.color}">
      <h3>${l.name}</h3>
      <p style="margin-top:0.5rem;"><strong>Stations:</strong> ${l.stations.join(' → ')}</p>
    </div>
  `).join('');
}
