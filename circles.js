
// Multiple distances in metres by conv to get latitude degrees
const lng_conv = 0.000012928887564332174
const lat_conv = 0.000008993216059187338

// Evenly spaces points of a polygon around a circle, appropriately scaling (approximately) for Dunedin's latitude
function circle_approximation(circle) {
    granularity = 64;
    let polygon = []
    for (let i = 0; i < granularity; i++) {
        let radians = 2* Math.PI / granularity * i
        polygon.push([
            circle._latlng.lat + circle.getRadius() * lat_conv * Math.cos(radians),
            circle._latlng.lng + circle.getRadius() * lng_conv * Math.sin(radians),
        ])
    }
    return polygon
}

// from https://stackoverflow.com/a/1985308
Array.prototype.rotate = function(n) {
    n = n % this.length;
    while (this.length && n < 0) n += this.length;
    this.push.apply(this, this.splice(0, n));
    return this;
}

let point_in_circle = (ll, circle) => {
    return L.latLng(ll).distanceTo(circle._latlng) > circle.getRadius()
}

const twist_and_bite = (polygon, circle) => {
    let rotation = 0;
    for (var i = 0; i < polygon.length; i++) {
        curr_valid = point_in_circle(polygon[i], circle)
        next_valid = point_in_circle(polygon[(i+1) % polygon.length], circle)

        if (!curr_valid && next_valid) {
            rotation = (i+1) %polygon.length
        }
    }
    polygon.rotate(rotation)

    return polygon.filter((point) => {
        return point_in_circle(point, circle)
    })
}

// Assumes that each circle can only possibly overlap with the next one
function unionCircles(circles) {
    // assume circles have the same radius (TODO: fix)
    for (let i = 1; i < circles.length; i++) {
        if (circles[i-1].getRadius() != circles[i].getRadius()) {
            throw new Error(`radii unequal: ${a.getRadius()} vs ${b.getRadius()}`)
        }
    }
    let radius = circles[0].getRadius()

    let polygons = [circle_approximation(circles[0])]
    for (let k = 1; k < circles.length; k++) {
        let a = circles[k-1]
        let b = circles[k]
        
        // if they don't intersect, return the first circle as is
        let distance = a._latlng.distanceTo(b._latlng)
        if (radius * 2 < distance) {
            polygons.push(circle_approximation(b))
            continue
        }

        a_x = polygons.pop()
        a_x = twist_and_bite(a_x, b)
        
        b_x = circle_approximation(b)
        b_x = twist_and_bite(b_x, a)
        polygons.push(a_x.concat(b_x))
    }

    return polygons.map(p => L.polygon(p))
}