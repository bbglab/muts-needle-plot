// BioJS-Sniper creates the DOM-element yourDiv by default
yourDiv.innerHTML = '';

// import our plot-library
var mutneedles = require("muts-needle-plot");

colorMap = {
  "missense": "yellow",
  "synonymous": "lightblue",
  "truncating": "red",
  "splice-site": "orange",
  "other": "grey"
};

legends = {
  x: "TP53 Amino Acid sequence (ENST00000269305)",
  y: "# of mutations in TP53 in ovarian cancer"
};

//Crate config Object
plotConfig = {
  maxCoord :      394,
  minCoord :      0,
  targetElement : yourDiv,
  mutationData:   "./data/TP53_MUTATIONS.json",
  regionData:     "./data/TP53_REGIONS.json",
  colorMap:       colorMap,
  legends:        legends
};

// Instantiate a plot
instance = new mutneedles(plotConfig);

// BioJS event system test
//instance=instance
