import query from './_lib/supabase.js';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { estado, order } = req.query;
            let endpoint = 'reportes_ciudadanos?select=*';
            if (estado) endpoint += `&estado=eq.${estado}`;
            if (order) endpoint += `&order=${order}`;
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
}
