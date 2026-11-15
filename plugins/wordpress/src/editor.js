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

	/*
	 * Every block, inner ones included, is tagged with its id while the
	 * checker renders the post for its sandbox, so a finding inside a group
	 * or columns block names the block it is in, not the group. WordPress
	 * adds these props to the outer element of each block's saved markup; the
	 * filter acts only during the checker's own rendering, never when a post
	 * is saved, and the tag is left out of what identifies a finding.
	 */
	const tagging = { active: false, ids: new Map() }; // a block's attributes object -> its clientId
	wp.hooks.addFilter( 'blocks.getSaveContent.extraProps', 'surea11y/tag-blocks', ( props, blockType, attributes ) => {
		if ( ! tagging.active ) {
			return props;
		}
		const id = tagging.ids.get( attributes );
		return id ? Object.assign( {}, props, { [ Panel.ITEM_ATTRIBUTE ]: id } ) : props;
	} );

	/** Every block of a tree, depth first, in the order they appear. */
	function eachBlock( blocks, fn ) {
		blocks.forEach( ( block ) => {
			fn( block );
			eachBlock( block.innerBlocks || [], fn );
		} );
	}

	/**
	 * The post's top-level blocks as the content items the panel scans, with
	 * the name and order of every block, inner ones included.
	 */
	function contentItems() {
		const blocks = data.select( 'core/block-editor' ).getBlocks();
		const labels = {};
		const names = {};
		const order = [];
		tagging.ids = new Map();
		eachBlock( blocks, ( block ) => {
			const type = wp.blocks.getBlockType( block.name );
			labels[ block.clientId ] = type && type.title ? type.title : '';
			names[ block.clientId ] = block.name;
			order.push( block.clientId );
			tagging.ids.set( block.attributes, block.clientId );
		} );
		tagging.active = true;
		try {
			const items = blocks.map( ( block ) => ( { id: block.clientId, html: wp.blocks.getBlockContent( block ) } ) );
			return { items, labels, names, order };
		} finally {
			tagging.active = false;
			tagging.ids = new Map();
		}
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

	/*
	 * The setting that fixes a finding, opened from its card: the block is
	 * selected, its settings open, and focus goes to the field. Fields are
	 * found by their label, read through WordPress's own translations (the
	 * default text domain), so this works in any language WordPress speaks.
	 */
	const SETTINGS = [
		{
			id: 'alt',
			block: 'core/image',
			rules: [ 'img-alt-present', 'img-alt-quality', 'img-alt-decorative', 'image-redundant-alt' ],
			label: () => words.openAltText,
			field: () => wp.i18n.__( 'Alternative text' ),
		},
		{
			id: 'headers',
			block: 'core/table',
			rules: [ 'td-has-header', 'empty-table-header' ],
			label: () => words.openTableHeaders,
			field: () => wp.i18n.__( 'Header section' ),
		},
	];

	/** The control a visible label names in the block settings, if shown. */
	function settingControl( text ) {
		const scope = document.querySelector( '.block-editor-block-inspector' );
		if ( ! scope ) {
			return null;
		}
		for ( const label of scope.querySelectorAll( 'label' ) ) {
			if ( label.textContent.trim() !== text ) {
				continue;
			}
			const control = ( label.htmlFor && document.getElementById( label.htmlFor ) ) || label.querySelector( 'input, textarea, select' );
			if ( control ) {
				return control;
			}
		}
		return null;
	}

	/** Selects the block, opens its settings, and moves focus to the field. */
	function openSetting( clientId, fieldText ) {
		data.dispatch( 'core/block-editor' ).selectBlock( clientId, null );
		const n = blockNode( clientId );
		if ( n ) {
			n.scrollIntoView( { block: 'center' } );
		}
		const iface = data.dispatch( 'core/interface' );
		if ( iface && iface.enableComplementaryArea ) {
			iface.enableComplementaryArea( 'core', 'edit-post/block' );
			iface.enableComplementaryArea( 'core/edit-post', 'edit-post/block' );
		}
		// The settings render a moment later.
		let tries = 0;
		( function focusWhenThere() {
			const control = settingControl( fieldText );
			if ( control ) {
				control.scrollIntoView( { block: 'center' } );
				control.focus();
				return;
			}
			if ( ++tries < 60 ) {
				window.requestAnimationFrame( focusWhenThere );
			}
		} )();
	}

	/** The settings a card can open: for the place shown, or its first. */
	function settingsFor( card, current ) {
		const place = ( current && current.cardKey === card.key && card.places[ current.place ] ) || card.places.find( ( p ) => p.itemId );
		if ( ! place || ! place.itemId ) {
			return [];
		}
		return SETTINGS.filter( ( s ) => s.block === place.blockName && s.rules.includes( card.ruleId ) ).map( ( s ) => ( {
			id: s.id,
			label: s.label(),
			run: () => openSetting( place.itemId, s.field() ),
		} ) );
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
		// The post's shared reviews: key -> { by, when, note }.
		reviews: {},
		/** Places per group, leaving out what was reviewed or hidden. */
		counts() {
			return Panel.countPlaces( Panel.toCards( this.findings, this.markedKeys(), this.reviews ) );
		},
	};

	/*
	 * Shared reviews ("Reviewed, it's fine"), kept with the post on the site
	 * and read and written through the plugin's REST route. The list shows a
	 * review at once; the answer from the site, with who and when, replaces
	 * it, and an error takes it back.
	 */
	function setReviews( reviews ) {
		checker.reviews = reviews && typeof reviews === 'object' && ! Array.isArray( reviews ) ? reviews : {};
		checker.notify();
	}
	function loadReviews() {
		if ( ! config.reviewsPath ) {
			return;
		}
		wp.apiFetch( { path: config.reviewsPath } )
			.then( ( r ) => setReviews( r.reviews ) )
			.catch( ( error ) => window.console.error( '[SureA11y]', error ) ); // eslint-disable-line no-console
	}
	function sendReview( method, keys, note ) {
		if ( ! config.reviewsPath ) {
			return Promise.resolve();
		}
		const body = method === 'POST' ? { keys, note } : { keys };
		return wp
			.apiFetch( { path: config.reviewsPath, method, data: body } )
			.then( ( r ) => setReviews( r.reviews ) )
			.catch( ( error ) => {
				window.console.error( '[SureA11y]', error ); // eslint-disable-line no-console
				setReviews( Object.assign( {}, checker.reviews ) ); // takes back what the list showed
			} );
	}
	loadReviews();

	// Rules the site turned off, in Settings.
	const DISABLED = Array.isArray( config.disabledRules ) ? config.disabledRules : [];

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

	/*
	 * Contrast runs apart (Phase 0, decision 3). It is about half of a check
	 * (measured: 15 of 30 ms on the typical post, 60 of 97 on the long one),
	 * and in the editor what an author can get wrong is the colours they
	 * chose: the theme's own colours are checked on the page, by the page
	 * checker. So the frequent check leaves the contrast rules out, and they
	 * run only on the blocks with colours of the author's, and only when those
	 * blocks change.
	 */
	// Only rules the content profile runs: naming rules replaces the profile, so
	// an AAA rule such as contrast-enhanced would otherwise join in.
	const CONTRAST_RULES = [ 'contrast-minimum', 'contrast-computable', 'link-in-text-block' ].filter(
		( id ) => ! ( Array.isArray( config.disabledRules ) && config.disabledRules.includes( id ) )
	);
	// WordPress marks the colours an author picks with has-…-color and
	// has-…-background-color classes (and has-inline-color in text), or
	// writes them in a style attribute.
	const OWN_COLOURS = /\bhas-[\w-]*(?:color|background)\b|style="[^"]*(?:color|background)/i;
	const contrast = { key: null, findings: [], ms: 0 };

	async function scan() {
		dirty = false;
		const { items, labels, names, order } = contentItems();
		if ( ! Panel.hasContent( items ) ) {
			// Nothing to check: say so, and don't load the engine for it.
			Object.assign( checker, { state: 'done', empty: true, findings: [], error: '' } );
			checker.notify();
			return;
		}
		checker.state = 'scanning';
		checker.notify();
		try {
			const options = {
				profile: config.profile,
				packs: config.packs,
				locale: config.locale,
				messages: Panel.messagesFor( config.locale ),
			};
			const out = await sandboxFor().scan(
				items,
				Object.assign( {}, options, { runOnly: { excludeRuleIds: CONTRAST_RULES.concat( DISABLED ) } } )
			);
			if ( out.skippedPacks && out.skippedPacks.length ) {
				throw new Error( out.skippedPacks.map( ( p ) => p.reason || p.name ).join( '; ' ) );
			}
			// Contrast, for the author's colours, when they changed.
			const coloured = items.filter( ( item ) => OWN_COLOURS.test( item.html ) );
			const key = coloured.map( ( item ) => item.id + '\u0000' + item.html ).join( '\u0001' );
			let contrastRan = false;
			if ( key !== contrast.key ) {
				contrast.findings = [];
				contrast.ms = 0;
				if ( coloured.length && CONTRAST_RULES.length ) {
					const c = await sandboxFor().scan( coloured, Object.assign( {}, options, { runOnly: { includeRuleIds: CONTRAST_RULES } } ) );
					contrast.findings = c.findings;
					contrast.ms = c.timing.renderMs + c.timing.scanMs;
					contrastRan = true;
				}
				contrast.key = key;
			}
			const findings = Panel.sortFindings(
				out.findings.concat( contrast.findings ),
				order
			);
			Object.assign( checker, {
				state: 'done',
				empty: false,
				error: '',
				findings: findings.map( ( f ) =>
					Object.assign( {}, f, { itemLabel: labels[ f.itemId ] || '', blockName: names[ f.itemId ] || '' } )
				),
			} );
			// Read by the end-to-end tests.
			window.surea11yLastScan = Object.assign( {}, out.timing, { contrastRan, contrastMs: contrast.ms, coloured: coloured.length } );
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
			// Without the background check (Settings), nothing runs while
			// nobody looks: the next view to open checks at once.
			if ( config.background !== false || checker.watching ) {
				scheduler.changed();
			}
		}
		lastBlocks = blocks;
	} );

	/** Checks again in a fresh frame: the last one may be what failed. */
	function retry() {
		if ( sandbox ) {
			sandbox.destroy();
			sandbox = null;
		}
		contrast.key = null;
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
	if ( config.background !== false ) {
		setTimeout( () => idle( () => checker.state === 'idle' && scheduler.now(), { timeout: 5000 } ), 3000 );
	}

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
		results.actionsFor = settingsFor;
		results.canReview = !! config.canReview;
		results.reviews = checker.reviews;
		const me = data.select( 'core' ) && data.select( 'core' ).getCurrentUser ? data.select( 'core' ).getCurrentUser() : null;
		results.reviewer = ( me && me.name ) || '';
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
		let shownReviews = checker.reviews;
		function sync() {
			if ( shownReviews !== checker.reviews ) {
				shownReviews = checker.reviews;
				results.reviews = checker.reviews;
				drawMarkers();
			}
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
		const onReview = ( event ) => {
			drawMarkers();
			sendReview( 'POST', event.detail.keys, event.detail.note );
		};
		const onReopen = ( event ) => {
			drawMarkers();
			sendReview( 'DELETE', event.detail.keys );
		};
		results.addEventListener( 'surea11y-show', onShow );
		results.addEventListener( 'surea11y-mark', onMark );
		results.addEventListener( 'surea11y-review', onReview );
		results.addEventListener( 'surea11y-reopen', onReopen );
		results.addEventListener( 'surea11y-retry', retry );
		const unsubscribe = checker.subscribe( sync );
		const unwatch = watch();
		sync();

		return function unmount() {
			unwatch();
			unsubscribe();
			results.removeEventListener( 'surea11y-show', onShow );
			results.removeEventListener( 'surea11y-mark', onMark );
			results.removeEventListener( 'surea11y-review', onReview );
			results.removeEventListener( 'surea11y-reopen', onReopen );
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
