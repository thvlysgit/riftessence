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

// Send to a specific webhook URL (for team notifications)
export async function sendTeamDiscordWebhook(webhookUrl: string, content?: string, embeds?: any[]): Promise<boolean> {
  if (!webhookUrl) {
    return false;
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
      console.error('[Team Discord Webhook] Failed:', response.statusText);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Team Discord Webhook] Error:', error);
    return false;
  }
}

// Validate a Discord webhook URL
export async function validateDiscordWebhook(webhookUrl: string): Promise<{ valid: boolean; guildName?: string; channelName?: string }> {
  if (!webhookUrl || !webhookUrl.includes('discord.com/api/webhooks/')) {
    return { valid: false };
  }

  try {
    const response = await fetch(webhookUrl);
    if (!response.ok) {
      return { valid: false };
    }
    const data = await response.json();
    return {
      valid: true,
      guildName: data.guild?.name,
      channelName: data.channel?.name || data.name
    };
  } catch (error) {
    console.error('[Discord Webhook Validation] Error:', error);
    return { valid: false };
  }
}

// Event type colors and labels
const EVENT_COLORS: Record<string, number> = {
  SCRIM: 0x22C55E,      // Green
  PRACTICE: 0x3B82F6,   // Blue
  VOD_REVIEW: 0xF59E0B, // Amber
  TOURNAMENT: 0xEF4444, // Red
  TEAM_MEETING: 0x8B5CF6, // Purple
};

const EVENT_LABELS: Record<string, string> = {
  SCRIM: '⚔️ Scrim',
  PRACTICE: '📈 Practice',
  VOD_REVIEW: '🎥 VOD Review',
  TOURNAMENT: '🏆 Tournament',
  TEAM_MEETING: '👥 Team Meeting',
};

// Create embed for team event creation
export function createTeamEventCreatedEmbed(data: {
  teamName: string;
  teamTag?: string | null;
  eventTitle: string;
  eventType: string;
  scheduledAt: Date;
  duration?: number | null;
  description?: string | null;
  enemyLink?: string | null;
  createdBy: string;
}) {
  const fields = [
    {
      name: '📅 When',
      value: data.scheduledAt.toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      inline: true,
    },
  ];

  if (data.duration) {
    fields.push({
      name: '⏱️ Duration',
      value: `${data.duration} minutes`,
      inline: true,
    });
  }

  if (data.description) {
    fields.push({
      name: '📝 Description',
      value: data.description.substring(0, 200),
      inline: false,
    });
  }

  if (data.enemyLink) {
    fields.push({
      name: '🎯 Enemy Team',
      value: `[View Link](${data.enemyLink.startsWith('http') ? data.enemyLink : 'https://' + data.enemyLink})`,
      inline: false,
    });
  }

  return {
    title: `${EVENT_LABELS[data.eventType] || data.eventType}: ${data.eventTitle}`,
    description: `New event scheduled for **${data.teamName}**${data.teamTag ? ` [${data.teamTag}]` : ''}`,
    color: EVENT_COLORS[data.eventType] || 0xC8AA6E,
    fields,
    footer: {
      text: `Created by ${data.createdBy}`,
    },
    timestamp: new Date().toISOString(),
  };
}

// Create embed for team event update
export function createTeamEventUpdatedEmbed(data: {
  teamName: string;
  teamTag?: string | null;
  eventTitle: string;
  eventType: string;
  scheduledAt: Date;
  duration?: number | null;
  description?: string | null;
  updatedBy: string;
}) {
  const fields = [
    {
      name: '📅 When',
      value: data.scheduledAt.toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      inline: true,
    },
  ];

  if (data.duration) {
    fields.push({
      name: '⏱️ Duration',
      value: `${data.duration} minutes`,
      inline: true,
    });
  }

  if (data.description) {
    fields.push({
      name: '📝 Description',
      value: data.description.substring(0, 200),
      inline: false,
    });
  }

  return {
    title: `📝 Event Updated: ${data.eventTitle}`,
    description: `**${data.teamName}**${data.teamTag ? ` [${data.teamTag}]` : ''} - ${EVENT_LABELS[data.eventType] || data.eventType}`,
    color: 0xF59E0B, // Amber for updates
    fields,
    footer: {
      text: `Updated by ${data.updatedBy}`,
    },
    timestamp: new Date().toISOString(),
  };
}

// Create embed for team event deletion
export function createTeamEventDeletedEmbed(data: {
  teamName: string;
  teamTag?: string | null;
  eventTitle: string;
  eventType: string;
  scheduledAt: Date;
  deletedBy: string;
}) {
  return {
    title: `🗑️ Event Cancelled: ${data.eventTitle}`,
    description: `**${data.teamName}**${data.teamTag ? ` [${data.teamTag}]` : ''} - ${EVENT_LABELS[data.eventType] || data.eventType}`,
    color: 0xEF4444, // Red for deletions
    fields: [
      {
        name: '📅 Was Scheduled For',
        value: data.scheduledAt.toLocaleString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        inline: true,
      },
    ],
    footer: {
      text: `Cancelled by ${data.deletedBy}`,
    },
    timestamp: new Date().toISOString(),
  };
}

// Create embed for new team member
export function createTeamMemberJoinedEmbed(data: {
  teamName: string;
  teamTag?: string | null;
  username: string;
  role: string;
}) {
  return {
    title: '👋 New Team Member!',
    description: `**${data.username}** has joined **${data.teamName}**${data.teamTag ? ` [${data.teamTag}]` : ''}`,
    color: 0x22C55E, // Green
    fields: [
      {
        name: 'Role',
        value: data.role,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
  };
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
