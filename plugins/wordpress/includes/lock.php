<?php
/**
 * A short lock, so two requests that change the same thing at the same
 * moment don't overwrite each other. Answers, summaries and records of a
 * post, and a person's "Hide for me" entry, are each read, changed and
 * written back whole; two at once lost one of them (found by a stress test:
 * 40 answers sent together, 32 kept).
 *
 * Taken with an INSERT IGNORE into the options table, as WordPress's own
 * upgrader does: the database lets only one request insert the row. A lock
 * older than 30 seconds is taken as left behind by a request that died.
 *
 * @package SureA11y
 */

defined( 'ABSPATH' ) || exit;

const SUREA11Y_LOCK_WAIT  = 10;  // Seconds to wait for a lock.
const SUREA11Y_LOCK_STALE = 30;  // Seconds after which a lock is left behind.

/**
 * Runs `$callback` holding the lock `$name`, and returns what it returns.
 * If the lock can't be had in time, returns a WP_Error (409) and doesn't
 * run it.
 *
 * @param string   $name     What is locked, such as "post-12".
 * @param callable $callback The change.
 * @return mixed|WP_Error
 */
function surea11y_with_lock( $name, $callback ) {
	global $wpdb;
	$option   = 'surea11y_lock_' . md5( $name );
	$deadline = microtime( true ) + SUREA11Y_LOCK_WAIT;
	// The options table is read directly: a cached copy would hide another
	// request's lock.
	// phpcs:disable WordPress.DB.DirectDatabaseQuery
	while ( ! $wpdb->query( $wpdb->prepare( "INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, 'no')", $option, (string) time() ) ) ) {
		$since = (int) $wpdb->get_var( $wpdb->prepare( "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $option ) );
		if ( $since && time() - $since > SUREA11Y_LOCK_STALE ) {
			$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s", $option, (string) $since ) );
			continue;
		}
		if ( microtime( true ) > $deadline ) {
			return new WP_Error( 'surea11y_busy', __( 'Someone else is changing this at the same moment. Try again.', 'surea11y' ), array( 'status' => 409 ) );
		}
		usleep( 20000 );
	}
	try {
		return $callback();
	} finally {
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name = %s", $option ) );
	}
	// phpcs:enable WordPress.DB.DirectDatabaseQuery
}

/**
 * Forgets what this request read of a post's meta, so a change made while
 * holding its lock starts from what is stored now.
 *
 * @param int $post_id The post.
 */
function surea11y_fresh_meta( $post_id ) {
	wp_cache_delete( (int) $post_id, 'post_meta' );
}
