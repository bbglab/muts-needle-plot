// BioJS-Sniper creates the DOM-element yourDiv by default
yourDiv.innerHTML = '';

// import our plot-library
var mutneedles = require("muts-needle-plot");

colorMap = {
  // mutation categories
  "missense_variant": "yellow",
  "frameshift_variant": "blue",
  "stop_gained": "red",
  "stop_lost": "orange",
  "synonymous_variant": "lightblue",
  // regions
  "X-binding": "olive",
  "region1": "olive"
};

legends = {
  x: "Corresponding protein positions to transcript X",
  y: "Number of recorded mutation in transcript X of Gene Y and CT Z"
};

//Crate config Object
plotConfig = {
  maxCoord :      350,
  minCoord :      0,
  targetElement : yourDiv,
  mutationData:   "./data/muts.json",
  //mutationData:   [{"category": "test", "coord": "99", "value": 77}],
  regionData:     "./data/regions.json",
  //regionData:     {"beautiful-region": "99-199"},
  colorMap:       colorMap,
  legends:        legends
};

// Instantiate a plot
p = new mutneedles(plotConfig);
