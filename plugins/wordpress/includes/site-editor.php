<?php
/**
 * The checker in the Site Editor: templates and template parts (headers,
 * footers), where theme problems are fixed. Most of a template is dynamic
 * blocks (site title, navigation, query loop, template parts) that have no
 * saved markup, so the sidebar sends the template's blocks here and gets
 * them back rendered as WordPress renders them for visitors; the check
 * itself runs in the browser, as for posts. Nothing leaves the site.
 *
 * Each block arrives with a class naming its block in the editor
 * (`surea11y-item--<clientId>`); WordPress keeps a block's classes on its
 * outer element, and the render turns that class into the attribute the
 * panel reads, so a finding names the block it is in.
 *
 * @package SureA11y
 */

defined( 'ABSPATH' ) || exit;

const SUREA11Y_RENDER_MAX_ITEMS = 200;
const SUREA11Y_RENDER_MAX_BYTES = 1048576; // All the markup sent at once.
const SUREA11Y_ITEM_CLASS       = 'surea11y-item--';

/**
 * Who may render templates for the checker: people who see the checker and
 * can edit the site's templates.
 *
 * @return bool
 */
function surea11y_render_permission() {
	return surea11y_can_see() && current_user_can( 'edit_theme_options' );
}

/** The route. */
function surea11y_register_render_route() {
	register_rest_route(
		'surea11y/v1',
		'/render',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'surea11y_render_items',
			'permission_callback' => 'surea11y_render_permission',
			'args'                => array(
				'items' => array(
					'type'     => 'array',
					'required' => true,
					'items'    => array(
						'type'       => 'object',
						'properties' => array(
							'id'     => array( 'type' => 'string' ),
							'markup' => array( 'type' => 'string' ),
						),
					),
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'surea11y_register_render_route' );

/**
 * Turns each `surea11y-item--<id>` class into the panel's item attribute,
 * and removes the class, so the class is never what a finding is about.
 *
 * @param string $html Rendered blocks.
 * @return string
 */
function surea11y_tag_rendered( $html ) {
	if ( false === strpos( $html, SUREA11Y_ITEM_CLASS ) || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
		return $html;
	}
	$tags = new WP_HTML_Tag_Processor( $html );
	while ( $tags->next_tag() ) {
		$classes = $tags->get_attribute( 'class' );
		if ( ! is_string( $classes ) || false === strpos( $classes, SUREA11Y_ITEM_CLASS ) ) {
			continue;
		}
		foreach ( preg_split( '/\s+/', trim( $classes ) ) as $class ) {
			if ( 0 === strpos( $class, SUREA11Y_ITEM_CLASS ) ) {
				$id = substr( $class, strlen( SUREA11Y_ITEM_CLASS ) );
				$tags->remove_class( $class );
				if ( preg_match( '/^[A-Za-z0-9-]{1,64}$/', $id ) && null === $tags->get_attribute( 'data-surea11y-item' ) ) {
					$tags->set_attribute( 'data-surea11y-item', $id );
				}
			}
		}
		if ( '' === trim( (string) $tags->get_attribute( 'class' ) ) ) {
			$tags->remove_attribute( 'class' );
		}
	}
	return $tags->get_updated_html();
}

/**
 * POST: renders each item's block markup as WordPress renders it for
 * visitors, and returns { items: [ { id, html } ] }.
 *
 * @param WP_REST_Request $request The request.
 * @return WP_REST_Response|WP_Error
 */
function surea11y_render_items( $request ) {
	$items = $request['items'];
	if ( ! is_array( $items ) || count( $items ) > SUREA11Y_RENDER_MAX_ITEMS ) {
		return new WP_Error( 'surea11y_render_items', __( 'Too many blocks to check at once.', 'surea11y' ), array( 'status' => 400 ) );
	}
	$bytes = 0;
	foreach ( $items as $item ) {
		$bytes += isset( $item['markup'] ) ? strlen( (string) $item['markup'] ) : 0;
	}
	if ( $bytes > SUREA11Y_RENDER_MAX_BYTES ) {
		return new WP_Error( 'surea11y_render_size', __( 'The template is too large to check at once.', 'surea11y' ), array( 'status' => 400 ) );
	}
	$out = array();
	foreach ( $items as $item ) {
		$id = isset( $item['id'] ) ? (string) $item['id'] : '';
		if ( ! preg_match( '/^[A-Za-z0-9-]{1,64}$/', $id ) ) {
			continue;
		}
		$out[] = array(
			'id'   => $id,
			'html' => surea11y_tag_rendered( do_blocks( (string) $item['markup'] ) ),
		);
	}
	return rest_ensure_response( array( 'items' => $out ) );
}
