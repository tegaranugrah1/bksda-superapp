<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Tsl;
use App\Modules\CMS\Traits\AdminCrudTrait;

class TslController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Tsl::class;
}
