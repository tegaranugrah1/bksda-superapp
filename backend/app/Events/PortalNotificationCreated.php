<?php

namespace App\Events;

use App\Models\PortalNotification;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class PortalNotificationCreated implements ShouldBroadcast
{
    use SerializesModels;

    public function __construct(public PortalNotification $notification)
    {
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('App.Models.User.'.$this->notification->user_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->notification->id,
            'title' => $this->notification->title,
            'message' => $this->notification->message,
            'type' => $this->notification->type,
            'action_tab' => $this->notification->action_tab,
            'reference_id' => $this->notification->reference_id,
            'data' => $this->notification->data,
            'created_at' => $this->notification->created_at?->toISOString() ?? now()->toISOString(),
        ];
    }
}
