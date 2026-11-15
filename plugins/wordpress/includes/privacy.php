<?php
/**
 * Privacy: what the plugin keeps about people, for a site's privacy policy,
 * and WordPress's personal data export and erasure (Tools → Export Personal
 * Data, Erase Personal Data).
 *
 * The plugin keeps, on the site only:
 * - reviews: who answered a finding, when, and their note
 *   (`_surea11y_reviews` post meta);
 * - records of checks: who made each, and a copy of the answers then
 *   (`surea11y_record` child posts);
 * - "Hide for me": the findings a person set aside, in their own editor
 *   preferences.
 * Page content is checked in the browser and never sent anywhere.
 *
 * Erasure keeps the evidence and removes the person from it: their user ID
 * and their notes. A summary of a post (`_surea11y_summary`) is rewritten
 * from what is left.
 *
 * @package SureA11y
 */

defined( 'ABSPATH' ) || exit;

const SUREA11Y_PRIVACY_BATCH = 50; // Posts per page of an export or erasure.

/** The suggested text for the site's privacy policy. */
function surea11y_privacy_policy() {
	if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
		return;
	}
	$text  = '<p class="privacy-policy-tutorial">' . esc_html__( 'Only for people who edit the site, not for visitors.', 'surea11y' ) . '</p>';
	$text .= '<p>' . esc_html__( 'The accessibility checker (SureA11y) checks content in the editor\'s browser. Page content is not sent to any other service.', 'surea11y' ) . '</p>';
	$text .= '<p>' . esc_html__( 'When an editor answers a question about a finding, the site keeps their user account, the date and any note they write, and shows them to other people who edit the post. When a check is recorded, the site keeps who recorded it and a copy of the answers given until then. The last 20 records of each post are kept. Findings an editor hides for themselves are kept in their own editor preferences.', 'surea11y' ) . '</p>';
	$text .= '<p>' . esc_html__( 'These are included in personal data exports, and erasure removes the person\'s account and notes from them.', 'surea11y' ) . '</p>';
	wp_add_privacy_policy_content( 'SureA11y', wp_kses_post( $text ) );
}
add_action( 'admin_init', 'surea11y_privacy_policy' );

/**
 * Registers the exporter and the eraser.
 *
 * @param array $list Exporters or erasers.
 * @return array
 */
function surea11y_register_exporter( $list ) {
	$list['surea11y'] = array(
		'exporter_friendly_name' => __( 'Accessibility checker', 'surea11y' ),
		'callback'               => 'surea11y_export_personal_data',
	);
	return $list;
}
add_filter( 'wp_privacy_personal_data_exporters', 'surea11y_register_exporter' );

/**
 * Registers the eraser.
 *
 * @param array $list Erasers.
 * @return array
 */
function surea11y_register_eraser( $list ) {
	$list['surea11y'] = array(
		'eraser_friendly_name' => __( 'Accessibility checker', 'surea11y' ),
		'callback'             => 'surea11y_erase_personal_data',
	);
	return $list;
}
add_filter( 'wp_privacy_personal_data_erasers', 'surea11y_register_eraser' );

/**
 * One page of posts that have reviews, and one page of records: the work of
 * one call of the exporter or eraser.
 *
 * @param int $page From 1.
 * @return array { reviews: [ post_id => reviews ], records: [ record post IDs ], more: bool }
 */
function surea11y_privacy_page( $page ) {
	global $wpdb;
	$offset = ( max( 1, (int) $page ) - 1 ) * SUREA11Y_PRIVACY_BATCH;
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- A page of one meta key across posts, for a privacy request.
	$rows = $wpdb->get_results( $wpdb->prepare( "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = %s ORDER BY meta_id LIMIT %d OFFSET %d", SUREA11Y_REVIEWS_META, SUREA11Y_PRIVACY_BATCH, $offset ) );
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- A page of the plugin's own records, for a privacy request.
	$records = $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_type = %s ORDER BY ID LIMIT %d OFFSET %d", SUREA11Y_RECORD_TYPE, SUREA11Y_PRIVACY_BATCH, $offset ) );
	$reviews = array();
	foreach ( $rows as $row ) {
		$reviews[ (int) $row->post_id ] = surea11y_stored_reviews( (int) $row->post_id );
	}
	return array(
		'reviews' => $reviews,
		'records' => array_map( 'intval', $records ),
		'more'    => count( $rows ) === SUREA11Y_PRIVACY_BATCH || count( $records ) === SUREA11Y_PRIVACY_BATCH,
	);
}

/**
 * Exports a person's reviews and the records they made or answered in.
 *
 * @param string $email The person's email address.
 * @param int    $page  From 1.
 * @return array
 */
function surea11y_export_personal_data( $email, $page = 1 ) {
	$user = get_user_by( 'email', $email );
	if ( ! $user ) {
		return array(
			'data' => array(),
			'done' => true,
		);
	}
	$data  = array();
	$batch = surea11y_privacy_page( $page );
	foreach ( $batch['reviews'] as $post_id => $reviews ) {
		foreach ( $reviews as $key => $r ) {
			if ( (int) ( isset( $r['user'] ) ? $r['user'] : 0 ) !== $user->ID ) {
				continue;
			}
			$data[] = array(
				'group_id'    => 'surea11y-reviews',
				'group_label' => __( 'Accessibility answers', 'surea11y' ),
				'item_id'     => 'surea11y-review-' . $post_id . '-' . md5( $key ),
				'data'        => array(
					array(
						'name'  => __( 'Post', 'surea11y' ),
						'value' => get_the_title( $post_id ),
					),
					array(
						'name'  => __( 'Rule', 'surea11y' ),
						'value' => surea11y_rule_of_key( $key ),
					),
					array(
						'name'  => __( 'Answer', 'surea11y' ),
						'value' => surea11y_clean_answer( isset( $r['answer'] ) ? $r['answer'] : 'pass' ),
					),
					array(
						'name'  => __( 'Date (UTC)', 'surea11y' ),
						'value' => isset( $r['date'] ) ? $r['date'] : '',
					),
					array(
						'name'  => __( 'Note', 'surea11y' ),
						'value' => isset( $r['note'] ) ? $r['note'] : '',
					),
				),
			);
		}
	}
	foreach ( $batch['records'] as $record_id ) {
		$record = get_post_meta( $record_id, SUREA11Y_RECORD_META, true );
		if ( ! is_array( $record ) ) {
			continue;
		}
		$answered = 0;
		foreach ( isset( $record['answers'] ) ? $record['answers'] : array() as $a ) {
			$answered += ( (int) $a['user'] === $user->ID ) ? 1 : 0;
		}
		if ( (int) $record['user'] !== $user->ID && ! $answered ) {
			continue;
		}
		$parent = (int) wp_get_post_parent_id( $record_id );
		$data[] = array(
			'group_id'    => 'surea11y-records',
			'group_label' => __( 'Accessibility records', 'surea11y' ),
			'item_id'     => 'surea11y-record-' . $record_id,
			'data'        => array(
				array(
					'name'  => __( 'Post', 'surea11y' ),
					'value' => $parent ? get_the_title( $parent ) : '',
				),
				array(
					'name'  => __( 'Recorded on (UTC)', 'surea11y' ),
					'value' => (string) $record['date'],
				),
				array(
					'name'  => __( 'Recorded by this person', 'surea11y' ),
					'value' => (int) $record['user'] === $user->ID ? __( 'Yes', 'surea11y' ) : __( 'No', 'surea11y' ),
				),
				array(
					'name'  => __( 'Their answers in it', 'surea11y' ),
					'value' => (string) $answered,
				),
			),
		);
	}
	return array(
		'data' => $data,
		'done' => ! $batch['more'],
	);
}

/**
 * Removes a person from the reviews and records: their user ID becomes 0
 * and their notes are emptied. The answers stay, as evidence that a person
 * checked the finding.
 *
 * @param string $email The person's email address.
 * @param int    $page  From 1.
 * @return array
 */
function surea11y_erase_personal_data( $email, $page = 1 ) {
	$user    = get_user_by( 'email', $email );
	$removed = false;
	if ( $user ) {
		$batch = surea11y_privacy_page( $page );
		foreach ( $batch['reviews'] as $post_id => $reviews ) {
			$changed = false;
			foreach ( $reviews as $key => $r ) {
				if ( isset( $r['user'] ) && (int) $r['user'] === $user->ID ) {
					$reviews[ $key ]['user'] = 0;
					$reviews[ $key ]['note'] = '';
					$changed                 = true;
				}
			}
			if ( $changed ) {
				update_post_meta( $post_id, SUREA11Y_REVIEWS_META, $reviews );
				surea11y_update_summary( $post_id );
				$removed = true;
			}
		}
		foreach ( $batch['records'] as $record_id ) {
			$record = get_post_meta( $record_id, SUREA11Y_RECORD_META, true );
			if ( ! is_array( $record ) ) {
				continue;
			}
			$changed = false;
			if ( (int) $record['user'] === $user->ID ) {
				$record['user'] = 0;
				$changed        = true;
				wp_update_post(
					array(
						'ID'          => $record_id,
						'post_author' => 0,
					)
				);
			}
			foreach ( isset( $record['answers'] ) ? $record['answers'] : array() as $key => $a ) {
				if ( (int) $a['user'] === $user->ID ) {
					$record['answers'][ $key ]['user'] = 0;
					$record['answers'][ $key ]['note'] = '';
					$changed                           = true;
				}
			}
			if ( $changed ) {
				update_post_meta( $record_id, SUREA11Y_RECORD_META, wp_slash( $record ) );
				$removed = true;
			}
		}
		$more = $batch['more'];
	}
	return array(
		'items_removed'  => $removed,
		'items_retained' => false,
		'messages'       => array(),
		'done'           => ! $user || ! $more,
	);
}
