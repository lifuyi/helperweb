import { pollClientActivations } from '../../services/vpnClientService.js';

export const runtime = 'nodejs';

/**
 * Trigger polling for VPN client activations
 * This endpoint checks all pending VPNs to see if they've been activated in 3x-ui
 * 
 * Can be called:
 * 1. Manually via GET request for testing
 * 2. By Vercel Cron job for automated polling
 * 3. By external scheduler
 */
export async function GET(request: Request) {
  try {
    // Optional: Add simple auth check via query param
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('key');
    const expectedKey = process.env.VPN_POLL_API_KEY;
    
    if (expectedKey && apiKey !== expectedKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[API] Starting VPN activation polling...');
    const result = await pollClientActivations();
    
    return Response.json({
      success: true,
      checked: result.checked,
      activated: result.activated,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Error in poll endpoint:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST handler - same functionality as GET
 * Allows for more complex triggering in the future
 */
export async function POST(request: Request) {
  return GET(request);
}
