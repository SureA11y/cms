<?php
/**
 * Plugin Name:       SureA11y
 * Description:       An accessibility checker for the block editor: it checks what you write as you write it, in plain language, and never changes what visitors see.
 * Version:           0.1.0
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Author:            SureA11y
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       surea11y
 *
 * @package SureA11y
 */

defined( 'ABSPATH' ) || exit;

define( 'SUREA11Y_VERSION', '0.1.0' );

/**
 * The locales the engine has messages for, besides English, each with its
 * side file in build/.
 */
function surea11y_engine_locales() {
	return array( 'de', 'es', 'fr', 'ja' );
}

/**
 * The editor sidebar. Only people who can edit posts get it; visitors never
 * load anything (the plugin adds nothing to the front end).
 *
 * The engine is not enqueued here: the panel loads it inside its own hidden
 * frame, the first time a check runs.
 */
function surea11y_enqueue_editor_assets() {
	if ( ! current_user_can( 'edit_posts' ) ) {
		return;
	}
	$build = plugins_url( 'build/', __FILE__ );
	$dir   = plugin_dir_path( __FILE__ ) . 'build/';
	if ( ! file_exists( $dir . 'panel.js' ) || ! file_exists( $dir . 'engine.js' ) ) {
		return; // Not built: nothing to load rather than a broken sidebar.
	}

	wp_register_script( 'surea11y-panel', $build . 'panel.js', array(), (string) filemtime( $dir . 'panel.js' ), true );
	wp_enqueue_script(
		'surea11y-editor',
		plugins_url( 'src/editor.js', __FILE__ ),
		array( 'surea11y-panel', 'wp-plugins', 'wp-editor', 'wp-element', 'wp-data', 'wp-blocks', 'wp-block-editor', 'wp-i18n' ),
		SUREA11Y_VERSION,
		true
	);

	$locale  = strtolower( substr( determine_locale(), 0, 2 ) );
	$locales = array();
	if ( in_array( $locale, surea11y_engine_locales(), true ) ) {
		$locales[ $locale ] = $build . 'engine.i18n.' . $locale . '.js?ver=' . filemtime( $dir . 'engine.js' );
	}
	$config = array(
		'engineUrl'  => $build . 'engine.js?ver=' . filemtime( $dir . 'engine.js' ),
		'localeUrls' => $locales,
		'locale'     => $locale,
		'profile'    => 'cms-content',
		'packs'      => array( '@surea11y/pack-cms@' . surea11y_pack_version() ),
	);
	wp_add_inline_script( 'surea11y-editor', 'window.surea11yConfig = ' . wp_json_encode( $config ) . ';', 'before' );
	wp_set_script_translations( 'surea11y-editor', 'surea11y' );
}
add_action( 'enqueue_block_editor_assets', 'surea11y_enqueue_editor_assets' );

/**
 * The version of the CMS pack built into build/engine.js, which a scan names.
 */
function surea11y_pack_version() {
	$file = plugin_dir_path( __FILE__ ) . 'build/pack-version.txt';
	return file_exists( $file ) ? trim( (string) file_get_contents( $file ) ) : '0.0.0'; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- A local file of the plugin's own.
}
