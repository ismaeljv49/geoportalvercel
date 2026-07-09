import query from './_lib/supabase.js';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        let endpoint = 'reportes_ciudadanos?select=*';
        const estado = searchParams.get('estado');
        const order = searchParams.get('order');
        if (estado) endpoint += `&estado=eq.${estado}`;
        if (order) endpoint += `&order=${order}`;
        const data = await query(endpoint);
        return Response.json(data);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { tipo_problema, comentario, latitud, longitud } = body;
        if (!tipo_problema || latitud === undefined || longitud === undefined) {
            return Response.json({ error: 'tipo_problema, latitud and longitud are required' }, { status: 400 });
        }
        const data = await query('reportes_ciudadanos', {
            method: 'POST',
            body: JSON.stringify({ tipo_problema, comentario, latitud, longitud })
        });
        return Response.json(data, { status: 201 });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
