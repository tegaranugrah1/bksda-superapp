<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Video;
use App\Modules\CMS\Traits\AdminCrudTrait;

class VideoController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Video::class;
}
