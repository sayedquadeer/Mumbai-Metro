document.addEventListener('DOMContentLoaded', async () => {
  const fromInput = document.getElementById('from-station');
  const toInput = document.getElementById('to-station');
  const fromList = document.getElementById('from-autocomplete-list');
  const toList = document.getElementById('to-autocomplete-list');
  const routeForm = document.getElementById('route-form');
  const resultsContainer = document.getElementById('route-results');

  // Track station selection state internally via Station IDs
  let selectedFromStationId = null;
  let selectedToStationId = null;

  // Ensure JSON data is loaded
  const dataLoaded = await MetroData.init();
  if (!dataLoaded && resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="error-card" style="padding: 1rem; background: #fee2e2; border: 1px solid #f87171; color: #991b1b; border-radius: 8px;">
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
        item.style.cssText = 'padding: 0.75rem; cursor: pointer; display: flex; justify-content: space-between; border-bottom: 1px solid #eee;';
        item.innerHTML = `
          <span class="station-name" style="font-weight: 600;">🚇 ${station.name}</span>
          <span class="station-line" style="font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">${station.line}</span>
        `;

        item.addEventListener('click', () => {
          inputEl.value = station.name;
          onSelect(station.id);
          listEl.innerHTML = '';
        });

        listEl.appendChild(item);
      });
    });

    // Handle manual text matches if user types full name without clicking
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

  setupAutocomplete(fromInput, fromList, (id) => {
    selectedFromStationId = id;
  });

  setupAutocomplete(toInput, toList, (id) => {
    selectedToStationId = id;
  });

  // Calculate and display route sequence
  function calculateRoute() {
    if (!resultsContainer) return;

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

    // Resolve Station IDs from internal selection or string lookup
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

    renderRouteResult(path);
  }

  function renderError(message) {
    resultsContainer.innerHTML = `
      <div class="route-error-card" style="margin-top: 1.5rem; padding: 1.25rem; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; color: #be123c; font-weight: 600; text-align: center;">
        ${message}
      </div>
    `;
  }

  function renderRouteResult(path) {
    let html = `
      <div class="route-result-card" style="margin-top: 2rem; background: #ffffff; border-radius: 16px; padding: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 1rem;">
          <div>
            <h3 style="margin: 0; color: #0f172a; font-size: 1.25rem;">Route Summary</h3>
            <p style="margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.9rem;">Total Stations: <strong>${path.length}</strong> | Interchanges: <strong>${countInterchanges(path)}</strong></p>
          </div>
          <span style="background: #dcfce7; color: #15803d; font-weight: 700; padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.85rem;">Shortest Path</span>
        </div>
        <div class="station-timeline" style="position: relative; padding-left: 1.5rem; border-left: 3px solid #0284c7;">
    `;

    for (let i = 0; i < path.length; i++) {
      const current = path[i];
      const prev = i > 0 ? path[i - 1] : null;
      const isInterchange = prev && prev.line !== current.line;

      if (isInterchange) {
        html += `
          <div class="interchange-badge" style="margin: 1rem 0; padding: 0.5rem 0.75rem; background: #fef3c7; border: 1px solid #fde047; color: #b45309; border-radius: 8px; font-size: 0.85rem; font-weight: 700;">
            🔄 Interchange: Switch from ${prev.line} to ${current.line}
          </div>
        `;
      }

      html += `
        <div class="timeline-item" style="position: relative; margin-bottom: 1rem;">
          <div style="position: absolute; left: -1.95rem; top: 0.25rem; width: 12px; height: 12px; border-radius: 50%; background: ${i === 0 ? '#16a34a' : i === path.length - 1 ? '#dc2626' : '#0284c7'}; border: 2px solid #fff;"></div>
          <div style="font-weight: 700; color: #0f172a; font-size: 1rem;">${current.name}</div>
          <div style="font-size: 0.8rem; color: #64748b;">${current.line}</div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    resultsContainer.innerHTML = html;
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
});
