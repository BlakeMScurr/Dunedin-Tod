const puppeteer = require("puppeteer");
const price_categories = [100000,150000,200000,250000,300000,350000,400000,450000,500000,550000,600000,650000,700000,750000,800000,850000,900000,950000,1000000,1100000,1200000,1300000,1400000,1500000,1600000,1700000,1800000,1900000,2000000,2250000,2500000,2750000,3000000,3500000,4000000,5000000,6000000,7000000,8000000,9000000]

const headers = ``
class ListingScraper {
    async scrape_listings () {
        const browser = await puppeteer.launch({ headless: 'new'});
        const page = await browser.newPage();

        for (var i = 1; i < price_categories.length; i++) {
            let price_min = price_categories[i-1]
            let price_max = price_categories[i]
            await page.goto(`https://www.trademe.co.nz/a/property/residential/sale/search?latitude_max=-45.7969111176772&latitude_min=-45.96564721624198&longitude_max=170.5874601790895&longitude_min=170.34198441004654&sort_order=priceasc&price_min=${price_min}&price_max=${price_max}`);

            let content = await page.content()

            let parts = content.split("listingLength")
            let droppedfront = parts.shift()
            parts[parts.length-1] = parts[parts.length-1].slice(0, parts[parts.length-1].indexOf("isRealEstateAgency"))

            let listings = parts.map((part) => {
                let latitude = part.match(`{&q;latitude&q;:(-+[0-9][0-9]\.[0-9]*)`)[1]
                let longitude = part.match(`&q;longitude&q;:([0-9][0-9][0-9]\.[0-9]*)`)[1]
                let m = part.match(`&q;(/property/.*?)&q;`)
                if (!m) {
                    console.log(part)
                }
                let url = "trademe.co.nz/a" + m[1]
                return {
                    latitude: latitude,
                    longitude: longitude,
                    url: url,
                }
            })

            console.log(listings)
        }
        browser.close()
    }
}

module.exports = ListingScraper


