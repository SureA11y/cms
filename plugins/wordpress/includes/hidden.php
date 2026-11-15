<?php
/**
 * "Hide for me": findings one person has set aside, per post. The editor
 * keeps them in that person's editor preferences (core/preferences, saved
 * to the user meta `persisted_preferences`). The page checker has no editor
 * around it, so it reads and changes the same entry through
 * /wp-json/surea11y/v1/hidden/<post>: a hide made on the page is there in
 * the editor, and the other way round.
 *
 * @package SureA11y
 */

defined( 'ABSPATH' ) || exit;

const SUREA11Y_MAX_HIDDEN = 500; // Per post and person, as in the editor.

/** The user meta the editor's preferences are kept in, for this site. */
function surea11y_preferences_meta_key() {
	global $wpdb;
	return $wpdb->get_blog_prefix() . 'persisted_preferences';
}

/**
 * The finding keys the current person hid on a post.
 *
 * @param int $post_id The post.
 * @return array
 */
function surea11y_hidden_keys( $post_id ) {
	$prefs = get_user_meta( get_current_user_id(), surea11y_preferences_meta_key(), true );
	$fine  = is_array( $prefs ) && isset( $prefs['surea11y']['fine'] ) && is_array( $prefs['surea11y']['fine'] ) ? $prefs['surea11y']['fine'] : array();
	$keys  = isset( $fine[ (string) $post_id ] ) && is_array( $fine[ (string) $post_id ] ) ? $fine[ (string) $post_id ] : array();
	return array_values( array_filter( $keys, 'is_string' ) );
}

/**
 * Hides findings for the current person, or shows them again. Only this
 * plugin's entry changes; the other preferences stay as they are. The
 * modified time is set to now, so the editor takes these over a copy it
 * kept in the browser.
 *
 * @param int   $post_id The post.
 * @param array $keys    Finding keys.
 * @param bool  $hidden  True to hide, false to show again.
 * @return array The post's hidden keys now.
 */
function surea11y_set_hidden( $post_id, $keys, $hidden ) {
	$user_id = get_current_user_id();
	$meta    = surea11y_preferences_meta_key();
	$prefs   = get_user_meta( $user_id, $meta, true );
	$prefs   = is_array( $prefs ) ? $prefs : array();
	$now     = surea11y_hidden_keys( $post_id );
	$now     = $hidden ? array_merge( array_diff( $now, $keys ), $keys ) : array_diff( $now, $keys );
	$now     = array_slice( array_values( $now ), -SUREA11Y_MAX_HIDDEN );

	if ( ! isset( $prefs['surea11y'] ) || ! is_array( $prefs['surea11y'] ) ) {
		$prefs['surea11y'] = array();
	}
	if ( ! isset( $prefs['surea11y']['fine'] ) || ! is_array( $prefs['surea11y']['fine'] ) ) {
		$prefs['surea11y']['fine'] = array();
	}
	$prefs['surea11y']['fine'][ (string) $post_id ] = $now;
	$prefs['_modified']                             = gmdate( 'Y-m-d\TH:i:s.000\Z' );
	update_user_meta( $user_id, $meta, $prefs );
	return $now;
}

/**
 * Who may hide findings on a post: people who see the checker and can edit it.
 *
 * @param WP_REST_Request $request The request.
 * @return bool
 */
function surea11y_hidden_permission( $request ) {
	return surea11y_can_see() && current_user_can( 'edit_post', (int) $request['id'] );
}

/** The route: POST { keys, hidden } returns { hidden: [keys] }. */
function surea11y_register_hidden_route() {
	register_rest_route(
		'surea11y/v1',
		'/hidden/(?P<id>\d+)',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'surea11y_change_hidden',
			'permission_callback' => 'surea11y_hidden_permission',
			'args'                => array(
				'id'     => array(
					'type'              => 'integer',
					'required'          => true,
					'sanitize_callback' => 'absint',
				),
				'keys'   => array(
					'type'     => 'array',
					'required' => true,
					'items'    => array( 'type' => 'string' ),
				),
				'hidden' => array(
					'type'    => 'boolean',
					'default' => true,
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'surea11y_register_hidden_route' );

/**
 * POST: hides the findings, or shows them again.
 *
 * @param WP_REST_Request $request The request.
 * @return WP_REST_Response|WP_Error
 */
function surea11y_change_hidden( $request ) {
	$keys = surea11y_clean_keys( $request['keys'] );
	if ( ! $keys ) {
		return new WP_Error( 'surea11y_no_keys', __( 'No finding to hide.', 'surea11y' ), array( 'status' => 400 ) );
	}
	return rest_ensure_response( array( 'hidden' => surea11y_set_hidden( (int) $request['id'], $keys, (bool) $request['hidden'] ) ) );
}
