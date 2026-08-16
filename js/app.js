document.addEventListener('DOMContentLoaded', async () => {
  const fromInput = document.getElementById('from-station');
  const toInput = document.getElementById('to-station');
  const fromList = document.getElementById('from-autocomplete-list');
  const toList = document.getElementById('to-autocomplete-list');
  const routeForm = document.getElementById('route-form');
  const resultsContainer = document.getElementById('route-results');
  const routeModal = document.getElementById('route-modal');
  const modalContent = document.getElementById('modal-route-content');

  // Internal state tracking
  let selectedFromStationId = null;
  let selectedToStationId = null;

  // Initialize Data
  const dataLoaded = await MetroData.init();
  if (!dataLoaded && resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="error-card">
        ⚠️ Failed to load metro station data. Please ensure <code>./data/metro.json</code> is accessible.
      </div>
    `;
  }

  function setupAutocomplete(inputEl, listEl, onSelect) {
    if (!inputEl || !listEl) return;

    inputEl.addEventListener('input', () => {
      const query = inputEl.value;
      listEl.innerHTML = '';

      if (!query.trim()) {
        onSelect(null);
        return;
      }

      const matches = MetroData.searchStations(query);

      matches.forEach(station => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
          <span class="station-name">🚇 ${station.name}</span>
          <span class="station-line">${station.line}</span>
        `;

        item.addEventListener('click', () => {
          inputEl.value = station.name;
          onSelect(station.id);
          listEl.innerHTML = '';
        });

        listEl.appendChild(item);
      });
    });

    inputEl.addEventListener('blur', () => {
      setTimeout(() => {
        const match = MetroData.getStationByName(inputEl.value);
        if (match) {
          onSelect(match.id);
        }
        listEl.innerHTML = '';
      }, 200);
    });
  }

  setupAutocomplete(fromInput, fromList, (id) => { selectedFromStationId = id; });
  setupAutocomplete(toInput, toList, (id) => { selectedToStationId = id; });

  function calculateRoute() {
    const fromVal = fromInput ? fromInput.value.trim() : '';
    const toVal = toInput ? toInput.value.trim() : '';

    if (!fromVal) {
      renderError('Please select a starting station.');
      return;
    }

    if (!toVal) {
      renderError('Please select a destination station.');
      return;
    }

    let fromStation = selectedFromStationId ? MetroData.getStationById(selectedFromStationId) : MetroData.getStationByName(fromVal);
    let toStation = selectedToStationId ? MetroData.getStationById(selectedToStationId) : MetroData.getStationByName(toVal);

    if (!fromStation) {
      renderError(`Starting station "${fromVal}" was not found in the verified dataset.`);
      return;
    }

    if (!toStation) {
      renderError(`Destination station "${toVal}" was not found in the verified dataset.`);
      return;
    }

    if (fromStation.id === toStation.id) {
      renderError('You are already at this station.');
      return;
    }

    const path = MetroData.findShortestPath(fromStation.id, toStation.id);

    if (!path || path.length === 0) {
      renderError('No metro route found between these stations.');
      return;
    }

    renderRouteResult(path, fromStation, toStation);
  }

  function renderError(message) {
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="route-error-card">
          ${message}
        </div>
      `;
    }
  }

  function closeModal() {
    if (routeModal) {
      routeModal.classList.add('hidden');
      routeModal.setAttribute('aria-hidden', 'true');
    }
  }

  function openModal() {
    if (routeModal) {
      routeModal.classList.remove('hidden');
      routeModal.setAttribute('aria-hidden', 'false');
    }
  }

  function renderRouteResult(path, fromStation, toStation) {
    const totalStations = path.length;
    const interchangesCount = countInterchanges(path);

    let html = `
      <div class="modal-header">
        <h3>🚇 Your Mumbai Metro Route</h3>
        <button type="button" class="modal-close-icon" id="btn-close-x" aria-label="Close">✕</button>
      </div>
      
      <div class="route-meta-summary">
        <div class="meta-item"><strong>From:</strong> ${fromStation.name}</div>
        <div class="meta-item"><strong>To:</strong> ${toStation.name}</div>
        <div class="meta-details">
          <span>Total Stations: <strong>${totalStations}</strong></span>
          <span>Interchanges: <strong>${interchangesCount}</strong></span>
        </div>
      </div>

      <div class="route-timeline-container">
        <div class="timeline-line"></div>
    `;

    for (let i = 0; i < path.length; i++) {
      const current = path[i];
      const prev = i > 0 ? path[i - 1] : null;
      const isInterchange = prev && prev.line !== current.line;

      // Line Transfer Banner
      if (isInterchange) {
        html += `
          <div class="timeline-interchange-banner">
            <div class="interchange-icon">🔄</div>
            <div class="interchange-text">
              <strong>CHANGE METRO LINE</strong><br/>
              Switch from <span>${prev.line}</span> to <span>${current.line}</span> at <strong>${current.name}</strong>
            </div>
          </div>
        `;
      }

      // Timeline Station Node
      const isStart = i === 0;
      const isEnd = i === path.length - 1;
      const nodeClass = isStart ? 'node-start' : (isEnd ? 'node-end' : (isInterchange ? 'node-interchange' : 'node-step'));

      html += `
        <div class="timeline-step">
          <div class="timeline-node ${nodeClass}"></div>
          <div class="timeline-content">
            <div class="station-title">${current.name}</div>
            <div class="station-line-badge">${current.line}</div>
          </div>
        </div>
      `;
    }

    html += `
      </div>

      <div class="modal-action-buttons">
        <button type="button" id="btn-got-it" class="btn-modal-action btn-got-it">✓ GOT IT</button>
        <button type="button" id="btn-exit" class="btn-modal-action btn-exit">✕ EXIT</button>
      </div>
    `;

    modalContent.innerHTML = html;
    openModal();

    // Event Listeners for Modal Closing Controls
    document.getElementById('btn-got-it')?.addEventListener('click', closeModal);
    document.getElementById('btn-exit')?.addEventListener('click', closeModal);
    document.getElementById('btn-close-x')?.addEventListener('click', closeModal);
  }

  function countInterchanges(path) {
    let count = 0;
    for (let i = 1; i < path.length; i++) {
      if (path[i].line !== path[i - 1].line) {
        count++;
      }
    }
    return count;
  }

  // Form Submit Handlers
  if (routeForm) {
    routeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      calculateRoute();
    });
  }

  const findBtn = document.getElementById('find-route-btn');
  if (findBtn) {
    findBtn.addEventListener('click', (e) => {
      e.preventDefault();
      calculateRoute();
    });
  }

  // Click outside modal card to close
  if (routeModal) {
    routeModal.addEventListener('click', (e) => {
      if (e.target === routeModal) {
        closeModal();
      }
    });
  }
});
