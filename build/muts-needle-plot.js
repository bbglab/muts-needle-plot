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
    this.totalCategCounts = {};

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
      .attr('class', 'd3-tip d3-tip-needle')
      .offset([-10, 0])
      .html(function(d) {
        return "<span>" + d.value + " " + d.category +  " at coord. " + d.coordString + "</span>";
      });

    this.selectionTip = d3.tip()
        .attr('class', 'd3-tip d3-tip-selection')
        .offset([100, 0])
        .html(function(d) {
            return "<span> Selected coordinates<br/>" + Math.round(d.left) + " - " + Math.round(d.right) + "</span>";
        })
        .direction('n');

    // INIT SVG

    var svg = d3.select(targetElement).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", this.svgClasses);

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
    var brush = d3.svg.brush()
        .x(x)
        .on("brush", brushmove)
        .on("brushend", brushend);

    this.svgClasses += " brush";
    var selectionRect = svg.attr("class", this.svgClasses)
        .call(brush)
        .selectAll('.extent')
        .attr('height', height);

    selectedNeedles = [];
    function brushmove() {

        var extent = brush.extent();
        needleHeads = d3.selectAll(".needle-head");
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
            coords: brush.extent()
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

    /// DRAW
    this.drawNeedles(svg, mutationData, regionData);


    self.on("needleSelectionChange", function (edata) {
        self.categCounts = edata.categCounts;
        svg.call(verticalLegend);

    });

    self.on("needleSelectionChange", function(edata) {
            selection = edata.coords;
            if (selection[1] - selection[0] > 10) {
                self.selectionTip.show({left: selection[0], right: selection[1]}, selectionRect.node());
            } else {
                self.selectionTip.hide();
            }
        });



}

MutsNeedlePlot.prototype.drawLegend = function(svg) {

    // LEGEND
    self = this;
    mutsScale = self.colorScale.domain(Object.keys(self.totalCategCounts));
    var domain = self.x.domain();
    xplacement = (domain[1] - domain[0]) * 0.75 + (domain[1] - domain[0]);
    verticalLegend = d3.svg
        .legend()
        .labelFormat(function(l) { return (self.categCounts[l] || "") + " " + l; })
        .cellPadding(4)
        .orientation("vertical")
        .units("Mutations")
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
    var self = this;

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

            // record and count categories
            self.totalCategCounts[category] = (self.totalCategCounts[category] || 0) + numericValue;

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
            self.drawRegions(svg, regionData);
        }
        self.drawLegend(svg);
        self.drawAxes(svg);
    }

};



var Events = require('biojs-events');
Events.mixin(MutsNeedlePlot.prototype);

module.exports = MutsNeedlePlot;


},{"biojs-events":1,"d3-tip":4}],"muts-needle-plot":[function(require,module,exports){
module.exports = require("./src/js/MutsNeedlePlot.js");

},{"./src/js/MutsNeedlePlot.js":5}]},{},["muts-needle-plot"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9taWNoaS9Eb2N1bWVudHMvbXBlL3diaC9tdXRuZWVkbGVzL25vZGVfbW9kdWxlcy9iaW9qcy1ldmVudHMvaW5kZXguanMiLCIvaG9tZS9taWNoaS9Eb2N1bWVudHMvbXBlL3diaC9tdXRuZWVkbGVzL25vZGVfbW9kdWxlcy9iaW9qcy1ldmVudHMvbm9kZV9tb2R1bGVzL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lL2JhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lLmpzIiwiL2hvbWUvbWljaGkvRG9jdW1lbnRzL21wZS93YmgvbXV0bmVlZGxlcy9ub2RlX21vZHVsZXMvYmlvanMtZXZlbnRzL25vZGVfbW9kdWxlcy9iYWNrYm9uZS1ldmVudHMtc3RhbmRhbG9uZS9pbmRleC5qcyIsIi9ob21lL21pY2hpL0RvY3VtZW50cy9tcGUvd2JoL211dG5lZWRsZXMvbm9kZV9tb2R1bGVzL2QzLXRpcC9pbmRleC5qcyIsIi9ob21lL21pY2hpL0RvY3VtZW50cy9tcGUvd2JoL211dG5lZWRsZXMvc3JjL2pzL011dHNOZWVkbGVQbG90LmpzIiwiLi9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JSQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZnQkE7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgZXZlbnRzID0gcmVxdWlyZShcImJhY2tib25lLWV2ZW50cy1zdGFuZGFsb25lXCIpO1xuXG5ldmVudHMub25BbGwgPSBmdW5jdGlvbihjYWxsYmFjayxjb250ZXh0KXtcbiAgdGhpcy5vbihcImFsbFwiLCBjYWxsYmFjayxjb250ZXh0KTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBNaXhpbiB1dGlsaXR5XG5ldmVudHMub2xkTWl4aW4gPSBldmVudHMubWl4aW47XG5ldmVudHMubWl4aW4gPSBmdW5jdGlvbihwcm90bykge1xuICBldmVudHMub2xkTWl4aW4ocHJvdG8pO1xuICAvLyBhZGQgY3VzdG9tIG9uQWxsXG4gIHZhciBleHBvcnRzID0gWydvbkFsbCddO1xuICBmb3IodmFyIGk9MDsgaSA8IGV4cG9ydHMubGVuZ3RoO2krKyl7XG4gICAgdmFyIG5hbWUgPSBleHBvcnRzW2ldO1xuICAgIHByb3RvW25hbWVdID0gdGhpc1tuYW1lXTtcbiAgfVxuICByZXR1cm4gcHJvdG87XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV2ZW50cztcbiIsIi8qKlxuICogU3RhbmRhbG9uZSBleHRyYWN0aW9uIG9mIEJhY2tib25lLkV2ZW50cywgbm8gZXh0ZXJuYWwgZGVwZW5kZW5jeSByZXF1aXJlZC5cbiAqIERlZ3JhZGVzIG5pY2VseSB3aGVuIEJhY2tvbmUvdW5kZXJzY29yZSBhcmUgYWxyZWFkeSBhdmFpbGFibGUgaW4gdGhlIGN1cnJlbnRcbiAqIGdsb2JhbCBjb250ZXh0LlxuICpcbiAqIE5vdGUgdGhhdCBkb2NzIHN1Z2dlc3QgdG8gdXNlIHVuZGVyc2NvcmUncyBgXy5leHRlbmQoKWAgbWV0aG9kIHRvIGFkZCBFdmVudHNcbiAqIHN1cHBvcnQgdG8gc29tZSBnaXZlbiBvYmplY3QuIEEgYG1peGluKClgIG1ldGhvZCBoYXMgYmVlbiBhZGRlZCB0byB0aGUgRXZlbnRzXG4gKiBwcm90b3R5cGUgdG8gYXZvaWQgdXNpbmcgdW5kZXJzY29yZSBmb3IgdGhhdCBzb2xlIHB1cnBvc2U6XG4gKlxuICogICAgIHZhciBteUV2ZW50RW1pdHRlciA9IEJhY2tib25lRXZlbnRzLm1peGluKHt9KTtcbiAqXG4gKiBPciBmb3IgYSBmdW5jdGlvbiBjb25zdHJ1Y3RvcjpcbiAqXG4gKiAgICAgZnVuY3Rpb24gTXlDb25zdHJ1Y3Rvcigpe31cbiAqICAgICBNeUNvbnN0cnVjdG9yLnByb3RvdHlwZS5mb28gPSBmdW5jdGlvbigpe31cbiAqICAgICBCYWNrYm9uZUV2ZW50cy5taXhpbihNeUNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG4gKlxuICogKGMpIDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgSW5jLlxuICogKGMpIDIwMTMgTmljb2xhcyBQZXJyaWF1bHRcbiAqL1xuLyogZ2xvYmFsIGV4cG9ydHM6dHJ1ZSwgZGVmaW5lLCBtb2R1bGUgKi9cbihmdW5jdGlvbigpIHtcbiAgdmFyIHJvb3QgPSB0aGlzLFxuICAgICAgYnJlYWtlciA9IHt9LFxuICAgICAgbmF0aXZlRm9yRWFjaCA9IEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLFxuICAgICAgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuICAgICAgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UsXG4gICAgICBpZENvdW50ZXIgPSAwO1xuXG4gIC8vIFJldHVybnMgYSBwYXJ0aWFsIGltcGxlbWVudGF0aW9uIG1hdGNoaW5nIHRoZSBtaW5pbWFsIEFQSSBzdWJzZXQgcmVxdWlyZWRcbiAgLy8gYnkgQmFja2JvbmUuRXZlbnRzXG4gIGZ1bmN0aW9uIG1pbmlzY29yZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAga2V5czogT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgICAgICBpZiAodHlwZW9mIG9iaiAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2Ygb2JqICE9PSBcImZ1bmN0aW9uXCIgfHwgb2JqID09PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImtleXMoKSBjYWxsZWQgb24gYSBub24tb2JqZWN0XCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBrZXksIGtleXMgPSBbXTtcbiAgICAgICAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBrZXlzW2tleXMubGVuZ3RoXSA9IGtleTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICB9LFxuXG4gICAgICB1bmlxdWVJZDogZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgICAgIHZhciBpZCA9ICsraWRDb3VudGVyICsgJyc7XG4gICAgICAgIHJldHVybiBwcmVmaXggPyBwcmVmaXggKyBpZCA6IGlkO1xuICAgICAgfSxcblxuICAgICAgaGFzOiBmdW5jdGlvbihvYmosIGtleSkge1xuICAgICAgICByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG4gICAgICB9LFxuXG4gICAgICBlYWNoOiBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICBpZiAobmF0aXZlRm9yRWFjaCAmJiBvYmouZm9yRWFjaCA9PT0gbmF0aXZlRm9yRWFjaCkge1xuICAgICAgICAgIG9iai5mb3JFYWNoKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gb2JqLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2ldLCBpLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmhhcyhvYmosIGtleSkpIHtcbiAgICAgICAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2tleV0sIGtleSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgb25jZTogZnVuY3Rpb24oZnVuYykge1xuICAgICAgICB2YXIgcmFuID0gZmFsc2UsIG1lbW87XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAocmFuKSByZXR1cm4gbWVtbztcbiAgICAgICAgICByYW4gPSB0cnVlO1xuICAgICAgICAgIG1lbW8gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgZnVuYyA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHZhciBfID0gbWluaXNjb3JlKCksIEV2ZW50cztcblxuICAvLyBCYWNrYm9uZS5FdmVudHNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gQSBtb2R1bGUgdGhhdCBjYW4gYmUgbWl4ZWQgaW4gdG8gKmFueSBvYmplY3QqIGluIG9yZGVyIHRvIHByb3ZpZGUgaXQgd2l0aFxuICAvLyBjdXN0b20gZXZlbnRzLiBZb3UgbWF5IGJpbmQgd2l0aCBgb25gIG9yIHJlbW92ZSB3aXRoIGBvZmZgIGNhbGxiYWNrXG4gIC8vIGZ1bmN0aW9ucyB0byBhbiBldmVudDsgYHRyaWdnZXJgLWluZyBhbiBldmVudCBmaXJlcyBhbGwgY2FsbGJhY2tzIGluXG4gIC8vIHN1Y2Nlc3Npb24uXG4gIC8vXG4gIC8vICAgICB2YXIgb2JqZWN0ID0ge307XG4gIC8vICAgICBfLmV4dGVuZChvYmplY3QsIEJhY2tib25lLkV2ZW50cyk7XG4gIC8vICAgICBvYmplY3Qub24oJ2V4cGFuZCcsIGZ1bmN0aW9uKCl7IGFsZXJ0KCdleHBhbmRlZCcpOyB9KTtcbiAgLy8gICAgIG9iamVjdC50cmlnZ2VyKCdleHBhbmQnKTtcbiAgLy9cbiAgRXZlbnRzID0ge1xuXG4gICAgLy8gQmluZCBhbiBldmVudCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uIFBhc3NpbmcgYFwiYWxsXCJgIHdpbGwgYmluZFxuICAgIC8vIHRoZSBjYWxsYmFjayB0byBhbGwgZXZlbnRzIGZpcmVkLlxuICAgIG9uOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSByZXR1cm4gdGhpcztcbiAgICAgIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xuICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSB8fCAodGhpcy5fZXZlbnRzW25hbWVdID0gW10pO1xuICAgICAgZXZlbnRzLnB1c2goe2NhbGxiYWNrOiBjYWxsYmFjaywgY29udGV4dDogY29udGV4dCwgY3R4OiBjb250ZXh0IHx8IHRoaXN9KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBCaW5kIGFuIGV2ZW50IHRvIG9ubHkgYmUgdHJpZ2dlcmVkIGEgc2luZ2xlIHRpbWUuIEFmdGVyIHRoZSBmaXJzdCB0aW1lXG4gICAgLy8gdGhlIGNhbGxiYWNrIGlzIGludm9rZWQsIGl0IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICBvbmNlOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uY2UnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIG9uY2UgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYub2ZmKG5hbWUsIG9uY2UpO1xuICAgICAgICBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSk7XG4gICAgICBvbmNlLl9jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgcmV0dXJuIHRoaXMub24obmFtZSwgb25jZSwgY29udGV4dCk7XG4gICAgfSxcblxuICAgIC8vIFJlbW92ZSBvbmUgb3IgbWFueSBjYWxsYmFja3MuIElmIGBjb250ZXh0YCBpcyBudWxsLCByZW1vdmVzIGFsbFxuICAgIC8vIGNhbGxiYWNrcyB3aXRoIHRoYXQgZnVuY3Rpb24uIElmIGBjYWxsYmFja2AgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcbiAgICAvLyBjYWxsYmFja3MgZm9yIHRoZSBldmVudC4gSWYgYG5hbWVgIGlzIG51bGwsIHJlbW92ZXMgYWxsIGJvdW5kXG4gICAgLy8gY2FsbGJhY2tzIGZvciBhbGwgZXZlbnRzLlxuICAgIG9mZjogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICAgIHZhciByZXRhaW4sIGV2LCBldmVudHMsIG5hbWVzLCBpLCBsLCBqLCBrO1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIWV2ZW50c0FwaSh0aGlzLCAnb2ZmJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkpIHJldHVybiB0aGlzO1xuICAgICAgaWYgKCFuYW1lICYmICFjYWxsYmFjayAmJiAhY29udGV4dCkge1xuICAgICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIG5hbWVzID0gbmFtZSA/IFtuYW1lXSA6IF8ua2V5cyh0aGlzLl9ldmVudHMpO1xuICAgICAgZm9yIChpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgICAgIGlmIChldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0pIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHNbbmFtZV0gPSByZXRhaW4gPSBbXTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgfHwgY29udGV4dCkge1xuICAgICAgICAgICAgZm9yIChqID0gMCwgayA9IGV2ZW50cy5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgICAgICAgZXYgPSBldmVudHNbal07XG4gICAgICAgICAgICAgIGlmICgoY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrICYmIGNhbGxiYWNrICE9PSBldi5jYWxsYmFjay5fY2FsbGJhY2spIHx8XG4gICAgICAgICAgICAgICAgICAoY29udGV4dCAmJiBjb250ZXh0ICE9PSBldi5jb250ZXh0KSkge1xuICAgICAgICAgICAgICAgIHJldGFpbi5wdXNoKGV2KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIXJldGFpbi5sZW5ndGgpIGRlbGV0ZSB0aGlzLl9ldmVudHNbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIFRyaWdnZXIgb25lIG9yIG1hbnkgZXZlbnRzLCBmaXJpbmcgYWxsIGJvdW5kIGNhbGxiYWNrcy4gQ2FsbGJhY2tzIGFyZVxuICAgIC8vIHBhc3NlZCB0aGUgc2FtZSBhcmd1bWVudHMgYXMgYHRyaWdnZXJgIGlzLCBhcGFydCBmcm9tIHRoZSBldmVudCBuYW1lXG4gICAgLy8gKHVubGVzcyB5b3UncmUgbGlzdGVuaW5nIG9uIGBcImFsbFwiYCwgd2hpY2ggd2lsbCBjYXVzZSB5b3VyIGNhbGxiYWNrIHRvXG4gICAgLy8gcmVjZWl2ZSB0aGUgdHJ1ZSBuYW1lIG9mIHRoZSBldmVudCBhcyB0aGUgZmlyc3QgYXJndW1lbnQpLlxuICAgIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gdGhpcztcbiAgICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgaWYgKCFldmVudHNBcGkodGhpcywgJ3RyaWdnZXInLCBuYW1lLCBhcmdzKSkgcmV0dXJuIHRoaXM7XG4gICAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgICAgdmFyIGFsbEV2ZW50cyA9IHRoaXMuX2V2ZW50cy5hbGw7XG4gICAgICBpZiAoZXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGV2ZW50cywgYXJncyk7XG4gICAgICBpZiAoYWxsRXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGFsbEV2ZW50cywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBUZWxsIHRoaXMgb2JqZWN0IHRvIHN0b3AgbGlzdGVuaW5nIHRvIGVpdGhlciBzcGVjaWZpYyBldmVudHMgLi4uIG9yXG4gICAgLy8gdG8gZXZlcnkgb2JqZWN0IGl0J3MgY3VycmVudGx5IGxpc3RlbmluZyB0by5cbiAgICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbihvYmosIG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzO1xuICAgICAgaWYgKCFsaXN0ZW5lcnMpIHJldHVybiB0aGlzO1xuICAgICAgdmFyIGRlbGV0ZUxpc3RlbmVyID0gIW5hbWUgJiYgIWNhbGxiYWNrO1xuICAgICAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgY2FsbGJhY2sgPSB0aGlzO1xuICAgICAgaWYgKG9iaikgKGxpc3RlbmVycyA9IHt9KVtvYmouX2xpc3RlbmVySWRdID0gb2JqO1xuICAgICAgZm9yICh2YXIgaWQgaW4gbGlzdGVuZXJzKSB7XG4gICAgICAgIGxpc3RlbmVyc1tpZF0ub2ZmKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICAgICAgaWYgKGRlbGV0ZUxpc3RlbmVyKSBkZWxldGUgdGhpcy5fbGlzdGVuZXJzW2lkXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICB9O1xuXG4gIC8vIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIHNwbGl0IGV2ZW50IHN0cmluZ3MuXG4gIHZhciBldmVudFNwbGl0dGVyID0gL1xccysvO1xuXG4gIC8vIEltcGxlbWVudCBmYW5jeSBmZWF0dXJlcyBvZiB0aGUgRXZlbnRzIEFQSSBzdWNoIGFzIG11bHRpcGxlIGV2ZW50XG4gIC8vIG5hbWVzIGBcImNoYW5nZSBibHVyXCJgIGFuZCBqUXVlcnktc3R5bGUgZXZlbnQgbWFwcyBge2NoYW5nZTogYWN0aW9ufWBcbiAgLy8gaW4gdGVybXMgb2YgdGhlIGV4aXN0aW5nIEFQSS5cbiAgdmFyIGV2ZW50c0FwaSA9IGZ1bmN0aW9uKG9iaiwgYWN0aW9uLCBuYW1lLCByZXN0KSB7XG4gICAgaWYgKCFuYW1lKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIEhhbmRsZSBldmVudCBtYXBzLlxuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBuYW1lKSB7XG4gICAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW2tleSwgbmFtZVtrZXldXS5jb25jYXQocmVzdCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBzcGFjZSBzZXBhcmF0ZWQgZXZlbnQgbmFtZXMuXG4gICAgaWYgKGV2ZW50U3BsaXR0ZXIudGVzdChuYW1lKSkge1xuICAgICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChldmVudFNwbGl0dGVyKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW25hbWVzW2ldXS5jb25jYXQocmVzdCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIEEgZGlmZmljdWx0LXRvLWJlbGlldmUsIGJ1dCBvcHRpbWl6ZWQgaW50ZXJuYWwgZGlzcGF0Y2ggZnVuY3Rpb24gZm9yXG4gIC8vIHRyaWdnZXJpbmcgZXZlbnRzLiBUcmllcyB0byBrZWVwIHRoZSB1c3VhbCBjYXNlcyBzcGVlZHkgKG1vc3QgaW50ZXJuYWxcbiAgLy8gQmFja2JvbmUgZXZlbnRzIGhhdmUgMyBhcmd1bWVudHMpLlxuICB2YXIgdHJpZ2dlckV2ZW50cyA9IGZ1bmN0aW9uKGV2ZW50cywgYXJncykge1xuICAgIHZhciBldiwgaSA9IC0xLCBsID0gZXZlbnRzLmxlbmd0aCwgYTEgPSBhcmdzWzBdLCBhMiA9IGFyZ3NbMV0sIGEzID0gYXJnc1syXTtcbiAgICBzd2l0Y2ggKGFyZ3MubGVuZ3RoKSB7XG4gICAgICBjYXNlIDA6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4KTsgcmV0dXJuO1xuICAgICAgY2FzZSAxOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEpOyByZXR1cm47XG4gICAgICBjYXNlIDI6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIpOyByZXR1cm47XG4gICAgICBjYXNlIDM6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIsIGEzKTsgcmV0dXJuO1xuICAgICAgZGVmYXVsdDogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suYXBwbHkoZXYuY3R4LCBhcmdzKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGxpc3Rlbk1ldGhvZHMgPSB7bGlzdGVuVG86ICdvbicsIGxpc3RlblRvT25jZTogJ29uY2UnfTtcblxuICAvLyBJbnZlcnNpb24tb2YtY29udHJvbCB2ZXJzaW9ucyBvZiBgb25gIGFuZCBgb25jZWAuIFRlbGwgKnRoaXMqIG9iamVjdCB0b1xuICAvLyBsaXN0ZW4gdG8gYW4gZXZlbnQgaW4gYW5vdGhlciBvYmplY3QgLi4uIGtlZXBpbmcgdHJhY2sgb2Ygd2hhdCBpdCdzXG4gIC8vIGxpc3RlbmluZyB0by5cbiAgXy5lYWNoKGxpc3Rlbk1ldGhvZHMsIGZ1bmN0aW9uKGltcGxlbWVudGF0aW9uLCBtZXRob2QpIHtcbiAgICBFdmVudHNbbWV0aG9kXSA9IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnMgfHwgKHRoaXMuX2xpc3RlbmVycyA9IHt9KTtcbiAgICAgIHZhciBpZCA9IG9iai5fbGlzdGVuZXJJZCB8fCAob2JqLl9saXN0ZW5lcklkID0gXy51bmlxdWVJZCgnbCcpKTtcbiAgICAgIGxpc3RlbmVyc1tpZF0gPSBvYmo7XG4gICAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSBjYWxsYmFjayA9IHRoaXM7XG4gICAgICBvYmpbaW1wbGVtZW50YXRpb25dKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFsaWFzZXMgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuICBFdmVudHMuYmluZCAgID0gRXZlbnRzLm9uO1xuICBFdmVudHMudW5iaW5kID0gRXZlbnRzLm9mZjtcblxuICAvLyBNaXhpbiB1dGlsaXR5XG4gIEV2ZW50cy5taXhpbiA9IGZ1bmN0aW9uKHByb3RvKSB7XG4gICAgdmFyIGV4cG9ydHMgPSBbJ29uJywgJ29uY2UnLCAnb2ZmJywgJ3RyaWdnZXInLCAnc3RvcExpc3RlbmluZycsICdsaXN0ZW5UbycsXG4gICAgICAgICAgICAgICAgICAgJ2xpc3RlblRvT25jZScsICdiaW5kJywgJ3VuYmluZCddO1xuICAgIF8uZWFjaChleHBvcnRzLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICBwcm90b1tuYW1lXSA9IHRoaXNbbmFtZV07XG4gICAgfSwgdGhpcyk7XG4gICAgcmV0dXJuIHByb3RvO1xuICB9O1xuXG4gIC8vIEV4cG9ydCBFdmVudHMgYXMgQmFja2JvbmVFdmVudHMgZGVwZW5kaW5nIG9uIGN1cnJlbnQgY29udGV4dFxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIEV2ZW50cztcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50cztcbiAgICB9XG4gICAgZXhwb3J0cy5CYWNrYm9uZUV2ZW50cyA9IEV2ZW50cztcbiAgfSBlbHNlIHtcbiAgICByb290LkJhY2tib25lRXZlbnRzID0gRXZlbnRzO1xuICB9XG59KSh0aGlzKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9iYWNrYm9uZS1ldmVudHMtc3RhbmRhbG9uZScpO1xuIiwiLy8gZDMudGlwXG4vLyBDb3B5cmlnaHQgKGMpIDIwMTMgSnVzdGluIFBhbG1lclxuLy9cbi8vIFRvb2x0aXBzIGZvciBkMy5qcyBTVkcgdmlzdWFsaXphdGlvbnNcblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUgd2l0aCBkMyBhcyBhIGRlcGVuZGVuY3kuXG4gICAgZGVmaW5lKFsnZDMnXSwgZmFjdG9yeSlcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkMykge1xuICAgICAgZDMudGlwID0gZmFjdG9yeShkMylcbiAgICAgIHJldHVybiBkMy50aXBcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWwuXG4gICAgcm9vdC5kMy50aXAgPSBmYWN0b3J5KHJvb3QuZDMpXG4gIH1cbn0odGhpcywgZnVuY3Rpb24gKGQzKSB7XG5cbiAgLy8gUHVibGljIC0gY29udHJ1Y3RzIGEgbmV3IHRvb2x0aXBcbiAgLy9cbiAgLy8gUmV0dXJucyBhIHRpcFxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRpcmVjdGlvbiA9IGQzX3RpcF9kaXJlY3Rpb24sXG4gICAgICAgIG9mZnNldCAgICA9IGQzX3RpcF9vZmZzZXQsXG4gICAgICAgIGh0bWwgICAgICA9IGQzX3RpcF9odG1sLFxuICAgICAgICBub2RlICAgICAgPSBpbml0Tm9kZSgpLFxuICAgICAgICBzdmcgICAgICAgPSBudWxsLFxuICAgICAgICBwb2ludCAgICAgPSBudWxsLFxuICAgICAgICB0YXJnZXQgICAgPSBudWxsXG5cbiAgICBmdW5jdGlvbiB0aXAodmlzKSB7XG4gICAgICBzdmcgPSBnZXRTVkdOb2RlKHZpcylcbiAgICAgIHBvaW50ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KClcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICB9XG5cbiAgICAvLyBQdWJsaWMgLSBzaG93IHRoZSB0b29sdGlwIG9uIHRoZSBzY3JlZW5cbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuc2hvdyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgICBpZihhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB0YXJnZXQgPSBhcmdzLnBvcCgpXG5cbiAgICAgIHZhciBjb250ZW50ID0gaHRtbC5hcHBseSh0aGlzLCBhcmdzKSxcbiAgICAgICAgICBwb2Zmc2V0ID0gb2Zmc2V0LmFwcGx5KHRoaXMsIGFyZ3MpLFxuICAgICAgICAgIGRpciAgICAgPSBkaXJlY3Rpb24uYXBwbHkodGhpcywgYXJncyksXG4gICAgICAgICAgbm9kZWwgICA9IGQzLnNlbGVjdChub2RlKSxcbiAgICAgICAgICBpICAgICAgID0gZGlyZWN0aW9ucy5sZW5ndGgsXG4gICAgICAgICAgY29vcmRzLFxuICAgICAgICAgIHNjcm9sbFRvcCAgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wIHx8IGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wLFxuICAgICAgICAgIHNjcm9sbExlZnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnRcblxuICAgICAgbm9kZWwuaHRtbChjb250ZW50KVxuICAgICAgICAuc3R5bGUoeyBvcGFjaXR5OiAxLCAncG9pbnRlci1ldmVudHMnOiAnYWxsJyB9KVxuXG4gICAgICB3aGlsZShpLS0pIG5vZGVsLmNsYXNzZWQoZGlyZWN0aW9uc1tpXSwgZmFsc2UpXG4gICAgICBjb29yZHMgPSBkaXJlY3Rpb25fY2FsbGJhY2tzLmdldChkaXIpLmFwcGx5KHRoaXMpXG4gICAgICBub2RlbC5jbGFzc2VkKGRpciwgdHJ1ZSkuc3R5bGUoe1xuICAgICAgICB0b3A6IChjb29yZHMudG9wICsgIHBvZmZzZXRbMF0pICsgc2Nyb2xsVG9wICsgJ3B4JyxcbiAgICAgICAgbGVmdDogKGNvb3Jkcy5sZWZ0ICsgcG9mZnNldFsxXSkgKyBzY3JvbGxMZWZ0ICsgJ3B4J1xuICAgICAgfSlcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYyAtIGhpZGUgdGhlIHRvb2x0aXBcbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuaGlkZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vZGVsID0gZDMuc2VsZWN0KG5vZGUpXG4gICAgICBub2RlbC5zdHlsZSh7IG9wYWNpdHk6IDAsICdwb2ludGVyLWV2ZW50cyc6ICdub25lJyB9KVxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogUHJveHkgYXR0ciBjYWxscyB0byB0aGUgZDMgdGlwIGNvbnRhaW5lci4gIFNldHMgb3IgZ2V0cyBhdHRyaWJ1dGUgdmFsdWUuXG4gICAgLy9cbiAgICAvLyBuIC0gbmFtZSBvZiB0aGUgYXR0cmlidXRlXG4gICAgLy8gdiAtIHZhbHVlIG9mIHRoZSBhdHRyaWJ1dGVcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIGF0dHJpYnV0ZSB2YWx1ZVxuICAgIHRpcC5hdHRyID0gZnVuY3Rpb24obiwgdikge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyICYmIHR5cGVvZiBuID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gZDMuc2VsZWN0KG5vZGUpLmF0dHIobilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcmdzID0gIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgICAgZDMuc2VsZWN0aW9uLnByb3RvdHlwZS5hdHRyLmFwcGx5KGQzLnNlbGVjdChub2RlKSwgYXJncylcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogUHJveHkgc3R5bGUgY2FsbHMgdG8gdGhlIGQzIHRpcCBjb250YWluZXIuICBTZXRzIG9yIGdldHMgYSBzdHlsZSB2YWx1ZS5cbiAgICAvL1xuICAgIC8vIG4gLSBuYW1lIG9mIHRoZSBwcm9wZXJ0eVxuICAgIC8vIHYgLSB2YWx1ZSBvZiB0aGUgcHJvcGVydHlcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIHN0eWxlIHByb3BlcnR5IHZhbHVlXG4gICAgdGlwLnN0eWxlID0gZnVuY3Rpb24obiwgdikge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyICYmIHR5cGVvZiBuID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gZDMuc2VsZWN0KG5vZGUpLnN0eWxlKG4pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJncyA9ICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgICAgIGQzLnNlbGVjdGlvbi5wcm90b3R5cGUuc3R5bGUuYXBwbHkoZDMuc2VsZWN0KG5vZGUpLCBhcmdzKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBTZXQgb3IgZ2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIHRvb2x0aXBcbiAgICAvL1xuICAgIC8vIHYgLSBPbmUgb2Ygbihub3J0aCksIHMoc291dGgpLCBlKGVhc3QpLCBvciB3KHdlc3QpLCBudyhub3J0aHdlc3QpLFxuICAgIC8vICAgICBzdyhzb3V0aHdlc3QpLCBuZShub3J0aGVhc3QpIG9yIHNlKHNvdXRoZWFzdClcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIGRpcmVjdGlvblxuICAgIHRpcC5kaXJlY3Rpb24gPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkaXJlY3Rpb25cbiAgICAgIGRpcmVjdGlvbiA9IHYgPT0gbnVsbCA/IHYgOiBkMy5mdW5jdG9yKHYpXG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFNldHMgb3IgZ2V0cyB0aGUgb2Zmc2V0IG9mIHRoZSB0aXBcbiAgICAvL1xuICAgIC8vIHYgLSBBcnJheSBvZiBbeCwgeV0gb2Zmc2V0XG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIG9mZnNldCBvclxuICAgIHRpcC5vZmZzZXQgPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBvZmZzZXRcbiAgICAgIG9mZnNldCA9IHYgPT0gbnVsbCA/IHYgOiBkMy5mdW5jdG9yKHYpXG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IHNldHMgb3IgZ2V0cyB0aGUgaHRtbCB2YWx1ZSBvZiB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIFN0cmluZyB2YWx1ZSBvZiB0aGUgdGlwXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGh0bWwgdmFsdWUgb3IgdGlwXG4gICAgdGlwLmh0bWwgPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBodG1sXG4gICAgICBodG1sID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGQzX3RpcF9kaXJlY3Rpb24oKSB7IHJldHVybiAnbicgfVxuICAgIGZ1bmN0aW9uIGQzX3RpcF9vZmZzZXQoKSB7IHJldHVybiBbMCwgMF0gfVxuICAgIGZ1bmN0aW9uIGQzX3RpcF9odG1sKCkgeyByZXR1cm4gJyAnIH1cblxuICAgIHZhciBkaXJlY3Rpb25fY2FsbGJhY2tzID0gZDMubWFwKHtcbiAgICAgIG46ICBkaXJlY3Rpb25fbixcbiAgICAgIHM6ICBkaXJlY3Rpb25fcyxcbiAgICAgIGU6ICBkaXJlY3Rpb25fZSxcbiAgICAgIHc6ICBkaXJlY3Rpb25fdyxcbiAgICAgIG53OiBkaXJlY3Rpb25fbncsXG4gICAgICBuZTogZGlyZWN0aW9uX25lLFxuICAgICAgc3c6IGRpcmVjdGlvbl9zdyxcbiAgICAgIHNlOiBkaXJlY3Rpb25fc2VcbiAgICB9KSxcblxuICAgIGRpcmVjdGlvbnMgPSBkaXJlY3Rpb25fY2FsbGJhY2tzLmtleXMoKVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX24oKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5uLnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5uLnggLSBub2RlLm9mZnNldFdpZHRoIC8gMlxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gucy55LFxuICAgICAgICBsZWZ0OiBiYm94LnMueCAtIG5vZGUub2Zmc2V0V2lkdGggLyAyXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX2UoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5lLnkgLSBub2RlLm9mZnNldEhlaWdodCAvIDIsXG4gICAgICAgIGxlZnQ6IGJib3guZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3coKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC53LnkgLSBub2RlLm9mZnNldEhlaWdodCAvIDIsXG4gICAgICAgIGxlZnQ6IGJib3gudy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9udygpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm53LnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5udy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9uZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm5lLnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5uZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3N3KCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3guc3cueSxcbiAgICAgICAgbGVmdDogYmJveC5zdy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LnNlLnksXG4gICAgICAgIGxlZnQ6IGJib3guZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5pdE5vZGUoKSB7XG4gICAgICB2YXIgbm9kZSA9IGQzLnNlbGVjdChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSlcbiAgICAgIG5vZGUuc3R5bGUoe1xuICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgICAgdG9wOiAwLFxuICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAncG9pbnRlci1ldmVudHMnOiAnbm9uZScsXG4gICAgICAgICdib3gtc2l6aW5nJzogJ2JvcmRlci1ib3gnXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gbm9kZS5ub2RlKClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTVkdOb2RlKGVsKSB7XG4gICAgICBlbCA9IGVsLm5vZGUoKVxuICAgICAgaWYoZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc3ZnJylcbiAgICAgICAgcmV0dXJuIGVsXG5cbiAgICAgIHJldHVybiBlbC5vd25lclNWR0VsZW1lbnRcbiAgICB9XG5cbiAgICAvLyBQcml2YXRlIC0gZ2V0cyB0aGUgc2NyZWVuIGNvb3JkaW5hdGVzIG9mIGEgc2hhcGVcbiAgICAvL1xuICAgIC8vIEdpdmVuIGEgc2hhcGUgb24gdGhlIHNjcmVlbiwgd2lsbCByZXR1cm4gYW4gU1ZHUG9pbnQgZm9yIHRoZSBkaXJlY3Rpb25zXG4gICAgLy8gbihub3J0aCksIHMoc291dGgpLCBlKGVhc3QpLCB3KHdlc3QpLCBuZShub3J0aGVhc3QpLCBzZShzb3V0aGVhc3QpLCBudyhub3J0aHdlc3QpLFxuICAgIC8vIHN3KHNvdXRod2VzdCkuXG4gICAgLy9cbiAgICAvLyAgICArLSstK1xuICAgIC8vICAgIHwgICB8XG4gICAgLy8gICAgKyAgICtcbiAgICAvLyAgICB8ICAgfFxuICAgIC8vICAgICstKy0rXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGFuIE9iamVjdCB7biwgcywgZSwgdywgbncsIHN3LCBuZSwgc2V9XG4gICAgZnVuY3Rpb24gZ2V0U2NyZWVuQkJveCgpIHtcbiAgICAgIHZhciB0YXJnZXRlbCAgID0gdGFyZ2V0IHx8IGQzLmV2ZW50LnRhcmdldDtcblxuICAgICAgd2hpbGUgKCd1bmRlZmluZWQnID09PSB0eXBlb2YgdGFyZ2V0ZWwuZ2V0U2NyZWVuQ1RNICYmICd1bmRlZmluZWQnID09PSB0YXJnZXRlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgdGFyZ2V0ZWwgPSB0YXJnZXRlbC5wYXJlbnROb2RlO1xuICAgICAgfVxuXG4gICAgICB2YXIgYmJveCAgICAgICA9IHt9LFxuICAgICAgICAgIG1hdHJpeCAgICAgPSB0YXJnZXRlbC5nZXRTY3JlZW5DVE0oKSxcbiAgICAgICAgICB0YmJveCAgICAgID0gdGFyZ2V0ZWwuZ2V0QkJveCgpLFxuICAgICAgICAgIHdpZHRoICAgICAgPSB0YmJveC53aWR0aCxcbiAgICAgICAgICBoZWlnaHQgICAgID0gdGJib3guaGVpZ2h0LFxuICAgICAgICAgIHggICAgICAgICAgPSB0YmJveC54LFxuICAgICAgICAgIHkgICAgICAgICAgPSB0YmJveC55XG5cbiAgICAgIHBvaW50LnggPSB4XG4gICAgICBwb2ludC55ID0geVxuICAgICAgYmJveC5udyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54ICs9IHdpZHRoXG4gICAgICBiYm94Lm5lID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnkgKz0gaGVpZ2h0XG4gICAgICBiYm94LnNlID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggLT0gd2lkdGhcbiAgICAgIGJib3guc3cgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSAtPSBoZWlnaHQgLyAyXG4gICAgICBiYm94LncgID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggKz0gd2lkdGhcbiAgICAgIGJib3guZSA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54IC09IHdpZHRoIC8gMlxuICAgICAgcG9pbnQueSAtPSBoZWlnaHQgLyAyXG4gICAgICBiYm94Lm4gPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSArPSBoZWlnaHRcbiAgICAgIGJib3gucyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG5cbiAgICAgIHJldHVybiBiYm94XG4gICAgfVxuXG4gICAgcmV0dXJuIHRpcFxuICB9O1xuXG59KSk7XG4iLCIvKipcbiAqXG4gKiBNdXRhdGlvbnMgTmVlZGxlIFBsb3QgKG11dHMtbmVlZGxlLXBsb3QpXG4gKlxuICogQ3JlYXRlcyBhIG5lZWRsZSBwbG90IChhLmsuYSBzdGVtIHBsb3QsIGxvbGxpcG9wLXBsb3QgYW5kIHNvb24gYWxzbyBiYWxsb29uIHBsb3QgOy0pXG4gKiBUaGlzIGNsYXNzIHVzZXMgdGhlIG5wbS1yZXF1aXJlIG1vZHVsZSB0byBsb2FkIGRlcGVuZGVuY2llcyBkMywgZDMtdGlwXG4gKlxuICogQGF1dGhvciBNaWNoYWVsIFAgU2Nocm9lZGVyXG4gKiBAY2xhc3NcbiAqL1xuXG5mdW5jdGlvbiBNdXRzTmVlZGxlUGxvdCAoY29uZmlnKSB7XG5cbiAgICAvLyBJTklUSUFMSVpBVElPTlxuXG4gICAgdmFyIHNlbGYgPSB0aGlzOyAgICAgICAgLy8gc2VsZiA9IE11dHNOZWVkbGVQbG90XG5cbiAgICAvLyBYLWNvb3JkaW5hdGVzXG4gICAgdGhpcy5tYXhDb29yZCA9IGNvbmZpZy5tYXhDb29yZCB8fCAtMTsgICAgICAgICAgICAgLy8gVGhlIG1heGltdW0gY29vcmQgKHgtYXhpcylcbiAgICBpZiAodGhpcy5tYXhDb29yZCA8IDApIHsgdGhyb3cgbmV3IEVycm9yKFwiJ21heENvb3JkJyBtdXN0IGJlIGRlZmluZWQgaW5pdGlhdGlvbiBjb25maWchXCIpOyB9XG4gICAgdGhpcy5taW5Db29yZCA9IGNvbmZpZy5taW5Db29yZCB8fCAxOyAgICAgICAgICAgICAgIC8vIFRoZSBtaW5pbXVtIGNvb3JkICh4LWF4aXMpXG5cbiAgICAvLyBkYXRhXG4gICAgbXV0YXRpb25EYXRhID0gY29uZmlnLm11dGF0aW9uRGF0YSB8fCAtMTsgICAgICAgICAgLy8gLmpzb24gZmlsZSBvciBkaWN0XG4gICAgaWYgKHRoaXMubWF4Q29vcmQgPCAwKSB7IHRocm93IG5ldyBFcnJvcihcIidtdXRhdGlvbkRhdGEnIG11c3QgYmUgZGVmaW5lZCBpbml0aWF0aW9uIGNvbmZpZyFcIik7IH1cbiAgICByZWdpb25EYXRhID0gY29uZmlnLnJlZ2lvbkRhdGEgfHwgLTE7ICAgICAgICAgICAgICAvLyAuanNvbiBmaWxlIG9yIGRpY3RcbiAgICBpZiAodGhpcy5tYXhDb29yZCA8IDApIHsgdGhyb3cgbmV3IEVycm9yKFwiJ3JlZ2lvbkRhdGEnIG11c3QgYmUgZGVmaW5lZCBpbml0aWF0aW9uIGNvbmZpZyFcIik7IH1cbiAgICB0aGlzLnRvdGFsQ2F0ZWdDb3VudHMgPSB7fTtcblxuICAgIC8vIFBsb3QgZGltZW5zaW9ucyAmIHRhcmdldFxuICAgIHZhciB0YXJnZXRFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY29uZmlnLnRhcmdldEVsZW1lbnQpIHx8IGNvbmZpZy50YXJnZXRFbGVtZW50IHx8IGRvY3VtZW50LmJvZHkgICAvLyBXaGVyZSB0byBhcHBlbmQgdGhlIHBsb3QgKHN2ZylcblxuICAgIHZhciB3aWR0aCA9IHRoaXMud2lkdGggPSBjb25maWcud2lkdGggfHwgdGFyZ2V0RWxlbWVudC5vZmZzZXRXaWR0aCB8fCAxMDAwO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLmhlaWdodCA9IGNvbmZpZy5oZWlnaHQgfHwgdGFyZ2V0RWxlbWVudC5vZmZzZXRIZWlnaHQgfHwgNTAwO1xuXG4gICAgLy8gQ29sb3Igc2NhbGUgJiBtYXBcbiAgICB0aGlzLmNvbG9yTWFwID0gY29uZmlnLmNvbG9yTWFwIHx8IHt9OyAgICAgICAgICAgICAgLy8gZGljdFxuICAgIHZhciBjb2xvcnMgPSBPYmplY3Qua2V5cyh0aGlzLmNvbG9yTWFwKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gc2VsZi5jb2xvck1hcFtrZXldO1xuICAgIH0pO1xuICAgIHRoaXMuY29sb3JTY2FsZSA9IGQzLnNjYWxlLmNhdGVnb3J5MjAoKVxuICAgICAgICAuZG9tYWluKE9iamVjdC5rZXlzKHRoaXMuY29sb3JNYXApKVxuICAgICAgICAucmFuZ2UoY29sb3JzLmNvbmNhdChkMy5zY2FsZS5jYXRlZ29yeTIwKCkucmFuZ2UoKSkpO1xuICAgIHRoaXMubGVnZW5kcyA9IGNvbmZpZy5sZWdlbmRzIHx8IHtcbiAgICAgICAgXCJ5XCI6IFwiVmFsdWVcIixcbiAgICAgICAgXCJ4XCI6IFwiQ29vcmRpbmF0ZVwiXG4gICAgfTtcbiAgICB0aGlzLmNhdGVnQ291bnRzID0ge307XG5cbiAgICB0aGlzLnN2Z0NsYXNzZXMgPSBcIm11dG5lZWRsZXNcIlxuICAgIHRoaXMuYnVmZmVyID0gMDtcblxuICAgIHZhciBtYXhDb29yZCA9IHRoaXMubWF4Q29vcmQ7XG5cbiAgICB2YXIgYnVmZmVyID0gMDtcbiAgICBpZiAod2lkdGggPj0gaGVpZ2h0KSB7XG4gICAgICBidWZmZXIgPSBoZWlnaHQgLyA4O1xuICAgIH0gZWxzZSB7XG4gICAgICBidWZmZXIgPSB3aWR0aCAvIDg7XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG5cbiAgICAvLyBJSU1QT1JUIEFORCBDT05GSUdVUkUgVElQU1xuICAgIHZhciBkM3RpcCA9IHJlcXVpcmUoJ2QzLXRpcCcpO1xuICAgIGQzdGlwKGQzKTtcblxuXG4gICAgdGhpcy50aXAgPSBkMy50aXAoKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLXRpcCBkMy10aXAtbmVlZGxlJylcbiAgICAgIC5vZmZzZXQoWy0xMCwgMF0pXG4gICAgICAuaHRtbChmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBcIjxzcGFuPlwiICsgZC52YWx1ZSArIFwiIFwiICsgZC5jYXRlZ29yeSArICBcIiBhdCBjb29yZC4gXCIgKyBkLmNvb3JkU3RyaW5nICsgXCI8L3NwYW4+XCI7XG4gICAgICB9KTtcblxuICAgIHRoaXMuc2VsZWN0aW9uVGlwID0gZDMudGlwKClcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLXRpcCBkMy10aXAtc2VsZWN0aW9uJylcbiAgICAgICAgLm9mZnNldChbMTAwLCAwXSlcbiAgICAgICAgLmh0bWwoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPHNwYW4+IFNlbGVjdGVkIGNvb3JkaW5hdGVzPGJyLz5cIiArIE1hdGgucm91bmQoZC5sZWZ0KSArIFwiIC0gXCIgKyBNYXRoLnJvdW5kKGQucmlnaHQpICsgXCI8L3NwYW4+XCI7XG4gICAgICAgIH0pXG4gICAgICAgIC5kaXJlY3Rpb24oJ24nKTtcblxuICAgIC8vIElOSVQgU1ZHXG5cbiAgICB2YXIgc3ZnID0gZDMuc2VsZWN0KHRhcmdldEVsZW1lbnQpLmFwcGVuZChcInN2Z1wiKVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoKVxuICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgdGhpcy5zdmdDbGFzc2VzKTtcblxuICAgIHN2Zy5jYWxsKHRoaXMudGlwKTtcbiAgICBzdmcuY2FsbCh0aGlzLnNlbGVjdGlvblRpcCk7XG5cbiAgICAvLyBERUZJTkUgU0NBTEVTXG5cbiAgICB2YXIgeCA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFt0aGlzLm1pbkNvb3JkLCB0aGlzLm1heENvb3JkXSlcbiAgICAgIC5yYW5nZShbYnVmZmVyICogMS41ICwgd2lkdGggLSBidWZmZXJdKVxuICAgICAgLm5pY2UoKTtcbiAgICB0aGlzLnggPSB4O1xuXG4gICAgdmFyIHkgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgLmRvbWFpbihbMSwyMF0pXG4gICAgICAucmFuZ2UoW2hlaWdodCAtIGJ1ZmZlciAqIDEuNSwgYnVmZmVyXSlcbiAgICAgIC5uaWNlKCk7XG4gICAgdGhpcy55ID0geTtcblxuICAgIC8vIENPTkZJR1VSRSBCUlVTSFxuICAgIHZhciBicnVzaCA9IGQzLnN2Zy5icnVzaCgpXG4gICAgICAgIC54KHgpXG4gICAgICAgIC5vbihcImJydXNoXCIsIGJydXNobW92ZSlcbiAgICAgICAgLm9uKFwiYnJ1c2hlbmRcIiwgYnJ1c2hlbmQpO1xuXG4gICAgdGhpcy5zdmdDbGFzc2VzICs9IFwiIGJydXNoXCI7XG4gICAgdmFyIHNlbGVjdGlvblJlY3QgPSBzdmcuYXR0cihcImNsYXNzXCIsIHRoaXMuc3ZnQ2xhc3NlcylcbiAgICAgICAgLmNhbGwoYnJ1c2gpXG4gICAgICAgIC5zZWxlY3RBbGwoJy5leHRlbnQnKVxuICAgICAgICAuYXR0cignaGVpZ2h0JywgaGVpZ2h0KTtcblxuICAgIHNlbGVjdGVkTmVlZGxlcyA9IFtdO1xuICAgIGZ1bmN0aW9uIGJydXNobW92ZSgpIHtcblxuICAgICAgICB2YXIgZXh0ZW50ID0gYnJ1c2guZXh0ZW50KCk7XG4gICAgICAgIG5lZWRsZUhlYWRzID0gZDMuc2VsZWN0QWxsKFwiLm5lZWRsZS1oZWFkXCIpO1xuICAgICAgICBzZWxlY3RlZE5lZWRsZXMgPSBbXTtcbiAgICAgICAgY2F0ZWdDb3VudHMgPSB7fTtcblxuICAgICAgICBuZWVkbGVIZWFkcy5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgaXNfYnJ1c2hlZCA9IGV4dGVudFswXSA8PSBkLmNvb3JkICYmIGQuY29vcmQgPD0gZXh0ZW50WzFdO1xuICAgICAgICAgICAgaWYgKGlzX2JydXNoZWQpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZE5lZWRsZXMucHVzaChkKTtcbiAgICAgICAgICAgICAgICBjYXRlZ0NvdW50c1tkLmNhdGVnb3J5XSA9IChjYXRlZ0NvdW50c1tkLmNhdGVnb3J5XSB8fCAwKSArIGQudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaXNfYnJ1c2hlZDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2VsZi50cmlnZ2VyKCduZWVkbGVTZWxlY3Rpb25DaGFuZ2UnLCB7XG4gICAgICAgICAgICBzZWxlY3RlZCA6IHNlbGVjdGVkTmVlZGxlcyxcbiAgICAgICAgICAgIGNhdGVnQ291bnRzOiBjYXRlZ0NvdW50cyxcbiAgICAgICAgICAgIGNvb3JkczogZXh0ZW50XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJydXNoZW5kKCkge1xuICAgICAgICBnZXRfYnV0dG9uID0gZDMuc2VsZWN0KFwiLmNsZWFyLWJ1dHRvblwiKTtcbiAgICAgICAgc2VsZi50cmlnZ2VyKCduZWVkbGVTZWxlY3Rpb25DaGFuZ2VFbmQnLCB7XG4gICAgICAgICAgICBzZWxlY3RlZCA6IHNlbGVjdGVkTmVlZGxlcyxcbiAgICAgICAgICAgIGNhdGVnQ291bnRzOiBjYXRlZ0NvdW50cyxcbiAgICAgICAgICAgIGNvb3JkczogYnJ1c2guZXh0ZW50KClcbiAgICAgICAgfSk7XG4gICAgICAgIC8qaWYoZ2V0X2J1dHRvbi5lbXB0eSgpID09PSB0cnVlKSB7XG4gICAgICAgICBjbGVhcl9idXR0b24gPSBzdmcuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgIC5hdHRyKFwieVwiLCA0NjApXG4gICAgICAgICAuYXR0cihcInhcIiwgODI1KVxuICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImNsZWFyLWJ1dHRvblwiKVxuICAgICAgICAgLnRleHQoXCJDbGVhciBCcnVzaFwiKTtcbiAgICAgICAgIH1cblxuICAgICAgICAgeC5kb21haW4oYnJ1c2guZXh0ZW50KCkpO1xuXG4gICAgICAgICB0cmFuc2l0aW9uX2RhdGEoKTtcbiAgICAgICAgIHJlc2V0X2F4aXMoKTtcblxuICAgICAgICAgcG9pbnRzLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCBmYWxzZSk7XG4gICAgICAgICBkMy5zZWxlY3QoXCIuYnJ1c2hcIikuY2FsbChicnVzaC5jbGVhcigpKTtcblxuICAgICAgICAgY2xlYXJfYnV0dG9uLm9uKCdjbGljaycsIGZ1bmN0aW9uKCl7XG4gICAgICAgICB4LmRvbWFpbihbMCwgNTBdKTtcbiAgICAgICAgIHRyYW5zaXRpb25fZGF0YSgpO1xuICAgICAgICAgcmVzZXRfYXhpcygpO1xuICAgICAgICAgY2xlYXJfYnV0dG9uLnJlbW92ZSgpO1xuICAgICAgICAgfSk7Ki9cbiAgICB9XG5cbiAgICAvLy8gRFJBV1xuICAgIHRoaXMuZHJhd05lZWRsZXMoc3ZnLCBtdXRhdGlvbkRhdGEsIHJlZ2lvbkRhdGEpO1xuXG5cbiAgICBzZWxmLm9uKFwibmVlZGxlU2VsZWN0aW9uQ2hhbmdlXCIsIGZ1bmN0aW9uIChlZGF0YSkge1xuICAgICAgICBzZWxmLmNhdGVnQ291bnRzID0gZWRhdGEuY2F0ZWdDb3VudHM7XG4gICAgICAgIHN2Zy5jYWxsKHZlcnRpY2FsTGVnZW5kKTtcblxuICAgIH0pO1xuXG4gICAgc2VsZi5vbihcIm5lZWRsZVNlbGVjdGlvbkNoYW5nZVwiLCBmdW5jdGlvbihlZGF0YSkge1xuICAgICAgICAgICAgc2VsZWN0aW9uID0gZWRhdGEuY29vcmRzO1xuICAgICAgICAgICAgaWYgKHNlbGVjdGlvblsxXSAtIHNlbGVjdGlvblswXSA+IDEwKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5zZWxlY3Rpb25UaXAuc2hvdyh7bGVmdDogc2VsZWN0aW9uWzBdLCByaWdodDogc2VsZWN0aW9uWzFdfSwgc2VsZWN0aW9uUmVjdC5ub2RlKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZWxmLnNlbGVjdGlvblRpcC5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG5cblxufVxuXG5NdXRzTmVlZGxlUGxvdC5wcm90b3R5cGUuZHJhd0xlZ2VuZCA9IGZ1bmN0aW9uKHN2Zykge1xuXG4gICAgLy8gTEVHRU5EXG4gICAgc2VsZiA9IHRoaXM7XG4gICAgbXV0c1NjYWxlID0gc2VsZi5jb2xvclNjYWxlLmRvbWFpbihPYmplY3Qua2V5cyhzZWxmLnRvdGFsQ2F0ZWdDb3VudHMpKTtcbiAgICB2YXIgZG9tYWluID0gc2VsZi54LmRvbWFpbigpO1xuICAgIHhwbGFjZW1lbnQgPSAoZG9tYWluWzFdIC0gZG9tYWluWzBdKSAqIDAuNzUgKyAoZG9tYWluWzFdIC0gZG9tYWluWzBdKTtcbiAgICB2ZXJ0aWNhbExlZ2VuZCA9IGQzLnN2Z1xuICAgICAgICAubGVnZW5kKClcbiAgICAgICAgLmxhYmVsRm9ybWF0KGZ1bmN0aW9uKGwpIHsgcmV0dXJuIChzZWxmLmNhdGVnQ291bnRzW2xdIHx8IFwiXCIpICsgXCIgXCIgKyBsOyB9KVxuICAgICAgICAuY2VsbFBhZGRpbmcoNClcbiAgICAgICAgLm9yaWVudGF0aW9uKFwidmVydGljYWxcIilcbiAgICAgICAgLnVuaXRzKFwiTXV0YXRpb25zXCIpXG4gICAgICAgIC5jZWxsV2lkdGgoMjApXG4gICAgICAgIC5jZWxsSGVpZ2h0KDEyKVxuICAgICAgICAuaW5wdXRTY2FsZShtdXRzU2NhbGUpXG4gICAgICAgIC5jZWxsU3RlcHBpbmcoNClcbiAgICAgICAgLnBsYWNlKHt4OiB4cGxhY2VtZW50LCB5OiA1MH0pO1xuXG4gICAgc3ZnLmNhbGwodmVydGljYWxMZWdlbmQpO1xuXG59O1xuXG5NdXRzTmVlZGxlUGxvdC5wcm90b3R5cGUuZHJhd1JlZ2lvbnMgPSBmdW5jdGlvbihzdmcsIHJlZ2lvbkRhdGEpIHtcblxuICAgIHZhciBtYXhDb29yZCA9IHRoaXMubWF4Q29vcmQ7XG4gICAgdmFyIG1pbkNvb3JkID0gdGhpcy5taW5Db29yZDtcbiAgICB2YXIgYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgdmFyIGNvbG9ycyA9IHRoaXMuY29sb3JNYXA7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHggPSB0aGlzLng7XG5cbiAgICB2YXIgYmVsb3cgPSB0cnVlO1xuXG5cbiAgICBnZXRSZWdpb25TdGFydCA9IGZ1bmN0aW9uKHJlZ2lvbikge1xuICAgICAgICByZXR1cm4gcGFyc2VJbnQocmVnaW9uLnNwbGl0KFwiLVwiKVswXSlcbiAgICB9O1xuXG4gICAgZ2V0UmVnaW9uRW5kID0gZnVuY3Rpb24ocmVnaW9uKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUludChyZWdpb24uc3BsaXQoXCItXCIpWzFdKVxuICAgIH07XG5cbiAgICBnZXRDb2xvciA9IHRoaXMuY29sb3JTY2FsZTtcblxuICAgIHZhciBiZ19vZmZzZXQgPSAwO1xuICAgIHZhciByZWdpb25fb2Zmc2V0ID0gYmdfb2Zmc2V0LTNcbiAgICB2YXIgdGV4dF9vZmZzZXQgPSBiZ19vZmZzZXQgKyAyMDtcbiAgICBpZiAoYmVsb3cgIT0gdHJ1ZSkge1xuICAgICAgICB0ZXh0X29mZnNldCA9IGJnX29mZnNldCs1O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRyYXcocmVnaW9uTGlzdCkge1xuXG4gICAgICAgIHZhciByZWdpb25zQkcgPSBkMy5zZWxlY3QoXCIubXV0bmVlZGxlc1wiKS5zZWxlY3RBbGwoKVxuICAgICAgICAgICAgLmRhdGEoW1wiZHVtbXlcIl0pLmVudGVyKClcbiAgICAgICAgICAgIC5pbnNlcnQoXCJnXCIsIFwiOmZpcnN0LWNoaWxkXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwicmVnaW9uc0JHXCIpXG4gICAgICAgICAgICAuYXBwZW5kKFwicmVjdFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIHgobWluQ29vcmQpIClcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCB5KDApICsgYmdfb2Zmc2V0IClcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgeChtYXhDb29yZCkgLSB4KG1pbkNvb3JkKSApXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCAxMCk7XG5cblxuICAgICAgICB2YXIgcmVnaW9ucyA9IHJlZ2lvbnNCRyA9IGQzLnNlbGVjdChcIi5tdXRuZWVkbGVzXCIpLnNlbGVjdEFsbCgpXG4gICAgICAgICAgICAuZGF0YShyZWdpb25MaXN0KVxuICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwicmVnaW9uR3JvdXBcIik7XG5cbiAgICAgICAgcmVnaW9ucy5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geChyLnN0YXJ0KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCB5KDApICsgcmVnaW9uX29mZnNldCApXG4gICAgICAgICAgICAuYXR0cihcInJ5XCIsIFwiM1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJyeFwiLCBcIjNcIilcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgZnVuY3Rpb24gKHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geChyLmVuZCkgLSB4KHIuc3RhcnQpXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgMTYpXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEuY29sb3JcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3R5bGUoXCJzdHJva2VcIiwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZDMucmdiKGRhdGEuY29sb3IpLmRhcmtlcigpXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICByZWdpb25zLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJyZWdpb25OYW1lXCIpXG4gICAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geChyLnN0YXJ0KSArICh4KHIuZW5kKSAtIHgoci5zdGFydCkpIC8gMlxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCB5KDApICsgdGV4dF9vZmZzZXQpXG4gICAgICAgICAgICAuYXR0cihcImR5XCIsIFwiMC4zNWVtXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIiwgXCIxMnB4XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWRlY29yYXRpb25cIiwgXCJib2xkXCIpXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhLm5hbWVcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZvcm1hdFJlZ2lvbnMocmVnaW9ucykge1xuICAgICAgICByZWdpb25MaXN0ID0gW107XG4gICAgICAgIGZvciAoa2V5IGluIHJlZ2lvbnMpIHtcblxuICAgICAgICAgICAgcmVnaW9uTGlzdC5wdXNoKHtcbiAgICAgICAgICAgICAgICAnbmFtZSc6IGtleSxcbiAgICAgICAgICAgICAgICAnc3RhcnQnOiBnZXRSZWdpb25TdGFydChyZWdpb25zW2tleV0pLFxuICAgICAgICAgICAgICAgICdlbmQnOiBnZXRSZWdpb25FbmQocmVnaW9uc1trZXldKSxcbiAgICAgICAgICAgICAgICAnY29sb3InOiBnZXRDb2xvcihrZXkpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVnaW9uTGlzdDtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHJlZ2lvbkRhdGEgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAvLyBhc3N1bWUgZGF0YSBpcyBpbiBhIGZpbGVcbiAgICAgICAgZDMuanNvbihyZWdpb25EYXRhLCBmdW5jdGlvbihlcnJvciwgcmVnaW9ucykge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7cmV0dXJuIGNvbnNvbGUuZGVidWcoZXJyb3IpfVxuICAgICAgICAgICAgcmVnaW9uTGlzdCA9IGZvcm1hdFJlZ2lvbnMocmVnaW9ucyk7XG4gICAgICAgICAgICBkcmF3KHJlZ2lvbkxpc3QpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZWdpb25MaXN0ID0gZm9ybWF0UmVnaW9ucyhyZWdpb25EYXRhKTtcbiAgICAgICAgZHJhdyhyZWdpb25MaXN0KTtcbiAgICB9XG5cbn07XG5cblxuTXV0c05lZWRsZVBsb3QucHJvdG90eXBlLmRyYXdBeGVzID0gZnVuY3Rpb24oc3ZnKSB7XG5cbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeCA9IHRoaXMueDtcblxuICAgIHhBeGlzID0gZDMuc3ZnLmF4aXMoKS5zY2FsZSh4KS5vcmllbnQoXCJib3R0b21cIik7XG5cbiAgICBzdmcuYXBwZW5kKFwic3ZnOmdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ4LWF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsXCIgKyAodGhpcy5oZWlnaHQgLSB0aGlzLmJ1ZmZlcikgKyBcIilcIilcbiAgICAgIC5jYWxsKHhBeGlzKTtcblxuICAgIHlBeGlzID0gZDMuc3ZnLmF4aXMoKS5zY2FsZSh5KS5vcmllbnQoXCJsZWZ0XCIpO1xuXG5cbiAgICBzdmcuYXBwZW5kKFwic3ZnOmdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ5LWF4aXNcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKHRoaXMuYnVmZmVyICogMS4yICsgLSAxMCkgICsgXCIsMClcIilcbiAgICAgIC5jYWxsKHlBeGlzKTtcblxuICAgIHN2Zy5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cihcImNsYXNzXCIsIFwieS1sYWJlbFwiKVxuICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAodGhpcy5idWZmZXIgLyAzKSArIFwiLFwiICsgKHRoaXMuaGVpZ2h0IC8gMikgKyBcIiksIHJvdGF0ZSgtOTApXCIpXG4gICAgICAudGV4dCh0aGlzLmxlZ2VuZHMueSk7XG5cbiAgICBzdmcuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIngtbGFiZWxcIilcbiAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKHRoaXMud2lkdGggLyAyKSArIFwiLFwiICsgKHRoaXMuaGVpZ2h0IC0gdGhpcy5idWZmZXIgLyAzKSArIFwiKVwiKVxuICAgICAgLnRleHQodGhpcy5sZWdlbmRzLngpO1xuICAgIFxufTtcblxuXG5cbk11dHNOZWVkbGVQbG90LnByb3RvdHlwZS5kcmF3TmVlZGxlcyA9IGZ1bmN0aW9uKHN2ZywgbXV0YXRpb25EYXRhLCByZWdpb25EYXRhKSB7XG5cbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBnZXRZQXhpcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4geTtcbiAgICB9O1xuXG4gICAgZm9ybWF0Q29vcmQgPSBmdW5jdGlvbihjb29yZCkge1xuICAgICAgIGlmIChjb29yZC5pbmRleE9mKFwiLVwiKSA+IC0xKSB7XG4gICAgICAgICAgICBjb29yZHMgPSBjb29yZC5zcGxpdChcIi1cIik7XG4gICAgICAgICAgICAvLyBwbGFjZSBuZWVkZSBhdCBtaWRkbGUgb2YgYWZmZWN0ZWQgcmVnaW9uXG4gICAgICAgICAgICBjb29yZCA9IE1hdGguZmxvb3IoKHBhcnNlSW50KGNvb3Jkc1swXSkgKyBwYXJzZUludChjb29yZHNbMV0pKSAvIDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29vcmQgPSBwYXJzZUludChjb29yZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvb3JkO1xuICAgIH07XG5cbiAgICBnZXRDb2xvciA9IHRoaXMuY29sb3JTY2FsZTtcbiAgICB0aXAgPSB0aGlzLnRpcDtcblxuICAgIC8vIHN0YWNrIG5lZWRsZXMgYXQgc2FtZSBwb3NcbiAgICBuZWVkbGVQb2ludCA9IHt9O1xuICAgIGhpZ2hlc3QgPSAwO1xuXG4gICAgc3RhY2tOZWVkbGUgPSBmdW5jdGlvbihwb3MsdmFsdWUscG9pbnREaWN0KSB7XG4gICAgICBzdGlja0hlaWdodCA9IDA7XG4gICAgICBwb3MgPSBcInBcIitTdHJpbmcocG9zKTtcbiAgICAgIGlmIChwb3MgaW4gcG9pbnREaWN0KSB7XG4gICAgICAgICBzdGlja0hlaWdodCA9IHBvaW50RGljdFtwb3NdO1xuICAgICAgICAgbmV3SGVpZ2h0ID0gc3RpY2tIZWlnaHQgKyB2YWx1ZTtcbiAgICAgICAgIHBvaW50RGljdFtwb3NdID0gbmV3SGVpZ2h0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgIHBvaW50RGljdFtwb3NdID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RpY2tIZWlnaHQ7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGZvcm1hdE11dGF0aW9uRW50cnkoZCkge1xuXG4gICAgICAgIGNvb3JkU3RyaW5nID0gZC5jb29yZDtcbiAgICAgICAgbnVtZXJpY0Nvb3JkID0gZm9ybWF0Q29vcmQoZC5jb29yZCk7XG4gICAgICAgIG51bWVyaWNWYWx1ZSA9IE51bWJlcihkLnZhbHVlKTtcbiAgICAgICAgc3RpY2tIZWlnaHQgPSBzdGFja05lZWRsZShudW1lcmljQ29vcmQsIG51bWVyaWNWYWx1ZSwgbmVlZGxlUG9pbnQpO1xuICAgICAgICBjYXRlZ29yeSA9IGQuY2F0ZWdvcnkgfHwgXCJcIjtcblxuICAgICAgICBpZiAoc3RpY2tIZWlnaHQgKyBudW1lcmljVmFsdWUgPiBoaWdoZXN0KSB7XG4gICAgICAgICAgICAvLyBzZXQgWS1BeGlzIGFsd2F5cyB0byBoaWdoZXN0IGF2YWlsYWJsZVxuICAgICAgICAgICAgaGlnaGVzdCA9IHN0aWNrSGVpZ2h0ICsgbnVtZXJpY1ZhbHVlO1xuICAgICAgICAgICAgZ2V0WUF4aXMoKS5kb21haW4oWzAsIGhpZ2hlc3QgKyAyXSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmIChudW1lcmljQ29vcmQgPiAwKSB7XG5cbiAgICAgICAgICAgIC8vIHJlY29yZCBhbmQgY291bnQgY2F0ZWdvcmllc1xuICAgICAgICAgICAgc2VsZi50b3RhbENhdGVnQ291bnRzW2NhdGVnb3J5XSA9IChzZWxmLnRvdGFsQ2F0ZWdDb3VudHNbY2F0ZWdvcnldIHx8IDApICsgbnVtZXJpY1ZhbHVlO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgICAgICBjb29yZFN0cmluZzogY29vcmRTdHJpbmcsXG4gICAgICAgICAgICAgICAgY29vcmQ6IG51bWVyaWNDb29yZCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogbnVtZXJpY1ZhbHVlLFxuICAgICAgICAgICAgICAgIHN0aWNrSGVpZ2h0OiBzdGlja0hlaWdodCxcbiAgICAgICAgICAgICAgICBjb2xvcjogZ2V0Q29sb3IoY2F0ZWdvcnkpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKFwiZGlzY2FyZGluZyBcIiArIGQuY29vcmQgKyBcIiBcIiArIGQuY2F0ZWdvcnkpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbXV0cyA9IFtdO1xuXG5cbiAgICBpZiAodHlwZW9mIG11dGF0aW9uRGF0YSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGQzLmpzb24obXV0YXRpb25EYXRhLCBmdW5jdGlvbihlcnJvciwgdW5mb3JtYXR0ZWRNdXRzKSB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG11dHMgPSBwcmVwYXJlTXV0cyh1bmZvcm1hdHRlZE11dHMpO1xuICAgICAgICAgICAgcGFpbnRNdXRzKG11dHMpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBtdXRzID0gcHJlcGFyZU11dHMobXV0YXRpb25EYXRhKTtcbiAgICAgICAgcGFpbnRNdXRzKG11dHMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHByZXBhcmVNdXRzKHVuZm9ybWF0dGVkTXV0cykge1xuICAgICAgICBmb3IgKGtleSBpbiB1bmZvcm1hdHRlZE11dHMpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlZCA9IGZvcm1hdE11dGF0aW9uRW50cnkodW5mb3JtYXR0ZWRNdXRzW2tleV0pO1xuICAgICAgICAgICAgaWYgKGZvcm1hdHRlZCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBtdXRzLnB1c2goZm9ybWF0dGVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbXV0cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYWludE11dHMobXV0cykge1xuICAgICAgICB2YXIgbmVlZGxlcyA9IGQzLnNlbGVjdChcIi5tdXRuZWVkbGVzXCIpLnNlbGVjdEFsbCgpXG4gICAgICAgICAgICAuZGF0YShtdXRzKS5lbnRlcigpXG4gICAgICAgICAgICAuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCBmdW5jdGlvbihkYXRhKSB7IHJldHVybiB5KGRhdGEuc3RpY2tIZWlnaHQrZGF0YS52YWx1ZSk7IH0pXG4gICAgICAgICAgICAuYXR0cihcInkyXCIsIGZ1bmN0aW9uKGRhdGEpIHsgcmV0dXJuIHkoZGF0YS5zdGlja0hlaWdodCkgfSlcbiAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4geChkYXRhLmNvb3JkKSB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbihkYXRhKSB7IHJldHVybiB4KGRhdGEuY29vcmQpIH0pXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibmVlZGxlLWxpbmVcIik7XG5cblxuICAgICAgICBtaW5TaXplID0gNDtcbiAgICAgICAgbWF4U2l6ZSA9IDEwO1xuICAgICAgICBoZWFkU2l6ZVNjYWxlID0gZDMuc2NhbGUubG9nKCkucmFuZ2UoW21pblNpemUsbWF4U2l6ZV0pLmRvbWFpbihbMSwgaGlnaGVzdC8yXSk7XG4gICAgICAgIGhlYWRTaXplID0gZnVuY3Rpb24obikge1xuICAgICAgICAgICAgcmV0dXJuIGQzLm1pbihbZDMubWF4KFtoZWFkU2l6ZVNjYWxlKG4pLG1pblNpemVdKSwgbWF4U2l6ZV0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBuZWVkbGVIZWFkcyA9IGQzLnNlbGVjdChcIi5tdXRuZWVkbGVzXCIpLnNlbGVjdEFsbCgpXG4gICAgICAgICAgICAuZGF0YShtdXRzKVxuICAgICAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwiY2lyY2xlXCIpXG4gICAgICAgICAgICAuYXR0cihcImN5XCIsIGZ1bmN0aW9uKGRhdGEpIHsgcmV0dXJuIHkoZGF0YS5zdGlja0hlaWdodCtkYXRhLnZhbHVlKSB9IClcbiAgICAgICAgICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4geChkYXRhLmNvb3JkKSB9IClcbiAgICAgICAgICAgIC5hdHRyKFwiclwiLCBmdW5jdGlvbihkYXRhKSB7IHJldHVybiBoZWFkU2l6ZShkYXRhLnZhbHVlKSB9KVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5lZWRsZS1oZWFkXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKGRhdGEpIHsgcmV0dXJuIGRhdGEuY29sb3IgfSlcbiAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZVwiLCBmdW5jdGlvbihkYXRhKSB7cmV0dXJuIGQzLnJnYihkYXRhLmNvbG9yKS5kYXJrZXIoKX0pXG4gICAgICAgICAgICAub24oJ21vdXNlb3ZlcicsICBmdW5jdGlvbihkKXsgZDMuc2VsZWN0KHRoaXMpLm1vdmVUb0Zyb250KCk7IHRpcC5zaG93KGQpOyB9KVxuICAgICAgICAgICAgLm9uKCdtb3VzZW91dCcsIHRpcC5oaWRlKTtcblxuICAgICAgICBkMy5zZWxlY3Rpb24ucHJvdG90eXBlLm1vdmVUb0Zyb250ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJlbnROb2RlLmFwcGVuZENoaWxkKHRoaXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYWRqdXN0IHktc2NhbGUgYWNjb3JkaW5nIHRvIGhpZ2hlc3QgdmFsdWUgYW4gZHJhdyB0aGUgcmVzdFxuICAgICAgICBpZiAocmVnaW9uRGF0YSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHNlbGYuZHJhd1JlZ2lvbnMoc3ZnLCByZWdpb25EYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLmRyYXdMZWdlbmQoc3ZnKTtcbiAgICAgICAgc2VsZi5kcmF3QXhlcyhzdmcpO1xuICAgIH1cblxufTtcblxuXG5cbnZhciBFdmVudHMgPSByZXF1aXJlKCdiaW9qcy1ldmVudHMnKTtcbkV2ZW50cy5taXhpbihNdXRzTmVlZGxlUGxvdC5wcm90b3R5cGUpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE11dHNOZWVkbGVQbG90O1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9qcy9NdXRzTmVlZGxlUGxvdC5qc1wiKTtcbiJdfQ==
