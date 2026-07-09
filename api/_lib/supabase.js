const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const BASE_HOST = SUPABASE_URL.replace(/https?:\/\//, '').replace(/\/.*$/, '');
const BASE_PATH = SUPABASE_URL.replace(/https?:\/\/[^\/]+/, '');

function request(method, endpoint, body) {
    return new Promise((resolve, reject) => {
        const path = BASE_PATH + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
        const urlObj = new URL(SUPABASE_URL + endpoint);
        
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    if (method === 'PATCH' || method === 'DELETE') {
                        resolve({ success: true });
                    } else if (data) {
                        try { resolve(JSON.parse(data)); }
                        catch { resolve(data); }
                    } else {
                        resolve({ success: true });
                    }
                } else {
                    reject(new Error('Supabase error ' + res.statusCode + ': ' + data));
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

module.exports = function query(endpoint, options = {}) {
    const method = options.method || 'GET';
    const body = options.body || null;
    return request(method, endpoint, body);
};
