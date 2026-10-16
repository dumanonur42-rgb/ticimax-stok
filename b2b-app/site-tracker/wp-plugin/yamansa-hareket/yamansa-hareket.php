<?php
/**
 * Plugin Name: Yamansa Hareket
 * Description: Hafif site hareketi ölçümü.
 * Version: 1.0.0
 */

defined('ABSPATH') || exit;

add_action('wp_enqueue_scripts', static function (): void {
    $file = plugin_dir_path(__FILE__) . 'assets/yb-track.woo.min.js';
    wp_enqueue_script('yamansa-hareket', plugin_dir_url(__FILE__) . 'assets/yb-track.woo.min.js', [], is_file($file) ? (string) filemtime($file) : '1.0.0', true);
}, 99);

add_filter('script_loader_tag', static function (string $tag, string $handle): string {
    if ($handle !== 'yamansa-hareket') {
        return $tag;
    }
    return str_replace('<script ', '<script defer data-no-optimize="1" data-no-defer="1" data-no-minify="1" data-cfasync="false" ', $tag);
}, 10, 2);

foreach (['litespeed_optm_js_defer_exc', 'litespeed_optm_js_delay_exc', 'rocket_exclude_defer_js', 'rocket_exclude_delay_js'] as $filter) {
    add_filter($filter, static function ($excluded): array {
        $excluded = is_array($excluded) ? $excluded : [];
        $excluded[] = 'yb-track.woo.min.js';
        return array_values(array_unique($excluded));
    });
}
