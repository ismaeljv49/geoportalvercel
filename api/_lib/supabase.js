const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

module.exports = async function query(endpoint, options = {}) {
    const url = `${SUPABASE_URL}${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Supabase error ${res.status}: ${text}`);
    }

    if (options.method === 'PATCH' || options.method === 'DELETE') {
        return { success: true };
    }

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
        return await res.json();
    }
    return await res.text();
}
