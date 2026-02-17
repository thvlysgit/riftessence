// Discord webhook utilities for notifications

export async function sendDiscordWebhook(content: string, embeds?: any[]) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl || webhookUrl.includes('YOUR_WEBHOOK')) {
    console.log('[Discord Webhook] Not configured, skipping notification');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        embeds,
      }),
    });

    if (!response.ok) {
      console.error('[Discord Webhook] Failed:', response.statusText);
    }
  } catch (error) {
    console.error('[Discord Webhook] Error:', error);
  }
}

export function createNewVisitorEmbed(data: { userAgent?: string; ip?: string; timestamp: string }) {
  return {
    title: '👁️ New Visitor',
    color: 0xC8AA6E, // Gold color
    fields: [
      {
        name: 'Time',
        value: data.timestamp,
        inline: true,
      },
      {
        name: 'User Agent',
        value: data.userAgent ? data.userAgent.substring(0, 100) : 'Unknown',
        inline: false,
      },
    ],
    footer: {
      text: 'RiftEssence Analytics',
    },
    timestamp: new Date().toISOString(),
  };
}

export function createNewUserEmbed(data: {
  username: string;
  region?: string;
  timestamp: string;
}) {
  return {
    title: '✨ New User Registered!',
    color: 0x22c55e, // Green color for success
    fields: [
      {
        name: 'Username',
        value: data.username,
        inline: true,
      },
      {
        name: 'Region',
        value: data.region || 'Not set',
        inline: true,
      },
      {
        name: 'Time',
        value: data.timestamp,
        inline: false,
      },
    ],
    footer: {
      text: 'RiftEssence Registration',
    },
    timestamp: new Date().toISOString(),
  };
}
