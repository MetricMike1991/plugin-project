<?php
/*
Plugin Name: WP 3D Viewer
Description: Embed a 3D Viewer or Vercel app via shortcode. Includes a basic settings page with a color picker.
Version: 0.1
Author: MetricMike1991
*/

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
