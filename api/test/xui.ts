import { createDefaultXuiClient } from '../../services/xuiClient';

export const runtime = 'nodejs';

/**
 * Test X-UI API connectivity
 * GET /api/test/xui
 */
export async function GET(request: Request) {
  try {
    console.log('[TEST] Starting X-UI connectivity test');
    
    const xui = createDefaultXuiClient();
    
    if (!xui) {
      console.error('[TEST] X-UI client not configured');
      return Response.json({ 
        success: false, 
        error: 'X-UI not configured',
        env: {
          hasBaseUrl: !!process.env.XUI_BASE_URL,
          hasUsername: !!process.env.XUI_USERNAME,
          hasPassword: !!process.env.XUI_PASSWORD,
        }
      }, { status: 500 });
    }

    console.log('[TEST] X-UI client created, testing login...');
    
    // Test login
    const loggedIn = await xui.login();
    if (!loggedIn) {
      console.error('[TEST] X-UI login failed');
      return Response.json({ 
        success: false, 
        error: 'X-UI login failed - check credentials'
      }, { status: 500 });
    }

    console.log('[TEST] X-UI login successful, fetching inbounds...');

    // Test getting inbounds
    const inbounds = await xui.getInbounds();
    console.log('[TEST] Inbounds fetched:', inbounds.length);

    return Response.json({
      success: true,
      message: 'X-UI API is working',
      inboundsCount: inbounds.length,
      inbounds: inbounds.map(i => ({ id: i.id, port: i.port, protocol: i.protocol }))
    });

  } catch (error) {
    console.error('[TEST] X-UI test error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
