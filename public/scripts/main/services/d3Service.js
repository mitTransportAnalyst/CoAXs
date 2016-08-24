// this is the boiler to visualize the d3 graph
coaxsApp.service('d3Service', function () {
//Styling info.  TODO: Move to schema
var attributes = [{ code: 'park',  verbose: 'Parking', color:"#DD9955"},	{code:'lightRail', verbose:'Green Line', color:'#258825'}, { code: 'bus',  verbose: 'Bus',  color:"#505099"},	{ code: 'heavyRail',  verbose: 'Subway',  color: "#9922DD"},
{code: 'const1', verbose: 'Manufact. & Constr. | $', color: '#CE7E50'},	{code: 'const2', verbose: 'Manufact. & Constr. | $$', color: '#BA6A3C'},	{code: 'const3', verbose: 'Manufact. & Constr. | $$$', color: '#A65628'},
{code: 'trade1', verbose: 'Retail & Wholesale | $', color: '#FF4244'},	{code: 'trade2', verbose: 'Retail & Wholesale | $$', color: '#F82E30'},	{code: 'trade3', verbose: 'Retail & Wholesale | $$$', color: '#E41A1C'},
{code: 'trans1', verbose: 'Utilities & Transport | $', color: '#FFFF61'},	{code: 'trans2', verbose: 'Utilities & Transport | $$', color: '#FFFF47'},	{code: 'trans3', verbose: 'Utilities & Transport | $$$', color: '#FFFF33'},
{code: 'infor1', verbose: 'Information Services | $', color: '#6EFFFB'},	{code: 'infor2', verbose: 'Information Services | $$', color: '#5AF3E7'},	{code: 'infor3', verbose: 'Information Services | $$$', color: '#46DFD3'},
{code: 'finan1', verbose: 'Finance | $', color: '#28D236'},	{code: 'finan2', verbose: 'Finance | $$', color: '#14BE22'},	{code: 'finan3', verbose: 'Finance | $$$', color: '#00AA0E'},
{code: 'profe1', verbose: 'Professional Services | $', color: '#CEF6FF'},	{code: 'profe2', verbose: 'Professional Services | $$', color: '#BAE2F7'},	{code: 'profe3', verbose: 'Professional Services | $$$', color: '#A6CEE3'},
{code: 'educa1', verbose: 'Education | $', color: '#9265C2'},	{code: 'educa2', verbose: 'Education | $$', color: '#7E51AE'},	{code: 'educa3', verbose: 'Education | $$$', color: '#6A3D9A'},
{code: 'healt1', verbose: 'Health Care | $', color: '#5097D2'},	{code: 'healt2', verbose: 'Health Care | $$', color: '#3C83BE'},	{code: 'healt3', verbose: 'Health Care | $$$', color: '#286FAA'},
{code: 'hospi1', verbose: 'Hospitality | $', color: '#FFC2C1'},	{code: 'hospi2', verbose: 'Hospitality | $$', color: '#FFAEAD'},	{code: 'hospi3', verbose: 'Hospitality | $$$', color: '#FB9A99'},
{code: 'publi1', verbose: 'Public Administration | $', color: '#FFA728'},	{code: 'publi2', verbose: 'Public Administration | $$', color: '#FF9314'},	{code: 'publi3', verbose: 'Public Administration | $$$', color: '#FF7F00'}];

//Map attributes so they can be get/set by code.
attributes = d3.map(attributes, function(d){return d.code;});

//Defaults
var	selCode = 'profe1',
	xScale = null;

var updateSubsetTotal = function(){
	d3.selectAll("#subTotal")
	.html(function(d){
		subsetTotal = 0;
		d.forEach(function (e) {
			if (e[0].attr.substring(0,4) == selCode.substring(0,4))
				{subsetTotal = subsetTotal + e[0]['y']};
		});
		return d3.format(",")(d3.round(subsetTotal,-2));
	})};
	
var updateSubsetLabels = function () {
	//put a black border around stacked bar elements when their parent attribute code selected
	d3.selectAll("rect")
		.style('stroke', function (d) {
						if (d.attr.substring(0,4) == selCode.substring(0,4)) {return 'black'}
						else {return}});
	//update the subtotal text 
	d3.selectAll("#subsetLabel")
	.style("fill", function () {
		  return attributes.get(selCode).color})
	.text( function (){
		  return attributes.get(selCode).verbose.split('|')[0]});;
};

this.clearCharts = function(){
	d3.select("#plot1").selectAll("*").remove();
   	d3.select("#compPlot2").selectAll("*").remove();
};

//Stacked bar graph showing jobs and transport capacity by default
this.drawCordonGraph = function (dataset) {
	
	var margins = {
		top: 50,
		left: 35,
		right: 150,
		bottom: 125
	},
	//Room for summary stats at top
	legendPanel = {
		height: 40
	},
	width = 400 - margins.left - margins.right,
	height = 400 - margins.top - margins.bottom - legendPanel.height,
	
	vis = d3.select("#plot1").append('g')
        .attr('width', width + margins.left + margins.right)
        .attr('height', height + margins.top + margins.bottom + legendPanel.height)
        .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')'),		
    colors = d3.scale.category10();
	//vis.selectAll("*").remove();
	
	dataset = dataset.map(function (d) {
		return d3.map(d.data).entries().map(function(e){
			return		{	attr: e.key,
								val: [{
              	x: d.indicator,
                y: e.value,
                }]
            }
		})
	});

	stack = d3.layout.stack().values(function(d){return d.val}).order('default');

	dataset.forEach(function(e){
	stack(e)});

	dataset = dataset.map(function(e){
		return e.map(function(g){
			return g.val.map(function(d){
				return {
					x: d.x,
					y: d.y,
					y0: d.y0,
					attr: g.attr,
				};
			});
		});
	}), 
   
	indicators = dataset.map(function (d) {
        return d[0][0].x;
	}),
   
	yMax = d3.max(dataset[0], function (group) {
		return d3.max(group, function (d) {
            return d.y + d.y0;
        });
    }),
    
	yScale = d3.scale.linear()
        .domain([0,yMax])
        .range([height,0]),
    
	xScale = d3.scale.ordinal()
        .domain(indicators)
        .rangeBands([0, width], .2),
    
	yAxis = d3.svg.axis()
        .scale(yScale)
		.ticks(4)
        .orient('left')
		.tickFormat(function (d) {
          var prefix = d3.formatPrefix(d);
          return prefix.scale(d) + prefix.symbol;
        }),
    
	xAxis = d3.svg.axis()
        .scale(xScale)
		.tickSize(0),

    groups =
        vis.selectAll('g')
        .data(dataset[0].concat(dataset[1]).concat(dataset[2]))
        .enter()
        .append('g')
        .style('fill', function (d, i) {
        if (attributes.get(d[0].attr)){
			return attributes.get(d[0].attr).color}
        else {return colors(i)}}),
    
	rects = groups.selectAll('rect')
        .data(function (d) {
			return d;
		})
        .enter()
        .append('rect')
		.style('cursor','pointer')
        .attr('x', function (d) {
			return xScale(d.x);
		})
        .attr('y', function (d, i) {
			return yScale(d.y0+d.y);
		})
        .attr('height', function (d) {
			return (d.y/yMax*height);
		})
        .attr('width', function (d) {
			return xScale.rangeBand();
		})
		.on('click', function (d) {
			//only enable for the first column of stacked bars
			if(d.x == indicators[0]) {
				selCode = d.attr;
				updateSubsetLabels();
				updateSubsetTotal();
			}
		})
        .on('mouseover', function (d) {
			var yPos = parseFloat(d3.select(this).attr('y')) + height +70;
			var xPos = parseFloat(d3.select(this).attr('x')) + xScale.rangeBand() / 2+500;

			d3.select('#tooltip')
            .style('left', xPos + 'px')
            .style('top', yPos + 'px')
            .select('#value')
            .html('<strong>'+ 
				attributes.get(d.attr).verbose
				+ '</strong><br> '
				+ d3.format(",")(d3.round(d.y,-1)));

			d3.select('#tooltip').classed('hidden', false);
		})
        .on('mouseout', function () {
        d3.select('#tooltip').classed('hidden', true);
    });	
	vis.append('g')
        .attr('class', 'axis')
		.attr('transform', 'translate(0,' + height + ')')
        .call(xAxis)
		.selectAll("text")
		.style('text-anchor','start')
		.attr('transform', 'rotate(30)');

	vis.append('g')
		.attr('class', 'axis')
		.call(yAxis);
	
	//Summary stats	
	vis.append('g')
		.append("text")
		.attr("class","stat")
		.attr("y", 25-margins.top)
        .attr("x", xScale(indicators[0])+xScale.rangeBand()-3)
		.style("text-anchor","end")
		.style("opacity", 0.95)
        .html( function (){
		  return d3.format(",")(d3.round(yMax,-2))});
	vis.append('g')
		.append("text")
		.attr("class","stat")
		.attr("y", 25-margins.top)
        .attr("x", xScale(indicators[1])+2)
		.style("text-anchor","start")
		.style("opacity", 0.75)
        .html("Total");
	vis.append('g')
		.data(dataset)
		.append("text")
		.attr("id","subTotal")
		.attr("class","stat")
		.attr("text-anchor","end")
		.attr("y", 38-margins.top)
        .attr("x", xScale(indicators[0])+xScale.rangeBand()-3);
	vis.append('g')
		.append("text")
		.attr("id","subsetLabel")
		.attr("class","stat")
		.style("text-anchor","start")
		.attr("y", 38-margins.top)
        .attr("x", xScale(indicators[1])+2)
		.style("opacity", 0.75)
		.style("fill", attributes.get(selCode).color)
		.text( function (){
		  return attributes.get(selCode).verbose.split('|')[0]})

	updateSubsetLabels();
	updateSubsetTotal();
	
};


//Cumulative plot of accessible opportunities vs time, and stacked bar chart
this.drawGraph = function (cutoff, plotData, indicator) {
	var margins = {
			top: 50,
			left: 45,
			right: 150,
			bottom: 125
		},
		
		legendPanel = {
			height: 40
		},
		
		width = 440 - margins.left - margins.right,
		height = 400 - margins.top - margins.bottom  - legendPanel.height,
		
		total = [],
		dataset = [],
		compare = false;
	
	for (i = 0; i < plotData.length; i++){
		total[i] = Array(120);
		dataset[i]={data: {}, indicator: ' in ' + plotData[i].name + ' scenario'}
		for (j = 0; j < 120; j++){
			total[i][j]={x:j, y:0};
		}
		for (id in plotData[i].data){
			dkey = id.substring(3);
			for (j = 0; j < 120; j++){
			total[i][j]['y']=total[i][j]['y']+plotData[i].data[id].data[j]['y'];
			if (j <= (cutoff*5)){
				dataset[i].data[dkey] = plotData[i].data[id].data[j]['y'];};
		}
		};
		if (i>0){compare=true;}
	}
	
	dataset = dataset.map(function (d) {
		return d3.map(d.data).entries().map(function(e){
			return {
				attr: e.key,
				val: [{
					x: d.indicator,
					y: e.value,
                }]
			}
		})
	});

	stack = d3.layout.stack().values(function(d){return d.val}).order('default');

	dataset.forEach(function(e){
	stack(e)});
  	
	dataset = dataset.map(function(e){
		return e.map(function(g){
			return g.val.map(function(d){
				return {
					x: d.x,
					y: d.y,
					y0: d.y0,
					attr: g.attr,
				};
			});
		});
	}),
	indicators2 = dataset.map(function (d) {
        return d[0][0].x;
	});
   
	vis1 = d3.select("#compPlot2").append('g')
        .attr('width', width + margins.left + margins.right )
        .attr('height', height + margins.top + margins.bottom + legendPanel.height)
        .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')'),		

    combined = total[1] ? total[0].concat(total[1]) : total[0],

    xRange1 = d3.scale.linear().range([0,width/3]).domain([0, 120]),

    yRange = d3.scale.linear().domain([0, 1500000//d3.max(combined, function (d) {   return d.y;})
    ]).range([height,0]);
	  
	vis1.selectAll("*").remove();

	xScale2 = d3.scale.ordinal()
        .domain(indicators2)
        .rangeBands([width/3 + 5,width-10], .2),
	  
	xScale ? '': xScale = xScale2;
	  
	xAxis2 = d3.svg.axis()
        .scale(xScale2)
		.tickSize(0),
  

	groups =
        vis1.selectAll('g')
        .data(dataset[1] ? dataset[0].concat(dataset[1]) : dataset[0])
        .enter()
        .append('g')
        .style('fill', function (d, i) {
			if (attributes.get(d[0].attr)){
				return attributes.get(d[0].attr).color}
			else {return colors(i)}
		});
	  
	rects = groups.selectAll('rect')
        .data(function (d) {
			return d;
		})
        .enter()
        .append('rect')
		.style('cursor','pointer')
        .attr('x', function (d) {
			return xScale2(d.x);
		})
        .attr('y', function (d, i) {
			return yRange(d.y0+d.y);
		})
        .attr('height', function (d) {
			return (d.y*height/1500000);
		})
        .attr('width', function (d) {
			return xScale.rangeBand();
		})
		.on('click', function (d) {
			selCode = d.attr;
			updateSubsetLabels();
			updateSubsetTotal();
		})
        .on('mouseover', function (d) {
			var yPos = parseFloat(d3.select(this).attr('y')) + height +70;
			var xPos = parseFloat(d3.select(this).attr('x')) + xScale.rangeBand() / 2 +100;

			d3.select('#tooltip')
				.style('left', xPos + 'px')
				.style('top', yPos + 'px')
				.select('#value')
				.html('<strong>'+ 
					attributes.get(d.attr).verbose
				+ '</strong><br> '
				+ d3.format(",")(d3.round(d.y,-1)));

			d3.select('#tooltip').classed('hidden', false);
		})
        .on('mouseout', function () {
			d3.select('#tooltip').classed('hidden', true);
		});
    
	vis1.append('g')
        .attr('class', 'axis')
		.attr('transform', 'translate(0,' + height + ')')
        .call(xAxis2)
		.selectAll("text")
		.style('text-anchor','start')
		.attr('transform', 'rotate(30)');

	  
      xAxis1 = d3.svg.axis()
        .scale(xRange1)
		.tickValues([0,30,60,90,120])
        .tickSize(5)
		.orient("bottom"),

      yAxis1 = d3.svg.axis()
        .scale(yRange)
		.ticks(4)
		.tickFormat(function (d) {
          var prefix = d3.formatPrefix(d);
          return prefix.scale(d) + prefix.symbol;
        })
        .orient("left")
	


		
   vis1.append('g')
      .attr("class", "x axis")
	  .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis1)
	  .append("text")
        .attr("dy", 32)
		.attr("x",width/6)
        .style("text-anchor", "middle")
        .text("Minutes");

    vis1.append('g')
      .attr("class", "y axis")
      .call(yAxis1)
	  .append("text")
	  .text("Total Workforce")
	  .style("text-anchor","middle")
	  .attr("transform", 'translate(-45,'+height/2+')rotate(90)');

    var lineFunc = d3.svg.line()
    .x(function (d) {
      return xRange1(d.x);
    })
    .y(function (d) {
      return yRange(d.y);
    })
    .interpolate('basis');

  vis1.append("svg:path")
    .attr("d", lineFunc(total[0]))
    .attr("class", "line")
	
		if (compare) { 
    vis1.append("svg:path")
      .attr("d", lineFunc(total[1]))
      .attr("class", "lineC")
	  .style("stroke-dasharray", ("3,3"))
    }

	
	
	vis1.append("svg:g")
		.attr("class", "stat")
		.append("text")
		.attr("y", 25-margins.top)
        .attr("x", xScale2(indicators2[0])+xScale.rangeBand()-3)
		.style("text-anchor","end")
        .html( function (){
		  return d3.format(",")(d3.round(total[0][cutoff*5-1].y,-3));
		});  

	vis1.append("svg:g")
		.selectAll("text")
		.data(dataset)
		.enter()
		.append("text")
		.attr("class", "stat")
		.attr("id","subTotal")
		.attr("y", 38-margins.top)
        .attr("x", function(d){
			return xScale2(d[0][0].x)+xScale.rangeBand()-3})
		.style("text-anchor","end");
		
	if (dataset[1]){
	
		vis1.append("svg:g")
		.append("text")
		.attr("class", "stat")
		.attr("y", 25-margins.top)
        .attr("x", xScale2(indicators2[1])+xScale.rangeBand()-3)
		.style("text-anchor","end")
		.html( function (){
		  return d3.format(",")(d3.round(total[1][cutoff*5-1].y,-3));
		});  

	}	
		
	vis1.append('g')
		.append("text")
		.attr("class","stat")
		.attr("y", 25-margins.top)
        .attr("x", xScale2(indicators2[0])+(indicators2.length)*xScale.rangeBand()+14)
		.style("text-anchor","start")
		.style("opacity", 0.75)
        .html("Total");
		  
	vis1.append('g')
		.append("text")
		.attr("id","subsetLabel")
		.attr("class","stat")
		.attr("y", 38-margins.top)
        .attr("x", xScale2(indicators2[0])+(indicators2.length)*xScale.rangeBand()+14)
		.style("text-anchor","start")
		.style("opacity", 0.75)
		.style("fill", attributes.get(selCode).color)
        .html( function (){
		  return attributes.get(selCode).verbose.split('|')[0]});
	
	vis1.append("svg:line")
		.attr("id", "sliderLine")
		.attr("class", "line")
		.attr("x1", xRange1(cutoff*5))
		.attr("y1", yRange(total[0][cutoff*5-1].y))
		.attr("x2", xRange1(cutoff*5))
		.attr("y2", height)
		.style("stroke", "rgb(255,255,255)")
		.style("opacity", 0.85);

	updateSubsetLabels();
	updateSubsetTotal();

    };

});