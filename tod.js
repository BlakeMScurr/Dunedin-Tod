
const BusRouteScraper = require("./routescraper")
const ListingScraper = require("./listingscraper")

async function main() {
    let scraper = new BusRouteScraper()
    console.log(JSON.stringify(await scraper.get_routes_with_coordinates()))

    // let lscraper = new ListingScraper()
    // await lscraper.scrape_listings()
}

main()
