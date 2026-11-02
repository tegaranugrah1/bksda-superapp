<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}.{tokenId}', function (User $user, string $id, string $tokenId) {
    return (string) $user->getKey() === $id && $user->canUseBroadcastToken($tokenId);
});

Broadcast::channel('admin.inbox.{module}.{tokenId}', function (User $user, string $module, string $tokenId) {
    return $user->canAccessAdminInbox($module) && $user->canUseBroadcastToken($tokenId);
});
