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

// Endpoint data JSON live QR code
app.get('/api/qr-live', async (req: Request, res: Response) => {
  const data = await gateway.getLiveQrCode();
  res.json(data);
});

// Halaman web live scan QR khusus BKSDA Kaltim (Auto Refresh)
app.get('/qr', (req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tautkan WhatsApp - Hermes Assistant BKSDA Kaltim</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    p.sub { font-size: 14px; color: #94a3b8; margin-bottom: 24px; line-height: 1.5; }
    .qr-container {
      background: #ffffff;
      padding: 16px;
      border-radius: 16px;
      display: inline-block;
      margin: 0 auto 20px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      min-width: 250px;
      min-height: 250px;
      position: relative;
    }
    .qr-img {
      width: 250px;
      height: 250px;
      display: block;
      border-radius: 8px;
    }
    .spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      border: 4px solid #e2e8f0;
      border-top-color: #22c55e;
      border-radius: 50%;
      animation: spin 1s infinite linear;
      display: none;
    }
    @keyframes spin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
    .steps {
      text-align: left;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 16px;
      border-radius: 12px;
      font-size: 13px;
      color: #cbd5e1;
      margin-top: 16px;
      line-height: 1.6;
    }
    .steps ol { padding-left: 20px; }
    .steps li { margin-bottom: 6px; }
    .status-text {
      font-size: 13px;
      color: #38bdf8;
      font-weight: 500;
      margin-top: 12px;
    }
    .success-box {
      display: none;
      padding: 24px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 16px;
      color: #4ade80;
    }
    .success-box h2 { font-size: 20px; margin-bottom: 8px; }
    .refresh-btn {
      background: #0284c7;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      transition: background 0.2s;
    }
    .refresh-btn:hover { background: #0369a1; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span style="display:inline-block;width:8px;height:8px;background:#22c55e;border-radius:50%;"></span>
      BKSDA Kalimantan Timur
    </div>
    <h1>Tautkan WhatsApp Hermes</h1>
    <p class="sub">Pindai kode QR di bawah ini menggunakan WhatsApp resmi operasional asisten balai.</p>

    <div id="scan-view">
      <div class="qr-container">
        <img id="qr-image" class="qr-img" src="" alt="Live QR Code">
        <div id="loader" class="spinner"></div>
      </div>
      <div id="status" class="status-text">Memuat kode QR langsung dari gateway...</div>
      <button class="refresh-btn" onclick="fetchQR(true)">🔄 Muat Ulang QR Baru</button>
      
      <div class="steps">
        <strong>Cara memindai di HP:</strong>
        <ol>
          <li>Buka aplikasi <strong>WhatsApp</strong> di handphone.</li>
          <li>Ketuk <strong>Titik Tiga (⋮)</strong> di Android atau menu <strong>Pengaturan</strong> di iPhone.</li>
          <li>Pilih <strong>Perangkat Tertaut (Linked Devices)</strong>.</li>
          <li>Ketuk <strong>Tautkan Perangkat</strong> dan arahkan kamera ke kode QR di layar ini.</li>
        </ol>
      </div>
    </div>

    <div id="success-view" class="success-box">
      <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
      <h2>WhatsApp Berhasil Terhubung!</h2>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
        Asisten Hermes kini aktif 24/7 dan siap melayani staf BKSDA Kaltim untuk pengajuan cuti, cek saldo, dan notifikasi Surat Tugas.
      </p>
    </div>
  </div>

  <script>
    let timer = null;

    async function fetchQR(manual = false) {
      const img = document.getElementById('qr-image');
      const loader = document.getElementById('loader');
      const status = document.getElementById('status');

      if (manual) {
        loader.style.display = 'block';
        status.innerText = 'Mengambil QR code baru...';
      }

      try {
        const res = await fetch('/api/qr-live');
        const data = await res.json();

        if (data.state === 'open') {
          document.getElementById('scan-view').style.display = 'none';
          document.getElementById('success-view').style.display = 'block';
          if (timer) clearInterval(timer);
          return;
        }

        if (data.base64) {
          img.src = data.base64;
          loader.style.display = 'none';
          status.innerText = 'Kode QR aktif. Memperbarui otomatis tiap 12 detik.';
        } else {
          status.innerText = 'Menghubungkan ke gateway WhatsApp...';
        }
      } catch (e) {
        status.innerText = 'Gagal memuat QR code. Mencoba kembali...';
      }
    }

    fetchQR();
    timer = setInterval(fetchQR, 12000);
  </script>
</body>
</html>`;
  res.send(html);
});

// Webhook dari Evolution API (Pesan WhatsApp masuk)
app.post('/webhook/evolution', async (req: Request, res: Response) => {
  res.status(200).json({ received: true });

  const body = req.body;
  const event = body?.event;

  if (event === 'messages.upsert') {
    const data = body?.data;
    const key = data?.key;
    const message = data?.message;

    if (key?.fromMe) {
      return;
    }

    const remoteJid = key?.remoteJid;
    if (!remoteJid || remoteJid.includes('@g.us')) {
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
    await new Promise((r) => setTimeout(r, 1500));
  }
});

app.listen(port, () => {
  console.log(`[Hermes Assistant] Service running on http://0.0.0.0:${port}`);
});
