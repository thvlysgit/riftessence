// Visitor tracking utility
// Sends a notification to Discord when a new visitor arrives

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export async function trackNewVisitor() {
  // Check if visitor has been tracked before
  const hasTracked = localStorage.getItem('visitor_tracked');
  
  if (hasTracked) {
    return; // Already tracked this visitor
  }

  try {
    await fetch(`${API_URL}/api/analytics/visitor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    // Mark as tracked so we don't send multiple notifications
    localStorage.setItem('visitor_tracked', 'true');
  } catch (error) {
    console.error('[Analytics] Failed to track visitor:', error);
  }
}
