const query = require('./_lib/supabase.js');

module.exports = async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            let endpoint = 'reportes_ciudadanos?select=*';
            if (req.query.estado) endpoint += '&estado=eq.' + req.query.estado;
            if (req.query.order) endpoint += '&order=' + req.query.order;
            const data = await query(endpoint);
            return res.json(data);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'POST') {
        try {
            const { tipo_problema, comentario, latitud, longitud } = req.body;
            if (!tipo_problema || latitud === undefined || longitud === undefined) {
                return res.status(400).json({ error: 'tipo_problema, latitud and longitud are required' });
            }
            const data = await query('reportes_ciudadanos', {
                method: 'POST',
                body: JSON.stringify({ tipo_problema, comentario, latitud, longitud })
            });
            return res.status(201).json(data);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
