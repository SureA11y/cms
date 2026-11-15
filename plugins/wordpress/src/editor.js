/**
 * The SureA11y sidebar in the block editor. It hands the post's blocks to the
 * panel, which checks them in a hidden frame after a pause in typing, and
 * selects the block a finding is in when "Show" is chosen.
 *
 * Plain script on WordPress's globals: no build step for this file.
 */
( function ( wp, Panel, config ) {
	'use strict';

	if ( ! wp || ! Panel || ! config ) {
		return;
	}

	const { registerPlugin } = wp.plugins;
	const { PluginSidebar, PluginSidebarMoreMenuItem } = wp.editor;
	const { createElement: el, Fragment, useEffect, useRef } = wp.element;
	const { __ } = wp.i18n;
	const data = wp.data;

	Panel.defineResultsElement();

	const SIDEBAR = 'surea11y-sidebar';

	/** The editor canvas's document: the iframe, or the page itself. */
	function canvasDocument() {
		const frame = document.querySelector( 'iframe[name="editor-canvas"]' );
		return ( frame && frame.contentDocument ) || document;
	}

	/** The canvas's style sheets, so the sandbox draws content as it is drawn. */
	function canvasStyles( doc ) {
		return Array.prototype.map
			.call( doc.querySelectorAll( 'link[rel="stylesheet"], style' ), ( node ) => node.outerHTML )
			.join( '\n' );
	}

	/** The post's top-level blocks as the content items the panel scans. */
	function contentItems() {
		return data
			.select( 'core/block-editor' )
			.getBlocks()
			.map( ( block ) => ( { id: block.clientId, html: wp.blocks.getBlockContent( block ) } ) );
	}

	/** Brings a block into view and selects it, which moves focus to it. */
	function showBlock( clientId ) {
		const node = canvasDocument().querySelector( '[data-block="' + clientId + '"]' );
		if ( node ) {
			node.scrollIntoView( { block: 'center' } );
		}
		data.dispatch( 'core/block-editor' ).selectBlock( clientId );
	}

	/**
	 * Mounts the panel in the sidebar: one sandbox, made on first use, a
	 * scheduler that scans after a pause, and a subscription to the blocks.
	 */
	function mount( host ) {
		const results = document.createElement( 'surea11y-results' );
		results.setAttribute( 'heading-level', '3' );
		results.locale = config.locale;
		host.appendChild( results );

		let sandbox = null;
		function sandboxFor() {
			if ( ! sandbox ) {
				const doc = canvasDocument();
				sandbox = Panel.createSandbox( document, {
					engineUrl: config.engineUrl,
					localeUrls: config.localeUrls,
					styles: canvasStyles( doc ),
					bodyClass: ( doc.body.className || '' ).replace( /\b(block-editor\S*|editor-styles-wrapper)\b/g, '' ),
					lang: doc.documentElement.lang || config.locale,
					dir: doc.documentElement.dir || 'ltr',
					width: doc.documentElement.clientWidth || 800,
				} );
			}
			return sandbox;
		}

		async function scan() {
			results.state = 'scanning';
			try {
				const out = await sandboxFor().scan( contentItems(), {
					profile: config.profile,
					packs: config.packs,
					locale: config.locale,
					messages: Panel.messagesFor( config.locale ),
				} );
				if ( out.skippedPacks && out.skippedPacks.length ) {
					throw new Error( out.skippedPacks.map( ( p ) => p.reason || p.name ).join( '; ' ) );
				}
				results.findings = out.findings;
				window.surea11yLastScan = out.timing; // read by the end-to-end tests
			} catch ( error ) {
				results.error = error && error.message ? error.message : String( error );
			}
		}

		const scheduler = Panel.createScheduler( scan, { delay: 1000 } );
		let lastBlocks = data.select( 'core/block-editor' ).getBlocks();
		const unsubscribe = data.subscribe( () => {
			const blocks = data.select( 'core/block-editor' ).getBlocks();
			if ( blocks !== lastBlocks ) {
				lastBlocks = blocks;
				scheduler.changed();
			}
		} );
		const onShow = ( event ) => showBlock( event.detail.itemId );
		results.addEventListener( 'surea11y-show', onShow );
		scheduler.now();

		return function unmount() {
			unsubscribe();
			scheduler.cancel();
			results.removeEventListener( 'surea11y-show', onShow );
			if ( sandbox ) {
				sandbox.destroy();
			}
			results.remove();
		};
	}

	/** The sidebar's body: it exists only while the sidebar is open. */
	function SidebarBody() {
		const ref = useRef( null );
		useEffect( () => ( ref.current ? mount( ref.current ) : undefined ), [] );
		return el( 'div', { ref, className: 'surea11y-sidebar', style: { padding: '16px' } } );
	}

	function Sidebar() {
		return el(
			Fragment,
			null,
			el( PluginSidebarMoreMenuItem, { target: SIDEBAR }, __( 'Accessibility', 'surea11y' ) ),
			el(
				PluginSidebar,
				{ name: SIDEBAR, title: __( 'Accessibility', 'surea11y' ), icon: 'universal-access-alt' },
				el( SidebarBody )
			)
		);
	}

	registerPlugin( 'surea11y', { render: Sidebar } );
} )( window.wp, window.SureA11yPanel, window.surea11yConfig );
