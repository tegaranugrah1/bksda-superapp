<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Poster;
use App\Modules\CMS\Traits\AdminCrudTrait;

class PosterController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Poster::class;
}
