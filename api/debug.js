module.exports = function handler(req, res) {
    return res.json({
        supabase_url_set: !!process.env.SUPABASE_URL,
        supabase_key_set: !!process.env.SUPABASE_KEY,
        supabase_url: (process.env.SUPABASE_URL || ''),
        supabase_url_ends_slash: (process.env.SUPABASE_URL || '').endsWith('/'),
        node_version: process.version,
        url: req.url
    });
};
