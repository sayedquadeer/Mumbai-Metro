// Central Data Loader & Verification Utility
const MetroData = {
  stations: [],
  isLoaded: false,

  async init() {
    if (this.isLoaded) return;
    try {
      const response = await fetch('data/metro.json');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      // Extract unique station entities across all configured line arrays
      const stationMap = new Map();
      
      if (data.lines && Array.isArray(data.lines)) {
        data.lines.forEach(line => {
          if (line.stations && Array.isArray(line.stations)) {
            line.stations.forEach(st => {
              const name = typeof st === 'string' ? st : st.name;
              if (name && !stationMap.has(name)) {
                stationMap.set(name, {
                  name: name,
                  line: line.name || 'Mumbai Metro'
                });
              }
            });
          }
        });
      }

      this.stations = Array.from(stationMap.values());
      this.isLoaded = true;
    } catch (err) {
      console.error('Failed to load metro station data:', err);
    }
  },

  normalize(str) {
    return (str || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  },

  searchStations(query) {
    const cleanQuery = this.normalize(query);
    if (!cleanQuery) return [];

    // Pass 1: Starts With Match
    const startsWithMatches = this.stations.filter(st => 
      this.normalize(st.name).startsWith(cleanQuery)
    );

    // Pass 2: Includes Match (excluding previous startsWith hits)
    const includesMatches = this.stations.filter(st => 
      !this.normalize(st.name).startsWith(cleanQuery) && 
      this.normalize(st.name).includes(cleanQuery)
    );

    return [...startsWithMatches, ...includesMatches];
  }
};

document.addEventListener('DOMContentLoaded', () => {
  MetroData.init();
});
