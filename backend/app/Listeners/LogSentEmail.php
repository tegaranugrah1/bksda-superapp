<?php

namespace App\Listeners;

use App\Models\EmailLog;
use App\Models\User;
use Illuminate\Mail\Events\MessageSent;
use Symfony\Component\Mime\Address;

class LogSentEmail
{
    /**
     * Handle the event.
     */
    public function handle(MessageSent $event): void
    {
        try {
            $message = $event->message;
            $toAddresses = array_map(function ($addr) {
                return $addr instanceof Address ? $addr->getAddress() : (string) $addr;
            }, $message->getTo());

            $firstTo = $toAddresses[0] ?? '';
            $user = $firstTo ? User::where('email', $firstTo)->first() : null;

            $sentMessage = $event->sent;
            $messageId = $sentMessage ? $sentMessage->getMessageId() : null;

            EmailLog::create([
                'user_id' => $user?->id,
                'mailer' => $event->data['mailer'] ?? config('mail.default', 'failover'),
                'to' => implode(', ', $toAddresses),
                'subject' => (string) ($message->getSubject() ?? '(Tanpa Judul)'),
                'status' => 'sent',
                'message_id' => $messageId,
            ]);
        } catch (\Throwable $e) {
            // Logging failure should never interrupt email sending
        }
    }
}
