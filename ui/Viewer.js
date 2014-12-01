/**
 * @license Copyright (c) 2003-2014, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

define( [
	'ui/ViewerDescription',
	'ui/ViewerNavigation',
	'ui/ViewerForm',
	'ui/ViewerListeningIndicator',
	'ui/ViewerFocusManager',
	'ui/ViewerMode'
], function(
	ViewerDescription,
	ViewerNavigation,
	ViewerForm,
	ViewerListeningIndicator,
	ViewerFocusManager,
	ViewerMode
) {
	'use strict';

	/**
	 * A class which represents the end-user interface of a11ychecker. Viewer is a panel
	 * which allows to browse and fix issues in the contents.
	 *
	 * *Note*: The panel is built upon the {@link CKEDITOR.ui.panel}.
	 *
	 * @since 4.5
	 * @class CKEDITOR.plugins.a11ychecker.viewer
	 * @constructor Creates a viewer instance.
	 * @param {CKEDITOR.editor} editor The editor instance for which the panel is created.
	 * @param {Object} definition An object containing panel definition.
	 */
	function Viewer( editor, definition ) {
		/**
		 * The editor of this viewer.
		 */
		this.editor = editor;

		/**
		 * The {@link CKEDITOR.ui.panel} of this viewer.
		 */
		this.panel = new CKEDITOR.ui.balloonPanel( editor, definition );

		/**
		 * The {@link CKEDITOR.plugins.a11ychecker.ui.ViewerFocusManager} of this viewer.
		 */
		this.focusManager = new ViewerFocusManager();

		/**
		 * Mode of the Viewer. See {@link CKEDITOR.plugins.a11ychecker.viewerMode}, {@link #modes}, {@link #setMode}.
		 */
		this.modes = {};

		/**
		 * Current mode of the Viewer. See {@link CKEDITOR.plugins.a11ychecker.viewerMode}, {@link #modes}, {@link #setMode}.
		 */
		this.mode = null;

		/**
		 * @readonly
		 * @property {Object} lang Localization `a11ychecker` property object from {@link CKEDITOR.editor#lang}.
		 */
		this.lang = editor.lang.a11ychecker;

		/**
		 * @todo: HACK DETECTED! For the time being we weill simply inject ViewerFocusManager
		 * function to panel. Later on this manager will have to be used in balloon.
		 */
		var that = this;

		this.panel.registerFocusable = function( elem ) {
			that.focusManager.addItem( elem );
			// Adding a item to editor.focusManager is required so that focusing the element outside
			// the editable element won't blur inline editor. (#11)
			that.editor.focusManager.add( elem );
		};

		this.panel.deregisterFocusable = function( elem ) {
			that.focusManager.removeItem( elem );
			that.editor.focusManager.remove( elem );
		};

		// Hide the panel once the closing X is clicked.
		this.panel.addShowListener( function() {
			return this.parts.close.on( 'click', function( evt ) {
				this.blur();
				this.hide();
				evt.data.preventDefault();
			}, this );
		} );

		this.panel.addShowListener( function() {
			return this.parts.panel.on( 'keydown', function( evt ) {
				var keystroke = evt.data.getKeystroke();

				// Hide the panel on ESC key press.
				if ( keystroke == 27 ) {
					this.blur();
					this.hide();
					evt.data.preventDefault();
				}
			}, this );
		} );

		this.setupNavigation();
		this.setupDescription();
		this.setupForm();
		this.setupListeningIndicator();

		this.setupModes();
		this.setMode( 'checking' );
	}

	/**
	 * A minimal number of milliseconds between `scroll` event listener calls.
	 *
	 * This listener is used for repositioning of the balloon.
	 *
	 * Higher number is more performance friendly, but gives worse UX.
	 *
	 * @constant
	 */
	Viewer.SCROLL_THROTTLING_RATE = 200;

	Viewer.prototype = {
		/**
		 * @property modesDefinition Mode definitions of the viewer.
		 * Converted into {@link CKEDITOR.plugins.a11ychecker.viewerMode} in {@link #setupModes}.
		 * @property {String} modesDefinition.listening Definition of the viewer in listening mode.
		 * @property {String} modesDefinition.checking Definition of the viewer in checking mode.
		 */
		modesDefinition: {
			listening: {
				// Attaches the panel to the lower-right corner of the viewport.
				attachToViewport: function( viewer ) {
					viewer.panel.parts.panel.setStyles( {
						right: '10px',
						bottom: '10px'
					} );
				},

				// Attaches the panel to the lower-right corner of the editor when maximized.
				// In considers vertical scrollbar width and bottom space height to place the panel
				// precisely in the corner of editable.
				attachToEditable: function( viewer ) {
					var contentsSpace = viewer.editor.ui.space( 'contents' ),
						contentsSpaceRect = contentsSpace.getClientRect(),
						documentElementRect = viewer.editor.document.getDocumentElement().getClientRect(),
						winGlobal = CKEDITOR.document.getWindow(),
						paneSize = winGlobal.getViewPaneSize();

					viewer.panel.parts.panel.setStyles( {
						right: ( contentsSpaceRect.width - documentElementRect.width ) + 10 + 'px',
						bottom: ( paneSize.height - contentsSpaceRect.bottom ) + 10 + 'px'
					} );
				},

				init: function( viewer ) {
					var that = this;

					// Apply panel class, which is specific for listening mode, e.g. it hides unnecessary
					// panel elements, enables CSS animations etc.
					viewer.panel.parts.panel.addClass( 'cke_a11yc_mode_listening' );

					// Reset panel dimensions to auto.
					viewer.panel.resize( 250, 'auto' );

					// Give it some time for the new dimensions to be applied.
					CKEDITOR.tools.setTimeout( function() {
						var panelRect = viewer.panel.parts.panel.getClientRect(),
							winGlobal = CKEDITOR.document.getWindow(),
							paneSize = winGlobal.getViewPaneSize();

						// Since the panel is to be attached in the bottom-right corner of the viewport,
						// it must get [ position: fixed, bottom, right ]. However, by default, the panel
						// has [ position: absolute, top, left ] (see BalloonPanel#move) and it means that such
						// transition would not animate. That's why converting *current* panel position
						// from [ position: absolute, top, left ] to [ position: fixed, bottom, right ].
						viewer.panel.parts.panel.setStyles( {
							position: 'fixed',
							top: null,
							left: null,
							right: paneSize.width - panelRect.right + 'px',
							bottom: paneSize.height - panelRect.bottom + 'px'
						} );

						// That's mostly for Firefox, which needs some additional time to update styles.
						CKEDITOR.tools.setTimeout( function() {
							var maximizeCommand = viewer.editor.getCommand( 'maximize' );

							// Now that the panel position is determined by [ position: fixed, bottom, right ],
							// the target position can be set and the transition will animate.
							that[ maximizeCommand && maximizeCommand.state === 1 ? 'attachToEditable' : 'attachToViewport' ]( viewer );
						}, 0 );
					}, 0, this );
				},

				close: function( viewer ) {
					viewer.panel.parts.panel.removeClass( 'cke_a11yc_mode_listening' );
					viewer.panel.resize( viewer.panel.width, viewer.panel.height );
					viewer.panel.parts.panel.setStyles( {
						position: 'absolute',
						right: null,
						bottom: null
					} );
				},

				panelShowListeners: function( viewer ) {
					var that = this;

					return [
						// Update panel position when editor gets maximized.
						function() {
							return this.editor.on( 'maximize', function( evt ) {
								that[ evt.data === 1 ? 'attachToEditable' : 'attachToViewport' ]( viewer );
							} );
						}
					];
				}
			},

			checking: {
				panelShowListeners: function( viewer ) {
					// Function tells if element is visible within window viewport.
					// It considers only y axis for simplification sake.
					function isElementInViewport( element, window ) {
						// Y offset for bottom edge of the element.
						var yOffset = element.$.offsetTop,
							yOffsetWithHeight = yOffset + element.getClientRect().height,
							scrollYOffset = window.getScrollPosition().y;

						return scrollYOffset <= yOffsetWithHeight && scrollYOffset + window.$.innerHeight >= yOffset;
					}

					return [
						// Repositions balloon / unset focused issue on classic editor scroll.
						function() {
							var editor = viewer.editor,
								// We'll use throttling for scroll listener to reduce performance impact.
								scrollListener = CKEDITOR.tools.eventsBuffer( Viewer.SCROLL_THROTTLING_RATE, function() {
									// Only in case of classic editor, we want to detect a situation when
									// issue element is out of viewport. If it's outside then it should be hidden.
									if ( !editor.editable().isInline() ) {
										var a11ychecker = editor._.a11ychecker,
											issue = a11ychecker.issues.getFocused(),
											panel = viewer.panel;

										// It may happen that there's no focused issue.
										if ( !issue ) {
											return;
										}

										if ( !isElementInViewport( issue.element, editor.window ) ) {
											// If issue element is no longer in the viewport we're going to
											// remove the focus.
											a11ychecker.issues.resetFocus();
											panel.hide();
										} else {
											// And if element is still in viewport we're going to update its position.
											panel.attach( issue.element, false );
										}
									}
								} );

							return this.editor.window.on( 'scroll', scrollListener.input );
						},

						// Hide the panel on editor resize.
						function() {
							return this.editor.on( 'resize', function() {
								this.blur();
								this.hide();
							}, this );
						}
					];
				}
			}
		},

		/**
		 * Setups the navigation bar.
		 */
		setupNavigation: function() {
			this.navigation = new ViewerNavigation( this, this.editor.lang.a11ychecker );

			// Register focusables.
			this.panel.registerFocusable( this.navigation.parts.previous );
			this.panel.registerFocusable( this.navigation.parts.next );

			this.panel.parts.content.append( this.navigation.parts.wrapper );
		},

		/**
		 * Setups the description area.
		 */
		setupDescription: function() {
			this.description = new ViewerDescription( this );

			this.panel.parts.content.append( this.description.parts.wrapper );
		},

		/**
		 * Setups the "quick fix" form.
		 */
		setupForm: function() {
			this.form = new ViewerForm( this, this.editor.lang.a11ychecker );

			this.form.on( 'addInput', function( evt ) {
				this.panel.registerFocusable( evt.data.input );
			}, this );

			this.form.on( 'removeInput', function( evt ) {
				this.panel.deregisterFocusable( evt.data.input );
			}, this );

			this.panel.registerFocusable( this.form.parts.ignoreButton );
			this.panel.registerFocusable( this.form.parts.quickfixButton );
			this.panel.parts.content.append( this.form.parts.wrapper );
		},

		/**
		 * Setups listening indicator.
		 * See {@link CKEDITOR.plugins.a11ychecker.viewerListeningIndicator}.
		 */
		setupListeningIndicator: function() {
			this.listeningIndicator = new ViewerListeningIndicator( this );

			this.panel.registerFocusable( this.listeningIndicator.parts.button );
			this.panel.parts.content.append( this.listeningIndicator.parts.wrapper );
		},

		/**
		 * Setups viewer modes.
		 * See {@link #modes}, {@link #setMode}, {@link CKEDITOR.plugins.a11ychecker.viewerMode}.
		 */
		setupModes: function() {
			for ( var m in this.modesDefinition ) {
				this.modes[ m ] = new ViewerMode( this, this.modesDefinition[ m ] );
			}
		},

		/**
		 * Activates viewer mode.
		 * See {@link #modes}, {@link #setupModes}, {@link CKEDITOR.plugins.a11ychecker.viewerMode}.
		 *
		 * @param {String} mode Mode name, one of {@link #modes}
		 */
		setMode: function( mode ) {
			if ( this.mode ) {
				this.modes[ this.mode ].leaveMode();
			}

			this.modes[ mode ].enterMode();
			this.mode = mode;
		}
	};


	return Viewer;
} );