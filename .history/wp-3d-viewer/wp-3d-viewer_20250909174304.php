<?php
/*
Plugin Name: WP 3D Viewer
Description: Embed a 3D Viewer or Vercel app via shortcode. Includes a basic settings page with a color picker.
Version: 0.1
Author: MetricMike1991
*/

if ( ! function_exists( 'w3_fs' ) ) {
    // Create a helper function for easy SDK access.
    function w3_fs() {
        global $w3_fs;

        if ( ! isset( $w3_fs ) ) {
            // Include Freemius SDK.
            require_once dirname( __FILE__ ) . '/vendor/freemius/start.php';
            $w3_fs = fs_dynamic_init( array(
                'id'                  => '20648',
                'slug'                => 'wp-3d',
                'type'                => 'plugin',
                'public_key'          => 'pk_386359d72a70a19723e7dbd13ddf0',
                'is_premium'          => true,
                'premium_suffix'      => 'Premium',
                // If your plugin is a serviceware, set this option to false.
                'has_premium_version' => true,
                'has_addons'          => false,
                'has_paid_plans'      => true,
                // Automatically removed in the free version. If you're not using the
                // auto-generated free version, delete this line before uploading to wp.org.
                'wp_org_gatekeeper'   => 'OA7#BoRiBNqdf52FvzEf!!074aRLPs8fspif$7K1#4u4Csys1fQlCecVcUTOs2mcpeVHi#C2j9d09fOTvbC0HloPT7fFee5WdS3G',
                'menu'                => array(
                    'support'        => false,
                ),
            ) );
        }

        return $w3_fs;
    }

    // Init Freemius.
    w3_fs();
    // Signal that SDK was initiated.
    do_action( 'w3_fs_loaded' );
}


<?php
/*
Plugin Name: WP 3D
Description: Embed a 3D Viewer or Vercel app via shortcode. Includes a basic settings page with a color picker.
Version: 0.1
Author: MetricMike1991
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'w3_fs' ) ) {
    w3_fs()->set_basename( true, __FILE__ );
} else {
    if ( ! function_exists( 'w3_fs' ) ) {
        // Freemius integration snippet
        function w3_fs() {
            global $w3_fs;
            if ( ! isset( $w3_fs ) ) {
                require_once dirname( __FILE__ ) . '/vendor/freemius/start.php';
                $w3_fs = fs_dynamic_init( array(
                    'id'                  => '20648',
                    'slug'                => 'wp-3d',
                    'type'                => 'plugin',
                    'public_key'          => 'pk_386359d72a70a19723e7dbd13ddf0',
                    'is_premium'          => true,
                    'premium_suffix'      => 'Premium',
                    'has_premium_version' => true,
                    'has_addons'          => false,
                    'has_paid_plans'      => true,
                    'wp_org_gatekeeper'   => 'OA7#BoRiBNqdf52FvzEf!!074aRLPs8fspif$7K1#4u4Csys1fQlCecVcUTOs2mcpeVHi#C2j9d09fOTvbC0HloPT7fFee5WdS3G',
                    'menu'                => array(
                        'support'        => false,
                    ),
                ) );
            }
            return $w3_fs;
        }
        w3_fs();
        do_action( 'w3_fs_loaded' );
    }
}

// Register shortcode
function wp3dv_shortcode($atts) {
    $color = get_option('wp3dv_color', '#ff0000');
    $iframe_url = 'https://plugin-project.vercel.app'; // Vercel app URL
    return '<div style="border:2px solid ' . esc_attr($color) . '; position:relative; width:100vw; height:100vh; margin:0; padding:0; box-sizing:border-box;">'
        . '<iframe src="' . esc_url($iframe_url) . '" style="border:none; width:100vw; height:100vh; position:absolute; top:0; left:0;" allowfullscreen></iframe>'
        . '</div>';
}
add_shortcode('wp3dviewer', 'wp3dv_shortcode');

// Add settings page
function wp3dv_add_admin_menu() {
    add_options_page('WP 3D Viewer Settings', 'WP 3D Viewer', 'manage_options', 'wp3dv', 'wp3dv_options_page');
}
add_action('admin_menu', 'wp3dv_add_admin_menu');

// Register setting
function wp3dv_settings_init() {
    register_setting('wp3dv', 'wp3dv_color');

    add_settings_section(
        'wp3dv_section',
        __('Color Settings', 'wp3dv'),
        null,
        'wp3dv'
    );

    add_settings_field(
        'wp3dv_color',
        __('Viewer Border Color', 'wp3dv'),
        'wp3dv_color_render',
        'wp3dv',
        'wp3dv_section'
    );
}
add_action('admin_init', 'wp3dv_settings_init');

function wp3dv_color_render() {
    $color = get_option('wp3dv_color', '#ff0000');
    echo '<input type="text" name="wp3dv_color" value="' . esc_attr($color) . '" class="wp-color-picker-field" data-default-color="#ff0000" />';
}

function wp3dv_options_page() {
    ?>
    <div class="wrap">
        <h1>WP 3D Viewer Settings</h1>
        <?php
        // Freemius premium status check
        $is_premium = false;
        if ( function_exists('w3_fs') ) {
            $is_premium = w3_fs()->is_premium();
        }
        ?>
        <div style="margin-bottom:20px; padding:10px; border:1px solid #ccc; background:#f9f9f9;">
            <strong>License Status:</strong> <?php echo $is_premium ? '<span style="color:green;">Premium (Authenticated)</span>' : '<span style="color:red;">Free (Not Authenticated)</span>'; ?>
        </div>
        <?php if ( function_exists('w3_fs') && ! $is_premium ) : ?>
        <form method="post" style="margin-bottom:20px;">
            <button type="button" class="button button-primary" onclick="w3_fs_test_checkout()">Test Checkout (Simulate Premium)</button>
        </form>
        <script>
        function w3_fs_test_checkout() {
            if (typeof window['FS'] !== 'undefined' && window['FS'].Checkout) {
                window['FS'].Checkout.open({
                    plugin_id: '20648',
                    plan_id: 1, // Use your test plan ID
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
    });
    </script>
    <?php
}

// Enqueue color picker
function wp3dv_enqueue_color_picker($hook_suffix) {
    if ($hook_suffix === 'settings_page_wp3dv') {
        wp_enqueue_style('wp-color-picker');
        wp_enqueue_script('wp-color-picker');
    }
}
add_action('admin_enqueue_scripts', 'wp3dv_enqueue_color_picker');
