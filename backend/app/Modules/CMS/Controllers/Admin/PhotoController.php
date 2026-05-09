<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Photo;
use App\Modules\CMS\Traits\AdminCrudTrait;

class PhotoController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Photo::class;
}
