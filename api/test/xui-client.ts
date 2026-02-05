import { createDefaultXuiClient } from '../../services/xuiClient.js';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientUuid = searchParams.get('uuid');

    if (!clientUuid) {
      return Response.json({ error: 'Missing uuid parameter' }, { status: 400 });
    }

    const xui = createDefaultXuiClient();
    
    if (!xui) {
      return Response.json({ error: 'X-UI not configured' }, { status: 500 });
    }

    const inbounds = await xui.getInbounds();
    
    for (const inbound of inbounds) {
      const clients = await xui.getInboundClients(inbound.id);
      const client = clients.find((c: any) => c.id === clientUuid);
      
      if (client) {
        return Response.json({
          found: true,
          inbound: {
            id: inbound.id,
            port: inbound.port,
            protocol: inbound.protocol,
          },
          client: {
            id: client.id,
            email: client.email,
            enable: client.enable,
            expiryTime: client.expiryTime,
            expiryDate: client.expiryTime > 0 ? new Date(client.expiryTime).toISOString() : 'No expiry',
            totalGB: client.totalGB,
          }
        });
      }
    }

    return Response.json({
      found: false,
      message: 'Client not found in any inbound',
      searchedInbounds: inbounds.length,
    });

  } catch (error) {
    console.error('Error checking X-UI client:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
