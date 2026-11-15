<?php
/**
 * Creates the Phase 0 test posts (short, typical, long) in a local WordPress.
 * Usage: php make-content.php /path/to/wordpress
 * Each post mixes ordinary content with mistakes editors commonly make.
 */
$probe_wp_dir = rtrim( $argv[1] ?? '', '/' );
require $probe_wp_dir . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
wp_set_current_user( 1 );

function probe_image( $name, $rgb ) {
	$upload = wp_upload_dir();
	$file   = $upload['path'] . '/' . $name;
	$im     = imagecreatetruecolor( 800, 450 );
	imagefill( $im, 0, 0, imagecolorallocate( $im, $rgb[0], $rgb[1], $rgb[2] ) );
	imagepng( $im, $file );
	$id = wp_insert_attachment( array( 'post_mime_type' => 'image/png', 'post_title' => $name, 'post_status' => 'inherit' ), $file );
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $file ) );
	return array( $id, wp_get_attachment_url( $id ) );
}

$images = array( probe_image( 'IMG_1234.png', array( 40, 90, 160 ) ), probe_image( 'team.png', array( 200, 120, 40 ) ), probe_image( 'chart.png', array( 30, 140, 90 ) ) );

function p( $t ) { return "<!-- wp:paragraph -->\n<p>$t</p>\n<!-- /wp:paragraph -->\n\n"; }
function h( $l, $t ) { return "<!-- wp:heading {\"level\":$l} -->\n<h$l class=\"wp-block-heading\">$t</h$l>\n<!-- /wp:heading -->\n\n"; }
function img( $im, $alt ) { return "<!-- wp:image {\"id\":{$im[0]}} -->\n<figure class=\"wp-block-image\"><img src=\"{$im[1]}\" alt=\"$alt\" class=\"wp-image-{$im[0]}\"/></figure>\n<!-- /wp:image -->\n\n"; }
function ul( $items ) { $li = ''; foreach ( $items as $i ) { $li .= "<!-- wp:list-item -->\n<li>$i</li>\n<!-- /wp:list-item -->\n"; } return "<!-- wp:list -->\n<ul class=\"wp-block-list\">$li</ul>\n<!-- /wp:list -->\n\n"; }
function table_noheader() { return "<!-- wp:table -->\n<figure class=\"wp-block-table\"><table><tbody><tr><td>Plan</td><td>Price</td></tr><tr><td>Basic</td><td>10</td></tr><tr><td>Pro</td><td>20</td></tr></tbody></table></figure>\n<!-- /wp:table -->\n\n"; }
function quote( $t ) { return "<!-- wp:quote -->\n<blockquote class=\"wp-block-quote\">" . p( $t ) . "</blockquote>\n<!-- /wp:quote -->\n\n"; }
function button( $t ) { return "<!-- wp:buttons -->\n<div class=\"wp-block-buttons\"><!-- wp:button -->\n<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"https://example.test/signup\">$t</a></div>\n<!-- /wp:button --></div>\n<!-- /wp:buttons -->\n\n"; }

$lorem = 'Accessible content helps every reader. Short sentences, clear headings and meaningful links make a page easier to scan and to understand.';

function section( $i, $images, $lorem ) {
	$s  = h( 2, "Section $i: what changed this month" );
	$s .= p( "$lorem Read the <a href=\"https://example.test/report-$i\">full report for section $i</a> for details." );
	$s .= p( "$lorem For the pricing sheet, <a href=\"https://example.test/prices-$i.pdf\">click here</a>." );
	$s .= h( 3, 'Key points' );
	$s .= ul( array( 'Faster checkout', 'Clearer error messages', 'New <a href="https://example.test/help">help centre</a>' ) );
	$s .= img( $images[ $i % 3 ], 0 === $i % 3 ? 'IMG_1234.png' : ( 1 === $i % 3 ? 'The support team at the spring meeting' : '' ) );
	$s .= p( '<strong>Next steps</strong>' );
	$s .= p( $lorem );
	if ( 0 === $i % 4 ) { $s .= table_noheader(); }
	if ( 1 === $i % 4 ) { $s .= quote( 'It took me two minutes to find what I needed.' ); }
	if ( 2 === $i % 4 ) { $s .= button( 'Sign up' ); }
	if ( 3 === $i % 4 ) { $s .= h( 5, 'A skipped level' ); }
	$s .= p( 'Visit https://example.test/very/long/address/that/editors/paste for more. ' . $lorem );
	return $s;
}

$sizes = array( 'short' => 1, 'typical' => 6, 'long' => 40 );
$ids   = array();
foreach ( $sizes as $name => $sections ) {
	$content = p( $lorem );
	for ( $i = 0; $i < $sections; $i++ ) { $content .= section( $i, $images, $lorem ); }
	$ids[ $name ] = wp_insert_post( array( 'post_title' => "Probe $name post", 'post_content' => $content, 'post_status' => 'publish', 'post_type' => 'post' ) );
	$blocks = count( array_filter( parse_blocks( $content ), function ( $b ) { return ! empty( $b['blockName'] ); } ) );
	echo "$name\t{$ids[$name]}\t$blocks top-level blocks\n";
}
file_put_contents( __DIR__ . '/results/posts.json', wp_json_encode( $ids ) );
