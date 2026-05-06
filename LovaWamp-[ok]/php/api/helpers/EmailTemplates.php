<?php
/**
 * Email Templates - Beautiful HTML email templates
 */

class EmailTemplates {
    
    private static function getStoreName($conn) {
        try {
            $stmt = $conn->query("SELECT data FROM store_settings WHERE id = 1");
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row && $row['data']) {
                $data = json_decode($row['data'], true);
                return $data['storeName'] ?? 'Nuestra Tienda';
            }
        } catch (Exception $e) {}
        return 'Nuestra Tienda';
    }
    
    private static function baseLayout($conn, $title, $content) {
        $storeName = self::getStoreName($conn);
        $year = date('Y');
        
        return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{$title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px 40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">{$storeName}</h1>
</td>
</tr>
<!-- Content -->
<tr>
<td style="padding:40px;">
{$content}
</td>
</tr>
<!-- Footer -->
<tr>
<td style="background-color:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
<p style="margin:0;color:#9ca3af;font-size:13px;">© {$year} {$storeName}. Todos los derechos reservados.</p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>
HTML;
    }
    
    /**
     * New order confirmation for customer
     */
    public static function orderConfirmation($conn, $order, $items) {
        $orderNumber = $order['order_number'] ?? $order['orderNumber'] ?? '';
        $customerName = $order['customer_name'] ?? $order['customer']['name'] ?? 'Cliente';
        $total = number_format((float)($order['total'] ?? 0), 2);
        
        $itemsHtml = '';
        foreach ($items as $item) {
            $name = $item['product_name'] ?? $item['productName'] ?? '';
            $qty = $item['quantity'] ?? 0;
            $price = number_format((float)($item['total'] ?? 0), 2);
            $itemsHtml .= <<<ITEM
<tr>
<td style="padding:12px 0;border-bottom:1px solid #f3f4f6;color:#374151;font-size:14px;">{$name}</td>
<td style="padding:12px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px;text-align:center;">{$qty}</td>
<td style="padding:12px 0;border-bottom:1px solid #f3f4f6;color:#374151;font-size:14px;text-align:right;font-weight:600;">\${$price}</td>
</tr>
ITEM;
        }
        
        $content = <<<HTML
<h2 style="margin:0 0 8px;color:#111827;font-size:20px;">¡Pedido recibido!</h2>
<p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hola {$customerName}, hemos recibido tu pedido correctamente.</p>

<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
<p style="margin:0;color:#166534;font-size:14px;font-weight:600;">Número de pedido: {$orderNumber}</p>
</div>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
<tr style="background:#f9fafb;">
<th style="padding:10px 0;text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase;font-weight:600;">Producto</th>
<th style="padding:10px 0;text-align:center;color:#6b7280;font-size:12px;text-transform:uppercase;font-weight:600;">Cant.</th>
<th style="padding:10px 0;text-align:right;color:#6b7280;font-size:12px;text-transform:uppercase;font-weight:600;">Total</th>
</tr>
{$itemsHtml}
</table>

<div style="text-align:right;padding:16px 0;border-top:2px solid #111827;">
<p style="margin:0;color:#111827;font-size:18px;font-weight:700;">Total: \${$total}</p>
</div>

<p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">Te notificaremos cuando tu pedido sea enviado.</p>
HTML;
        
        return self::baseLayout($conn, "Pedido {$orderNumber} confirmado", $content);
    }
    
    /**
     * New order notification for admin
     */
    public static function newOrderAdmin($conn, $order, $items) {
        $orderNumber = $order['order_number'] ?? $order['orderNumber'] ?? '';
        $customerName = $order['customer_name'] ?? $order['customer']['name'] ?? '';
        $customerEmail = $order['customer_email'] ?? $order['customer']['email'] ?? '';
        $customerPhone = $order['customer_phone'] ?? $order['customer']['phone'] ?? '';
        $total = number_format((float)($order['total'] ?? 0), 2);
        $itemCount = count($items);
        
        $content = <<<HTML
<h2 style="margin:0 0 8px;color:#111827;font-size:20px;">🛒 Nuevo Pedido</h2>
<p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Se ha recibido un nuevo pedido en la tienda.</p>

<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-bottom:24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr><td style="padding:4px 0;color:#1e40af;font-size:14px;font-weight:600;">Pedido:</td><td style="padding:4px 0;color:#1e40af;font-size:14px;">{$orderNumber}</td></tr>
<tr><td style="padding:4px 0;color:#374151;font-size:14px;font-weight:600;">Cliente:</td><td style="padding:4px 0;color:#374151;font-size:14px;">{$customerName}</td></tr>
<tr><td style="padding:4px 0;color:#374151;font-size:14px;font-weight:600;">Email:</td><td style="padding:4px 0;color:#374151;font-size:14px;">{$customerEmail}</td></tr>
<tr><td style="padding:4px 0;color:#374151;font-size:14px;font-weight:600;">Teléfono:</td><td style="padding:4px 0;color:#374151;font-size:14px;">{$customerPhone}</td></tr>
<tr><td style="padding:4px 0;color:#374151;font-size:14px;font-weight:600;">Productos:</td><td style="padding:4px 0;color:#374151;font-size:14px;">{$itemCount} artículo(s)</td></tr>
<tr><td style="padding:4px 0;color:#111827;font-size:16px;font-weight:700;">Total:</td><td style="padding:4px 0;color:#111827;font-size:16px;font-weight:700;">\${$total}</td></tr>
</table>
</div>
HTML;
        
        return self::baseLayout($conn, "Nuevo pedido {$orderNumber}", $content);
    }
    
    /**
     * Order status change notification
     */
    public static function statusChange($conn, $order, $newStatus) {
        $orderNumber = $order['order_number'] ?? $order['orderNumber'] ?? '';
        $customerName = $order['customer_name'] ?? 'Cliente';
        
        $statusLabels = [
            'processing' => ['🔄 En proceso', 'Tu pedido está siendo preparado.', '#fef3c7', '#92400e', '#fde68a'],
            'shipped'    => ['📦 Enviado', '¡Tu pedido ha sido enviado! Pronto lo recibirás.', '#dbeafe', '#1e40af', '#bfdbfe'],
            'delivered'  => ['✅ Entregado', '¡Tu pedido ha sido entregado! Esperamos que lo disfrutes.', '#d1fae5', '#065f46', '#a7f3d0'],
            'cancelled'  => ['❌ Cancelado', 'Tu pedido ha sido cancelado.', '#fee2e2', '#991b1b', '#fecaca'],
        ];
        
        $info = $statusLabels[$newStatus] ?? ['📋 Actualizado', 'El estado de tu pedido ha cambiado.', '#f3f4f6', '#374151', '#e5e7eb'];
        
        $content = <<<HTML
<h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Actualización de pedido</h2>
<p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hola {$customerName}, tu pedido <strong>{$orderNumber}</strong> tiene una actualización.</p>

<div style="background:{$info[2]};border:1px solid {$info[4]};border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
<p style="margin:0 0 8px;font-size:24px;">{$info[0]}</p>
<p style="margin:0;color:{$info[3]};font-size:15px;">{$info[1]}</p>
</div>
HTML;
        
        return self::baseLayout($conn, "Pedido {$orderNumber} - {$info[0]}", $content);
    }
    
    /**
     * Review link email
     */
    public static function reviewLink($conn, $order, $reviewUrl) {
        $orderNumber = $order['order_number'] ?? $order['orderNumber'] ?? '';
        $customerName = $order['customer_name'] ?? 'Cliente';
        
        $content = <<<HTML
<h2 style="margin:0 0 8px;color:#111827;font-size:20px;">⭐ ¿Cómo estuvo tu compra?</h2>
<p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hola {$customerName}, nos encantaría conocer tu opinión sobre los productos del pedido <strong>{$orderNumber}</strong>.</p>

<div style="text-align:center;margin:32px 0;">
<a href="{$reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.5px;">Calificar mis productos</a>
</div>

<p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">Este enlace es personal y expira en 30 días. No necesitas iniciar sesión.</p>
HTML;
        
        return self::baseLayout($conn, "Califica tu pedido {$orderNumber}", $content);
    }
}
