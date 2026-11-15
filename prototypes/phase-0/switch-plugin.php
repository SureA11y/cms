<?php
/**
 * Leaves exactly one checker active (plus the SQLite drop-in's plugin).
 * Usage: php switch-plugin.php /path/to/wordpress <plugin file or "none">
 */
$probe_wp_dir = rtrim( $argv[1], '/' );
$want         = $argv[2];
require $probe_wp_dir . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';
$checkers = array( 'surea11y-probe/surea11y-probe.php', 'editoria11y-wp/editoria11y.php', 'sa11y-wp/sa11y-wp.php', 'accessibility-checker/accessibility-checker.php' );
deactivate_plugins( array_diff( $checkers, array( $want ) ) );
if ( 'none' !== $want ) {
	$r = activate_plugin( $want );
	echo is_wp_error( $r ) ? 'error: ' . $r->get_error_message() . "\n" : "active: $want\n";
}
