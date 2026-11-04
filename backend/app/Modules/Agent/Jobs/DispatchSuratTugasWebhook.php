<?php

namespace App\Modules\Agent\Jobs;

use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DispatchSuratTugasWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 10;

    public function __construct(public AssignmentLetter $surat)
    {
    }

    public function handle(): void
    {
        $webhookUrl = config('services.agent.webhook_url', env('AGENT_WEBHOOK_URL', 'http://192.168.100.205:8080/webhook/st-published'));

        if (empty($webhookUrl)) {
            return;
        }

        $this->surat->loadMissing('employees');

        $payload = [
            'event' => 'st_published',
            'surat_id' => $this->surat->id,
            'nomor_surat' => $this->surat->nomor_surat,
            'maksud_tujuan' => $this->surat->maksud_tujuan,
            'tempat_tujuan' => $this->surat->tempat_tujuan,
            'tanggal_mulai' => (string) $this->surat->tanggal_mulai,
            'tanggal_selesai' => (string) $this->surat->tanggal_selesai,
            'personil' => $this->surat->employees->map(function ($e) {
                return [
                    'id' => $e->id,
                    'nip' => $e->nip,
                    'nama' => $e->nama_lengkap,
                    'telepon' => $e->telepon,
                ];
            })->values()->toArray(),
            'timestamp' => now()->toIso8601String(),
        ];

        try {
            Http::timeout(3)
                ->withHeaders([
                    'X-Agent-Internal-Key' => config('services.agent.internal_key', env('AGENT_INTERNAL_KEY', 'bksda-hermes-agent-secure-token-2026')),
                ])
                ->post($webhookUrl, $payload);
        } catch (\Throwable $e) {
            Log::warning('Hermes agent webhook dispatch failed: ' . $e->getMessage(), [
                'surat_id' => $this->surat->id,
            ]);
        }
    }
}
