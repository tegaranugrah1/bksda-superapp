<?php

namespace App\Modules\Kepegawaian\Enums;

enum StTemplateType: string
{
    case STANDARD = 'standard';
    case BMN = 'bmn';
    case BEDA_HARI = 'beda_hari';
    case PLH = 'plh';
    case CUSTOM = 'custom';
}
