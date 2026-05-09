<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Profil;
use App\Modules\CMS\Traits\AdminCrudTrait;

class ProfilController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Profil::class;
}
