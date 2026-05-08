<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Traits\AdminCrudTrait;
use App\Modules\CMS\Models\Link;

class LinkController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Link::class;
}
