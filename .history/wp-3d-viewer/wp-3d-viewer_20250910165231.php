<?php


// TEST API JSON Return using http://michaels1255.sg-host.com/wp-json/wp3d/v1/premium
// REST API endpoint to check premium status
    register_rest_route('wp3d/v1', '/premium', array(
        'methods' => 'GET',
        'callback' => 'wp3dv_rest_check_premium',
        'permission_callback' => '__return_true', // For dev/testing; restrict in production!
    ));
    register_rest_route('wp3d/v1', '/settings', array(
        'methods' => 'GET',
        'callback' => 'wp3dv_rest_get_settings',
        'permission_callback' => '__return_true',
    ));
});
    $is_premium = false;
    if ( function_exists('w3_fs') && w3_fs() ) {
        $is_premium = w3_fs()->is_premium();
    }
    return array(
        'premium' => $is_premium,
    );
function wp3dv_rest_check_premium($request) {
    $is_premium = false;
    if ( function_exists('w3_fs') && w3_fs() ) {
        $is_premium = w3_fs()->is_premium();
    }
    return array(
        'premium' => $is_premium,
    );
}

function wp3dv_rest_get_settings($request) {
    $is_premium = false;
    if ( function_exists('w3_fs') && w3_fs() ) {
        $is_premium = w3_fs()->is_premium();
    }
    $object244_color = get_option('wp3dv_color', '#0b3b7a');
    $material_image = get_option('wp3dv_material_image', '');
    return array(
        'premium' => $is_premium,
        'object244Color' => $object244_color,
        'materialImage' => $material_image,
    );
}

/*
Plugin Name: WP 3D Viewer
Description: Embed a 3D Viewer or Vercel app via shortcode. Includes a basic settings page with a color picker and Freemius licensing.
Version: 0.1.1
Author: MetricMike1991
*/

defined('ABSPATH') || exit;

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
                    // If you're not distributing via wp.org builder, you can remove the next line.
                    'wp_org_gatekeeper'   => 'OA7#BoRiBNqdf52FvzEf!!074aRLPs8fspif$7K1#4u4Csys1fQlCecVcUTOs2mcpeVHi#C2j9d09fOTvbC0HloPT7fFee5WdS3G',
                    'menu'                => array(
                        'support' => false,
                    ),
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
 * Shortcode: [wp3dviewer]
 * Renders a full-viewport iframe bordered with selected color.
 */
function wp3dv_shortcode($atts) {
    $atts = shortcode_atts(array(
        'url' => 'https://plugin-project.vercel.app', // allow override via shortcode attr
    ), $atts, 'wp3dviewer');

    $color = get_option('wp3dv_color', '#ff0000');
    $iframe_url = $atts['url'];

    $style_wrapper = sprintf(
        'border:2px solid %1$s; position:relative; width:100vw; height:100vh; margin:0; padding:0; box-sizing:border-box;',
        esc_attr($color)
    );
    $style_iframe = 'border:none; width:100vw; height:100vh; position:absolute; top:0; left:0;';

    return '<div style="' . $style_wrapper . '">' .
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
        'manage_options',        // keep admin-only
        'wp3dv',
        'wp3dv_options_page'
    );
}
add_action('admin_menu', 'wp3dv_add_admin_menu');

/**
 * Settings Registration
 */
// ...existing code...
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

    $color = get_option('wp3dv_color', '#ff0000');
    echo '<input type="text" name="wp3dv_color" value="' . esc_attr($color) . '" class="wp-color-picker-field" data-default-color="#ff0000" />';
    $image_url = get_option('wp3dv_material_image', '');
    echo '<input type="text" id="wp3dv_material_image" name="wp3dv_material_image" value="' . esc_attr($image_url) . '" style="width:60%" />';
    echo '<input type="button" class="button" value="Upload Image" id="wp3dv_material_image_upload" />';
    if ($image_url) {
        echo '<div style="margin-top:10px;"><img src="' . esc_url($image_url) . '" style="max-width:200px; max-height:200px;" /></div>';
    }
function wp3dv_color_render() {
    $color = get_option('wp3dv_color', '#ff0000');
    echo '<input type="text" name="wp3dv_color" value="' . esc_attr($color) . '" class="wp-color-picker-field" data-default-color="#ff0000" />';
}

function wp3dv_material_image_render() {
    $image_url = get_option('wp3dv_material_image', '');
    echo '<input type="text" id="wp3dv_material_image" name="wp3dv_material_image" value="' . esc_attr($image_url) . '" style="width:60%" />';
    echo '<input type="button" class="button" value="Upload Image" id="wp3dv_material_image_upload" />';
    if ($image_url) {
        echo '<div style="margin-top:10px;"><img src="' . esc_url($image_url) . '" style="max-width:200px; max-height:200px;" /></div>';
    }
}
}

/**
 * Settings Page Output
 */
    ?>
    <div class="wrap">
        <h1>WP 3D Viewer Settings</h1>
        <?php
        $is_premium = false;
        if ( function_exists('w3_fs') && w3_fs() ) {
            $is_premium = w3_fs()->is_premium();
        }
        ?>
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
                // Prefer Freemius Checkout if SDK injected it
                if (typeof window['FS'] !== 'undefined' && window['FS'].Checkout) {
                    window['FS'].Checkout.open({
                        plugin_id: '20648',
                        plan_id: 1, // Replace with your test plan ID
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
 * Enqueue color picker assets on our settings screen only
 */
    if ($hook_suffix === 'settings_page_wp3dv') {
        wp_enqueue_style('wp-color-picker');
        wp_enqueue_script('wp-color-picker');
    }
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

// To simulate false authentication, deactivate or remove the license key from Freemius in the plugin settings or via the Freemius dashboard.