<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Traits\AdminCrudTrait;
use App\Modules\CMS\Models\Tsl;

class TslController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Tsl::class;
}
