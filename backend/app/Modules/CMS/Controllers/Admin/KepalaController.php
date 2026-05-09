<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Kepala;
use App\Modules\CMS\Traits\AdminCrudTrait;

class KepalaController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Kepala::class;
}
