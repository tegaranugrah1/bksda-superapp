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
        int $userId,
        string $title,
        string $message,
        string $type = 'system',
        ?string $actionTab = null,
        ?string $referenceId = null,
        ?array $data = null
    ): ?PortalNotification {
        try {
            $user = User::find($userId);
            if (! $user) {
                return null;
            }

            // Optional: resolve employee_id if username matches nip
            $employeeId = Employee::where('nip', $user->username)->value('id');

            return PortalNotification::create([
                'user_id' => $user->id,
                'employee_id' => $employeeId,
                'title' => strip_tags(trim($title)),
                'message' => strip_tags(trim($message)),
                'type' => $type,
                'action_tab' => $actionTab,
                'reference_id' => $referenceId ? (string) $referenceId : null,
                'data' => $data,
                'read_at' => null,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to create portal notification for user '.$userId.': '.$e->getMessage());
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
            $employee = null;
            if ($employeeOrId instanceof Employee) {
                $employee = $employeeOrId;
            } elseif (is_numeric($employeeOrId)) {
                $employee = Employee::find($employeeOrId);
            } elseif (is_string($employeeOrId)) {
                $employee = Employee::where('nip', $employeeOrId)->first();
            }

            if (! $employee || empty($employee->nip)) {
                return null;
            }

            $user = User::where('username', $employee->nip)->first();
            if (! $user) {
                return null;
            }

            return PortalNotification::create([
                'user_id' => $user->id,
                'employee_id' => $employee->id,
                'title' => strip_tags(trim($title)),
                'message' => strip_tags(trim($message)),
                'type' => $type,
                'action_tab' => $actionTab,
                'reference_id' => $referenceId ? (string) $referenceId : null,
                'data' => $data,
                'read_at' => null,
            ]);
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
}
