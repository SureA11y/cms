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
define( 'SUREA11Y_FILE', __FILE__ );

require_once __DIR__ . '/includes/settings.php';
require_once __DIR__ . '/includes/reviews.php';
require_once __DIR__ . '/includes/hidden.php';
require_once __DIR__ . '/includes/evidence.php';
require_once __DIR__ . '/includes/overview.php';
require_once __DIR__ . '/includes/columns.php';
require_once __DIR__ . '/includes/site-editor.php';
require_once __DIR__ . '/includes/privacy.php';

/**
 * The locales the engine has messages for, besides English, each with its
 * side file in build/.
 */
function surea11y_engine_locales() {
	return array( 'de', 'es', 'fr', 'ja' );
}

/**
 * Whether the plugin is built: without its build/ files nothing is loaded,
 * rather than a broken checker.
 */
function surea11y_is_built() {
	$dir = plugin_dir_path( __FILE__ ) . 'build/';
	return file_exists( $dir . 'panel.js' ) && file_exists( $dir . 'engine.js' );
}

/**
 * What every checker needs to know: where the engine is, in which language
 * to speak, which profile and pack to check with, the rules turned off, and
 * the post's reviews and who may add them.
 *
 * @param string $profile The engine profile to check with.
 * @param int    $post_id The post being checked (0 for none yet).
 * @return array
 */
function surea11y_config( $profile, $post_id = 0 ) {
	$settings = surea11y_settings();
	$build   = plugins_url( 'build/', __FILE__ );
	$dir     = plugin_dir_path( __FILE__ ) . 'build/';
	$version = (string) filemtime( $dir . 'engine.js' );
	$locale  = strtolower( substr( determine_locale(), 0, 2 ) );
	$locales = array();
	// How to check a finding by hand: English, which brings the helper that
	// reads them, then the person's language. Loaded on the first question.
	$review = array( $build . 'review.en.js?ver=' . $version );
	if ( in_array( $locale, surea11y_engine_locales(), true ) ) {
		$locales[ $locale ] = $build . 'engine.i18n.' . $locale . '.js?ver=' . $version;
		$review[]           = $build . 'review.' . $locale . '.js?ver=' . $version;
	}
	return array(
		'engineUrl'  => $build . 'engine.js?ver=' . $version,
		'localeUrls' => $locales,
		'locale'     => $locale,
		'profile'       => $profile,
		'packs'         => array( '@surea11y/pack-cms@' . surea11y_pack_version() ),
		'disabledRules' => $settings['disabled_rules'],
		'background'    => (bool) $settings['background'],
		'postId'        => (int) $post_id,
		'canReview'     => surea11y_can_review( $post_id ),
		'reviewsPath'   => $post_id ? '/surea11y/v1/reviews/' . (int) $post_id : '',
		'reviewUrls'    => $review,
		// The evidence trail: where records of checks go, and the engine's
		// version they name.
		'evidencePath'  => $post_id ? '/surea11y/v1/evidence/' . (int) $post_id : '',
		'engineVersion' => surea11y_core_version(),
	);
}

/**
 * The configuration for the scripts, printed as JSON data rather than as a
 * script, so sites with a strict Content Security Policy work: data is not
 * code, and a policy that forbids inline scripts allows it.
 *
 * @var array|null
 */
$GLOBALS['surea11y_config'] = null;

/**
 * Prints the configuration, once, before the footer scripts that read it.
 */
function surea11y_print_config() {
	if ( empty( $GLOBALS['surea11y_config'] ) ) {
		return;
	}
	printf(
		'<script type="application/json" id="surea11y-config">%s</script>' . "\n",
		wp_json_encode( $GLOBALS['surea11y_config'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES )
	);
	$GLOBALS['surea11y_config'] = null;
}
add_action( 'admin_footer', 'surea11y_print_config', 5 );
add_action( 'wp_footer', 'surea11y_print_config', 5 );

/**
 * Registers the panel's script, which both checkers use, and the file with
 * its words in the person's language when that is not English. Returns the
 * handle the checker's own script depends on.
 *
 * @return string
 */
function surea11y_register_panel() {
	$dir = plugin_dir_path( __FILE__ ) . 'build/';
	wp_register_script( 'surea11y-panel', plugins_url( 'build/panel.js', __FILE__ ), array(), (string) filemtime( $dir . 'panel.js' ), true );
	$locale = strtolower( substr( determine_locale(), 0, 2 ) );
	$file   = 'panel.i18n.' . $locale . '.js';
	if ( in_array( $locale, surea11y_engine_locales(), true ) && file_exists( $dir . $file ) ) {
		wp_register_script( 'surea11y-panel-i18n', plugins_url( 'build/' . $file, __FILE__ ), array( 'surea11y-panel' ), (string) filemtime( $dir . $file ), true );
		return 'surea11y-panel-i18n';
	}
	return 'surea11y-panel';
}

/**
 * The editor sidebar, the toolbar count and the pre-publish line. Only
 * people who can edit posts get them.
 *
 * The engine is not enqueued here: the panel loads it inside its own hidden
 * frame, the first time a check runs.
 */
function surea11y_enqueue_editor_assets() {
	if ( ! surea11y_can_see() || ! surea11y_is_built() ) {
		return;
	}
	$panel = surea11y_register_panel();
	wp_enqueue_script(
		'surea11y-editor',
		plugins_url( 'src/editor.js', __FILE__ ),
		array( $panel, 'wp-api-fetch', 'wp-plugins', 'wp-editor', 'wp-element', 'wp-data', 'wp-blocks', 'wp-block-editor', 'wp-components', 'wp-hooks', 'wp-i18n', 'wp-preferences' ),
		SUREA11Y_VERSION,
		true
	);
	wp_enqueue_style( 'surea11y-editor', plugins_url( 'src/editor.css', __FILE__ ), array(), SUREA11Y_VERSION );
	wp_set_script_translations( 'surea11y-editor', 'surea11y' );
	$GLOBALS['surea11y_config'] = surea11y_config( 'cms-content', (int) get_the_ID() );
	// In the Site Editor, templates and template parts are rendered on the
	// server (includes/site-editor.php) and checked with the page profile:
	// the theme's rules and the content rules, since a template has images,
	// headings, links and colours too.
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( $screen && 'site-editor' === $screen->id && surea11y_render_permission() ) {
		$GLOBALS['surea11y_config']['renderPath']      = '/surea11y/v1/render';
		$GLOBALS['surea11y_config']['templateProfile'] = 'cms-page';
	}
}
add_action( 'enqueue_block_editor_assets', 'surea11y_enqueue_editor_assets' );

/**
 * Whether the page checker is offered on this request: a single post or page
 * (published or a preview) that the current person can edit. Visitors, and
 * people who can't edit this post, get nothing.
 *
 * @return int The post's ID, or 0.
 */
function surea11y_page_post_id() {
	if ( is_admin() || ! is_singular() || ! surea11y_is_built() ) {
		return 0;
	}
	$post_id = (int) get_queried_object_id();
	return ( $post_id && surea11y_can_see() && current_user_can( 'edit_post', $post_id ) ) ? $post_id : 0;
}

/**
 * Where the post's content is on the page, so findings there are told apart
 * from the theme's: the setting (block themes and most classic themes use
 * the default), which the `surea11y_content_selector` filter can change.
 *
 * @return string A CSS selector.
 */
function surea11y_content_selector() {
	$settings = surea11y_settings();
	return (string) apply_filters( 'surea11y_content_selector', $settings['content_selector'] );
}

/**
 * The page checker: a small script that waits until it is asked for. The
 * engine loads only when someone opens the checker.
 */
function surea11y_enqueue_page_assets() {
	$post_id = surea11y_page_post_id();
	if ( ! $post_id ) {
		return;
	}
	$panel = surea11y_register_panel();
	wp_enqueue_script( 'surea11y-page', plugins_url( 'src/page.js', __FILE__ ), array( $panel ), SUREA11Y_VERSION, true );
	$user = wp_get_current_user();
	$GLOBALS['surea11y_config'] = array_merge(
		surea11y_config( 'cms-page', $post_id ),
		array(
			// The page has no editor around it: the reviews come with it, and
			// changes go through the REST API with the cookie nonce.
			'reviews'         => surea11y_reviews_for_display( $post_id ),
			'reviewer'        => $user ? $user->display_name : '',
			// "Hide for me", the same as in the editor's preferences.
			'hidden'          => surea11y_hidden_keys( $post_id ),
			'hiddenPath'      => '/surea11y/v1/hidden/' . (int) $post_id,
			'restRoot'        => esc_url_raw( rest_url() ),
			'restNonce'       => wp_create_nonce( 'wp_rest' ),
			'contentSelector' => surea11y_content_selector(),
			'editUrl'         => (string) get_edit_post_link( $post_id, 'raw' ),
			'title'           => __( 'Accessibility', 'surea11y' ),
			'launch'          => __( 'Check accessibility', 'surea11y' ),
		)
	);
}
add_action( 'wp_enqueue_scripts', 'surea11y_enqueue_page_assets' );

/**
 * "Check accessibility" in the toolbar at the top of the page, for people
 * who can edit it. Without the toolbar, the script adds a button instead.
 *
 * @param WP_Admin_Bar $bar The toolbar.
 */
function surea11y_admin_bar( $bar ) {
	if ( ! surea11y_page_post_id() ) {
		return;
	}
	$bar->add_node(
		array(
			'id'    => 'surea11y',
			'title' => '<span class="ab-icon dashicons dashicons-universal-access-alt" aria-hidden="true"></span><span class="ab-label">' . esc_html__( 'Check accessibility', 'surea11y' ) . '</span>',
			'href'  => '#surea11y',
			'meta'  => array( 'class' => 'surea11y-admin-bar' ),
		)
	);
}
add_action( 'admin_bar_menu', 'surea11y_admin_bar', 90 );

/**
 * The version of the CMS pack built into build/engine.js, which a scan names.
 */
function surea11y_pack_version() {
	$file = plugin_dir_path( __FILE__ ) . 'build/pack-version.txt';
	return file_exists( $file ) ? trim( (string) file_get_contents( $file ) ) : '0.0.0'; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- A local file of the plugin's own.
}

/**
 * The engine's (core's) version, from the build.
 *
 * @return string
 */
function surea11y_core_version() {
	$file = plugin_dir_path( __FILE__ ) . 'build/core-version.txt';
	return file_exists( $file ) ? trim( (string) file_get_contents( $file ) ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- A local file of the plugin's own.
}
