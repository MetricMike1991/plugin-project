<?php
/*
Plugin Name: WP 3D Viewer
Description: Embed a 3D Viewer or Vercel app via shortcode. Includes a basic settings page with a color picker and Freemius licensing.
Version: 0.1.2
Author: MetricMike1991
*/

defined('ABSPATH') || exit;

/**
 * =====================================================================
 * === ADDED: CONFIG for CORS + helpers used by the media proxy
 * =====================================================================
 */

/** The ONLY browser origin allowed to request files via the proxy.
 *  Set this to your Vercel app URL.
 */
if (!defined('WP3DV_ALLOWED_ORIGIN')) {
    define('WP3DV_ALLOWED_ORIGIN', 'https://plugin-project.vercel.app'); // <- change if needed
}

/** Allowed file extensions for proxied files (uploads security) */
function wp3dv_allowed_uploads_regex(): string {
    return '/\.(png|jpe?g|webp|gif|svg|mp4|webm|glb|gltf|bin|ktx2|mp3|ogg|wav|woff2?|ttf|otf)$/i';
}

/** Send CORS headers only for the allowed origin */
function wp3dv_send_cors_headers_if_allowed_origin(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === WP3DV_ALLOWED_ORIGIN) {
        header('Access-Control-Allow-Origin: ' . WP3DV_ALLOWED_ORIGIN);
        header('Vary: Origin'); // keep caches/CDN correct
        header('Access-Control-Allow-Methods: GET, OPTIONS');
        header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Range');
    }
}

/** Resolve a /wp-content/uploads/... path to a file, or exit with an error */
function wp3dv_resolve_uploads_path_or_exit(string $src): string {
    if (strpos($src, '/wp-content/uploads/') !== 0) {
        status_header(400);
        exit('Bad src (must be under /wp-content/uploads/)');
    }
    if (!preg_match(wp3dv_allowed_uploads_regex(), $src)) {
        status_header(415);
        exit('Unsupported media type');
    }
    $abs = ABSPATH . ltrim($src, '/');
    if (!is_file($abs)) {
        status_header(404);
        exit('Not found');
    }
    return $abs;
}

/** Send Content-Type + cache headers (+ simple ETag) */
function wp3dv_send_content_headers(string $abs): void {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $abs) ?: 'application/octet-stream';
    finfo_close($finfo);

    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=31536000, immutable');

    $etag = '"' . md5(filemtime($abs) . ':' . filesize($abs)) . '"';
    header('ETag: ' . $etag);
    if (!empty($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
        status_header(304);
        exit;
    }

    header('Content-Length: ' . filesize($abs));
}

/** Convert a full uploads URL to our proxied REST URL and append a version for cache-busting */
function wp3dv_to_proxy_url(string $full_url): string {
    $parsed = wp_parse_url($full_url);
    if (empty($parsed['path'])) return $full_url;

    $src = $parsed['path']; // e.g. /wp-content/uploads/2025/09/foo.png
    $abs = ABSPATH . ltrim($src, '/');
    $v   = is_file($abs) ? filemtime($abs) : time();

    return home_url('/wp-json/cdn/v1/file?src=' . rawurlencode($src) . '&v=' . $v);
}

/**
 * =====================================================================
 * === ADDED: PHP media proxy endpoints
 * =====================================================================
 * Option A (query param): https://yourdomain/?media-proxy=1&src=/wp-content/uploads/... 
 * Option B (REST route) : https://yourdomain/wp-json/cdn/v1/file?src=/wp-content/uploads/...
 */

/** Option A: query-parameter endpoint */
add_action('init', function () {
    if (!isset($_GET['media-proxy'])) return;

    // Preflight
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        wp3dv_send_cors_headers_if_allowed_origin();
        status_header(204);
        exit;
    }

    $src = isset($_GET['src']) ? (string) $_GET['src'] : '';
    $abs = wp3dv_resolve_uploads_path_or_exit($src);

    wp3dv_send_cors_headers_if_allowed_origin();
    wp3dv_send_content_headers($abs);
    @readfile($abs);
    exit;
});

/** Option B: REST route */
add_action('rest_api_init', function () {
    register_rest_route('cdn/v1', '/file', [
        'methods'  => ['GET', 'OPTIONS'],
        'permission_callback' => '__return_true', // public read of uploads via proxy
        'callback' => function (WP_REST_Request $req) {
            if ($req->get_method() === 'OPTIONS') {
                wp3dv_send_cors_headers_if_allowed_origin();
                return new WP_REST_Response(null, 204);
            }
            $src = (string) ($req->get_param('src') ?? '');
            $abs = wp3dv_resolve_uploads_path_or_exit($src);

            wp3dv_send_cors_headers_if_allowed_origin();
            wp3dv_send_content_headers($abs);
            @readfile($abs);
            exit;
        },
    ]);
});

/**
 * =====================================================================
 * REST API: /wp-json/wp3d/v1/premium and /wp-json/wp3d/v1/settings
 * =====================================================================
 */
add_action('rest_api_init', function () {
    register_rest_route('wp3d/v1', '/premium', array(
        'methods'             => 'GET',
        'callback'            => 'wp3dv_rest_check_premium',
        'permission_callback' => '__return_true', // For dev/testing; restrict in production!
    ));
    register_rest_route('wp3d/v1', '/settings', array(
        'methods'             => 'GET',
        'callback'            => 'wp3dv_rest_get_settings',
        'permission_callback' => '__return_true',
    ));
});

function wp3dv_rest_check_premium($request) {
    $is_premium = false;
    if ( function_exists('w3_fs') && w3_fs() ) {
        $is_premium = w3_fs()->is_premium();
    }
    return array('premium' => $is_premium);
}

function wp3dv_rest_get_settings($request) {
    $is_premium = false;
    if ( function_exists('w3_fs') && w3_fs() ) {
        $is_premium = w3_fs()->is_premium();
    }

    $object244_color = get_option('wp3dv_color', '#0b3b7a');
    $material_image_raw  = get_option('wp3dv_material_image', '');

    // === MODIFIED: return a PROXIED URL so the browser receives CORS headers
    $material_image = $material_image_raw ? wp3dv_to_proxy_url($material_image_raw) : '';

    return array(
        'premium'        => $is_premium,
        'object244Color' => $object244_color,
        'materialImage'  => $material_image,
    );
}

/**
 * Freemius Bootstrap (folder must match 'slug')
 * Folder for this file should be: wp-3d-viewer
 */
if ( ! function_exists('w3_fs') ) {
    function w3_fs() {
        global $w3_fs;
        if ( ! isset($w3_fs) ) {
            $sdk = dirname(__FILE__) . '/vendor/freemius/start.php';
            if ( file_exists($sdk) ) {
                require_once $sdk;
                $w3_fs = fs_dynamic_init(array(
                    'id'                  => '20648',
                    'slug'                => 'wp-3d-viewer', // MUST equal plugin folder name
                    'type'                => 'plugin',
                    'public_key'          => 'pk_386359d72a70a19723e7dbd13ddf0',
                    'is_premium'          => true,
                    'premium_suffix'      => 'Premium',
                    'has_premium_version' => true,
                    'has_addons'          => false,
                    'has_paid_plans'      => true,
                    'wp_org_gatekeeper'   => 'OA7#BoRiBNqdf52FvzEf!!074aRLPs8fspif$7K1#4u4Csys1fQlCecVcUTOs2mcpeVHi#C2j9d09fOTvbC0HloPT7fFee5WdS3G',
                    'menu'                => array('support' => false),
                ));
            } else {
                $w3_fs = null; // SDK missing; degrade gracefully
            }
        }
        return $w3_fs;
    }

    // Initialize Freemius if available
    $fs = w3_fs();
    if ( $fs ) {
        do_action('w3_fs_loaded');
        $fs->set_basename(true, __FILE__);
    } else {
        // Warn admin if SDK missing
        add_action('admin_notices', function () {
            echo '<div class="notice notice-warning"><p><strong>WP 3D Viewer:</strong> Freemius SDK not found at <code>vendor/freemius/start.php</code>. Premium/licensing features are disabled.</p></div>';
        });
    }
}

/**
 * Shortcode: [wp3dviewer url="https://..."]
 */
function wp3dv_shortcode($atts) {
    $atts = shortcode_atts(array(
        'url' => 'https://plugin-project.vercel.app',
    ), $atts, 'wp3dviewer');

    $color       = get_option('wp3dv_color', '#ff0000');
    $iframe_url  = $atts['url'];

    $style_wrapper = sprintf(
        'border:2px solid %1$s; position:relative; width:100vw; height:100vh; margin:0; padding:0; box-sizing:border-box;',
        esc_attr($color)
    );
    $style_iframe = 'border:none; width:100vw; height:100vh; position:absolute; top:0; left:0;';

    return '<div style="' . esc_attr($style_wrapper) . '">' .
           '<iframe src="' . esc_url($iframe_url) . '" style="' . esc_attr($style_iframe) . '" allowfullscreen></iframe>' .
           '</div>';
}
add_shortcode('wp3dviewer', 'wp3dv_shortcode');

/**
 * Admin Menu
 */
function wp3dv_add_admin_menu() {
    add_options_page(
        'WP 3D Viewer Settings',
        'WP 3D Viewer',
        'manage_options',
        'wp3dv',
        'wp3dv_options_page'
    );
}
add_action('admin_menu', 'wp3dv_add_admin_menu');

/**
 * Settings Registration
 */
function wp3dv_settings_init() {
    register_setting('wp3dv', 'wp3dv_color');
    register_setting('wp3dv', 'wp3dv_material_image');

    add_settings_section(
        'wp3dv_section',
        __('Color & Material Settings', 'wp3dv'),
        '__return_null',
        'wp3dv'
    );

    add_settings_field(
        'wp3dv_color',
        __('Viewer Border Color', 'wp3dv'),
        'wp3dv_color_render',
        'wp3dv',
        'wp3dv_section'
    );

    add_settings_field(
        'wp3dv_material_image',
        __('Material Image', 'wp3dv'),
        'wp3dv_material_image_render',
        'wp3dv',
        'wp3dv_section'
    );
}
add_action('admin_init', 'wp3dv_settings_init');

function wp3dv_color_render() {
    $color = get_option('wp3dv_color', '#ff0000');
    echo '<input type="text" name="wp3dv_color" value="' . esc_attr($color) . '" class="wp-color-picker-field" data-default-color="#ff0000" />';
}

function wp3dv_material_image_render() {
    $image_url = get_option('wp3dv_material_image', '');
    echo '<input type="text" id="wp3dv_material_image" name="wp3dv_material_image" value="' . esc_attr($image_url) . '" style="width:60%" />';
    echo ' <input type="button" class="button" value="Upload Image" id="wp3dv_material_image_upload" />';
    if ($image_url) {
        echo '<div style="margin-top:10px;"><img src="' . esc_url($image_url) . '" style="max-width:200px; max-height:200px;" /></div>';
    }
}

/**
 * Settings Page Output
 */
function wp3dv_options_page() {
    $is_premium = false;
    if ( function_exists('w3_fs') && w3_fs() ) {
        $is_premium = w3_fs()->is_premium();
    }
    ?>
    <div class="wrap">
        <h1>WP 3D Viewer Settings</h1>

        <div style="margin-bottom:20px; padding:10px; border:1px solid #ccc; background:#f9f9f9;">
            <strong>License Status:</strong>
            <?php echo $is_premium ? '<span style="color:green;">Premium (Authenticated)</span>' : '<span style="color:red;">Free (Not Authenticated)</span>'; ?>
        </div>

        <?php if ( function_exists('w3_fs') && w3_fs() && ! $is_premium ) : ?>
            <form method="post" style="margin-bottom:20px;" onsubmit="return false;">
                <button type="button" class="button button-primary" onclick="w3_fs_test_checkout()">Test Checkout (Simulate Premium)</button>
            </form>
            <script>
            function w3_fs_test_checkout() {
                if (typeof window['FS'] !== 'undefined' && window['FS'].Checkout) {
                    window['FS'].Checkout.open({
                        plugin_id: '20648',
                        plan_id: 1,
                        public_key: 'pk_386359d72a70a19723e7dbd13ddf0',
                        is_test: true
                    });
                } else if (typeof w3_fs !== 'undefined' && w3_fs.open_checkout) {
                    w3_fs.open_checkout();
                } else {
                    alert('Freemius Checkout not available. Make sure the SDK is loaded.');
                }
            }
            </script>
        <?php endif; ?>

        <form action="options.php" method="post">
            <?php
            settings_fields('wp3dv');
            do_settings_sections('wp3dv');
            submit_button();
            ?>
        </form>
    </div>
    <script>
    jQuery(document).ready(function($){
        $('.wp-color-picker-field').wpColorPicker();
        // Media uploader for material image
        var mediaUploader;
        $('#wp3dv_material_image_upload').on('click', function(e) {
            e.preventDefault();
            if (mediaUploader) {
                mediaUploader.open();
                return;
            }
            mediaUploader = wp.media.frames.file_frame = wp.media({
                title: 'Select Material Image',
                button: { text: 'Use this image' },
                multiple: false
            });
            mediaUploader.on('select', function() {
                var attachment = mediaUploader.state().get('selection').first().toJSON();
                $('#wp3dv_material_image').val(attachment.url);
            });
            mediaUploader.open();
        });
    });
    </script>
    <?php
}

/**
 * Enqueue color picker + media on our settings screen only
 */
function wp3dv_enqueue_color_picker($hook_suffix) {
    if ($hook_suffix === 'settings_page_wp3dv') {
        wp_enqueue_style('wp-color-picker');
        wp_enqueue_script('wp-color-picker');
        wp_enqueue_media();
    }
}
add_action('admin_enqueue_scripts', 'wp3dv_enqueue_color_picker');

/**
 * Helpful: plugin action links (optional)
 */
function wp3dv_action_links($links) {
    $url = admin_url('options-general.php?page=wp3dv');
    $links[] = '<a href="' . esc_url($url) . '">Settings</a>';
    return $links;
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'wp3dv_action_links');

/** OPTIONAL: pretty rewrite for /media-proxy (still uses ?src=...)
 *  After adding this the first time, visit Settings → Permalinks → Save to flush.
 */
add_action('init', function () {
    add_rewrite_rule('^media-proxy$', 'index.php?media-proxy=1', 'top');
});
/**
 * =====================================================================
 * === END OF FILE
 * =====================================================================
 */