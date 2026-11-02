import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { ConversationStateMachine } from './conversation/stateMachine';
import { EvolutionGateway } from './gateway/evolution';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

const stateMachine = new ConversationStateMachine();
const gateway = new EvolutionGateway();

// Healthcheck
app.get('/health', async (req: Request, res: Response) => {
  const waState = await gateway.getConnectionStatus();
  res.json({
    status: 'healthy',
    service: 'hermes-assistant',
    whatsapp_gateway: waState,
    timestamp: new Date().toISOString(),
  });
});

// Webhook dari Evolution API (Pesan WhatsApp masuk)
app.post('/webhook/evolution', async (req: Request, res: Response) => {
  res.status(200).json({ received: true });

  const body = req.body;
  const event = body?.event;

  // Tangani event pesan baru
  if (event === 'messages.upsert') {
    const data = body?.data;
    const key = data?.key;
    const message = data?.message;

    // Abaikan pesan dari diri sendiri (bot outgoing)
    if (key?.fromMe) {
      return;
    }

    const remoteJid = key?.remoteJid;
    if (!remoteJid || remoteJid.includes('@g.us')) {
      // Abaikan pesan grup (hanya proses pesan pribadi staf)
      return;
    }

    let messageText = '';
    let messageType = 'text';

    if (message?.conversation) {
      messageText = message.conversation;
    } else if (message?.extendedTextMessage?.text) {
      messageText = message.extendedTextMessage.text;
    } else if (message?.audioMessage) {
      messageType = 'audio';
    } else if (message?.imageMessage) {
      messageType = 'image';
      messageText = message.imageMessage?.caption || '';
    } else if (message?.documentMessage) {
      messageType = 'document';
      messageText = message.documentMessage?.caption || '';
    }

    // Teruskan ke state machine percakapan asisten
    try {
      await stateMachine.handleIncomingMessage(remoteJid, messageText, messageType);
    } catch (err: any) {
      console.error('[Index] Error dispatching to state machine:', err);
    }
  }
});

// Webhook dari SuperApp (Surat Tugas Diterbitkan -> Siaran WhatsApp)
app.post('/webhook/st-published', async (req: Request, res: Response) => {
  const payload = req.body;
  res.status(200).json({ status: 'processing' });

  const personil = payload?.personil || [];
  const noSurat = payload?.nomor_surat || '-';
  const maksud = payload?.maksud_tujuan || '-';
  const tujuan = payload?.tempat_tujuan || '-';
  const mulai = payload?.tanggal_mulai || '';
  const selesai = payload?.tanggal_selesai || '';

  console.log(`[Webhook ST] Menyiarkan ST ${noSurat} ke ${personil.length} personil bertugas...`);

  for (const p of personil) {
    if (!p.telepon) {
      continue;
    }

    const remoteJid = `${p.telepon.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    const message =
      `📢 *Pemberitahuan Surat Tugas Resmi Terbit*\n\n` +
      `Halo Pak/Bu *${p.nama}*,\n` +
      `Surat Tugas resmi telah diterbitkan dengan rincian berikut:\n\n` +
      `• *Nomor ST*: ${noSurat}\n` +
      `• *Kegiatan*: ${maksud}\n` +
      `• *Tempat*: ${tujuan}\n` +
      `• *Tanggal*: ${mulai} s.d. ${selesai}\n\n` +
      `Silakan unduh dokumen PDF resmi bertanda tangan digital melalui portal web BKSDA SuperApp: https://bksdakaltim.net/surat-tugas\n\n` +
      `_Selamat bertugas dan utamakan keselamatan kerja._`;

    await gateway.sendMessage(remoteJid, message, true);
    // Berikan jeda 1.5 detik antar personil untuk keamanan anti-ban
    await new Promise((r) => setTimeout(r, 1500));
  }
});

app.listen(port, () => {
  console.log(`[Hermes Assistant] Service running on http://0.0.0.0:${port}`);
});
