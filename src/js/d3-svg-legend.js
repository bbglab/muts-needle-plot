d3.svg.legend = function() {

    var legendValues=[{color: "red", stop: [0,1]},{color: "blue", stop: [1,2]},{color: "purple", stop: [2,3]},{color: "yellow", stop: [3,4]},{color: "Aquamarine", stop: [4,5]}];
    var legendScale;
    var cellWidth = 30;
    var cellHeight = 20;
    var adjustable = false;
    var labelFormat = d3.format(".01f");
    var coordinates = {x:0, y:0};
    var labelUnits = "units";
    var lastValue = 6;
    var changeValue = 1;
    var orientation = "horizontal";
    var cellPadding = 0;


    var initDone = false;
    var target;

    function legend(svg) {

        updateMutLegend = function(){

            dim = d3.select(".mutLegendGroup").node().getBBox();

            var margin = 10;
            dim = target.node().getBBox();
            dim.height += margin * 2;
            dim.width += margin * 2;
            dim.y -= margin;
            dim.x -= margin;

            d3.select(".mutLegendBG")
                .attr(dim)
        };

        function init() {
            var mutLegendGroup = svg.append("g")
                .attr("class", "mutLegendGroup")
                .data([ coordinates ])
                .attr("transform", "translate(" + coordinates.x + "," + coordinates.y + ")");
            var g = mutLegendGroup
                .insert("g")
                .attr("class", "mutLegendGroupText");


            // set legend background
            var mutLegendBG = mutLegendGroup
                .insert("rect", ":first-child")
                .attr("class", "mutLegendBG")
                .attr("fill", "white")
                .attr("stroke", "black")
                .attr("stroke-width", "1px");


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
            // target
            return g;
        };


        function cellRange(valuePosition, changeVal) {
            legendValues[valuePosition].stop[0] += changeVal;
            legendValues[valuePosition - 1].stop[1] += changeVal;
            redraw();
        }

        function redraw() {


            target.selectAll("g.legendCells").data(legendValues).exit().remove();
            target.selectAll("g.legendCells").select("rect").style("fill", function(d) {return d.color});
            if (orientation == "vertical") {
                target.selectAll("g.legendCells").select("text.breakLabels").style("display", "block").style("text-anchor", "start").attr("x", cellWidth + cellPadding).attr("y", 5 + (cellHeight / 2)).text(function(d) {return labelFormat(d.stop[0]) + (d.stop[1].length > 0 ? " - " + labelFormat(d.stop[1]) : "")})
                target.selectAll("g.legendCells").attr("transform", function(d,i) {return "translate(0," + (i * (cellHeight + cellPadding)) + ")" });
            }
            else {
                target.selectAll("g.legendCells").attr("transform", function(d,i) {return "translate(" + (i * cellWidth) + ",0)" });
                target.selectAll("text.breakLabels").style("text-anchor", "middle").attr("x", 0).attr("y", -7).style("display", function(d,i) {return i == 0 ? "none" : "block"}).text(function(d) {return labelFormat(d.stop[0])});
            }
        }

        // init
        if (!initDone) {
            target = init();
            initDone = true;
        }


        // remove previously painted rect and text
        target.selectAll("g.legendCells").select("text.breakLabels").remove();
        target.selectAll("g.legendCells").select("rect").remove();
        target.selectAll("g.legendCells")
            .data(legendValues)
            .enter()
            .append("g")
            .attr("class", "legendCells")
            .attr("transform", function(d,i) {return "translate(" + (i * (cellWidth + cellPadding)) + ",0)" })

        target.selectAll("g.legendCells")
            .append("rect")
            .attr("class", "breakRect")
            .attr("height", cellHeight)
            .attr("width", cellWidth)
            .style("fill", function(d) {return d.color})
            .style("stroke", function(d) {return d3.rgb(d.color).darker();});

        target.selectAll("g.legendCells")
            .append("text")
            .attr("class", "breakLabels")
            .style("pointer-events", "none");

        target.append("text")
            .text(labelUnits)
            .attr("y", -7)
            .attr("class", "legendTitle");

        redraw();
        updateMutLegend(this);
    }

    legend.inputScale = function(newScale) {
        if (!arguments.length) return scale;
        scale = newScale;
        legendValues = [];
        if (scale.invertExtent) {
            //Is a quantile scale
            scale.range().forEach(function(el) {
                var cellObject = {color: el, stop: scale.invertExtent(el)}
                legendValues.push(cellObject)
            })
        }
        else {
            scale.domain().forEach(function (el) {
                var cellObject = {color: scale(el), stop: [el,""]}
                legendValues.push(cellObject)
            })
        }
        return this;
    }

    legend.scale = function(testValue) {
        var foundColor = legendValues[legendValues.length - 1].color;
        for (el in legendValues) {
            if(testValue < legendValues[el].stop[1]) {
                foundColor = legendValues[el].color;
                break;
            }
        }
        return foundColor;
    }

    legend.cellWidth = function(newCellSize) {
        if (!arguments.length) return cellWidth;
        cellWidth = newCellSize;
        return this;
    }

    legend.cellHeight = function(newCellSize) {
        if (!arguments.length) return cellHeight;
        cellHeight = newCellSize;
        return this;
    }

    legend.cellPadding = function(newCellPadding) {
        if (!arguments.length) return cellPadding;
        cellPadding = newCellPadding;
        return this;
    }

    legend.cellExtent = function(incColor,newExtent) {
        var selectedStop = legendValues.filter(function(el) {return el.color == incColor})[0].stop;
        if (arguments.length == 1) return selectedStop;
        legendValues.filter(function(el) {return el.color == incColor})[0].stop = newExtent;
        return this;
    }

    legend.cellStepping = function(incStep) {
        if (!arguments.length) return changeValue;
        changeValue = incStep;
        return this;
    }

    legend.units = function(incUnits) {
        if (!arguments.length) return labelUnits;
        labelUnits = incUnits;
        return this;
    }

    legend.orientation = function(incOrient) {
        if (!arguments.length) return orientation;
        orientation = incOrient;
        return this;
    }

    legend.labelFormat = function(incFormat) {
        if (!arguments.length) return labelFormat;
        labelFormat = incFormat;
        if (incFormat == "none") {
            labelFormat = function(inc) {return inc};
        }
        return this;
    }

    legend.place = function(incCoordinates) {
        if (!arguments.length) return incCoordinates;
        coordinates = incCoordinates;
        return this;
    }

    return legend;

}