export async function GET(request) {
    return Response.json({
        supabase_url_set: !!process.env.SUPABASE_URL,
        supabase_key_set: !!process.env.SUPABASE_KEY,
        supabase_url_length: (process.env.SUPABASE_URL || '').length,
        node_version: process.version,
        url: request.url
    });
}
