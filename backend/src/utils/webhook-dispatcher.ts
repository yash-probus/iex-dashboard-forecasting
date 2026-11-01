import axios from 'axios';
import config from '../config';

export class WebhookDispatcher {
  public static async dispatch(type: string, payload: any) {
    const receivers = config.webhookReceivers;
    if (!receivers || receivers.length === 0) return;

    console.log(`[WebhookDispatcher] Dispatching event "${type}" to ${receivers.length} receivers...`);
    const promises = receivers.map(async (url) => {
      try {
        await axios.post(
          url,
          { type, payload },
          {
            headers: { 'X-Webhook-Token': config.webhookSecret },
            timeout: 30000
          }
        );
        console.log(`[WebhookDispatcher] Successfully dispatched "${type}" to ${url}`);
      } catch (e: any) {
        console.error(`[WebhookDispatcher] Failed to dispatch "${type}" to ${url}:`, e.message);
      }
    });

    await Promise.all(promises);
  }
}
