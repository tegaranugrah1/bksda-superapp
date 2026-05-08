<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Traits\AdminCrudTrait;
use App\Modules\CMS\Models\Kepala;

class KepalaController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Kepala::class;
}
