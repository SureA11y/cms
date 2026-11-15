<?php
/**
 * Removes what the plugin stored when it is deleted from the Plugins screen
 * (not when it is only deactivated): its settings, the reviews and summaries
 * kept with posts, the records of checks (hidden child posts), and each
 * person's "Hide for me" entry in their editor preferences. On a multisite
 * network, on every site. The records are evidence: the readme says to
 * export them first.
 *
 * @package SureA11y
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

/** Removes the plugin's data from the current site. */
function surea11y_uninstall_site() {
	global $wpdb;

	delete_option( 'surea11y_settings' );
	foreach ( array( '_surea11y_reviews', '_surea11y_summary', '_surea11y_evidence' ) as $key ) {
		delete_post_meta_by_key( $key );
	}

	// The records, in batches, each with its meta.
	do {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Uninstalling; the post type is no longer registered.
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_type = %s LIMIT 500", 'surea11y_record' ) );
		foreach ( $ids as $id ) {
			wp_delete_post( (int) $id, true );
		}
	} while ( $ids );

	// "Hide for me": only this plugin's entry in each person's preferences.
	$meta_key = $wpdb->get_blog_prefix() . 'persisted_preferences';
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Uninstalling; one read of the people who have the entry.
	$users = $wpdb->get_col( $wpdb->prepare( "SELECT user_id FROM {$wpdb->usermeta} WHERE meta_key = %s AND meta_value LIKE %s", $meta_key, '%' . $wpdb->esc_like( 'surea11y' ) . '%' ) );
	foreach ( $users as $user_id ) {
		$prefs = get_user_meta( (int) $user_id, $meta_key, true );
		if ( is_array( $prefs ) && isset( $prefs['surea11y'] ) ) {
			unset( $prefs['surea11y'] );
			update_user_meta( (int) $user_id, $meta_key, $prefs );
		}
	}
}

if ( is_multisite() ) {
	foreach ( get_sites( array( 'fields' => 'ids', 'number' => 0 ) ) as $site_id ) {
		switch_to_blog( $site_id );
		surea11y_uninstall_site();
		restore_current_blog();
	}
} else {
	surea11y_uninstall_site();
}
