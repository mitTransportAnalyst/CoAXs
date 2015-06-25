coaxsApp.service('d3Service', function () {

  this.drawGraph = function (data) {

    var vis   = d3.select("#visualisation"),
      WIDTH   = 350,
      HEIGHT  = 200,
      MARGINS = {
        top    : 20,
        right  : 20,
        bottom : 20,
        left   : 50
      },
      xRange = d3.scale.linear().range([MARGINS.left, WIDTH - MARGINS.right]).domain([d3.min(data, function (d) {
          return d.x;
        }),
        d3.max(data, function (d) {
          return d.x;
        })
      ]),

      yRange = d3.scale.linear().range([HEIGHT - MARGINS.top, MARGINS.bottom]).domain([d3.min(data, function (d) {
          return d.y;
        }),
        d3.max(data, function (d) {
          return d.y;
        })
      ]),

      xAxis = d3.svg.axis()
        .scale(xRange)
        .tickSize(5)
        .tickSubdivide(true),

      yAxis = d3.svg.axis()
        .scale(yRange)
        .tickSize(5)
        .orient("left")
        .tickSubdivide(true);


    vis.append("svg:g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
      .call(xAxis);

    vis.append("svg:g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + (MARGINS.left) + ",0)")
      .call(yAxis);

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

  }

});






