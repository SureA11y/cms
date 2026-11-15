/**
 * SureA11y in the block editor: the Accessibility sidebar, a count on its
 * toolbar button, and a line in the pre-publish checks.
 *
 * One checker serves all three. It hands the post's blocks to the panel,
 * which checks them in a hidden frame after a pause in editing: one second
 * while the sidebar is open, three while nobody is looking. The first check
 * waits until the browser is idle after the editor loads.
 *
 * Plain script on WordPress's globals: no build step for this file.
 */
( function ( wp, Panel ) {
	'use strict';

	const node = document.getElementById( 'surea11y-config' );
	if ( ! wp || ! Panel || ! node ) {
		return;
	}
	let config;
	try {
		config = JSON.parse( node.textContent );
	} catch ( e ) {
		return;
	}

	const { registerPlugin } = wp.plugins;
	const editorApi = wp.editor || {};
	const editPostApi = wp.editPost || {};
	const PluginSidebar = editorApi.PluginSidebar || editPostApi.PluginSidebar;
	const PluginSidebarMoreMenuItem = editorApi.PluginSidebarMoreMenuItem || editPostApi.PluginSidebarMoreMenuItem;
	const PluginPrePublishPanel = editorApi.PluginPrePublishPanel || editPostApi.PluginPrePublishPanel;
	const { createElement: el, Fragment, useEffect, useRef, useState } = wp.element;
	const { Button, Dashicon } = wp.components;
	const { __ } = wp.i18n;
	const data = wp.data;
	const words = Panel.uiStrings( config.locale );

	Panel.defineResultsElement();

	const SIDEBAR = 'surea11y-sidebar';

	/* ---------- the post ---------- */

	/** The editor canvas's document: the iframe, or the page itself. */
	function canvasDocument() {
		const frame = document.querySelector( 'iframe[name="editor-canvas"]' );
		return ( frame && frame.contentDocument ) || document;
	}

	/** The canvas's style sheets, so the sandbox draws content as it is drawn. */
	function canvasStyles( doc ) {
		return Array.prototype.map
			.call( doc.querySelectorAll( 'link[rel="stylesheet"], style' ), ( n ) => n.outerHTML )
			.join( '\n' );
	}

	/** The post's top-level blocks as the content items the panel scans. */
	function contentItems() {
		return data
			.select( 'core/block-editor' )
			.getBlocks()
			.map( ( block ) => {
				const type = wp.blocks.getBlockType( block.name );
				return {
					id: block.clientId,
					html: wp.blocks.getBlockContent( block ),
					label: type && type.title ? type.title : '',
				};
			} );
	}

	/** The element that shows a block on the canvas. */
	function blockNode( clientId ) {
		return canvasDocument().querySelector( '[data-block="' + clientId + '"]' );
	}

	/**
	 * Brings a block into view and selects it. "Show" lets the editor move
	 * focus to the block, to edit it; the arrows keep focus in the sidebar,
	 * so a keyboard user can keep stepping.
	 */
	function showBlock( clientId, keepFocus ) {
		const n = blockNode( clientId );
		if ( n ) {
			n.scrollIntoView( { block: 'center' } );
		}
		data.dispatch( 'core/block-editor' ).selectBlock( clientId, keepFocus ? null : 0 );
	}

	/**
	 * What the person marked as fine, kept per post in their own editor
	 * preferences (saved for their account, not shared with others).
	 */
	const PREFS = 'surea11y';
	const MAX_MARKED = 500;
	function postKey() {
		const editor = data.select( 'core/editor' );
		return String( editor && editor.getCurrentPostId ? editor.getCurrentPostId() : '' );
	}
	function markedKeys() {
		const all = data.select( 'core/preferences' ).get( PREFS, 'fine' ) || {};
		return all[ postKey() ] || [];
	}
	function saveMarked( keys ) {
		const all = Object.assign( {}, data.select( 'core/preferences' ).get( PREFS, 'fine' ) || {} );
		all[ postKey() ] = keys.slice( -MAX_MARKED );
		data.dispatch( 'core/preferences' ).set( PREFS, 'fine', all );
	}

	/* ---------- the checker ---------- */

	const checker = {
		state: 'idle', // 'idle', 'scanning', 'done' or 'error'
		findings: [],
		empty: false,
		error: '',
		marked: null, // read from the preferences on first use
		watching: 0, // how many views are open (the sidebar, the pre-publish panel)
		listeners: new Set(),
		subscribe( fn ) {
			this.listeners.add( fn );
			return () => this.listeners.delete( fn );
		},
		notify() {
			this.listeners.forEach( ( fn ) => fn() );
		},
		markedKeys() {
			if ( ! this.marked ) {
				this.marked = markedKeys();
			}
			return this.marked;
		},
		/** Places per group, leaving out what the person marked as fine. */
		counts() {
			return Panel.countPlaces( Panel.toCards( this.findings, this.markedKeys() ) );
		},
	};

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

	// True when the blocks changed after the last check began.
	let dirty = false;

	async function scan() {
		dirty = false;
		const items = contentItems();
		if ( ! Panel.hasContent( items ) ) {
			// Nothing to check: say so, and don't load the engine for it.
			Object.assign( checker, { state: 'done', empty: true, findings: [], error: '' } );
			checker.notify();
			return;
		}
		checker.state = 'scanning';
		checker.notify();
		try {
			const out = await sandboxFor().scan( items, {
				profile: config.profile,
				packs: config.packs,
				locale: config.locale,
				messages: Panel.messagesFor( config.locale ),
			} );
			if ( out.skippedPacks && out.skippedPacks.length ) {
				throw new Error( out.skippedPacks.map( ( p ) => p.reason || p.name ).join( '; ' ) );
			}
			const labels = {};
			items.forEach( ( item ) => {
				labels[ item.id ] = item.label;
			} );
			Object.assign( checker, {
				state: 'done',
				empty: false,
				error: '',
				findings: out.findings.map( ( f ) => Object.assign( {}, f, { itemLabel: labels[ f.itemId ] || '' } ) ),
			} );
			window.surea11yLastScan = out.timing; // read by the end-to-end tests
		} catch ( error ) {
			window.console.error( '[SureA11y]', error ); // eslint-disable-line no-console
			Object.assign( checker, { state: 'error', error: error && error.message ? error.message : String( error ) } );
		}
		checker.notify();
	}

	const scheduler = Panel.createScheduler( scan, { delay: () => ( checker.watching ? 1000 : 3000 ) } );
	let lastBlocks = null;
	data.subscribe( () => {
		const blocks = data.select( 'core/block-editor' ).getBlocks();
		if ( lastBlocks !== null && blocks !== lastBlocks ) {
			dirty = true;
			scheduler.changed();
		}
		lastBlocks = blocks;
	} );

	/** Checks again in a fresh frame: the last one may be what failed. */
	function retry() {
		if ( sandbox ) {
			sandbox.destroy();
			sandbox = null;
		}
		scheduler.now();
	}

	/**
	 * A view opened: it gets the last results now, and a check at once if
	 * there are none or the content changed since (the last ones are stale).
	 */
	function watch() {
		checker.watching++;
		if ( checker.state === 'idle' || dirty ) {
			scheduler.now();
		}
		return () => {
			checker.watching--;
		};
	}

	// The first check, for the toolbar count, once the browser is idle after
	// the editor has loaded: it never competes with the editor starting up.
	const idle = window.requestIdleCallback || ( ( fn ) => setTimeout( fn, 2000 ) );
	setTimeout( () => idle( () => checker.state === 'idle' && scheduler.now(), { timeout: 5000 } ), 3000 );

	/** Re-renders a component when the checker changes. */
	function useChecker() {
		const [ , setTick ] = useState( 0 );
		useEffect( () => checker.subscribe( () => setTick( ( n ) => n + 1 ) ), [] );
		return checker;
	}

	/* ---------- the sidebar ---------- */

	/**
	 * Mounts the results list in the sidebar, fed by the checker, with the
	 * markers beside the blocks.
	 */
	function mount( host ) {
		const results = document.createElement( 'surea11y-results' );
		results.setAttribute( 'heading-level', '3' );
		results.locale = config.locale;
		results.marked = checker.markedKeys();
		host.appendChild( results );

		// Markers beside the blocks, in the canvas. The canvas can be replaced
		// (a device preview, a template switch), so they follow it.
		let markers = null;
		function drawMarkers() {
			const doc = canvasDocument();
			if ( markers && markers.doc !== doc ) {
				markers.destroy();
				markers = null;
			}
			if ( ! markers ) {
				markers = Panel.createMarkers( doc, {
					anchorFor: blockNode,
					onPick: ( cardKey, place ) => results.showPlace( cardKey, place ),
					label: ( card ) => Panel.fill( words.marker, { group: words.groups[ card.group ], summary: card.summary } ),
				} );
			}
			markers.update( results.cards, results.current );
		}

		let shown = null;
		function sync() {
			if ( checker.state === 'scanning' ) {
				results.state = 'scanning';
				return;
			}
			if ( checker.state === 'error' ) {
				results.error = checker.error;
				return;
			}
			if ( checker.state !== 'done' || shown === checker.findings ) {
				if ( results.state === 'scanning' ) {
					results.state = 'done';
				}
				return;
			}
			shown = checker.findings;
			results.empty = checker.empty;
			results.findings = checker.findings;
			drawMarkers();
		}

		const onShow = ( event ) => {
			showBlock( event.detail.itemId, event.detail.via === 'step' );
			drawMarkers();
		};
		const onMark = () => {
			checker.marked = results.marked;
			saveMarked( checker.marked );
			drawMarkers();
			checker.notify();
		};
		results.addEventListener( 'surea11y-show', onShow );
		results.addEventListener( 'surea11y-mark', onMark );
		results.addEventListener( 'surea11y-retry', retry );
		const unsubscribe = checker.subscribe( sync );
		const unwatch = watch();
		sync();

		return function unmount() {
			unwatch();
			unsubscribe();
			results.removeEventListener( 'surea11y-show', onShow );
			results.removeEventListener( 'surea11y-mark', onMark );
			results.removeEventListener( 'surea11y-retry', retry );
			if ( markers ) {
				markers.destroy();
			}
			results.remove();
		};
	}

	/** The sidebar's body: it exists only while the sidebar is open. */
	function SidebarBody() {
		const ref = useRef( null );
		useEffect( () => ( ref.current ? mount( ref.current ) : undefined ), [] );
		return el( 'div', { ref, className: 'surea11y-sidebar' } );
	}

	/** Places to fix or confirm: the count on the toolbar button. */
	function toFixOrConfirm() {
		const counts = checker.counts();
		return counts.problem + counts.likely;
	}

	/**
	 * The toolbar icon, with a count of what to fix or confirm. The count is
	 * a visual extra: the button keeps its name, and the same numbers are in
	 * the sidebar and the pre-publish panel, in words.
	 */
	function ToolbarIcon() {
		useChecker();
		const n = checker.state === 'done' ? toFixOrConfirm() : 0;
		return el(
			'span',
			{ className: 'surea11y-toolbar-icon' },
			el( Dashicon, { icon: 'universal-access-alt' } ),
			n > 0 ? el( 'span', { className: 'surea11y-badge', 'aria-hidden': 'true', title: Panel.fill( words.toolbarCount, { n } ) }, n > 99 ? '99+' : String( n ) ) : null
		);
	}

	/* ---------- the pre-publish line ---------- */

	function openSidebar() {
		const name = 'surea11y/' + SIDEBAR;
		const editor = data.dispatch( 'core/editor' );
		if ( editor && editor.closePublishSidebar ) {
			editor.closePublishSidebar();
		}
		const iface = data.dispatch( 'core/interface' );
		if ( iface && iface.enableComplementaryArea ) {
			iface.enableComplementaryArea( 'core', name );
			iface.enableComplementaryArea( 'core/edit-post', name );
		}
	}

	/** What the check found, in one line, with a way to the sidebar. Never blocks publishing. */
	function PrePublishBody() {
		useChecker();
		useEffect( () => watch(), [] );
		let text;
		if ( checker.state === 'error' ) {
			text = words.errorTitle;
		} else if ( checker.state !== 'done' ) {
			text = words.checking;
		} else if ( checker.empty ) {
			text = words.emptyTitle;
		} else {
			const c = checker.counts();
			text = c.problem + c.likely + c.review > 0
				? Panel.fill( words.prepublish, { problem: c.problem, likely: c.likely, review: c.review } )
				: words.prepublishNothing;
		}
		return el(
			Fragment,
			null,
			el( 'p', { role: 'status', className: 'surea11y-prepublish-status' }, text ),
			el( 'p', { className: 'surea11y-prepublish-note' }, words.prepublishNote ),
			el( Button, { variant: 'secondary', onClick: openSidebar }, words.prepublishReview )
		);
	}

	function Plugin() {
		return el(
			Fragment,
			null,
			el( PluginSidebarMoreMenuItem, { target: SIDEBAR }, __( 'Accessibility', 'surea11y' ) ),
			el(
				PluginSidebar,
				{ name: SIDEBAR, title: __( 'Accessibility', 'surea11y' ), icon: el( ToolbarIcon ) },
				el( SidebarBody )
			),
			PluginPrePublishPanel
				? el(
						PluginPrePublishPanel,
						{ title: __( 'Accessibility', 'surea11y' ), initialOpen: true, className: 'surea11y-prepublish' },
						el( PrePublishBody )
				  )
				: null
		);
	}

	registerPlugin( 'surea11y', { render: Plugin } );
} )( window.wp, window.SureA11yPanel );
