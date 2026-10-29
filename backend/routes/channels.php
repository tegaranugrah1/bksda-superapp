<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, int $id) {
    return (int) $user->id === $id;
});

Broadcast::channel('admin.inbox.{module}', function (User $user, string $module) {
    return in_array($module, ['surat_tugas', 'kepegawaian', 'bmn'], true) && $user->hasPermission("{$module}.view");
});
