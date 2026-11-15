<?php
/**
 * Plugin Name: SureA11y Probe (Phase 0 prototype)
 * Description: Throwaway prototype. Loads the SureA11y engine in the block editor canvas and on the front end for logged-in users, to measure it. Not for production.
 * Version: 0.0.1
 * License: GPL-2.0-or-later
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueue the engine, its Spanish messages, the "How to check" helper and the
 * probe. `enqueue_block_assets` reaches the editor canvas iframe and the front
 * end; on the front end, only logged-in users get anything.
 */
function surea11y_probe_enqueue() {
	if ( ! is_admin() && ! is_user_logged_in() ) {
		return;
	}
	$base = plugins_url( 'vendor/', __FILE__ );
	$ver  = '1.17.0';
	wp_enqueue_script( 'surea11y-engine', $base . 'surea11y.browser.js', array(), $ver, false );
	wp_enqueue_script( 'surea11y-engine-es', $base . 'surea11y.i18n.es.js', array( 'surea11y-engine' ), $ver, false );
	wp_enqueue_script( 'surea11y-htc', $base . 'how-to-check.js', array(), $ver, false );
	wp_enqueue_script( 'surea11y-probe', plugins_url( 'probe.js', __FILE__ ), array( 'surea11y-engine', 'surea11y-htc' ), $ver, false );
	wp_add_inline_script( 'surea11y-probe', 'window.__sureProbeReviewBase = ' . wp_json_encode( $base . 'review/' ) . ';', 'before' );
}
add_action( 'enqueue_block_assets', 'surea11y_probe_enqueue' );

/**
 * The sandbox experiment runs in the editor's outer window.
 */
function surea11y_probe_editor_outer() {
	wp_enqueue_script( 'surea11y-sandbox', plugins_url( 'sandbox.js', __FILE__ ), array( 'wp-data', 'wp-blocks', 'wp-block-editor' ), '1.17.0', true );
	wp_add_inline_script( 'surea11y-sandbox', 'window.__sureSandbox.init(' . wp_json_encode( plugins_url( 'vendor/', __FILE__ ) ) . ');' );
}
add_action( 'enqueue_block_editor_assets', 'surea11y_probe_editor_outer' );
