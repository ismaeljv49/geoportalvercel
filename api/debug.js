const https = require('https');

module.exports = function handler(req, res) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || '';

    const testEndpoint = 'reportes_ciudadanos?select=*&limit=1';

    const url = supabaseUrl + testEndpoint;
    const urlObj = new URL(url);

    const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
            'apikey': supabaseKey,
            'Authorization': 'Bearer ' + supabaseKey,
            'Content-Type': 'application/json'
        }
    };

    const start = Date.now();

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            const elapsed = Date.now() - start;
            res.json({
                url_tested: url,
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                supabase_status: response.statusCode,
                supabase_body_preview: data.substring(0, 500),
                elapsed_ms: elapsed,
                headers: response.headers
            });
        });
    });

    request.on('error', (err) => {
        res.json({
            url_tested: url,
            error: err.message,
            error_code: err.code,
            elapsed_ms: Date.now() - start
        });
    });

    request.end();
};
