<?php

namespace App\Services;

use App\Models\PortalNotification;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Support\Facades\Log;

class PortalNotificationService
{
    /**
     * Send notification to a specific user by user_id.
     */
    public function notifyUser(
        User|int $userOrId,
        string $title,
        string $message,
        string $type = 'system',
        ?string $actionTab = null,
        ?string $referenceId = null,
        ?array $data = null,
        ?int $employeeId = null
    ): ?PortalNotification {
        try {
            $user = $userOrId instanceof User ? $userOrId : User::find($userOrId);
            if (! $user || ! $user->is_active) {
                return null;
            }

            $resolvedEmployeeId = $employeeId ?? Employee::where('nip', $user->username)->value('id');

            return PortalNotification::create([
                'user_id' => $user->id,
                'employee_id' => $resolvedEmployeeId,
                'title' => strip_tags(trim($title)),
                'message' => strip_tags(trim($message)),
                'type' => $type,
                'action_tab' => $actionTab,
                'reference_id' => $referenceId ? (string) $referenceId : null,
                'data' => $data,
                'read_at' => null,
            ]);
        } catch (\Throwable $e) {
            $uid = $userOrId instanceof User ? $userOrId->id : $userOrId;
            Log::error('Failed to create portal notification for user '.$uid.': '.$e->getMessage());
            return null;
        }
    }

    /**
     * Send notification to an employee (finds user via employee's NIP).
     * Accepts Employee instance, employee ID (int), or NIP (string).
     */
    public function notifyEmployee(
        $employeeOrId,
        string $title,
        string $message,
        string $type = 'system',
        ?string $actionTab = null,
        ?string $referenceId = null,
        ?array $data = null
    ): ?PortalNotification {
        try {
            $employee = match (true) {
                $employeeOrId instanceof Employee => $employeeOrId,
                is_numeric($employeeOrId) => Employee::find($employeeOrId),
                is_string($employeeOrId) => Employee::where('nip', $employeeOrId)->first(),
                default => null,
            };

            if (! $employee || empty($employee->nip)) {
                return null;
            }

            $user = User::where('username', $employee->nip)->first();

            return $user
                ? $this->notifyUser($user, $title, $message, $type, $actionTab, $referenceId, $data, $employee->id)
                : null;
        } catch (\Throwable $e) {
            Log::error('Failed to create portal notification for employee: '.$e->getMessage());
            return null;
        }
    }

    /**
     * Send notification to multiple employees at once.
     */
    public function notifyEmployees(
        array $employeesOrIds,
        string $title,
        string $message,
        string $type = 'system',
        ?string $actionTab = null,
        ?string $referenceId = null,
        ?array $data = null
    ): int {
        $count = 0;
        foreach ($employeesOrIds as $item) {
            $empId = is_array($item) ? ($item['id'] ?? null) : $item;
            if ($empId && $this->notifyEmployee($empId, $title, $message, $type, $actionTab, $referenceId, $data)) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Send notification to all admins who have permission for a module,
     * and broadcast AdminInboxChanged to the module's private WebSocket channel.
     */
    public function notifyAdmins(
        string $module,
        string $title,
        string $message,
        string $type = 'system',
        ?string $actionTab = null,
        ?string $referenceId = null,
        ?array $data = null
    ): int {
        // Broadcast to current token-scoped admin channels before creating personal notices.
        try {
            event(new \App\Events\AdminInboxChanged($module, 'inbox_updated', $referenceId));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Broadcast AdminInboxChanged notifyAdmins failed: '.$e->getMessage());
        }

        $count = 0;
        $admins = User::whereIn('role', ['admin', 'super_admin'])->where('is_active', true)->get();
        foreach ($admins as $admin) {
            if ($admin->canAccessAdminInbox($module)) {
                if ($this->notifyUser($admin, $title, $message, $type, $actionTab, $referenceId, $data)) {
                    $count++;
                }
            }
        }

        return $count;
    }
}
