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
  y: "Number of recorded mutation"
};

//Crate config Object
plotConfig = {
  maxCoord :      250,
  minCoord :      0,
  targetElement : yourDiv,
  mutationData:   "./data/muts.json",
  regionData:     "./data/regions.json",
  colorMap:       colorMap,
  legends:        legends
};

// Instantiate a plot
instance = new mutneedles(plotConfig);

// BioJS event system test
//instance=instance
