require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// d3.tip
// Copyright (c) 2013 Justin Palmer
//
// Tooltips for d3.js SVG visualizations

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module with d3 as a dependency.
    define(['d3'], factory)
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = function(d3) {
      d3.tip = factory(d3)
      return d3.tip
    }
  } else {
    // Browser global.
    root.d3.tip = factory(root.d3)
  }
}(this, function (d3) {

  // Public - contructs a new tooltip
  //
  // Returns a tip
  return function() {
    var direction = d3_tip_direction,
        offset    = d3_tip_offset,
        html      = d3_tip_html,
        node      = initNode(),
        svg       = null,
        point     = null,
        target    = null

    function tip(vis) {
      svg = getSVGNode(vis)
      point = svg.createSVGPoint()
      document.body.appendChild(node)
    }

    // Public - show the tooltip on the screen
    //
    // Returns a tip
    tip.show = function() {
      var args = Array.prototype.slice.call(arguments)
      if(args[args.length - 1] instanceof SVGElement) target = args.pop()

      var content = html.apply(this, args),
          poffset = offset.apply(this, args),
          dir     = direction.apply(this, args),
          nodel   = d3.select(node),
          i       = directions.length,
          coords,
          scrollTop  = document.documentElement.scrollTop || document.body.scrollTop,
          scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft

      nodel.html(content)
        .style({ opacity: 1, 'pointer-events': 'all' })

      while(i--) nodel.classed(directions[i], false)
      coords = direction_callbacks.get(dir).apply(this)
      nodel.classed(dir, true).style({
        top: (coords.top +  poffset[0]) + scrollTop + 'px',
        left: (coords.left + poffset[1]) + scrollLeft + 'px'
      })

      return tip
    }

    // Public - hide the tooltip
    //
    // Returns a tip
    tip.hide = function() {
      var nodel = d3.select(node)
      nodel.style({ opacity: 0, 'pointer-events': 'none' })
      return tip
    }

    // Public: Proxy attr calls to the d3 tip container.  Sets or gets attribute value.
    //
    // n - name of the attribute
    // v - value of the attribute
    //
    // Returns tip or attribute value
    tip.attr = function(n, v) {
      if (arguments.length < 2 && typeof n === 'string') {
        return d3.select(node).attr(n)
      } else {
        var args =  Array.prototype.slice.call(arguments)
        d3.selection.prototype.attr.apply(d3.select(node), args)
      }

      return tip
    }

    // Public: Proxy style calls to the d3 tip container.  Sets or gets a style value.
    //
    // n - name of the property
    // v - value of the property
    //
    // Returns tip or style property value
    tip.style = function(n, v) {
      if (arguments.length < 2 && typeof n === 'string') {
        return d3.select(node).style(n)
      } else {
        var args =  Array.prototype.slice.call(arguments)
        d3.selection.prototype.style.apply(d3.select(node), args)
      }

      return tip
    }

    // Public: Set or get the direction of the tooltip
    //
    // v - One of n(north), s(south), e(east), or w(west), nw(northwest),
    //     sw(southwest), ne(northeast) or se(southeast)
    //
    // Returns tip or direction
    tip.direction = function(v) {
      if (!arguments.length) return direction
      direction = v == null ? v : d3.functor(v)

      return tip
    }

    // Public: Sets or gets the offset of the tip
    //
    // v - Array of [x, y] offset
    //
    // Returns offset or
    tip.offset = function(v) {
      if (!arguments.length) return offset
      offset = v == null ? v : d3.functor(v)

      return tip
    }

    // Public: sets or gets the html value of the tooltip
    //
    // v - String value of the tip
    //
    // Returns html value or tip
    tip.html = function(v) {
      if (!arguments.length) return html
      html = v == null ? v : d3.functor(v)

      return tip
    }

    function d3_tip_direction() { return 'n' }
    function d3_tip_offset() { return [0, 0] }
    function d3_tip_html() { return ' ' }

    var direction_callbacks = d3.map({
      n:  direction_n,
      s:  direction_s,
      e:  direction_e,
      w:  direction_w,
      nw: direction_nw,
      ne: direction_ne,
      sw: direction_sw,
      se: direction_se
    }),

    directions = direction_callbacks.keys()

    function direction_n() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.n.y - node.offsetHeight,
        left: bbox.n.x - node.offsetWidth / 2
      }
    }

    function direction_s() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.s.y,
        left: bbox.s.x - node.offsetWidth / 2
      }
    }

    function direction_e() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.e.y - node.offsetHeight / 2,
        left: bbox.e.x
      }
    }

    function direction_w() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.w.y - node.offsetHeight / 2,
        left: bbox.w.x - node.offsetWidth
      }
    }

    function direction_nw() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.nw.y - node.offsetHeight,
        left: bbox.nw.x - node.offsetWidth
      }
    }

    function direction_ne() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.ne.y - node.offsetHeight,
        left: bbox.ne.x
      }
    }

    function direction_sw() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.sw.y,
        left: bbox.sw.x - node.offsetWidth
      }
    }

    function direction_se() {
      var bbox = getScreenBBox()
      return {
        top:  bbox.se.y,
        left: bbox.e.x
      }
    }

    function initNode() {
      var node = d3.select(document.createElement('div'))
      node.style({
        position: 'absolute',
        top: 0,
        opacity: 0,
        'pointer-events': 'none',
        'box-sizing': 'border-box'
      })

      return node.node()
    }

    function getSVGNode(el) {
      el = el.node()
      if(el.tagName.toLowerCase() === 'svg')
        return el

      return el.ownerSVGElement
    }

    // Private - gets the screen coordinates of a shape
    //
    // Given a shape on the screen, will return an SVGPoint for the directions
    // n(north), s(south), e(east), w(west), ne(northeast), se(southeast), nw(northwest),
    // sw(southwest).
    //
    //    +-+-+
    //    |   |
    //    +   +
    //    |   |
    //    +-+-+
    //
    // Returns an Object {n, s, e, w, nw, sw, ne, se}
    function getScreenBBox() {
      var targetel   = target || d3.event.target;

      while ('undefined' === typeof targetel.getScreenCTM && 'undefined' === targetel.parentNode) {
          targetel = targetel.parentNode;
      }

      var bbox       = {},
          matrix     = targetel.getScreenCTM(),
          tbbox      = targetel.getBBox(),
          width      = tbbox.width,
          height     = tbbox.height,
          x          = tbbox.x,
          y          = tbbox.y

      point.x = x
      point.y = y
      bbox.nw = point.matrixTransform(matrix)
      point.x += width
      bbox.ne = point.matrixTransform(matrix)
      point.y += height
      bbox.se = point.matrixTransform(matrix)
      point.x -= width
      bbox.sw = point.matrixTransform(matrix)
      point.y -= height / 2
      bbox.w  = point.matrixTransform(matrix)
      point.x += width
      bbox.e = point.matrixTransform(matrix)
      point.x -= width / 2
      point.y -= height / 2
      bbox.n = point.matrixTransform(matrix)
      point.y += height
      bbox.s = point.matrixTransform(matrix)

      return bbox
    }

    return tip
  };

}));

},{}],2:[function(require,module,exports){
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

    // Initialization

    // X-coordinates
    this.maxCoord = config.maxCoord || -1;             // The maximum coord (x-axis)
    if (this.maxCoord < 0) { throw new Error("'maxCoord' must be defined initiation config!"); }
    this.minCoord = config.minCoord || 1;               // The minimum coord (x-axis)

    // data
    mutationData = config.mutationData || -1;          // .json file or dict
    if (this.maxCoord < 0) { throw new Error("'mutationData' must be defined initiation config!"); }
    regionData = config.regionData || -1;              // .json file or dict
    if (this.maxCoord < 0) { throw new Error("'regionData' must be defined initiation config!"); }

    // Plot dimensions & target
    var targetElement = document.getElementById(config.targetElement) || config.targetElement || document.body   // Where to append the plot (svg)

    var width = this.width = config.width || targetElement.offsetWidth || 1000;
    var height = this.height = config.height || targetElement.offsetHeight || 500;

    // Misc
    this.colorMap = config.colorMap || {};              // dict
    this.legends = config.legends || {
        "y": "Value",
        "x": "Coordinate"
    };

    this.buffer = 0;

    var maxCoord = this.maxCoord;

    var buffer = 0;
    if (width >= height) {
      buffer = height / 8;
    } else {
      buffer = width / 8;
    }

    this.buffer = buffer;

    // import tips to d3
    var d3tip = require('d3-tip');
    d3tip(d3);    


    this.tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {
        return "<span>" + d.value + " " + d.category +  " at coord. " + d.coordString + "</span>";
      });

    var svg = d3.select(targetElement).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "mutneedles");

    svg.call(this.tip);

    // define scales

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
    
    this.drawNeedles(svg, mutationData, regionData);

}

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

    i = 0;
    regionColors = ["yellow", "orange", "lightgreen"];
    getRegionColor = function(key) {
        if (key in colors) {
            return colors[key];
        } else {
            return regionColors[i++ % regionColors.length];
        }
    };

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
            .attr("height", 10);


        var regions = regionsBG = d3.select(".mutneedles").selectAll()
            .data(regionList)
            .enter()
            .append("g")
            .attr("class", "regionGroup");

        regions.append("rect")
            .attr("x", function (r) {
                return x(r.start)
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

        regions.append("text")
            .attr("class", "regionName")
            .attr("text-anchor", "middle")
            .attr("x", function (r) {
                return x(r.start) + (x(r.end) - x(r.start)) / 2
            })
            .attr("y", y(0) + text_offset)
            .attr("dy", "0.35em")
            .style("font-size", "12px")
            .style("text-decoration", "bold")
            .text(function (data) {
                return data.name
            });
    }

    function formatRegions(regions) {
        regionList = [];
        for (key in regions) {

            regionList.push({
                'name': key,
                'start': getRegionStart(regions[key]),
                'end': getRegionEnd(regions[key]),
                'color': getRegionColor(key)
            });
        }
        return regionList;
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
      .attr("class", "x-axis")
      .attr("transform", "translate(0," + (this.height - this.buffer) + ")")
      .call(xAxis);

    yAxis = d3.svg.axis().scale(y).orient("left");


    svg.append("svg:g")
      .attr("class", "y-axis")
      .attr("transform", "translate(" + (this.buffer * 1.2 + - 10)  + ",0)")
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



MutsNeedlePlot.prototype.needleHeadColor = function(category, colors) {

    if (category in colors) {
        return this.colors[category];
    } else {
        return "steelblue";
    }
};

MutsNeedlePlot.prototype.drawNeedles = function(svg, mutationData, regionData) {

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

    function formatMutationEntry(d) {

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
        };

        var needleHeads = d3.select(".mutneedles").selectAll()
            .data(muts)
            .enter().append("circle")
            .attr("cy", function(data) { return y(data.stickHeight+data.value) } )
            .attr("cx", function(data) { return x(data.coord) } )
            .attr("r", function(data) { return headSize(data.value) })
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
            plotter.drawRegions(svg, regionData);
        }
        plotter.drawAxes(svg);
    }

};

module.exports = MutsNeedlePlot;


},{"d3-tip":1}],"muts-needle-plot":[function(require,module,exports){
module.exports = require("./src/js/MutsNeedlePlot.js");

},{"./src/js/MutsNeedlePlot.js":2}]},{},["muts-needle-plot"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9tc2Nocm9lZGVyL0RvY3VtZW50cy9wcm9qZWN0cy9uZWVkbGVwbG90L25vZGVfbW9kdWxlcy9kMy10aXAvaW5kZXguanMiLCIvaG9tZS9tc2Nocm9lZGVyL0RvY3VtZW50cy9wcm9qZWN0cy9uZWVkbGVwbG90L3NyYy9qcy9NdXRzTmVlZGxlUGxvdC5qcyIsIi4vaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1lBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gZDMudGlwXG4vLyBDb3B5cmlnaHQgKGMpIDIwMTMgSnVzdGluIFBhbG1lclxuLy9cbi8vIFRvb2x0aXBzIGZvciBkMy5qcyBTVkcgdmlzdWFsaXphdGlvbnNcblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUgd2l0aCBkMyBhcyBhIGRlcGVuZGVuY3kuXG4gICAgZGVmaW5lKFsnZDMnXSwgZmFjdG9yeSlcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkMykge1xuICAgICAgZDMudGlwID0gZmFjdG9yeShkMylcbiAgICAgIHJldHVybiBkMy50aXBcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWwuXG4gICAgcm9vdC5kMy50aXAgPSBmYWN0b3J5KHJvb3QuZDMpXG4gIH1cbn0odGhpcywgZnVuY3Rpb24gKGQzKSB7XG5cbiAgLy8gUHVibGljIC0gY29udHJ1Y3RzIGEgbmV3IHRvb2x0aXBcbiAgLy9cbiAgLy8gUmV0dXJucyBhIHRpcFxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRpcmVjdGlvbiA9IGQzX3RpcF9kaXJlY3Rpb24sXG4gICAgICAgIG9mZnNldCAgICA9IGQzX3RpcF9vZmZzZXQsXG4gICAgICAgIGh0bWwgICAgICA9IGQzX3RpcF9odG1sLFxuICAgICAgICBub2RlICAgICAgPSBpbml0Tm9kZSgpLFxuICAgICAgICBzdmcgICAgICAgPSBudWxsLFxuICAgICAgICBwb2ludCAgICAgPSBudWxsLFxuICAgICAgICB0YXJnZXQgICAgPSBudWxsXG5cbiAgICBmdW5jdGlvbiB0aXAodmlzKSB7XG4gICAgICBzdmcgPSBnZXRTVkdOb2RlKHZpcylcbiAgICAgIHBvaW50ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KClcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICB9XG5cbiAgICAvLyBQdWJsaWMgLSBzaG93IHRoZSB0b29sdGlwIG9uIHRoZSBzY3JlZW5cbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuc2hvdyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgICBpZihhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB0YXJnZXQgPSBhcmdzLnBvcCgpXG5cbiAgICAgIHZhciBjb250ZW50ID0gaHRtbC5hcHBseSh0aGlzLCBhcmdzKSxcbiAgICAgICAgICBwb2Zmc2V0ID0gb2Zmc2V0LmFwcGx5KHRoaXMsIGFyZ3MpLFxuICAgICAgICAgIGRpciAgICAgPSBkaXJlY3Rpb24uYXBwbHkodGhpcywgYXJncyksXG4gICAgICAgICAgbm9kZWwgICA9IGQzLnNlbGVjdChub2RlKSxcbiAgICAgICAgICBpICAgICAgID0gZGlyZWN0aW9ucy5sZW5ndGgsXG4gICAgICAgICAgY29vcmRzLFxuICAgICAgICAgIHNjcm9sbFRvcCAgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wIHx8IGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wLFxuICAgICAgICAgIHNjcm9sbExlZnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnRcblxuICAgICAgbm9kZWwuaHRtbChjb250ZW50KVxuICAgICAgICAuc3R5bGUoeyBvcGFjaXR5OiAxLCAncG9pbnRlci1ldmVudHMnOiAnYWxsJyB9KVxuXG4gICAgICB3aGlsZShpLS0pIG5vZGVsLmNsYXNzZWQoZGlyZWN0aW9uc1tpXSwgZmFsc2UpXG4gICAgICBjb29yZHMgPSBkaXJlY3Rpb25fY2FsbGJhY2tzLmdldChkaXIpLmFwcGx5KHRoaXMpXG4gICAgICBub2RlbC5jbGFzc2VkKGRpciwgdHJ1ZSkuc3R5bGUoe1xuICAgICAgICB0b3A6IChjb29yZHMudG9wICsgIHBvZmZzZXRbMF0pICsgc2Nyb2xsVG9wICsgJ3B4JyxcbiAgICAgICAgbGVmdDogKGNvb3Jkcy5sZWZ0ICsgcG9mZnNldFsxXSkgKyBzY3JvbGxMZWZ0ICsgJ3B4J1xuICAgICAgfSlcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYyAtIGhpZGUgdGhlIHRvb2x0aXBcbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuaGlkZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vZGVsID0gZDMuc2VsZWN0KG5vZGUpXG4gICAgICBub2RlbC5zdHlsZSh7IG9wYWNpdHk6IDAsICdwb2ludGVyLWV2ZW50cyc6ICdub25lJyB9KVxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogUHJveHkgYXR0ciBjYWxscyB0byB0aGUgZDMgdGlwIGNvbnRhaW5lci4gIFNldHMgb3IgZ2V0cyBhdHRyaWJ1dGUgdmFsdWUuXG4gICAgLy9cbiAgICAvLyBuIC0gbmFtZSBvZiB0aGUgYXR0cmlidXRlXG4gICAgLy8gdiAtIHZhbHVlIG9mIHRoZSBhdHRyaWJ1dGVcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIGF0dHJpYnV0ZSB2YWx1ZVxuICAgIHRpcC5hdHRyID0gZnVuY3Rpb24obiwgdikge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyICYmIHR5cGVvZiBuID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gZDMuc2VsZWN0KG5vZGUpLmF0dHIobilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcmdzID0gIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgICAgZDMuc2VsZWN0aW9uLnByb3RvdHlwZS5hdHRyLmFwcGx5KGQzLnNlbGVjdChub2RlKSwgYXJncylcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogUHJveHkgc3R5bGUgY2FsbHMgdG8gdGhlIGQzIHRpcCBjb250YWluZXIuICBTZXRzIG9yIGdldHMgYSBzdHlsZSB2YWx1ZS5cbiAgICAvL1xuICAgIC8vIG4gLSBuYW1lIG9mIHRoZSBwcm9wZXJ0eVxuICAgIC8vIHYgLSB2YWx1ZSBvZiB0aGUgcHJvcGVydHlcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIHN0eWxlIHByb3BlcnR5IHZhbHVlXG4gICAgdGlwLnN0eWxlID0gZnVuY3Rpb24obiwgdikge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyICYmIHR5cGVvZiBuID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gZDMuc2VsZWN0KG5vZGUpLnN0eWxlKG4pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJncyA9ICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgICAgIGQzLnNlbGVjdGlvbi5wcm90b3R5cGUuc3R5bGUuYXBwbHkoZDMuc2VsZWN0KG5vZGUpLCBhcmdzKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBTZXQgb3IgZ2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIHRvb2x0aXBcbiAgICAvL1xuICAgIC8vIHYgLSBPbmUgb2Ygbihub3J0aCksIHMoc291dGgpLCBlKGVhc3QpLCBvciB3KHdlc3QpLCBudyhub3J0aHdlc3QpLFxuICAgIC8vICAgICBzdyhzb3V0aHdlc3QpLCBuZShub3J0aGVhc3QpIG9yIHNlKHNvdXRoZWFzdClcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIGRpcmVjdGlvblxuICAgIHRpcC5kaXJlY3Rpb24gPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkaXJlY3Rpb25cbiAgICAgIGRpcmVjdGlvbiA9IHYgPT0gbnVsbCA/IHYgOiBkMy5mdW5jdG9yKHYpXG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFNldHMgb3IgZ2V0cyB0aGUgb2Zmc2V0IG9mIHRoZSB0aXBcbiAgICAvL1xuICAgIC8vIHYgLSBBcnJheSBvZiBbeCwgeV0gb2Zmc2V0XG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIG9mZnNldCBvclxuICAgIHRpcC5vZmZzZXQgPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBvZmZzZXRcbiAgICAgIG9mZnNldCA9IHYgPT0gbnVsbCA/IHYgOiBkMy5mdW5jdG9yKHYpXG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IHNldHMgb3IgZ2V0cyB0aGUgaHRtbCB2YWx1ZSBvZiB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIFN0cmluZyB2YWx1ZSBvZiB0aGUgdGlwXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGh0bWwgdmFsdWUgb3IgdGlwXG4gICAgdGlwLmh0bWwgPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBodG1sXG4gICAgICBodG1sID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGQzX3RpcF9kaXJlY3Rpb24oKSB7IHJldHVybiAnbicgfVxuICAgIGZ1bmN0aW9uIGQzX3RpcF9vZmZzZXQoKSB7IHJldHVybiBbMCwgMF0gfVxuICAgIGZ1bmN0aW9uIGQzX3RpcF9odG1sKCkgeyByZXR1cm4gJyAnIH1cblxuICAgIHZhciBkaXJlY3Rpb25fY2FsbGJhY2tzID0gZDMubWFwKHtcbiAgICAgIG46ICBkaXJlY3Rpb25fbixcbiAgICAgIHM6ICBkaXJlY3Rpb25fcyxcbiAgICAgIGU6ICBkaXJlY3Rpb25fZSxcbiAgICAgIHc6ICBkaXJlY3Rpb25fdyxcbiAgICAgIG53OiBkaXJlY3Rpb25fbncsXG4gICAgICBuZTogZGlyZWN0aW9uX25lLFxuICAgICAgc3c6IGRpcmVjdGlvbl9zdyxcbiAgICAgIHNlOiBkaXJlY3Rpb25fc2VcbiAgICB9KSxcblxuICAgIGRpcmVjdGlvbnMgPSBkaXJlY3Rpb25fY2FsbGJhY2tzLmtleXMoKVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX24oKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5uLnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5uLnggLSBub2RlLm9mZnNldFdpZHRoIC8gMlxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gucy55LFxuICAgICAgICBsZWZ0OiBiYm94LnMueCAtIG5vZGUub2Zmc2V0V2lkdGggLyAyXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX2UoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5lLnkgLSBub2RlLm9mZnNldEhlaWdodCAvIDIsXG4gICAgICAgIGxlZnQ6IGJib3guZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3coKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC53LnkgLSBub2RlLm9mZnNldEhlaWdodCAvIDIsXG4gICAgICAgIGxlZnQ6IGJib3gudy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9udygpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm53LnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5udy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9uZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm5lLnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5uZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3N3KCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3guc3cueSxcbiAgICAgICAgbGVmdDogYmJveC5zdy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LnNlLnksXG4gICAgICAgIGxlZnQ6IGJib3guZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5pdE5vZGUoKSB7XG4gICAgICB2YXIgbm9kZSA9IGQzLnNlbGVjdChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSlcbiAgICAgIG5vZGUuc3R5bGUoe1xuICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgICAgdG9wOiAwLFxuICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAncG9pbnRlci1ldmVudHMnOiAnbm9uZScsXG4gICAgICAgICdib3gtc2l6aW5nJzogJ2JvcmRlci1ib3gnXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gbm9kZS5ub2RlKClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTVkdOb2RlKGVsKSB7XG4gICAgICBlbCA9IGVsLm5vZGUoKVxuICAgICAgaWYoZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc3ZnJylcbiAgICAgICAgcmV0dXJuIGVsXG5cbiAgICAgIHJldHVybiBlbC5vd25lclNWR0VsZW1lbnRcbiAgICB9XG5cbiAgICAvLyBQcml2YXRlIC0gZ2V0cyB0aGUgc2NyZWVuIGNvb3JkaW5hdGVzIG9mIGEgc2hhcGVcbiAgICAvL1xuICAgIC8vIEdpdmVuIGEgc2hhcGUgb24gdGhlIHNjcmVlbiwgd2lsbCByZXR1cm4gYW4gU1ZHUG9pbnQgZm9yIHRoZSBkaXJlY3Rpb25zXG4gICAgLy8gbihub3J0aCksIHMoc291dGgpLCBlKGVhc3QpLCB3KHdlc3QpLCBuZShub3J0aGVhc3QpLCBzZShzb3V0aGVhc3QpLCBudyhub3J0aHdlc3QpLFxuICAgIC8vIHN3KHNvdXRod2VzdCkuXG4gICAgLy9cbiAgICAvLyAgICArLSstK1xuICAgIC8vICAgIHwgICB8XG4gICAgLy8gICAgKyAgICtcbiAgICAvLyAgICB8ICAgfFxuICAgIC8vICAgICstKy0rXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGFuIE9iamVjdCB7biwgcywgZSwgdywgbncsIHN3LCBuZSwgc2V9XG4gICAgZnVuY3Rpb24gZ2V0U2NyZWVuQkJveCgpIHtcbiAgICAgIHZhciB0YXJnZXRlbCAgID0gdGFyZ2V0IHx8IGQzLmV2ZW50LnRhcmdldDtcblxuICAgICAgd2hpbGUgKCd1bmRlZmluZWQnID09PSB0eXBlb2YgdGFyZ2V0ZWwuZ2V0U2NyZWVuQ1RNICYmICd1bmRlZmluZWQnID09PSB0YXJnZXRlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgdGFyZ2V0ZWwgPSB0YXJnZXRlbC5wYXJlbnROb2RlO1xuICAgICAgfVxuXG4gICAgICB2YXIgYmJveCAgICAgICA9IHt9LFxuICAgICAgICAgIG1hdHJpeCAgICAgPSB0YXJnZXRlbC5nZXRTY3JlZW5DVE0oKSxcbiAgICAgICAgICB0YmJveCAgICAgID0gdGFyZ2V0ZWwuZ2V0QkJveCgpLFxuICAgICAgICAgIHdpZHRoICAgICAgPSB0YmJveC53aWR0aCxcbiAgICAgICAgICBoZWlnaHQgICAgID0gdGJib3guaGVpZ2h0LFxuICAgICAgICAgIHggICAgICAgICAgPSB0YmJveC54LFxuICAgICAgICAgIHkgICAgICAgICAgPSB0YmJveC55XG5cbiAgICAgIHBvaW50LnggPSB4XG4gICAgICBwb2ludC55ID0geVxuICAgICAgYmJveC5udyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54ICs9IHdpZHRoXG4gICAgICBiYm94Lm5lID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnkgKz0gaGVpZ2h0XG4gICAgICBiYm94LnNlID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggLT0gd2lkdGhcbiAgICAgIGJib3guc3cgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSAtPSBoZWlnaHQgLyAyXG4gICAgICBiYm94LncgID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggKz0gd2lkdGhcbiAgICAgIGJib3guZSA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54IC09IHdpZHRoIC8gMlxuICAgICAgcG9pbnQueSAtPSBoZWlnaHQgLyAyXG4gICAgICBiYm94Lm4gPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSArPSBoZWlnaHRcbiAgICAgIGJib3gucyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG5cbiAgICAgIHJldHVybiBiYm94XG4gICAgfVxuXG4gICAgcmV0dXJuIHRpcFxuICB9O1xuXG59KSk7XG4iLCIvKipcbiAqXG4gKiBNdXRhdGlvbnMgTmVlZGxlIFBsb3QgKG11dHMtbmVlZGxlLXBsb3QpXG4gKlxuICogQ3JlYXRlcyBhIG5lZWRsZSBwbG90IChhLmsuYSBzdGVtIHBsb3QsIGxvbGxpcG9wLXBsb3QgYW5kIHNvb24gYWxzbyBiYWxsb29uIHBsb3QgOy0pXG4gKiBUaGlzIGNsYXNzIHVzZXMgdGhlIG5wbS1yZXF1aXJlIG1vZHVsZSB0byBsb2FkIGRlcGVuZGVuY2llcyBkMywgZDMtdGlwXG4gKlxuICogQGF1dGhvciBNaWNoYWVsIFAgU2Nocm9lZGVyXG4gKiBAY2xhc3NcbiAqL1xuXG5mdW5jdGlvbiBNdXRzTmVlZGxlUGxvdCAoY29uZmlnKSB7XG5cbiAgICAvLyBJbml0aWFsaXphdGlvblxuXG4gICAgLy8gWC1jb29yZGluYXRlc1xuICAgIHRoaXMubWF4Q29vcmQgPSBjb25maWcubWF4Q29vcmQgfHwgLTE7ICAgICAgICAgICAgIC8vIFRoZSBtYXhpbXVtIGNvb3JkICh4LWF4aXMpXG4gICAgaWYgKHRoaXMubWF4Q29vcmQgPCAwKSB7IHRocm93IG5ldyBFcnJvcihcIidtYXhDb29yZCcgbXVzdCBiZSBkZWZpbmVkIGluaXRpYXRpb24gY29uZmlnIVwiKTsgfVxuICAgIHRoaXMubWluQ29vcmQgPSBjb25maWcubWluQ29vcmQgfHwgMTsgICAgICAgICAgICAgICAvLyBUaGUgbWluaW11bSBjb29yZCAoeC1heGlzKVxuXG4gICAgLy8gZGF0YVxuICAgIG11dGF0aW9uRGF0YSA9IGNvbmZpZy5tdXRhdGlvbkRhdGEgfHwgLTE7ICAgICAgICAgIC8vIC5qc29uIGZpbGUgb3IgZGljdFxuICAgIGlmICh0aGlzLm1heENvb3JkIDwgMCkgeyB0aHJvdyBuZXcgRXJyb3IoXCInbXV0YXRpb25EYXRhJyBtdXN0IGJlIGRlZmluZWQgaW5pdGlhdGlvbiBjb25maWchXCIpOyB9XG4gICAgcmVnaW9uRGF0YSA9IGNvbmZpZy5yZWdpb25EYXRhIHx8IC0xOyAgICAgICAgICAgICAgLy8gLmpzb24gZmlsZSBvciBkaWN0XG4gICAgaWYgKHRoaXMubWF4Q29vcmQgPCAwKSB7IHRocm93IG5ldyBFcnJvcihcIidyZWdpb25EYXRhJyBtdXN0IGJlIGRlZmluZWQgaW5pdGlhdGlvbiBjb25maWchXCIpOyB9XG5cbiAgICAvLyBQbG90IGRpbWVuc2lvbnMgJiB0YXJnZXRcbiAgICB2YXIgdGFyZ2V0RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNvbmZpZy50YXJnZXRFbGVtZW50KSB8fCBjb25maWcudGFyZ2V0RWxlbWVudCB8fCBkb2N1bWVudC5ib2R5ICAgLy8gV2hlcmUgdG8gYXBwZW5kIHRoZSBwbG90IChzdmcpXG5cbiAgICB2YXIgd2lkdGggPSB0aGlzLndpZHRoID0gY29uZmlnLndpZHRoIHx8IHRhcmdldEVsZW1lbnQub2Zmc2V0V2lkdGggfHwgMTAwMDtcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy5oZWlnaHQgPSBjb25maWcuaGVpZ2h0IHx8IHRhcmdldEVsZW1lbnQub2Zmc2V0SGVpZ2h0IHx8IDUwMDtcblxuICAgIC8vIE1pc2NcbiAgICB0aGlzLmNvbG9yTWFwID0gY29uZmlnLmNvbG9yTWFwIHx8IHt9OyAgICAgICAgICAgICAgLy8gZGljdFxuICAgIHRoaXMubGVnZW5kcyA9IGNvbmZpZy5sZWdlbmRzIHx8IHtcbiAgICAgICAgXCJ5XCI6IFwiVmFsdWVcIixcbiAgICAgICAgXCJ4XCI6IFwiQ29vcmRpbmF0ZVwiXG4gICAgfTtcblxuICAgIHRoaXMuYnVmZmVyID0gMDtcblxuICAgIHZhciBtYXhDb29yZCA9IHRoaXMubWF4Q29vcmQ7XG5cbiAgICB2YXIgYnVmZmVyID0gMDtcbiAgICBpZiAod2lkdGggPj0gaGVpZ2h0KSB7XG4gICAgICBidWZmZXIgPSBoZWlnaHQgLyA4O1xuICAgIH0gZWxzZSB7XG4gICAgICBidWZmZXIgPSB3aWR0aCAvIDg7XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG5cbiAgICAvLyBpbXBvcnQgdGlwcyB0byBkM1xuICAgIHZhciBkM3RpcCA9IHJlcXVpcmUoJ2QzLXRpcCcpO1xuICAgIGQzdGlwKGQzKTsgICAgXG5cblxuICAgIHRoaXMudGlwID0gZDMudGlwKClcbiAgICAgIC5hdHRyKCdjbGFzcycsICdkMy10aXAnKVxuICAgICAgLm9mZnNldChbLTEwLCAwXSlcbiAgICAgIC5odG1sKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIFwiPHNwYW4+XCIgKyBkLnZhbHVlICsgXCIgXCIgKyBkLmNhdGVnb3J5ICsgIFwiIGF0IGNvb3JkLiBcIiArIGQuY29vcmRTdHJpbmcgKyBcIjwvc3Bhbj5cIjtcbiAgICAgIH0pO1xuXG4gICAgdmFyIHN2ZyA9IGQzLnNlbGVjdCh0YXJnZXRFbGVtZW50KS5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibXV0bmVlZGxlc1wiKTtcblxuICAgIHN2Zy5jYWxsKHRoaXMudGlwKTtcblxuICAgIC8vIGRlZmluZSBzY2FsZXNcblxuICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oW3RoaXMubWluQ29vcmQsIHRoaXMubWF4Q29vcmRdKVxuICAgICAgLnJhbmdlKFtidWZmZXIgKiAxLjUgLCB3aWR0aCAtIGJ1ZmZlcl0pXG4gICAgICAubmljZSgpO1xuICAgIHRoaXMueCA9IHg7XG5cbiAgICB2YXIgeSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFsxLDIwXSlcbiAgICAgIC5yYW5nZShbaGVpZ2h0IC0gYnVmZmVyICogMS41LCBidWZmZXJdKVxuICAgICAgLm5pY2UoKTtcbiAgICB0aGlzLnkgPSB5O1xuICAgIFxuICAgIHRoaXMuZHJhd05lZWRsZXMoc3ZnLCBtdXRhdGlvbkRhdGEsIHJlZ2lvbkRhdGEpO1xuXG59XG5cbk11dHNOZWVkbGVQbG90LnByb3RvdHlwZS5kcmF3UmVnaW9ucyA9IGZ1bmN0aW9uKHN2ZywgcmVnaW9uRGF0YSkge1xuXG4gICAgdmFyIG1heENvb3JkID0gdGhpcy5tYXhDb29yZDtcbiAgICB2YXIgbWluQ29vcmQgPSB0aGlzLm1pbkNvb3JkO1xuICAgIHZhciBidWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICB2YXIgY29sb3JzID0gdGhpcy5jb2xvck1hcDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeCA9IHRoaXMueDtcblxuICAgIHZhciBiZWxvdyA9IHRydWU7XG5cblxuICAgIGdldFJlZ2lvblN0YXJ0ID0gZnVuY3Rpb24ocmVnaW9uKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUludChyZWdpb24uc3BsaXQoXCItXCIpWzBdKVxuICAgIH07XG5cbiAgICBnZXRSZWdpb25FbmQgPSBmdW5jdGlvbihyZWdpb24pIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KHJlZ2lvbi5zcGxpdChcIi1cIilbMV0pXG4gICAgfTtcblxuICAgIGkgPSAwO1xuICAgIHJlZ2lvbkNvbG9ycyA9IFtcInllbGxvd1wiLCBcIm9yYW5nZVwiLCBcImxpZ2h0Z3JlZW5cIl07XG4gICAgZ2V0UmVnaW9uQ29sb3IgPSBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKGtleSBpbiBjb2xvcnMpIHtcbiAgICAgICAgICAgIHJldHVybiBjb2xvcnNba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiByZWdpb25Db2xvcnNbaSsrICUgcmVnaW9uQ29sb3JzLmxlbmd0aF07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGJnX29mZnNldCA9IDA7XG4gICAgdmFyIHJlZ2lvbl9vZmZzZXQgPSBiZ19vZmZzZXQtM1xuICAgIHZhciB0ZXh0X29mZnNldCA9IGJnX29mZnNldCArIDIwO1xuICAgIGlmIChiZWxvdyAhPSB0cnVlKSB7XG4gICAgICAgIHRleHRfb2Zmc2V0ID0gYmdfb2Zmc2V0KzU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZHJhdyhyZWdpb25MaXN0KSB7XG5cbiAgICAgICAgdmFyIHJlZ2lvbnNCRyA9IGQzLnNlbGVjdChcIi5tdXRuZWVkbGVzXCIpLnNlbGVjdEFsbCgpXG4gICAgICAgICAgICAuZGF0YShbXCJkdW1teVwiXSkuZW50ZXIoKVxuICAgICAgICAgICAgLmluc2VydChcImdcIiwgXCI6Zmlyc3QtY2hpbGRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJyZWdpb25zQkdcIilcbiAgICAgICAgICAgIC5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgeChtaW5Db29yZCkgKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIHkoMCkgKyBiZ19vZmZzZXQgKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB4KG1heENvb3JkKSAtIHgobWluQ29vcmQpIClcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIDEwKTtcblxuXG4gICAgICAgIHZhciByZWdpb25zID0gcmVnaW9uc0JHID0gZDMuc2VsZWN0KFwiLm11dG5lZWRsZXNcIikuc2VsZWN0QWxsKClcbiAgICAgICAgICAgIC5kYXRhKHJlZ2lvbkxpc3QpXG4gICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJyZWdpb25Hcm91cFwiKTtcblxuICAgICAgICByZWdpb25zLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAocikge1xuICAgICAgICAgICAgICAgIHJldHVybiB4KHIuc3RhcnQpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIHkoMCkgKyByZWdpb25fb2Zmc2V0IClcbiAgICAgICAgICAgIC5hdHRyKFwicnlcIiwgXCIzXCIpXG4gICAgICAgICAgICAuYXR0cihcInJ4XCIsIFwiM1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBmdW5jdGlvbiAocikge1xuICAgICAgICAgICAgICAgIHJldHVybiB4KHIuZW5kKSAtIHgoci5zdGFydClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCAxNilcbiAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5jb2xvclxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZVwiLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkMy5yZ2IoZGF0YS5jb2xvcikuZGFya2VyKClcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIHJlZ2lvbnMuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInJlZ2lvbk5hbWVcIilcbiAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbiAocikge1xuICAgICAgICAgICAgICAgIHJldHVybiB4KHIuc3RhcnQpICsgKHgoci5lbmQpIC0geChyLnN0YXJ0KSkgLyAyXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIHkoMCkgKyB0ZXh0X29mZnNldClcbiAgICAgICAgICAgIC5hdHRyKFwiZHlcIiwgXCIwLjM1ZW1cIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLCBcIjEycHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtZGVjb3JhdGlvblwiLCBcImJvbGRcIilcbiAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEubmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZm9ybWF0UmVnaW9ucyhyZWdpb25zKSB7XG4gICAgICAgIHJlZ2lvbkxpc3QgPSBbXTtcbiAgICAgICAgZm9yIChrZXkgaW4gcmVnaW9ucykge1xuXG4gICAgICAgICAgICByZWdpb25MaXN0LnB1c2goe1xuICAgICAgICAgICAgICAgICduYW1lJzoga2V5LFxuICAgICAgICAgICAgICAgICdzdGFydCc6IGdldFJlZ2lvblN0YXJ0KHJlZ2lvbnNba2V5XSksXG4gICAgICAgICAgICAgICAgJ2VuZCc6IGdldFJlZ2lvbkVuZChyZWdpb25zW2tleV0pLFxuICAgICAgICAgICAgICAgICdjb2xvcic6IGdldFJlZ2lvbkNvbG9yKGtleSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWdpb25MaXN0O1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgcmVnaW9uRGF0YSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIC8vIGFzc3VtZSBkYXRhIGlzIGluIGEgZmlsZVxuICAgICAgICBkMy5qc29uKHJlZ2lvbkRhdGEsIGZ1bmN0aW9uKGVycm9yLCByZWdpb25zKSB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtyZXR1cm4gY29uc29sZS5kZWJ1ZyhlcnJvcil9XG4gICAgICAgICAgICByZWdpb25MaXN0ID0gZm9ybWF0UmVnaW9ucyhyZWdpb25zKTtcbiAgICAgICAgICAgIGRyYXcocmVnaW9uTGlzdCk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJlZ2lvbkxpc3QgPSBmb3JtYXRSZWdpb25zKHJlZ2lvbkRhdGEpO1xuICAgICAgICBkcmF3KHJlZ2lvbkxpc3QpO1xuICAgIH1cblxufTtcblxuXG5NdXRzTmVlZGxlUGxvdC5wcm90b3R5cGUuZHJhd0F4ZXMgPSBmdW5jdGlvbihzdmcpIHtcblxuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB4ID0gdGhpcy54O1xuXG4gICAgeEF4aXMgPSBkMy5zdmcuYXhpcygpLnNjYWxlKHgpLm9yaWVudChcImJvdHRvbVwiKTtcblxuICAgIHN2Zy5hcHBlbmQoXCJzdmc6Z1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIngtYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCxcIiArICh0aGlzLmhlaWdodCAtIHRoaXMuYnVmZmVyKSArIFwiKVwiKVxuICAgICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgeUF4aXMgPSBkMy5zdmcuYXhpcygpLnNjYWxlKHkpLm9yaWVudChcImxlZnRcIik7XG5cblxuICAgIHN2Zy5hcHBlbmQoXCJzdmc6Z1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInktYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAodGhpcy5idWZmZXIgKiAxLjIgKyAtIDEwKSAgKyBcIiwwKVwiKVxuICAgICAgLmNhbGwoeUF4aXMpO1xuXG4gICAgc3ZnLmFwcGVuZChcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ5LWxhYmVsXCIpXG4gICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArICh0aGlzLmJ1ZmZlciAvIDMpICsgXCIsXCIgKyAodGhpcy5oZWlnaHQgLyAyKSArIFwiKSwgcm90YXRlKC05MClcIilcbiAgICAgIC50ZXh0KHRoaXMubGVnZW5kcy55KTtcblxuICAgIHN2Zy5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIFwieC1sYWJlbFwiKVxuICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAodGhpcy53aWR0aCAvIDIpICsgXCIsXCIgKyAodGhpcy5oZWlnaHQgLSB0aGlzLmJ1ZmZlciAvIDMpICsgXCIpXCIpXG4gICAgICAudGV4dCh0aGlzLmxlZ2VuZHMueCk7XG4gICAgXG59O1xuXG5cblxuTXV0c05lZWRsZVBsb3QucHJvdG90eXBlLm5lZWRsZUhlYWRDb2xvciA9IGZ1bmN0aW9uKGNhdGVnb3J5LCBjb2xvcnMpIHtcblxuICAgIGlmIChjYXRlZ29yeSBpbiBjb2xvcnMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29sb3JzW2NhdGVnb3J5XTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gXCJzdGVlbGJsdWVcIjtcbiAgICB9XG59O1xuXG5NdXRzTmVlZGxlUGxvdC5wcm90b3R5cGUuZHJhd05lZWRsZXMgPSBmdW5jdGlvbihzdmcsIG11dGF0aW9uRGF0YSwgcmVnaW9uRGF0YSkge1xuXG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHBsb3R0ZXIgPSB0aGlzO1xuXG4gICAgZ2V0WUF4aXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHk7XG4gICAgfTtcblxuICAgIGZvcm1hdENvb3JkID0gZnVuY3Rpb24oY29vcmQpIHtcbiAgICAgICBpZiAoY29vcmQuaW5kZXhPZihcIi1cIikgPiAtMSkge1xuICAgICAgICAgICAgY29vcmRzID0gY29vcmQuc3BsaXQoXCItXCIpO1xuICAgICAgICAgICAgLy8gcGxhY2UgbmVlZGUgYXQgbWlkZGxlIG9mIGFmZmVjdGVkIHJlZ2lvblxuICAgICAgICAgICAgY29vcmQgPSBNYXRoLmZsb29yKChwYXJzZUludChjb29yZHNbMF0pICsgcGFyc2VJbnQoY29vcmRzWzFdKSkgLyAyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvb3JkID0gcGFyc2VJbnQoY29vcmQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb29yZDtcbiAgICB9O1xuXG4gICAgZ2V0Q29sb3IgPSB0aGlzLm5lZWRsZUhlYWRDb2xvcjtcbiAgICBjb2xvcnMgPSB0aGlzLmNvbG9yTWFwO1xuICAgIHRpcCA9IHRoaXMudGlwO1xuXG4gICAgLy8gc3RhY2sgbmVlZGxlcyBhdCBzYW1lIHBvc1xuICAgIG5lZWRsZVBvaW50ID0ge307XG4gICAgaGlnaGVzdCA9IDA7XG5cbiAgICBzdGFja05lZWRsZSA9IGZ1bmN0aW9uKHBvcyx2YWx1ZSxwb2ludERpY3QpIHtcbiAgICAgIHN0aWNrSGVpZ2h0ID0gMDtcbiAgICAgIHBvcyA9IFwicFwiK1N0cmluZyhwb3MpO1xuICAgICAgaWYgKHBvcyBpbiBwb2ludERpY3QpIHtcbiAgICAgICAgIHN0aWNrSGVpZ2h0ID0gcG9pbnREaWN0W3Bvc107XG4gICAgICAgICBuZXdIZWlnaHQgPSBzdGlja0hlaWdodCArIHZhbHVlO1xuICAgICAgICAgcG9pbnREaWN0W3Bvc10gPSBuZXdIZWlnaHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgcG9pbnREaWN0W3Bvc10gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdGlja0hlaWdodDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZm9ybWF0TXV0YXRpb25FbnRyeShkKSB7XG5cbiAgICAgICAgY29vcmRTdHJpbmcgPSBkLmNvb3JkO1xuICAgICAgICBudW1lcmljQ29vcmQgPSBmb3JtYXRDb29yZChkLmNvb3JkKTtcbiAgICAgICAgbnVtZXJpY1ZhbHVlID0gTnVtYmVyKGQudmFsdWUpO1xuICAgICAgICBzdGlja0hlaWdodCA9IHN0YWNrTmVlZGxlKG51bWVyaWNDb29yZCwgbnVtZXJpY1ZhbHVlLCBuZWVkbGVQb2ludCk7XG4gICAgICAgIGNhdGVnb3J5ID0gZC5jYXRlZ29yeSB8fCBcIlwiO1xuXG4gICAgICAgIGlmIChzdGlja0hlaWdodCArIG51bWVyaWNWYWx1ZSA+IGhpZ2hlc3QpIHtcbiAgICAgICAgICAgIC8vIHNldCBZLUF4aXMgYWx3YXlzIHRvIGhpZ2hlc3QgYXZhaWxhYmxlXG4gICAgICAgICAgICBoaWdoZXN0ID0gc3RpY2tIZWlnaHQgKyBudW1lcmljVmFsdWU7XG4gICAgICAgICAgICBnZXRZQXhpcygpLmRvbWFpbihbMCwgaGlnaGVzdCArIDJdKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKG51bWVyaWNDb29yZCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgICAgIGNvb3JkU3RyaW5nOiBjb29yZFN0cmluZyxcbiAgICAgICAgICAgICAgICBjb29yZDogbnVtZXJpY0Nvb3JkLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBudW1lcmljVmFsdWUsXG4gICAgICAgICAgICAgICAgc3RpY2tIZWlnaHQ6IHN0aWNrSGVpZ2h0LFxuICAgICAgICAgICAgICAgIGNvbG9yOiBnZXRDb2xvcihjYXRlZ29yeSwgY29sb3JzKVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhcImRpc2NhcmRpbmcgXCIgKyBkLmNvb3JkICsgXCIgXCIgKyBkLmNhdGVnb3J5KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG11dHMgPSBbXTtcblxuXG4gICAgaWYgKHR5cGVvZiBtdXRhdGlvbkRhdGEgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICBkMy5qc29uKG11dGF0aW9uRGF0YSwgZnVuY3Rpb24oZXJyb3IsIHVuZm9ybWF0dGVkTXV0cykge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtdXRzID0gcHJlcGFyZU11dHModW5mb3JtYXR0ZWRNdXRzKTtcbiAgICAgICAgICAgIHBhaW50TXV0cyhtdXRzKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbXV0cyA9IHByZXBhcmVNdXRzKG11dGF0aW9uRGF0YSk7XG4gICAgICAgIHBhaW50TXV0cyhtdXRzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmVwYXJlTXV0cyh1bmZvcm1hdHRlZE11dHMpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gdW5mb3JtYXR0ZWRNdXRzKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWQgPSBmb3JtYXRNdXRhdGlvbkVudHJ5KHVuZm9ybWF0dGVkTXV0c1trZXldKTtcbiAgICAgICAgICAgIGlmIChmb3JtYXR0ZWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbXV0cy5wdXNoKGZvcm1hdHRlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG11dHM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFpbnRNdXRzKG11dHMpIHtcbiAgICAgICAgdmFyIG5lZWRsZXMgPSBkMy5zZWxlY3QoXCIubXV0bmVlZGxlc1wiKS5zZWxlY3RBbGwoKVxuICAgICAgICAgICAgLmRhdGEobXV0cykuZW50ZXIoKVxuICAgICAgICAgICAgLmFwcGVuZChcImxpbmVcIilcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4geShkYXRhLnN0aWNrSGVpZ2h0K2RhdGEudmFsdWUpOyB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCBmdW5jdGlvbihkYXRhKSB7IHJldHVybiB5KGRhdGEuc3RpY2tIZWlnaHQpIH0pXG4gICAgICAgICAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uKGRhdGEpIHsgcmV0dXJuIHgoZGF0YS5jb29yZCkgfSlcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4geChkYXRhLmNvb3JkKSB9KVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5lZWRsZS1saW5lXCIpO1xuXG5cbiAgICAgICAgbWluU2l6ZSA9IDQ7XG4gICAgICAgIG1heFNpemUgPSAxMDtcbiAgICAgICAgaGVhZFNpemVTY2FsZSA9IGQzLnNjYWxlLmxvZygpLnJhbmdlKFttaW5TaXplLG1heFNpemVdKS5kb21haW4oWzEsIGhpZ2hlc3QvMl0pO1xuICAgICAgICBoZWFkU2l6ZSA9IGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIHJldHVybiBkMy5taW4oW2QzLm1heChbaGVhZFNpemVTY2FsZShuKSxtaW5TaXplXSksIG1heFNpemVdKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgbmVlZGxlSGVhZHMgPSBkMy5zZWxlY3QoXCIubXV0bmVlZGxlc1wiKS5zZWxlY3RBbGwoKVxuICAgICAgICAgICAgLmRhdGEobXV0cylcbiAgICAgICAgICAgIC5lbnRlcigpLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjeVwiLCBmdW5jdGlvbihkYXRhKSB7IHJldHVybiB5KGRhdGEuc3RpY2tIZWlnaHQrZGF0YS52YWx1ZSkgfSApXG4gICAgICAgICAgICAuYXR0cihcImN4XCIsIGZ1bmN0aW9uKGRhdGEpIHsgcmV0dXJuIHgoZGF0YS5jb29yZCkgfSApXG4gICAgICAgICAgICAuYXR0cihcInJcIiwgZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4gaGVhZFNpemUoZGF0YS52YWx1ZSkgfSlcbiAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4gZGF0YS5jb2xvciB9KVxuICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIGZ1bmN0aW9uKGRhdGEpIHtyZXR1cm4gZDMucmdiKGRhdGEuY29sb3IpLmRhcmtlcigpfSlcbiAgICAgICAgICAgIC5vbignbW91c2VvdmVyJywgIGZ1bmN0aW9uKGQpeyBkMy5zZWxlY3QodGhpcykubW92ZVRvRnJvbnQoKTsgdGlwLnNob3coZCk7IH0pXG4gICAgICAgICAgICAub24oJ21vdXNlb3V0JywgdGlwLmhpZGUpO1xuXG4gICAgICAgIGQzLnNlbGVjdGlvbi5wcm90b3R5cGUubW92ZVRvRnJvbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQodGhpcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBhZGp1c3QgeS1zY2FsZSBhY2NvcmRpbmcgdG8gaGlnaGVzdCB2YWx1ZSBhbiBkcmF3IHRoZSByZXN0XG4gICAgICAgIGlmIChyZWdpb25EYXRhICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcGxvdHRlci5kcmF3UmVnaW9ucyhzdmcsIHJlZ2lvbkRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIHBsb3R0ZXIuZHJhd0F4ZXMoc3ZnKTtcbiAgICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTXV0c05lZWRsZVBsb3Q7XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL2pzL011dHNOZWVkbGVQbG90LmpzXCIpO1xuIl19
