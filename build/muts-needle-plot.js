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
            iterator.call(context, obj[i], i, obj);
          }
        } else {
          for (var key in obj) {
            if (this.has(obj, key)) {
              iterator.call(context, obj[key], key, obj);
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
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Events;
    }
    exports.BackboneEvents = Events;
  }else if (typeof define === "function"  && typeof define.amd == "object") {
    define(function() {
      return Events;
    });
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


},{"biojs-events":1,"d3-tip":4}],"muts-needle-plot":[function(require,module,exports){
module.exports = require("./src/js/MutsNeedlePlot.js");

},{"./src/js/MutsNeedlePlot.js":5}]},{},["muts-needle-plot"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9tcHNjaHIvRG9jdW1lbnRzL3Byb2plY3RzL211dHMtbmVlZGxlLXBsb3Qvbm9kZV9tb2R1bGVzL2Jpb2pzLWV2ZW50cy9pbmRleC5qcyIsIi9ob21lL21wc2Noci9Eb2N1bWVudHMvcHJvamVjdHMvbXV0cy1uZWVkbGUtcGxvdC9ub2RlX21vZHVsZXMvYmlvanMtZXZlbnRzL25vZGVfbW9kdWxlcy9iYWNrYm9uZS1ldmVudHMtc3RhbmRhbG9uZS9iYWNrYm9uZS1ldmVudHMtc3RhbmRhbG9uZS5qcyIsIi9ob21lL21wc2Noci9Eb2N1bWVudHMvcHJvamVjdHMvbXV0cy1uZWVkbGUtcGxvdC9ub2RlX21vZHVsZXMvYmlvanMtZXZlbnRzL25vZGVfbW9kdWxlcy9iYWNrYm9uZS1ldmVudHMtc3RhbmRhbG9uZS9pbmRleC5qcyIsIi9ob21lL21wc2Noci9Eb2N1bWVudHMvcHJvamVjdHMvbXV0cy1uZWVkbGUtcGxvdC9ub2RlX21vZHVsZXMvZDMtdGlwL2luZGV4LmpzIiwiL2hvbWUvbXBzY2hyL0RvY3VtZW50cy9wcm9qZWN0cy9tdXRzLW5lZWRsZS1wbG90L3NyYy9qcy9NdXRzTmVlZGxlUGxvdC5qcyIsIi4vaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3dEJBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGV2ZW50cyA9IHJlcXVpcmUoXCJiYWNrYm9uZS1ldmVudHMtc3RhbmRhbG9uZVwiKTtcblxuZXZlbnRzLm9uQWxsID0gZnVuY3Rpb24oY2FsbGJhY2ssY29udGV4dCl7XG4gIHRoaXMub24oXCJhbGxcIiwgY2FsbGJhY2ssY29udGV4dCk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gTWl4aW4gdXRpbGl0eVxuZXZlbnRzLm9sZE1peGluID0gZXZlbnRzLm1peGluO1xuZXZlbnRzLm1peGluID0gZnVuY3Rpb24ocHJvdG8pIHtcbiAgZXZlbnRzLm9sZE1peGluKHByb3RvKTtcbiAgLy8gYWRkIGN1c3RvbSBvbkFsbFxuICB2YXIgZXhwb3J0cyA9IFsnb25BbGwnXTtcbiAgZm9yKHZhciBpPTA7IGkgPCBleHBvcnRzLmxlbmd0aDtpKyspe1xuICAgIHZhciBuYW1lID0gZXhwb3J0c1tpXTtcbiAgICBwcm90b1tuYW1lXSA9IHRoaXNbbmFtZV07XG4gIH1cbiAgcmV0dXJuIHByb3RvO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBldmVudHM7XG4iLCIvKipcbiAqIFN0YW5kYWxvbmUgZXh0cmFjdGlvbiBvZiBCYWNrYm9uZS5FdmVudHMsIG5vIGV4dGVybmFsIGRlcGVuZGVuY3kgcmVxdWlyZWQuXG4gKiBEZWdyYWRlcyBuaWNlbHkgd2hlbiBCYWNrb25lL3VuZGVyc2NvcmUgYXJlIGFscmVhZHkgYXZhaWxhYmxlIGluIHRoZSBjdXJyZW50XG4gKiBnbG9iYWwgY29udGV4dC5cbiAqXG4gKiBOb3RlIHRoYXQgZG9jcyBzdWdnZXN0IHRvIHVzZSB1bmRlcnNjb3JlJ3MgYF8uZXh0ZW5kKClgIG1ldGhvZCB0byBhZGQgRXZlbnRzXG4gKiBzdXBwb3J0IHRvIHNvbWUgZ2l2ZW4gb2JqZWN0LiBBIGBtaXhpbigpYCBtZXRob2QgaGFzIGJlZW4gYWRkZWQgdG8gdGhlIEV2ZW50c1xuICogcHJvdG90eXBlIHRvIGF2b2lkIHVzaW5nIHVuZGVyc2NvcmUgZm9yIHRoYXQgc29sZSBwdXJwb3NlOlxuICpcbiAqICAgICB2YXIgbXlFdmVudEVtaXR0ZXIgPSBCYWNrYm9uZUV2ZW50cy5taXhpbih7fSk7XG4gKlxuICogT3IgZm9yIGEgZnVuY3Rpb24gY29uc3RydWN0b3I6XG4gKlxuICogICAgIGZ1bmN0aW9uIE15Q29uc3RydWN0b3IoKXt9XG4gKiAgICAgTXlDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZm9vID0gZnVuY3Rpb24oKXt9XG4gKiAgICAgQmFja2JvbmVFdmVudHMubWl4aW4oTXlDb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuICpcbiAqIChjKSAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIEluYy5cbiAqIChjKSAyMDEzIE5pY29sYXMgUGVycmlhdWx0XG4gKi9cbi8qIGdsb2JhbCBleHBvcnRzOnRydWUsIGRlZmluZSwgbW9kdWxlICovXG4oZnVuY3Rpb24oKSB7XG4gIHZhciByb290ID0gdGhpcyxcbiAgICAgIG5hdGl2ZUZvckVhY2ggPSBBcnJheS5wcm90b3R5cGUuZm9yRWFjaCxcbiAgICAgIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxcbiAgICAgIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLFxuICAgICAgaWRDb3VudGVyID0gMDtcblxuICAvLyBSZXR1cm5zIGEgcGFydGlhbCBpbXBsZW1lbnRhdGlvbiBtYXRjaGluZyB0aGUgbWluaW1hbCBBUEkgc3Vic2V0IHJlcXVpcmVkXG4gIC8vIGJ5IEJhY2tib25lLkV2ZW50c1xuICBmdW5jdGlvbiBtaW5pc2NvcmUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtleXM6IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmogIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIG9iaiAhPT0gXCJmdW5jdGlvblwiIHx8IG9iaiA9PT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJrZXlzKCkgY2FsbGVkIG9uIGEgbm9uLW9iamVjdFwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIga2V5LCBrZXlzID0gW107XG4gICAgICAgIGZvciAoa2V5IGluIG9iaikge1xuICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAga2V5c1trZXlzLmxlbmd0aF0gPSBrZXk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgfSxcblxuICAgICAgdW5pcXVlSWQ6IGZ1bmN0aW9uKHByZWZpeCkge1xuICAgICAgICB2YXIgaWQgPSArK2lkQ291bnRlciArICcnO1xuICAgICAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgICAgIH0sXG5cbiAgICAgIGhhczogZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICAgICAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xuICAgICAgfSxcblxuICAgICAgZWFjaDogZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgICAgICBpZiAob2JqID09IG51bGwpIHJldHVybjtcbiAgICAgICAgaWYgKG5hdGl2ZUZvckVhY2ggJiYgb2JqLmZvckVhY2ggPT09IG5hdGl2ZUZvckVhY2gpIHtcbiAgICAgICAgICBvYmouZm9yRWFjaChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICAgIH0gZWxzZSBpZiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG9iai5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2ldLCBpLCBvYmopO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5oYXMob2JqLCBrZXkpKSB7XG4gICAgICAgICAgICAgIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2tleV0sIGtleSwgb2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICAgIG9uY2U6IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgdmFyIHJhbiA9IGZhbHNlLCBtZW1vO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHJhbikgcmV0dXJuIG1lbW87XG4gICAgICAgICAgcmFuID0gdHJ1ZTtcbiAgICAgICAgICBtZW1vID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgIGZ1bmMgPSBudWxsO1xuICAgICAgICAgIHJldHVybiBtZW1vO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICB2YXIgXyA9IG1pbmlzY29yZSgpLCBFdmVudHM7XG5cbiAgLy8gQmFja2JvbmUuRXZlbnRzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEEgbW9kdWxlIHRoYXQgY2FuIGJlIG1peGVkIGluIHRvICphbnkgb2JqZWN0KiBpbiBvcmRlciB0byBwcm92aWRlIGl0IHdpdGhcbiAgLy8gY3VzdG9tIGV2ZW50cy4gWW91IG1heSBiaW5kIHdpdGggYG9uYCBvciByZW1vdmUgd2l0aCBgb2ZmYCBjYWxsYmFja1xuICAvLyBmdW5jdGlvbnMgdG8gYW4gZXZlbnQ7IGB0cmlnZ2VyYC1pbmcgYW4gZXZlbnQgZmlyZXMgYWxsIGNhbGxiYWNrcyBpblxuICAvLyBzdWNjZXNzaW9uLlxuICAvL1xuICAvLyAgICAgdmFyIG9iamVjdCA9IHt9O1xuICAvLyAgICAgXy5leHRlbmQob2JqZWN0LCBCYWNrYm9uZS5FdmVudHMpO1xuICAvLyAgICAgb2JqZWN0Lm9uKCdleHBhbmQnLCBmdW5jdGlvbigpeyBhbGVydCgnZXhwYW5kZWQnKTsgfSk7XG4gIC8vICAgICBvYmplY3QudHJpZ2dlcignZXhwYW5kJyk7XG4gIC8vXG4gIEV2ZW50cyA9IHtcblxuICAgIC8vIEJpbmQgYW4gZXZlbnQgdG8gYSBgY2FsbGJhY2tgIGZ1bmN0aW9uLiBQYXNzaW5nIGBcImFsbFwiYCB3aWxsIGJpbmRcbiAgICAvLyB0aGUgY2FsbGJhY2sgdG8gYWxsIGV2ZW50cyBmaXJlZC5cbiAgICBvbjogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICdvbicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pIHx8ICFjYWxsYmFjaykgcmV0dXJuIHRoaXM7XG4gICAgICB0aGlzLl9ldmVudHMgfHwgKHRoaXMuX2V2ZW50cyA9IHt9KTtcbiAgICAgIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0gfHwgKHRoaXMuX2V2ZW50c1tuYW1lXSA9IFtdKTtcbiAgICAgIGV2ZW50cy5wdXNoKHtjYWxsYmFjazogY2FsbGJhY2ssIGNvbnRleHQ6IGNvbnRleHQsIGN0eDogY29udGV4dCB8fCB0aGlzfSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy8gQmluZCBhbiBldmVudCB0byBvbmx5IGJlIHRyaWdnZXJlZCBhIHNpbmdsZSB0aW1lLiBBZnRlciB0aGUgZmlyc3QgdGltZVxuICAgIC8vIHRoZSBjYWxsYmFjayBpcyBpbnZva2VkLCBpdCB3aWxsIGJlIHJlbW92ZWQuXG4gICAgb25jZTogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICdvbmNlJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSByZXR1cm4gdGhpcztcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBvbmNlID0gXy5vbmNlKGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLm9mZihuYW1lLCBvbmNlKTtcbiAgICAgICAgY2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH0pO1xuICAgICAgb25jZS5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgIHJldHVybiB0aGlzLm9uKG5hbWUsIG9uY2UsIGNvbnRleHQpO1xuICAgIH0sXG5cbiAgICAvLyBSZW1vdmUgb25lIG9yIG1hbnkgY2FsbGJhY2tzLiBJZiBgY29udGV4dGAgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcbiAgICAvLyBjYWxsYmFja3Mgd2l0aCB0aGF0IGZ1bmN0aW9uLiBJZiBgY2FsbGJhY2tgIGlzIG51bGwsIHJlbW92ZXMgYWxsXG4gICAgLy8gY2FsbGJhY2tzIGZvciB0aGUgZXZlbnQuIElmIGBuYW1lYCBpcyBudWxsLCByZW1vdmVzIGFsbCBib3VuZFxuICAgIC8vIGNhbGxiYWNrcyBmb3IgYWxsIGV2ZW50cy5cbiAgICBvZmY6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgICB2YXIgcmV0YWluLCBldiwgZXZlbnRzLCBuYW1lcywgaSwgbCwgaiwgaztcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzIHx8ICFldmVudHNBcGkodGhpcywgJ29mZicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pKSByZXR1cm4gdGhpcztcbiAgICAgIGlmICghbmFtZSAmJiAhY2FsbGJhY2sgJiYgIWNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICBuYW1lcyA9IG5hbWUgPyBbbmFtZV0gOiBfLmtleXModGhpcy5fZXZlbnRzKTtcbiAgICAgIGZvciAoaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgbmFtZSA9IG5hbWVzW2ldO1xuICAgICAgICBpZiAoZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdKSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzW25hbWVdID0gcmV0YWluID0gW107XG4gICAgICAgICAgaWYgKGNhbGxiYWNrIHx8IGNvbnRleHQpIHtcbiAgICAgICAgICAgIGZvciAoaiA9IDAsIGsgPSBldmVudHMubGVuZ3RoOyBqIDwgazsgaisrKSB7XG4gICAgICAgICAgICAgIGV2ID0gZXZlbnRzW2pdO1xuICAgICAgICAgICAgICBpZiAoKGNhbGxiYWNrICYmIGNhbGxiYWNrICE9PSBldi5jYWxsYmFjayAmJiBjYWxsYmFjayAhPT0gZXYuY2FsbGJhY2suX2NhbGxiYWNrKSB8fFxuICAgICAgICAgICAgICAgICAgKGNvbnRleHQgJiYgY29udGV4dCAhPT0gZXYuY29udGV4dCkpIHtcbiAgICAgICAgICAgICAgICByZXRhaW4ucHVzaChldik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFyZXRhaW4ubGVuZ3RoKSBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBUcmlnZ2VyIG9uZSBvciBtYW55IGV2ZW50cywgZmlyaW5nIGFsbCBib3VuZCBjYWxsYmFja3MuIENhbGxiYWNrcyBhcmVcbiAgICAvLyBwYXNzZWQgdGhlIHNhbWUgYXJndW1lbnRzIGFzIGB0cmlnZ2VyYCBpcywgYXBhcnQgZnJvbSB0aGUgZXZlbnQgbmFtZVxuICAgIC8vICh1bmxlc3MgeW91J3JlIGxpc3RlbmluZyBvbiBgXCJhbGxcImAsIHdoaWNoIHdpbGwgY2F1c2UgeW91ciBjYWxsYmFjayB0b1xuICAgIC8vIHJlY2VpdmUgdGhlIHRydWUgbmFtZSBvZiB0aGUgZXZlbnQgYXMgdGhlIGZpcnN0IGFyZ3VtZW50KS5cbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICBpZiAoIXRoaXMuX2V2ZW50cykgcmV0dXJuIHRoaXM7XG4gICAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgIGlmICghZXZlbnRzQXBpKHRoaXMsICd0cmlnZ2VyJywgbmFtZSwgYXJncykpIHJldHVybiB0aGlzO1xuICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXTtcbiAgICAgIHZhciBhbGxFdmVudHMgPSB0aGlzLl9ldmVudHMuYWxsO1xuICAgICAgaWYgKGV2ZW50cykgdHJpZ2dlckV2ZW50cyhldmVudHMsIGFyZ3MpO1xuICAgICAgaWYgKGFsbEV2ZW50cykgdHJpZ2dlckV2ZW50cyhhbGxFdmVudHMsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy8gVGVsbCB0aGlzIG9iamVjdCB0byBzdG9wIGxpc3RlbmluZyB0byBlaXRoZXIgc3BlY2lmaWMgZXZlbnRzIC4uLiBvclxuICAgIC8vIHRvIGV2ZXJ5IG9iamVjdCBpdCdzIGN1cnJlbnRseSBsaXN0ZW5pbmcgdG8uXG4gICAgc3RvcExpc3RlbmluZzogZnVuY3Rpb24ob2JqLCBuYW1lLCBjYWxsYmFjaykge1xuICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycztcbiAgICAgIGlmICghbGlzdGVuZXJzKSByZXR1cm4gdGhpcztcbiAgICAgIHZhciBkZWxldGVMaXN0ZW5lciA9ICFuYW1lICYmICFjYWxsYmFjaztcbiAgICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIGNhbGxiYWNrID0gdGhpcztcbiAgICAgIGlmIChvYmopIChsaXN0ZW5lcnMgPSB7fSlbb2JqLl9saXN0ZW5lcklkXSA9IG9iajtcbiAgICAgIGZvciAodmFyIGlkIGluIGxpc3RlbmVycykge1xuICAgICAgICBsaXN0ZW5lcnNbaWRdLm9mZihuYW1lLCBjYWxsYmFjaywgdGhpcyk7XG4gICAgICAgIGlmIChkZWxldGVMaXN0ZW5lcikgZGVsZXRlIHRoaXMuX2xpc3RlbmVyc1tpZF07XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgfTtcblxuICAvLyBSZWd1bGFyIGV4cHJlc3Npb24gdXNlZCB0byBzcGxpdCBldmVudCBzdHJpbmdzLlxuICB2YXIgZXZlbnRTcGxpdHRlciA9IC9cXHMrLztcblxuICAvLyBJbXBsZW1lbnQgZmFuY3kgZmVhdHVyZXMgb2YgdGhlIEV2ZW50cyBBUEkgc3VjaCBhcyBtdWx0aXBsZSBldmVudFxuICAvLyBuYW1lcyBgXCJjaGFuZ2UgYmx1clwiYCBhbmQgalF1ZXJ5LXN0eWxlIGV2ZW50IG1hcHMgYHtjaGFuZ2U6IGFjdGlvbn1gXG4gIC8vIGluIHRlcm1zIG9mIHRoZSBleGlzdGluZyBBUEkuXG4gIHZhciBldmVudHNBcGkgPSBmdW5jdGlvbihvYmosIGFjdGlvbiwgbmFtZSwgcmVzdCkge1xuICAgIGlmICghbmFtZSkgcmV0dXJuIHRydWU7XG5cbiAgICAvLyBIYW5kbGUgZXZlbnQgbWFwcy5cbiAgICBpZiAodHlwZW9mIG5hbWUgPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gbmFtZSkge1xuICAgICAgICBvYmpbYWN0aW9uXS5hcHBseShvYmosIFtrZXksIG5hbWVba2V5XV0uY29uY2F0KHJlc3QpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgc3BhY2Ugc2VwYXJhdGVkIGV2ZW50IG5hbWVzLlxuICAgIGlmIChldmVudFNwbGl0dGVyLnRlc3QobmFtZSkpIHtcbiAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoZXZlbnRTcGxpdHRlcik7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBvYmpbYWN0aW9uXS5hcHBseShvYmosIFtuYW1lc1tpXV0uY29uY2F0KHJlc3QpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBBIGRpZmZpY3VsdC10by1iZWxpZXZlLCBidXQgb3B0aW1pemVkIGludGVybmFsIGRpc3BhdGNoIGZ1bmN0aW9uIGZvclxuICAvLyB0cmlnZ2VyaW5nIGV2ZW50cy4gVHJpZXMgdG8ga2VlcCB0aGUgdXN1YWwgY2FzZXMgc3BlZWR5IChtb3N0IGludGVybmFsXG4gIC8vIEJhY2tib25lIGV2ZW50cyBoYXZlIDMgYXJndW1lbnRzKS5cbiAgdmFyIHRyaWdnZXJFdmVudHMgPSBmdW5jdGlvbihldmVudHMsIGFyZ3MpIHtcbiAgICB2YXIgZXYsIGkgPSAtMSwgbCA9IGV2ZW50cy5sZW5ndGgsIGExID0gYXJnc1swXSwgYTIgPSBhcmdzWzFdLCBhMyA9IGFyZ3NbMl07XG4gICAgc3dpdGNoIChhcmdzLmxlbmd0aCkge1xuICAgICAgY2FzZSAwOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCk7IHJldHVybjtcbiAgICAgIGNhc2UgMTogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suY2FsbChldi5jdHgsIGExKTsgcmV0dXJuO1xuICAgICAgY2FzZSAyOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEsIGEyKTsgcmV0dXJuO1xuICAgICAgY2FzZSAzOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEsIGEyLCBhMyk7IHJldHVybjtcbiAgICAgIGRlZmF1bHQ6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmFwcGx5KGV2LmN0eCwgYXJncyk7XG4gICAgfVxuICB9O1xuXG4gIHZhciBsaXN0ZW5NZXRob2RzID0ge2xpc3RlblRvOiAnb24nLCBsaXN0ZW5Ub09uY2U6ICdvbmNlJ307XG5cbiAgLy8gSW52ZXJzaW9uLW9mLWNvbnRyb2wgdmVyc2lvbnMgb2YgYG9uYCBhbmQgYG9uY2VgLiBUZWxsICp0aGlzKiBvYmplY3QgdG9cbiAgLy8gbGlzdGVuIHRvIGFuIGV2ZW50IGluIGFub3RoZXIgb2JqZWN0IC4uLiBrZWVwaW5nIHRyYWNrIG9mIHdoYXQgaXQnc1xuICAvLyBsaXN0ZW5pbmcgdG8uXG4gIF8uZWFjaChsaXN0ZW5NZXRob2RzLCBmdW5jdGlvbihpbXBsZW1lbnRhdGlvbiwgbWV0aG9kKSB7XG4gICAgRXZlbnRzW21ldGhvZF0gPSBmdW5jdGlvbihvYmosIG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzIHx8ICh0aGlzLl9saXN0ZW5lcnMgPSB7fSk7XG4gICAgICB2YXIgaWQgPSBvYmouX2xpc3RlbmVySWQgfHwgKG9iai5fbGlzdGVuZXJJZCA9IF8udW5pcXVlSWQoJ2wnKSk7XG4gICAgICBsaXN0ZW5lcnNbaWRdID0gb2JqO1xuICAgICAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgY2FsbGJhY2sgPSB0aGlzO1xuICAgICAgb2JqW2ltcGxlbWVudGF0aW9uXShuYW1lLCBjYWxsYmFjaywgdGhpcyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICB9KTtcblxuICAvLyBBbGlhc2VzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgRXZlbnRzLmJpbmQgICA9IEV2ZW50cy5vbjtcbiAgRXZlbnRzLnVuYmluZCA9IEV2ZW50cy5vZmY7XG5cbiAgLy8gTWl4aW4gdXRpbGl0eVxuICBFdmVudHMubWl4aW4gPSBmdW5jdGlvbihwcm90bykge1xuICAgIHZhciBleHBvcnRzID0gWydvbicsICdvbmNlJywgJ29mZicsICd0cmlnZ2VyJywgJ3N0b3BMaXN0ZW5pbmcnLCAnbGlzdGVuVG8nLFxuICAgICAgICAgICAgICAgICAgICdsaXN0ZW5Ub09uY2UnLCAnYmluZCcsICd1bmJpbmQnXTtcbiAgICBfLmVhY2goZXhwb3J0cywgZnVuY3Rpb24obmFtZSkge1xuICAgICAgcHJvdG9bbmFtZV0gPSB0aGlzW25hbWVdO1xuICAgIH0sIHRoaXMpO1xuICAgIHJldHVybiBwcm90bztcbiAgfTtcblxuICAvLyBFeHBvcnQgRXZlbnRzIGFzIEJhY2tib25lRXZlbnRzIGRlcGVuZGluZyBvbiBjdXJyZW50IGNvbnRleHRcbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gRXZlbnRzO1xuICAgIH1cbiAgICBleHBvcnRzLkJhY2tib25lRXZlbnRzID0gRXZlbnRzO1xuICB9ZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PSBcIm9iamVjdFwiKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIEV2ZW50cztcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByb290LkJhY2tib25lRXZlbnRzID0gRXZlbnRzO1xuICB9XG59KSh0aGlzKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9iYWNrYm9uZS1ldmVudHMtc3RhbmRhbG9uZScpO1xuIiwiLy8gZDMudGlwXG4vLyBDb3B5cmlnaHQgKGMpIDIwMTMgSnVzdGluIFBhbG1lclxuLy9cbi8vIFRvb2x0aXBzIGZvciBkMy5qcyBTVkcgdmlzdWFsaXphdGlvbnNcblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUgd2l0aCBkMyBhcyBhIGRlcGVuZGVuY3kuXG4gICAgZGVmaW5lKFsnZDMnXSwgZmFjdG9yeSlcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkMykge1xuICAgICAgZDMudGlwID0gZmFjdG9yeShkMylcbiAgICAgIHJldHVybiBkMy50aXBcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWwuXG4gICAgcm9vdC5kMy50aXAgPSBmYWN0b3J5KHJvb3QuZDMpXG4gIH1cbn0odGhpcywgZnVuY3Rpb24gKGQzKSB7XG5cbiAgLy8gUHVibGljIC0gY29udHJ1Y3RzIGEgbmV3IHRvb2x0aXBcbiAgLy9cbiAgLy8gUmV0dXJucyBhIHRpcFxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRpcmVjdGlvbiA9IGQzX3RpcF9kaXJlY3Rpb24sXG4gICAgICAgIG9mZnNldCAgICA9IGQzX3RpcF9vZmZzZXQsXG4gICAgICAgIGh0bWwgICAgICA9IGQzX3RpcF9odG1sLFxuICAgICAgICBub2RlICAgICAgPSBpbml0Tm9kZSgpLFxuICAgICAgICBzdmcgICAgICAgPSBudWxsLFxuICAgICAgICBwb2ludCAgICAgPSBudWxsLFxuICAgICAgICB0YXJnZXQgICAgPSBudWxsXG5cbiAgICBmdW5jdGlvbiB0aXAodmlzKSB7XG4gICAgICBzdmcgPSBnZXRTVkdOb2RlKHZpcylcbiAgICAgIHBvaW50ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KClcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICB9XG5cbiAgICAvLyBQdWJsaWMgLSBzaG93IHRoZSB0b29sdGlwIG9uIHRoZSBzY3JlZW5cbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuc2hvdyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgICBpZihhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB0YXJnZXQgPSBhcmdzLnBvcCgpXG5cbiAgICAgIHZhciBjb250ZW50ID0gaHRtbC5hcHBseSh0aGlzLCBhcmdzKSxcbiAgICAgICAgICBwb2Zmc2V0ID0gb2Zmc2V0LmFwcGx5KHRoaXMsIGFyZ3MpLFxuICAgICAgICAgIGRpciAgICAgPSBkaXJlY3Rpb24uYXBwbHkodGhpcywgYXJncyksXG4gICAgICAgICAgbm9kZWwgICA9IGQzLnNlbGVjdChub2RlKSxcbiAgICAgICAgICBpICAgICAgID0gZGlyZWN0aW9ucy5sZW5ndGgsXG4gICAgICAgICAgY29vcmRzLFxuICAgICAgICAgIHNjcm9sbFRvcCAgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wIHx8IGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wLFxuICAgICAgICAgIHNjcm9sbExlZnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnRcblxuICAgICAgbm9kZWwuaHRtbChjb250ZW50KVxuICAgICAgICAuc3R5bGUoeyBvcGFjaXR5OiAxLCAncG9pbnRlci1ldmVudHMnOiAnYWxsJyB9KVxuXG4gICAgICB3aGlsZShpLS0pIG5vZGVsLmNsYXNzZWQoZGlyZWN0aW9uc1tpXSwgZmFsc2UpXG4gICAgICBjb29yZHMgPSBkaXJlY3Rpb25fY2FsbGJhY2tzLmdldChkaXIpLmFwcGx5KHRoaXMpXG4gICAgICBub2RlbC5jbGFzc2VkKGRpciwgdHJ1ZSkuc3R5bGUoe1xuICAgICAgICB0b3A6IChjb29yZHMudG9wICsgIHBvZmZzZXRbMF0pICsgc2Nyb2xsVG9wICsgJ3B4JyxcbiAgICAgICAgbGVmdDogKGNvb3Jkcy5sZWZ0ICsgcG9mZnNldFsxXSkgKyBzY3JvbGxMZWZ0ICsgJ3B4J1xuICAgICAgfSlcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYyAtIGhpZGUgdGhlIHRvb2x0aXBcbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuaGlkZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vZGVsID0gZDMuc2VsZWN0KG5vZGUpXG4gICAgICBub2RlbC5zdHlsZSh7IG9wYWNpdHk6IDAsICdwb2ludGVyLWV2ZW50cyc6ICdub25lJyB9KVxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogUHJveHkgYXR0ciBjYWxscyB0byB0aGUgZDMgdGlwIGNvbnRhaW5lci4gIFNldHMgb3IgZ2V0cyBhdHRyaWJ1dGUgdmFsdWUuXG4gICAgLy9cbiAgICAvLyBuIC0gbmFtZSBvZiB0aGUgYXR0cmlidXRlXG4gICAgLy8gdiAtIHZhbHVlIG9mIHRoZSBhdHRyaWJ1dGVcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIGF0dHJpYnV0ZSB2YWx1ZVxuICAgIHRpcC5hdHRyID0gZnVuY3Rpb24obiwgdikge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyICYmIHR5cGVvZiBuID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gZDMuc2VsZWN0KG5vZGUpLmF0dHIobilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcmdzID0gIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgICAgZDMuc2VsZWN0aW9uLnByb3RvdHlwZS5hdHRyLmFwcGx5KGQzLnNlbGVjdChub2RlKSwgYXJncylcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogUHJveHkgc3R5bGUgY2FsbHMgdG8gdGhlIGQzIHRpcCBjb250YWluZXIuICBTZXRzIG9yIGdldHMgYSBzdHlsZSB2YWx1ZS5cbiAgICAvL1xuICAgIC8vIG4gLSBuYW1lIG9mIHRoZSBwcm9wZXJ0eVxuICAgIC8vIHYgLSB2YWx1ZSBvZiB0aGUgcHJvcGVydHlcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIHN0eWxlIHByb3BlcnR5IHZhbHVlXG4gICAgdGlwLnN0eWxlID0gZnVuY3Rpb24obiwgdikge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyICYmIHR5cGVvZiBuID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gZDMuc2VsZWN0KG5vZGUpLnN0eWxlKG4pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJncyA9ICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgICAgIGQzLnNlbGVjdGlvbi5wcm90b3R5cGUuc3R5bGUuYXBwbHkoZDMuc2VsZWN0KG5vZGUpLCBhcmdzKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBTZXQgb3IgZ2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIHRvb2x0aXBcbiAgICAvL1xuICAgIC8vIHYgLSBPbmUgb2Ygbihub3J0aCksIHMoc291dGgpLCBlKGVhc3QpLCBvciB3KHdlc3QpLCBudyhub3J0aHdlc3QpLFxuICAgIC8vICAgICBzdyhzb3V0aHdlc3QpLCBuZShub3J0aGVhc3QpIG9yIHNlKHNvdXRoZWFzdClcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIGRpcmVjdGlvblxuICAgIHRpcC5kaXJlY3Rpb24gPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkaXJlY3Rpb25cbiAgICAgIGRpcmVjdGlvbiA9IHYgPT0gbnVsbCA/IHYgOiBkMy5mdW5jdG9yKHYpXG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFNldHMgb3IgZ2V0cyB0aGUgb2Zmc2V0IG9mIHRoZSB0aXBcbiAgICAvL1xuICAgIC8vIHYgLSBBcnJheSBvZiBbeCwgeV0gb2Zmc2V0XG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIG9mZnNldCBvclxuICAgIHRpcC5vZmZzZXQgPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBvZmZzZXRcbiAgICAgIG9mZnNldCA9IHYgPT0gbnVsbCA/IHYgOiBkMy5mdW5jdG9yKHYpXG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IHNldHMgb3IgZ2V0cyB0aGUgaHRtbCB2YWx1ZSBvZiB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIFN0cmluZyB2YWx1ZSBvZiB0aGUgdGlwXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGh0bWwgdmFsdWUgb3IgdGlwXG4gICAgdGlwLmh0bWwgPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBodG1sXG4gICAgICBodG1sID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGQzX3RpcF9kaXJlY3Rpb24oKSB7IHJldHVybiAnbicgfVxuICAgIGZ1bmN0aW9uIGQzX3RpcF9vZmZzZXQoKSB7IHJldHVybiBbMCwgMF0gfVxuICAgIGZ1bmN0aW9uIGQzX3RpcF9odG1sKCkgeyByZXR1cm4gJyAnIH1cblxuICAgIHZhciBkaXJlY3Rpb25fY2FsbGJhY2tzID0gZDMubWFwKHtcbiAgICAgIG46ICBkaXJlY3Rpb25fbixcbiAgICAgIHM6ICBkaXJlY3Rpb25fcyxcbiAgICAgIGU6ICBkaXJlY3Rpb25fZSxcbiAgICAgIHc6ICBkaXJlY3Rpb25fdyxcbiAgICAgIG53OiBkaXJlY3Rpb25fbncsXG4gICAgICBuZTogZGlyZWN0aW9uX25lLFxuICAgICAgc3c6IGRpcmVjdGlvbl9zdyxcbiAgICAgIHNlOiBkaXJlY3Rpb25fc2VcbiAgICB9KSxcblxuICAgIGRpcmVjdGlvbnMgPSBkaXJlY3Rpb25fY2FsbGJhY2tzLmtleXMoKVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX24oKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5uLnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5uLnggLSBub2RlLm9mZnNldFdpZHRoIC8gMlxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gucy55LFxuICAgICAgICBsZWZ0OiBiYm94LnMueCAtIG5vZGUub2Zmc2V0V2lkdGggLyAyXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX2UoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5lLnkgLSBub2RlLm9mZnNldEhlaWdodCAvIDIsXG4gICAgICAgIGxlZnQ6IGJib3guZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3coKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC53LnkgLSBub2RlLm9mZnNldEhlaWdodCAvIDIsXG4gICAgICAgIGxlZnQ6IGJib3gudy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9udygpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm53LnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5udy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9uZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm5lLnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5uZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3N3KCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3guc3cueSxcbiAgICAgICAgbGVmdDogYmJveC5zdy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LnNlLnksXG4gICAgICAgIGxlZnQ6IGJib3guZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5pdE5vZGUoKSB7XG4gICAgICB2YXIgbm9kZSA9IGQzLnNlbGVjdChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSlcbiAgICAgIG5vZGUuc3R5bGUoe1xuICAgICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgICAgdG9wOiAwLFxuICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICAncG9pbnRlci1ldmVudHMnOiAnbm9uZScsXG4gICAgICAgICdib3gtc2l6aW5nJzogJ2JvcmRlci1ib3gnXG4gICAgICB9KVxuXG4gICAgICByZXR1cm4gbm9kZS5ub2RlKClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTVkdOb2RlKGVsKSB7XG4gICAgICBlbCA9IGVsLm5vZGUoKVxuICAgICAgaWYoZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc3ZnJylcbiAgICAgICAgcmV0dXJuIGVsXG5cbiAgICAgIHJldHVybiBlbC5vd25lclNWR0VsZW1lbnRcbiAgICB9XG5cbiAgICAvLyBQcml2YXRlIC0gZ2V0cyB0aGUgc2NyZWVuIGNvb3JkaW5hdGVzIG9mIGEgc2hhcGVcbiAgICAvL1xuICAgIC8vIEdpdmVuIGEgc2hhcGUgb24gdGhlIHNjcmVlbiwgd2lsbCByZXR1cm4gYW4gU1ZHUG9pbnQgZm9yIHRoZSBkaXJlY3Rpb25zXG4gICAgLy8gbihub3J0aCksIHMoc291dGgpLCBlKGVhc3QpLCB3KHdlc3QpLCBuZShub3J0aGVhc3QpLCBzZShzb3V0aGVhc3QpLCBudyhub3J0aHdlc3QpLFxuICAgIC8vIHN3KHNvdXRod2VzdCkuXG4gICAgLy9cbiAgICAvLyAgICArLSstK1xuICAgIC8vICAgIHwgICB8XG4gICAgLy8gICAgKyAgICtcbiAgICAvLyAgICB8ICAgfFxuICAgIC8vICAgICstKy0rXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGFuIE9iamVjdCB7biwgcywgZSwgdywgbncsIHN3LCBuZSwgc2V9XG4gICAgZnVuY3Rpb24gZ2V0U2NyZWVuQkJveCgpIHtcbiAgICAgIHZhciB0YXJnZXRlbCAgID0gdGFyZ2V0IHx8IGQzLmV2ZW50LnRhcmdldDtcblxuICAgICAgd2hpbGUgKCd1bmRlZmluZWQnID09PSB0eXBlb2YgdGFyZ2V0ZWwuZ2V0U2NyZWVuQ1RNICYmICd1bmRlZmluZWQnID09PSB0YXJnZXRlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgdGFyZ2V0ZWwgPSB0YXJnZXRlbC5wYXJlbnROb2RlO1xuICAgICAgfVxuXG4gICAgICB2YXIgYmJveCAgICAgICA9IHt9LFxuICAgICAgICAgIG1hdHJpeCAgICAgPSB0YXJnZXRlbC5nZXRTY3JlZW5DVE0oKSxcbiAgICAgICAgICB0YmJveCAgICAgID0gdGFyZ2V0ZWwuZ2V0QkJveCgpLFxuICAgICAgICAgIHdpZHRoICAgICAgPSB0YmJveC53aWR0aCxcbiAgICAgICAgICBoZWlnaHQgICAgID0gdGJib3guaGVpZ2h0LFxuICAgICAgICAgIHggICAgICAgICAgPSB0YmJveC54LFxuICAgICAgICAgIHkgICAgICAgICAgPSB0YmJveC55XG5cbiAgICAgIHBvaW50LnggPSB4XG4gICAgICBwb2ludC55ID0geVxuICAgICAgYmJveC5udyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54ICs9IHdpZHRoXG4gICAgICBiYm94Lm5lID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnkgKz0gaGVpZ2h0XG4gICAgICBiYm94LnNlID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggLT0gd2lkdGhcbiAgICAgIGJib3guc3cgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSAtPSBoZWlnaHQgLyAyXG4gICAgICBiYm94LncgID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggKz0gd2lkdGhcbiAgICAgIGJib3guZSA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54IC09IHdpZHRoIC8gMlxuICAgICAgcG9pbnQueSAtPSBoZWlnaHQgLyAyXG4gICAgICBiYm94Lm4gPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSArPSBoZWlnaHRcbiAgICAgIGJib3gucyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG5cbiAgICAgIHJldHVybiBiYm94XG4gICAgfVxuXG4gICAgcmV0dXJuIHRpcFxuICB9O1xuXG59KSk7XG4iLCIvKipcbiAqXG4gKiBNdXRhdGlvbnMgTmVlZGxlIFBsb3QgKG11dHMtbmVlZGxlLXBsb3QpXG4gKlxuICogQ3JlYXRlcyBhIG5lZWRsZSBwbG90IChhLmsuYSBzdGVtIHBsb3QsIGxvbGxpcG9wLXBsb3QgYW5kIHNvb24gYWxzbyBiYWxsb29uIHBsb3QgOy0pXG4gKiBUaGlzIGNsYXNzIHVzZXMgdGhlIG5wbS1yZXF1aXJlIG1vZHVsZSB0byBsb2FkIGRlcGVuZGVuY2llcyBkMywgZDMtdGlwXG4gKlxuICogQGF1dGhvciBNaWNoYWVsIFAgU2Nocm9lZGVyXG4gKiBAY2xhc3NcbiAqL1xuXG5mdW5jdGlvbiBNdXRzTmVlZGxlUGxvdCAoY29uZmlnKSB7XG5cbiAgICAvLyBJTklUSUFMSVpBVElPTlxuXG4gICAgdmFyIHNlbGYgPSB0aGlzOyAgICAgICAgLy8gc2VsZiA9IE11dHNOZWVkbGVQbG90XG5cbiAgICAvLyBYLWNvb3JkaW5hdGVzXG4gICAgdGhpcy5tYXhDb29yZCA9IGNvbmZpZy5tYXhDb29yZCB8fCAtMTsgICAgICAgICAgICAgLy8gVGhlIG1heGltdW0gY29vcmQgKHgtYXhpcylcbiAgICBpZiAodGhpcy5tYXhDb29yZCA8IDApIHsgdGhyb3cgbmV3IEVycm9yKFwiJ21heENvb3JkJyBtdXN0IGJlIGRlZmluZWQgaW5pdGlhdGlvbiBjb25maWchXCIpOyB9XG4gICAgdGhpcy5taW5Db29yZCA9IGNvbmZpZy5taW5Db29yZCB8fCAxOyAgICAgICAgICAgICAgIC8vIFRoZSBtaW5pbXVtIGNvb3JkICh4LWF4aXMpXG5cbiAgICAvLyBkYXRhXG4gICAgbXV0YXRpb25EYXRhID0gY29uZmlnLm11dGF0aW9uRGF0YSB8fCAtMTsgICAgICAgICAgLy8gLmpzb24gZmlsZSBvciBkaWN0XG4gICAgaWYgKHRoaXMubWF4Q29vcmQgPCAwKSB7IHRocm93IG5ldyBFcnJvcihcIidtdXRhdGlvbkRhdGEnIG11c3QgYmUgZGVmaW5lZCBpbml0aWF0aW9uIGNvbmZpZyFcIik7IH1cbiAgICByZWdpb25EYXRhID0gY29uZmlnLnJlZ2lvbkRhdGEgfHwgLTE7ICAgICAgICAgICAgICAvLyAuanNvbiBmaWxlIG9yIGRpY3RcbiAgICBpZiAodGhpcy5tYXhDb29yZCA8IDApIHsgdGhyb3cgbmV3IEVycm9yKFwiJ3JlZ2lvbkRhdGEnIG11c3QgYmUgZGVmaW5lZCBpbml0aWF0aW9uIGNvbmZpZyFcIik7IH1cbiAgICB0aGlzLnRvdGFsQ2F0ZWdDb3VudHMgPSB7fTtcbiAgICB0aGlzLmNhdGVnQ291bnRzID0ge307XG4gICAgdGhpcy5zZWxlY3RlZE5lZWRsZXMgPSBbXTtcblxuICAgIC8vIFBsb3QgZGltZW5zaW9ucyAmIHRhcmdldFxuICAgIHZhciB0YXJnZXRFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY29uZmlnLnRhcmdldEVsZW1lbnQpIHx8IGNvbmZpZy50YXJnZXRFbGVtZW50IHx8IGRvY3VtZW50LmJvZHkgICAvLyBXaGVyZSB0byBhcHBlbmQgdGhlIHBsb3QgKHN2ZylcblxuICAgIHZhciB3aWR0aCA9IHRoaXMud2lkdGggPSBjb25maWcud2lkdGggfHwgdGFyZ2V0RWxlbWVudC5vZmZzZXRXaWR0aCB8fCAxMDAwO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLmhlaWdodCA9IGNvbmZpZy5oZWlnaHQgfHwgdGFyZ2V0RWxlbWVudC5vZmZzZXRIZWlnaHQgfHwgNTAwO1xuXG4gICAgLy8gQ29sb3Igc2NhbGUgJiBtYXBcbiAgICB0aGlzLmNvbG9yTWFwID0gY29uZmlnLmNvbG9yTWFwIHx8IHt9OyAgICAgICAgICAgICAgLy8gZGljdFxuICAgIHZhciBjb2xvcnMgPSBPYmplY3Qua2V5cyh0aGlzLmNvbG9yTWFwKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gc2VsZi5jb2xvck1hcFtrZXldO1xuICAgIH0pO1xuICAgIHRoaXMuY29sb3JTY2FsZSA9IGQzLnNjYWxlLmNhdGVnb3J5MjAoKVxuICAgICAgICAuZG9tYWluKE9iamVjdC5rZXlzKHRoaXMuY29sb3JNYXApKVxuICAgICAgICAucmFuZ2UoY29sb3JzLmNvbmNhdChkMy5zY2FsZS5jYXRlZ29yeTIwKCkucmFuZ2UoKSkpO1xuICAgIHRoaXMubGVnZW5kcyA9IGNvbmZpZy5sZWdlbmRzIHx8IHtcbiAgICAgICAgXCJ5XCI6IFwiVmFsdWVcIixcbiAgICAgICAgXCJ4XCI6IFwiQ29vcmRpbmF0ZVwiXG4gICAgfTtcblxuICAgIHRoaXMuc3ZnQ2xhc3NlcyA9IFwibXV0bmVlZGxlc1wiO1xuICAgIHRoaXMuYnVmZmVyID0gMDtcblxuICAgIHZhciBtYXhDb29yZCA9IHRoaXMubWF4Q29vcmQ7XG5cbiAgICB2YXIgYnVmZmVyID0gMDtcbiAgICBpZiAod2lkdGggPj0gaGVpZ2h0KSB7XG4gICAgICBidWZmZXIgPSBoZWlnaHQgLyA4O1xuICAgIH0gZWxzZSB7XG4gICAgICBidWZmZXIgPSB3aWR0aCAvIDg7XG4gICAgfVxuXG4gICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG5cbiAgICAvLyBJSU1QT1JUIEFORCBDT05GSUdVUkUgVElQU1xuICAgIHZhciBkM3RpcCA9IHJlcXVpcmUoJ2QzLXRpcCcpO1xuICAgIGQzdGlwKGQzKTtcblxuXG4gICAgdGhpcy50aXAgPSBkMy50aXAoKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLXRpcCBkMy10aXAtbmVlZGxlJylcbiAgICAgIC5vZmZzZXQoWy0xMCwgMF0pXG4gICAgICAuaHRtbChmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBcIjxzcGFuPlwiICsgZC52YWx1ZSArIFwiIFwiICsgZC5jYXRlZ29yeSArICBcIiBhdCBjb29yZC4gXCIgKyBkLmNvb3JkU3RyaW5nICsgXCI8L3NwYW4+XCI7XG4gICAgICB9KTtcblxuICAgIHRoaXMuc2VsZWN0aW9uVGlwID0gZDMudGlwKClcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2QzLXRpcCBkMy10aXAtc2VsZWN0aW9uJylcbiAgICAgICAgLm9mZnNldChbLTUwLCAwXSlcbiAgICAgICAgLmh0bWwoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiPHNwYW4+IFNlbGVjdGVkIGNvb3JkaW5hdGVzPGJyLz5cIiArIE1hdGgucm91bmQoZC5sZWZ0KSArIFwiIC0gXCIgKyBNYXRoLnJvdW5kKGQucmlnaHQpICsgXCI8L3NwYW4+XCI7XG4gICAgICAgIH0pXG4gICAgICAgIC5kaXJlY3Rpb24oJ24nKTtcblxuICAgIC8vIElOSVQgU1ZHXG4gICAgdmFyIHN2ZztcbiAgICB2YXIgdG9wbm9kZTtcbiAgICBpZiAoY29uZmlnLnJlc3BvbnNpdmUgPT0gJ3Jlc2l6ZScpIHtcbiAgICAgICAgdG9wbm9kZSAgPSBkMy5zZWxlY3QodGFyZ2V0RWxlbWVudCkuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsICcxMDAlJylcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsICcxMDAlJylcbiAgICAgICAgICAgIC5hdHRyKCd2aWV3Qm94JywnMCAwICcrTWF0aC5taW4od2lkdGgpKycgJytNYXRoLm1pbihoZWlnaHQpKVxuICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2JydXNoJyk7XG4gICAgICAgIHN2ZyA9IHRvcG5vZGVcbiAgICAgICAgICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIHRoaXMuc3ZnQ2xhc3NlcylcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKDAsMClcIik7XG4gICAgfSBlbHNlICB7XG5cbiAgICAgICAgdmFyIHN2ZyA9IGQzLnNlbGVjdCh0YXJnZXRFbGVtZW50KS5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIHRoaXMuc3ZnQ2xhc3NlcyArIFwiIGJydXNoXCIpO1xuICAgICAgICB0b3Bub2RlID0gc3ZnO1xuICAgIH1cblxuXG4gICAgc3ZnLmNhbGwodGhpcy50aXApO1xuICAgIHN2Zy5jYWxsKHRoaXMuc2VsZWN0aW9uVGlwKTtcblxuICAgIC8vIERFRklORSBTQ0FMRVNcblxuICAgIHZhciB4ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oW3RoaXMubWluQ29vcmQsIHRoaXMubWF4Q29vcmRdKVxuICAgICAgLnJhbmdlKFtidWZmZXIgKiAxLjUgLCB3aWR0aCAtIGJ1ZmZlcl0pXG4gICAgICAubmljZSgpO1xuICAgIHRoaXMueCA9IHg7XG5cbiAgICB2YXIgeSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAuZG9tYWluKFsxLDIwXSlcbiAgICAgIC5yYW5nZShbaGVpZ2h0IC0gYnVmZmVyICogMS41LCBidWZmZXJdKVxuICAgICAgLm5pY2UoKTtcbiAgICB0aGlzLnkgPSB5O1xuXG4gICAgLy8gQ09ORklHVVJFIEJSVVNIXG4gICAgc2VsZi5zZWxlY3RvciA9IGQzLnN2Zy5icnVzaCgpXG4gICAgICAgIC54KHgpXG4gICAgICAgIC5vbihcImJydXNoXCIsIGJydXNobW92ZSlcbiAgICAgICAgLm9uKFwiYnJ1c2hlbmRcIiwgYnJ1c2hlbmQpO1xuICAgIHZhciBzZWxlY3RvciA9IHNlbGYuc2VsZWN0b3I7XG5cbiAgICB2YXIgc2VsZWN0aW9uUmVjdCA9IHRvcG5vZGVcbiAgICAgICAgLmNhbGwoc2VsZWN0b3IpXG4gICAgICAgIC5zZWxlY3RBbGwoJy5leHRlbnQnKVxuICAgICAgICAuYXR0cignaGVpZ2h0JywgNTApXG4gICAgICAgIC5hdHRyKCd5JywgaGVpZ2h0LTUwKVxuICAgICAgICAuYXR0cignb3BhY2l0eScsIDAuMik7XG5cbiAgICBzZWxlY3Rpb25SZWN0Lm9uKFwibW91c2VlbnRlclwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNlbGVjdGlvbiA9IHNlbGVjdG9yLmV4dGVudCgpO1xuICAgICAgICBzZWxmLnNlbGVjdGlvblRpcC5zaG93KHtsZWZ0OiBzZWxlY3Rpb25bMF0sIHJpZ2h0OiBzZWxlY3Rpb25bMV19LCBzZWxlY3Rpb25SZWN0Lm5vZGUoKSk7XG4gICAgfSlcbiAgICAgICAgLm9uKFwibW91c2VvdXRcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGQzLnNlbGVjdChcIi5kMy10aXAtc2VsZWN0aW9uXCIpXG4gICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgIC5kZWxheSgzMDAwKVxuICAgICAgICAgICAgICAgIC5kdXJhdGlvbigxMDAwKVxuICAgICAgICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIiwwKVxuICAgICAgICAgICAgICAgIC5zdHlsZSgncG9pbnRlci1ldmVudHMnLCAnbm9uZScpO1xuICAgICAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGJydXNobW92ZSgpIHtcblxuICAgICAgICB2YXIgZXh0ZW50ID0gc2VsZWN0b3IuZXh0ZW50KCk7XG4gICAgICAgIG5lZWRsZUhlYWRzID0gZDMuc2VsZWN0QWxsKFwiLm5lZWRsZS1oZWFkXCIpO1xuICAgICAgICBzZWxlY3RlZE5lZWRsZXMgPSBbXTtcbiAgICAgICAgY2F0ZWdDb3VudHMgPSB7fTtcbiAgICAgICAgZm9yIChrZXkgaW4gT2JqZWN0LmtleXMoc2VsZi50b3RhbENhdGVnQ291bnRzKSkge1xuICAgICAgICAgICAgY2F0ZWdDb3VudHNba2V5XSA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBuZWVkbGVIZWFkcy5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgaXNfYnJ1c2hlZCA9IGV4dGVudFswXSA8PSBkLmNvb3JkICYmIGQuY29vcmQgPD0gZXh0ZW50WzFdO1xuICAgICAgICAgICAgaWYgKGlzX2JydXNoZWQpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZE5lZWRsZXMucHVzaChkKTtcbiAgICAgICAgICAgICAgICBjYXRlZ0NvdW50c1tkLmNhdGVnb3J5XSA9IChjYXRlZ0NvdW50c1tkLmNhdGVnb3J5XSB8fCAwKSArIGQudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaXNfYnJ1c2hlZDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2VsZi50cmlnZ2VyKCduZWVkbGVTZWxlY3Rpb25DaGFuZ2UnLCB7XG4gICAgICAgIHNlbGVjdGVkIDogc2VsZWN0ZWROZWVkbGVzLFxuICAgICAgICAgICAgY2F0ZWdDb3VudHM6IGNhdGVnQ291bnRzLFxuICAgICAgICAgICAgY29vcmRzOiBleHRlbnRcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYnJ1c2hlbmQoKSB7XG4gICAgICAgIGdldF9idXR0b24gPSBkMy5zZWxlY3QoXCIuY2xlYXItYnV0dG9uXCIpO1xuICAgICAgICBzZWxmLnRyaWdnZXIoJ25lZWRsZVNlbGVjdGlvbkNoYW5nZUVuZCcsIHtcbiAgICAgICAgICAgIHNlbGVjdGVkIDogc2VsZWN0ZWROZWVkbGVzLFxuICAgICAgICAgICAgY2F0ZWdDb3VudHM6IGNhdGVnQ291bnRzLFxuICAgICAgICAgICAgY29vcmRzOiBzZWxlY3Rvci5leHRlbnQoKVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLy8gRFJBV1xuICAgIHRoaXMuZHJhd05lZWRsZXMoc3ZnLCBtdXRhdGlvbkRhdGEsIHJlZ2lvbkRhdGEpO1xuXG5cbiAgICBzZWxmLm9uKFwibmVlZGxlU2VsZWN0aW9uQ2hhbmdlXCIsIGZ1bmN0aW9uIChlZGF0YSkge1xuICAgICAgICBzZWxmLmNhdGVnQ291bnRzID0gZWRhdGEuY2F0ZWdDb3VudHM7XG4gICAgICAgIHNlbGYuc2VsZWN0ZWROZWVkbGVzID0gZWRhdGEuc2VsZWN0ZWQ7XG4gICAgICAgIHN2Zy5jYWxsKHZlcnRpY2FsTGVnZW5kKTtcbiAgICB9KTtcblxuICAgIHNlbGYub24oXCJuZWVkbGVTZWxlY3Rpb25DaGFuZ2VFbmRcIiwgZnVuY3Rpb24gKGVkYXRhKSB7XG4gICAgICAgIHNlbGYuY2F0ZWdDb3VudHMgPSBlZGF0YS5jYXRlZ0NvdW50cztcbiAgICAgICAgc2VsZi5zZWxlY3RlZE5lZWRsZXMgPSBlZGF0YS5zZWxlY3RlZDtcbiAgICAgICAgc3ZnLmNhbGwodmVydGljYWxMZWdlbmQpO1xuICAgIH0pO1xuXG4gICAgc2VsZi5vbihcIm5lZWRsZVNlbGVjdGlvbkNoYW5nZVwiLCBmdW5jdGlvbihlZGF0YSkge1xuICAgICAgICAgICAgc2VsZWN0aW9uID0gZWRhdGEuY29vcmRzO1xuICAgICAgICAgICAgaWYgKHNlbGVjdGlvblsxXSAtIHNlbGVjdGlvblswXSA+IDApIHtcbiAgICAgICAgICAgICAgICBzZWxmLnNlbGVjdGlvblRpcC5zaG93KHtsZWZ0OiBzZWxlY3Rpb25bMF0sIHJpZ2h0OiBzZWxlY3Rpb25bMV19LCBzZWxlY3Rpb25SZWN0Lm5vZGUoKSk7XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KFwiLmQzLXRpcC1zZWxlY3Rpb25cIilcbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgICAgICAuZGVsYXkoMzAwMClcbiAgICAgICAgICAgICAgICAgICAgLmR1cmF0aW9uKDEwMDApXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcIm9wYWNpdHlcIiwwKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi5zZWxlY3Rpb25UaXAuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuXG5cbn1cblxuTXV0c05lZWRsZVBsb3QucHJvdG90eXBlLmRyYXdMZWdlbmQgPSBmdW5jdGlvbihzdmcpIHtcblxuICAgIC8vIExFR0VORFxuICAgIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gcHJlcGFyZSBsZWdlbmQgY2F0ZWdvcmllcyAoY29ycmVjdCBvcmRlcilcbiAgICBtdXRDYXRlZ29yaWVzID0gW107XG4gICAgY2F0ZWdvcnlDb2xvcnMgPSBbXTtcbiAgICBhbGxjYXRlZ3MgPSBPYmplY3Qua2V5cyhzZWxmLnRvdGFsQ2F0ZWdDb3VudHMpOyAvLyByYW5kb20gb3JkZXJcbiAgICBvcmRlcmVkRGVjbGFyYXRpb24gPSBzZWxmLmNvbG9yU2NhbGUuZG9tYWluKCk7ICAvLyB3YW50ZWQgb3JkZXJcbiAgICBmb3IgKGlkeCBpbiBvcmRlcmVkRGVjbGFyYXRpb24pIHtcbiAgICAgICAgYyA9IG9yZGVyZWREZWNsYXJhdGlvbltpZHhdO1xuICAgICAgICBpZiAoYWxsY2F0ZWdzLmluZGV4T2YoYykgPiAtMSkge1xuICAgICAgICAgICAgbXV0Q2F0ZWdvcmllcy5wdXNoKGMpO1xuICAgICAgICAgICAgY2F0ZWdvcnlDb2xvcnMucHVzaChzZWxmLmNvbG9yU2NhbGUoYykpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgc2NhbGUgd2l0aCBjb3JyZWN0IG9yZGVyIG9mIGNhdGVnb3JpZXNcbiAgICBtdXRzU2NhbGUgPSBzZWxmLmNvbG9yU2NhbGUuZG9tYWluKG11dENhdGVnb3JpZXMpLnJhbmdlKGNhdGVnb3J5Q29sb3JzKTtcblxuXG4gICAgdmFyIGRvbWFpbiA9IHNlbGYueC5kb21haW4oKTtcbiAgICB4cGxhY2VtZW50ID0gKHNlbGYueChkb21haW5bMV0pIC0gc2VsZi54KGRvbWFpblswXSkpICogMC43NSArIHNlbGYueChkb21haW5bMF0pO1xuXG5cbiAgICB2YXIgc3VtID0gMDtcbiAgICBmb3IgKHZhciBjIGluIHNlbGYudG90YWxDYXRlZ0NvdW50cykge1xuICAgICAgICBzdW0gKz0gc2VsZi50b3RhbENhdGVnQ291bnRzW2NdO1xuICAgIH1cblxuICAgIGxlZ2VuZExhYmVsID0gZnVuY3Rpb24oY2F0ZWcpIHtcbiAgICAgICAgdmFyIGNvdW50ID0gKHNlbGYuY2F0ZWdDb3VudHNbY2F0ZWddIHx8IChzZWxmLnNlbGVjdGVkTmVlZGxlcy5sZW5ndGggPT0gMCAmJiBzZWxmLnRvdGFsQ2F0ZWdDb3VudHNbY2F0ZWddKSB8fCAwKTtcbiAgICAgICAgcmV0dXJuICBjYXRlZyArIChjb3VudCA+IDAgPyBcIjogXCIrY291bnQrXCIgKFwiICsgTWF0aC5yb3VuZChjb3VudC9zdW0qMTAwKSArIFwiJSlcIiA6IFwiXCIpO1xuICAgIH07XG5cbiAgICBsZWdlbmRDbGFzcyA9IGZ1bmN0aW9uKGNhdGVnKSB7XG4gICAgICAgIHZhciBjb3VudCA9IChzZWxmLmNhdGVnQ291bnRzW2NhdGVnXSB8fCAoc2VsZi5zZWxlY3RlZE5lZWRsZXMubGVuZ3RoID09IDAgJiYgc2VsZi50b3RhbENhdGVnQ291bnRzW2NhdGVnXSkgfHwgMCk7XG4gICAgICAgIHJldHVybiAoY291bnQgPiAwKSA/IFwiXCIgOiBcIm5vbXV0c1wiO1xuICAgIH07XG5cbiAgICBzZWxmLm5vc2hvdyA9IFtdO1xuICAgIHZhciBuZWVkbGVIZWFkcyA9IGQzLnNlbGVjdEFsbChcIi5uZWVkbGUtaGVhZFwiKTtcbiAgICBzaG93Tm9TaG93ID0gZnVuY3Rpb24oY2F0ZWcpe1xuICAgICAgICBpZiAoXy5jb250YWlucyhzZWxmLm5vc2hvdywgY2F0ZWcpKSB7XG4gICAgICAgICAgICBzZWxmLm5vc2hvdyA9IF8uZmlsdGVyKHNlbGYubm9zaG93LCBmdW5jdGlvbihzKSB7IHJldHVybiBzICE9IGNhdGVnIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5ub3Nob3cucHVzaChjYXRlZyk7XG4gICAgICAgIH1cbiAgICAgICAgbmVlZGxlSGVhZHMuY2xhc3NlZChcIm5vc2hvd1wiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5jb250YWlucyhzZWxmLm5vc2hvdywgZC5jYXRlZ29yeSk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgbGVnZW5kQ2VsbHMgPSBkMy5zZWxlY3RBbGwoXCJnLmxlZ2VuZENlbGxzXCIpO1xuICAgICAgICBsZWdlbmRDZWxscy5jbGFzc2VkKFwibm9zaG93XCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgIHJldHVybiBfLmNvbnRhaW5zKHNlbGYubm9zaG93LCBkLnN0b3BbMF0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG5cbiAgICB2ZXJ0aWNhbExlZ2VuZCA9IGQzLnN2Zy5sZWdlbmQoKVxuICAgICAgICAubGFiZWxGb3JtYXQobGVnZW5kTGFiZWwpXG4gICAgICAgIC5sYWJlbENsYXNzKGxlZ2VuZENsYXNzKVxuICAgICAgICAub25MZWdlbmRDbGljayhzaG93Tm9TaG93KVxuICAgICAgICAuY2VsbFBhZGRpbmcoNClcbiAgICAgICAgLm9yaWVudGF0aW9uKFwidmVydGljYWxcIilcbiAgICAgICAgLnVuaXRzKHN1bSArIFwiIE11dGF0aW9uc1wiKVxuICAgICAgICAuY2VsbFdpZHRoKDIwKVxuICAgICAgICAuY2VsbEhlaWdodCgxMilcbiAgICAgICAgLmlucHV0U2NhbGUobXV0c1NjYWxlKVxuICAgICAgICAuY2VsbFN0ZXBwaW5nKDQpXG4gICAgICAgIC5wbGFjZSh7eDogeHBsYWNlbWVudCwgeTogNTB9KTtcblxuICAgIHN2Zy5jYWxsKHZlcnRpY2FsTGVnZW5kKTtcblxufTtcblxuTXV0c05lZWRsZVBsb3QucHJvdG90eXBlLmRyYXdSZWdpb25zID0gZnVuY3Rpb24oc3ZnLCByZWdpb25EYXRhKSB7XG5cbiAgICB2YXIgbWF4Q29vcmQgPSB0aGlzLm1heENvb3JkO1xuICAgIHZhciBtaW5Db29yZCA9IHRoaXMubWluQ29vcmQ7XG4gICAgdmFyIGJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHZhciBjb2xvcnMgPSB0aGlzLmNvbG9yTWFwO1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB4ID0gdGhpcy54O1xuXG4gICAgdmFyIGJlbG93ID0gdHJ1ZTtcblxuXG4gICAgZ2V0UmVnaW9uU3RhcnQgPSBmdW5jdGlvbihyZWdpb24pIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KHJlZ2lvbi5zcGxpdChcIi1cIilbMF0pXG4gICAgfTtcblxuICAgIGdldFJlZ2lvbkVuZCA9IGZ1bmN0aW9uKHJlZ2lvbikge1xuICAgICAgICByZXR1cm4gcGFyc2VJbnQocmVnaW9uLnNwbGl0KFwiLVwiKVsxXSlcbiAgICB9O1xuXG4gICAgZ2V0Q29sb3IgPSB0aGlzLmNvbG9yU2NhbGU7XG5cbiAgICB2YXIgYmdfb2Zmc2V0ID0gMDtcbiAgICB2YXIgcmVnaW9uX29mZnNldCA9IGJnX29mZnNldC0zXG4gICAgdmFyIHRleHRfb2Zmc2V0ID0gYmdfb2Zmc2V0ICsgMjA7XG4gICAgaWYgKGJlbG93ICE9IHRydWUpIHtcbiAgICAgICAgdGV4dF9vZmZzZXQgPSBiZ19vZmZzZXQrNTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmF3KHJlZ2lvbkxpc3QpIHtcblxuICAgICAgICB2YXIgcmVnaW9uc0JHID0gZDMuc2VsZWN0KFwiLm11dG5lZWRsZXNcIikuc2VsZWN0QWxsKClcbiAgICAgICAgICAgIC5kYXRhKFtcImR1bW15XCJdKS5lbnRlcigpXG4gICAgICAgICAgICAuaW5zZXJ0KFwiZ1wiLCBcIjpmaXJzdC1jaGlsZFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInJlZ2lvbnNCR1wiKVxuICAgICAgICAgICAgLmFwcGVuZChcInJlY3RcIilcbiAgICAgICAgICAgIC5hdHRyKFwieFwiLCB4KG1pbkNvb3JkKSApXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgeSgwKSArIGJnX29mZnNldCApXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHgobWF4Q29vcmQpIC0geChtaW5Db29yZCkgKVxuICAgICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgMTApXG4gICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgXCJsaWdodGdyZXlcIik7XG5cblxuICAgICAgICBkMy5zZWxlY3QoXCIuZXh0ZW50XCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgeSgwKSArIHJlZ2lvbl9vZmZzZXQgLSAxMCk7XG5cblxuICAgICAgICB2YXIgcmVnaW9ucyA9IHJlZ2lvbnNCRyA9IGQzLnNlbGVjdChcIi5tdXRuZWVkbGVzXCIpLnNlbGVjdEFsbCgpXG4gICAgICAgICAgICAuZGF0YShyZWdpb25MaXN0KVxuICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwicmVnaW9uR3JvdXBcIik7XG5cbiAgICAgICAgcmVnaW9ucy5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24gKHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geChyLnN0YXJ0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgeSgwKSArIHJlZ2lvbl9vZmZzZXQgKVxuICAgICAgICAgICAgLmF0dHIoXCJyeVwiLCBcIjNcIilcbiAgICAgICAgICAgIC5hdHRyKFwicnhcIiwgXCIzXCIpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGZ1bmN0aW9uIChyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHgoci5lbmQpIC0geChyLnN0YXJ0KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIDE2KVxuICAgICAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhLmNvbG9yXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQzLnJnYihkYXRhLmNvbG9yKS5kYXJrZXIoKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgcmVnaW9uc1xuICAgICAgICAgICAgLmF0dHIoJ3BvaW50ZXItZXZlbnRzJywgJ2FsbCcpXG4gICAgICAgICAgICAuYXR0cignY3Vyc29yJywgJ3BvaW50ZXInKVxuICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgIGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgICAgIC8vIHNldCBjdXN0b20gc2VsZWN0aW9uIGV4dGVudFxuICAgICAgICAgICAgc2VsZi5zZWxlY3Rvci5leHRlbnQoW3Iuc3RhcnQsIHIuZW5kXSk7XG4gICAgICAgICAgICAvLyBjYWxsIHRoZSBleHRlbnQgdG8gY2hhbmdlIHdpdGggdHJhbnNpdGlvblxuICAgICAgICAgICAgc2VsZi5zZWxlY3RvcihkMy5zZWxlY3QoXCIuYnJ1c2hcIikudHJhbnNpdGlvbigpKTtcbiAgICAgICAgICAgIC8vIGNhbGwgZXh0ZW50IChzZWxlY3Rpb24pIGNoYW5nZSBsaXN0ZW5lcnNcbiAgICAgICAgICAgIHNlbGYuc2VsZWN0b3IuZXZlbnQoZDMuc2VsZWN0KFwiLmJydXNoXCIpLnRyYW5zaXRpb24oKS5kZWxheSgzMDApKTtcblxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQbGFjZSBhbmQgbGFiZWwgbG9jYXRpb25cbiAgICAgICAgdmFyIGxhYmVscyA9IFtdO1xuXG4gICAgICAgIHZhciByZXBlYXRlZFJlZ2lvbiA9IHt9O1xuICAgICAgICB2YXIgZ2V0UmVnaW9uQ2xhc3MgPSBmdW5jdGlvbihyZWdpb24pIHtcbiAgICAgICAgICAgIHZhciBjID0gXCJyZWdpb25OYW1lXCI7XG4gICAgICAgICAgICB2YXIgcmVwZWF0ZWRDbGFzcyA9IFwiUlJfXCIrcmVnaW9uLm5hbWU7XG4gICAgICAgICAgICBpZihfLmhhcyhyZXBlYXRlZFJlZ2lvbiwgcmVnaW9uLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgYyA9IFwicmVwZWF0ZWROYW1lIG5vc2hvdyBcIiArIHJlcGVhdGVkQ2xhc3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXBlYXRlZFJlZ2lvbltyZWdpb24ubmFtZV0gPSByZXBlYXRlZENsYXNzO1xuICAgICAgICAgICAgcmV0dXJuIGM7XG4gICAgICAgIH07XG4gICAgICAgIHJlZ2lvbnMuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBnZXRSZWdpb25DbGFzcylcbiAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCBcImJsYWNrXCIpXG4gICAgICAgICAgICAuYXR0cihcIm9wYWNpdHlcIiwgMC41KVxuICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uIChyKSB7XG4gICAgICAgICAgICAgICAgci54ID0geChyLnN0YXJ0KSArICh4KHIuZW5kKSAtIHgoci5zdGFydCkpIC8gMjtcbiAgICAgICAgICAgICAgICByZXR1cm4gci54O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihyKSB7ci55ID0geSgwKSArIHRleHRfb2Zmc2V0OyByZXR1cm4gci55OyB9IClcbiAgICAgICAgICAgIC5hdHRyKFwiZHlcIiwgXCIwLjM1ZW1cIilcbiAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLCBcIjEycHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtZGVjb3JhdGlvblwiLCBcImJvbGRcIilcbiAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEubmFtZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHJlZ2lvbk5hbWVzID0gZDMuc2VsZWN0QWxsKFwiLnJlZ2lvbk5hbWVcIik7XG4gICAgICAgIHJlZ2lvbk5hbWVzLmVhY2goZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgdmFyIGludGVyYWN0aW9uTGVuZ3RoID0gdGhpcy5nZXRCQm94KCkud2lkdGggLyAyO1xuICAgICAgICAgICAgbGFiZWxzLnB1c2goe3g6IGQueCwgeTogZC55LCBsYWJlbDogZC5uYW1lLCB3ZWlnaHQ6IGQubmFtZS5sZW5ndGgsIHJhZGl1czogaW50ZXJhY3Rpb25MZW5ndGh9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGZvcmNlID0gZDMubGF5b3V0LmZvcmNlKClcbiAgICAgICAgICAgIC5jaGFyZ2VEaXN0YW5jZSg1KVxuICAgICAgICAgICAgLm5vZGVzKGxhYmVscylcbiAgICAgICAgICAgIC5jaGFyZ2UoLTEwKVxuICAgICAgICAgICAgLmdyYXZpdHkoMCk7XG5cbiAgICAgICAgdmFyIG1pblggPSB4KG1pbkNvb3JkKTtcbiAgICAgICAgdmFyIG1heFggPSB4KG1heENvb3JkKTtcbiAgICAgICAgdmFyIHdpdGhpbkJvdW5kcyA9IGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBkMy5taW4oW1xuICAgICAgICAgICAgICAgIGQzLm1heChbXG4gICAgICAgICAgICAgICAgICAgIG1pblgsXG4gICAgICAgICAgICAgICAgICAgIHhdKSxcbiAgICAgICAgICAgICAgICBtYXhYXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfTtcbiAgICAgICAgZnVuY3Rpb24gY29sbGlkZShub2RlKSB7XG4gICAgICAgICAgICB2YXIgciA9IG5vZGUucmFkaXVzICsgMyxcbiAgICAgICAgICAgICAgICBueDEgPSBub2RlLnggLSByLFxuICAgICAgICAgICAgICAgIG54MiA9IG5vZGUueCArIHIsXG4gICAgICAgICAgICAgICAgbnkxID0gbm9kZS55IC0gcixcbiAgICAgICAgICAgICAgICBueTIgPSBub2RlLnkgKyByO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHF1YWQsIHgxLCB5MSwgeDIsIHkyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHF1YWQucG9pbnQgJiYgKHF1YWQucG9pbnQgIT09IG5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsID0gbm9kZS54IC0gcXVhZC5wb2ludC54LFxuICAgICAgICAgICAgICAgICAgICAgICAgeCA9IGw7XG4gICAgICAgICAgICAgICAgICAgIHIgPSBub2RlLnJhZGl1cyArIHF1YWQucG9pbnQucmFkaXVzO1xuICAgICAgICAgICAgICAgICAgICBpZiAoTWF0aC5hYnMobCkgPCByKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsID0gKGwgLSByKSAvIGwgKiAuMDA1O1xuICAgICAgICAgICAgICAgICAgICAgICAgeCAqPSBsO1xuICAgICAgICAgICAgICAgICAgICAgICAgeCA9ICAobm9kZS54ID4gcXVhZC5wb2ludC54ICYmIHggPCAwKSA/IC14IDogeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUueCArPSB4O1xuICAgICAgICAgICAgICAgICAgICAgICAgcXVhZC5wb2ludC54IC09IHg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHgxID4gbngyXG4gICAgICAgICAgICAgICAgICAgIHx8IHgyIDwgbngxXG4gICAgICAgICAgICAgICAgICAgIHx8IHkxID4gbnkyXG4gICAgICAgICAgICAgICAgICAgIHx8IHkyIDwgbnkxO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbW92ZVJlcGVhdGVkTGFiZWxzID0gZnVuY3Rpb24obGFiZWwsIHgpIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gcmVwZWF0ZWRSZWdpb25bbGFiZWxdO1xuICAgICAgICAgICAgc3ZnLnNlbGVjdEFsbChcInRleHQuXCIrbmFtZSlcbiAgICAgICAgICAgICAgICAuYXR0cihcInhcIiwgbmV3eCk7XG4gICAgICAgIH07XG4gICAgICAgIGZvcmNlLm9uKFwidGlja1wiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICB2YXIgcSA9IGQzLmdlb20ucXVhZHRyZWUobGFiZWxzKSxcbiAgICAgICAgICAgICAgICBpID0gMCxcbiAgICAgICAgICAgICAgICBuID0gbGFiZWxzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgICAgICAgICAgcS52aXNpdChjb2xsaWRlKGxhYmVsc1tpXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBwb3NpdGlvbiBvZiB0aGUgdGV4dCBlbGVtZW50XG4gICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICBzdmcuc2VsZWN0QWxsKFwidGV4dC5yZWdpb25OYW1lXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3eCA9IGxhYmVsc1tpKytdLng7XG4gICAgICAgICAgICAgICAgICAgIG1vdmVSZXBlYXRlZExhYmVscyhkLm5hbWUsIG5ld3gpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3eDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICAgICAgZm9yY2Uuc3RhcnQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmb3JtYXRSZWdpb25zKHJlZ2lvbnMpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gT2JqZWN0LmtleXMocmVnaW9ucykpIHtcblxuICAgICAgICAgICAgcmVnaW9uc1trZXldLnN0YXJ0ID0gZ2V0UmVnaW9uU3RhcnQocmVnaW9uc1trZXldLmNvb3JkKTtcbiAgICAgICAgICAgIHJlZ2lvbnNba2V5XS5lbmQgPSBnZXRSZWdpb25FbmQocmVnaW9uc1trZXldLmNvb3JkKTtcbiAgICAgICAgICAgIGlmIChyZWdpb25zW2tleV0uc3RhcnQgPT0gcmVnaW9uc1trZXldLmVuZCkge1xuICAgICAgICAgICAgICAgIHJlZ2lvbnNba2V5XS5zdGFydCAtPSAwLjQ7XG4gICAgICAgICAgICAgICAgcmVnaW9uc1trZXldLmVuZCArPSAwLjQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWdpb25zW2tleV0uY29sb3IgPSBnZXRDb2xvcihyZWdpb25zW2tleV0ubmFtZSk7XG4gICAgICAgICAgICAvKnJlZ2lvbkxpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgJ25hbWUnOiBrZXksXG4gICAgICAgICAgICAgICAgJ3N0YXJ0JzogZ2V0UmVnaW9uU3RhcnQocmVnaW9uc1trZXldKSxcbiAgICAgICAgICAgICAgICAnZW5kJzogZ2V0UmVnaW9uRW5kKHJlZ2lvbnNba2V5XSksXG4gICAgICAgICAgICAgICAgJ2NvbG9yJzogZ2V0Q29sb3Ioa2V5KVxuICAgICAgICAgICAgfSk7Ki9cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVnaW9ucztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHJlZ2lvbkRhdGEgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAvLyBhc3N1bWUgZGF0YSBpcyBpbiBhIGZpbGVcbiAgICAgICAgZDMuanNvbihyZWdpb25EYXRhLCBmdW5jdGlvbihlcnJvciwgcmVnaW9ucykge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7cmV0dXJuIGNvbnNvbGUuZGVidWcoZXJyb3IpfVxuICAgICAgICAgICAgcmVnaW9uTGlzdCA9IGZvcm1hdFJlZ2lvbnMocmVnaW9ucyk7XG4gICAgICAgICAgICBkcmF3KHJlZ2lvbkxpc3QpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZWdpb25MaXN0ID0gZm9ybWF0UmVnaW9ucyhyZWdpb25EYXRhKTtcbiAgICAgICAgZHJhdyhyZWdpb25MaXN0KTtcbiAgICB9XG5cbn07XG5cblxuTXV0c05lZWRsZVBsb3QucHJvdG90eXBlLmRyYXdBeGVzID0gZnVuY3Rpb24oc3ZnKSB7XG5cbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeCA9IHRoaXMueDtcblxuICAgIHhBeGlzID0gZDMuc3ZnLmF4aXMoKS5zY2FsZSh4KS5vcmllbnQoXCJib3R0b21cIik7XG5cbiAgICBzdmcuYXBwZW5kKFwic3ZnOmdcIilcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ4LWF4aXMgYXhpc1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCxcIiArICh0aGlzLmhlaWdodCAtIHRoaXMuYnVmZmVyKSArIFwiKVwiKVxuICAgICAgLmNhbGwoeEF4aXMpO1xuXG4gICAgeUF4aXMgPSBkMy5zdmcuYXhpcygpLnNjYWxlKHkpLm9yaWVudChcImxlZnRcIik7XG5cblxuICAgIHN2Zy5hcHBlbmQoXCJzdmc6Z1wiKVxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInktYXhpcyBheGlzXCIpXG4gICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArICh0aGlzLmJ1ZmZlciAqIDEuMiArIC0gMTApICArIFwiLDApXCIpXG4gICAgICAuY2FsbCh5QXhpcyk7XG5cbiAgICAvLyBhcHBlYXJhbmNlIGZvciB4IGFuZCB5IGxlZ2VuZFxuICAgIGQzLnNlbGVjdEFsbChcIi5heGlzIHBhdGhcIilcbiAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnbm9uZScpO1xuICAgIGQzLnNlbGVjdEFsbChcIi5kb21haW5cIilcbiAgICAgICAgLmF0dHIoJ3N0cm9rZScsICdibGFjaycpXG4gICAgICAgIC5hdHRyKCdzdHJva2Utd2lkdGgnLCAxKTtcblxuICAgIHN2Zy5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ5LWxhYmVsXCIpXG4gICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAodGhpcy5idWZmZXIgLyAzKSArIFwiLFwiICsgKHRoaXMuaGVpZ2h0IC8gMikgKyBcIiksIHJvdGF0ZSgtOTApXCIpXG4gICAgICAgIC50ZXh0KHRoaXMubGVnZW5kcy55KVxuICAgICAgICAuYXR0cignZm9udC13ZWlnaHQnLCAnYm9sZCcpXG4gICAgICAgIC5hdHRyKCdmb250LXNpemUnLCAxMik7XG5cbiAgICBzdmcuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ4LWxhYmVsXCIpXG4gICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKHRoaXMud2lkdGggLyAyKSArIFwiLFwiICsgKHRoaXMuaGVpZ2h0IC0gdGhpcy5idWZmZXIgLyAzKSArIFwiKVwiKVxuICAgICAgICAgIC50ZXh0KHRoaXMubGVnZW5kcy54KVxuICAgICAgICAuYXR0cignZm9udC13ZWlnaHQnLCAnYm9sZCcpXG4gICAgICAgIC5hdHRyKCdmb250LXNpemUnLCAxMik7XG4gICAgXG59O1xuXG5cblxuTXV0c05lZWRsZVBsb3QucHJvdG90eXBlLmRyYXdOZWVkbGVzID0gZnVuY3Rpb24oc3ZnLCBtdXRhdGlvbkRhdGEsIHJlZ2lvbkRhdGEpIHtcblxuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGdldFlBeGlzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB5O1xuICAgIH07XG5cbiAgICBmb3JtYXRDb29yZCA9IGZ1bmN0aW9uKGNvb3JkKSB7XG4gICAgICAgaWYgKGNvb3JkLmluZGV4T2YoXCItXCIpID4gLTEpIHtcbiAgICAgICAgICAgY29vcmRzID0gY29vcmQuc3BsaXQoXCItXCIpO1xuXG4gICAgICAgICAgIC8vIHBsYWNlIG5lZWRlIGF0IG1pZGRsZSBvZiBhZmZlY3RlZCByZWdpb25cbiAgICAgICAgICAgY29vcmQgPSBNYXRoLmZsb29yKChwYXJzZUludChjb29yZHNbMF0pICsgcGFyc2VJbnQoY29vcmRzWzFdKSkgLyAyKTtcblxuICAgICAgICAgICAvLyBjaGVjayBmb3Igc3BsaWNlIHNpdGVzOiBcIj8tOVwiIG9yIFwiOS0/XCJcbiAgICAgICAgICAgaWYgKGlzTmFOKGNvb3JkKSkge1xuICAgICAgICAgICAgICAgaWYgKGNvb3Jkc1swXSA9PSBcIj9cIikgeyBjb29yZCA9IHBhcnNlSW50KGNvb3Jkc1sxXSkgfVxuICAgICAgICAgICAgICAgZWxzZSBpZiAoY29vcmRzIFsxXSA9PSBcIj9cIikgeyBjb29yZCA9IHBhcnNlSW50KGNvb3Jkc1swXSkgfVxuICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb29yZCA9IHBhcnNlSW50KGNvb3JkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29vcmQ7XG4gICAgfTtcblxuICAgIHRpcCA9IHRoaXMudGlwO1xuXG4gICAgLy8gc3RhY2sgbmVlZGxlcyBhdCBzYW1lIHBvc1xuICAgIG5lZWRsZVBvaW50ID0ge307XG4gICAgaGlnaGVzdCA9IDA7XG5cbiAgICBzdGFja05lZWRsZSA9IGZ1bmN0aW9uKHBvcyx2YWx1ZSxwb2ludERpY3QpIHtcbiAgICAgIHN0aWNrSGVpZ2h0ID0gMDtcbiAgICAgIHBvcyA9IFwicFwiK1N0cmluZyhwb3MpO1xuICAgICAgaWYgKHBvcyBpbiBwb2ludERpY3QpIHtcbiAgICAgICAgIHN0aWNrSGVpZ2h0ID0gcG9pbnREaWN0W3Bvc107XG4gICAgICAgICBuZXdIZWlnaHQgPSBzdGlja0hlaWdodCArIHZhbHVlO1xuICAgICAgICAgcG9pbnREaWN0W3Bvc10gPSBuZXdIZWlnaHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgcG9pbnREaWN0W3Bvc10gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdGlja0hlaWdodDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZm9ybWF0TXV0YXRpb25FbnRyeShkKSB7XG5cbiAgICAgICAgY29vcmRTdHJpbmcgPSBkLmNvb3JkO1xuICAgICAgICBudW1lcmljQ29vcmQgPSBmb3JtYXRDb29yZChkLmNvb3JkKTtcbiAgICAgICAgbnVtZXJpY1ZhbHVlID0gTnVtYmVyKGQudmFsdWUpO1xuICAgICAgICBzdGlja0hlaWdodCA9IHN0YWNrTmVlZGxlKG51bWVyaWNDb29yZCwgbnVtZXJpY1ZhbHVlLCBuZWVkbGVQb2ludCk7XG4gICAgICAgIGNhdGVnb3J5ID0gZC5jYXRlZ29yeSB8fCBcIm90aGVyXCI7XG5cbiAgICAgICAgaWYgKHN0aWNrSGVpZ2h0ICsgbnVtZXJpY1ZhbHVlID4gaGlnaGVzdCkge1xuICAgICAgICAgICAgLy8gc2V0IFktQXhpcyBhbHdheXMgdG8gaGlnaGVzdCBhdmFpbGFibGVcbiAgICAgICAgICAgIGhpZ2hlc3QgPSBzdGlja0hlaWdodCArIG51bWVyaWNWYWx1ZTtcbiAgICAgICAgICAgIGdldFlBeGlzKCkuZG9tYWluKFswLCBoaWdoZXN0ICsgMl0pO1xuICAgICAgICB9XG5cblxuICAgICAgICBpZiAobnVtZXJpY0Nvb3JkID4gMCkge1xuXG4gICAgICAgICAgICAvLyByZWNvcmQgYW5kIGNvdW50IGNhdGVnb3JpZXNcbiAgICAgICAgICAgIHNlbGYudG90YWxDYXRlZ0NvdW50c1tjYXRlZ29yeV0gPSAoc2VsZi50b3RhbENhdGVnQ291bnRzW2NhdGVnb3J5XSB8fCAwKSArIG51bWVyaWNWYWx1ZTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgY29vcmRTdHJpbmc6IGNvb3JkU3RyaW5nLFxuICAgICAgICAgICAgICAgIGNvb3JkOiBudW1lcmljQ29vcmQsXG4gICAgICAgICAgICAgICAgdmFsdWU6IG51bWVyaWNWYWx1ZSxcbiAgICAgICAgICAgICAgICBzdGlja0hlaWdodDogc3RpY2tIZWlnaHQsXG4gICAgICAgICAgICAgICAgY29sb3I6IHNlbGYuY29sb3JTY2FsZShjYXRlZ29yeSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoXCJkaXNjYXJkaW5nIFwiICsgZC5jb29yZCArIFwiIFwiICsgZC5jYXRlZ29yeSArIFwiKFwiKyBudW1lcmljQ29vcmQgK1wiKVwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBtdXRzID0gW107XG5cblxuICAgIGlmICh0eXBlb2YgbXV0YXRpb25EYXRhID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgZDMuanNvbihtdXRhdGlvbkRhdGEsIGZ1bmN0aW9uKGVycm9yLCB1bmZvcm1hdHRlZE11dHMpIHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbXV0cyA9IHByZXBhcmVNdXRzKHVuZm9ybWF0dGVkTXV0cyk7XG4gICAgICAgICAgICBwYWludE11dHMobXV0cyk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG11dHMgPSBwcmVwYXJlTXV0cyhtdXRhdGlvbkRhdGEpO1xuICAgICAgICBwYWludE11dHMobXV0cyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcHJlcGFyZU11dHModW5mb3JtYXR0ZWRNdXRzKSB7XG4gICAgICAgIGZvciAoa2V5IGluIHVuZm9ybWF0dGVkTXV0cykge1xuICAgICAgICAgICAgZm9ybWF0dGVkID0gZm9ybWF0TXV0YXRpb25FbnRyeSh1bmZvcm1hdHRlZE11dHNba2V5XSk7XG4gICAgICAgICAgICBpZiAoZm9ybWF0dGVkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIG11dHMucHVzaChmb3JtYXR0ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtdXRzO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gcGFpbnRNdXRzKG11dHMpIHtcblxuICAgICAgICBtaW5TaXplID0gNDtcbiAgICAgICAgbWF4U2l6ZSA9IDEwO1xuICAgICAgICBoZWFkU2l6ZVNjYWxlID0gZDMuc2NhbGUubG9nKCkucmFuZ2UoW21pblNpemUsbWF4U2l6ZV0pLmRvbWFpbihbMSwgaGlnaGVzdC8yXSk7XG4gICAgICAgIHZhciBoZWFkU2l6ZSA9IGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgICAgIHJldHVybiBkMy5taW4oW2QzLm1heChbaGVhZFNpemVTY2FsZShuKSxtaW5TaXplXSksIG1heFNpemVdKTtcbiAgICAgICAgfTtcblxuXG4gICAgICAgIHZhciBuZWVkbGVzID0gZDMuc2VsZWN0KFwiLm11dG5lZWRsZXNcIikuc2VsZWN0QWxsKClcbiAgICAgICAgICAgIC5kYXRhKG11dHMpLmVudGVyKClcbiAgICAgICAgICAgIC5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAgICAgICAuYXR0cihcInkxXCIsIGZ1bmN0aW9uKGRhdGEpIHsgcmV0dXJuIHkoZGF0YS5zdGlja0hlaWdodCArIGRhdGEudmFsdWUpICsgaGVhZFNpemUoZGF0YS52YWx1ZSkgOyB9IClcbiAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4geShkYXRhLnN0aWNrSGVpZ2h0KSB9KVxuICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbihkYXRhKSB7IHJldHVybiB4KGRhdGEuY29vcmQpIH0pXG4gICAgICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uKGRhdGEpIHsgcmV0dXJuIHgoZGF0YS5jb29yZCkgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJuZWVkbGUtbGluZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2VcIiwgXCJibGFja1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwgMSk7XG5cbiAgICAgICAgdmFyIG5lZWRsZUhlYWRzID0gZDMuc2VsZWN0KFwiLm11dG5lZWRsZXNcIikuc2VsZWN0QWxsKClcbiAgICAgICAgICAgIC5kYXRhKG11dHMpXG4gICAgICAgICAgICAuZW50ZXIoKS5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY3lcIiwgZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4geShkYXRhLnN0aWNrSGVpZ2h0K2RhdGEudmFsdWUpIH0gKVxuICAgICAgICAgICAgLmF0dHIoXCJjeFwiLCBmdW5jdGlvbihkYXRhKSB7IHJldHVybiB4KGRhdGEuY29vcmQpIH0gKVxuICAgICAgICAgICAgLmF0dHIoXCJyXCIsIGZ1bmN0aW9uKGRhdGEpIHsgcmV0dXJuIGhlYWRTaXplKGRhdGEudmFsdWUpIH0pXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibmVlZGxlLWhlYWRcIilcbiAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oZGF0YSkgeyByZXR1cm4gZGF0YS5jb2xvciB9KVxuICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIGZ1bmN0aW9uKGRhdGEpIHtyZXR1cm4gZDMucmdiKGRhdGEuY29sb3IpLmRhcmtlcigpfSlcbiAgICAgICAgICAgIC5vbignbW91c2VvdmVyJywgIGZ1bmN0aW9uKGQpeyBkMy5zZWxlY3QodGhpcykubW92ZVRvRnJvbnQoKTsgdGlwLnNob3coZCk7IH0pXG4gICAgICAgICAgICAub24oJ21vdXNlb3V0JywgdGlwLmhpZGUpO1xuXG4gICAgICAgIGQzLnNlbGVjdGlvbi5wcm90b3R5cGUubW92ZVRvRnJvbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQodGhpcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBhZGp1c3QgeS1zY2FsZSBhY2NvcmRpbmcgdG8gaGlnaGVzdCB2YWx1ZSBhbiBkcmF3IHRoZSByZXN0XG4gICAgICAgIGlmIChyZWdpb25EYXRhICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc2VsZi5kcmF3UmVnaW9ucyhzdmcsIHJlZ2lvbkRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIHNlbGYuZHJhd0xlZ2VuZChzdmcpO1xuICAgICAgICBzZWxmLmRyYXdBeGVzKHN2Zyk7XG5cbiAgICAgICAgLyogQnJpbmcgbmVlZGxlIGhlYWRzIGluIGZyb250IG9mIHJlZ2lvbnMgKi9cbiAgICAgICAgbmVlZGxlSGVhZHMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMucGFyZW50Tm9kZS5hcHBlbmRDaGlsZCh0aGlzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG59O1xuXG5cblxudmFyIEV2ZW50cyA9IHJlcXVpcmUoJ2Jpb2pzLWV2ZW50cycpO1xuRXZlbnRzLm1peGluKE11dHNOZWVkbGVQbG90LnByb3RvdHlwZSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTXV0c05lZWRsZVBsb3Q7XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vc3JjL2pzL011dHNOZWVkbGVQbG90LmpzXCIpO1xuIl19
