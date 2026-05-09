<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Category;
use App\Modules\CMS\Traits\AdminCrudTrait;

class CategoryController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Category::class;
}
