<?php
/**
 * Plugin Name:       Takshila Team Hub
 * Description:       The Takshila team dashboard: logins, breaks, leave, onboarding, documents and Linear tasks. Adds a full-screen "Team Hub" page and the [takshila_team_hub] shortcode.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Takshila
 * License:           Proprietary
 * Text Domain:       takshila-team-hub
 */

if (!defined('ABSPATH')) exit;

define('TKH_VERSION', '1.0.0');
define('TKH_FILE', __FILE__);
define('TKH_DIR', plugin_dir_path(__FILE__));
define('TKH_URL', plugin_dir_url(__FILE__));
define('TKH_TEMPLATE', 'takshila-hub-fullscreen.php');
define('TKH_DEFAULT_API', 'https://script.google.com/macros/s/AKfycbzhIvb8ur60Awx0zoek5XaLE_dwlTrFFeLntkUqluV25Y5HE2qfYHZnajvhXJ3-E_ZV/exec');

/* ---------- settings: Settings → Team Hub ---------- */

function tkh_api_url() { return get_option('tkh_api_url', TKH_DEFAULT_API); }
function tkh_title() { return get_option('tkh_title', 'Takshila Team Hub'); }

add_action('admin_init', function () {
    register_setting('tkh', 'tkh_api_url', array('type' => 'string', 'sanitize_callback' => 'tkh_sanitize_api', 'default' => TKH_DEFAULT_API));
    register_setting('tkh', 'tkh_title', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field', 'default' => 'Takshila Team Hub'));
});

// Only a Google Apps Script web app address is accepted, so a typo can't point the hub somewhere unexpected.
function tkh_sanitize_api($v) {
    $v = esc_url_raw(trim((string) $v), array('https'));
    if (!preg_match('#^https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec$#', $v)) {
        add_settings_error('tkh_api_url', 'tkh_api_url', 'The engine address must be the Apps Script web app URL, ending in /exec. The old address was kept.');
        return tkh_api_url();
    }
    return $v;
}

add_action('admin_menu', function () {
    add_options_page('Team Hub', 'Team Hub', 'manage_options', 'tkh', 'tkh_settings_page');
});

function tkh_settings_page() {
    if (!current_user_can('manage_options')) return;
    $page = tkh_page_id(); ?>
    <div class="wrap">
        <h1>Team Hub</h1>
        <p>The team dashboard runs on the Google Apps Script engine. Everyone signs in with a code sent to their work email.</p>
        <?php if ($page) : ?><p><a class="button" href="<?php echo esc_url(get_permalink($page)); ?>" target="_blank" rel="noopener">Open the Team Hub page</a></p><?php endif; ?>
        <form method="post" action="options.php">
            <?php settings_fields('tkh'); ?>
            <table class="form-table" role="presentation">
                <tr><th scope="row"><label for="tkh_api_url">Engine address</label></th>
                    <td><input name="tkh_api_url" id="tkh_api_url" type="url" class="large-text code" value="<?php echo esc_attr(tkh_api_url()); ?>" required>
                    <p class="description">The Apps Script web app URL (Deploy → Manage deployments). It ends in <code>/exec</code>.</p></td></tr>
                <tr><th scope="row"><label for="tkh_title">Sign-in title</label></th>
                    <td><input name="tkh_title" id="tkh_title" type="text" class="regular-text" value="<?php echo esc_attr(tkh_title()); ?>"></td></tr>
            </table>
            <?php submit_button(); ?>
        </form>
        <h2>Using it on other pages</h2>
        <p>Add the shortcode <code>[takshila_team_hub]</code> to any page. The page called “Team Hub” uses the full-screen layout, without the theme's header and footer.</p>
    </div>
<?php }

add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
    array_unshift($links, '<a href="' . esc_url(admin_url('options-general.php?page=tkh')) . '">Settings</a>');
    return $links;
});

/* ---------- the hub itself ---------- */

function tkh_enqueue() {
    wp_enqueue_style('tkh-font', 'https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap', array(), null);
    wp_enqueue_script('tkh-app', TKH_URL . 'assets/team-hub.js', array(), TKH_VERSION . '-' . filemtime(TKH_DIR . 'assets/team-hub.js'), true);
}

function tkh_markup($height) {
    tkh_enqueue();
    return '<div class="takshila-team-hub" data-api="' . esc_attr(tkh_api_url()) . '" data-title="' . esc_attr(tkh_title()) . '" style="height:' . esc_attr($height) . ';width:100%"></div>';
}

// [takshila_team_hub height="80vh"] inside any page or post
add_shortcode('takshila_team_hub', function ($atts) {
    $a = shortcode_atts(array('height' => '85vh'), $atts, 'takshila_team_hub');
    $h = preg_match('/^\d+(\.\d+)?(px|vh|dvh|%)$/', $a['height']) ? $a['height'] : '85vh';
    return tkh_markup($h);
});

/* ---------- full-screen page template ---------- */

add_filter('theme_page_templates', function ($templates) {
    $templates[TKH_TEMPLATE] = 'Team Hub (full screen)';
    return $templates;
});

add_filter('template_include', function ($template) {
    if (is_singular('page') && get_page_template_slug() === TKH_TEMPLATE) return TKH_DIR . 'templates/full-screen.php';
    return $template;
});

// internal tool: keep the hub page out of search engines
add_filter('wp_robots', function ($robots) {
    if (is_singular('page') && get_page_template_slug() === TKH_TEMPLATE) { $robots['noindex'] = true; $robots['nofollow'] = true; }
    return $robots;
});

/* ---------- create the page on activation ---------- */

function tkh_page_id() {
    $id = (int) get_option('tkh_page_id');
    return ($id && get_post_status($id)) ? $id : 0;
}

register_activation_hook(__FILE__, function () {
    if (tkh_page_id()) return;
    $id = wp_insert_post(array(
        'post_title' => 'Team Hub', 'post_name' => 'hub', 'post_status' => 'publish', 'post_type' => 'page',
        'post_content' => '<!-- wp:shortcode -->[takshila_team_hub]<!-- /wp:shortcode -->', 'comment_status' => 'closed',
    ));
    if ($id && !is_wp_error($id)) { update_post_meta($id, '_wp_page_template', TKH_TEMPLATE); update_option('tkh_page_id', $id); }
});
