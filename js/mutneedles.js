
function MutNeedles (maxCoord, target, regionData, mutationData, colorMap) {

    this.width = width;
    this.height = height;
    this.maxCoord = maxCoord;
    this.buffer = 0;
    this.colorMap = {};
    if (colorMap != undefined) {
        this.colorMap=colorMap
    }

    var width = this.width = 1000;
    var height = this.height = 500;

    if (width >= height) {
      var buffer = height / 8;
    } else {
      var buffer = width / 8;
    }

    this.buffer = buffer;

    this.tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {
        return "<span style='color:white'>" + d.value + " " + d.category +  " at " + d.coordString; + "</span>";
      })

    var svg = d3.select(target).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "mutneedles");

    svg.call(this.tip);


    d3.json(regionData, function(error, json) {
        if (error) {return console.debug(error)};
        regions = json;
        console.debug(regions);
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
    
    this.drawNeedleHeads(svg, mutationData, regionData);

}

MutNeedles.prototype.drawRegions = function(svg, regionData) {

    var maxCoord = this.maxCoord;
    var buffer = this.buffer;
    var colors = this.colorMap;
    var y = this.y;
    var x = this.x;


    getRegionStart = function(region) {
        return parseInt(region.split("-")[0])
    }

    getRegionEnd = function(region) {
        return parseInt(region.split("-")[1])
    }

    i = 0;
    regionColors = ["yellow", "orange", "lightgreen"];
    getRegionColor = function(key) {
        if (key in colors) {
            return colors[key];
        } else {
            return regionColors[i++ % regionColors.length];
        }
    }

    var regionsBG = d3.select(".mutneedles").selectAll()
        .data([1]).enter()
        .append("rect")
          .attr("x", x(0) )
          .attr("y", y(0) + 10 )
          .attr("width", x(maxCoord) - x(0) )
          .attr("height", 10)
          .attr("class", "regionsBG");

    d3.json(regionData, function(error, regions) {
        if (error) {return console.debug(error)};

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
              .attr("width", function(r) { return x(r.end)-x(r.start) } )
              .attr("height", 16)
              .style("fill", function(data) {return data.color});
         
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

}


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
      .text("Count of mutations @ Coord");

    svg.append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("transform", "translate(" + (this.width / 2) + "," + (this.height - this.buffer / 3) + ")")
      .text("Protein position for Transcript X");
    
}



MutNeedles.prototype.needleHeadColor = function(category, colors) {

    if (category in colors) {
        return this.colors[category];
    } else {
        return "steelblue";
    }
}

MutNeedles.prototype.drawNeedleHeads = function(svg, mutationData, regionData) {

    var maxCoord = this.maxCoord;
    var width = this.width;
    var height = this.height;
    var buffer = this.buffer;   
    var y = this.y;
    var x = this.x;
    var plotter = this;

    getYAxis = function() {
        return y;
    } 
 
    formatCoord = function(coord) {
       if (coord.indexOf("-") > -1) {
            coords = coord.split("-");
            // place neede at middle of affected region
            coord = Math.floor((parseInt(coords[0]) + parseInt(coords[1])) / 2);
        } else {
            coord = parseInt(coord);
        }
        return coord;
    }

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
    }
   
    formatData = function(d) {
        coordString = d.coord;
        numericCoord = formatCoord(d.coord);
        numericValue = Number(d.value);
        stickHeight = stackNeedle(numericCoord, numericValue, needlePoint);

        if (stickHeight + numericValue > highest) {
            // set Y-Axis always to highest available
            highest = stickHeight + numericValue;
            getYAxis().domain([0, highest + 2]);
            console.log("set Y axis max to " + highest )
        }


        if (numericCoord > 0) {
            return {
                category: d.category,
                coordString: coordString,
                coord: numericCoord,
                value: numericValue,
                stickHeight: stickHeight
            }
        } else {
            console.debug("discarding " + d.coord)
        }
    }

 
    d3.tsv(mutationData, formatData, function(error, muts) {

        var needles = d3.select(".mutneedles").selectAll()
            .data(muts).enter()
            .append("line")
               .attr("y1", function(data) { return y(data.stickHeight+data.value) })
               .attr("y2", function(data) { return y(data.stickHeight) })
               .attr("x1", function(data) { return x(data['coord']) })
               .attr("x2", function(data) { return x(data['coord']) })
               .attr("class", "needle-line");

      
        var needleHeads = d3.select(".mutneedles").selectAll()
            .data(muts)
          .enter().append("circle")
            .attr("cy", function(data) { return y(data.stickHeight+data.value) } )
            .attr("cx", function(data, index) { return x(data['coord']) } )
            .attr("r", function(data) { return 6; } )
            .style("fill", function(data) {
                    return getColor(data['category'], colors);
                })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

            // adjust y-scale according to highest value an draw the rest
            plotter.drawRegions(svg, regionData);
            plotter.drawAxes(svg);
    });

}
