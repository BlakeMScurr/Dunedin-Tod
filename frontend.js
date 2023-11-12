var map = L.map('map').fitBounds([
    [-45.7969111176772, 170.5874601790895],
    [-45.96564721624198, 170.34198441004654]
]);


L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

    
// draw bus heatmaps
let route_circles = []
function draw_bus_heatmaps () {
    for (var i = 0; i < full_routes.length; i++) {
        let route = full_routes[i]
        for (let j = 0; j < route.info.stops.length; j++) {
            const stop = route.info.stops[j];
            for (let k = 0; k < 4; k++) {
                let circle = L.circle([stop.coordinate.latitude, stop.coordinate.longitude], {
                    fillOpacity: route.info.runs_per_week / 10000,
                    stroke: false,
                    color: "#FF0000",
                    radius: k * 120,
                })
                circle.addTo(map)
                route_circles.push(circle)
            }
        }
    }
}
draw_bus_heatmaps()
document.getElementById("show-heatmaps").addEventListener('change', () => {
    if (document.getElementById("show-heatmaps").checked) {
        draw_bus_heatmaps()
    } else {
        route_circles.forEach(point => {
            point.remove()
        })
    }
})


// draw listings
listing_points = []
function draw_listings () {
    for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];
        let circle = L.circle([listing.latitude, listing.longitude], {
            stroke: false,
            color: "#00F",
            radius: 30,
        })
        circle.bindPopup(`<a href=https://${listing.url}>See property for sale</a>`).openPopup();
        listing_points.push(circle)
        circle.addTo(map)
    }
}

document.getElementById("show-listings").addEventListener('change', () => {
    if (document.getElementById("show-listings").checked) {
        draw_listings()
    } else {
        listing_points.forEach(point => {
            point.remove()
        })
    }
})