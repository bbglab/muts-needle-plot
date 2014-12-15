// BioJS-Sniper creates the DOM-element yourDiv by default
yourDiv.innerHTML = '';

// import our plot-library
var mutneedles = require("muts-needle-plot");

var target = yourDiv; // autmically generated in snippets examples
var muts = "./data/ENST00000557334.json";
var regions = {"dummy": "155-209"};
var legends = {x: "KRAS-003 (ENST00000557334) AA pos", y: "Mutation Count"}
var colorMap = {
  // mutation categories
  "missense_variant": "yellow",
  "frameshift_variant": "blue",
  "stop_gained": "red",
  "stop_lost": "orange",
  "synonymous_variant": "lightblue"
};

var config = {maxCoord: 350, mutationData: muts, regionData: regions, target: target, legends: legends, colorMap: colorMap }

instance =  new mutneedles(config);

