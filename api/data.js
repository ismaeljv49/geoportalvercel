import query from './_lib/supabase.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { table, limit = '1000', offset = '0', order } = req.query;
    if (!table) {
        return res.status(400).json({ error: 'table parameter required' });
    }

    try {
        let endpoint = `${table}?select=*&limit=${limit}&offset=${offset}`;
        if (order) endpoint += `&order=${order}`;
        console.log('Fetching:', endpoint);
        console.log('URL:', (process.env.SUPABASE_URL || 'NOT SET') + endpoint);
        const data = await query(endpoint);
        res.setHeader('Cache-Control', 'no-cache');
        return res.json(data);
    } catch (err) {
        console.error('Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
