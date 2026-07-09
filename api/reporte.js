const query = require('./_lib/supabase.js');

module.exports = async function handler(req, res) {
    if (req.method !== 'PATCH') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id, estado } = req.body;
    if (!id || !estado) {
        return res.status(400).json({ error: 'id and estado are required' });
    }

    const validos = ['pendiente', 'en_proceso', 'resuelto'];
    if (!validos.includes(estado)) {
        return res.status(400).json({ error: `estado must be one of: ${validos.join(', ')}` });
    }

    try {
        const data = await query(`reportes_ciudadanos?id=eq.${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ estado })
        });
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
