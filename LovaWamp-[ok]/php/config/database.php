<?php
/**
 * Database configuration for MariaDB/MySQL
 */

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $port;
    private $conn;

    private $config = [
        'host' => 'localhost',
        'db_name' => 'lovawamp_db',
        'username' => 'root',
        'password' => '',
        'port' => 3306,
    ];

    public function __construct() {
        // db_config.php es generado por el instalador (install.php) y tiene prioridad
        $installed = [];
        $configFile = __DIR__ . '/db_config.php';
        if (file_exists($configFile)) {
            $installed = include $configFile;
        }

        $this->host     = $installed['host']     ?? getenv('DB_HOST')     ?: $this->config['host'];
        $this->db_name  = $installed['db_name']  ?? getenv('DB_NAME')     ?: $this->config['db_name'];
        $this->username = $installed['username'] ?? getenv('DB_USER')     ?: $this->config['username'];
        $this->password = $installed['password'] ?? getenv('DB_PASSWORD') ?: $this->config['password'];
        $this->port     = $installed['port']     ?? getenv('DB_PORT')     ?: $this->config['port'];
    }

    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
        } catch (PDOException $e) {
            error_log('Database connection error: ' . $e->getMessage());
            throw new Exception('Error de conexion a la base de datos');
        }

        return $this->conn;
    }
}
