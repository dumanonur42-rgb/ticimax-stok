<?php
/**
 * Plugin Name: Yamansa Hareket
 * Description: Hafif site hareketi ölçümü.
 * Version: 1.0.2
 */

defined('ABSPATH') || exit;

const YAMANSA_HAREKET_ASSET = 'yb-track.woo.e146ef9b66.min.js';

add_action('wp_enqueue_scripts', static function (): void {
    wp_enqueue_script(
        'yamansa-hareket',
        plugin_dir_url(__FILE__) . 'assets/' . YAMANSA_HAREKET_ASSET,
        [],
        null,
        true
    );
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
        $excluded[] = YAMANSA_HAREKET_ASSET;
        return array_values(array_unique($excluded));
    });
}
