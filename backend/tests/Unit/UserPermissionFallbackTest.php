<?php

namespace Tests\Unit;

use App\Models\User;
use PHPUnit\Framework\TestCase;

class UserPermissionFallbackTest extends TestCase
{
    public function test_super_admin_can_access_every_permission(): void
    {
        $user = new User([
            'role' => 'super_admin',
            'access_modules' => [],
            'permissions' => [],
        ]);

        $this->assertTrue($user->hasPermission('bmn.asset.force_delete'));
        $this->assertTrue($user->hasPermission('surat_tugas.approve'));
    }

    public function test_legacy_bmn_admin_can_write_bmn(): void
    {
        $user = new User([
            'role' => 'admin',
            'access_modules' => ['bmn'],
            'permissions' => null,
        ]);

        $this->assertTrue($user->hasPermission('bmn.view'));
        $this->assertTrue($user->hasPermission('bmn.asset.update'));
    }

    public function test_legacy_bmn_admin_can_manage_auction_when_permissions_null(): void
    {
        $user = new User([
            'role' => 'admin',
            'access_modules' => ['bmn'],
            'permissions' => null,
        ]);

        $this->assertTrue($user->hasPermission('bmn.auction.view'));
        $this->assertTrue($user->hasPermission('bmn.auction.create'));
        $this->assertTrue($user->hasPermission('bmn.auction.update'));
    }

    public function test_legacy_bmn_regular_user_can_only_read_auction(): void
    {
        $user = new User([
            'role' => 'pegawai',
            'access_modules' => ['bmn'],
            'permissions' => null,
        ]);

        $this->assertTrue($user->hasPermission('bmn.auction.view'));
        $this->assertFalse($user->hasPermission('bmn.auction.update'));
        $this->assertFalse($user->hasPermission('bmn.auction.finalize'));
    }

    public function test_legacy_kepegawaian_admin_can_approve_surat_tugas(): void
    {
        $user = new User([
            'role' => 'admin',
            'access_modules' => ['kepegawaian'],
            'permissions' => null,
        ]);

        $this->assertTrue($user->hasPermission('kepegawaian.view'));
        $this->assertTrue($user->hasPermission('surat_tugas.approve'));
    }

    public function test_legacy_regular_user_with_module_can_only_read(): void
    {
        $user = new User([
            'role' => 'user',
            'access_modules' => ['kepegawaian'],
            'permissions' => null,
        ]);

        $this->assertTrue($user->hasPermission('kepegawaian.view'));
        $this->assertFalse($user->hasPermission('surat_tugas.approve'));
    }
}
