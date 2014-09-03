/**
 * @license Copyright (c) 2003-2014, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

define( function() {
	/**
	 * The description area of {@link CKEDITOR.plugins.a11ychecker.viewer}.
	 *
	 * @since 4.5
	 * @class CKEDITOR.plugins.a11ychecker.viewerDescription
	 * @constructor Creates a viewer's description instance.
	 */
	function ViewerDescription() {
		/**
		 * Templates of UI elements in this description.
		 * See {@link #templateDefinitions}, {@link #parts}.
		 */
		this.templates = {};

		for ( var t in this.templateDefinitions ) {
			this.templates[ t ] = new CKEDITOR.template( this.templateDefinitions[ t ] );
		}

		/**
		 * @property parts UI elements of the description.
		 * @property {CKEDITOR.dom.element} parts.wrapper Wrapper of the description.
		 * @property {CKEDITOR.dom.element} parts.title Title of the issue.
		 * @property {CKEDITOR.dom.element} parts.info Information about the issue.
		 */
		this.parts = {};

		// Build the description.
		this.build();
	}

	ViewerDescription.prototype = {
		/**
		 * @property templateDefinitions Templates of the description. Automatically converted into {@link CKEDITOR.template} in the constructor.
		 * @property {String} templateDefinitions.wrapper
		 * @property {String} templateDefinitions.title
		 * @property {String} templateDefinitions.info
		 */
		templateDefinitions: {
			wrapper: '<div class="cke_a11yc_ui_desc_wrapper"></div>',

			title: '<strong class="cke_a11yc_ui_desc_title"></strong>',

			info: '<p class="cke_a11yc_ui_desc_info"></p>'
		},

		/**
		 * Sets the new title of the issue.
		 *
		 * @param {String} text
		 */
		setTitle: function( text ) {
			this.parts.title.setHtml( text );
		},

		/**
		 * Sets the info of the issue.
		 *
		 * @param {String} text
		 */
		setInfo: function( text ) {
			this.parts.info.setHtml( text );
		},

		/**
		 * Builds the UI of the description.
		 */
		build: function() {
			this.parts = {
				wrapper: CKEDITOR.dom.element.createFromHtml( this.templates.wrapper.output() ),

				title: CKEDITOR.dom.element.createFromHtml( this.templates.title.output() ),

				info: CKEDITOR.dom.element.createFromHtml( this.templates.info.output() ),
			};

			this.parts.title.appendTo( this.parts.wrapper );
			this.parts.info.appendTo( this.parts.wrapper );
		}
	};

	return ViewerDescription;
} );