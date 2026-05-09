<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Link;
use App\Modules\CMS\Traits\AdminCrudTrait;

class LinkController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Link::class;
}
