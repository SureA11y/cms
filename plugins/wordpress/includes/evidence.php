<?php
/**
 * The evidence trail: a dated record of each check of a post, its findings
 * and the answers people gave, kept with the post and exported as CSV or
 * EARL. A record is made when the post is saved in the editor and after a
 * check of its page; one that would repeat the last is not kept.
 *
 * Each record is a hidden child post of the post it records
 * (`surea11y_record`, private, with the record in its meta
 * `_surea11y_record`), read and written through
 * /wp-json/surea11y/v1/evidence/<post>. Not in the post's own meta:
 * WordPress loads all of a post's meta whenever it lists or opens it, and
 * twenty records can weigh megabytes.
 *
 * @package SureA11y
 */

defined( 'ABSPATH' ) || exit;

const SUREA11Y_EVIDENCE_META     = '_surea11y_evidence'; // Before records were child posts.
const SUREA11Y_RECORD_TYPE       = 'surea11y_record';
const SUREA11Y_RECORD_META       = '_surea11y_record';
const SUREA11Y_MAX_RECORDS       = 20;  // Per post; the oldest go first.
const SUREA11Y_MAX_FINDINGS      = 300; // Per record.
const SUREA11Y_EVIDENCE_SOURCES  = array( 'editor', 'page' );
const SUREA11Y_EVIDENCE_GROUPS   = array( 'problem', 'likely', 'review', 'probably-fine' );

/** The hidden post type that holds the records: never shown, never public. */
function surea11y_register_record_type() {
	register_post_type(
		SUREA11Y_RECORD_TYPE,
		array(
			'label'               => __( 'Accessibility records', 'surea11y' ),
			'public'              => false,
			'show_ui'             => false,
			'show_in_rest'        => false,
			'exclude_from_search' => true,
			'publicly_queryable'  => false,
			'query_var'           => false,
			'rewrite'             => false,
			'can_export'          => true,
			'supports'            => array(),
			// Capabilities nobody is given: records are written and removed
			// only by this plugin's own code, never edited, read or deleted
			// through WordPress's screens or the REST API.
			'capability_type'     => SUREA11Y_RECORD_TYPE,
			'map_meta_cap'        => true,
		)
	);
}
add_action( 'init', 'surea11y_register_record_type' );

/**
 * The IDs of a post's record posts, newest first.
 *
 * @param int $post_id The post.
 * @param int $limit   How many at most (-1 for all).
 * @return int[]
 */
function surea11y_record_ids( $post_id, $limit = SUREA11Y_MAX_RECORDS ) {
	return array_map(
		'intval',
		get_posts(
			array(
				'post_type'        => SUREA11Y_RECORD_TYPE,
				'post_parent'      => (int) $post_id,
				'post_status'      => 'private',
				'numberposts'      => $limit,
				'orderby'          => 'ID',
				'order'            => 'DESC',
				'fields'           => 'ids',
				'no_found_rows'    => true,
				'suppress_filters' => true,
			)
		)
	);
}

/**
 * Stores a record as a child post of the post, and removes the oldest
 * beyond SUREA11Y_MAX_RECORDS.
 *
 * @param int   $post_id The post.
 * @param array $record  The record.
 */
function surea11y_store_record( $post_id, $record ) {
	$id = wp_insert_post(
		array(
			'post_type'     => SUREA11Y_RECORD_TYPE,
			'post_parent'   => (int) $post_id,
			'post_status'   => 'private',
			'post_author'   => (int) $record['user'],
			'post_date_gmt' => $record['date'],
			'post_date'     => get_date_from_gmt( $record['date'] ),
		),
		true
	);
	if ( is_wp_error( $id ) || ! $id ) {
		return;
	}
	add_post_meta( $id, SUREA11Y_RECORD_META, wp_slash( $record ), true );
	foreach ( array_slice( surea11y_record_ids( $post_id, -1 ), SUREA11Y_MAX_RECORDS ) as $old ) {
		wp_delete_post( $old, true );
	}
}

/**
 * A post's records, oldest first. Records kept the old way, in the post's
 * meta, are moved to child posts the first time they are read.
 *
 * @param int $post_id The post.
 * @return array
 */
function surea11y_records( $post_id ) {
	$legacy = get_post_meta( $post_id, SUREA11Y_EVIDENCE_META, true );
	if ( is_array( $legacy ) ) {
		foreach ( array_values( $legacy ) as $record ) {
			surea11y_store_record( $post_id, $record );
		}
		delete_post_meta( $post_id, SUREA11Y_EVIDENCE_META );
	}
	$ids = surea11y_record_ids( $post_id );
	update_meta_cache( 'post', $ids );
	$records = array();
	foreach ( array_reverse( $ids ) as $id ) {
		$record = get_post_meta( $id, SUREA11Y_RECORD_META, true );
		if ( is_array( $record ) ) {
			$records[] = $record;
		}
	}
	return $records;
}

/**
 * Removes a post's records with it, when it is deleted for good.
 *
 * @param int $post_id The post being deleted.
 */
function surea11y_delete_records( $post_id ) {
	if ( SUREA11Y_RECORD_TYPE === get_post_type( $post_id ) ) {
		return;
	}
	foreach ( surea11y_record_ids( $post_id, -1 ) as $id ) {
		wp_delete_post( $id, true );
	}
}
add_action( 'before_delete_post', 'surea11y_delete_records' );

/**
 * The findings a request sends, cleaned: each { key, rule, code, group },
 * at most SUREA11Y_MAX_FINDINGS, of known groups.
 *
 * @param mixed $findings The submitted findings.
 * @return array
 */
function surea11y_clean_findings( $findings ) {
	$out = array();
	if ( ! is_array( $findings ) ) {
		return $out;
	}
	foreach ( array_slice( $findings, 0, SUREA11Y_MAX_FINDINGS ) as $f ) {
		if ( ! is_array( $f ) ) {
			continue;
		}
		$key   = isset( $f['key'] ) && is_string( $f['key'] ) ? $f['key'] : '';
		$rule  = isset( $f['rule'] ) ? sanitize_key( $f['rule'] ) : '';
		$code  = isset( $f['code'] ) && is_string( $f['code'] ) ? preg_replace( '/[^A-Za-z0-9_-]/', '', $f['code'] ) : '';
		$group = isset( $f['group'] ) && in_array( $f['group'], SUREA11Y_EVIDENCE_GROUPS, true ) ? $f['group'] : '';
		if ( '' === $key || strlen( $key ) > SUREA11Y_MAX_KEY || '' === $rule || '' === $group ) {
			continue;
		}
		$out[] = array(
			'key'   => wp_check_invalid_utf8( $key ),
			'rule'  => $rule,
			'code'  => $code,
			'group' => $group,
		);
	}
	return $out;
}

/**
 * Who may read and add records: people who see the checker and can edit the
 * post.
 *
 * @param WP_REST_Request $request The request.
 * @return bool
 */
function surea11y_evidence_permission( $request ) {
	return surea11y_can_see() && surea11y_checkable( (int) $request['id'] ) && current_user_can( 'edit_post', (int) $request['id'] );
}

/** The routes. */
function surea11y_register_evidence_routes() {
	$id = array(
		'type'              => 'integer',
		'required'          => true,
		'sanitize_callback' => 'absint',
	);
	register_rest_route(
		'surea11y/v1',
		'/evidence/(?P<id>\d+)',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => 'surea11y_get_records',
				'permission_callback' => 'surea11y_evidence_permission',
				'args'                => array( 'id' => $id ),
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'surea11y_add_record',
				'permission_callback' => 'surea11y_evidence_permission',
				'args'                => array(
					'id'       => $id,
					'source'   => array(
						'type'     => 'string',
						'enum'     => SUREA11Y_EVIDENCE_SOURCES,
						'required' => true,
					),
					'url'      => array(
						'type'    => 'string',
						'default' => '',
					),
					'engine'   => array(
						'type'    => 'string',
						'default' => '',
					),
					'profile'  => array(
						'type'    => 'string',
						'default' => '',
					),
					'findings' => array(
						'type'     => 'array',
						'required' => true,
					),
				),
			),
		)
	);
	register_rest_route(
		'surea11y/v1',
		'/evidence/(?P<id>\d+)/export',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'surea11y_export_records',
			'permission_callback' => 'surea11y_evidence_permission',
			'args'                => array(
				'id'     => $id,
				'format' => array(
					'type'    => 'string',
					'enum'    => array( 'csv', 'earl' ),
					'default' => 'csv',
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'surea11y_register_evidence_routes' );

/**
 * A record as the sidebar lists it: when, who, where, and its counts.
 *
 * @param array $record A stored record.
 * @return array
 */
function surea11y_record_summary( $record ) {
	$counts = array_fill_keys( SUREA11Y_EVIDENCE_GROUPS, 0 );
	foreach ( $record['findings'] as $f ) {
		$answer = isset( $record['answers'][ $f['key'] ] ) ? $record['answers'][ $f['key'] ]['answer'] : '';
		if ( 'pass' === $answer ) {
			continue;
		}
		++$counts[ 'fail' === $answer ? 'problem' : $f['group'] ];
	}
	$user = get_userdata( (int) $record['user'] );
	$time = strtotime( $record['date'] . ' UTC' );
	return array(
		'by'     => $user ? $user->display_name : '',
		'when'   => $time ? wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), $time ) : '',
		'source' => $record['source'],
		'counts' => $counts,
	);
}

/**
 * GET: the records, newest first, as the sidebar lists them.
 *
 * @param WP_REST_Request $request The request.
 * @return WP_REST_Response
 */
function surea11y_get_records( $request ) {
	$records = array_reverse( surea11y_records( (int) $request['id'] ) );
	return rest_ensure_response( array( 'records' => array_map( 'surea11y_record_summary', $records ) ) );
}

/**
 * POST: records a check now, by the current person, with the answers people
 * have given so far. A record that would repeat the last one (the same
 * source, findings and answers) is not added.
 *
 * @param WP_REST_Request $request The request.
 * @return WP_REST_Response
 */
function surea11y_add_record( $request ) {
	$post_id  = (int) $request['id'];
	$findings = surea11y_clean_findings( $request['findings'] );
	$reviews  = surea11y_stored_reviews( $post_id );
	$answers  = array();
	foreach ( $findings as $f ) {
		if ( isset( $reviews[ $f['key'] ] ) ) {
			$r                    = $reviews[ $f['key'] ];
			$answers[ $f['key'] ] = array(
				'answer' => surea11y_clean_answer( isset( $r['answer'] ) ? $r['answer'] : 'pass' ),
				'user'   => (int) $r['user'],
				'date'   => (string) $r['date'],
				'note'   => isset( $r['note'] ) ? (string) $r['note'] : '',
			);
		}
	}
	$record = array(
		'date'     => gmdate( 'Y-m-d H:i:s' ),
		'user'     => get_current_user_id(),
		'source'   => (string) $request['source'],
		'url'      => esc_url_raw( (string) $request['url'] ),
		'engine'   => substr( sanitize_text_field( (string) $request['engine'] ), 0, 40 ),
		'pack'     => surea11y_pack_version(),
		'profile'  => sanitize_key( (string) $request['profile'] ),
		'findings' => $findings,
		'answers'  => $answers,
	);

	$records = surea11y_records( $post_id );
	$same    = function ( $a ) use ( $record ) {
		return array( $a['source'], $a['findings'], $a['answers'] ) === array( $record['source'], $record['findings'], $record['answers'] );
	};
	$last_of_source = null;
	foreach ( $records as $r ) {
		if ( $r['source'] === $record['source'] ) {
			$last_of_source = $r;
		}
	}
	$added = ! ( $last_of_source && $same( $last_of_source ) );
	if ( $added ) {
		surea11y_store_record( $post_id, $record );
		surea11y_update_summary( $post_id );
	}
	$response = surea11y_get_records( $request );
	$response->data['added'] = $added;
	return $response;
}

/**
 * The rules by id, from the build: titles and WCAG criteria.
 *
 * @return array
 */
function surea11y_rules_by_id() {
	$out = array();
	foreach ( surea11y_known_rules() as $rule ) {
		$out[ $rule['id'] ] = $rule;
	}
	return $out;
}

/**
 * The words for a group and an answer, in the exports.
 *
 * @return array
 */
function surea11y_export_words() {
	return array(
		'problem'       => __( 'To fix', 'surea11y' ),
		'likely'        => __( 'Likely problem', 'surea11y' ),
		'review'        => __( 'Needs a person', 'surea11y' ),
		'probably-fine' => __( 'Probably fine', 'surea11y' ),
		'pass'          => __( "It's fine", 'surea11y' ),
		'fail'          => __( "It's a problem", 'surea11y' ),
		'unsure'        => __( 'Not sure', 'surea11y' ),
		'editor'        => __( 'Editor', 'surea11y' ),
		'page'          => __( 'Page', 'surea11y' ),
	);
}

/**
 * A cell for CSV, safe to open in a spreadsheet: text that a spreadsheet
 * would read as a formula is started with an apostrophe.
 *
 * @param mixed $value The value.
 * @return string
 */
function surea11y_csv_cell( $value ) {
	$value = (string) $value;
	if ( '' !== $value && false !== strpos( "=+-@\t\r", $value[0] ) ) {
		$value = "'" . $value;
	}
	return '"' . str_replace( '"', '""', $value ) . '"';
}

/**
 * GET export: every record as CSV (one row per finding), or the latest as
 * EARL (JSON-LD), as a file to download.
 *
 * @param WP_REST_Request $request The request.
 * @return WP_REST_Response|WP_Error
 */
function surea11y_export_records( $request ) {
	$post_id = (int) $request['id'];
	$records = surea11y_records( $post_id );
	if ( ! $records ) {
		return new WP_Error( 'surea11y_no_records', __( 'Nothing has been recorded for this post yet.', 'surea11y' ), array( 'status' => 404 ) );
	}
	$rules = surea11y_rules_by_id();
	$words = surea11y_export_words();
	$names = array();
	$name  = function ( $user_id ) use ( &$names ) {
		if ( ! isset( $names[ $user_id ] ) ) {
			$user               = $user_id ? get_userdata( $user_id ) : false;
			$names[ $user_id ] = $user ? $user->display_name : '';
		}
		return $names[ $user_id ];
	};
	$slug = sanitize_title( get_post_field( 'post_name', $post_id ) ? get_post_field( 'post_name', $post_id ) : 'post-' . $post_id );

	if ( 'earl' === $request['format'] ) {
		$body     = wp_json_encode( surea11y_earl( end( $records ), $rules, $name, $post_id ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		$type     = 'application/ld+json';
		$filename = 'accessibility-' . $slug . '.jsonld';
	} else {
		$rows = array(
			array(
				__( 'Recorded on (UTC)', 'surea11y' ),
				__( 'Recorded by', 'surea11y' ),
				__( 'Where', 'surea11y' ),
				__( 'Address', 'surea11y' ),
				__( 'Rule', 'surea11y' ),
				__( 'Rule title', 'surea11y' ),
				__( 'Reason code', 'surea11y' ),
				__( 'Result', 'surea11y' ),
				__( 'WCAG criteria', 'surea11y' ),
				__( 'EN 301 549 clauses', 'surea11y' ),
				__( 'Answer', 'surea11y' ),
				__( 'Answered by', 'surea11y' ),
				__( 'Answered on (UTC)', 'surea11y' ),
				__( 'Note', 'surea11y' ),
				__( 'Finding', 'surea11y' ),
				__( 'Engine', 'surea11y' ),
				__( 'CMS pack', 'surea11y' ),
			),
		);
		foreach ( $records as $record ) {
			foreach ( $record['findings'] as $f ) {
				$rule   = isset( $rules[ $f['rule'] ] ) ? $rules[ $f['rule'] ] : array( 'title' => '', 'wcag' => array() );
				$wcag   = array();
				foreach ( isset( $rule['wcag'] ) ? $rule['wcag'] : array() as $c ) {
					$wcag[] = $c['sc'] . ' (' . $c['level'] . ')';
				}
				// The EN 301 549 clauses the rule's criteria map to, with the
				// version of the standard (from the build: the EN 301 549 pack).
				$en     = isset( $rule['en301549']['clauses'] ) ? implode( '; ', $rule['en301549']['clauses'] ) . ' (' . $rule['en301549']['version'] . ')' : '';
				$answer = isset( $record['answers'][ $f['key'] ] ) ? $record['answers'][ $f['key'] ] : null;
				$rows[] = array(
					$record['date'],
					$name( (int) $record['user'] ),
					$words[ $record['source'] ],
					$record['url'],
					$f['rule'],
					$rule['title'],
					$f['code'],
					$words[ $f['group'] ],
					implode( '; ', $wcag ),
					$en,
					$answer ? $words[ $answer['answer'] ] : '',
					$answer ? $name( $answer['user'] ) : '',
					$answer ? $answer['date'] : '',
					$answer ? $answer['note'] : '',
					$f['key'],
					$record['engine'],
					$record['pack'],
				);
			}
		}
		$lines = array();
		foreach ( $rows as $row ) {
			$lines[] = implode( ',', array_map( 'surea11y_csv_cell', $row ) );
		}
		// A byte order mark, so spreadsheets read the text as UTF-8.
		$body     = "\xEF\xBB\xBF" . implode( "\r\n", $lines ) . "\r\n";
		$type     = 'text/csv; charset=utf-8';
		$filename = 'accessibility-' . $slug . '.csv';
	}

	$response = new WP_REST_Response( null, 200 );
	$response->header( 'Content-Type', $type );
	$response->header( 'Content-Disposition', 'attachment; filename="' . $filename . '"' );
	$response->header( 'X-Content-Type-Options', 'nosniff' );
	$response->set_data( $body );
	return $response;
}

/**
 * Sends an export's body as it is, not as JSON: the REST server would
 * otherwise encode the CSV text as a JSON string.
 *
 * @param bool             $served  Whether the request was already served.
 * @param WP_HTTP_Response $result  The response.
 * @param WP_REST_Request  $request The request.
 * @return bool
 */
function surea11y_serve_export( $served, $result, $request ) {
	if ( $served || ! preg_match( '#^/surea11y/v1/evidence/\d+/export$#', $request->get_route() ) || 200 !== $result->get_status() ) {
		return $served;
	}
	foreach ( $result->get_headers() as $header => $value ) {
		header( $header . ': ' . $value );
	}
	echo $result->get_data(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A file to download: CSV with each cell quoted, or JSON from wp_json_encode.
	return true;
}
add_filter( 'rest_pre_serve_request', 'surea11y_serve_export', 10, 3 );

/**
 * A record as EARL 1.0 in JSON-LD, the shape core's EARL reporter gives
 * (docs/EARL.md in @surea11y/core): the page is the subject; each finding is
 * an assertion by the checker (automatic), and each answer one by the person
 * who gave it (manual).
 *
 * @param array    $record A stored record.
 * @param array    $rules  The rules by id.
 * @param callable $name   A user id to a display name.
 * @param int      $post_id The post.
 * @return array
 */
function surea11y_earl( $record, $rules, $name, $post_id ) {
	$assertor   = array(
		'@type'   => 'Assertor',
		'name'    => 'SureA11y for CMS',
		'release' => array(
			'@type'    => 'Version',
			'revision' => SUREA11Y_VERSION . ( $record['engine'] ? ' (engine ' . $record['engine'] . ', CMS pack ' . $record['pack'] . ')' : '' ),
		),
	);
	$iso        = function ( $date ) {
		return str_replace( ' ', 'T', $date ) . 'Z';
	};
	$assertions = array();
	foreach ( $record['findings'] as $f ) {
		$test = array( 'title' => $f['rule'] );
		$wcag = isset( $rules[ $f['rule'] ]['wcag'] ) ? $rules[ $f['rule'] ]['wcag'] : array();
		if ( $wcag ) {
			$test['isPartOf'] = array_map(
				function ( $c ) {
					return 'WCAG2:' . $c['id'];
				},
				$wcag
			);
		}
		$assertions[] = array(
			'@type'      => 'Assertion',
			'test'       => $test,
			'result'     => array(
				'@type'       => 'TestResult',
				'outcome'     => 'problem' === $f['group'] ? 'earl:failed' : 'earl:cantTell',
				'description' => $f['key'],
				'date'        => $iso( $record['date'] ),
			),
			'assertedBy' => $assertor,
			'mode'       => 'earl:automatic',
		);
		if ( isset( $record['answers'][ $f['key'] ] ) ) {
			$a            = $record['answers'][ $f['key'] ];
			$outcome      = array(
				'pass'   => 'earl:passed',
				'fail'   => 'earl:failed',
				'unsure' => 'earl:cantTell',
			);
			$assertions[] = array(
				'@type'      => 'Assertion',
				'test'       => $test,
				'result'     => array_filter(
					array(
						'@type'       => 'TestResult',
						'outcome'     => $outcome[ $a['answer'] ],
						'description' => $a['note'] ? $a['note'] : $f['key'],
						'date'        => $iso( $a['date'] ),
					)
				),
				'assertedBy' => array(
					'@type' => 'Assertor',
					'name'  => $name( $a['user'] ),
				),
				'mode'       => 'earl:manual',
			);
		}
	}
	return array(
		'@context' => 'https://www.w3.org/WAI/content-assets/wcag-act-rules/earl-context.json',
		'@graph'   => array(
			array(
				'@type'      => 'TestSubject',
				'source'     => $record['url'] ? $record['url'] : get_permalink( $post_id ),
				'date'       => $iso( $record['date'] ),
				'assertions' => $assertions,
			),
		),
	);
}
