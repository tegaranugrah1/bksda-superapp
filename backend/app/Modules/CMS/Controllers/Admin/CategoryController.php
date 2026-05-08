<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Traits\AdminCrudTrait;
use App\Modules\CMS\Models\Category;

class CategoryController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Category::class;
}
