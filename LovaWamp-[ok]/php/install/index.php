<?php
/**
 * Instalador legacy deshabilitado.
 * Redirige al instalador unificado del portfolio.
 */

$target = '../install.php?reinstall=1';
header('Location: ' . $target, true, 302);
exit;
