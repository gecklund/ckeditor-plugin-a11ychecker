/**
 * @license Copyright (c) 2003-2014, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

define( function() {
	/**
	 * The generic class of {@link CKEDITOR.plugins.a11ychecker.viewerForm} input.
	 *
	 * @since 4.5
	 * @class CKEDITOR.plugins.a11ychecker.viewerInput
	 * @constructor Creates an input instance.
	 * @param {String} name Input name.
	 * @param {Object} definition Input definition.
	 */
	function ViewerInput( name, definition ) {
		if ( definition ) {
			CKEDITOR.tools.extend( this, definition, true );

			this.name = name;
			this.id = 'cke_' + CKEDITOR.tools.getNextId() + '_input';
			this.wrapper = CKEDITOR.dom.element.createFromHtml( this.wrapperTemplate.output( {
				label: this.label,
				id: this.id
			} ) );
		}
	}

	ViewerInput.prototype = {
		/**
		 * Template of input's wrapper.
		 *
		 * @property {CKEDITOR.template} wrapperTemplate
		 */
		wrapperTemplate: new CKEDITOR.template(
			'<div role="presentation" class="cke_a11yc_ui_input_wrapper">' +
				'<label class="cke_a11yc_ui_input_label" for="{id}">{label}</label>' +
			'</div>' ),

		/**
		 * Gets the value of the input.
		 *
		 * @method getValue
		 */
		getValue: function() {
			return this.input.getValue();
		},

		/**
		 * Sets the value of the input.
		 *
		 * @method setValue
		 * @param {String} value
		 */
		setValue: function( value ) {
			this.input.setValue( value );
		},

		/**
		 * Removes input from DOM.
		 *
		 * @method remove
		 */
		remove: function() {
			this.wrapper.remove();
		}
	};

	return ViewerInput;
} );