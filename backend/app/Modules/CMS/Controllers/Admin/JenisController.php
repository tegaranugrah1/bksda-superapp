<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Jenis;
use App\Modules\CMS\Traits\AdminCrudTrait;

class JenisController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Jenis::class;
}
