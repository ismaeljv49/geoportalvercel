export default function handler(req, res) {
    const checks = {
        supabase_url_set: !!process.env.SUPABASE_URL,
        supabase_key_set: !!process.env.SUPABASE_KEY,
        supabase_url_length: (process.env.SUPABASE_URL || '').length,
        node_version: process.version,
        method: req.method,
        url: req.url,
        query: req.query
    };
    return res.json(checks);
}
