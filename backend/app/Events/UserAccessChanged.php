<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;

class UserAccessChanged implements ShouldBroadcastNow, ShouldDispatchAfterCommit, ShouldRescue
{
    public function __construct(public int $userId) {}

    public function broadcastOn(): array
    {
        $user = User::find($this->userId);

        return array_map(
            fn (string $tokenId) => new PrivateChannel('App.Models.User.'.$this->userId.'.'.$tokenId),
            $user?->broadcastTokenIds() ?? [],
        );
    }

    public function broadcastAs(): string
    {
        return 'access.updated';
    }

    public function broadcastWith(): array
    {
        // Clients refetch permissions through authenticated REST, never trust event payloads.
        return ['user_id' => $this->userId];
    }
}
