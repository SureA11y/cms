<?php
/**
 * The site overview: what the checks people have run say about the whole
 * site. Nothing is crawled or scanned here; the page reads what the editor
 * and the page checker already recorded (the evidence trail) and the
 * answers people gave. Dashboard → Accessibility.
 *
 * Each post keeps a small summary in the meta `_surea11y_summary`, rewritten
 * when a check is recorded or an answer changes, so the overview reads one
 * short value per post and never the records themselves.
 *
 * @package SureA11y
 */

defined( 'ABSPATH' ) || exit;

const SUREA11Y_SUMMARY_META   = '_surea11y_summary';
const SUREA11Y_SUMMARY_ANSWERS = 5;    // Latest answers kept per post.
const SUREA11Y_OVERVIEW_POSTS  = 1000; // Posts read, most recently checked first.

/**
 * A finding's rule, from its identity (rule|code|…).
 *
 * @param string $key The finding's identity.
 * @return string
 */
function surea11y_rule_of_key( $key ) {
	return sanitize_key( (string) strtok( (string) $key, '|' ) );
}

/**
 * Rewrites a post's summary from its latest record and its answers as they
 * are now: an answer given after the record still counts. Removed when the
 * post has neither.
 *
 * Shape: { date, user, source, counts: { group: n }, rules: { rule: { group:
 * n } }, answers: [ { rule, answer, user, date, note } ] }, with "fail"
 * answers counted as problems and "pass" answers not counted.
 *
 * @param int $post_id The post.
 */
function surea11y_update_summary( $post_id ) {
	$records = surea11y_records( $post_id );
	$reviews = surea11y_stored_reviews( $post_id );
	if ( ! $records && ! $reviews ) {
		delete_post_meta( $post_id, SUREA11Y_SUMMARY_META );
		return;
	}
	$summary = array(
		'date'    => '',
		'user'    => 0,
		'source'  => '',
		'counts'  => array_fill_keys( SUREA11Y_EVIDENCE_GROUPS, 0 ),
		'rules'   => array(),
		'answers' => array(),
	);
	if ( $records ) {
		$record            = end( $records );
		$summary['date']   = (string) $record['date'];
		$summary['user']   = (int) $record['user'];
		$summary['source'] = (string) $record['source'];
		foreach ( $record['findings'] as $f ) {
			$answer = isset( $reviews[ $f['key'] ]['answer'] ) ? $reviews[ $f['key'] ]['answer'] : ( isset( $reviews[ $f['key'] ] ) ? 'pass' : '' );
			if ( 'pass' === $answer ) {
				continue;
			}
			$group = 'fail' === $answer ? 'problem' : $f['group'];
			++$summary['counts'][ $group ];
			if ( ! isset( $summary['rules'][ $f['rule'] ] ) ) {
				$summary['rules'][ $f['rule'] ] = array_fill_keys( SUREA11Y_EVIDENCE_GROUPS, 0 );
			}
			++$summary['rules'][ $f['rule'] ][ $group ];
		}
	}
	// Reviews are stored newest last.
	foreach ( array_slice( $reviews, -SUREA11Y_SUMMARY_ANSWERS, null, true ) as $key => $r ) {
		$summary['answers'][] = array(
			'rule'   => surea11y_rule_of_key( $key ),
			'answer' => surea11y_clean_answer( isset( $r['answer'] ) ? $r['answer'] : 'pass' ),
			'user'   => isset( $r['user'] ) ? (int) $r['user'] : 0,
			'date'   => isset( $r['date'] ) ? (string) $r['date'] : '',
			'note'   => isset( $r['note'] ) ? (string) $r['note'] : '',
		);
	}
	update_post_meta( $post_id, SUREA11Y_SUMMARY_META, $summary );
}

/**
 * Summaries for posts recorded before summaries existed: at most 50 per
 * visit to the overview, so a first visit stays quick.
 */
function surea11y_fill_missing_summaries() {
	global $wpdb;
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Read once per visit to the overview; nothing to cache.
	$ids = $wpdb->get_col(
		$wpdb->prepare(
			"SELECT t.id FROM (
				SELECT post_parent AS id FROM {$wpdb->posts} WHERE post_type = %s
				UNION SELECT post_id AS id FROM {$wpdb->postmeta} WHERE meta_key IN (%s, %s)
			) t
			LEFT JOIN {$wpdb->postmeta} s ON s.post_id = t.id AND s.meta_key = %s
			WHERE s.meta_id IS NULL LIMIT 50",
			SUREA11Y_RECORD_TYPE,
			SUREA11Y_EVIDENCE_META,
			SUREA11Y_REVIEWS_META,
			SUREA11Y_SUMMARY_META
		)
	);
	foreach ( $ids as $id ) {
		surea11y_update_summary( (int) $id );
	}
}

/**
 * The summaries of the posts the current person can edit, most recently
 * checked first: post ID => summary. One query for the summaries (only that
 * meta, not the records) and one for the posts.
 *
 * @return array
 */
function surea11y_overview_summaries() {
	global $wpdb;
	surea11y_fill_missing_summaries();
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- One read of one meta key across posts; WP_Query would load every meta of each post, the records included.
	$rows = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT m.post_id, m.meta_value FROM {$wpdb->postmeta} m
			INNER JOIN {$wpdb->posts} p ON p.ID = m.post_id
			WHERE m.meta_key = %s AND p.post_status NOT IN ('trash', 'auto-draft', 'inherit')
			ORDER BY m.meta_id DESC LIMIT %d",
			SUREA11Y_SUMMARY_META,
			SUREA11Y_OVERVIEW_POSTS
		)
	);
	$ids = array_map( 'intval', wp_list_pluck( $rows, 'post_id' ) );
	_prime_post_caches( $ids, false, false );
	$out = array();
	foreach ( $rows as $row ) {
		$id      = (int) $row->post_id;
		$summary = maybe_unserialize( $row->meta_value );
		if ( is_array( $summary ) && current_user_can( 'edit_post', $id ) ) {
			$out[ $id ] = $summary;
		}
	}
	return $out;
}

/**
 * What the overview shows, from the summaries: the rules found on the most
 * pages, the pages with the most to fix, and the latest answers.
 *
 * @param array $summaries Post ID => summary.
 * @return array { checked, rules, pages, answers }
 */
function surea11y_overview_data( $summaries ) {
	$rules   = array();
	$pages   = array();
	$answers = array();
	$checked = 0;
	foreach ( $summaries as $id => $s ) {
		if ( '' !== $s['date'] ) {
			++$checked;
			$counts = $s['counts'];
			if ( $counts['problem'] + $counts['likely'] + $counts['review'] > 0 ) {
				$pages[] = array( 'id' => $id ) + $s;
			}
		}
		foreach ( $s['rules'] as $rule => $c ) {
			if ( ! isset( $rules[ $rule ] ) ) {
				$rules[ $rule ] = array(
					'rule'   => $rule,
					'pages'  => 0,
					'counts' => array_fill_keys( SUREA11Y_EVIDENCE_GROUPS, 0 ),
				);
			}
			if ( $c['problem'] + $c['likely'] + $c['review'] > 0 ) {
				++$rules[ $rule ]['pages'];
				foreach ( SUREA11Y_EVIDENCE_GROUPS as $g ) {
					$rules[ $rule ]['counts'][ $g ] += $c[ $g ];
				}
			}
		}
		foreach ( $s['answers'] as $a ) {
			$answers[] = array( 'id' => $id ) + $a;
		}
	}
	$rules = array_values( array_filter( $rules, function ( $r ) {
		return $r['pages'] > 0;
	} ) );
	usort( $rules, function ( $a, $b ) {
		$x = $a['counts'];
		$y = $b['counts'];
		return array( $b['pages'], $y['problem'], $y['likely'], $y['review'], $a['rule'] ) <=> array( $a['pages'], $x['problem'], $x['likely'], $x['review'], $b['rule'] );
	} );
	usort( $pages, function ( $a, $b ) {
		$x = $a['counts'];
		$y = $b['counts'];
		return array( $y['problem'], $y['likely'], $y['review'], $b['date'] ) <=> array( $x['problem'], $x['likely'], $x['review'], $a['date'] );
	} );
	usort( $answers, function ( $a, $b ) {
		return strcmp( $b['date'], $a['date'] );
	} );
	return array(
		'checked' => $checked,
		'rules'   => array_slice( $rules, 0, 15 ),
		'pages'   => array_slice( $pages, 0, 25 ),
		'answers' => array_slice( $answers, 0, 15 ),
	);
}

/**
 * Who may open the overview: people who see the checker. Each sees only the
 * posts they can edit.
 *
 * @return bool
 */
function surea11y_can_see_overview() {
	return surea11y_can_see() && current_user_can( 'edit_posts' );
}

/** Dashboard → Accessibility. */
function surea11y_overview_menu() {
	if ( ! surea11y_can_see_overview() ) {
		return;
	}
	add_dashboard_page(
		__( 'Accessibility overview', 'surea11y' ),
		__( 'Accessibility', 'surea11y' ),
		'edit_posts',
		'surea11y-overview',
		'surea11y_render_overview'
	);
}
add_action( 'admin_menu', 'surea11y_overview_menu' );

/**
 * A date stored in UTC, in the site's format and time zone.
 *
 * @param string $date Y-m-d H:i:s, UTC.
 * @return string
 */
function surea11y_local_date( $date ) {
	$time = strtotime( $date . ' UTC' );
	return $time ? wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), $time ) : '';
}

/**
 * A post's title for a table, never empty.
 *
 * @param int $id The post.
 * @return string
 */
function surea11y_post_label( $id ) {
	$title = get_the_title( $id );
	/* translators: %d: the post's ID. */
	return '' !== trim( wp_strip_all_tags( $title ) ) ? wp_strip_all_tags( $title ) : sprintf( __( '(no title, #%d)', 'surea11y' ), $id );
}

/**
 * The post's title, linked to the editor when the person can edit it. One
 * link per cell: a second one under it would sit closer than WCAG's target
 * spacing allows (2.5.8).
 *
 * @param int $id The post.
 * @return string HTML.
 */
function surea11y_post_cell( $id ) {
	$label = surea11y_post_label( $id );
	$edit  = get_edit_post_link( $id );
	return $edit ? '<a href="' . esc_url( $edit ) . '">' . esc_html( $label ) . '</a>' : esc_html( $label );
}

/**
 * The overview page: three tables made by the server, in WordPress's own
 * table styles, each with a caption and header cells. No script.
 */
function surea11y_render_overview() {
	if ( ! surea11y_can_see_overview() ) {
		return;
	}
	$data  = surea11y_overview_data( surea11y_overview_summaries() );
	$known = surea11y_rules_by_id();
	$words = surea11y_export_words();
	$names = array();
	$name  = function ( $user_id ) use ( &$names ) {
		if ( ! isset( $names[ $user_id ] ) ) {
			$user               = $user_id ? get_userdata( $user_id ) : false;
			$names[ $user_id ] = $user ? $user->display_name : '';
		}
		return $names[ $user_id ];
	};
	$rule_title = function ( $rule ) use ( $known ) {
		return isset( $known[ $rule ]['title'] ) ? $known[ $rule ]['title'] : $rule;
	};

	echo '<div class="wrap surea11y-overview"><h1>' . esc_html__( 'Accessibility overview', 'surea11y' ) . '</h1>';
	echo '<p>' . esc_html__( 'From the checks people have run in the editor and on pages, and the answers they gave. Nothing is crawled: a page nobody has checked is not here. Each page counts as of its latest check, with answers given since.', 'surea11y' ) . '</p>';
	echo '<p>' . esc_html(
		sprintf(
			/* translators: %s: a number of posts and pages. */
			_n( '%s post or page checked.', '%s posts and pages checked.', $data['checked'], 'surea11y' ),
			number_format_i18n( $data['checked'] )
		)
	) . '</p>';

	if ( ! $data['checked'] && ! $data['answers'] ) {
		echo '<p>' . esc_html__( 'Nothing has been checked yet. Open a post in the editor and the checker records what it finds when you save; on a published page, use "Check accessibility" in the toolbar.', 'surea11y' ) . '</p></div>';
		return;
	}

	// The problems found on the most pages.
	echo '<h2 id="surea11y-top-problems">' . esc_html__( 'Problems found most often', 'surea11y' ) . '</h2>';
	if ( $data['rules'] ) {
		echo '<table class="widefat striped" aria-labelledby="surea11y-top-problems"><thead><tr>';
		echo '<th scope="col">' . esc_html__( 'Problem', 'surea11y' ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'WCAG', 'surea11y' ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'Where to fix it', 'surea11y' ) . '</th>';
		echo '<th scope="col" class="num">' . esc_html__( 'Pages', 'surea11y' ) . '</th>';
		echo '<th scope="col" class="num">' . esc_html( $words['problem'] ) . '</th>';
		echo '<th scope="col" class="num">' . esc_html( $words['likely'] ) . '</th>';
		echo '<th scope="col" class="num">' . esc_html( $words['review'] ) . '</th>';
		echo '</tr></thead><tbody>';
		foreach ( $data['rules'] as $r ) {
			$rule = isset( $known[ $r['rule'] ] ) ? $known[ $r['rule'] ] : array();
			$wcag = array();
			foreach ( isset( $rule['wcag'] ) ? $rule['wcag'] : array() as $c ) {
				$wcag[] = $c['sc'] . ' (' . $c['level'] . ')';
			}
			$theme = $rule && empty( $rule['content'] );
			echo '<tr><th scope="row">' . esc_html( $rule_title( $r['rule'] ) ) . '<br><span class="description">' . esc_html( $r['rule'] ) . '</span></th>';
			echo '<td>' . ( $wcag ? esc_html( implode( ', ', $wcag ) ) : esc_html__( 'Good practice', 'surea11y' ) ) . '</td>';
			echo '<td>' . ( $theme ? esc_html__( 'Theme or template: fixed once, for every page', 'surea11y' ) : esc_html__( 'Content of each page', 'surea11y' ) ) . '</td>';
			echo '<td class="num">' . esc_html( number_format_i18n( $r['pages'] ) ) . '</td>';
			foreach ( array( 'problem', 'likely', 'review' ) as $g ) {
				echo '<td class="num">' . esc_html( number_format_i18n( $r['counts'][ $g ] ) ) . '</td>';
			}
			echo '</tr>';
		}
		echo '</tbody></table>';
		echo '<p class="description">' . esc_html__( 'Pages counts the pages where the problem was found; the other columns count places on those pages. An answer of "It\'s a problem" counts under To fix.', 'surea11y' ) . '</p>';
	} else {
		echo '<p>' . esc_html__( 'No problems in the latest checks.', 'surea11y' ) . '</p>';
	}

	// The pages with the most to fix.
	echo '<h2 id="surea11y-top-pages">' . esc_html__( 'Pages with the most to fix', 'surea11y' ) . '</h2>';
	if ( $data['pages'] ) {
		echo '<table class="widefat striped" aria-labelledby="surea11y-top-pages"><thead><tr>';
		echo '<th scope="col">' . esc_html__( 'Page', 'surea11y' ) . '</th>';
		echo '<th scope="col" class="num">' . esc_html( $words['problem'] ) . '</th>';
		echo '<th scope="col" class="num">' . esc_html( $words['likely'] ) . '</th>';
		echo '<th scope="col" class="num">' . esc_html( $words['review'] ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'Last checked', 'surea11y' ) . '</th>';
		echo '</tr></thead><tbody>';
		foreach ( $data['pages'] as $p ) {
			$by = $name( (int) $p['user'] );
			echo '<tr><th scope="row">' . surea11y_post_cell( $p['id'] ) . '</th>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in surea11y_post_cell.
			foreach ( array( 'problem', 'likely', 'review' ) as $g ) {
				echo '<td class="num">' . esc_html( number_format_i18n( $p['counts'][ $g ] ) ) . '</td>';
			}
			echo '<td>' . esc_html(
				sprintf(
					/* translators: 1: date and time, 2: where (Editor or Page), 3: a person's name. */
					'' !== $by ? __( '%1$s, %2$s, by %3$s', 'surea11y' ) : __( '%1$s, %2$s', 'surea11y' ),
					surea11y_local_date( $p['date'] ),
					isset( $words[ $p['source'] ] ) ? $words[ $p['source'] ] : '',
					$by
				)
			) . '</td></tr>';
		}
		echo '</tbody></table>';
		echo '<p class="description">' . esc_html__( 'A check in the editor covers the content; a check of the page covers the theme too.', 'surea11y' ) . '</p>';
	} else {
		echo '<p>' . esc_html__( 'No page has anything left to fix in its latest check.', 'surea11y' ) . '</p>';
	}

	// The latest answers.
	echo '<h2 id="surea11y-answers">' . esc_html__( 'Latest answers', 'surea11y' ) . '</h2>';
	if ( $data['answers'] ) {
		echo '<table class="widefat striped" aria-labelledby="surea11y-answers"><thead><tr>';
		echo '<th scope="col">' . esc_html__( 'When', 'surea11y' ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'Page', 'surea11y' ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'Finding', 'surea11y' ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'Answer', 'surea11y' ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'By', 'surea11y' ) . '</th>';
		echo '<th scope="col">' . esc_html__( 'Note', 'surea11y' ) . '</th>';
		echo '</tr></thead><tbody>';
		foreach ( $data['answers'] as $a ) {
			echo '<tr><th scope="row">' . esc_html( surea11y_local_date( $a['date'] ) ) . '</th>';
			echo '<td>' . surea11y_post_cell( $a['id'] ) . '</td>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in surea11y_post_cell.
			echo '<td>' . esc_html( $rule_title( $a['rule'] ) ) . '</td>';
			echo '<td>' . esc_html( $words[ $a['answer'] ] ) . '</td>';
			echo '<td>' . esc_html( $name( $a['user'] ) ) . '</td>';
			echo '<td>' . esc_html( $a['note'] ) . '</td></tr>';
		}
		echo '</tbody></table>';
	} else {
		echo '<p>' . esc_html__( 'Nobody has answered a question yet.', 'surea11y' ) . '</p>';
	}
	echo '</div>';
}
