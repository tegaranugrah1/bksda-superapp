<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Queue\SerializesModels;

class AdminInboxChanged implements ShouldBroadcast, ShouldDispatchAfterCommit, ShouldRescue
{
    use SerializesModels;

    public function __construct(
        public string $module,
        public string $action = 'updated',
        public ?string $referenceId = null
    ) {
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        if (! in_array($this->module, ['surat_tugas', 'kepegawaian', 'bmn'], true)) {
            return [];
        }

        $channels = [];
        $users = User::where('is_active', true)->whereIn('role', ['admin', 'super_admin'])->cursor();
        foreach ($users as $user) {
            if (! $user->canAccessAdminInbox($this->module)) {
                continue;
            }

            foreach ($user->broadcastTokenIds() as $tokenId) {
                $channels[] = new PrivateChannel('admin.inbox.'.$this->module.'.'.$tokenId);
            }
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'inbox.changed';
    }

    /**
     * Get the data to broadcast.
     * Note: Per security-audit & ponytail guidelines, payload is minimal.
     * Sensitive details are refetched via authorized REST endpoints.
     */
    public function broadcastWith(): array
    {
        return [
            'module' => $this->module,
            'action' => $this->action,
            'reference_id' => $this->referenceId,
            'timestamp' => now()->toISOString(),
        ];
    }
}
