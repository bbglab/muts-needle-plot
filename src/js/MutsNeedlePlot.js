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

    // INITIALIZATION

    var self = this;        // self = MutsNeedlePlot

    // X-coordinates
    this.maxCoord = config.maxCoord || -1;             // The maximum coord (x-axis)
    if (this.maxCoord < 0) { throw new Error("'maxCoord' must be defined initiation config!"); }
    this.minCoord = config.minCoord || 1;               // The minimum coord (x-axis)

    // data
    mutationData = config.mutationData || -1;          // .json file or dict
    if (this.maxCoord < 0) { throw new Error("'mutationData' must be defined initiation config!"); }
    regionData = config.regionData || -1;              // .json file or dict
    if (this.maxCoord < 0) { throw new Error("'regionData' must be defined initiation config!"); }
    this.totalCategCounts = {};
    this.categCounts = {};
    this.selectedNeedles = [];

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

    var maxCoord = this.maxCoord;

    var buffer = 0;
    if (width >= height) {
      buffer = height / 8;
    } else {
      buffer = width / 8;
    }

    this.buffer = buffer;

    // IIMPORT AND CONFIGURE TIPS
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
        .offset([-50, 0])
        .html(function(d) {
            return "<span> Selected coordinates<br/>" + Math.round(d.left) + " - " + Math.round(d.right) + "</span>";
        })
        .direction('n');

    // INIT SVG
    var svg;
    var topnode;
    if (config.responsive == 'resize') {
        topnode  = d3.select(targetElement).append("svg")
            .attr("width", '100%')
            .attr("height", '100%')
            .attr('viewBox','0 0 '+Math.min(width)+' '+Math.min(height))
            .attr('class', 'brush');
        svg = topnode
            .append("g")
            .attr("class", this.svgClasses)
            .attr("transform", "translate(0,0)");
    } else  {

        var svg = d3.select(targetElement).append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("class", this.svgClasses + " brush");
        topnode = svg;
    }


    svg.call(this.tip);
    svg.call(this.selectionTip);

    // DEFINE SCALES

    var x = d3.scale.linear()
      .domain([this.minCoord, this.maxCoord])
      .range([buffer * 1.5 , width - buffer])
      .nice();
    this.x = x;

    var y = d3.scale.linear()
      .domain([1,20])
      .range([height - buffer * 1.5, buffer])
      .nice();
    this.y = y;

    // CONFIGURE BRUSH
    self.selector = d3.svg.brush()
        .x(x)
        .on("brush", brushmove)
        .on("brushend", brushend);
    var selector = self.selector;

    var selectionRect = topnode
        .call(selector)
        .selectAll('.extent')
        .attr('height', 50)
        .attr('y', height-50)
        .attr('opacity', 0.2);

    selectionRect.on("mouseenter", function() {
        var selection = selector.extent();
        self.selectionTip.show({left: selection[0], right: selection[1]}, selectionRect.node());
    })
        .on("mouseout", function(){
            d3.select(".d3-tip-selection")
                .transition()
                .delay(3000)
                .duration(1000)
                .style("opacity",0)
                .style('pointer-events', 'none');
        });

    function brushmove() {

        var extent = selector.extent();
        needleHeads = d3.selectAll(".needle-head");
        selectedNeedles = [];
        categCounts = {};
        for (key in Object.keys(self.totalCategCounts)) {
            categCounts[key] = 0;
        }

        needleHeads.classed("selected", function(d) {
            is_brushed = extent[0] <= d.coord && d.coord <= extent[1];
            if (is_brushed) {
                selectedNeedles.push(d);
                categCounts[d.category] = (categCounts[d.category] || 0) + d.value;
            }
            return is_brushed;
        });

        self.trigger('needleSelectionChange', {
        selected : selectedNeedles,
            categCounts: categCounts,
            coords: extent
        });
    }

    function brushend() {
        get_button = d3.select(".clear-button");
        self.trigger('needleSelectionChangeEnd', {
            selected : selectedNeedles,
            categCounts: categCounts,
            coords: selector.extent()
        });
    }

    /// DRAW
    this.drawNeedles(svg, mutationData, regionData);


    self.on("needleSelectionChange", function (edata) {
        self.categCounts = edata.categCounts;
        self.selectedNeedles = edata.selected;
        svg.call(verticalLegend);
    });

    self.on("needleSelectionChangeEnd", function (edata) {
        self.categCounts = edata.categCounts;
        self.selectedNeedles = edata.selected;
        svg.call(verticalLegend);
    });

    self.on("needleSelectionChange", function(edata) {
            selection = edata.coords;
            if (selection[1] - selection[0] > 0) {
                self.selectionTip.show({left: selection[0], right: selection[1]}, selectionRect.node());
                d3.select(".d3-tip-selection")
                    .transition()
                    .delay(3000)
                    .duration(1000)
                    .style("opacity",0)
                    .style('pointer-events', 'none');
            } else {
                self.selectionTip.hide();
            }
        });



}

MutsNeedlePlot.prototype.drawLegend = function(svg) {

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


    var domain = self.x.domain();
    xplacement = (self.x(domain[1]) - self.x(domain[0])) * 0.75 + self.x(domain[0]);


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
    showNoShow = function(categ){
        if (_.contains(self.noshow, categ)) {
            self.noshow = _.filter(self.noshow, function(s) { return s != categ });
        } else {
            self.noshow.push(categ);
        }
        needleHeads.classed("noshow", function(d) {
            return _.contains(self.noshow, d.category);
        });
        var legendCells = d3.selectAll("g.legendCells");
        legendCells.classed("noshow", function(d) {
            return _.contains(self.noshow, d.stop[0]);
        });
    };


    verticalLegend = d3.svg.legend()
        .labelFormat(legendLabel)
        .labelClass(legendClass)
        .onLegendClick(showNoShow)
        .cellPadding(4)
        .orientation("vertical")
        .units(sum + " Mutations")
        .cellWidth(20)
        .cellHeight(12)
        .inputScale(mutsScale)
        .cellStepping(4)
        .place({x: xplacement, y: 50});

    svg.call(verticalLegend);

};

MutsNeedlePlot.prototype.drawRegions = function(svg, regionData) {

    var maxCoord = this.maxCoord;
    var minCoord = this.minCoord;
    var buffer = this.buffer;
    var colors = this.colorMap;
    var y = this.y;
    var x = this.x;

    var below = true;


    getRegionStart = function(region) {
        return parseInt(region.split("-")[0])
    };

    getRegionEnd = function(region) {
        return parseInt(region.split("-")[1])
    };

    getColor = this.colorScale;

    var bg_offset = 0;
    var region_offset = bg_offset-3
    var text_offset = bg_offset + 20;
    if (below != true) {
        text_offset = bg_offset+5;
    }

    function draw(regionList) {

        var regionsBG = d3.select(".mutneedles").selectAll()
            .data(["dummy"]).enter()
            .insert("g", ":first-child")
            .attr("class", "regionsBG")
            .append("rect")
            .attr("x", x(minCoord) )
            .attr("y", y(0) + bg_offset )
            .attr("width", x(maxCoord) - x(minCoord) )
            .attr("height", 10)
            .attr("fill", "lightgrey");


        d3.select(".extent")
            .attr("y", y(0) + region_offset - 10);


        var regions = regionsBG = d3.select(".mutneedles").selectAll()
            .data(regionList)
            .enter()
            .append("g")
            .attr("class", "regionGroup");

        regions.append("rect")
            .attr("x", function (r) {
                return x(r.start);
            })
            .attr("y", y(0) + region_offset )
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
            self.selector(d3.select(".brush").transition());
            // call extent (selection) change listeners
            self.selector.event(d3.select(".brush").transition().delay(300));

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
            .attr("y", function(r) {r.y = y(0) + text_offset; return r.y; } )
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
            svg.selectAll("text."+name)
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
            svg.selectAll("text.regionName")
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
            if (regions[key].start == regions[key].end) {
                regions[key].start -= 0.4;
                regions[key].end += 0.4;
            }
            regions[key].color = getColor(regions[key].name);
            /*regionList.push({
                'name': key,
                'start': getRegionStart(regions[key]),
                'end': getRegionEnd(regions[key]),
                'color': getColor(key)
            });*/
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


MutsNeedlePlot.prototype.drawAxes = function(svg) {

    var y = this.y;
    var x = this.x;

    xAxis = d3.svg.axis().scale(x).orient("bottom");

    svg.append("svg:g")
      .attr("class", "x-axis axis")
      .attr("transform", "translate(0," + (this.height - this.buffer) + ")")
      .call(xAxis);

    yAxis = d3.svg.axis().scale(y).orient("left");


    svg.append("svg:g")
      .attr("class", "y-axis axis")
      .attr("transform", "translate(" + (this.buffer * 1.2 + - 10)  + ",0)")
      .call(yAxis);

    // appearance for x and y legend
    d3.selectAll(".axis path")
        .attr('fill', 'none');
    d3.selectAll(".domain")
        .attr('stroke', 'black')
        .attr('stroke-width', 1);

    svg.append("text")
        .attr("class", "y-label")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + (this.buffer / 3) + "," + (this.height / 2) + "), rotate(-90)")
        .text(this.legends.y)
        .attr('font-weight', 'bold')
        .attr('font-size', 12);

    svg.append("text")
          .attr("class", "x-label")
          .attr("text-anchor", "middle")
          .attr("transform", "translate(" + (this.width / 2) + "," + (this.height - this.buffer / 3) + ")")
          .text(this.legends.x)
        .attr('font-weight', 'bold')
        .attr('font-size', 12);
    
};



MutsNeedlePlot.prototype.drawNeedles = function(svg, mutationData, regionData) {

    var y = this.y;
    var x = this.x;
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
        category = d.category || "other";

        if (stickHeight + numericValue > highest) {
            // set Y-Axis always to highest available
            highest = stickHeight + numericValue;
            getYAxis().domain([0, highest + 2]);
        }


        if (numericCoord > 0) {

            // record and count categories
            self.totalCategCounts[category] = (self.totalCategCounts[category] || 0) + numericValue;

            return {
                category: category,
                coordString: coordString,
                coord: numericCoord,
                value: numericValue,
                stickHeight: stickHeight,
                color: self.colorScale(category)
            }
        } else {
            console.debug("discarding " + d.coord + " " + d.category + "("+ numericCoord +")");
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
        headSizeScale = d3.scale.log().range([minSize,maxSize]).domain([1, highest/2]);
        var headSize = function(n) {
            return d3.min([d3.max([headSizeScale(n),minSize]), maxSize]);
        };


        var needles = d3.select(".mutneedles").selectAll()
            .data(muts).enter()
            .append("line")
            .attr("y1", function(data) { return y(data.stickHeight + data.value) + headSize(data.value) ; } )
            .attr("y2", function(data) { return y(data.stickHeight) })
            .attr("x1", function(data) { return x(data.coord) })
            .attr("x2", function(data) { return x(data.coord) })
            .attr("class", "needle-line")
            .attr("stroke", "black")
            .attr("stroke-width", 1);

        var needleHeads = d3.select(".mutneedles").selectAll()
            .data(muts)
            .enter().append("circle")
            .attr("cy", function(data) { return y(data.stickHeight+data.value) } )
            .attr("cx", function(data) { return x(data.coord) } )
            .attr("r", function(data) { return headSize(data.value) })
            .attr("class", "needle-head")
            .style("fill", function(data) { return data.color })
            .style("stroke", function(data) {return d3.rgb(data.color).darker()})
            .on('mouseover',  function(d){ d3.select(this).moveToFront(); tip.show(d); })
            .on('mouseout', tip.hide);

        d3.selection.prototype.moveToFront = function() {
            return this.each(function(){
                this.parentNode.appendChild(this);
            });
        };

        // adjust y-scale according to highest value an draw the rest
        if (regionData != undefined) {
            self.drawRegions(svg, regionData);
        }
        self.drawLegend(svg);
        self.drawAxes(svg);

        /* Bring needle heads in front of regions */
        needleHeads.each(function() {
            this.parentNode.appendChild(this);
        });
    }

};



var Events = require('biojs-events');
Events.mixin(MutsNeedlePlot.prototype);

module.exports = MutsNeedlePlot;

