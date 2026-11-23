<?php
/** Full-screen Team Hub page: no theme header, footer or sidebar, just the hub. */
if (!defined('ABSPATH')) exit;
show_admin_bar(false);
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#ECEBE6">
    <meta name="apple-mobile-web-app-title" content="Team Hub">
    <link rel="icon" href="<?php echo esc_url(TKH_URL . 'assets/favicon.svg'); ?>" type="image/svg+xml">
    <link rel="apple-touch-icon" href="<?php echo esc_url(TKH_URL . 'assets/apple-touch-icon.png'); ?>">
    <link rel="preconnect" href="https://script.google.com">
    <?php wp_head(); ?>
    <style>
        html, body { margin: 0 !important; padding: 0 !important; height: 100%; background: #ECEBE6 }
        body { font-family: "Google Sans", system-ui, sans-serif; -webkit-font-smoothing: antialiased }
        .tkh-full { height: 100vh; height: 100dvh }
    </style>
</head>
<body <?php body_class('tkh-fullscreen'); ?>>
<?php if (function_exists('wp_body_open')) wp_body_open(); ?>
<div class="tkh-full"><?php echo tkh_markup('100%'); ?></div>
<?php wp_footer(); ?>
</body>
</html>
