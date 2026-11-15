<?php
/**
 * The plugin's settings: who sees the checker and who may review, where the
 * content is on a page, the background check, and rules turned off.
 * Settings → Accessibility checker, for administrators.
 *
 * @package SureA11y
 */

defined( 'ABSPATH' ) || exit;

/**
 * The capabilities a setting can require, from least to most trusted, with
 * the roles that have them in a default WordPress.
 *
 * @return array Capability => label.
 */
function surea11y_capability_choices() {
	return array(
		'edit_posts'        => __( 'Contributors and above (edit_posts)', 'surea11y' ),
		'publish_posts'     => __( 'Authors and above (publish_posts)', 'surea11y' ),
		'edit_others_posts' => __( 'Editors and above (edit_others_posts)', 'surea11y' ),
		'manage_options'    => __( 'Administrators only (manage_options)', 'surea11y' ),
	);
}

/**
 * The default settings.
 *
 * @return array
 */
function surea11y_default_settings() {
	return array(
		'see_cap'          => 'edit_posts',
		'review_cap'       => 'publish_posts',
		'content_selector' => '.wp-block-post-content, .entry-content, .post-content',
		'background'       => true,
		'disabled_rules'   => array(),
	);
}

/**
 * The settings, with defaults for anything not saved.
 *
 * @return array
 */
function surea11y_settings() {
	$saved = get_option( 'surea11y_settings', array() );
	return array_merge( surea11y_default_settings(), is_array( $saved ) ? $saved : array() );
}

/**
 * The rules a check can run, as the build wrote them: [ { id, title, content } ].
 *
 * @return array
 */
function surea11y_known_rules() {
	static $rules = null;
	if ( null === $rules ) {
		$file  = plugin_dir_path( SUREA11Y_FILE ) . 'build/rules.json';
		$rules = file_exists( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : array(); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- A local file of the plugin's own.
		$rules = is_array( $rules ) ? $rules : array();
	}
	return $rules;
}

/**
 * A rule's title for editors, in the person's language: the plain title
 * from the build (the panel's rule-titles.<locale>.json), else the English
 * one, else core's.
 *
 * @param array $rule A rule from surea11y_known_rules().
 * @return string
 */
function surea11y_rule_title( $rule ) {
	$locale = strtolower( substr( determine_locale(), 0, 2 ) );
	$titles = isset( $rule['titles'] ) && is_array( $rule['titles'] ) ? $rule['titles'] : array();
	if ( ! empty( $titles[ $locale ] ) ) {
		return $titles[ $locale ];
	}
	if ( ! empty( $titles['en'] ) ) {
		return $titles['en'];
	}
	return isset( $rule['title'] ) ? $rule['title'] : ( isset( $rule['id'] ) ? $rule['id'] : '' );
}

/**
 * Cleans what the settings form sends: only known capabilities and rules,
 * a selector without markup, a yes or no.
 *
 * @param mixed $input The submitted settings.
 * @return array
 */
function surea11y_sanitize_settings( $input ) {
	$input    = is_array( $input ) ? $input : array();
	$defaults = surea11y_default_settings();
	$caps     = array_keys( surea11y_capability_choices() );
	$out      = array();

	foreach ( array( 'see_cap', 'review_cap' ) as $key ) {
		$value       = isset( $input[ $key ] ) ? sanitize_key( $input[ $key ] ) : '';
		$out[ $key ] = in_array( $value, $caps, true ) ? $value : $defaults[ $key ];
	}

	$selector = isset( $input['content_selector'] ) ? sanitize_text_field( wp_unslash( $input['content_selector'] ) ) : '';
	$selector = trim( str_replace( array( '<', '>', '{', '}' ), '', $selector ) );
	if ( strlen( $selector ) > 300 ) {
		$selector = substr( $selector, 0, 300 );
	}
	$out['content_selector'] = '' !== $selector ? $selector : $defaults['content_selector'];

	$out['background'] = ! empty( $input['background'] );

	$known = wp_list_pluck( surea11y_known_rules(), 'id' );
	$off   = isset( $input['disabled_rules'] ) && is_array( $input['disabled_rules'] ) ? array_map( 'sanitize_text_field', $input['disabled_rules'] ) : array();
	// The form lists every rule as a checkbox that is on when the rule runs:
	// what is not ticked is off.
	if ( isset( $input['rules_listed'] ) ) {
		$on  = isset( $input['rules_on'] ) && is_array( $input['rules_on'] ) ? array_map( 'sanitize_text_field', $input['rules_on'] ) : array();
		$off = array_diff( $known, $on );
	}
	$out['disabled_rules'] = array_values( array_intersect( $known, $off ) );

	return $out;
}

/**
 * Registers the setting and the page.
 */
function surea11y_register_settings() {
	register_setting(
		'surea11y',
		'surea11y_settings',
		array(
			'type'              => 'array',
			'sanitize_callback' => 'surea11y_sanitize_settings',
			'default'           => surea11y_default_settings(),
			'show_in_rest'      => false,
		)
	);
}
add_action( 'admin_init', 'surea11y_register_settings' );

/**
 * Settings → Accessibility checker.
 */
function surea11y_settings_menu() {
	add_options_page(
		__( 'Accessibility checker', 'surea11y' ),
		__( 'Accessibility checker', 'surea11y' ),
		'manage_options',
		'surea11y',
		'surea11y_render_settings'
	);
}
add_action( 'admin_menu', 'surea11y_settings_menu' );

/**
 * A select of capabilities, with its label.
 *
 * @param string $key   The setting.
 * @param string $label The visible label.
 * @param string $help  The description under it.
 * @param array  $now   The settings.
 */
function surea11y_capability_field( $key, $label, $help, $now ) {
	$id = 'surea11y-' . $key;
	echo '<tr><th scope="row"><label for="' . esc_attr( $id ) . '">' . esc_html( $label ) . '</label></th><td>';
	echo '<select id="' . esc_attr( $id ) . '" name="surea11y_settings[' . esc_attr( $key ) . ']" aria-describedby="' . esc_attr( $id ) . '-help">';
	foreach ( surea11y_capability_choices() as $cap => $text ) {
		echo '<option value="' . esc_attr( $cap ) . '"' . selected( $now[ $key ], $cap, false ) . '>' . esc_html( $text ) . '</option>';
	}
	echo '</select><p class="description" id="' . esc_attr( $id ) . '-help">' . esc_html( $help ) . '</p></td></tr>';
}

/**
 * The settings page: WordPress's own form markup, with labels for every
 * field and the rules in a fieldset with a legend.
 */
function surea11y_render_settings() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$now   = surea11y_settings();
	$rules = surea11y_known_rules();
	$off   = array_flip( $now['disabled_rules'] );

	echo '<div class="wrap"><h1>' . esc_html__( 'Accessibility checker', 'surea11y' ) . '</h1>';
	echo '<p>' . esc_html__( 'SureA11y checks content as it is written and on its pages, for the people who edit it. It never changes what visitors see.', 'surea11y' ) . '</p>';
	echo '<form method="post" action="options.php">';
	settings_fields( 'surea11y' );

	echo '<h2>' . esc_html__( 'Who', 'surea11y' ) . '</h2><table class="form-table" role="presentation">';
	surea11y_capability_field( 'see_cap', __( 'Who sees the checker', 'surea11y' ), __( 'People with this capability get the checker in the editor and on the pages they can edit.', 'surea11y' ), $now );
	surea11y_capability_field( 'review_cap', __( 'Who can review findings', 'surea11y' ), __( 'People with this capability can mark a finding "Reviewed, it\'s fine", for everyone who edits the post, and reopen a review. Anyone who sees the checker can hide a finding for themselves.', 'surea11y' ), $now );
	echo '</table>';

	echo '<h2>' . esc_html__( 'Where and when', 'surea11y' ) . '</h2><table class="form-table" role="presentation">';
	echo '<tr><th scope="row"><label for="surea11y-content-selector">' . esc_html__( 'Where the content is on a page', 'surea11y' ) . '</label></th><td>';
	echo '<input type="text" class="regular-text code" id="surea11y-content-selector" name="surea11y_settings[content_selector]" value="' . esc_attr( $now['content_selector'] ) . '" aria-describedby="surea11y-content-selector-help">';
	echo '<p class="description" id="surea11y-content-selector-help">' . esc_html__( 'A CSS selector for the post\'s content in your theme. On a page, findings inside it are marked "Your content", the rest "Theme or template".', 'surea11y' ) . '</p></td></tr>';
	echo '<tr><th scope="row">' . esc_html__( 'Background check', 'surea11y' ) . '</th><td>';
	echo '<label for="surea11y-background"><input type="checkbox" id="surea11y-background" name="surea11y_settings[background]" value="1"' . checked( $now['background'], true, false ) . ' aria-describedby="surea11y-background-help"> ' . esc_html__( 'Check while the sidebar is closed', 'surea11y' ) . '</label>';
	echo '<p class="description" id="surea11y-background-help">' . esc_html__( 'For the count on the toolbar button and the line in the checks before publishing. Turned off, the editor checks only while the sidebar is open.', 'surea11y' ) . '</p></td></tr>';
	echo '</table>';

	echo '<h2>' . esc_html__( 'Rules', 'surea11y' ) . '</h2>';
	echo '<fieldset><legend class="screen-reader-text">' . esc_html__( 'Rules to check', 'surea11y' ) . '</legend>';
	echo '<p id="surea11y-rules-help">' . esc_html__( 'Untick a rule to stop checking it, in the editor and on pages. Rules marked "theme" only run on pages.', 'surea11y' ) . '</p>';
	echo '<input type="hidden" name="surea11y_settings[rules_listed]" value="1">';
	// Each rule by its title, and its id on a second line in smaller text,
	// for whoever needs to look it up. Both are the label, so either ticks
	// the box.
	echo '<ul class="surea11y-rules" aria-describedby="surea11y-rules-help" style="columns: 2 26em; column-gap: 32px;">';
	foreach ( $rules as $rule ) {
		$id = 'surea11y-rule-' . sanitize_html_class( $rule['id'] );
		echo '<li style="break-inside: avoid; margin-bottom: 10px;"><label for="' . esc_attr( $id ) . '" style="display: flex; gap: 4px; align-items: flex-start;"><input type="checkbox" id="' . esc_attr( $id ) . '" name="surea11y_settings[rules_on][]" value="' . esc_attr( $rule['id'] ) . '"' . checked( ! isset( $off[ $rule['id'] ] ), true, false ) . ' style="margin-top: 2px;"> ';
		echo '<span>' . esc_html( surea11y_rule_title( $rule ) ) . ( empty( $rule['content'] ) ? ' (' . esc_html__( 'theme', 'surea11y' ) . ')' : '' );
		echo '<br><span class="description" style="font-size: 12px;">' . esc_html( $rule['id'] ) . '</span></span></label></li>';
	}
	echo '</ul></fieldset>';

	submit_button();
	echo '</form></div>';
}

/**
 * Whether the current person sees the checker at all.
 *
 * @return bool
 */
function surea11y_can_see() {
	$settings = surea11y_settings();
	return current_user_can( 'edit_posts' ) && current_user_can( $settings['see_cap'] );
}

/**
 * Whether the current person can review findings on a post.
 *
 * @param int $post_id The post.
 * @return bool
 */
function surea11y_can_review( $post_id ) {
	$settings = surea11y_settings();
	return $post_id && current_user_can( 'edit_post', $post_id ) && current_user_can( $settings['review_cap'] );
}
