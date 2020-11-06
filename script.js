const margin = {top: 20, right: 20, bottom: 20, left: 40},
            width = 650 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;


const svg = d3.select(".chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", 
        "translate(" + margin.left + "," + margin.top + ")");


Promise.all([ // load multiple files
    d3.json('airports.json'),
    d3.json('world-110m.json')
]).then(data=>{ // or use destructuring :([airports, wordmap])=>{ ... 
    let airports = data[0]; // data1.csv
    let worldmap = data[1]; // data2.json
    console.log(worldmap)

    const features = topojson.feature(worldmap, worldmap.objects.countries);
    console.log('features', features);
    console.log("worldmap", worldmap);


    const projection = d3.geoMercator()
        .fitExtent([[0,0], [width,height]], topojson.feature(worldmap, worldmap.objects.countries));

    const path = d3.geoPath()
        .projection(projection);

    let visType = "map"

    svg.append("path")
        .attr("d", path(features))
        .attr("fill", "#566573")

    svg.append("path")
        .datum(topojson.mesh(worldmap, worldmap.objects.countries))
        .attr("d", path)
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr("class", "subunit-boundary");

    d3.selectAll("input").on("change", event=>{
        visType = event.target.value;// selected button
        switchLayout();
    });

    let sizeScale = d3.scaleLinear()
        .domain(d3.extent(airports.nodes, d=>d.passengers))
        .range([3,10]);


    const simulation = d3.forceSimulation(airports.nodes)
        .force("charge", d3.forceManyBody())
        .force("link", d3.forceLink(airports.links))
        .force("x", d3.forceX(width/2))
        .force("y", d3.forceY(height/2));

    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(airports.links)
        .join("line")
        .attr("stroke-width", d => Math.sqrt(d.value));

    const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(airports.nodes)
        .join("circle")
        .attr("r", function(d){
            return sizeScale(d.passengers)
        })
        .attr("fill", "salmon")
        .call(d3.drag()
            .filter(event => visType == "force")
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );

    node.append("title")
        .text(d=>d.name);

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
    
        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });
    
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }


    function switchLayout() {
        if (visType === "map") {
              // stop the simulation
              simulation.stop()


              // set the positions of links and nodes based on geo-coordinates
              svg.selectAll("circle").transition().duration(750).ease(d3.easeLinear)
                .attr("cx", function(d){
                    return projection([d.longitude, d.latitude])[0];
                })
                .attr("cy", function(d){
                    return projection([d.longitude, d.latitude])[1];
                })

            svg.selectAll("line").transition().duration(750).ease(d3.easeLinear)
                .attr("x1", function(d){
                    return projection([d.source.longitude, d.source.latitude])[0]
                })
                .attr("x2", function(d){
                    return projection([d.target.longitude, d.target.latitude])[0]
                })
                .attr("y1", function(d){
                    return projection([d.source.longitude, d.source.latitude])[1]
                })
                .attr("y2", function(d){
                    return projection([d.target.longitude, d.target.latitude])[1]
                })
              
              // set the map opacity to 1
              svg.selectAll("path").transition().duration(750).ease(d3.easeLinear)
                .attr("opacity", "1")


          } else { // force layout
            
              // restart the simulation
              simulation.alpha(1).restart()
              // set the map opacity to 0
              svg.selectAll("path").transition().duration(450).ease(d3.easeLinear)
                .attr("opacity", "0")
          }
      }

    })