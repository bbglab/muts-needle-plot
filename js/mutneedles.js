
function MutNeedles (config) {

    this.maxCoord = config.maxCoord;                    // The maximum coord (x-axis)
    minCoord = config.minCoord || 0;                    // The minimum coord (x-axis)
    targetElement = config.targetElement || "body";     // Where to append the plot (svg)
    mutationData = config.mutationData;                 // .json file or dict
    regionData = config.regionData;                     // .json file or dict
    this.colorMap = config.colorMap || {};              // dict
    this.legends = config.legends || {
        "y": "Value",
        "x": "Coordinate"
    };

    this.width = width;
    this.height = height;
    this.buffer = 0;

    var width = this.width = 1000;
    var height = this.height = 500;
    var maxCoord = this.maxCoord;

    var buffer = 0;
    if (width >= height) {
      buffer = height / 8;
    } else {
      buffer = width / 8;
    }

    this.buffer = buffer;

    this.tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {
        return "<span>" + d.value + " " + d.category +  " at " + d.coordString + "</span>";
      });

    var svg = d3.select(targetElement).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "mutneedles");

    svg.call(this.tip);


    d3.json(regionData, function(error, json) {
        if (error) {return console.debug(error)}
        regions = json;
    });


    // define scales

    var x = d3.scale.linear()
      .domain([1, maxCoord])
      .range([buffer, width - buffer * 1.5])
      .nice();
    this.x = x;

    var y = d3.scale.linear()
      .domain([1,20])
      .range([height - buffer * 1.5, buffer])
      .nice();
    this.y = y;
    
    this.drawNeedles(svg, mutationData, regionData);

}

MutNeedles.prototype.drawRegions = function(svg, regionData) {

    var maxCoord = this.maxCoord;
    var buffer = this.buffer;
    var colors = this.colorMap;
    var y = this.y;
    var x = this.x;


    getRegionStart = function(region) {
        return parseInt(region.split("-")[0])
    };

    getRegionEnd = function(region) {
        return parseInt(region.split("-")[1])
    };

    i = 0;
    regionColors = ["yellow", "orange", "lightgreen"];
    getRegionColor = function(key) {
        if (key in colors) {
            return colors[key];
        } else {
            return regionColors[i++ % regionColors.length];
        }
    };

    var regionsBG = d3.select(".mutneedles").selectAll()
        .data([1]).enter()
        .append("rect")
          .attr("x", x(0) )
          .attr("y", y(0) + 10 )
          .attr("width", x(maxCoord) - x(0) )
          .attr("height", 10)
          .attr("class", "regionsBG");

    d3.json(regionData, function(error, regions) {
        if (error) {return console.debug(error)}

        regionList = [];
        for (key in regions) {

            regionList.push( {
                'name': key, 
                'start': getRegionStart(regions[key]),
                'end': getRegionEnd(regions[key]),
                'color': getRegionColor(key)
            });
        }

        var regions = d3.select(".mutneedles").selectAll()
            .data(regionList)
          .enter()
          .append("g")
          .attr("class", "region");

        regions.append("rect")
            .attr("x", function(r) { return x(r.start) })
            .attr("y", y(0) + 7)
            .attr("ry", "3")
            .attr("rx","3")
            .attr("width", function(r) { return x(r.end)-x(r.start) } )
            .attr("height", 16)
            .style("fill", function(data) {return data.color})
            .style("stroke", function(data) {return d3.rgb(data.color).darker()});
         
        regions.append("text")
           .attr("class", "regionName")
           .attr("text-anchor", "middle")
           .attr("x", function(r) { return  x(r.start)+(x(r.end)-x(r.start))/2 })
           .attr("y", y(0) + 16)
           .attr("dy", "0.35em")
           .style("font-size", "12px") 
           .style("text-decoration", "bold")
           .text(function(data) { return data.name } );


    });

};


MutNeedles.prototype.drawAxes = function(svg) {

    var y = this.y;
    var x = this.x;

    xAxis = d3.svg.axis().scale(x).orient("bottom");

    svg.append("svg:g")
      .attr("class", "x-axis")
      .attr("transform", "translate(0," + (this.height - this.buffer) + ")")
      .call(xAxis);

    yAxis = d3.svg.axis().scale(y).orient("left");


    svg.append("svg:g")
      .attr("class", "y-axis")
      .attr("transform", "translate(" + (this.buffer + - 10)  + ",0)")
      .call(yAxis);

    svg.append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("transform", "translate(" + (this.buffer / 3) + "," + (this.height / 2) + "), rotate(-90)")
      .text(this.legends.y);

    svg.append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("transform", "translate(" + (this.width / 2) + "," + (this.height - this.buffer / 3) + ")")
      .text(this.legends.x);
    
};



MutNeedles.prototype.needleHeadColor = function(category, colors) {

    if (category in colors) {
        return this.colors[category];
    } else {
        return "steelblue";
    }
};

MutNeedles.prototype.drawNeedles = function(svg, mutationData, regionData) {

    var y = this.y;
    var x = this.x;
    var plotter = this;

    getYAxis = function() {
        return y;
    };
 
    formatCoord = function(coord) {
       if (coord.indexOf("-") > -1) {
            coords = coord.split("-");
            // place neede at middle of affected region
            coord = Math.floor((parseInt(coords[0]) + parseInt(coords[1])) / 2);
        } else {
            coord = parseInt(coord);
        }
        return coord;
    };

    getColor = this.needleHeadColor;
    colors = this.colorMap;
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
   
    formatMutationData = function(d) {

        coordString = d.coord;
        numericCoord = formatCoord(d.coord);
        numericValue = Number(d.value);
        stickHeight = stackNeedle(numericCoord, numericValue, needlePoint);
        category = d.category || "";

        if (stickHeight + numericValue > highest) {
            // set Y-Axis always to highest available
            highest = stickHeight + numericValue;
            getYAxis().domain([0, highest + 2]);
        }


        if (numericCoord > 0) {
            return {
                category: category,
                coordString: coordString,
                coord: numericCoord,
                value: numericValue,
                stickHeight: stickHeight,
                color: getColor(category, colors)
            }
        } else {
            console.debug("discarding " + d.coord + " " + d.category)
        }
    };

 
    d3.json(mutationData, function(error, unformattedMuts) {


        muts = [];

        for (key in unformattedMuts) {
            formatted = formatMutationData(unformattedMuts[key]);
            if (formatted != undefined) {
                muts.push(formatted)
            }
        }

        var needles = d3.select(".mutneedles").selectAll()
            .data(muts).enter()
            .append("line")
               .attr("y1", function(data) { return y(data.stickHeight+data.value); })
               .attr("y2", function(data) { return y(data.stickHeight) })
               .attr("x1", function(data) { return x(data.coord) })
               .attr("x2", function(data) { return x(data.coord) })
               .attr("class", "needle-line");


        minSize = 4;
        maxSize = 10;
        headSizeScale = d3.scale.log().range([minSize,maxSize]).domain([1, highest/2]);
        headSize = function(n) {

            return d3.min([d3.max([headSizeScale(n),minSize]), maxSize]);
        }

        var needleHeads = d3.select(".mutneedles").selectAll()
            .data(muts)
          .enter().append("circle")
            .attr("cy", function(data) { return y(data.stickHeight+data.value) } )
            .attr("cx", function(data) { return x(data.coord) } )
            .attr("r", function(data) { return headSize(data.value) })
            .style("fill", function(data) { return data.color })
            .style("stroke", function(data) {return d3.rgb(data.color).darker()})
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

            // adjust y-scale according to highest value an draw the rest
            if (regionData != undefined) {
                plotter.drawRegions(svg, regionData);
            }
            plotter.drawAxes(svg);
    });

};
