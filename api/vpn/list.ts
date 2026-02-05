import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Get VPN URLs for a user
 * This endpoint uses service role key to bypass RLS
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return Response.json({ error: 'Missing user_id parameter' }, { status: 400 });
    }

    // Use service role key to bypass RLS
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query
    let query = supabase
      .from('vpn_urls')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Optional product_id filter
    const productId = searchParams.get('product_id');
    if (productId) {
      query = query.eq('product_id', productId);
    }

    // Fetch VPN URLs for the user
    const { data: vpnUrls, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching VPN URLs:', error);
      return Response.json({ error: 'Failed to fetch VPN URLs' }, { status: 500 });
    }

    return Response.json({ vpn_urls: vpnUrls || [] });
  } catch (error) {
    console.error('VPN list error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
