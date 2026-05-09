<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Menu;
use App\Modules\CMS\Traits\AdminCrudTrait;

class MenuController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Menu::class;
}
