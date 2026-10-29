<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class AdminInboxChanged implements ShouldBroadcast
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
        return [
            new PrivateChannel('admin.inbox.'.$this->module),
        ];
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
