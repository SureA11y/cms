<?php
/**
 * A small demo site to try the checker on: a fictional local library with a
 * home page, a few pages and blog posts. Some are clean; others have the
 * mistakes editors commonly make, so there is something to find and fix.
 * Run inside WordPress with WP-CLI (wp-env runs it after it starts):
 *
 *   wp eval-file dev/demo-content.php
 *
 * Running it again changes nothing: it stops when the home page is there.
 *
 * @package SureA11y
 */

defined( 'ABSPATH' ) || exit;
require_once ABSPATH . 'wp-admin/includes/image.php';
wp_set_current_user( 1 );

if ( get_posts( array( 'post_type' => 'page', 'title' => 'Welcome to Riverside Library', 'post_status' => 'any', 'numberposts' => 1 ) ) ) {
	echo "The demo site is already there.\n";
	return;
}

/**
 * An image in the media library: a coloured picture with a caption drawn on
 * it, so the editor shows something recognisable.
 *
 * @param string $file  File name.
 * @param array  $rgb   Background colour.
 * @param string $label Text drawn on it.
 * @return array [ id, url ]
 */
function surea11y_demo_image( $file, $rgb, $label ) {
	$upload = wp_upload_dir();
	$path   = $upload['path'] . '/' . $file;
	$im     = imagecreatetruecolor( 1200, 675 );
	imagefill( $im, 0, 0, imagecolorallocate( $im, $rgb[0], $rgb[1], $rgb[2] ) );
	$white = imagecolorallocate( $im, 255, 255, 255 );
	imagestring( $im, 5, 40, 620, $label, $white );
	imagejpeg( $im, $path, 85 );
	$id = wp_insert_attachment(
		array(
			'post_mime_type' => 'image/jpeg',
			'post_title'     => $label,
			'post_status'    => 'inherit',
		),
		$path
	);
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $path ) );
	return array( $id, wp_get_attachment_url( $id ) );
}

// Blocks, as the editor saves them.
$p = function ( $text ) {
	return "<!-- wp:paragraph -->\n<p>$text</p>\n<!-- /wp:paragraph -->\n\n";
};
$h = function ( $level, $text ) {
	$attrs = 2 === $level ? '' : ' {"level":' . $level . '}';
	return "<!-- wp:heading$attrs -->\n<h$level class=\"wp-block-heading\">$text</h$level>\n<!-- /wp:heading -->\n\n";
};
$img = function ( $image, $alt ) {
	return "<!-- wp:image {\"id\":{$image[0]},\"sizeSlug\":\"large\"} -->\n<figure class=\"wp-block-image size-large\"><img src=\"{$image[1]}\" alt=\"$alt\" class=\"wp-image-{$image[0]}\"/></figure>\n<!-- /wp:image -->\n\n";
};
$ul = function ( $items ) {
	$li = '';
	foreach ( $items as $item ) {
		$li .= "<!-- wp:list-item -->\n<li>$item</li>\n<!-- /wp:list-item -->\n\n";
	}
	return "<!-- wp:list -->\n<ul class=\"wp-block-list\">$li</ul>\n<!-- /wp:list -->\n\n";
};
$coloured = function ( $text, $color, $background = '' ) {
	$style = array( 'text' => $color );
	$css   = "color:$color";
	$class = 'has-text-color';
	if ( $background ) {
		$style['background'] = $background;
		$css                .= ";background-color:$background";
		$class              .= ' has-background';
	}
	$attrs = wp_json_encode( array( 'style' => array( 'color' => $style ) ) );
	return "<!-- wp:paragraph $attrs -->\n<p class=\"$class\" style=\"$css\">$text</p>\n<!-- /wp:paragraph -->\n\n";
};
$table = function ( $rows, $header ) {
	$html = '';
	if ( $header ) {
		$head = array_shift( $rows );
		$html .= '<thead><tr><th>' . implode( '</th><th>', $head ) . '</th></tr></thead>';
	}
	$html .= '<tbody>';
	foreach ( $rows as $row ) {
		$html .= '<tr><td>' . implode( '</td><td>', $row ) . '</td></tr>';
	}
	$html .= '</tbody>';
	return "<!-- wp:table -->\n<figure class=\"wp-block-table\"><table>$html</table></figure>\n<!-- /wp:table -->\n\n";
};
$button = function ( $text, $url ) {
	return "<!-- wp:buttons -->\n<div class=\"wp-block-buttons\"><!-- wp:button -->\n<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"$url\">$text</a></div>\n<!-- /wp:button --></div>\n<!-- /wp:buttons -->\n\n";
};

$reading  = surea11y_demo_image( 'reading-room.jpg', array( 52, 94, 140 ), 'Reading room' );
$children = surea11y_demo_image( 'IMG_2041.jpg', array( 196, 98, 45 ), 'Story time' );
$garden   = surea11y_demo_image( 'garden.jpg', array( 46, 125, 80 ), 'Community garden' );
$hours    = array(
	array( 'Day', 'Opens', 'Closes' ),
	array( 'Monday to Friday', '9:00', '19:00' ),
	array( 'Saturday', '10:00', '14:00' ),
	array( 'Sunday', 'Closed', 'Closed' ),
);

$pages = array(
	// Mostly fine; one image marked as decorative (empty alternative text),
	// which a person should confirm.
	'Welcome to Riverside Library' =>
		$p( 'Riverside Library is a free public library for everyone in the valley: books, study spaces, computers and events for all ages.' )
		. $img( $reading, 'The main reading room, with long wooden tables under tall windows' )
		. $h( 2, 'Visit us' )
		. $p( 'We are open six days a week. See <a href="/opening-hours/">our opening hours</a> for public holidays.' )
		. $img( $garden, '' )
		. $h( 2, 'Join the library' )
		. $p( 'Membership is free. Bring proof of address to any desk, or start online and collect your card later.' )
		. $button( 'Become a member', '/join/' ),

	// Clean: nothing to fix.
	'About us' =>
		$p( 'The library opened in 1962 in the old market hall and moved to its current building by the river in 2004.' )
		. $h( 2, 'Our team' )
		. $p( 'Twelve librarians and about forty volunteers run the library, the mobile library and the home delivery service.' )
		. $h( 2, 'How we are funded' )
		. $p( 'The library is funded by the valley council, with support from the Friends of Riverside Library.' ),

	// A table without headers, a skipped heading level, "click here" and a
	// link to a PDF.
	'Opening hours' =>
		$p( 'Our hours from September to June. Summer hours are shorter.' )
		. $h( 2, 'Weekly hours' )
		. $table( $hours, false )
		. $h( 4, 'Public holidays' )
		. $p( 'We close on public holidays. For the full list of dates, <a href="/wp-content/uploads/holidays-2027.pdf">click here</a>.' )
		. $h( 2, 'Getting here' )
		. $p( 'Buses 4 and 12 stop outside. There are bicycle racks by the main door and two parking spaces for disabled visitors.' ),

	// The same table with headers, for comparison, and pale text.
	'Opening hours (fixed)' =>
		$p( 'Our hours from September to June. Summer hours are shorter.' )
		. $table( $hours, true )
		. $h( 2, 'Public holidays' )
		. $p( 'We close on public holidays: see the <a href="/wp-content/uploads/holidays-2027.pdf">list of public holidays for 2027 (PDF)</a>.' )
		. $coloured( 'Last updated in August.', '#b4b4b4' ),

	// Bold lines used as headings, an image named by its file and white text
	// on yellow.
	'Events' =>
		$p( 'Something on every week, free unless we say otherwise.' )
		. $p( '<strong>Story time</strong>' )
		. $p( 'Tuesdays and Thursdays at 10:30, for children under five and their grown-ups.' )
		. $img( $children, 'IMG_2041.jpg' )
		. $p( '<strong>Book club</strong>' )
		. $p( 'The first Wednesday of each month at 18:30. This season we are reading <em>The River Between</em>.' )
		. $coloured( 'Booking opens on the first of each month.', '#ffffff', '#f2c94c' ),

	// Fine, with a proper list.
	'Contact' =>
		$p( 'Ask us anything at the help desk, by phone on 01234 567890, or by email at <a href="mailto:help@riverside-library.example">help@riverside-library.example</a>.' )
		. $h( 2, 'Other ways to reach us' )
		. $ul( array( 'Text us on 07700 900123', 'Write to Riverside Library, 1 River Walk', 'Leave a note in the box by the main door' ) ),
);

$ids = array();
foreach ( $pages as $title => $content ) {
	$ids[ $title ] = wp_insert_post(
		array(
			'post_title'   => $title,
			'post_content' => $content,
			'post_status'  => 'publish',
			'post_type'    => 'page',
		)
	);
	echo "page\t{$ids[$title]}\t$title\n";
}
update_option( 'show_on_front', 'page' );
update_option( 'page_on_front', $ids['Welcome to Riverside Library'] );
update_option( 'blogname', 'Riverside Library' );
update_option( 'blogdescription', 'Books, study and events by the river' );

$posts = array(
	// Fine.
	'New study rooms on the first floor' =>
		$p( 'Four quiet study rooms are now open on the first floor. Each seats up to six people and has a screen you can connect a laptop to.' )
		. $p( 'Book a room at the help desk or by phone, up to two weeks ahead.' ),
	// Link text that says nothing on its own.
	'Summer reading challenge' =>
		$p( 'Read six books over the summer and collect a medal. The challenge is free and open to children aged four to eleven.' )
		. $p( 'To sign up, <a href="/summer-reading/">read more</a>.' ),
	// Pale grey text, and an image marked as decorative that may not be.
	'The garden is open' =>
		$img( $garden, '' )
		. $p( 'The community garden behind the library is open again. Volunteers meet on Saturday mornings.' )
		. $coloured( 'Gloves and tools are provided.', '#c8c8c8' ),
);
foreach ( $posts as $title => $content ) {
	$id = wp_insert_post(
		array(
			'post_title'   => $title,
			'post_content' => $content,
			'post_status'  => 'publish',
			'post_type'    => 'post',
		)
	);
	echo "post\t$id\t$title\n";
}
