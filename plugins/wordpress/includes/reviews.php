<?php
/**
 * Shared reviews: a person's answer to an undecided finding ("it's fine",
 * "it's a problem" or "not sure"), by who, when and with an optional note,
 * kept with the post and seen by everyone who edits it, in the editor and on
 * the page. Stored in the post's meta `_surea11y_reviews`, by finding
 * identity (the panel's findingKey), and read and written through
 * /wp-json/surea11y/v1/reviews/<post>.
 *
 * @package SureA11y
 */

defined( 'ABSPATH' ) || exit;

const SUREA11Y_REVIEWS_META = '_surea11y_reviews';
const SUREA11Y_MAX_REVIEWS  = 1000; // Per post; the oldest go first.
const SUREA11Y_MAX_KEY      = 1000; // Characters of a finding's identity.
const SUREA11Y_MAX_NOTE     = 500;

/**
 * The stored reviews of a post: key => { user, date (GMT), note, answer }.
 * A review stored before answers has no `answer`: it was "it's fine".
 *
 * @param int $post_id The post.
 * @return array
 */
function surea11y_stored_reviews( $post_id ) {
	$reviews = get_post_meta( $post_id, SUREA11Y_REVIEWS_META, true );
	return is_array( $reviews ) ? $reviews : array();
}

/**
 * The reviews of a post as the panel shows them: key => { by, when, note,
 * answer },
 * the reviewer's display name and the date in the site's format and locale.
 *
 * @param int $post_id The post.
 * @return array
 */
function surea11y_reviews_for_display( $post_id ) {
	$out   = array();
	$names = array();
	foreach ( surea11y_stored_reviews( $post_id ) as $key => $review ) {
		$user_id = isset( $review['user'] ) ? (int) $review['user'] : 0;
		if ( ! isset( $names[ $user_id ] ) ) {
			$user              = $user_id ? get_userdata( $user_id ) : false;
			$names[ $user_id ] = $user ? $user->display_name : '';
		}
		$time        = isset( $review['date'] ) ? strtotime( $review['date'] . ' UTC' ) : false;
		$out[ $key ] = array(
			'by'   => $names[ $user_id ],
			'when' => $time ? wp_date( get_option( 'date_format' ), $time ) : '',
			'note'   => isset( $review['note'] ) ? (string) $review['note'] : '',
			'answer' => surea11y_clean_answer( isset( $review['answer'] ) ? $review['answer'] : 'pass' ),
		);
	}
	return $out;
}

/**
 * An answer: 'pass' (it's fine), 'fail' (it's a problem) or 'unsure'.
 *
 * @param mixed $answer The submitted answer.
 * @return string
 */
function surea11y_clean_answer( $answer ) {
	return in_array( $answer, array( 'pass', 'fail', 'unsure' ), true ) ? $answer : 'pass';
}

/**
 * Finding keys from a request: strings, at most 50, each at most
 * SUREA11Y_MAX_KEY characters.
 *
 * @param mixed $keys The submitted keys.
 * @return array
 */
function surea11y_clean_keys( $keys ) {
	if ( ! is_array( $keys ) ) {
		return array();
	}
	$out = array();
	foreach ( array_slice( $keys, 0, 50 ) as $key ) {
		if ( is_string( $key ) && '' !== $key && strlen( $key ) <= SUREA11Y_MAX_KEY ) {
			$out[] = wp_check_invalid_utf8( $key );
		}
	}
	return array_values( array_unique( array_filter( $out ) ) );
}

/**
 * Who may read a post's reviews: people who see the checker and can edit it.
 *
 * @param WP_REST_Request $request The request.
 * @return bool
 */
function surea11y_reviews_read_permission( $request ) {
	$post_id = (int) $request['id'];
	return surea11y_can_see() && current_user_can( 'edit_post', $post_id );
}

/**
 * Who may add or reopen a review: people with the review capability who can
 * edit the post.
 *
 * @param WP_REST_Request $request The request.
 * @return bool
 */
function surea11y_reviews_write_permission( $request ) {
	$post_id = (int) $request['id'];
	return surea11y_can_see() && surea11y_can_review( $post_id );
}

/**
 * The routes. The REST API checks the cookie nonce (X-WP-Nonce) for logged-in
 * requests, so these can't be called from another site.
 */
function surea11y_register_review_routes() {
	$args = array(
		'id' => array(
			'type'              => 'integer',
			'required'          => true,
			'sanitize_callback' => 'absint',
		),
	);
	register_rest_route(
		'surea11y/v1',
		'/reviews/(?P<id>\d+)',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => 'surea11y_get_reviews',
				'permission_callback' => 'surea11y_reviews_read_permission',
				'args'                => $args,
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'surea11y_add_reviews',
				'permission_callback' => 'surea11y_reviews_write_permission',
				'args'                => $args + array(
					'keys' => array(
						'type'     => 'array',
						'required' => true,
						'items'    => array( 'type' => 'string' ),
					),
					'note'   => array(
						'type'    => 'string',
						'default' => '',
					),
					'answer' => array(
						'type'    => 'string',
						'enum'    => array( 'pass', 'fail', 'unsure' ),
						'default' => 'pass',
					),
				),
			),
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => 'surea11y_remove_reviews',
				'permission_callback' => 'surea11y_reviews_write_permission',
				'args'                => $args + array(
					'keys' => array(
						'type'     => 'array',
						'required' => true,
						'items'    => array( 'type' => 'string' ),
					),
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'surea11y_register_review_routes' );

/**
 * GET: the post's reviews, ready to show.
 *
 * @param WP_REST_Request $request The request.
 * @return WP_REST_Response
 */
function surea11y_get_reviews( $request ) {
	return rest_ensure_response( array( 'reviews' => surea11y_reviews_for_display( (int) $request['id'] ) ) );
}

/**
 * POST: records the current person's answer about the findings, now, with
 * the note.
 *
 * @param WP_REST_Request $request The request.
 * @return WP_REST_Response|WP_Error
 */
function surea11y_add_reviews( $request ) {
	$post_id = (int) $request['id'];
	$keys    = surea11y_clean_keys( $request['keys'] );
	if ( ! $keys ) {
		return new WP_Error( 'surea11y_no_keys', __( 'No finding to review.', 'surea11y' ), array( 'status' => 400 ) );
	}
	$note = sanitize_textarea_field( (string) $request['note'] );
	if ( function_exists( 'mb_substr' ) ) {
		$note = mb_substr( $note, 0, SUREA11Y_MAX_NOTE );
	} else {
		$note = substr( $note, 0, SUREA11Y_MAX_NOTE );
	}
	$reviews = surea11y_stored_reviews( $post_id );
	foreach ( $keys as $key ) {
		unset( $reviews[ $key ] ); // Re-added at the end: the newest last.
		$reviews[ $key ] = array(
			'user'   => get_current_user_id(),
			'date'   => gmdate( 'Y-m-d H:i:s' ),
			'note'   => $note,
			'answer' => surea11y_clean_answer( (string) $request['answer'] ),
		);
	}
	if ( count( $reviews ) > SUREA11Y_MAX_REVIEWS ) {
		$reviews = array_slice( $reviews, -SUREA11Y_MAX_REVIEWS, null, true );
	}
	update_post_meta( $post_id, SUREA11Y_REVIEWS_META, $reviews );
	surea11y_update_summary( $post_id );
	return surea11y_get_reviews( $request );
}

/**
 * DELETE: reopens the findings.
 *
 * @param WP_REST_Request $request The request.
 * @return WP_REST_Response
 */
function surea11y_remove_reviews( $request ) {
	$post_id = (int) $request['id'];
	$reviews = surea11y_stored_reviews( $post_id );
	foreach ( surea11y_clean_keys( $request['keys'] ) as $key ) {
		unset( $reviews[ $key ] );
	}
	if ( $reviews ) {
		update_post_meta( $post_id, SUREA11Y_REVIEWS_META, $reviews );
	} else {
		delete_post_meta( $post_id, SUREA11Y_REVIEWS_META );
	}
	surea11y_update_summary( $post_id );
	return surea11y_get_reviews( $request );
}
