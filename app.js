const fs = require('fs');
const path = require('path');
const request = require("request");
const opn = require('opn');

const notifier = require('node-notifier');
let tracking = require('./tracking.json');
const regions = require('./regions.json');

let stopTracking = [];
let trackUsingClient = [];
let trackUsingVariant = [];

//Class for a Product
class Product {
    constructor(pid, reg, inStock) {
        this.pid = pid;
        this.region = reg;
        this.inStock = inStock;
    }
}

// command line arguments
const args = process.argv.slice(2);
const region = args[0];
const productID = args[1];
const size = args[2];

function run() {
    for (let i = 0, len = tracking.length; i < len; i++) {
        let product = tracking[i];
        if (stopTracking.includes(product.pid)) {
            continue;
        }
        if (trackUsingClient.includes(product.pid)) {
            clientCheck(product);
            continue;
        }
        if (trackUsingVariant.includes(product.pid)) {
            variantCheck(product);
        }
    }
}

let variantCheck = (product) => {
    const [masterId, sizeCode] = product.pid.split('_');
    const size = regions[product.region].sizes[sizeCode];
    const url = regions[product.region].variantStockUrl + '?pid=' + masterId;

    // request the variants of the product
    request({
        url: url,
        json: true
    }, (error, response, body) => {
        console.log(body.variations.variants);
        // TODO: replace with function verifying data (clientID, etc.)
        if (body.variations.variants === undefined) {
            //prettyPrint('Could not retrieve info for ' + product);
        } else {
            checkData(body.variations.variants);
        }
    });

    let checkData = (variants) => {
        console.log(variants);
        let stockCount = 0;
        let found = false;

        for (let i = 0, len = variants.length; i < len; i++) {
            let variant = variants[i];
            if (variant.id === product.pid) {
                found = true;
                if (variant.ATS > 0) {
                    stockCount = variant.ATS;
                }
            }
        }

        if (!found) {
            console.log('\n');
            prettyError('One of the products we are tracking (' + product.pid + ') might have a wrong ID. It has been temporary removed from tracking');
            // stop tracking the product
            stopTracking.push(product.id);
            trackUsingVariant = trackUsingVariant.filter(function (el) {
                return el !== product.id;
            });

            return;
        }

        if (stockCount > 0) {
            if (!product.inStock) {
                let message = 'Tracking product in stock! Product Id:  ' + product.pid + ' ; Product size: ' + size;
                let notifyMessage = 'Size : ' + size + ' New Stock Count: ' + stockCount;

                // if the product is low in stock, change the messages
                if (stockCount <= 4) {
                    message += ' Be fast! Just ' + stockCount + ' left in stock!';
                    notifyMessage = 'Size : ' + size + ' Be fast! Just ' + stockCount + ' left in stock!';
                }
                // print info to console
                console.log('\n');
                prettyPrint(message);


                // invoke notification
                notifier.notify({
                    'title': product.pid + ' is in stock!',
                    'message': notifyMessage,
                    'icon': path.join(__dirname, '/images/' + masterId + '.jpg'),
                });
                product.inStock = true;
            }
        }
        else {
            product.inStock = false;
        }
        updateTracking();
    };

};

let clientCheck = (product) => {
    const clientUrl = regions[product.region].clientStockUrl;
    let clientId = regions[product.region].clientIds[0];
    const url = clientUrl + '(' + product.pid + ')?client_id=' + clientId;

    // request the variants of the product
    request({
        url: url,
        json: true
    }, (error, response, body) => {
        // TODO: What if data is undefined because of something else?
        if (body.data === undefined) {
            trackUsingVariant.push(product.id);
            trackUsingClient = trackUsingClient.filter(function (el) {
                return el !== product.id;
            });
            console.log();
            prettyError('Could not retrieve info for ' + product.pid);
            prettyError('The product is now being tracked using the fallback url');
        } else {
            checkData(body.data[0]);
        }
    });

    let checkData = (data) => {
        if (data.c_availabilityStatus === 'in_stock') {
            if (!product.inStock) {
                let productName = data.name + ' ' + data.c_color;
                let [master_id, sizeCode] = product.pid.split('_');
                let size = regions[product.region].sizes[sizeCode];
                let modName = data.name.toLowerCase();
                modName = modName.replace(/ /g, "-");
                let productLink = 'http://www.' + regions[product.region].domain + '/' + modName + '/' + master_id + '.html?forceSelSize=' + product.pid;

                // print info to console
                console.log('\n');
                prettyPrint('Tracking product in stock! Product Name:  ' + productName + ' ; Product size: ' + size);
                prettyPrint('Link to product page will be opened on your standard browser...');

                // open link
                opn(productLink);

                // invoke notification
                notifier.notify({
                    'title': productName + ' is in stock!',
                    'message': 'Size : ' + size,
                    'icon': path.join(__dirname, '/images/' + master_id + '.jpg'),
                });
                product.inStock = true;
            }
        }
        else {
            product.inStock = false;
        }
        updateTracking();
    };

};

// add the product from command line input to the list of tracked products
let addProduct = (pid, size) => {

    function handleNewProduct(data) {
        let product;

        // array of all variants
        let variants = data.variations.variants;

        // iterate through the array of variants
        let found = false;
        for (let i = 0, len = variants.length; i < len; i++) {
            let variant = variants[i];
            let id = variant.id;
            if (variant.attributes.size === size) {
                // Are we already tracking the product?
                if (tracking.find(x => x.pid === id) !== undefined)
                    return;
                product = new Product(id, region, false);
                found = true;
                break;
            }
        }

        if (!found)
            throw "Size not found... Are you sure that the size is valid? ";

        if (!product instanceof Product)
            throw "Not instance of Product";

        if (product !== undefined) {
            tracking.push(product);
        }

        addImage();
        updateTracking();
    }

    function addImage() {
        const imgUrl = regions[region].mediaDomain + pid + '_01_standard.jpg';
        const fileName = 'images/' + pid + '.jpg';

        // only add the file if it exists
        let checkFileExists = s => new Promise(r => fs.access(s, fs.F_OK, e => r(!e)));
        checkFileExists(fileName).then(bool => {
            if (!bool) {
                request(imgUrl).pipe(fs.createWriteStream(fileName));
                console.log('\n');
                prettyPrint('Image downloaded for ' + pid + ' and stored at ' + path.join(__dirname, fileName));
            }
        });
    }

    // variant stock url
    const stockUrl = regions[region].variantStockUrl;
    const url = stockUrl + "?pid=" + pid;

    request({
        url: url,
        json: true
    }, (error, response, body) => {
        if (body === undefined) {
            //prettyError('Could not retrieve info from the client url...' + error);

        } else {
            handleNewProduct(body);
        }
    });


};

let updateTracking = () => {
    // Hack to not remove data in tracking.json
    if (JSON.stringify(tracking) === '') {
        return;
    }
    fs.writeFile("./tracking.json", JSON.stringify(tracking), (err) => {
        if (err) return console.log(err);
    });
};

let prettyPrint = (string) => {
    let date = new Date().toLocaleTimeString('en-GB', {
        hour: "numeric",
        minute: "numeric",
        second: "numeric"
    });
    console.log('\x1b[33m%s\x1b[0m: ', '>>> ' + string + ' (' + date + ')');
};

let prettyError = (string) => {
    let date = new Date().toLocaleTimeString('en-GB', {
        hour: "numeric",
        minute: "numeric",
        second: "numeric"
    });
    console.log('\x1b[36m%s\x1b[0m', '>>> ' + string + ' (' + date + ')');
};

// print header
console.log('\x1b[36m%s\x1b[0m', '              _ _     _                      _           _            \n' +
    '     /\\      | (_)   | |               /\\   | |         | |           \n' +
    '    /  \\   __| |_  __| | __ _ ___     /  \\  | | ___ _ __| |_ ___ _ __ \n' +
    '   / /\\ \\ / _` | |/ _` |/ _` / __|   / /\\ \\ | |/ _ \\ \'__| __/ _ \\ \'__|\n' +
    '  / ____ \\ (_| | | (_| | (_| \\__ \\  / ____ \\| |  __/ |  | ||  __/ |   \n' +
    ' /_/    \\_\\__,_|_|\\__,_|\\__,_|___/ /_/    \\_\\_|\\___|_|   \\__\\___|_| ');
console.log('\n');

(() => {
    if (args.length === 3) {
        addProduct(productID, size);
    }

    // initially track all products using the client url
    for (let i = 0, len = tracking.length; i < len; i++) {
        trackUsingClient.push(tracking[i].pid);
    }
})();

setInterval(run, 60 * 1000);