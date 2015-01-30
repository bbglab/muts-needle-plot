// import our plot-library
var mutneedles = require("muts-needle-plot");

var target = yourDiv; // autmically generated in snippets examples
var muts = "./data/ENST00000557334_genomic.json";
var regions = [
  {"name": "exon1", "coord": "25403685-25403865"},
  {"name": "exon2", "coord": "25398208-25398329"},
  {"name": "exon3", "coord": "25380168-25380346"},
  {"name": "exon4", "coord": "25378548-25378707"},
  {"name": "exon5", "coord": "25357723-25362845"}
];
var legends = {x: "KRAS genomic pos", y: "Mutation Count"}
var colorMap = {
  // mutation categories
  "missense_variant": "yellow",
  "frameshift_variant": "blue",
  "stop_gained": "red",
  "stop_lost": "orange",
  "synonymous_variant": "lightblue"
};


var config = {minCoord: 25357723, maxCoord: 25403870, mutationData: muts, regionData: regions, target: target, legends: legends, colorMap: colorMap }

var instance =  new mutneedles(config);

//@biojs-instance=instance (provides the instance to the BioJS event system)
