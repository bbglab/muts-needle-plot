// BioJS-Sniper creates the DOM-element yourDiv by default
yourDiv.innerHTML = '';

// import our plot-library
var mutneedles = require("muts-needle-plot");

var target = yourDiv; // autmically generated in snippets examples
var muts = "./data/ENST00000557334.json";
var regions = [
  {"name": "dummy", "coord": "155-209"},
  {"name": "repeat", "coord": "15-20"},
  {"name": "repeat", "coord": "5-10"},
  {"name": "repeat", "coord": "25-35"}
];
var legends = {x: "KRAS-003 (ENST00000557334) AA pos", y: "Mutation Count"}
var colorMap = {
  // mutation categories
  "missense_variant": "yellow",
  "frameshift_variant": "blue",
  "stop_gained": "red",
  "stop_lost": "orange",
  "synonymous_variant": "lightblue"
};

var config = {maxCoord: 350, mutationData: muts, regionData: regions, target: target, legends: legends, colorMap: colorMap,
  width: 600, height: 450, responsive: 'resize'};

instance =  new mutneedles(config);

create_download_link = function() {
  var s = document.getElementsByTagName('svg')[0];
  var x = new XMLSerializer();
  var b64 = btoa(x.serializeToString(s));
  var a = document.createElement('a');
  a.appendChild(document.createTextNode("Download SVG"));
  a.download = 'mutations-needle-plot.svg';
  a.href = 'data:image/svg+xml;base64,\n'+b64;
  a.hreflang = 'image/svg+xml';
  document.getElementsByTagName('body')[0].appendChild(a);
};

create_download_link();

//@biojs-instance=instance (provides the instance to the BioJS event system)
