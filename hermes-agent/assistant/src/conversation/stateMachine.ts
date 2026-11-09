import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { SuperAppClient, EmployeeInfo, LeaveBalanceData } from '../superapp/client';
import { EvolutionGateway } from '../gateway/evolution';
import { GeminiNluService, ParsedIntent } from '../nlu/gemini';

export interface UserSession {
  state: 'IDLE' | 'AWAITING_LEAVE_CONFIRMATION' | 'AWAITING_ST_CONFIRMATION';
  employee?: EmployeeInfo;
  pendingData?: any;
  updatedAt: number;
}

export class ConversationStateMachine {
  private redis: Redis;
  private superapp: SuperAppClient;
  private gateway: EvolutionGateway;
  private nlu: GeminiNluService;

  constructor() {
    const host = process.env.REDIS_HOST || 'redis';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    this.redis = new Redis({ host, port });
    this.superapp = new SuperAppClient();
    this.gateway = new EvolutionGateway();
    this.nlu = new GeminiNluService();
  }

  /**
   * Titik masuk utama pesan dari WhatsApp via Webhook Evolution API.
   */
  async handleIncomingMessage(remoteJid: string, messageText: string, messageType: string = 'text'): Promise<void> {
    const phone = remoteJid.replace('@s.whatsapp.net', '');

    // 1. Fallback Pesan Non-Teks (Voice Note / Audio & Foto)
    if (messageType === 'audio' || messageType === 'audioMessage') {
      await this.gateway.sendMessage(
        remoteJid,
        '🎙️ Halo! Mohon maaf, saat ini asisten Hermes baru dapat memproses instruksi melalui pesan teks tertulis. Silakan ketik permohonan atau pertanyaan Anda.'
      );
      return;
    }

    if (messageType === 'image' || messageType === 'imageMessage') {
      await this.gateway.sendMessage(
        remoteJid,
        '📄 Foto/dokumen Anda telah diterima. Jika ini surat izin dokter untuk permohonan cuti sakit, silakan ajukan dan konfirmasi cuti teks terlebih dahulu, lalu tautkan scan resmi di portal SuperApp.'
      );
      return;
    }

    if (!messageText || messageText.trim().length === 0) {
      return;
    }

    // 2. Debounce Buffer (Tampung pesan berurutan cepat dalam 2 detik)
    const bufferKey = `buffer:msg:${phone}`;
    await this.redis.rpush(bufferKey, messageText.trim());
    await this.redis.expire(bufferKey, 5);

    // Tunggu jendela debounce 2.0 detik
    await new Promise((r) => setTimeout(r, 2000));

    // Periksa apakah ini eksekutor terakhir untuk nomor ini
    const messages = await this.redis.lrange(bufferKey, 0, -1);
    if (!messages || messages.length === 0) {
      return;
    }

    // Hapus buffer agar tidak dieksekusi dobel
    await this.redis.del(bufferKey);
    const fullMessage = messages.join(' ');

    // 3. Concurrency Mutex Lock
    const lockKey = `lock:assistant:${phone}`;
    const lockOwner = randomUUID();
    const acquired = await this.redis.set(lockKey, lockOwner, 'EX', 15, 'NX');
    if (!acquired) {
      // Ada thread pemroses yang sedang berjalan untuk nomor ini
      return;
    }

    try {
      await this.processMessage(remoteJid, phone, fullMessage);
    } catch (err: any) {
      console.error(`[StateMachine] Error processing message from ${phone}:`, err);
      await this.gateway.sendMessage(
        remoteJid,
        '⚠️ Terjadi kendala saat memproses permohonan Anda. Mohon coba sesaat lagi atau gunakan portal web BKSDA SuperApp.'
      );
    } finally {
      await this.compareDelete(lockKey, lockOwner);
    }
  }

  private async processMessage(remoteJid: string, phone: string, text: string): Promise<void> {
    const sessionKey = `session:user:${phone}`;
    const rawSession = await this.redis.get(sessionKey);
    let session: UserSession = rawSession ? JSON.parse(rawSession) : { state: 'IDLE', updatedAt: Date.now() };

    // A cached conversation is not proof of current phone ownership.
    const verifyRes = await this.superapp.verifyPhone(phone);
    if (!verifyRes.success || !verifyRes.data) {
      await this.redis.del(sessionKey);
      await this.gateway.sendMessage(
        remoteJid,
        'Nomor WhatsApp belum dapat diverifikasi. Masuk ke Portal SuperApp untuk memperbarui nomor pada profil, atau hubungi Subbagian Tata Usaha.'
      );
      return;
    }
    if (session.employee?.id !== verifyRes.data.id || session.employee?.nip !== verifyRes.data.nip) {
      await this.redis.del(sessionKey);
      session = { state: 'IDLE', updatedAt: Date.now() };
    }
    session.employee = verifyRes.data;
    const emp = session.employee;

    // 3. Tangani State Mesin Konfirmasi (Gatekeeper)
    if (session.state === 'AWAITING_LEAVE_CONFIRMATION') {
      const parsed = await this.nlu.parseUserMessage(text, emp.nama_lengkap);
      if (['KONFIRMASI_YA', 'KONFIRMASI_BATAL'].includes(parsed.intent)
        && (!rawSession || !await this.compareDelete(sessionKey, rawSession))) {
        await this.gateway.sendMessage(remoteJid, 'Draf telah berubah atau dibatalkan. Silakan periksa kembali pengajuan Anda.');
        return;
      }
      if (parsed.intent === 'KONFIRMASI_YA') {
        const pending = session.pendingData;
        const submitRes = await this.superapp.submitLeaveRequest(pending);

        if (submitRes.success && submitRes.data) {
          const tiket = submitRes.data.nomor_tiket || `CT-${submitRes.data.id}`;
          await this.gateway.sendMessage(
            remoteJid,
            `✅ *Permohonan Cuti Berhasil Diajukan!*\n\nNomor Tiket: *${tiket}*\nJenis: ${pending.jenis_cuti || 'Cuti Tahunan'}\nDurasi: ${pending.tanggal_mulai} s.d. ${pending.tanggal_selesai} (${submitRes.data.jumlah_hari} hari)\n\nPermohonan Anda telah diteruskan ke Kasubbag TU untuk diverifikasi.`
          );
        } else {
          await this.gateway.sendMessage(
            remoteJid,
            `❌ Gagal mengajukan cuti: ${submitRes.message || 'Terjadi kesalahan sistem.'}`
          );
        }
        return;
      }

      if (parsed.intent === 'KONFIRMASI_BATAL') {
        await this.gateway.sendMessage(remoteJid, '🚫 Pengajuan cuti telah dibatalkan.');
        return;
      }

      // Jika bukan YA atau BATAL saat sedang menunggu konfirmasi
      await this.gateway.sendMessage(
        remoteJid,
        `⏳ Anda masih memiliki draf permohonan cuti yang menunggu konfirmasi.\n\nKetik *YA* untuk memproses pengajuan, atau ketik *BATAL* untuk membatalkannya.`
      );
      return;
    }

    // 4. State IDLE: Pahami NLU dari teks pengguna
    const parsed = await this.nlu.parseUserMessage(text, emp.nama_lengkap);

    switch (parsed.intent) {
      case 'CEK_CUTI': {
        const balanceRes = await this.superapp.getLeaveBalance(emp.nip);
        if (balanceRes.success && balanceRes.data) {
          const d = balanceRes.data;
          const msg = `📊 *Informasi Saldo Cuti Pegawai*\n` +
            `Nama: *${emp.nama_lengkap}*\n` +
            `NIP: ${emp.nip}\n` +
            `Tahun: ${d.year}\n\n` +
            `• Hak Cuti N (${d.year}): ${d.hak_cuti_n} hari\n` +
            `• Sisa Hak N: ${d.sisa_cuti_n0} hari\n` +
            `• Sisa N-1 diakui: ${d.sisa_cuti_n1} hari\n` +
            `• Sisa N-2 diakui: ${d.sisa_cuti_n2} hari\n` +
            `------------------------\n` +
            `• *Total Cuti Tersedia*: *${d.total_tersedia} hari*\n` +
            `• Sedang Diproses: ${d.pending_pengajuan} hari\n` +
            `• *Dapat Diajukan*: *${d.sisa_dapat_diajukan} hari*\n\n` +
            `Ingin mengajukan cuti? Ketik misalnya:\n_"Saya mau cuti 3 hari mulai 10 Nov karena urusan keluarga"_`;
          await this.gateway.sendMessage(remoteJid, msg);
        } else {
          await this.gateway.sendMessage(remoteJid, '❌ Tidak dapat mengambil data saldo cuti saat ini.');
        }
        break;
      }

      case 'AJUKAN_CUTI': {
        const d = parsed.data;
        if (!d.tanggal_mulai || !d.tanggal_selesai) {
          await this.gateway.sendMessage(
            remoteJid,
            `🗓️ Mohon sebutkan tanggal mulai dan selesai cuti Anda secara jelas.\nContoh: _"Ajukan cuti tahunan dari 10 sampai 12 November 2026 untuk urusan keluarga"_`
          );
          return;
        }

        const pendingPayload = {
          nip: emp.nip,
          jenis_cuti: d.jenis_cuti || 'Cuti Tahunan',
          tanggal_mulai: d.tanggal_mulai,
          tanggal_selesai: d.tanggal_selesai,
          alasan_cuti: d.alasan_cuti || 'Urusan penting',
          alamat_menjalankan_cuti: d.alamat_cuti || emp.satuan_kerja || 'Kalimantan Timur',
          telepon: `+${phone}`,
          idempotency_key: `wa_${phone}_${d.tanggal_mulai}_${d.tanggal_selesai}`,
        };

        session.state = 'AWAITING_LEAVE_CONFIRMATION';
        session.pendingData = pendingPayload;
        await this.saveSession(sessionKey, session);

        const confirmCard = `📝 *Konfirmasi Draf Pengajuan Cuti*\n\n` +
          `• Nama: *${emp.nama_lengkap}*\n` +
          `• Jenis: ${pendingPayload.jenis_cuti}\n` +
          `• Tanggal: *${pendingPayload.tanggal_mulai}* s.d. *${pendingPayload.tanggal_selesai}*\n` +
          `• Alasan: ${pendingPayload.alasan_cuti}\n\n` +
          `Apakah rincian di atas sudah sesuai?\n` +
          `👉 Balas *YA* untuk memproses pengajuan.\n` +
          `👉 Balas *BATAL* untuk membatalkan.`;

        await this.gateway.sendMessage(remoteJid, confirmCard);
        break;
      }

      case 'STATUS_ST': {
        const stRes = await this.superapp.getActiveSuratTugas(emp.nip);
        if (stRes.success && stRes.data) {
          const list = stRes.data.surat_tugas || [];
          if (list.length === 0) {
            await this.gateway.sendMessage(
              remoteJid,
              `📋 Anda belum memiliki penugasan atau Surat Tugas resmi yang sedang aktif saat ini.`
            );
          } else {
            let msg = `📋 *Daftar Surat Tugas Anda:*\n\n`;
            for (const st of list) {
              msg += `• *${st.nomor_surat || '(Nomor Draf)'}*\n` +
                `  Tujuan: ${st.tempat_tujuan}\n` +
                `  Tanggal: ${st.tanggal_mulai} s.d. ${st.tanggal_selesai}\n` +
                `  Kegiatan: ${st.maksud_tujuan}\n` +
                `  Status: *${st.status}*\n\n`;
            }
            await this.gateway.sendMessage(remoteJid, msg.trim());
          }
        }
        break;
      }

      case 'BUAT_ST_DRAFT': {
        const d = parsed.data;
        if (!d.maksud_tujuan || !d.tempat_tujuan || !d.tanggal_mulai || !d.tanggal_selesai) {
          await this.gateway.sendMessage(
            remoteJid,
            `📝 Untuk membuat draf ST, mohon lengkapi maksud kegiatan, tempat tujuan, dan tanggal penugasan.`
          );
          return;
        }

        const draftRes = await this.superapp.createDraftSuratTugas({
          maksud_tujuan: d.maksud_tujuan,
          tempat_tujuan: d.tempat_tujuan,
          tanggal_mulai: d.tanggal_mulai,
          tanggal_selesai: d.tanggal_selesai,
          personil_nips: [emp.nip],
          sumber_dana: d.sumber_dana || 'DIPA BKSDA Kalimantan Timur',
        });

        if (draftRes.success) {
          await this.gateway.sendMessage(
            remoteJid,
            `✅ Draf Surat Tugas untuk kegiatan *${d.maksud_tujuan}* di *${d.tempat_tujuan}* (${d.tanggal_mulai} s.d. ${d.tanggal_selesai}) berhasil dibuat dan siap ditinjau pimpinan di SuperApp.`
          );
        } else {
          await this.gateway.sendMessage(remoteJid, `❌ Gagal membuat draf ST: ${draftRes.message}`);
        }
        break;
      }

      default: {
        const reply = parsed.assistant_reply ||
          `Halo Pak/Bu *${emp.nama_lengkap}*! Saya Hermes, asisten operasional BKSDA Kaltim. Anda dapat mengecek saldo cuti (ketik "cek cuti"), mengajukan cuti, atau mengecek Surat Tugas aktif Anda.`;
        await this.gateway.sendMessage(remoteJid, reply);
        break;
      }
    }
  }

  private async saveSession(key: string, session: UserSession): Promise<void> {
    session.updatedAt = Date.now();
    await this.redis.set(key, JSON.stringify(session), 'EX', 1800); // 30 menit TTL
  }

  private async compareDelete(key: string, expected: string): Promise<boolean> {
    return await this.redis.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      1, key, expected
    ) === 1;
  }
}
