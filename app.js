//GUIDE FOR OATH https://gomakethings.com/using-oauth-with-fetch-in-vanilla-js/
//GUIDE FOR CORS https://alfilatov.com/posts/run-chrome-without-cors/
//VIDEO GUIDE ON JS API https://www.youtube.com/watch?v=ecT42O6I_WI

//https://developer.waveapps.com/hc/en-us/articles/360019762711
//QnVzaW5lc3M6ODhlNjE0NTktNmMxMy00NTJhLTkyNzctNTYwY2QzZTI3M2Iz

const { error } = require('console');
const fetch = require('node-fetch');
const URL_WAGE = 'https://gql.waveapps.com/graphql/public'; //GET via POST requests through GraphQl
const WAGE_KEY = 'Bearer 7LcjpADIBIX7DSasMs815YqCVQUg6T';
const TRACKPOD_KEY = 'ef8e27af-e455-45d1-a3a8-01fd6b563cf4';
const URL_POST_TRACKPOD = 'https://api.track-pod.com/Order';

//let i = 2; // wave invoice number starting  from end
//var j = 0; // index for res (TP)
var waveData = [];

var waveInvoiceId;
var waveInvoiceDate;
var waveCustomerName;
var waveCustomerId; //used for access to customer and take address
var waveCustomerEmail;
var waveShippingAddress; //taken from wave customer
//TODO manage multiply lines with products as well
var waveProductName;
var waveProductQuantity;
var waveProductPrice;

async function getWageBusinessId(URL_WAGE) {
    const response = await fetch(URL_WAGE, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer 7LcjpADIBIX7DSasMs815YqCVQUg6T',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: 'query { businesses {edges { node {id name} } } }',
            variables: {}
        })
    })
    const businessId = await response.json();
    //console.log("Wave Business ID", businessId.data.businesses.edges[1].node.id)
    return businessId.data.businesses.edges[1].node.id;
}
async function asyncGetWageBusinessId() {
    var res = await getWageBusinessId(URL_WAGE);
    return res;
}


async function getInvoiceFromWage(URL_WAGE, businessId, i) {
    const response = await fetch(URL_WAGE, {
        method: 'POST',
        headers: {
            'Authorization': WAGE_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: 'query($businessId: ID!,) { business(id: $businessId){invoices{edges{node {invoiceDate invoiceNumber customer{id name} items{product{id name} quantity price}}}}} }',
            variables: { "businessId": businessId }
        })
    });
    const invoices = await response.json();
    //console.log("_____customerId", invoices.data.business.invoices.edges[i].node.customer.id);
    return invoices;
}


async function getInfoFromWageCustomerById(URL_WAGE, customerId, businessId) {
    const response = await fetch(URL_WAGE, {
        method: 'POST',
        headers: {
            'Authorization': WAGE_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: 'query($businessId: ID!, $customerId: ID!) { business(id: $businessId){customer(id: $customerId){name email shippingDetails{address{addressLine1}}}} }',
            variables: { "businessId": businessId, "customerId": customerId }
        })

    });
    const result = await response.json()
        .then((result) => {
            address = result.data.business.customer.shippingDetails.address.addressLine1;
            email = result.data.business.customer.email;
            client = result.data.business.customer.name;
            return { address, email, client };
        })
    return { address, email, client };
}
async function asyncGetInfoFromWageCustomerIdAndPost(res, businessId, i, waveCustomerId) {

    infoFromCustomer = await getInfoFromWageCustomerById(URL_WAGE, waveCustomerId, businessId)
        .then((infoFromCustomer) => {
            //console.log(infoFromCustomer);

            res[i].Address = infoFromCustomer.address;
            res[i].Email = infoFromCustomer.email;
            res[i].ClientId = "wave"; // because original Wave client ID is too long for TP
            //res[i].Client = infoFromCustomer.name;
            console.log("___" + res[i].Address);
        })
        .then(() => {
            res[i].clientId = i;
            console.log("___" + res[i].Address);
            postOrderToTrackPOD(URL_POST_TRACKPOD, res[i]);
        })
}
async function postOrderToTrackPOD(URL, order_POST) {
    await fetch(URL, {
        method: 'POST',
        headers: {
            'X-API-KEY': TRACKPOD_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(order_POST)
    }).then(() => {
        console.log('This order has been uploaded to Track-POD successfully: "', order_POST.Number, '"');
    });
}

for (let i = 0; i < 10; i++) {
    (async() => {

        await asyncGetWageBusinessId()
            .then(async(businessId) => {
                wave = await getInvoiceFromWage(URL_WAGE, businessId, i);
                businessId = await asyncGetWageBusinessId();
                //waveCustomerId = res.wave.data.business.invoices.edges[i].node.customer.id;
                return { wave, businessId };
            })
            .then(res => {
                waveCustomerId = res.wave.data.business.invoices.edges[i].node.customer.id;

                waveData.push({
                    "Number": "wave_" + res.wave.data.business.invoices.edges[i].node.invoiceNumber,
                    "Address": "check",
                    "ClientId": res.wave.data.business.invoices.edges[i].node.customer.id,
                    "Date": res.wave.data.business.invoices.edges[i].node.invoiceDate,
                    "Client": res.wave.data.business.invoices.edges[i].node.customer.name,
                    "Email": "check",

                    "GoodsList": [{
                        "Cost": res.wave.data.business.invoices.edges[i].node.items[0].price,
                        "Quantity": res.wave.data.business.invoices.edges[i].node.items[0].quantity,
                        "GoodsName": res.wave.data.business.invoices.edges[i].node.items[0].product.name,
                    }, ]
                });
                //console.log(waveData);
                return { res, waveData, i, waveCustomerId };
            })
            .then((result) => {
                //console.log(result.waveData);
                asyncGetInfoFromWageCustomerIdAndPost(result.waveData, result.res.businessId, result.i, result.waveCustomerId);
            })

    })()
}