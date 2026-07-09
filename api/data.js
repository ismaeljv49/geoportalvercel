import query from './_lib/supabase.js';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const limit = searchParams.get('limit') || '1000';
    const offset = searchParams.get('offset') || '0';
    const order = searchParams.get('order');

    if (!table) {
        return Response.json({ error: 'table parameter required' }, { status: 400 });
    }

    try {
        let endpoint = `${table}?select=*&limit=${limit}&offset=${offset}`;
        if (order) endpoint += `&order=${order}`;
        const data = await query(endpoint);
        return Response.json(data, {
            headers: { 'Cache-Control': 'no-cache' }
        });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
