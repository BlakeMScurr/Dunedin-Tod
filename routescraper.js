const fs = require('fs');

// TODO: parameterise with cache file names (i.e., routes.json etc)
// TODO: sort so that we can see if the cache updates
// TODO: add flag for each method that allows it to request a scrape
// TODO: make scrape methods private
class BusRouteScraper {
    async scrape_route_list () {
        routelist_promise = await fetch("https://www.orc.govt.nz/public-transport/dunedin-buses")
        full = "";
        for await (const chunk of routelist_promise.body) {
                full += new TextDecoder().decode(chunk);
        }
        
        full = full.slice(
            full.indexOf("routes-table--list"),
            full.indexOf("Dunedin School Bus Timetables")
        );
    
        const regexp = `check-your-timetables/([0-9]*)[a-zA-Z0-9-_]*`;
        let routes = [...full.matchAll(regexp)].map((x) => {
            return {
                "route": x[1],
                "url": x[0]
            }
        })
        // Distinguish different versions of a route
        let prev = 'someImpossibleRouteNumber'
        let prevCount = 1;
        routes = routes.map((str, i) => {
            route = str.route
            if (prev !== route) {
                count = 1;
            } else {
                count = prevCount + 1;
            }
            version = String.fromCharCode(64 + count);
            if (i < routes.length - 1) {
                if (prev !== route && routes[i + 1].route !== route) {
                    version = ""
                }
            } else {
                if (prev !== route) {
                    version = ""
                }
            }
    
            prev = route
            prevCount = count
    
            return {
                "route": route, 
                "version": version,
                "url": str.url,
            }
        })
        
        return routes
    }

    async scrape_all_routes() {
        let route_list = await scrape_route_list()
        for (var i = 0; i < route_list.length; i++) {
            route = await get_route_info(route_list[i].route, route_list[i].version)
            route_list[i].info = route
        }
        return route_list
    }

    // gets the names of all bus stops and how many times the bus runs in a week
    async scrape_route_info(route_number, route_version) {
        // get current day
        let week = []
        for (var i = 0; i < 7; i++) {
            let day = new Date(new Date().getTime() + (((i+2)*24*60*60*1000)));
            week.push(`${day.getFullYear()}-${day.getMonth()+1}-${day.getDate()}`);
        }

        // get name of bus stops
        data = await week.map(async (day) => {
            route_info_promise = await fetch(
                `https://www.orc.govt.nz/umbraco/surface/timetable/schedule?routeId=OTA00-${route_number}${route_version}&date=${day}`
            );
        
            let full = "";
            for await (const chunk of route_info_promise.body) {
                full += new TextDecoder().decode(chunk);
            }

            return full
        })
        
        let stops = []

        for (let i = 0; i < data.length; i++) {
            const full = await data[i];
            
            day_stops = full.slice(
                full.indexOf("<tbody>"),
                full.indexOf("</tbody>")
            );
        
            day_stops = day_stops.replaceAll("<tr><th>", "")
            day_stops = day_stops.replaceAll("<tr class=\"odd\"><th>", "")
            day_stops = day_stops.replaceAll("</th></tr>", "")
            day_stops = day_stops.replaceAll("&amp;", "&")
            day_stops = day_stops.replaceAll("<tbody>", "")
            day_stops = day_stops.trim()
            day_stops = day_stops.split("\n")
            day_stops = day_stops.map((s) => {
                return s.trim();
            })
            if (!(day_stops.length === 1 && day_stops[0] === '')) {
                stops.push(...day_stops)
            }
            
        }

        function onlyUnique(value, index, array) {
            return array.indexOf(value) === index;
        }
        stops = stops.filter(onlyUnique);

        

        // to get the number of times the bus runs in a week we crawl for a week
        runs_per_week = 0
        for (var i = 0; i < 7; i++) { // todo remove the foreach and just use this (just used to make sure all data is collected before we proceed)
            await data[i]
        }
        await data.forEach(async (day) => {
            day = await day
            runs = day.slice(day.indexOf("timetable--time"))
            runs = runs.slice(runs.indexOf("</tr>") + 1) // for some reason there's an empty row at the start of each
            runs = runs.slice(runs.indexOf("<tr>"), runs.indexOf("</tr>"))
            runs = runs.replaceAll("<tr>", "")
            runs = runs.trim()
            runs = runs.split("\n")
            runs = runs.map((run) => {
                return run.trim();
            })
            runs_per_week += runs.length
        })

        
        rv = {"runs_per_week": runs_per_week, "stops": stops }
        return rv
    }

    async scrape_stop_coordinates() {
        // Bus stops seem to be accessible from this API in this range (for now at least)
        // https://orc.mattersoft.fi/timetable/rest/stopdisplays/59000000
        // https://orc.mattersoft.fi/timetable/rest/stopdisplays/59005042
    
        let stops = new Map();
        let promises = []
        for (var i = 59000000; i < 59005042; i++) {
            p = (async (i) => {
                let resp;
                try {
                    resp = await fetch(`https://orc.mattersoft.fi/timetable/rest/stopdisplays/${i}`)
                } catch (error) {
                    return i
                }
                if (!resp.body) {
                    return i
                }
                if (resp.status === 404) {
                    return i
                }
                let full = "";
                for await (const chunk of resp.body) {
                    full += new TextDecoder().decode(chunk);
                }
                let json = JSON.parse(await full)
                if (json.status === 404) {
                    return i
                }
                return [json.stop.name, json.stop.location]
            })(i)
            promises.push(p)
        }
        await Promise.all(promises)
        for (let i = 0; i < promises.length; i++) {
            p = await promises[i]
            if (p[0]) {
                stops.set(p[0], p[1])
            } else {
                console.log(`couldn't get ${p}`)
            }
        }
        json = JSON.stringify(Object.fromEntries(stops))
        return json
    }

    get_stop_coordinates() {
        return new Map(Object.entries(JSON.parse(fs.readFileSync("stops.json").toString())))
    }
    
    get_all_routes() {
        return JSON.parse(fs.readFileSync("routes.json").toString())
    }
    
    async get_routes_with_coordinates () {
        let routes = this.get_all_routes()
        let stops = this.get_stop_coordinates()
    
        let invalid = 0;
        for (let i = 0; i < routes.length; i++) {
            const route = routes[i];
            for (let j = 0; j < route.info.stops.length; j++) {
                const stop = route.info.stops[j];
                if (!stops.get(stop)) {
                    invalid++
                } else {
                    route.info.stops[j] = {
                        name: route.info.stops[j],
                        coordinate: stops.get(stop)
                    }
                }
            }
        }
    
        if (invalid) {
            console.log(`${invalid} invalid stops`)
        }
        return routes
    }
}

module.exports = BusRouteScraper