<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Kawasan;
use App\Modules\CMS\Traits\AdminCrudTrait;

class KawasanController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Kawasan::class;
}
