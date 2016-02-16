// this is the boiler to visualize the d3 graph
coaxsApp.service('d3Service', function () {


  // all you need to know is that you feed in the data array of length 120 to this function and it'll render
  this.drawGraph = function (cutoff, data, compare) {  
       var WIDTH   = 300,
      HEIGHT  = 200,
      MARGINS = {
        top    : 20,
        right  : 20,
        bottom : 20,
        left   : 50
      },
	vis   = d3.select("#compPlot"),

      combined = compare ? data.concat(compare) : data,

      xRange = d3.scale.linear().range([MARGINS.left, WIDTH - MARGINS.right]).domain([0, 120]
      ),

      yRange = d3.scale.linear().range([HEIGHT - MARGINS.top, MARGINS.bottom]).domain([0,
        d3.max(combined, function (d) {
          return d.y;
        })
      ]),
	  
      xAxis = d3.svg.axis()
        .scale(xRange)
		.ticks(6)
        .tickSize(5)
        .tickSubdivide(true),

      yAxis = d3.svg.axis()
        .scale(yRange)
		.ticks(6)
        .tickSize(5)
        .tickFormat(function (d) {
          var prefix = d3.formatPrefix(d);
          return prefix.scale(d) + prefix.symbol;
        })
        .orient("left")
        .tickSubdivide(true); 

    vis.selectAll("*").remove();

		
   vis.append("svg:g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
      .call(xAxis)
        .append("text")
        .attr("y", -10)
        .attr("x", 175)
        .attr("dy", ".71em")
        .style("text-anchor", "middle")
        .text("Minutes Traveled");

    vis.append("svg:g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + (MARGINS.left) + ",0)")
      .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 5)
        .attr("x", -100)
        .attr("dy", ".71em")
        .style("text-anchor", "middle")
        .text("Number Accessible");


    var lineFunc = d3.svg.line()
    .x(function (d) {
      return xRange(d.x);
    })
    .y(function (d) {
      return yRange(d.y);
    })
    .interpolate('basis');

  vis.append("svg:path")
    .attr("d", lineFunc(data))
    .attr("class", "line")
    .style("stroke-width", "1");
	
	
	if (compare) { 
    vis.append("svg:path")
      .attr("d", lineFunc(compare))
      .attr("class", "lineC")
      .style("stroke-dasharray", ("3, 3"))
      .style("stroke-width", "1");
	  
	vis.append("svg:g")
		.attr("class", "title")
		.attr("transform", "translate(0,0)")
		.append("text")
		.attr("y", 40)
        .attr("x", 175)
		.style("text-anchor","middle")
        .style("opacity", 0.85)
		.html( function (){
		  return d3.format(",")(d3.round(data[cutoff*5-1].y-compare[cutoff*5].y,-2)) + " more w/in " + 5*cutoff + " min.";
		});  
  }
  else{
	vis.append("svg:g")
		.attr("class", "title")
		.attr("transform", "translate(0,0)")
		.append("text")
		.attr("y", 40)
        .attr("x", 175)
		.style("text-anchor","middle")
		.style("opacity", 0.85)
        .html( function (){
		  return d3.format(",")(d3.round(data[cutoff*5-1].y,-3))  + " within " + 5*cutoff + " min.";
		});  

	}
	
vis.append("svg:line")
	.attr("id", "sliderLine")
	.attr("class", "line")
	.attr("x1", MARGINS.left+cutoff*5*(WIDTH-MARGINS.left-MARGINS.right)/120)
	//.attr("y1", MARGINS.top+10)
	.attr("y1", yRange(data[cutoff*5-1].y))
	.attr("x2", MARGINS.left+cutoff*5*(WIDTH-MARGINS.left-MARGINS.right)/120)
	.attr("y2", HEIGHT-MARGINS.bottom)
	.style("stroke", "rgb(255,255,255)")
	.style("opacity", 0.85);


    }

});






