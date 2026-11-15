/**
 * The page checker: on a preview or a published page, for people who can
 * edit it. Nothing runs until it is asked for ("Check accessibility" in the
 * toolbar, or the button this adds when there is no toolbar). Then the
 * engine loads and checks the page as visitors get it, theme included, and
 * each finding says whether it is in the author's content or in the theme.
 *
 * Plain script on the panel's global: no build step for this file.
 */
( function ( Panel ) {
	'use strict';

	const node = document.getElementById( 'surea11y-config' );
	if ( ! Panel || ! node ) {
		return;
	}
	let config;
	try {
		config = JSON.parse( node.textContent );
	} catch {
		return;
	}

	Panel.defineResultsElement();
	const words = Panel.uiStrings( config.locale );
	// The checker's own interface, and WordPress's toolbar, are not the page.
	const EXCLUDE = [ '#wpadminbar', '[data-surea11y-panel]', '[data-surea11y-markers]', '[data-surea11y-launcher]' ];

	let panel = null;
	let results = null;
	let markers = null;

	function elementFor( selector ) {
		try {
			return selector ? document.querySelector( selector ) : null;
		} catch {
			return null;
		}
	}

	function drawMarkers() {
		if ( ! markers ) {
			markers = Panel.createMarkers( document, {
				anchorFor: elementFor,
				onPick: ( cardKey, place ) => results.showPlace( cardKey, place ),
				label: ( card ) => Panel.fill( words.marker, { group: words.groups[ card.group ], summary: card.summary } ),
				outline: true,
				zIndex: 99999,
				// Keep markers clear of the panel at the window's edge.
				reserveEnd: () => ( panel && panel.isOpen() ? panel.host.shadowRoot.querySelector( '.panel' ).offsetWidth + 8 : 0 ),
			} );
		}
		markers.update( results.cards, results.current );
	}

	/**
	 * Saves or reopens a review through the REST API, with the cookie nonce,
	 * and shows the site's answer (who and when). An error takes back what
	 * the list showed.
	 */
	let confirmed = config.reviews && ! Array.isArray( config.reviews ) ? config.reviews : {};
	/** A request to the plugin's REST routes, with the cookie nonce. */
	function rest( path, method, body ) {
		const url = config.restRoot.replace( /\/$/, '' ) + path;
		return window
			.fetch( url, {
				method,
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': config.restNonce },
				body: JSON.stringify( body ),
			} )
			.then( ( r ) => ( r.ok ? r.json() : Promise.reject( new Error( 'HTTP ' + r.status ) ) ) );
	}
	function sendReview( method, body ) {
		if ( ! config.reviewsPath || ! config.restRoot ) {
			return;
		}
		rest( config.reviewsPath, method, body )
			.then( ( r ) => {
				confirmed = r.reviews && ! Array.isArray( r.reviews ) ? r.reviews : {};
				results.reviews = confirmed;
			} )
			.catch( ( error ) => {
				window.console.error( '[SureA11y]', error );  
				results.reviews = confirmed;
			} )
			.then( drawMarkers );
	}

	/**
	 * "Hide for me": kept in the person's editor preferences, so it is the
	 * same here and in the editor. An error takes back what the list showed.
	 */
	let hidden = Array.isArray( config.hidden ) ? config.hidden : [];
	function sendHidden( keys, hide ) {
		if ( ! config.hiddenPath || ! config.restRoot ) {
			return;
		}
		rest( config.hiddenPath, 'POST', { keys, hidden: hide } )
			.then( ( r ) => {
				hidden = Array.isArray( r.hidden ) ? r.hidden : [];
			} )
			.catch( ( error ) => {
				window.console.error( '[SureA11y]', error );  
				results.marked = hidden;
			} )
			.then( drawMarkers );
	}

	function check() {
		results.empty = false;
		results.state = 'scanning';
		Panel.loadEngine( document, [ config.engineUrl ].concat( Object.values( config.localeUrls || {} ) ) )
			// Let "Checking…" show before the check takes the main thread.
			.then( () => new Promise( ( resolve ) => window.requestAnimationFrame( () => setTimeout( resolve, 0 ) ) ) )
			.then( () => {
				const out = Panel.scanPage( document, {
					contentSelector: config.contentSelector,
					excludeSelectors: EXCLUDE,
					profile: config.profile,
					packs: config.packs,
					locale: config.locale,
					messages: Panel.messagesFor( config.locale ),
					labels: { content: words.yourContent, theme: words.themeOrTemplate },
					// Rules the site turned off, in Settings.
					runOnly: config.disabledRules && config.disabledRules.length ? { excludeRuleIds: config.disabledRules } : null,
				} );
				if ( out.skippedPacks.length ) {
					throw new Error( out.skippedPacks.map( ( p ) => p.reason || p.name ).join( '; ' ) );
				}
				results.outline = out.outline;
				results.findings = out.findings;
				window.surea11yLastPageScan = { scanMs: out.scanMs }; // read by the end-to-end tests
				drawMarkers();
			} )
			.catch( ( error ) => {
				window.console.error( '[SureA11y]', error );  
				results.error = error && error.message ? error.message : String( error );
			} );
	}

	function open( opener ) {
		if ( ! panel ) {
			panel = Panel.createPagePanel( document, {
				title: config.title,
				locale: config.locale,
				onClose: () => {
					if ( markers ) {
						markers.destroy();
						markers = null;
					}
				},
			} );
			results = document.createElement( 'surea11y-results' );
			results.setAttribute( 'heading-level', '3' );
			results.locale = config.locale;
			// Personal hides and shared reviews are the same here as in the
			// editor, so both can be made here.
			results.canMark = !! config.hiddenPath;
			results.marked = hidden;
			results.canReview = !! config.canReview;
			results.reviewer = config.reviewer || '';
			results.reviews = config.reviews && ! Array.isArray( config.reviews ) ? config.reviews : {};
			results.editUrl = config.editUrl || '';
			panel.body.appendChild( results );
			results.addEventListener( 'surea11y-show', ( event ) => {
				const el = elementFor( event.detail.itemId );
				if ( el ) {
					el.scrollIntoView( { block: 'center' } );
				}
				drawMarkers();
			} );
			results.addEventListener( 'surea11y-retry', check );
			results.addEventListener( 'surea11y-mark', ( event ) => sendHidden( event.detail.keys, event.detail.fine ) );
			results.addEventListener( 'surea11y-review', ( event ) => sendReview( 'POST', { keys: event.detail.keys, note: event.detail.note } ) );
			results.addEventListener( 'surea11y-reopen', ( event ) => sendReview( 'DELETE', { keys: event.detail.keys } ) );
		}
		if ( panel.isOpen() ) {
			panel.close();
			return;
		}
		panel.open( opener );
		check();
	}

	// The toolbar entry, or a button of our own when there is no toolbar.
	const item = document.querySelector( '#wp-admin-bar-surea11y > a' );
	if ( item ) {
		item.setAttribute( 'role', 'button' );
		item.addEventListener( 'click', ( event ) => {
			event.preventDefault();
			open( item );
		} );
	} else {
		const button = document.createElement( 'button' );
		button.type = 'button';
		button.setAttribute( 'data-surea11y-launcher', '' );
		button.textContent = config.launch;
		button.style.cssText =
			'position:fixed;right:16px;bottom:16px;z-index:99999;min-height:44px;padding:0 16px;border:2px solid #fff;border-radius:22px;' +
			'background:#1d5fa6;color:#fff;font:600 14px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);';
		button.addEventListener( 'click', () => open( button ) );
		document.body.appendChild( button );
	}
} )( window.SureA11yPanel );
