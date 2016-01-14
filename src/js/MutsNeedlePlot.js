/**
 *
 * Mutations Needle Plot (muts-needle-plot)
 *
 * Creates a needle plot (a.k.a stem plot, lollipop-plot and soon also balloon plot ;-)
 * This class uses the npm-require module to load dependencies d3, d3-tip
 *
 * @author Michael P Schroeder
 * @class
 */

function MutsNeedlePlot (config) {

    // DATA INITIALIZATION AND FORMATTING //

    var self = this;        // self = MutsNeedlePlot

    // X-coordinates
    this.maxCoord = config.maxCoord || -1;             // The maximum coord (x-axis)
    if (this.maxCoord < 0) { throw new Error("'maxCoord' must be defined initiation config!"); }
    this.minCoord = config.minCoord || 1;               // The minimum coord (x-axis)

    // data
    this.mutationData = config.mutationData || -1;          // .json file or dict
    if (this.maxCoord < 0) { throw new Error("'mutationData' must be defined initiation config!"); }
    this.regionData = config.regionData || -1;              // .json file or dict
    if (this.maxCoord < 0) { throw new Error("'regionData' must be defined initiation config!"); }
    this.totalCategCounts = {};
    this.categCounts = {};
    this.selectedNeedles = [];
    this.variantDetailLink = config.variantDetailLink;

    // Plot dimensions & target
    var targetElement = document.getElementById(config.targetElement) || config.targetElement || document.body   // Where to append the plot (svg)

    var width = this.width = config.width || targetElement.offsetWidth || 1000;
    var height = this.height = config.height || targetElement.offsetHeight || 500;

    // Color scale & map
    this.colorMap = config.colorMap || {};              // dict
    var colors = Object.keys(this.colorMap).map(function (key) {
        return self.colorMap[key];
    });
    this.colorScale = d3.scale.category20()
        .domain(Object.keys(this.colorMap))
        .range(colors.concat(d3.scale.category20().range()));
    this.legends = config.legends || {
        "y": "Value",
        "x": "Coordinate"
    };

    this.svgClasses = "mutneedles";
    this.buffer = 0;

    var minCoord = this.minCoord;
    var maxCoord = this.maxCoord;

    var buffer = 0;
    if (width >= height) {
      buffer = height / 8;
    } else {
      buffer = width / 8;
    }

    this.buffer = buffer + 50;

    // IMPORT AND CONFIGURE TIPS //

    var d3tip = require('d3-tip');
    d3tip(d3);


    this.tip = d3.tip()
      .attr('class', 'd3-tip d3-tip-needle')
      .offset([-10, 0])
      .html(function(d) {
        return "<span>" + d.value + " " + d.category +  " at coord. " + d.coordString + "</span>";
      });

    this.selectionTip = d3.tip()
        .attr('class', 'd3-tip d3-tip-selection')
        .offset([-10, 0])
        .html(function(d) {
            return "<span> Selected coordinates<br/>" + Math.round(d.left) + " - " + Math.round(d.right) + "</span>";
        })
        .direction('n');
    
    // DEFINE SCALES //

    var xScale = d3.scale.linear()
      .domain([this.minCoord, this.maxCoord])
      .range([buffer * 1.5 , width - buffer])
      .nice();
    this.xScale = xScale;

    var navXScale = d3.scale.linear()
      .domain([this.minCoord, this.maxCoord])
      .range([buffer * 1.5 , width - buffer])
      .nice(); 
    this.navXScale = navXScale;   
 
    var yScale = d3.scale.linear()
      .domain([0,5])
      .range([height-50 - buffer * 3.0, buffer])
      .nice();
    this.yScale = yScale;

    // INITIALIZING THE PLOTS //

    var plotChart;
    var navChart;
    
    var plotChart = d3.select(targetElement).append("svg")
        .attr("width", width)
        .attr("height", 345)
        .attr("class", this.svgClasses)
        .append('g');
   
    var plotArea = plotChart.append('g')
        .attr('clip-path', 'url(#plotAreaClip)'); 
    
    plotArea.append('clipPath')
        .attr('id', 'plotAreaClip')
        .append('rect')
        .attr("x", (this.buffer-50)*1.2+18)
        .attr("y", 0)
        .attr({width: this.width-(this.buffer*1.3)-10, height: this.height - this.buffer - 75});
        
    var navChart = d3.select(targetElement).append("svg")
        .classed("navigator", true)
        .attr("width", width)
        .attr("height", 200)
        .attr("class", "brush");
    
    plotArea.call(this.tip);
    navChart.call(this.selectionTip);

    
    // CONFIGURE ZOOM //

    var zoom = d3.behavior.zoom()
        .x(this.xScale)
        .on('zoom', function() {
            
            if (xScale.domain()[0] < minCoord) {
                var x = zoom.translate()[0] - xScale(minCoord) + xScale.range()[0];
                zoom.translate([x, 0]);
            }
            else if (xScale.domain()[1] > maxCoord) {
                var x = zoom.translate()[0] - xScale(maxCoord) + xScale.range()[1];
                zoom.translate([x, 0]);
            } 
            redrawChart();
            updateViewportFromChart(); 
        });
    this.zoom = zoom;
    
    
    // CONFIGURE BRUSH //

    self.selector = d3.svg.brush()
        .x(navXScale)
        .on("brush", brushmove);

 
    var selector = self.selector;

    var selectionRect = navChart.append('g')
        .attr('class', 'selector')
        .style('pointer-events', 'all')
        .call(selector)
        .selectAll('.extent')
        .attr('height', 80) 
        .attr('opacity', 0.2)
        .attr('transform', 'translate(' + 0 + ',' + -30 +')');

    selectionRect.on("mouseenter", function() {
        var selection = selector.extent();
    });

    navChart.selectAll('.background')
        .attr('height', 80)
        .attr('width', this.width-(this.buffer*1.3)-10)
        .attr('y', 47)
        .style('visibility', 'visible')
        .style('fill-opacity', 0)
        .style('stroke', 'black');

    var selectedNeedles = this.selectedNeedles;

    function brushmove() {

        var extent = selector.extent();
        
         
        self.trigger('needleSelectionChange', {
            coords: extent
        });
        xScale.domain(selector.empty() ? navXScale.domain() : selector.extent());
        redrawChart();
    }

    function brushend() {

        updateZoomFromChart();
        var extent = selector.extent();
        needleHeads = d3.selectAll(".needle-head");
        needleLines = d3.selectAll(".needle-line");
        selectedNeedles = [];
        categCounts = {};
        for (key in Object.keys(self.totalCategCounts)) {
            categCounts[key] = 0;
        }

        needleHeads.classed("selected", function(d) {
            is_brushed = (extent[0] <= d.coord && d.coord <= extent[1]);
            if (is_brushed) {
                selectedNeedles.push(d);
                categCounts[d.category] = (categCounts[d.category] || 0) + d.value;
            }
            return is_brushed;
        });
        
        self.trigger('needleSelectionChangeEnd', {
            selected : selectedNeedles,
            categCounts: categCounts,
            coords: selector.extent()
        });
    }
    
    function zoomend() {

        var extent = selector.extent();
        needleHeads = d3.selectAll(".needle-head");
        needleLines = d3.selectAll(".needle-line");
        selectedNeedles = [];
        categCounts = {};
        for (key in Object.keys(self.totalCategCounts)) {
            categCounts[key] = 0;
        }

        needleHeads.classed("selected", function(d) {
            is_brushed = (extent[0] <= d.coord && d.coord <= extent[1]);
            if (is_brushed) {
                selectedNeedles.push(d);
                categCounts[d.category] = (categCounts[d.category] || 0) + d.value;
            }
            return is_brushed;
        });
        
        self.trigger('needleSelectionChangeEnd', {
            selected : selectedNeedles,
            categCounts: categCounts,
            coords: selector.extent()
        });
    }

    function redrawChart() {
        d3.selectAll('.needle-head')
            .attr("cx", function(data) { return xScale(data.coord) } );
        d3.selectAll('.needle-line')
            .attr("x1", function(data) { return xScale(data.coord) })
            .attr("x2", function(data) { return xScale(data.coord) });
        d3.selectAll(".axis path")
            .attr('fill', 'none')
            .attr('stroke','#000');
        d3.selectAll(".axis line")
            .attr('fill', 'none')
            .attr('stroke','#000');
        plotChart.select('.x.axis').call(xAxis);
    }
    
   
    function updateViewportFromChart() {
        
        if ((xScale.domain()[0] <= minCoord+1) && (xScale.domain()[1] >= maxCoord-1)) {
            selector.clear();
        } else {
            selector.extent(xScale.domain());
            selectionRect.call(selector);
        }
        
        navChart.select('.selector').call(selector);
        var selection = selector.extent();
        if (selection[1] - selection[0] > 0) {
            self.selectionTip.show({left: selection[0], right: selection[1]}, selectionRect.node());
        } else {
            self.selectionTip.hide();
        }
        zoomend();
    }

    selector.on("brushend", brushend);
   
    function updateZoomFromChart() {
        zoom.x(xScale);
        var fullDomain = maxCoord - minCoord,
            currentDomain = xScale.domain()[1] - xScale.domain()[0];

        var minScale = currentDomain / fullDomain,
            maxScale = minScale * 1000;

        selectionRect.call(selector);
        zoom.scaleExtent([minScale, maxScale]);
    }
    

    
    /// DRAW LOLLIPOPS ///
    
    this.drawNeedles(plotChart, plotArea, navChart, this.mutationData, this.regionData);
    updateViewportFromChart();
    updateZoomFromChart();

    
    self.on("needleSelectionChangeEnd", function (edata) {
        self.categCounts = edata.categCounts;
        self.selectedNeedles = edata.selected;
        plotChart.call(horizontalLegend);
    });
    
    // only show needles within the zoom boundary
    self.on("needleSelectionChange", function(edata) {
            selection = edata.coords;
            if (selection[1] - selection[0] > 0) {
                self.selectionTip.show({left: selection[0], right: selection[1]}, selectionRect.node());
            } else {
                self.selectionTip.hide();
            }
        });

}

MutsNeedlePlot.prototype.drawLegend = function(plotArea) {

    // LEGEND
    self = this;

    // prepare legend categories (correct order)
    mutCategories = [];
    categoryColors = [];
    allcategs = Object.keys(self.totalCategCounts); // random order
    orderedDeclaration = self.colorScale.domain();  // wanted order
    for (idx in orderedDeclaration) {
        c = orderedDeclaration[idx];
        if (allcategs.indexOf(c) > -1) {
            mutCategories.push(c);
            categoryColors.push(self.colorScale(c))
        }
    }

    // create scale with correct order of categories
    mutsScale = self.colorScale.domain(mutCategories).range(categoryColors);


    var domain = self.xScale.domain();
    xplacement = (self.xScale(domain[0])+20);


    var sum = 0;
    for (var c in self.totalCategCounts) {
        sum += self.totalCategCounts[c];
    }

    legendLabel = function(categ) {
        var count = (self.categCounts[categ] || (self.selectedNeedles.length == 0 && self.totalCategCounts[categ]) || 0);
        return  categ + (count > 0 ? ": "+count+" (" + Math.round(count/sum*100) + "%)" : "");
    };

    legendClass = function(categ) {
        var count = (self.categCounts[categ] || (self.selectedNeedles.length == 0 && self.totalCategCounts[categ]) || 0);
        return (count > 0) ? "" : "nomuts";
    };

    self.noshow = [];
    var needleHeads = d3.selectAll(".needle-head");
    var needleLines = d3.selectAll(".needle-line");
    showNoShow = function(categ){
        if (_.contains(self.noshow, categ)) {
            self.noshow = _.filter(self.noshow, function(s) { return s != categ });
        } else {
            self.noshow.push(categ);
        }
        needleHeads.classed("noshow", function(d) {
            return _.contains(self.noshow, d.category);
        });
        needleLines.classed("noshow", function(d) {
            return _.contains(self.noshow, d.category);
        });
        var legendCells = d3.selectAll("g.legendCells");
        legendCells.classed("noshowLegend", function(d) {
            return _.contains(self.noshow, d.stop[0]);
        });
    };


    horizontalLegend = d3.svg.legend()
        .labelFormat(legendLabel)
        .labelClass(legendClass)
        .onLegendClick(showNoShow)
        .cellPadding(4)
        .orientation("horizontal")
        .units(sum + " Variants")
        .cellWidth(20)
        .cellHeight(12)
        .inputScale(mutsScale)
        .cellStepping(4)
        .place({x: xplacement, y: 60});

    plotArea.call(horizontalLegend);

};

MutsNeedlePlot.prototype.drawRegions = function(navChart, regionData) {

    var maxCoord = this.maxCoord;
    var minCoord = this.minCoord;
    var width = this.width;
    var buffer = this.buffer;
    var colors = this.colorMap;
    var y = this.yScale;
    var x = this.xScale;

    var below = true;


    getRegionStart = function(region) {
        return parseInt(region.split("-")[0])
    };

    getRegionEnd = function(region) {
        return parseInt(region.split("-")[1])
    };

    getColor = this.colorScale;

    var bg_offset = 90;
    var region_offset = bg_offset-3
    var text_offset = bg_offset + 20;
    if (below != true) {
        text_offset = bg_offset+5;
    }

    function draw(regionList) {

        var regionsBG = navChart.selectAll()
            .data(["dummy"]).enter()
            .insert("g", ":first-child")
            .attr("class", "regionsBG")
            .append("rect")
            .attr("x", x(minCoord) )
            .attr("y", bg_offset)
            .attr("width", width-(buffer*1.3)-10)
            .attr("height", 10)
            .attr("fill", "lightgrey");


        d3.select(".extent")
            .attr("y", region_offset - 10);


        var regions = d3.select(".brush").selectAll()
            .data(regionList)
            .enter()
            .append("g")
            .attr("class", "regionGroup");

        regions.append("rect")
            .attr("x", function (r) {
                return x(r.start);
            })
            .attr("y", region_offset )
            .attr("ry", "3")
            .attr("rx", "3")
            .attr("width", function (r) {
                return x(r.end) - x(r.start)
            })
            .attr("height", 16)
            .style("fill", function (data) {
                return data.color
            })
            .style("stroke", function (data) {
                return d3.rgb(data.color).darker()
            });

        regions
            .attr('pointer-events', 'all')
            .attr('cursor', 'pointer')
            .on("click",  function(r) {
            
            // set custom selection extent
            self.selector.extent([r.start, r.end]);
            // call the extent to change with transition
            self.selector(d3.select(".selector").transition());
            // call extent (selection) change listeners
            self.selector.event(d3.select(".selector").transition());
            //self.selector(d3.select(".brush").style('pointer-events', 'none'));
            self.selector.event(d3.select(".background").style('pointer-events', 'all'));
        });

        // Place and label location
        var labels = [];

        var repeatedRegion = {};
        var getRegionClass = function(region) {
            var c = "regionName";
            var repeatedClass = "RR_"+region.name;
            if(_.has(repeatedRegion, region.name)) {
                c = "repeatedName noshow " + repeatedClass;
            }
            repeatedRegion[region.name] = repeatedClass;
            return c;
        };
        regions.append("text")
            .attr("class", getRegionClass)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .attr("opacity", 0.5)
            .attr("x", function (r) {
                r.x = x(r.start) + (x(r.end) - x(r.start)) / 2;
                return r.x;
            })
            .attr("y", function(r) {r.y = text_offset; return r.y; } )
            .attr("dy", "0.35em")
            .style("font-size", "12px")
            .style("text-decoration", "bold")
            .text(function (data) {
                return data.name
            });

        var regionNames = d3.selectAll(".regionName");
        regionNames.each(function(d, i) {
            var interactionLength = this.getBBox().width / 2;
            labels.push({x: d.x, y: d.y, label: d.name, weight: d.name.length, radius: interactionLength});
        });

        var force = d3.layout.force()
            .chargeDistance(5)
            .nodes(labels)
            .charge(-10)
            .gravity(0);

        var minX = x(minCoord);
        var maxX = x(maxCoord);
        var withinBounds = function(x) {
            return d3.min([
                d3.max([
                    minX,
                    x]),
                maxX
            ]);
        };
        function collide(node) {
            var r = node.radius + 3,
                nx1 = node.x - r,
                nx2 = node.x + r,
                ny1 = node.y - r,
                ny2 = node.y + r;
            return function(quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== node)) {
                    var l = node.x - quad.point.x,
                        x = l;
                    r = node.radius + quad.point.radius;
                    if (Math.abs(l) < r) {
                        l = (l - r) / l * .005;
                        x *= l;
                        x =  (node.x > quad.point.x && x < 0) ? -x : x;
                        node.x += x;
                        quad.point.x -= x;
                    }
                }
                return x1 > nx2
                    || x2 < nx1
                    || y1 > ny2
                    || y2 < ny1;
            };
        }
        var moveRepeatedLabels = function(label, x) {
            var name = repeatedRegion[label];
            navChart.selectAll("text."+name)
                .attr("x", newx);
        };
        force.on("tick", function(e) {
            var q = d3.geom.quadtree(labels),
                i = 0,
                n = labels.length;
            while (++i < n) {
                q.visit(collide(labels[i]));
            }
            // Update the position of the text element
            var i = 0;
            navChart.selectAll("text.regionName")
                .attr("x", function(d) {
                    newx = labels[i++].x;
                    moveRepeatedLabels(d.name, newx);
                    return newx;
                }
            );
        });
        force.start();
    }

    function formatRegions(regions) {
        for (key in Object.keys(regions)) {
            regions[key].start = getRegionStart(regions[key].coord);
            regions[key].end = getRegionEnd(regions[key].coord);
            regions[key].color = getColor(regions[key].name);
        }
        return regions;
    }

    if (typeof regionData == "string") {
        // assume data is in a file
        d3.json(regionData, function(error, regions) {
            if (error) {return console.debug(error)}
            regionList = formatRegions(regions);
            draw(regionList);
        });
    } else {
        regionList = formatRegions(regionData);
        draw(regionList);
    }

};


MutsNeedlePlot.prototype.drawAxes = function(plotChart, navChart) {

    var y = this.yScale;
    var x = this.xScale;

    xAxis = d3.svg.axis().scale(x).ticks(8).orient("bottom");

    plotChart.append("svg:g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + (this.height - this.buffer - 75) + ")")
      .call(xAxis);

    yAxis = d3.svg.axis().scale(y).orient("left").ticks(3).tickFormat(function(d) {
        var yAxisLabel = ""; 
        if (d == "1.0") {
            yAxisLabel = "Uncertain";
        } else if (d == "2.0") {
            yAxisLabel = "Benign";
        } else if (d == "3.0") {
            yAxisLabel = "Pathogenic";
        } 
        
        return yAxisLabel;
    });

    plotChart.append("svg:g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + ((this.buffer - 50) * 1.2 + 5)  + "," + (50) + ")")
      .call(yAxis);

    // lower chart x axis drawing
    navXAxis = d3.svg.axis().scale(x).orient("bottom");

    navChart.append("svg:g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + (200 - this.buffer + 40) + ")")
      .call(navXAxis);

    // appearance for x and y legend
    d3.selectAll(".axis path")
        .attr('fill', 'none')
        .attr('stroke','#000');
    d3.selectAll(".axis line")
        .attr('fill', 'none')
        .attr('stroke','#000');
    d3.selectAll(".domain")
        .attr('stroke', 'black')
        .attr('stroke-width', 1);

    plotChart.append("text")
        .attr("class", "y-label")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + (this.buffer / 3) + "," + (this.height / 2) + "), rotate(-90)")
        .text(this.legends.y)
        .attr('font-weight', 'bold')
        .attr('font-size', 12);

    navChart.append("text")
          .attr("class", "x-label")
          .attr("text-anchor", "middle")
          .attr("transform", "translate(" + (this.width / 2) + "," + ((200+15) - this.buffer / 3) + ")")
          .text(this.legends.x)
        .attr('font-weight', 'bold')
        .attr('font-size', 12);
    
};

MutsNeedlePlot.prototype.drawNeedles = function(plotChart, plotArea, navChart, mutationData, regionData) {

    var y = this.yScale;
    var x = this.xScale;
    var variantDetailLink = this.variantDetailLink;
    var self = this;
   
    getYAxis = function() {
        return y;
    };

    formatCoord = function(coord) {
       if (coord.indexOf("-") > -1) {
           coords = coord.split("-");

           // place neede at middle of affected region
           coord = Math.floor((parseInt(coords[0]) + parseInt(coords[1])) / 2);

           // check for splice sites: "?-9" or "9-?"
           if (isNaN(coord)) {
               if (coords[0] == "?") { coord = parseInt(coords[1]) }
               else if (coords [1] == "?") { coord = parseInt(coords[0]) }
           }
        } else {
            coord = parseInt(coord);
        }
        return coord;
    };

    tip = this.tip;
    selectionTip = this.selectionTip;

    // stack needles at same pos
    needlePoint = {};
    highest = 0;

    stackNeedle = function(pos,value,pointDict) {
      stickHeight = 0;
      pos = "p"+String(pos);
      if (pos in pointDict) {
         stickHeight = pointDict[pos];
         newHeight = stickHeight + value;
         pointDict[pos] = newHeight;
      } else {
         pointDict[pos] = value;
      }
      return stickHeight;
    };

    function formatMutationEntry(d) {

        coordString = d.coord;
        numericCoord = formatCoord(d.coord);
        numericValue = Number(d.value);
        stickHeight = stackNeedle(numericCoord, numericValue, needlePoint);
        
        //Modify height parameter to instead match pathogenicity state
        stickHeight = 0;
        if (d.category == 'Uncertain') {
            stickHeight = 1;
        } else if (d.category == 'Benign') {
            stickHeight = 2;
        } else if (d.category == 'Pathogenic') {
            stickHeight = 3;
        }
        
        category = d.category || "other";
        
        if (stickHeight + numericValue > highest) {
            getYAxis().domain([0, 3]);
        }


        if (numericCoord > 0 && ( self.navXScale.domain()[0] <= numericCoord && numericCoord <= self.navXScale.domain()[1])) {

            // record and count categories
            self.totalCategCounts[category] = (self.totalCategCounts[category] || 0) + numericValue;

            return {
                category: category,
                coordString: coordString,
                coord: numericCoord,
                value: numericValue,
                stickHeight: stickHeight,
                color: self.colorScale(category),
                oldData: d.oldData
            }
        } else {
            //console.debug("discarding " + d.coord + " " + d.category + "("+ numericCoord +")");
        }
    }

    var muts = [];


    if (typeof mutationData == "string") {
        d3.json(mutationData, function(error, unformattedMuts) {
            if (error) {
                 throw new Error(error);
            }
            muts = prepareMuts(unformattedMuts);
            paintMuts(muts);
        });
    } else {
        muts = prepareMuts(mutationData);
        paintMuts(muts);
    }

    function prepareMuts(unformattedMuts) {
        for (key in unformattedMuts) {
            formatted = formatMutationEntry(unformattedMuts[key]);
            if (formatted != undefined) {
                muts.push(formatted);
            }
        }
        return muts;
    }


    function paintMuts(muts) {
        minSize = 4;
        maxSize = 10;
        headSizeScale = d3.scale.log().range([minSize,maxSize]).domain([1, (highest+2)/2]);
        var headSize = function(n) {
            return d3.min([d3.max([headSizeScale(n),minSize]), maxSize]);
        };

        var needles = plotArea.selectAll()
            .data(muts).enter()
            .append("line")
            .attr("y1", function(data) { return y(data.stickHeight)+50 + headSize(data.value) ; } )
            .attr("y2", function(data) { return y(0)+50 })
            .attr("x1", function(data) { return x(data.coord) })
            .attr("x2", function(data) { return x(data.coord) })
            .attr("class", "needle-line")
            .attr("stroke", "black")
            .attr("stroke-width", 1);
        
        plotArea.append('rect')
            .attr('class', 'overlay')
            .attr("x", (self.buffer-50)*1.2 + 18)
            .attr("y", 0)
            .attr("width", self.width-(self.buffer*1.3)-10)
            .attr("height", self.height - self.buffer - 75)
            .attr("opacity", 0)
            .call(self.zoom);

        var needleHeads = plotArea.selectAll()
            .data(muts)
            .enter()
            .append("circle")
                .attr("cy", function(data) { return y(data.stickHeight)+50 } )
                .attr("cx", function(data) { return x(data.coord) } )
                .attr("r", function(data) { return headSize(data.value) })
                .attr("class", "needle-head")
                .style("fill", function(data) { return data.color })
                .style("stroke", function(data) {return d3.rgb(data.color).darker()})
                .on('mouseover', function(data){ d3.select(this).moveToFront(); tip.show(data); })
                .on('mouseout', tip.hide)
                .attr('pointer-events', 'all')
                .attr('cursor', 'pointer')
                .on('click', function(data) { 
                    selectionTip.hide();
                    self.variantDetailLink(data.oldData); });

        d3.selection.prototype.moveToFront = function() {
            return this.each(function(){
                this.parentNode.appendChild(this);
            });
        };

        // adjust y-scale according to highest value an draw the rest
        if (regionData != undefined) {
            self.drawRegions(navChart, regionData);
        }
        self.drawLegend(plotArea);
        self.drawAxes(plotChart, navChart);

        /* Bring needle heads in front of regions */
        needleHeads.each(function() {
            this.parentNode.appendChild(this);
        });
    }

};



var Events = require('biojs-events');
Events.mixin(MutsNeedlePlot.prototype);

module.exports = MutsNeedlePlot;

