// d3 & underscore are imported through the header
// import our plot-library
var mutneedles = require("muts-needle-plot");


var mutData = [];

var colorMap = {
  // mutation categories
  "missense": "yellow",
  "synonymous": "lightblue",
  "truncating": "red",
   // regions
  "X-binding": "olive",
  "region1": "olive"
};


// map of categories to a more general categorizaiont
var consequenceMap = {
  // mutation categories
  "missense_variant": "missense",
  "inframe_deletion": "missense",
  "frameshift_variant": "truncating",
  "stop_gained": "truncating",
  "stop_lost": "truncating",
  "synonymous_variant": "synonymous"
};

// category change mapper
var mapper = function(data) {
  return _.map(data, function(d) {
    d.category = consequenceMap[d.category];
    return d;
  });
};

var legends = {
  x: "Corresponding protein positions to transcript X",
  y: "Number of recorded mutation"
};

// aggregation by sum of value
var sumAggregator = function(data) {
  // aggregate
  var summed_by_type = _(data).reduce(function(mem, d) {
    mem[d.coord+ d.category] = {
      coord: d.coord,
      category: d.category,
      value: (mem[d.coord+ d.category] && mem[d.coord+ d.category].value || 0) + d.value
  };
    return mem;
  }, {});
  // unpack
  return _(summed_by_type).map(function(v, k) { return v} );
};

d3.json("./data/muts.json", function(error, data){

  var mapped = mapper(data);
  var agg_muts = sumAggregator(mapped);

  //Crate config Object
  var plotConfig = {
    maxCoord :      250,
    minCoord :      0,
    targetElement : yourDiv,
    mutationData:   agg_muts,
    //mutationData:   [{"category": "test", "coord": "99", "value": 77}],
    regionData:     "./data/regions.json",
    //regionData:     {"beautiful-region": "99-199"},
    colorMap:       colorMap,
    legends:        legends
  };

// Instantiate a plot
  var instance =new mutneedles(plotConfig);

//@biojs-instance=instance (provides the instance to the BioJS event system)

});
