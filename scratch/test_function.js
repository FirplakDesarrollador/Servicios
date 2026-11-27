const https = require('https');

async function testFunction() {
    const start = Date.now();
    try {
        const res = await fetch("https://lnphhmowklqiomownurw.supabase.co/functions/v1/sync-sap-products", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response: ${text}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
    } finally {
        console.log(`Elapsed time: ${Date.now() - start}ms`);
    }
}

testFunction();
