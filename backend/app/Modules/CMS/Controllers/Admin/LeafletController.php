<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Leaflet;
use App\Modules\CMS\Traits\AdminCrudTrait;

class LeafletController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Leaflet::class;
}
