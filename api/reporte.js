import query from './_lib/supabase.js';

export async function PATCH(request) {
    try {
        const body = await request.json();
        const { id, estado } = body;
        if (!id || !estado) {
            return Response.json({ error: 'id and estado are required' }, { status: 400 });
        }
        const validos = ['pendiente', 'en_proceso', 'resuelto'];
        if (!validos.includes(estado)) {
            return Response.json({ error: `estado must be one of: ${validos.join(', ')}` }, { status: 400 });
        }
        const data = await query(`reportes_ciudadanos?id=eq.${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ estado })
        });
        return Response.json(data);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
