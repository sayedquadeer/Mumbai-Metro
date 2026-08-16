const MetroData = {
  stations: [],
  connections: [],
  stationMap: new Map(),
  graph: new Map(),
  isLoaded: false,

  async init() {
    if (this.isLoaded) return true;
    try {
      const response = await fetch('./data/metro.json');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      
      this.stations = data.stations || [];
      this.connections = data.connections || [];
      this.stationMap.clear();
      this.graph.clear();

      // Index stations by ID and normalized search key
      this.stations.forEach(station => {
        const normalizedId = this.normalize(station.id);
        const normalizedName = this.normalize(station.name);
        
        const stationObj = {
          ...station,
          id: normalizedId,
          searchKey: normalizedName
        };
        
        this.stationMap.set(normalizedId, stationObj);
        if (!this.graph.has(normalizedId)) {
          this.graph.set(normalizedId, []);
        }
      });

      // Build bidirectional adjacency graph
      this.connections.forEach(([from, to]) => {
        const u = this.normalize(from);
        const v = this.normalize(to);

        if (this.graph.has(u) && this.graph.has(v)) {
          this.graph.get(u).push(v);
          this.graph.get(v).push(u);
        }
      });

      this.isLoaded = true;
      return true;
    } catch (err) {
      console.error('MetroData initialization error:', err);
      this.isLoaded = false;
      return false;
    }
  },

  normalize(str) {
    return (str || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  },

  getStationById(id) {
    return this.stationMap.get(this.normalize(id)) || null;
  },

  getStationByName(name) {
    const clean = this.normalize(name);
    for (let station of this.stationMap.values()) {
      if (station.searchKey === clean) {
        return station;
      }
    }
    return null;
  },

  searchStations(query) {
    const q = this.normalize(query);
    if (!q) return [];

    const startsWith = [];
    const includes = [];

    for (let station of this.stationMap.values()) {
      if (station.searchKey.startsWith(q) || station.id.startsWith(q)) {
        startsWith.push(station);
      } else if (station.searchKey.includes(q) || station.id.includes(q)) {
        includes.push(station);
      }
    }

    return [...startsWith, ...includes];
  },

  // Breadth-First Search Pathfinding Algorithm
  findShortestPath(startId, endId) {
    const start = this.normalize(startId);
    const end = this.normalize(endId);

    if (!this.graph.has(start) || !this.graph.has(end)) {
      return null;
    }

    if (start === end) {
      return [this.getStationById(start)];
    }

    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length > 0) {
      const path = queue.shift();
      const node = path[path.length - 1];

      const neighbors = this.graph.get(node) || [];
      for (let neighbor of neighbors) {
        if (neighbor === end) {
          const fullPath = [...path, neighbor];
          return fullPath.map(id => this.getStationById(id));
        }

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    return null; // No path found
  }
};
