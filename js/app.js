// Autocomplete UI Controller & Handlers
document.addEventListener('DOMContentLoaded', () => {
  const fromInput = document.getElementById('from-station');
  const toInput = document.getElementById('to-station');
  const fromList = document.getElementById('from-autocomplete-list');
  const toList = document.getElementById('to-autocomplete-list');

  function setupAutocomplete(inputEl, listEl) {
    if (!inputEl || !listEl) return;

    inputEl.addEventListener('input', async () => {
      const query = inputEl.value;
      listEl.innerHTML = '';

      if (!MetroData.isLoaded) {
        await MetroData.init();
      }

      if (!query.trim()) return;

      const matches = MetroData.searchStations(query);

      matches.forEach(match => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
          <span class="station-name">🚇 ${match.name}</span>
          <span class="station-line">${match.line}</span>
        `;

        item.addEventListener('click', () => {
          inputEl.value = match.name;
          listEl.innerHTML = '';
        });

        listEl.appendChild(item);
      });
    });
  }

  setupAutocomplete(fromInput, fromList);
  setupAutocomplete(toInput, toList);

  // Close suggestions menu when clicking outside input targets
  document.addEventListener('click', (e) => {
    if (fromInput && !fromInput.contains(e.target) && fromList && !fromList.contains(e.target)) {
      fromList.innerHTML = '';
    }
    if (toInput && !toInput.contains(e.target) && toList && !toList.contains(e.target)) {
      toList.innerHTML = '';
    }
  });
});

