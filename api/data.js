const query = require('./_lib/supabase.js');

module.exports = async function handler(req, res) {
    const table = req.query.table;
    const limit = req.query.limit || '1000';
    const offset = req.query.offset || '0';
    const order = req.query.order || null;

    if (!table) {
        return res.status(400).json({ error: 'table parameter required' });
    }

    try {
        let endpoint = table + '?select=*&limit=' + limit + '&offset=' + offset;
        if (order) endpoint += '&order=' + order;
        const data = await query(endpoint);
        res.setHeader('Cache-Control', 'no-cache');
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
