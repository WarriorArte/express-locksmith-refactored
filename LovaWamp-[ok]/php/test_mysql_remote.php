<?php
$resultado = "";

$host     = $_POST["host"] ?? "";
$user     = $_POST["user"] ?? "";
$password = $_POST["password"] ?? "";
$database = $_POST["database"] ?? "";
$port     = $_POST["port"] ?? 3306;

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    mysqli_report(MYSQLI_REPORT_OFF);

    $conn = @new mysqli($host, $user, $password, $database, $port);

    if ($conn->connect_error) {
        $resultado = "❌ Error de conexión:<br>" . $conn->connect_error;
    } else {
        $resultado = "✅ Conexión exitosa a la base de datos <strong>$database</strong><br><br>";

        $query = $conn->query("SHOW TABLES");
        if ($query) {
            $resultado .= "📋 Tablas encontradas:<br>";
            while ($row = $query->fetch_array()) {
                $resultado .= "• " . $row[0] . "<br>";
            }
        } else {
            $resultado .= "⚠️ Conectó, pero no se pudieron listar tablas.";
        }

        $conn->close();
    }
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Test Conexión MySQL Remota</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f3f4f6;
            padding: 40px;
        }
        .card {
            background: #fff;
            padding: 25px;
            max-width: 450px;
            margin: auto;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,.1);
        }
        input, button {
            width: 100%;
            padding: 10px;
            margin-top: 10px;
        }
        button {
            background: #2563eb;
            color: #fff;
            border: none;
            cursor: pointer;
        }
        button:hover {
            background: #1e40af;
        }
        .resultado {
            margin-top: 20px;
            padding: 15px;
            background: #f9fafb;
            border-left: 4px solid #2563eb;
            word-break: break-word;
        }
    </style>
</head>
<body>

<div class="card">
    <h2>🔌 Prueba de conexión MySQL</h2>

    <form method="POST">
        <input type="text" name="host" placeholder="Host MySQL"
               value="<?= htmlspecialchars($host) ?>" required>

        <input type="text" name="user" placeholder="Usuario"
               value="<?= htmlspecialchars($user) ?>" required>

        <input type="password" name="password" placeholder="Contraseña"
               value="<?= htmlspecialchars($password) ?>">

        <input type="text" name="database" placeholder="Base de datos"
               value="<?= htmlspecialchars($database) ?>" required>

        <input type="number" name="port" placeholder="Puerto"
               value="<?= htmlspecialchars($port) ?>">

        <button type="submit">Probar conexión</button>
    </form>

    <?php if ($resultado): ?>
        <div class="resultado">
            <?= $resultado ?>
        </div>
    <?php endif; ?>
</div>

</body>
</html>
