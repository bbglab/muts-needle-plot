var mutneedles = require("mut-needles");

var target = "yourDiv"; // autmically generated in snippets examples
var muts = "data/ENST00000557334.json";
var regions = {"dummy": "55-109"};
var legends = {x: "KRAS-003 (ENST00000557334) AA pos", y: "Mutation Count"}
var config = {maxCoord: 150, mutationData: muts, regionData: regions, target: target, legends: legends}

var plot1 =  new mutneedles(config);

