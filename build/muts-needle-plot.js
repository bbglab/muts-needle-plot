require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var events = require("backbone-events-standalone");

events.onAll = function(callback,context){
  this.on("all", callback,context);
  return this;
};

// Mixin utility
events.oldMixin = events.mixin;
events.mixin = function(proto) {
  events.oldMixin(proto);
  // add custom onAll
  var exports = ['onAll'];
  for(var i=0; i < exports.length;i++){
    var name = exports[i];
    proto[name] = this[name];
  }
  return proto;
};

module.exports = events;

},{"backbone-events-standalone":3}],2:[function(require,module,exports){
/**
 * Standalone extraction of Backbone.Events, no external dependency required.
 * Degrades nicely when Backone/underscore are already available in the current
 * global context.
 *
 * Note that docs suggest to use underscore's `_.extend()` method to add Events
 * support to some given object. A `mixin()` method has been added to the Events
 * prototype to avoid using underscore for that sole purpose:
 *
 *     var myEventEmitter = BackboneEvents.mixin({});
 *
 * Or for a function constructor:
 *
 *     function MyConstructor(){}
 *     MyConstructor.prototype.foo = function(){}
 *     BackboneEvents.mixin(MyConstructor.prototype);
 *
 * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
 * (c) 2013 Nicolas Perriault
 */
/* global exports:true, define, module */
(function() {
  var root = this,
      breaker = {},
      nativeForEach = Array.prototype.forEach,
      hasOwnProperty = Object.prototype.hasOwnProperty,
      slice = Array.prototype.slice,
      idCounter = 0;

  // Returns a partial implementation matching the minimal API subset required
  // by Backbone.Events
  function miniscore() {
    return {
      keys: Object.keys || function (obj) {
        if (typeof obj !== "object" && typeof obj !== "function" || obj === null) {
          throw new TypeError("keys() called on a non-object");
        }
        var key, keys = [];
        for (key in obj) {
          if (obj.hasOwnProperty(key)) {
            keys[keys.length] = key;
          }
        }
        return keys;
      },

      uniqueId: function(prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
      },

      has: function(obj, key) {
        return hasOwnProperty.call(obj, key);
      },

      each: function(obj, iterator, context) {
        if (obj == null) return;
        if (nativeForEach && obj.forEach === nativeForEach) {
          obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
          for (var i = 0, l = obj.length; i < l; i++) {
            if (iterator.call(context, obj[i], i, obj) === breaker) return;
          }
        } else {
          for (var key in obj) {
            if (this.has(obj, key)) {
              if (iterator.call(context, obj[key], key, obj) === breaker) return;
            }
          }
        }
      },

      once: function(func) {
        var ran = false, memo;
        return function() {
          if (ran) return memo;
          ran = true;
          memo = func.apply(this, arguments);
          func = null;
          return memo;
        };
      }
    };
  }

  var _ = miniscore(), Events;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === 'object') callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Mixin utility
  Events.mixin = function(proto) {
    var exports = ['on', 'once', 'off', 'trigger', 'stopListening', 'listenTo',
                   'listenToOnce', 'bind', 'unbind'];
    _.each(exports, function(name) {
      proto[name] = this[name];
    }, this);
    return proto;
  };

  // Export Events as BackboneEvents depending on current context
  if (typeof define === "function") {
    define(function() {
      return Events;
    });
  } else if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Events;
    }
    exports.BackboneEvents = Events;
  } else {
    root.BackboneEvents = Events;
  }
})(this);

},{}],3:[function(require,module,exports){
module.exports = require('./backbone-events-standalone');

},{"./backbone-events-standalone":2}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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
    this.categCounts = {};

    this.svgClasses = "mutneedles"
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
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {
        return "<span>" + d.value + " " + d.category +  " at coord. " + d.coordString + "</span>";
      });

    // INIT SVG

    var svg = d3.select(targetElement).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", this.svgClasses);

    svg.call(this.tip);

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

    this.drawNeedles(svg, mutationData, regionData);

    // CONFIGURE BRUSH
    var brush = d3.svg.brush()
        .x(x)
        .on("brush", brushmove)
        .on("brushend", brushend);

    this.svgClasses += " brush";
    svg
        .attr("class", this.svgClasses)
        .call(brush)
        .selectAll('.extent')
        .attr('height', height);

    selectedNeedles = [];
    var categCounts = {};
    function brushmove() {

        var extent = brush.extent();
        needleHeads = d3.selectAll(".needle-head");;
        selectedNeedles = [];
        categCounts = {};

        needleHeads.classed("selected", function(d) {
            is_brushed = extent[0] <= d.coord && d.coord <= extent[1];
            if (is_brushed) {
                selectedNeedles.push(d);
                categCounts[d.category] = (categCounts[d.category] || 0) + d.value;
            }
            return is_brushed;
        });
    }


    function brushend() {
        get_button = d3.select(".clear-button");
        self.trigger('onNeedleSelectionChange', {
            data : selectedNeedles,
            categCounts: categCounts
        });
        /*if(get_button.empty() === true) {
         clear_button = svg.append('text')
         .attr("y", 460)
         .attr("x", 825)
         .attr("class", "clear-button")
         .text("Clear Brush");
         }

         x.domain(brush.extent());

         transition_data();
         reset_axis();

         points.classed("selected", false);
         d3.select(".brush").call(brush.clear());

         clear_button.on('click', function(){
         x.domain([0, 50]);
         transition_data();
         reset_axis();
         clear_button.remove();
         });*/
    }


    // LEGEND
    self = this;
    verticalLegend = d3.svg
        .legend()
        .labelFormat(function(l) { return (self.categCounts[l] || "") + " " + l; })
        .cellPadding(4)
        .orientation("vertical")
        .units("Mutation Categories")
        .cellWidth(20)
        .cellHeight(12)
        .inputScale(this.colorScale)
        .cellStepping(4);

    this.updateMutLegend = function(legendObj){

        svg.call(legendObj);

        dim = d3.select(".mutLegendGroup").node().getBBox();

        var margin = 10;
        dim = mutLegendGroupText.node().getBBox();
        dim.height += margin * 2;
        dim.width += margin * 2;
        dim.y -= margin;
        dim.x -= margin;

        d3.select(".mutLegendBG")
            .attr(dim)
    };

    var mutLegendGroup = svg.append("g")
          .attr("class", "mutLegendGroup")
          .data([ {"x":800, "y":50} ])
          .attr("transform", "translate(800,50)");
    var mutLegendGroupText = mutLegendGroup
        .insert("g")
          .attr("class", "mutLegendGroupText")
          .call(verticalLegend);

    // set legend background
    var mutLegendBG = mutLegendGroup
        .insert("rect", ":first-child")
        .attr("class", "mutLegendBG")
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", "1px");
    this.updateMutLegend(verticalLegend)


    var drag = d3.behavior.drag()
        .on("drag", function(d,i) {
            d.x += d3.event.dx;
            d.y += d3.event.dy;
            d3.select(this).attr("transform", function(d,i){
                return "translate(" + [ d.x,d.y ] + ")"
            })
        })
        .on("dragstart", function() {
            d3.event.sourceEvent.stopPropagation(); // silence other listeners
        });

    mutLegendGroup.call(drag);

    self.on("onNeedleSelectionChange", function (edata) {
        self.categCounts = edata.categCounts;
        self.updateMutLegend(verticalLegend);
    });



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
                'color': getColor(key)
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

    getColor = this.colorScale;
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
                color: getColor(category)
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
            plotter.drawRegions(svg, regionData);
        }
        plotter.drawAxes(svg);
    }

};



var Events = require('biojs-events');
Events.mixin(MutsNeedlePlot.prototype);

module.exports = MutsNeedlePlot;


},{"biojs-events":1,"d3-tip":4}],"muts-needle-plot":[function(require,module,exports){
module.exports = require("./src/js/MutsNeedlePlot.js");

},{"./src/js/MutsNeedlePlot.js":5}]},{},["muts-needle-plot"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9taWNoaS9Eb2N1bWVudHMvbXBlL3diaC9tdXRuZWVkbGVzL25vZGVfbW9kdWxlcy9iaW9qcy1ldmVudHMvaW5kZXguanMiLCIvaG9tZS9taWNoaS9Eb2N1bWVudHMvbXBlL3diaC9tdXRuZWVkbGVzL25vZGVfbW9kdWxlcy9iaW9qcy1ldmVudHMvbm9kZV9tb2R1bGVzL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lLmpzIiwiL2hvbWUvbWljaGkvRG9jdW1lbnRzL21wZS93YmgvbXV0bmVlZGxlcy9ub2RlX21vZHVsZXMvYmlvanMtZXZlbnRzL25vZGVfbW9kdWxlcy9iYWNrYm9uZS1ldmVudHMtc3RhbmRhbG9uZS9pbmRleC5qcyIsIi9ob21lL21pY2hpL0RvY3VtZW50cy9tcGUvd2JoL211dG5lZWRsZXMvbm9kZV9tb2R1bGVzL2QzLXRpcC9pbmRleC5qcyIsIi9ob21lL21pY2hpL0RvY3VtZW50cy9tcGUvd2JoL211dG5lZWRsZXMvc3JjL2pzL011dHNOZWVkbGVQbG90LmpzIiwiLi9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JSQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamhCQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBldmVudHMgPSByZXF1aXJlKFwiYmFja2JvbmUtZXZlbnRzLXN0YW5kYWxvbmVcIik7XG5cbmV2ZW50cy5vbkFsbCA9IGZ1bmN0aW9uKGNhbGxiYWNrLGNvbnRleHQpe1xuICB0aGlzLm9uKFwiYWxsXCIsIGNhbGxiYWNrLGNvbnRleHQpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIE1peGluIHV0aWxpdHlcbmV2ZW50cy5vbGRNaXhpbiA9IGV2ZW50cy5taXhpbjtcbmV2ZW50cy5taXhpbiA9IGZ1bmN0aW9uKHByb3RvKSB7XG4gIGV2ZW50cy5vbGRNaXhpbihwcm90byk7XG4gIC8vIGFkZCBjdXN0b20gb25BbGxcbiAgdmFyIGV4cG9ydHMgPSBbJ29uQWxsJ107XG4gIGZvcih2YXIgaT0wOyBpIDwgZXhwb3J0cy5sZW5ndGg7aSsrKXtcbiAgICB2YXIgbmFtZSA9IGV4cG9ydHNbaV07XG4gICAgcHJvdG9bbmFtZV0gPSB0aGlzW25hbWVdO1xuICB9XG4gIHJldHVybiBwcm90bztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXZlbnRzO1xuIiwiLyoqXG4gKiBTdGFuZGFsb25lIGV4dHJhY3Rpb24gb2YgQmFja2JvbmUuRXZlbnRzLCBubyBleHRlcm5hbCBkZXBlbmRlbmN5IHJlcXVpcmVkLlxuICogRGVncmFkZXMgbmljZWx5IHdoZW4gQmFja29uZS91bmRlcnNjb3JlIGFyZSBhbHJlYWR5IGF2YWlsYWJsZSBpbiB0aGUgY3VycmVudFxuICogZ2xvYmFsIGNvbnRleHQuXG4gKlxuICogTm90ZSB0aGF0IGRvY3Mgc3VnZ2VzdCB0byB1c2UgdW5kZXJzY29yZSdzIGBfLmV4dGVuZCgpYCBtZXRob2QgdG8gYWRkIEV2ZW50c1xuICogc3VwcG9ydCB0byBzb21lIGdpdmVuIG9iamVjdC4gQSBgbWl4aW4oKWAgbWV0aG9kIGhhcyBiZWVuIGFkZGVkIHRvIHRoZSBFdmVudHNcbiAqIHByb3RvdHlwZSB0byBhdm9pZCB1c2luZyB1bmRlcnNjb3JlIGZvciB0aGF0IHNvbGUgcHVycG9zZTpcbiAqXG4gKiAgICAgdmFyIG15RXZlbnRFbWl0dGVyID0gQmFja2JvbmVFdmVudHMubWl4aW4oe30pO1xuICpcbiAqIE9yIGZvciBhIGZ1bmN0aW9uIGNvbnN0cnVjdG9yOlxuICpcbiAqICAgICBmdW5jdGlvbiBNeUNvbnN0cnVjdG9yKCl7fVxuICogICAgIE15Q29uc3RydWN0b3IucHJvdG90eXBlLmZvbyA9IGZ1bmN0aW9uKCl7fVxuICogICAgIEJhY2tib25lRXZlbnRzLm1peGluKE15Q29uc3RydWN0b3IucHJvdG90eXBlKTtcbiAqXG4gKiAoYykgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBJbmMuXG4gKiAoYykgMjAxMyBOaWNvbGFzIFBlcnJpYXVsdFxuICovXG4vKiBnbG9iYWwgZXhwb3J0czp0cnVlLCBkZWZpbmUsIG1vZHVsZSAqL1xuKGZ1bmN0aW9uKCkge1xuICB2YXIgcm9vdCA9IHRoaXMsXG4gICAgICBicmVha2VyID0ge30sXG4gICAgICBuYXRpdmVGb3JFYWNoID0gQXJyYXkucHJvdG90eXBlLmZvckVhY2gsXG4gICAgICBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksXG4gICAgICBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZSxcbiAgICAgIGlkQ291bnRlciA9IDA7XG5cbiAgLy8gUmV0dXJucyBhIHBhcnRpYWwgaW1wbGVtZW50YXRpb24gbWF0Y2hpbmcgdGhlIG1pbmltYWwgQVBJIHN1YnNldCByZXF1aXJlZFxuICAvLyBieSBCYWNrYm9uZS5FdmVudHNcbiAgZnVuY3Rpb24gbWluaXNjb3JlKCkge1xuICAgIHJldHVybiB7XG4gICAgICBrZXlzOiBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBvYmogIT09IFwiZnVuY3Rpb25cIiB8fCBvYmogPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwia2V5cygpIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGtleSwga2V5cyA9IFtdO1xuICAgICAgICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGtleXNba2V5cy5sZW5ndGhdID0ga2V5O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5cztcbiAgICAgIH0sXG5cbiAgICAgIHVuaXF1ZUlkOiBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICAgICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICAgICAgcmV0dXJuIHByZWZpeCA/IHByZWZpeCArIGlkIDogaWQ7XG4gICAgICB9LFxuXG4gICAgICBoYXM6IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgICAgIH0sXG5cbiAgICAgIGVhY2g6IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICAgICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm47XG4gICAgICAgIGlmIChuYXRpdmVGb3JFYWNoICYmIG9iai5mb3JFYWNoID09PSBuYXRpdmVGb3JFYWNoKSB7XG4gICAgICAgICAgb2JqLmZvckVhY2goaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgICB9IGVsc2UgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBvYmoubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpbaV0sIGksIG9iaikgPT09IGJyZWFrZXIpIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICAgICAgaWYgKHRoaXMuaGFzKG9iaiwga2V5KSkge1xuICAgICAgICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpba2V5XSwga2V5LCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICBvbmNlOiBmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgIHZhciByYW4gPSBmYWxzZSwgbWVtbztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChyYW4pIHJldHVybiBtZW1vO1xuICAgICAgICAgIHJhbiA9IHRydWU7XG4gICAgICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICBmdW5jID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gbWVtbztcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgdmFyIF8gPSBtaW5pc2NvcmUoKSwgRXZlbnRzO1xuXG4gIC8vIEJhY2tib25lLkV2ZW50c1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBBIG1vZHVsZSB0aGF0IGNhbiBiZSBtaXhlZCBpbiB0byAqYW55IG9iamVjdCogaW4gb3JkZXIgdG8gcHJvdmlkZSBpdCB3aXRoXG4gIC8vIGN1c3RvbSBldmVudHMuIFlvdSBtYXkgYmluZCB3aXRoIGBvbmAgb3IgcmVtb3ZlIHdpdGggYG9mZmAgY2FsbGJhY2tcbiAgLy8gZnVuY3Rpb25zIHRvIGFuIGV2ZW50OyBgdHJpZ2dlcmAtaW5nIGFuIGV2ZW50IGZpcmVzIGFsbCBjYWxsYmFja3MgaW5cbiAgLy8gc3VjY2Vzc2lvbi5cbiAgLy9cbiAgLy8gICAgIHZhciBvYmplY3QgPSB7fTtcbiAgLy8gICAgIF8uZXh0ZW5kKG9iamVjdCwgQmFja2JvbmUuRXZlbnRzKTtcbiAgLy8gICAgIG9iamVjdC5vbignZXhwYW5kJywgZnVuY3Rpb24oKXsgYWxlcnQoJ2V4cGFuZGVkJyk7IH0pO1xuICAvLyAgICAgb2JqZWN0LnRyaWdnZXIoJ2V4cGFuZCcpO1xuICAvL1xuICBFdmVudHMgPSB7XG5cbiAgICAvLyBCaW5kIGFuIGV2ZW50IHRvIGEgYGNhbGxiYWNrYCBmdW5jdGlvbi4gUGFzc2luZyBgXCJhbGxcImAgd2lsbCBiaW5kXG4gICAgLy8gdGhlIGNhbGxiYWNrIHRvIGFsbCBldmVudHMgZmlyZWQuXG4gICAgb246IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAnb24nLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xuICAgICAgdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gICAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdIHx8ICh0aGlzLl9ldmVudHNbbmFtZV0gPSBbXSk7XG4gICAgICBldmVudHMucHVzaCh7Y2FsbGJhY2s6IGNhbGxiYWNrLCBjb250ZXh0OiBjb250ZXh0LCBjdHg6IGNvbnRleHQgfHwgdGhpc30pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIEJpbmQgYW4gZXZlbnQgdG8gb25seSBiZSB0cmlnZ2VyZWQgYSBzaW5nbGUgdGltZS4gQWZ0ZXIgdGhlIGZpcnN0IHRpbWVcbiAgICAvLyB0aGUgY2FsbGJhY2sgaXMgaW52b2tlZCwgaXQgd2lsbCBiZSByZW1vdmVkLlxuICAgIG9uY2U6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAnb25jZScsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pIHx8ICFjYWxsYmFjaykgcmV0dXJuIHRoaXM7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgb25jZSA9IF8ub25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5vZmYobmFtZSwgb25jZSk7XG4gICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9KTtcbiAgICAgIG9uY2UuX2NhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICByZXR1cm4gdGhpcy5vbihuYW1lLCBvbmNlLCBjb250ZXh0KTtcbiAgICB9LFxuXG4gICAgLy8gUmVtb3ZlIG9uZSBvciBtYW55IGNhbGxiYWNrcy4gSWYgYGNvbnRleHRgIGlzIG51bGwsIHJlbW92ZXMgYWxsXG4gICAgLy8gY2FsbGJhY2tzIHdpdGggdGhhdCBmdW5jdGlvbi4gSWYgYGNhbGxiYWNrYCBpcyBudWxsLCByZW1vdmVzIGFsbFxuICAgIC8vIGNhbGxiYWNrcyBmb3IgdGhlIGV2ZW50LiBJZiBgbmFtZWAgaXMgbnVsbCwgcmVtb3ZlcyBhbGwgYm91bmRcbiAgICAvLyBjYWxsYmFja3MgZm9yIGFsbCBldmVudHMuXG4gICAgb2ZmOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgdmFyIHJldGFpbiwgZXYsIGV2ZW50cywgbmFtZXMsIGksIGwsIGosIGs7XG4gICAgICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhZXZlbnRzQXBpKHRoaXMsICdvZmYnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSkgcmV0dXJuIHRoaXM7XG4gICAgICBpZiAoIW5hbWUgJiYgIWNhbGxiYWNrICYmICFjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgbmFtZXMgPSBuYW1lID8gW25hbWVdIDogXy5rZXlzKHRoaXMuX2V2ZW50cyk7XG4gICAgICBmb3IgKGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIG5hbWUgPSBuYW1lc1tpXTtcbiAgICAgICAgaWYgKGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSkge1xuICAgICAgICAgIHRoaXMuX2V2ZW50c1tuYW1lXSA9IHJldGFpbiA9IFtdO1xuICAgICAgICAgIGlmIChjYWxsYmFjayB8fCBjb250ZXh0KSB7XG4gICAgICAgICAgICBmb3IgKGogPSAwLCBrID0gZXZlbnRzLmxlbmd0aDsgaiA8IGs7IGorKykge1xuICAgICAgICAgICAgICBldiA9IGV2ZW50c1tqXTtcbiAgICAgICAgICAgICAgaWYgKChjYWxsYmFjayAmJiBjYWxsYmFjayAhPT0gZXYuY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrLl9jYWxsYmFjaykgfHxcbiAgICAgICAgICAgICAgICAgIChjb250ZXh0ICYmIGNvbnRleHQgIT09IGV2LmNvbnRleHQpKSB7XG4gICAgICAgICAgICAgICAgcmV0YWluLnB1c2goZXYpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghcmV0YWluLmxlbmd0aCkgZGVsZXRlIHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy8gVHJpZ2dlciBvbmUgb3IgbWFueSBldmVudHMsIGZpcmluZyBhbGwgYm91bmQgY2FsbGJhY2tzLiBDYWxsYmFja3MgYXJlXG4gICAgLy8gcGFzc2VkIHRoZSBzYW1lIGFyZ3VtZW50cyBhcyBgdHJpZ2dlcmAgaXMsIGFwYXJ0IGZyb20gdGhlIGV2ZW50IG5hbWVcbiAgICAvLyAodW5sZXNzIHlvdSdyZSBsaXN0ZW5pbmcgb24gYFwiYWxsXCJgLCB3aGljaCB3aWxsIGNhdXNlIHlvdXIgY2FsbGJhY2sgdG9cbiAgICAvLyByZWNlaXZlIHRoZSB0cnVlIG5hbWUgb2YgdGhlIGV2ZW50IGFzIHRoZSBmaXJzdCBhcmd1bWVudCkuXG4gICAgdHJpZ2dlcjogZnVuY3Rpb24obmFtZSkge1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiB0aGlzO1xuICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICBpZiAoIWV2ZW50c0FwaSh0aGlzLCAndHJpZ2dlcicsIG5hbWUsIGFyZ3MpKSByZXR1cm4gdGhpcztcbiAgICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV07XG4gICAgICB2YXIgYWxsRXZlbnRzID0gdGhpcy5fZXZlbnRzLmFsbDtcbiAgICAgIGlmIChldmVudHMpIHRyaWdnZXJFdmVudHMoZXZlbnRzLCBhcmdzKTtcbiAgICAgIGlmIChhbGxFdmVudHMpIHRyaWdnZXJFdmVudHMoYWxsRXZlbnRzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIFRlbGwgdGhpcyBvYmplY3QgdG8gc3RvcCBsaXN0ZW5pbmcgdG8gZWl0aGVyIHNwZWNpZmljIGV2ZW50cyAuLi4gb3JcbiAgICAvLyB0byBldmVyeSBvYmplY3QgaXQncyBjdXJyZW50bHkgbGlzdGVuaW5nIHRvLlxuICAgIHN0b3BMaXN0ZW5pbmc6IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnM7XG4gICAgICBpZiAoIWxpc3RlbmVycykgcmV0dXJuIHRoaXM7XG4gICAgICB2YXIgZGVsZXRlTGlzdGVuZXIgPSAhbmFtZSAmJiAhY2FsbGJhY2s7XG4gICAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XG4gICAgICBpZiAob2JqKSAobGlzdGVuZXJzID0ge30pW29iai5fbGlzdGVuZXJJZF0gPSBvYmo7XG4gICAgICBmb3IgKHZhciBpZCBpbiBsaXN0ZW5lcnMpIHtcbiAgICAgICAgbGlzdGVuZXJzW2lkXS5vZmYobmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xuICAgICAgICBpZiAoZGVsZXRlTGlzdGVuZXIpIGRlbGV0ZSB0aGlzLl9saXN0ZW5lcnNbaWRdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gIH07XG5cbiAgLy8gUmVndWxhciBleHByZXNzaW9uIHVzZWQgdG8gc3BsaXQgZXZlbnQgc3RyaW5ncy5cbiAgdmFyIGV2ZW50U3BsaXR0ZXIgPSAvXFxzKy87XG5cbiAgLy8gSW1wbGVtZW50IGZhbmN5IGZlYXR1cmVzIG9mIHRoZSBFdmVudHMgQVBJIHN1Y2ggYXMgbXVsdGlwbGUgZXZlbnRcbiAgLy8gbmFtZXMgYFwiY2hhbmdlIGJsdXJcImAgYW5kIGpRdWVyeS1zdHlsZSBldmVudCBtYXBzIGB7Y2hhbmdlOiBhY3Rpb259YFxuICAvLyBpbiB0ZXJtcyBvZiB0aGUgZXhpc3RpbmcgQVBJLlxuICB2YXIgZXZlbnRzQXBpID0gZnVuY3Rpb24ob2JqLCBhY3Rpb24sIG5hbWUsIHJlc3QpIHtcbiAgICBpZiAoIW5hbWUpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gSGFuZGxlIGV2ZW50IG1hcHMuXG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yICh2YXIga2V5IGluIG5hbWUpIHtcbiAgICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBba2V5LCBuYW1lW2tleV1dLmNvbmNhdChyZXN0KSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHNwYWNlIHNlcGFyYXRlZCBldmVudCBuYW1lcy5cbiAgICBpZiAoZXZlbnRTcGxpdHRlci50ZXN0KG5hbWUpKSB7XG4gICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KGV2ZW50U3BsaXR0ZXIpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgb2JqW2FjdGlvbl0uYXBwbHkob2JqLCBbbmFtZXNbaV1dLmNvbmNhdChyZXN0KSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gQSBkaWZmaWN1bHQtdG8tYmVsaWV2ZSwgYnV0IG9wdGltaXplZCBpbnRlcm5hbCBkaXNwYXRjaCBmdW5jdGlvbiBmb3JcbiAgLy8gdHJpZ2dlcmluZyBldmVudHMuIFRyaWVzIHRvIGtlZXAgdGhlIHVzdWFsIGNhc2VzIHNwZWVkeSAobW9zdCBpbnRlcm5hbFxuICAvLyBCYWNrYm9uZSBldmVudHMgaGF2ZSAzIGFyZ3VtZW50cykuXG4gIHZhciB0cmlnZ2VyRXZlbnRzID0gZnVuY3Rpb24oZXZlbnRzLCBhcmdzKSB7XG4gICAgdmFyIGV2LCBpID0gLTEsIGwgPSBldmVudHMubGVuZ3RoLCBhMSA9IGFyZ3NbMF0sIGEyID0gYXJnc1sxXSwgYTMgPSBhcmdzWzJdO1xuICAgIHN3aXRjaCAoYXJncy5sZW5ndGgpIHtcbiAgICAgIGNhc2UgMDogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgpOyByZXR1cm47XG4gICAgICBjYXNlIDE6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSk7IHJldHVybjtcbiAgICAgIGNhc2UgMjogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMik7IHJldHVybjtcbiAgICAgIGNhc2UgMzogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExLCBhMiwgYTMpOyByZXR1cm47XG4gICAgICBkZWZhdWx0OiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5hcHBseShldi5jdHgsIGFyZ3MpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgbGlzdGVuTWV0aG9kcyA9IHtsaXN0ZW5UbzogJ29uJywgbGlzdGVuVG9PbmNlOiAnb25jZSd9O1xuXG4gIC8vIEludmVyc2lvbi1vZi1jb250cm9sIHZlcnNpb25zIG9mIGBvbmAgYW5kIGBvbmNlYC4gVGVsbCAqdGhpcyogb2JqZWN0IHRvXG4gIC8vIGxpc3RlbiB0byBhbiBldmVudCBpbiBhbm90aGVyIG9iamVjdCAuLi4ga2VlcGluZyB0cmFjayBvZiB3aGF0IGl0J3NcbiAgLy8gbGlzdGVuaW5nIHRvLlxuICBfLmVhY2gobGlzdGVuTWV0aG9kcywgZnVuY3Rpb24oaW1wbGVtZW50YXRpb24sIG1ldGhvZCkge1xuICAgIEV2ZW50c1ttZXRob2RdID0gZnVuY3Rpb24ob2JqLCBuYW1lLCBjYWxsYmFjaykge1xuICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCAodGhpcy5fbGlzdGVuZXJzID0ge30pO1xuICAgICAgdmFyIGlkID0gb2JqLl9saXN0ZW5lcklkIHx8IChvYmouX2xpc3RlbmVySWQgPSBfLnVuaXF1ZUlkKCdsJykpO1xuICAgICAgbGlzdGVuZXJzW2lkXSA9IG9iajtcbiAgICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIGNhbGxiYWNrID0gdGhpcztcbiAgICAgIG9ialtpbXBsZW1lbnRhdGlvbl0obmFtZSwgY2FsbGJhY2ssIHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gQWxpYXNlcyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG4gIEV2ZW50cy5iaW5kICAgPSBFdmVudHMub247XG4gIEV2ZW50cy51bmJpbmQgPSBFdmVudHMub2ZmO1xuXG4gIC8vIE1peGluIHV0aWxpdHlcbiAgRXZlbnRzLm1peGluID0gZnVuY3Rpb24ocHJvdG8pIHtcbiAgICB2YXIgZXhwb3J0cyA9IFsnb24nLCAnb25jZScsICdvZmYnLCAndHJpZ2dlcicsICdzdG9wTGlzdGVuaW5nJywgJ2xpc3RlblRvJyxcbiAgICAgICAgICAgICAgICAgICAnbGlzdGVuVG9PbmNlJywgJ2JpbmQnLCAndW5iaW5kJ107XG4gICAgXy5lYWNoKGV4cG9ydHMsIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHByb3RvW25hbWVdID0gdGhpc1tuYW1lXTtcbiAgICB9LCB0aGlzKTtcbiAgICByZXR1cm4gcHJvdG87XG4gIH07XG5cbiAgLy8gRXhwb3J0IEV2ZW50cyBhcyBCYWNrYm9uZUV2ZW50cyBkZXBlbmRpbmcgb24gY3VycmVudCBjb250ZXh0XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRXZlbnRzO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gRXZlbnRzO1xuICAgIH1cbiAgICBleHBvcnRzLkJhY2tib25lRXZlbnRzID0gRXZlbnRzO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuQmFja2JvbmVFdmVudHMgPSBFdmVudHM7XG4gIH1cbn0pKHRoaXMpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lJyk7XG4iLCIvLyBkMy50aXBcbi8vIENvcHlyaWdodCAoYykgMjAxMyBKdXN0aW4gUGFsbWVyXG4vL1xuLy8gVG9vbHRpcHMgZm9yIGQzLmpzIFNWRyB2aXN1YWxpemF0aW9uc1xuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZSB3aXRoIGQzIGFzIGEgZGVwZW5kZW5jeS5cbiAgICBkZWZpbmUoWydkMyddLCBmYWN0b3J5KVxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGQzKSB7XG4gICAgICBkMy50aXAgPSBmYWN0b3J5KGQzKVxuICAgICAgcmV0dXJuIGQzLnRpcFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbC5cbiAgICByb290LmQzLnRpcCA9IGZhY3Rvcnkocm9vdC5kMylcbiAgfVxufSh0aGlzLCBmdW5jdGlvbiAoZDMpIHtcblxuICAvLyBQdWJsaWMgLSBjb250cnVjdHMgYSBuZXcgdG9vbHRpcFxuICAvL1xuICAvLyBSZXR1cm5zIGEgdGlwXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZGlyZWN0aW9uID0gZDNfdGlwX2RpcmVjdGlvbixcbiAgICAgICAgb2Zmc2V0ICAgID0gZDNfdGlwX29mZnNldCxcbiAgICAgICAgaHRtbCAgICAgID0gZDNfdGlwX2h0bWwsXG4gICAgICAgIG5vZGUgICAgICA9IGluaXROb2RlKCksXG4gICAgICAgIHN2ZyAgICAgICA9IG51bGwsXG4gICAgICAgIHBvaW50ICAgICA9IG51bGwsXG4gICAgICAgIHRhcmdldCAgICA9IG51bGxcblxuICAgIGZ1bmN0aW9uIHRpcCh2aXMpIHtcbiAgICAgIHN2ZyA9IGdldFNWR05vZGUodmlzKVxuICAgICAgcG9pbnQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKVxuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKVxuICAgIH1cblxuICAgIC8vIFB1YmxpYyAtIHNob3cgdGhlIHRvb2x0aXAgb24gdGhlIHNjcmVlblxuICAgIC8vXG4gICAgLy8gUmV0dXJucyBhIHRpcFxuICAgIHRpcC5zaG93ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgIGlmKGFyZ3NbYXJncy5sZW5ndGggLSAxXSBpbnN0YW5jZW9mIFNWR0VsZW1lbnQpIHRhcmdldCA9IGFyZ3MucG9wKClcblxuICAgICAgdmFyIGNvbnRlbnQgPSBodG1sLmFwcGx5KHRoaXMsIGFyZ3MpLFxuICAgICAgICAgIHBvZmZzZXQgPSBvZmZzZXQuYXBwbHkodGhpcywgYXJncyksXG4gICAgICAgICAgZGlyICAgICA9IGRpcmVjdGlvbi5hcHBseSh0aGlzLCBhcmdzKSxcbiAgICAgICAgICBub2RlbCAgID0gZDMuc2VsZWN0KG5vZGUpLFxuICAgICAgICAgIGkgICAgICAgPSBkaXJlY3Rpb25zLmxlbmd0aCxcbiAgICAgICAgICBjb29yZHMsXG4gICAgICAgICAgc2Nyb2xsVG9wICA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AgfHwgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AsXG4gICAgICAgICAgc2Nyb2xsTGVmdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0IHx8IGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdFxuXG4gICAgICBub2RlbC5odG1sKGNvbnRlbnQpXG4gICAgICAgIC5zdHlsZSh7IG9wYWNpdHk6IDEsICdwb2ludGVyLWV2ZW50cyc6ICdhbGwnIH0pXG5cbiAgICAgIHdoaWxlKGktLSkgbm9kZWwuY2xhc3NlZChkaXJlY3Rpb25zW2ldLCBmYWxzZSlcbiAgICAgIGNvb3JkcyA9IGRpcmVjdGlvbl9jYWxsYmFja3MuZ2V0KGRpcikuYXBwbHkodGhpcylcbiAgICAgIG5vZGVsLmNsYXNzZWQoZGlyLCB0cnVlKS5zdHlsZSh7XG4gICAgICAgIHRvcDogKGNvb3Jkcy50b3AgKyAgcG9mZnNldFswXSkgKyBzY3JvbGxUb3AgKyAncHgnLFxuICAgICAgICBsZWZ0OiAoY29vcmRzLmxlZnQgKyBwb2Zmc2V0WzFdKSArIHNjcm9sbExlZnQgKyAncHgnXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljIC0gaGlkZSB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gUmV0dXJucyBhIHRpcFxuICAgIHRpcC5oaWRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm9kZWwgPSBkMy5zZWxlY3Qobm9kZSlcbiAgICAgIG5vZGVsLnN0eWxlKHsgb3BhY2l0eTogMCwgJ3BvaW50ZXItZXZlbnRzJzogJ25vbmUnIH0pXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBQcm94eSBhdHRyIGNhbGxzIHRvIHRoZSBkMyB0aXAgY29udGFpbmVyLiAgU2V0cyBvciBnZXRzIGF0dHJpYnV0ZSB2YWx1ZS5cbiAgICAvL1xuICAgIC8vIG4gLSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGVcbiAgICAvLyB2IC0gdmFsdWUgb2YgdGhlIGF0dHJpYnV0ZVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aXAgb3IgYXR0cmlidXRlIHZhbHVlXG4gICAgdGlwLmF0dHIgPSBmdW5jdGlvbihuLCB2KSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIgJiYgdHlwZW9mIG4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBkMy5zZWxlY3Qobm9kZSkuYXR0cihuKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGFyZ3MgPSAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgICAgICBkMy5zZWxlY3Rpb24ucHJvdG90eXBlLmF0dHIuYXBwbHkoZDMuc2VsZWN0KG5vZGUpLCBhcmdzKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBQcm94eSBzdHlsZSBjYWxscyB0byB0aGUgZDMgdGlwIGNvbnRhaW5lci4gIFNldHMgb3IgZ2V0cyBhIHN0eWxlIHZhbHVlLlxuICAgIC8vXG4gICAgLy8gbiAtIG5hbWUgb2YgdGhlIHByb3BlcnR5XG4gICAgLy8gdiAtIHZhbHVlIG9mIHRoZSBwcm9wZXJ0eVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aXAgb3Igc3R5bGUgcHJvcGVydHkgdmFsdWVcbiAgICB0aXAuc3R5bGUgPSBmdW5jdGlvbihuLCB2KSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIgJiYgdHlwZW9mIG4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBkMy5zZWxlY3Qobm9kZSkuc3R5bGUobilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcmdzID0gIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgICAgZDMuc2VsZWN0aW9uLnByb3RvdHlwZS5zdHlsZS5hcHBseShkMy5zZWxlY3Qobm9kZSksIGFyZ3MpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFNldCBvciBnZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIE9uZSBvZiBuKG5vcnRoKSwgcyhzb3V0aCksIGUoZWFzdCksIG9yIHcod2VzdCksIG53KG5vcnRod2VzdCksXG4gICAgLy8gICAgIHN3KHNvdXRod2VzdCksIG5lKG5vcnRoZWFzdCkgb3Igc2Uoc291dGhlYXN0KVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aXAgb3IgZGlyZWN0aW9uXG4gICAgdGlwLmRpcmVjdGlvbiA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRpcmVjdGlvblxuICAgICAgZGlyZWN0aW9uID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogU2V0cyBvciBnZXRzIHRoZSBvZmZzZXQgb2YgdGhlIHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIEFycmF5IG9mIFt4LCB5XSBvZmZzZXRcbiAgICAvL1xuICAgIC8vIFJldHVybnMgb2Zmc2V0IG9yXG4gICAgdGlwLm9mZnNldCA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG9mZnNldFxuICAgICAgb2Zmc2V0ID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogc2V0cyBvciBnZXRzIHRoZSBodG1sIHZhbHVlIG9mIHRoZSB0b29sdGlwXG4gICAgLy9cbiAgICAvLyB2IC0gU3RyaW5nIHZhbHVlIG9mIHRoZSB0aXBcbiAgICAvL1xuICAgIC8vIFJldHVybnMgaHRtbCB2YWx1ZSBvciB0aXBcbiAgICB0aXAuaHRtbCA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGh0bWxcbiAgICAgIGh0bWwgPSB2ID09IG51bGwgPyB2IDogZDMuZnVuY3Rvcih2KVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZDNfdGlwX2RpcmVjdGlvbigpIHsgcmV0dXJuICduJyB9XG4gICAgZnVuY3Rpb24gZDNfdGlwX29mZnNldCgpIHsgcmV0dXJuIFswLCAwXSB9XG4gICAgZnVuY3Rpb24gZDNfdGlwX2h0bWwoKSB7IHJldHVybiAnICcgfVxuXG4gICAgdmFyIGRpcmVjdGlvbl9jYWxsYmFja3MgPSBkMy5tYXAoe1xuICAgICAgbjogIGRpcmVjdGlvbl9uLFxuICAgICAgczogIGRpcmVjdGlvbl9zLFxuICAgICAgZTogIGRpcmVjdGlvbl9lLFxuICAgICAgdzogIGRpcmVjdGlvbl93LFxuICAgICAgbnc6IGRpcmVjdGlvbl9udyxcbiAgICAgIG5lOiBkaXJlY3Rpb25fbmUsXG4gICAgICBzdzogZGlyZWN0aW9uX3N3LFxuICAgICAgc2U6IGRpcmVjdGlvbl9zZVxuICAgIH0pLFxuXG4gICAgZGlyZWN0aW9ucyA9IGRpcmVjdGlvbl9jYWxsYmFja3Mua2V5cygpXG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fbigpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm4ueSAtIG5vZGUub2Zmc2V0SGVpZ2h0LFxuICAgICAgICBsZWZ0OiBiYm94Lm4ueCAtIG5vZGUub2Zmc2V0V2lkdGggLyAyXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3MoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5zLnksXG4gICAgICAgIGxlZnQ6IGJib3gucy54IC0gbm9kZS5vZmZzZXRXaWR0aCAvIDJcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LmUueSAtIG5vZGUub2Zmc2V0SGVpZ2h0IC8gMixcbiAgICAgICAgbGVmdDogYmJveC5lLnhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fdygpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LncueSAtIG5vZGUub2Zmc2V0SGVpZ2h0IC8gMixcbiAgICAgICAgbGVmdDogYmJveC53LnggLSBub2RlLm9mZnNldFdpZHRoXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX253KCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gubncueSAtIG5vZGUub2Zmc2V0SGVpZ2h0LFxuICAgICAgICBsZWZ0OiBiYm94Lm53LnggLSBub2RlLm9mZnNldFdpZHRoXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX25lKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gubmUueSAtIG5vZGUub2Zmc2V0SGVpZ2h0LFxuICAgICAgICBsZWZ0OiBiYm94Lm5lLnhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fc3coKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5zdy55LFxuICAgICAgICBsZWZ0OiBiYm94LnN3LnggLSBub2RlLm9mZnNldFdpZHRoXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3NlKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3guc2UueSxcbiAgICAgICAgbGVmdDogYmJveC5lLnhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbml0Tm9kZSgpIHtcbiAgICAgIHZhciBub2RlID0gZDMuc2VsZWN0KGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpKVxuICAgICAgbm9kZS5zdHlsZSh7XG4gICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuICAgICAgICB0b3A6IDAsXG4gICAgICAgIG9wYWNpdHk6IDAsXG4gICAgICAgICdwb2ludGVyLWV2ZW50cyc6ICdub25lJyxcbiAgICAgICAgJ2JveC1zaXppbmcnOiAnYm9yZGVyLWJveCdcbiAgICAgIH0pXG5cbiAgICAgIHJldHVybiBub2RlLm5vZGUoKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNWR05vZGUoZWwpIHtcbiAgICAgIGVsID0gZWwubm9kZSgpXG4gICAgICBpZihlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdzdmcnKVxuICAgICAgICByZXR1cm4gZWxcblxuICAgICAgcmV0dXJuIGVsLm93bmVyU1ZHRWxlbWVudFxuICAgIH1cblxuICAgIC8vIFByaXZhdGUgLSBnZXRzIHRoZSBzY3JlZW4gY29vcmRpbmF0ZXMgb2YgYSBzaGFwZVxuICAgIC8vXG4gICAgLy8gR2l2ZW4gYSBzaGFwZSBvbiB0aGUgc2NyZWVuLCB3aWxsIHJldHVybiBhbiBTVkdQb2ludCBmb3IgdGhlIGRpcmVjdGlvbnNcbiAgICAvLyBuKG5vcnRoKSwgcyhzb3V0aCksIGUoZWFzdCksIHcod2VzdCksIG5lKG5vcnRoZWFzdCksIHNlKHNvdXRoZWFzdCksIG53KG5vcnRod2VzdCksXG4gICAgLy8gc3coc291dGh3ZXN0KS5cbiAgICAvL1xuICAgIC8vICAgICstKy0rXG4gICAgLy8gICAgfCAgIHxcbiAgICAvLyAgICArICAgK1xuICAgIC8vICAgIHwgICB8XG4gICAgLy8gICAgKy0rLStcbiAgICAvL1xuICAgIC8vIFJldHVybnMgYW4gT2JqZWN0IHtuLCBzLCBlLCB3LCBudywgc3csIG5lLCBzZX1cbiAgICBmdW5jdGlvbiBnZXRTY3JlZW5CQm94KCkge1xuICAgICAgdmFyIHRhcmdldGVsICAgPSB0YXJnZXQgfHwgZDMuZXZlbnQudGFyZ2V0O1xuXG4gICAgICB3aGlsZSAoJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiB0YXJnZXRlbC5nZXRTY3JlZW5DVE0gJiYgJ3VuZGVmaW5lZCcgPT09IHRhcmdldGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICB0YXJnZXRlbCA9IHRhcmdldGVsLnBhcmVudE5vZGU7XG4gICAgICB9XG5cbiAgICAgIHZhciBiYm94ICAgICAgID0ge30sXG4gICAgICAgICAgbWF0cml4ICAgICA9IHRhcmdldGVsLmdldFNjcmVlbkNUTSgpLFxuICAgICAgICAgIHRiYm94ICAgICAgPSB0YXJnZXRlbC5nZXRCQm94KCksXG4gICAgICAgICAgd2lkdGggICAgICA9IHRiYm94LndpZHRoLFxuICAgICAgICAgIGhlaWdodCAgICAgPSB0YmJveC5oZWlnaHQsXG4gICAgICAgICAgeCAgICAgICAgICA9IHRiYm94LngsXG4gICAgICAgICAgeSAgICAgICAgICA9IHRiYm94LnlcblxuICAgICAgcG9pbnQueCA9IHhcbiAgICAgIHBvaW50LnkgPSB5XG4gICAgICBiYm94Lm53ID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggKz0gd2lkdGhcbiAgICAgIGJib3gubmUgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSArPSBoZWlnaHRcbiAgICAgIGJib3guc2UgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueCAtPSB3aWR0aFxuICAgICAgYmJveC5zdyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC55IC09IGhlaWdodCAvIDJcbiAgICAgIGJib3gudyAgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueCArPSB3aWR0aFxuICAgICAgYmJveC5lID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggLT0gd2lkdGggLyAyXG4gICAgICBwb2ludC55IC09IGhlaWdodCAvIDJcbiAgICAgIGJib3gubiA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC55ICs9IGhlaWdodFxuICAgICAgYmJveC5zID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcblxuICAgICAgcmV0dXJuIGJib3hcbiAgICB9XG5cbiAgICByZXR1cm4gdGlwXG4gIH07XG5cbn0pKTtcbiIsIi8qKlxuICpcbiAqIE11dGF0aW9ucyBOZWVkbGUgUGxvdCAobXV0cy1uZWVkbGUtcGxvdClcbiAqXG4gKiBDcmVhdGVzIGEgbmVlZGxlIHBsb3QgKGEuay5hIHN0ZW0gcGxvdCwgbG9sbGlwb3AtcGxvdCBhbmQgc29vbiBhbHNvIGJhbGxvb24gcGxvdCA7LSlcbiAqIFRoaXMgY2xhc3MgdXNlcyB0aGUgbnBtLXJlcXVpcmUgbW9kdWxlIHRvIGxvYWQgZGVwZW5kZW5jaWVzIGQzLCBkMy10aXBcbiAqXG4gKiBAYXV0aG9yIE1pY2hhZWwgUCBTY2hyb2VkZXJcbiAqIEBjbGFzc1xuICovXG5cbmZ1bmN0aW9uIE11dHNOZWVkbGVQbG90IChjb25maWcpIHtcblxuICAgIC8vIElOSVRJQUxJWkFUSU9OXG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7ICAgICAgICAvLyBzZWxmID0gTXV0c05lZWRsZVBsb3RcblxuICAgIC8vIFgtY29vcmRpbmF0ZXNcbiAgICB0aGlzLm1heENvb3JkID0gY29uZmlnLm1heENvb3JkIHx8IC0xOyAgICAgICAgICAgICAvLyBUaGUgbWF4aW11bSBjb29yZCAoeC1heGlzKVxuICAgIGlmICh0aGlzLm1heENvb3JkIDwgMCkgeyB0aHJvdyBuZXcgRXJyb3IoXCInbWF4Q29vcmQnIG11c3QgYmUgZGVmaW5lZCBpbml0aWF0aW9uIGNvbmZpZyFcIik7IH1cbiAgICB0aGlzLm1pbkNvb3JkID0gY29uZmlnLm1pbkNvb3JkIHx8IDE7ICAgICAgICAgICAgICAgLy8gVGhlIG1pbmltdW0gY29vcmQgKHgtYXhpcylcblxuICAgIC8vIGRhdGFcbiAgICBtdXRhdGlvbkRhdGEgPSBjb25maWcubXV0YXRpb25EYXRhIHx8IC0xOyAgICAgICAgICAvLyAuanNvbiBmaWxlIG9yIGRpY3RcbiAgICBpZiAodGhpcy5tYXhDb29yZCA8IDApIHsgdGhyb3cgbmV3IEVycm9yKFwiJ211dGF0aW9uRGF0YScgbXVzdCBiZSBkZWZpbmVkIGluaXRpYXRpb24gY29uZmlnIVwiKTsgfVxuICAgIHJlZ2lvbkRhdGEgPSBjb25maWcucmVnaW9uRGF0YSB8fCAtMTsgICAgICAgICAgICAgIC8vIC5qc29uIGZpbGUgb3IgZGljdFxuICAgIGlmICh0aGlzLm1heENvb3JkIDwgMCkgeyB0aHJvdyBuZXcgRXJyb3IoXCIncmVnaW9uRGF0YScgbXVzdCBiZSBkZWZpbmVkIGluaXRpYXRpb24gY29uZmlnIVwiKTsgfVxuXG4gICAgLy8gUGxvdCBkaW1lbnNpb25zICYgdGFyZ2V0XG4gICAgdmFyIHRhcmdldEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjb25maWcudGFyZ2V0RWxlbWVudCkgfHwgY29uZmlnLnRhcmdldEVsZW1lbnQgfHwgZG9jdW1lbnQuYm9keSAgIC8vIFdoZXJlIHRvIGFwcGVuZCB0aGUgcGxvdCAoc3ZnKVxuXG4gICAgdmFyIHdpZHRoID0gdGhpcy53aWR0aCA9IGNvbmZpZy53aWR0aCB8fCB0YXJnZXRFbGVtZW50Lm9mZnNldFdpZHRoIHx8IDEwMDA7XG4gICAgdmFyIGhlaWdodCA9IHRoaXMuaGVpZ2h0ID0gY29uZmlnLmhlaWdodCB8fCB0YXJnZXRFbGVtZW50Lm9mZnNldEhlaWdodCB8fCA1MDA7XG5cbiAgICAvLyBDb2xvciBzY2FsZSAmIG1hcFxuICAgIHRoaXMuY29sb3JNYXAgPSBjb25maWcuY29sb3JNYXAgfHwge307ICAgICAgICAgICAgICAvLyBkaWN0XG4gICAgdmFyIGNvbG9ycyA9IE9iamVjdC5rZXlzKHRoaXMuY29sb3JNYXApLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBzZWxmLmNvbG9yTWFwW2tleV07XG4gICAgfSk7XG4gICAgdGhpcy5jb2xvclNjYWxlID0gZDMuc2NhbGUuY2F0ZWdvcnkyMCgpXG4gICAgICAgIC5kb21haW4oT2JqZWN0LmtleXModGhpcy5jb2xvck1hcCkpXG4gICAgICAgIC5yYW5nZShjb2xvcnMuY29uY2F0KGQzLnNjYWxlLmNhdGVnb3J5MjAoKS5yYW5nZSgpKSk7XG4gICAgdGhpcy5sZWdlbmRzID0gY29uZmlnLmxlZ2VuZHMgfHwge1xuICAgICAgICBcInlcIjogXCJWYWx1ZVwiLFxuICAgICAgICBcInhcIjogXCJDb29yZGluYXRlXCJcbiAgICB9O1xuICAgIHRoaXMuY2F0ZWdDb3VudHMgPSB7fTtcblxuICAgIHRoaXMuc3ZnQ2xhc3NlcyA9IFwibXV0bmVlZGxlc1wiXG4gICAgdGhpcy5idWZmZXIgPSAwO1xuXG4gICAgdmFyIG1heENvb3JkID0gdGhpcy5tYXhDb29yZDtcblxuICAgIHZhciBidWZmZXIgPSAwO1xuICAgIGlmICh3aWR0aCA+PSBoZWlnaHQpIHtcbiAgICAgIGJ1ZmZlciA9IGhlaWdodCAvIDg7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1ZmZlciA9IHdpZHRoIC8gODtcbiAgICB9XG5cbiAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcblxuICAgIC8vIElJTVBPUlQgQU5EIENPTkZJR1VSRSBUSVBTXG4gICAgdmFyIGQzdGlwID0gcmVxdWlyZSgnZDMtdGlwJyk7XG4gICAgZDN0aXAoZDMpOyAgICBcblxuXG4gICAgdGhpcy50aXAgPSBkMy50aXAoKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLXRpcCcpXG4gICAgICAub2Zmc2V0KFstMTAsIDBdKVxuICAgICAgLmh0bWwoZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gXCI8c3Bhbj5cIiArIGQudmFsdWUgKyBcIiBcIiArIGQuY2F0ZWdvcnkgKyAgXCIgYXQgY29vcmQuIFwiICsgZC5jb29yZFN0cmluZyArIFwiPC9zcGFuPlwiO1xuICAgICAgfSk7XG5cbiAgICAvLyBJTklUIFNWR1xuXG4gICAgdmFyIHN2ZyA9IGQzLnNlbGVjdCh0YXJnZXRFbGVtZW50KS5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aClcbiAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0KVxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIHRoaXMuc3ZnQ2xhc3Nlcyk7XG5cbiAgICBzdmcuY2FsbCh0aGlzLnRpcCk7XG5cbiAgICAvLyBERUZJTkUgU0NBTEVTXG5cbiAgICB2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFt0aGlzLm1pbkNvb3JkLCB0aGlzLm1heENvb3JkXSlcbiAgICAgIC5yYW5nZShbYnVmZmVyICogMS41ICwgd2lkdGggLSBidWZmZXJdKVxuICAgICAgLm5pY2UoKTtcbiAgICB0aGlzLnggPSB4O1xuXG4gICAgdmFyIHkgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbMSwyMF0pXG4gICAgICAucmFuZ2UoW2hlaWdodCAtIGJ1ZmZlciAqIDEuNSwgYnVmZmVyXSlcbiAgICAgIC5uaWNlKCk7XG4gICAgdGhpcy55ID0geTtcblxuICAgIHRoaXMuZHJhd05lZWRsZXMoc3ZnLCBtdXRhdGlvbkRhdGEsIHJlZ2lvbkRhdGEpO1xuXG4gICAgLy8gQ09ORklHVVJFIEJSVVNIXG4gICAgdmFyIGJydXNoID0gZDMuc3ZnLmJydXNoKClcbiAgICAgICAgLngoeClcbiAgICAgICAgLm9uKFwiYnJ1c2hcIiwgYnJ1c2htb3ZlKVxuICAgICAgICAub24oXCJicnVzaGVuZFwiLCBicnVzaGVuZCk7XG5cbiAgICB0aGlzLnN2Z0NsYXNzZXMgKz0gXCIgYnJ1c2hcIjtcbiAgICBzdmdcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCB0aGlzLnN2Z0NsYXNzZXMpXG4gICAgICAgIC5jYWxsKGJydXNoKVxuICAgICAgICAuc2VsZWN0QWxsKCcuZXh0ZW50JylcbiAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGhlaWdodCk7XG5cbiAgICBzZWxlY3RlZE5lZWRsZXMgPSBbXTtcbiAgICB2YXIgY2F0ZWdDb3VudHMgPSB7fTtcbiAgICBmdW5jdGlvbiBicnVzaG1vdmUoKSB7XG5cbiAgICAgICAgdmFyIGV4dGVudCA9IGJydXNoLmV4dGVudCgpO1xuICAgICAgICBuZWVkbGVIZWFkcyA9IGQzLnNlbGVjdEFsbChcIi5uZWVkbGUtaGVhZFwiKTs7XG4gICAgICAgIHNlbGVjdGVkTmVlZGxlcyA9IFtdO1xuICAgICAgICBjYXRlZ0NvdW50cyA9IHt9O1xuXG4gICAgICAgIG5lZWRsZUhlYWRzLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICBpc19icnVzaGVkID0gZXh0ZW50WzBdIDw9IGQuY29vcmQgJiYgZC5jb29yZCA8PSBleHRlbnRbMV07XG4gICAgICAgICAgICBpZiAoaXNfYnJ1c2hlZCkge1xuICAgICAgICAgICAgICAgIHNlbGVjdGVkTmVlZGxlcy5wdXNoKGQpO1xuICAgICAgICAgICAgICAgIGNhdGVnQ291bnRzW2QuY2F0ZWdvcnldID0gKGNhdGVnQ291bnRzW2QuY2F0ZWdvcnldIHx8IDApICsgZC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpc19icnVzaGVkO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGJydXNoZW5kKCkge1xuICAgICAgICBnZXRfYnV0dG9uID0gZDMuc2VsZWN0KFwiLmNsZWFyLWJ1dHRvblwiKTtcbiAgICAgICAgc2VsZi50cmlnZ2VyKCdvbk5lZWRsZVNlbGVjdGlvbkNoYW5nZScsIHtcbiAgICAgICAgICAgIGRhdGEgOiBzZWxlY3RlZE5lZWRsZXMsXG4gICAgICAgICAgICBjYXRlZ0NvdW50czogY2F0ZWdDb3VudHNcbiAgICAgICAgfSk7XG4gICAgICAgIC8qaWYoZ2V0X2J1dHRvbi5lbXB0eSgpID09PSB0cnVlKSB7XG4gICAgICAgICBjbGVhcl9idXR0b24gPSBzdmcuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgIC5hdHRyKFwieVwiLCA0NjApXG4gICAgICAgICAuYXR0cihcInhcIiwgODI1KVxuICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImNsZWFyLWJ1dHRvblwiKVxuICAgICAgICAgLnRleHQoXCJDbGVhciBCcnVzaFwiKTtcbiAgICAgICAgIH1cblxuICAgICAgICAgeC5kb21haW4oYnJ1c2guZXh0ZW50KCkpO1xuXG4gICAgICAgICB0cmFuc2l0aW9uX2RhdGEoKTtcbiAgICAgICAgIHJlc2V0X2F4aXMoKTtcblxuICAgICAgICAgcG9pbnRzLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCBmYWxzZSk7XG4gICAgICAgICBkMy5zZWxlY3QoXCIuYnJ1c2hcIikuY2FsbChicnVzaC5jbGVhcigpKTtcblxuICAgICAgICAgY2xlYXJfYnV0dG9uLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICB4LmRvbWFpbihbMCwgNTBdKTtcbiAgICAgICAgIHRyYW5zaXRpb25fZGF0YSgpO1xuICAgICAgICAgcmVzZXRfYXhpcygpO1xuICAgICAgICAgY2xlYXJfYnV0dG9uLnJlbW92ZSgpO1xuICAgICAgICAgfSk7Ki9cbiAgICB9XG5cblxuICAgIC8vIExFR0VORFxuICAgIHNlbGYgPSB0aGlzO1xuICAgIHZlcnRpY2FsTGVnZW5kID0gZDMuc3ZnXG4gICAgICAgIC5sZWdlbmQoKVxuICAgICAgICAubGFiZWxGb3JtYXQoZnVuY3Rpb24obCkgeyByZXR1cm4gKHNlbGYuY2F0ZWdDb3VudHNbbF0gfHwgXCJcIikgKyBcIiBcIiArIGw7IH0pXG4gICAgICAgIC5jZWxsUGFkZGluZyg0KVxuICAgICAgICAub3JpZW50YXRpb24oXCJ2ZXJ0aWNhbFwiKVxuICAgICAgICAudW5pdHMoXCJNdXRhdGlvbiBDYXRlZ29yaWVzXCIpXG4gICAgICAgIC5jZWxsV2lkdGgoMjApXG4gICAgICAgIC5jZWxsSGVpZ2h0KDEyKVxuICAgICAgICAuaW5wdXRTY2FsZSh0aGlzLmNvbG9yU2NhbGUpXG4gICAgICAgIC5jZWxsU3RlcHBpbmcoNCk7XG5cbiAgICB0aGlzLnVwZGF0ZU11dExlZ2VuZCA9IGZ1bmN0aW9uKGxlZ2VuZE9iail7XG5cbiAgICAgICAgc3ZnLmNhbGwobGVnZW5kT2JqKTtcblxuICAgICAgICBkaW0gPSBkMy5zZWxlY3QoXCIubXV0TGVnZW5kR3JvdXBcIikubm9kZSgpLmdldEJCb3goKTtcblxuICAgICAgICB2YXIgbWFyZ2luID0gMTA7XG4gICAgICAgIGRpbSA9IG11dExlZ2VuZEdyb3VwVGV4dC5ub2RlKCkuZ2V0QkJveCgpO1xuICAgICAgICBkaW0uaGVpZ2h0ICs9IG1hcmdpbiAqIDI7XG4gICAgICAgIGRpbS53aWR0aCArPSBtYXJnaW4gKiAyO1xuICAgICAgICBkaW0ueSAtPSBtYXJnaW47XG4gICAgICAgIGRpbS54IC09IG1hcmdpbjtcblxuICAgICAgICBkMy5zZWxlY3QoXCIubXV0TGVnZW5kQkdcIilcbiAgICAgICAgICAgIC5hdHRyKGRpbSlcbiAgICB9O1xuXG4gICAgdmFyIG11dExlZ2VuZEdyb3VwID0gc3ZnLmFwcGVuZChcImdcIilcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibXV0TGVnZW5kR3JvdXBcIilcbiAgICAgICAgICAuZGF0YShbIHtcInhcIjo4MDAsIFwieVwiOjUwfSBdKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDgwMCw1MClcIik7XG4gICAgdmFyIG11dExlZ2VuZEdyb3VwVGV4dCA9IG11dExlZ2VuZEdyb3VwXG4gICAgICAgIC5pbnNlcnQoXCJnXCIpXG4gICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm11dExlZ2VuZEdyb3VwVGV4dFwiKVxuICAgICAgICAgIC5jYWxsKHZlcnRpY2FsTGVnZW5kKTtcblxuICAgIC8vIHNldCBsZWdlbmQgYmFja2dyb3VuZFxuICAgIHZhciBtdXRMZWdlbmRCRyA9IG11dExlZ2VuZEdyb3VwXG4gICAgICAgIC5pbnNlcnQoXCJyZWN0XCIsIFwiOmZpcnN0LWNoaWxkXCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJtdXRMZWdlbmRCR1wiKVxuICAgICAgICAuYXR0cihcImZpbGxcIiwgXCJ3aGl0ZVwiKVxuICAgICAgICAuYXR0cihcInN0cm9rZVwiLCBcImJsYWNrXCIpXG4gICAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIFwiMXB4XCIpO1xuICAgIHRoaXMudXBkYXRlTXV0TGVnZW5kKHZlcnRpY2FsTGVnZW5kKVxuXG5cbiAgICB2YXIgZHJhZyA9IGQzLmJlaGF2aW9yLmRyYWcoKVxuICAgICAgICAub24oXCJkcmFnXCIsIGZ1bmN0aW9uKGQsaSkge1xuICAgICAgICAgICAgZC54ICs9IGQzLmV2ZW50LmR4O1xuICAgICAgICAgICAgZC55ICs9IGQzLmV2ZW50LmR5O1xuICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCxpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBbIGQueCxkLnkgXSArIFwiKVwiXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgICAub24oXCJkcmFnc3RhcnRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBkMy5ldmVudC5zb3VyY2VFdmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy8gc2lsZW5jZSBvdGhlciBsaXN0ZW5lcnNcbiAgICAgICAgfSk7XG5cbiAgICBtdXRMZWdlbmRHcm91cC5jYWxsKGRyYWcpO1xuXG4gICAgc2VsZi5vbihcIm9uTmVlZGxlU2VsZWN0aW9uQ2hhbmdlXCIsIGZ1bmN0aW9uIChlZGF0YSkge1xuICAgICAgICBzZWxmLmNhdGVnQ291bnRzID0gZWRhdGEuY2F0ZWdDb3VudHM7XG4gICAgICAgIHNlbGYudXBkYXRlTXV0TGVnZW5kKHZlcnRpY2FsTGVnZW5kKTtcbiAgICB9KTtcblxuXG5cbn1cblxuTXV0c05lZWRsZVBsb3QucHJvdG90eXBlLmRyYXdSZWdpb25zID0gZnVuY3Rpb24oc3ZnLCByZWdpb25EYXRhKSB7XG5cbiAgICB2YXIgbWF4Q29vcmQgPSB0aGlzLm1heENvb3JkO1xuICAgIHZhciBtaW5Db29yZCA9IHRoaXMubWluQ29vcmQ7XG4gICAgdmFyIGJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHZhciBjb2xvcnMgPSB0aGlzLmNvbG9yTWFwO1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB4ID0gdGhpcy54O1xuXG4gICAgdmFyIGJlbG93ID0gdHJ1ZTtcblxuXG4gICAgZ2V0UmVnaW9uU3RhcnQgPSBmdW5jdGlvbihyZWdpb24pIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KHJlZ2lvbi5zcGxpdChcIi1cIilbMF0pXG4gICAgfTtcblxuICAgIGdldFJlZ2lvbkVuZCA9IGZ1bmN0aW9uKHJlZ2lvbikge1xuICAgICAgICByZXR1cm4gcGFyc2VJbnQocmVnaW9uLnNwbGl0KFwiLVwiKVsxXSlcbiAgICB9O1xuXG4gICAgZ2V0Q29sb3IgPSB0aGlzLmNvbG9yU2NhbGU7XG5cbiAgICB2YXIgYmdfb2Zmc2V0ID0gMDtcbiAgICB2YXIgcmVnaW9uX29mZnNldCA9IGJnX29mZnNldC0zXG4gICAgdmFyIHRleHRfb2Zmc2V0ID0gYmdfb2Zmc2V0ICsgMjA7XG4gICAgaWYgKGJlbG93ICE9IHRydWUpIHtcbiAgICAgICAgdGV4dF9vZmZzZXQgPSBiZ19vZmZzZXQrNTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmF3KHJlZ2lvbkxpc3QpIHtcblxuICAgICAgICB2YXIgcmVnaW9uc0JHID0gZDMuc2VsZWN0KFwiLm11dG5lZWRsZXNcIikuc2VsZWN0QWxsKClcbiAgICAgICAgICAgIC5kYXRhKFtcImR1bW15XCJdKS5lbnRlcigpXG4gICAgICAgICAgICAuaW5zZXJ0KFwiZ1wiLCBcIjpmaXJzdC1jaGlsZFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInJlZ2lvbnNCR1wiKVxuICAgICAgICAgICAgLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCB4KG1pbkNvb3JkKSApXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgeSgwKSArIGJnX29mZnNldCApXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHgobWF4Q29vcmQpIC0geChtaW5Db29yZCkgKVxuICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgMTApO1xuXG5cbiAgICAgICAgdmFyIHJlZ2lvbnMgPSByZWdpb25zQkcgPSBkMy5zZWxlY3QoXCIubXV0bmVlZGxlc1wiKS5zZWxlY3RBbGwoKVxuICAgICAgICAgICAgLmRhdGEocmVnaW9uTGlzdClcbiAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInJlZ2lvbkdyb3VwXCIpO1xuXG4gICAgICAgIHJlZ2lvbnMuYXBwZW5kKFwicmVjdFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHgoci5zdGFydClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgeSgwKSArIHJlZ2lvbl9vZmZzZXQgKVxuICAgICAgICAgICAgLmF0dHIoXCJyeVwiLCBcIjNcIilcbiAgICAgICAgICAgIC5hdHRyKFwicnhcIiwgXCIzXCIpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHgoci5lbmQpIC0geChyLnN0YXJ0KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIDE2KVxuICAgICAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhLmNvbG9yXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQzLnJnYihkYXRhLmNvbG9yKS5kYXJrZXIoKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgcmVnaW9ucy5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwicmVnaW9uTmFtZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHgoci5zdGFydCkgKyAoeChyLmVuZCkgLSB4KHIuc3RhcnQpKSAvIDJcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgeSgwKSArIHRleHRfb2Zmc2V0KVxuICAgICAgICAgICAgLmF0dHIoXCJkeVwiLCBcIjAuMzVlbVwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsIFwiMTJweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1kZWNvcmF0aW9uXCIsIFwiYm9sZFwiKVxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5uYW1lXG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb3JtYXRSZWdpb25zKHJlZ2lvbnMpIHtcbiAgICAgICAgcmVnaW9uTGlzdCA9IFtdO1xuICAgICAgICBmb3IgKGtleSBpbiByZWdpb25zKSB7XG5cbiAgICAgICAgICAgIHJlZ2lvbkxpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgJ25hbWUnOiBrZXksXG4gICAgICAgICAgICAgICAgJ3N0YXJ0JzogZ2V0UmVnaW9uU3RhcnQocmVnaW9uc1trZXldKSxcbiAgICAgICAgICAgICAgICAnZW5kJzogZ2V0UmVnaW9uRW5kKHJlZ2lvbnNba2V5XSksXG4gICAgICAgICAgICAgICAgJ2NvbG9yJzogZ2V0Q29sb3Ioa2V5KVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlZ2lvbkxpc3Q7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiByZWdpb25EYXRhID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgLy8gYXNzdW1lIGRhdGEgaXMgaW4gYSBmaWxlXG4gICAgICAgIGQzLmpzb24ocmVnaW9uRGF0YSwgZnVuY3Rpb24oZXJyb3IsIHJlZ2lvbnMpIHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge3JldHVybiBjb25zb2xlLmRlYnVnKGVycm9yKX1cbiAgICAgICAgICAgIHJlZ2lvbkxpc3QgPSBmb3JtYXRSZWdpb25zKHJlZ2lvbnMpO1xuICAgICAgICAgICAgZHJhdyhyZWdpb25MaXN0KTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmVnaW9uTGlzdCA9IGZvcm1hdFJlZ2lvbnMocmVnaW9uRGF0YSk7XG4gICAgICAgIGRyYXcocmVnaW9uTGlzdCk7XG4gICAgfVxuXG59O1xuXG5cbk11dHNOZWVkbGVQbG90LnByb3RvdHlwZS5kcmF3QXhlcyA9IGZ1bmN0aW9uKHN2Zykge1xuXG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHggPSB0aGlzLng7XG5cbiAgICB4QXhpcyA9IGQzLnN2Zy5heGlzKCkuc2NhbGUoeCkub3JpZW50KFwiYm90dG9tXCIpO1xuXG4gICAgc3ZnLmFwcGVuZChcInN2ZzpnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIFwieC1heGlzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZSgwLFwiICsgKHRoaXMuaGVpZ2h0IC0gdGhpcy5idWZmZXIpICsgXCIpXCIpXG4gICAgICAuY2FsbCh4QXhpcyk7XG5cbiAgICB5QXhpcyA9IGQzLnN2Zy5heGlzKCkuc2NhbGUoeSkub3JpZW50KFwibGVmdFwiKTtcblxuXG4gICAgc3ZnLmFwcGVuZChcInN2ZzpnXCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIFwieS1heGlzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArICh0aGlzLmJ1ZmZlciAqIDEuMiArIC0gMTApICArIFwiLDApXCIpXG4gICAgICAuY2FsbCh5QXhpcyk7XG5cbiAgICBzdmcuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInktbGFiZWxcIilcbiAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKHRoaXMuYnVmZmVyIC8gMykgKyBcIixcIiArICh0aGlzLmhlaWdodCAvIDIpICsgXCIpLCByb3RhdGUoLTkwKVwiKVxuICAgICAgLnRleHQodGhpcy5sZWdlbmRzLnkpO1xuXG4gICAgc3ZnLmFwcGVuZChcInRleHRcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ4LWxhYmVsXCIpXG4gICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArICh0aGlzLndpZHRoIC8gMikgKyBcIixcIiArICh0aGlzLmhlaWdodCAtIHRoaXMuYnVmZmVyIC8gMykgKyBcIilcIilcbiAgICAgIC50ZXh0KHRoaXMubGVnZW5kcy54KTtcbiAgICBcbn07XG5cblxuXG5NdXRzTmVlZGxlUGxvdC5wcm90b3R5cGUuZHJhd05lZWRsZXMgPSBmdW5jdGlvbihzdmcsIG11dGF0aW9uRGF0YSwgcmVnaW9uRGF0YSkge1xuXG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHBsb3R0ZXIgPSB0aGlzO1xuXG4gICAgZ2V0WUF4aXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHk7XG4gICAgfTtcblxuICAgIGZvcm1hdENvb3JkID0gZnVuY3Rpb24oY29vcmQpIHtcbiAgICAgICBpZiAoY29vcmQuaW5kZXhPZihcIi1cIikgPiAtMSkge1xuICAgICAgICAgICAgY29vcmRzID0gY29vcmQuc3BsaXQoXCItXCIpO1xuICAgICAgICAgICAgLy8gcGxhY2UgbmVlZGUgYXQgbWlkZGxlIG9mIGFmZmVjdGVkIHJlZ2lvblxuICAgICAgICAgICAgY29vcmQgPSBNYXRoLmZsb29yKChwYXJzZUludChjb29yZHNbMF0pICsgcGFyc2VJbnQoY29vcmRzWzFdKSkgLyAyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvb3JkID0gcGFyc2VJbnQoY29vcmQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb29yZDtcbiAgICB9O1xuXG4gICAgZ2V0Q29sb3IgPSB0aGlzLmNvbG9yU2NhbGU7XG4gICAgdGlwID0gdGhpcy50aXA7XG5cbiAgICAvLyBzdGFjayBuZWVkbGVzIGF0IHNhbWUgcG9zXG4gICAgbmVlZGxlUG9pbnQgPSB7fTtcbiAgICBoaWdoZXN0ID0gMDtcblxuICAgIHN0YWNrTmVlZGxlID0gZnVuY3Rpb24ocG9zLHZhbHVlLHBvaW50RGljdCkge1xuICAgICAgc3RpY2tIZWlnaHQgPSAwO1xuICAgICAgcG9zID0gXCJwXCIrU3RyaW5nKHBvcyk7XG4gICAgICBpZiAocG9zIGluIHBvaW50RGljdCkge1xuICAgICAgICAgc3RpY2tIZWlnaHQgPSBwb2ludERpY3RbcG9zXTtcbiAgICAgICAgIG5ld0hlaWdodCA9IHN0aWNrSGVpZ2h0ICsgdmFsdWU7XG4gICAgICAgICBwb2ludERpY3RbcG9zXSA9IG5ld0hlaWdodDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICBwb2ludERpY3RbcG9zXSA9IHZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0aWNrSGVpZ2h0O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBmb3JtYXRNdXRhdGlvbkVudHJ5KGQpIHtcblxuICAgICAgICBjb29yZFN0cmluZyA9IGQuY29vcmQ7XG4gICAgICAgIG51bWVyaWNDb29yZCA9IGZvcm1hdENvb3JkKGQuY29vcmQpO1xuICAgICAgICBudW1lcmljVmFsdWUgPSBOdW1iZXIoZC52YWx1ZSk7XG4gICAgICAgIHN0aWNrSGVpZ2h0ID0gc3RhY2tOZWVkbGUobnVtZXJpY0Nvb3JkLCBudW1lcmljVmFsdWUsIG5lZWRsZVBvaW50KTtcbiAgICAgICAgY2F0ZWdvcnkgPSBkLmNhdGVnb3J5IHx8IFwiXCI7XG5cbiAgICAgICAgaWYgKHN0aWNrSGVpZ2h0ICsgbnVtZXJpY1ZhbHVlID4gaGlnaGVzdCkge1xuICAgICAgICAgICAgLy8gc2V0IFktQXhpcyBhbHdheXMgdG8gaGlnaGVzdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGhpZ2hlc3QgPSBzdGlja0hlaWdodCArIG51bWVyaWNWYWx1ZTtcbiAgICAgICAgICAgIGdldFlBeGlzKCkuZG9tYWluKFswLCBoaWdoZXN0ICsgMl0pO1xuICAgICAgICB9XG5cblxuICAgICAgICBpZiAobnVtZXJpY0Nvb3JkID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgY29vcmRTdHJpbmc6IGNvb3JkU3RyaW5nLFxuICAgICAgICAgICAgICAgIGNvb3JkOiBudW1lcmljQ29vcmQsXG4gICAgICAgICAgICAgICAgdmFsdWU6IG51bWVyaWNWYWx1ZSxcbiAgICAgICAgICAgICAgICBzdGlja0hlaWdodDogc3RpY2tIZWlnaHQsXG4gICAgICAgICAgICAgICAgY29sb3I6IGdldENvbG9yKGNhdGVnb3J5KVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhcImRpc2NhcmRpbmcgXCIgKyBkLmNvb3JkICsgXCIgXCIgKyBkLmNhdGVnb3J5KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIG11dHMgPSBbXTtcblxuXG4gICAgaWYgKHR5cGVvZiBtdXRhdGlvbkRhdGEgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICBkMy5qc29uKG11dGF0aW9uRGF0YSwgZnVuY3Rpb24oZXJyb3IsIHVuZm9ybWF0dGVkTXV0cykge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtdXRzID0gcHJlcGFyZU11dHModW5mb3JtYXR0ZWRNdXRzKTtcbiAgICAgICAgICAgIHBhaW50TXV0cyhtdXRzKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbXV0cyA9IHByZXBhcmVNdXRzKG11dGF0aW9uRGF0YSk7XG4gICAgICAgIHBhaW50TXV0cyhtdXRzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmVwYXJlTXV0cyh1bmZvcm1hdHRlZE11dHMpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gdW5mb3JtYXR0ZWRNdXRzKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWQgPSBmb3JtYXRNdXRhdGlvbkVudHJ5KHVuZm9ybWF0dGVkTXV0c1trZXldKTtcbiAgICAgICAgICAgIGlmIChmb3JtYXR0ZWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbXV0cy5wdXNoKGZvcm1hdHRlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG11dHM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFpbnRNdXRzKG11dHMpIHtcbiAgICAgICAgdmFyIG5lZWRsZXMgPSBkMy5zZWxlY3QoXCIubXV0bmVlZGxlc1wiKS5zZWxlY3RBbGwoKVxuICAgICAgICAgICAgLmRhdGEobXV0cykuZW50ZXIoKVxuICAgICAgICAgICAgLmFwcGVuZChcImxpbmVcIilcbiAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4geShkYXRhLnN0aWNrSGVpZ2h0K2RhdGEudmFsdWUpOyB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCBmdW5jdGlvbihkYXRhKSB7IHJldHVybiB5KGRhdGEuc3RpY2tIZWlnaHQpIH0pXG4gICAgICAgICAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uKGRhdGEpIHsgcmV0dXJuIHgoZGF0YS5jb29yZCkgfSlcbiAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4geChkYXRhLmNvb3JkKSB9KVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5lZWRsZS1saW5lXCIpO1xuXG5cbiAgICAgICAgbWluU2l6ZSA9IDQ7XG4gICAgICAgIG1heFNpemUgPSAxMDtcbiAgICAgICAgaGVhZFNpemVTY2FsZSA9IGQzLnNjYWxlLmxvZygpLnJhbmdlKFttaW5TaXplLG1heFNpemVdKS5kb21haW4oWzEsIGhpZ2hlc3QvMl0pO1xuICAgICAgICBoZWFkU2l6ZSA9IGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIHJldHVybiBkMy5taW4oW2QzLm1heChbaGVhZFNpemVTY2FsZShuKSxtaW5TaXplXSksIG1heFNpemVdKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgbmVlZGxlSGVhZHMgPSBkMy5zZWxlY3QoXCIubXV0bmVlZGxlc1wiKS5zZWxlY3RBbGwoKVxuICAgICAgICAgICAgLmRhdGEobXV0cylcbiAgICAgICAgICAgIC5lbnRlcigpLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjeVwiLCBmdW5jdGlvbihkYXRhKSB7IHJldHVybiB5KGRhdGEuc3RpY2tIZWlnaHQrZGF0YS52YWx1ZSkgfSApXG4gICAgICAgICAgICAuYXR0cihcImN4XCIsIGZ1bmN0aW9uKGRhdGEpIHsgcmV0dXJuIHgoZGF0YS5jb29yZCkgfSApXG4gICAgICAgICAgICAuYXR0cihcInJcIiwgZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4gaGVhZFNpemUoZGF0YS52YWx1ZSkgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJuZWVkbGUtaGVhZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbihkYXRhKSB7IHJldHVybiBkYXRhLmNvbG9yIH0pXG4gICAgICAgICAgICAuc3R5bGUoXCJzdHJva2VcIiwgZnVuY3Rpb24oZGF0YSkge3JldHVybiBkMy5yZ2IoZGF0YS5jb2xvcikuZGFya2VyKCl9KVxuICAgICAgICAgICAgLm9uKCdtb3VzZW92ZXInLCAgZnVuY3Rpb24oZCl7IGQzLnNlbGVjdCh0aGlzKS5tb3ZlVG9Gcm9udCgpOyB0aXAuc2hvdyhkKTsgfSlcbiAgICAgICAgICAgIC5vbignbW91c2VvdXQnLCB0aXAuaGlkZSk7XG5cbiAgICAgICAgZDMuc2VsZWN0aW9uLnByb3RvdHlwZS5tb3ZlVG9Gcm9udCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHRoaXMucGFyZW50Tm9kZS5hcHBlbmRDaGlsZCh0aGlzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGFkanVzdCB5LXNjYWxlIGFjY29yZGluZyB0byBoaWdoZXN0IHZhbHVlIGFuIGRyYXcgdGhlIHJlc3RcbiAgICAgICAgaWYgKHJlZ2lvbkRhdGEgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwbG90dGVyLmRyYXdSZWdpb25zKHN2ZywgcmVnaW9uRGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgcGxvdHRlci5kcmF3QXhlcyhzdmcpO1xuICAgIH1cblxufTtcblxuXG5cbnZhciBFdmVudHMgPSByZXF1aXJlKCdiaW9qcy1ldmVudHMnKTtcbkV2ZW50cy5taXhpbihNdXRzTmVlZGxlUGxvdC5wcm90b3R5cGUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE11dHNOZWVkbGVQbG90O1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9qcy9NdXRzTmVlZGxlUGxvdC5qc1wiKTtcbiJdfQ==
