// d3 & underscore are imported through the header
// import our plot-library
var mutneedles = require("muts-needle-plot");

var target = yourDiv; // autmically generated in snippets examples

var muts = [
  { coord: "148", category : "neutral", value: 3 },
  { coord: "150", category : "severe", value: 44 },
  { coord: "150", category : "mild", value: 8 },
  { coord: "152", category : "neutral", value: 2 },
  { coord: "154", category : "neutral", value: 1 },
  { coord: "155", category : "neutral", value: 3 },
  { coord: "160", category : "mild", value: 4 },
  { coord: "170", category : "severe", value: 2 },
  { coord: "171", category : "mild", value: 30 },
  { coord: "172", category : "mild", value: 50 }
];

var regions = [
  {"name": "cluster-1", "coord": "145-155"},
  {"name": "1base-region", "coord": "160-160"},
  {"name": "cluster-2", "coord": "170-172"}
];

var legends = {x: "Mutations Needle Plot", y: "# Mutations"}


var colorMap = {
  // mutation categories
  "mild": "orange",
  "severe": "red",
  "neutral": "lightblue",
  "cluster 1": "marine",
  "cluster 2": "olive"
};

var config = {maxCoord: 220, minCoord: 130, mutationData: muts, regionData: regions, target: target, legends: legends, colorMap: colorMap }

var instance =  new mutneedles(config);

//@biojs-instance=instance (provides the instance to the BioJS event system)
