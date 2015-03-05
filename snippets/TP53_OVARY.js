// import our plot-library
var mutneedles = require("muts-needle-plot");

var colorMap = {
  "missense": "yellow",
  "synonymous": "lightblue",
  "truncating": "red",
  "splice-site": "orange",
  "other": "grey"
};

var legends = {
  x: "TP53 Amino Acid sequence (ENST00000269305)",
  y: "# of mutations in TP53 in ovarian cancer"
};

//Crate config Object
var plotConfig = {
  maxCoord :      394,
  minCoord :      0,
  targetElement : yourDiv,
  mutationData:   "./data/TP53_MUTATIONS.json",
  regionData:     "./data/TP53_REGIONS.json",
  colorMap:       colorMap,
  legends:        legends,
  width: 600,
  height: 400, responsive: 'resize'
};

// Instantiate a plot
var instance = new mutneedles(plotConfig);

//@biojs-instance=instance (provides the instance to the BioJS event system)
