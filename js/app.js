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

    // Trigger page specific renders
    if (window.location.pathname.includes('stations.html')) renderStationsPage();
    if (window.location.pathname.includes('lines.html')) renderLinesPage();
  } catch (e) {
    console.error('Failed to load metro data', e);
  }
}

function setupAutocomplete(inputId, listId) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  const stations = router.getAllStations();

  input.addEventListener('input', () => {
    const val = input.value.trim().toLowerCase();
    list.innerHTML = '';
    if (!val) {
      list.classList.remove('active');
      return;
    }

    const matches = stations.filter(s => s.toLowerCase().includes(val));
    if (matches.length > 0) {
      matches.forEach(station => {
        const li = document.createElement('li');
        li.textContent = station;
        li.addEventListener('click', () => {
          input.value = station;
          list.classList.remove('active');
        });
        list.appendChild(li);
      });
      list.classList.add('active');
    } else {
      list.classList.remove('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target !== input && e.target !== list) {
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

