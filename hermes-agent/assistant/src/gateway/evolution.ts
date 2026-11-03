import axios, { AxiosInstance } from 'axios';

export class EvolutionGateway {
  private api: AxiosInstance;
  private instanceName: string;

  constructor() {
    const baseURL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    const apiKey = process.env.EVOLUTION_API_KEY || 'bksda_hermes_secret_api_key_2026';
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'bksda-assistant';

    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
    });
  }

  /**
   * Simulasi status pengetikan manusia (anti-ban indicator).
   */
  async sendComposingPresence(remoteJid: string, durationMs: number = 2000): Promise<void> {
    try {
      await this.api.post(`/chat/sendPresence/${this.instanceName}`, {
        number: remoteJid.replace('@s.whatsapp.net', ''),
        presence: 'composing',
        delay: durationMs,
      });
      await new Promise((resolve) => setTimeout(resolve, Math.min(durationMs, 2500)));
    } catch (e: any) {
      // Ignore presence error to not block actual message delivery
    }
  }

  /**
   * Kirim pesan teks dengan typing simulation.
   */
  async sendMessage(remoteJid: string, text: string, withTypingDelay: boolean = true): Promise<boolean> {
    try {
      if (withTypingDelay) {
        await this.sendComposingPresence(remoteJid, 1800);
      }

      const res = await this.api.post(`/message/sendText/${this.instanceName}`, {
        number: remoteJid.replace('@s.whatsapp.net', ''),
        text: text,
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: true,
        },
      });

      return res.status === 200 || res.status === 201;
    } catch (err: any) {
      console.error(`[EvolutionGateway] Failed to send message to ${remoteJid}:`, err.response?.data || err.message);
      return false;
    }
  }

  /**
   * Cek status koneksi instance WhatsApp.
   */
  async getConnectionStatus(): Promise<string> {
    try {
      const res = await this.api.get(`/instance/connectionState/${this.instanceName}`);
      return res.data?.instance?.state || 'unknown';
    } catch (err: any) {
      return 'disconnected';
    }
  }

  /**
   * Mengambil data QR code terkini atau status koneksi langsung.
   */
  async getLiveQrCode(): Promise<{ state: string; base64?: string; pairingCode?: string }> {
    try {
      const stateRes = await this.api.get(`/instance/connectionState/${this.instanceName}`);
      const state = stateRes.data?.instance?.state || 'close';
      if (state === 'open') {
        return { state: 'open' };
      }

      const connectRes = await this.api.get(`/instance/connect/${this.instanceName}`);
      return {
        state: 'connecting',
        base64: connectRes.data?.base64,
        pairingCode: connectRes.data?.pairingCode,
      };
    } catch (err: any) {
      console.error('[EvolutionGateway] getLiveQrCode error:', err.response?.data || err.message);
      return { state: 'error' };
    }
  }
}
