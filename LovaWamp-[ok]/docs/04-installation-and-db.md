# Instalación y Base de Datos

## Flujo de instalación

1. Crear la base de datos en MySQL/MariaDB.
2. Publicar `dist` o `php/` según entorno.
3. Abrir `php/install.php`.
4. Completar credenciales y usuario admin.
5. Confirmar creación de `db_config.php` y `installed.lock`.

## Reinstalación

Usar:

```text
install.php?reinstall=1
```

## Política de seguridad

- El instalador no crea bases de datos automáticamente.
- La BD debe existir previamente.
- Se recomienda eliminar `install.php` tras instalación.

## Nombres válidos de BD

`install.php` acepta:

- letras,
- números,
- guion bajo `_`,
- guion medio `-`.

Ejemplo válido:

```text
hamsaapp-35313139c9b4
```
