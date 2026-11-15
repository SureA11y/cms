<?php
/**
 * The "Accessibility" column in the lists of posts and pages: each post's
 * counts from its latest check, with answers given since, from the summary
 * the overview reads (`_surea11y_summary`). Nothing is scanned here; a post
 * nobody has checked says so.
 *
 * @package SureA11y
 */

defined( 'ABSPATH' ) || exit;

/**
 * Whether a post type gets the column: one edited in the block editor, where
 * the checker runs.
 *
 * @param string $post_type The post type.
 * @return bool
 */
function surea11y_column_post_type( $post_type ) {
	return post_type_supports( $post_type, 'editor' )
		&& function_exists( 'use_block_editor_for_post_type' )
		&& use_block_editor_for_post_type( $post_type );
}

/**
 * Adds the column before the date, for people who see the checker.
 *
 * @param array  $columns   The list's columns.
 * @param string $post_type The post type (pages pass none).
 * @return array
 */
function surea11y_add_column( $columns, $post_type = 'page' ) {
	if ( ! surea11y_can_see() || ! surea11y_column_post_type( $post_type ) ) {
		return $columns;
	}
	$out = array();
	foreach ( $columns as $key => $label ) {
		if ( 'date' === $key ) {
			$out['surea11y'] = __( 'Accessibility', 'surea11y' );
		}
		$out[ $key ] = $label;
	}
	if ( ! isset( $out['surea11y'] ) ) {
		$out['surea11y'] = __( 'Accessibility', 'surea11y' );
	}
	return $out;
}
add_filter( 'manage_posts_columns', 'surea11y_add_column', 10, 2 );
add_filter( 'manage_pages_columns', 'surea11y_add_column' );

/**
 * What the cell says for a summary: the counts that aren't zero, or that
 * nothing was found, or that it wasn't checked; and when it was checked.
 *
 * @param mixed $summary The post's summary, or nothing.
 * @return array { text, when } Plain text.
 */
function surea11y_column_text( $summary ) {
	if ( ! is_array( $summary ) || empty( $summary['date'] ) ) {
		return array(
			'text' => __( 'Not checked yet', 'surea11y' ),
			'when' => '',
		);
	}
	$c     = $summary['counts'];
	$parts = array();
	if ( $c['problem'] ) {
		/* translators: %s: a number of places. */
		$parts[] = sprintf( _n( '%s to fix', '%s to fix', $c['problem'], 'surea11y' ), number_format_i18n( $c['problem'] ) );
	}
	if ( $c['likely'] ) {
		/* translators: %s: a number of places. */
		$parts[] = sprintf( _n( '%s likely problem', '%s likely problems', $c['likely'], 'surea11y' ), number_format_i18n( $c['likely'] ) );
	}
	if ( $c['review'] ) {
		/* translators: %s: a number of places. */
		$parts[] = sprintf( _n( '%s to check', '%s to check', $c['review'], 'surea11y' ), number_format_i18n( $c['review'] ) );
	}
	$time = strtotime( $summary['date'] . ' UTC' );
	return array(
		'text' => $parts ? implode( ', ', $parts ) : __( 'Nothing found', 'surea11y' ),
		/* translators: %s: a date. */
		'when' => $time ? sprintf( __( 'Checked %s', 'surea11y' ), wp_date( get_option( 'date_format' ), $time ) ) : '',
	);
}

/**
 * Prints the cell. The list has already loaded each post's meta, the
 * summary with it, so this adds no query.
 *
 * @param string $column  The column.
 * @param int    $post_id The post.
 */
function surea11y_column_cell( $column, $post_id ) {
	if ( 'surea11y' !== $column ) {
		return;
	}
	$cell = surea11y_column_text( get_post_meta( $post_id, SUREA11Y_SUMMARY_META, true ) );
	echo esc_html( $cell['text'] );
	if ( $cell['when'] ) {
		echo '<br><span class="description">' . esc_html( $cell['when'] ) . '</span>';
	}
}
add_action( 'manage_posts_custom_column', 'surea11y_column_cell', 10, 2 );
add_action( 'manage_pages_custom_column', 'surea11y_column_cell', 10, 2 );

/** The column's width in the lists, so the counts don't wrap a word a line. */
function surea11y_column_style() {
	echo '<style>.fixed .column-surea11y{width:12em}</style>' . "\n";
}
add_action( 'admin_head-edit.php', 'surea11y_column_style' );
