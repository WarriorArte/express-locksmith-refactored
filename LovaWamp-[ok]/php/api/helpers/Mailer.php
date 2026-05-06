<?php
/**
 * Mailer Helper - SMTP email using PHPMailer
 * Encrypts/decrypts SMTP credentials with AES-256-CBC
 */

// Auto-load PHPMailer from composer
$autoloadPath = __DIR__ . '/../../vendor/autoload.php';
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class Mailer {
    
    // Encryption key derived from DB credentials for simplicity
    private static function getEncryptionKey() {
        $secret = getenv('MAIL_ENCRYPTION_KEY') ?: 'store-mail-key-2024';
        return hash('sha256', $secret, true);
    }
    
    public static function encrypt($plaintext) {
        $key = self::getEncryptionKey();
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($plaintext, 'aes-256-cbc', $key, 0, $iv);
        return base64_encode($iv . '::' . $encrypted);
    }
    
    public static function decrypt($ciphertext) {
        $key = self::getEncryptionKey();
        $parts = explode('::', base64_decode($ciphertext), 2);
        if (count($parts) !== 2) return '';
        return openssl_decrypt($parts[1], 'aes-256-cbc', $key, 0, $parts[0]);
    }
    
    /**
     * Get email settings from database
     */
    public static function getSettings($conn) {
        $stmt = $conn->query("SELECT * FROM email_settings WHERE id = 1");
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        return $settings ?: null;
    }
    
    /**
     * Send an email using stored SMTP configuration
     */
    public static function send($conn, $to, $subject, $htmlBody, $plainBody = '') {
        $settings = self::getSettings($conn);
        
        if (!$settings || !$settings['enabled']) {
            error_log("Mailer: Email disabled or not configured");
            return false;
        }
        
        if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
            error_log("Mailer: PHPMailer not installed. Run: composer require phpmailer/phpmailer");
            return false;
        }
        
        $mail = new PHPMailer(true);
        
        try {
            // SMTP Configuration
            $mail->isSMTP();
            $mail->Host = $settings['smtp_host'];
            $mail->Port = (int)$settings['smtp_port'];
            $mail->SMTPAuth = true;
            $mail->Username = $settings['smtp_user'];
            $mail->Password = self::decrypt($settings['smtp_password_encrypted']);
            
            // Encryption
            if ($settings['smtp_encryption'] === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($settings['smtp_encryption'] === 'tls') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            } else {
                $mail->SMTPSecure = false;
                $mail->SMTPAutoTLS = false;
            }
            
            // Anti-spam headers
            $mail->XMailer = ' '; // Hide X-Mailer
            $mail->addCustomHeader('X-Priority', '3'); // Normal priority
            $mail->addCustomHeader('Precedence', 'bulk');
            
            // Sender
            $mail->setFrom($settings['from_email'], $settings['from_name']);
            if (!empty($settings['reply_to'])) {
                $mail->addReplyTo($settings['reply_to'], $settings['from_name']);
            }
            
            // Recipient
            $mail->addAddress($to);
            
            // Content
            $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->AltBody = $plainBody ?: strip_tags($htmlBody);
            
            $mail->send();
            
            // Log success
            self::logEmail($conn, $to, $subject, 'sent');
            return true;
            
        } catch (Exception $e) {
            $error = $mail->ErrorInfo;
            error_log("Mailer error: $error");
            self::logEmail($conn, $to, $subject, 'failed', $error);
            return false;
        }
    }
    
    /**
     * Log email send attempt
     */
    private static function logEmail($conn, $to, $subject, $status, $error = null) {
        try {
            $stmt = $conn->prepare("INSERT INTO email_log (to_email, subject, status, error_message) VALUES (?, ?, ?, ?)");
            $stmt->execute([$to, $subject, $status, $error]);
        } catch (Exception $e) {
            error_log("Failed to log email: " . $e->getMessage());
        }
    }
    
    /**
     * Test SMTP connection
     */
    public static function testConnection($conn) {
        $settings = self::getSettings($conn);
        
        if (!$settings) {
            return ['success' => false, 'message' => 'No hay configuración de correo'];
        }
        
        if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
            return ['success' => false, 'message' => 'PHPMailer no está instalado'];
        }
        
        $mail = new PHPMailer(true);
        
        try {
            $mail->isSMTP();
            $mail->Host = $settings['smtp_host'];
            $mail->Port = (int)$settings['smtp_port'];
            $mail->SMTPAuth = true;
            $mail->Username = $settings['smtp_user'];
            $mail->Password = self::decrypt($settings['smtp_password_encrypted']);
            
            if ($settings['smtp_encryption'] === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($settings['smtp_encryption'] === 'tls') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }
            
            $mail->SMTPDebug = 0;
            $mail->Timeout = 10;
            
            if ($mail->smtpConnect()) {
                $mail->smtpClose();
                return ['success' => true, 'message' => 'Conexión SMTP exitosa'];
            }
            
            return ['success' => false, 'message' => 'No se pudo conectar al servidor SMTP'];
            
        } catch (Exception $e) {
            return ['success' => false, 'message' => 'Error: ' . $e->getMessage()];
        }
    }
}
