class MetroRouter {
  constructor(data) {
    this.lines = data.lines;
    this.interchanges = data.interchanges;
    this.graph = {};
    this.stationLinesMap = {};
    this.buildGraph();
  }

  buildGraph() {
    this.lines.forEach(line => {
      for (let i = 0; i < line.stations.length; i++) {
        const station = line.stations[i];
        
        if (!this.graph[station]) this.graph[station] = [];
        if (!this.stationLinesMap[station]) this.stationLinesMap[station] = new Set();
        
        this.stationLinesMap[station].add(line.id);

        if (i > 0) {
          const prev = line.stations[i - 1];
          this.graph[station].push({ node: prev, line: line.id });
        }
        if (i < line.stations.length - 1) {
          const next = line.stations[i + 1];
          this.graph[station].push({ node: next, line: line.id });
        }
      }
    });

    this.interchanges.forEach(ic => {
      const source = ic.station;
      const target = ic.connectsTo || ic.station;
      if (source !== target && this.graph[source] && this.graph[target]) {
        this.graph[source].push({ node: target, line: 'interchange' });
        this.graph[target].push({ node: source, line: 'interchange' });
      }
    });
  }

  findRoute(start, end) {
    if (!this.graph[start] || !this.graph[end]) return null;
    if (start === end) return { sameStation: true };

    const queue = [[start, [{ station: start, line: null }]]];
    const visited = new Set([start]);

    while (queue.length > 0) {
      const [current, path] = queue.shift();

      if (current === end) {
        return this.formatRoute(path);
      }

      for (const neighbor of this.graph[current]) {
        if (!visited.has(neighbor.node)) {
          visited.add(neighbor.node);
          queue.push([
            neighbor.node,
            [...path, { station: neighbor.node, line: neighbor.line }]
          ]);
        }
      }
    }
    return null;
  }

  formatRoute(path) {
    const formattedSteps = [];
    let interchangeCount = 0;

    for (let i = 0; i < path.length; i++) {
      const step = path[i];
      if (i === 0) {
        const nextLine = path[i + 1] ? path[i + 1].line : null;
        formattedSteps.push({
          station: step.station,
          line: nextLine,
          type: 'start'
        });
      } else {
        const prevLine = path[i - 1].line;
        if (step.line === 'interchange') {
          interchangeCount++;
          formattedSteps.push({
            station: step.station,
            line: 'interchange',
            type: 'interchange'
          });
        } else if (step.line !== prevLine && prevLine !== null && prevLine !== 'interchange') {
          interchangeCount++;
          formattedSteps.push({
            station: step.station,
            line: step.line,
            type: 'interchange'
          });
        } else {
          formattedSteps.push({
            station: step.station,
            line: step.line,
            type: 'pass'
          });
        }
      }
    }

    return {
      totalStations: path.length,
      interchanges: interchangeCount,
      path: formattedSteps
    };
  }

  getAllStations() {
    return Object.keys(this.graph).sort();
  }

  getLineDetails(lineId) {
    return this.lines.find(l => l.id === lineId);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MetroRouter;
}

