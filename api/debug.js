export async function GET(request) {
    return new Response(JSON.stringify({
        supabase_url_set: !!process.env.SUPABASE_URL,
        supabase_key_set: !!process.env.SUPABASE_KEY,
        supabase_url: (process.env.SUPABASE_URL || '').trim(),
        supabase_url_ends_slash: (process.env.SUPABASE_URL || '').endsWith('/'),
        node_version: process.version,
        url: request.url
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
