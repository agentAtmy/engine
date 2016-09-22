/****************************************************************************
 Copyright (c) 2013-2016 Chukong Technologies Inc.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and  non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Chukong Aipu reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
require('../label/CCHtmlTextParser.js');
require('../label/CCTextUtils.js');

var HorizontalAlign = cc.TextAlignment;
var VerticalAlign = cc.VerticalTextAlignment;


// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
 * !#en The RichText Component.
 * !#zh 富文本组件
 * @class RichText
 * @extends Component
 */
var RichText = cc.Class({
    name: 'cc.RichText',
    extends: cc._RendererUnderSG,

    ctor: function() {
        this._textArray = null;
        this._labelSegmentsCache = [];

        this._resetState();

        if(CC_EDITOR) {
            this._updateRichTextStatus = debounce(this._updateRichText, 200);
        } else {
            this._updateRichTextStatus = this._updateRichText;
        }
    },

    editor: CC_EDITOR && {
        menu: 'i18n:MAIN_MENU.component.renderers/RichText',
        help: 'i18n:COMPONENT.help_url.richtext',
    },


    properties: {
        /**
         * !#en Content string of RichText.
         * !#zh 富文本显示的文本内容。
         * @property {String} string
         */
        string: {
            default: '<color=#00ff00>Rich</c><color=#0fffff>Text</color>',
            multiline: true,
            tooltip: 'i18n:COMPONENT.richtext.string',
            notify: function () {
                this._updateRichTextStatus();
            }
        },

        /**
         * !#en Horizontal Alignment of each line in RichText.
         * !#zh 文本内容的水平对齐方式。
         * @property {RichText.HorizontalAlign} horizontalAlign
         */
        horizontalAlign: {
            default: HorizontalAlign.LEFT,
            type: HorizontalAlign,
            tooltip: 'i18n:COMPONENT.richtext.horizontal_align',
            animatable: false,
            notify: function (oldValue) {
                if(this.horizontalAlign === oldValue) return;

                this._layoutDirty = true;
                this._updateRichTextStatus();
            }
        },

        /**
         * !#en Font size of RichText.
         * !#zh 富文本字体大小。
         * @property {Number} fontSize
         */
        fontSize: {
            default: 40,
            tooltip: 'i18n:COMPONENT.richtext.font_size',
            notify: function (oldValue) {
                if(this.fontSize === oldValue) return;

                this._layoutDirty = true;
                this._updateRichTextStatus();
            }
        },

        /**
         * !#en The maximize width of the RichText
         * !#zh 富文本的最大宽度
         * @property {Number} maxWidth
         */
        maxWidth: {
            default: 0,
            tooltip: 'i18n:COMPONENT.richtext.max_width',
            notify: function (oldValue) {
                if(this.maxWidth === oldValue) return;

                this._layoutDirty = true;
                this._updateRichTextStatus();
            }
        },

        /**
         * !#en Line Height of RichText.
         * !#zh 富文本行高。
         * @property {Number} lineHeight
         */
        lineHeight: {
            default: 40,
            tooltip: 'i18n:COMPONENT.richtext.line_height',
            notify: function (oldValue) {
                if(this.lineHeight === oldValue) return;

                this._layoutDirty = true;
                this._updateRichTextStatus();
            }
        }
    },

    statics: {
        HorizontalAlign: HorizontalAlign,
        VerticalAlign: VerticalAlign
    },

    __preload: function () {
        this._super();

        if (!CC_EDITOR) {
            this._registerEvents();
        }
    },

    _createSgNode: function () {
        var sgNode = new _ccsg.Node();

        sgNode.setCascadeOpacityEnabled(true);

        var self = this;
        sgNode.setColor = function () {
            self._updateLabelSegmentTextAttributes();
        };

        sgNode._setContentSize = sgNode.setContentSize;
        sgNode.setContentSize = function () {};
        return sgNode;
    },

    _updateLabelSegmentTextAttributes: function() {
        this._labelSegments.forEach(function(item) {
            this._applyTextAttribute(item);
        }.bind(this));
    },

    _initSgNode: function () {
        this._updateRichText();
    },

    _measureText: function (styleIndex, string) {
        var self = this;
        var func = function (string) {
            var label;
            if(self._labelSegmentsCache.length === 0) {
                label = new _ccsg.Label(string);
                self._labelSegmentsCache.push(label);
            } else {
                label = self._labelSegmentsCache[0];
                label.setString(string);
            }
            label._styleIndex = styleIndex;
            self._applyTextAttribute(label);
            var labelSize = label.getContentSize();
            return labelSize.width;
        };
        if(string) {
            return func(string);
        } else {
            return func;
        }
    },


    _onTouchEnded: function (event) {
        if(!this.enabledInHierarchy) return;

        var components = this.node.getComponents(cc.Component);

        for (var i = 0; i < this._labelSegments.length; ++i ) {
            var labelSegment = this._labelSegments[i];
            var clickHandler = labelSegment._clickHandler;
            if (clickHandler && this._containsTouchLocation(labelSegment, event.touch.getLocation())) {
                components.forEach(function(component) {
                    if(component.enabledInHierarchy && component[clickHandler]) {
                        component[clickHandler](event);
                    }
                });
            }
        }
    },

    _containsTouchLocation:function (label, point) {
        var myRect = label.getBoundingBoxToWorld();

        return cc.rectContainsPoint(myRect, point);
    },

    _registerEvents: function () {
        this.node.on(cc.Node.EventType.TOUCH_END, this._onTouchEnded, this);
    },

    _resetState: function () {
        var sgNode = this._sgNode;
        if(sgNode) {
            sgNode.removeAllChildren();
        }

        this._labelSegments = [];
        this._labelSegmentsCache = [];
        this._linesWidth = [];
        this._lineOffsetX = 0;
        this._lineCount = 1;
        this._labelWidth = 0;
        this._labelHeight = 0;
        this._layoutDirty = true;
    },

    _addLabelSegment: function(stringToken, styleIndex) {
        var labelSegment;
        if(this._labelSegmentsCache.length === 0) {
            labelSegment = new _ccsg.Label(stringToken);
        } else {
            labelSegment = this._labelSegmentsCache.pop();
            labelSegment.setString(stringToken);
        }
        labelSegment._styleIndex = styleIndex;
        labelSegment._lineCount = this._lineCount;

        this._applyTextAttribute(labelSegment);

        labelSegment.setAnchorPoint(cc.p(0, 0));
        this._sgNode.addChild(labelSegment);
        this._labelSegments.push(labelSegment);

        if(CC_JSB) {
            labelSegment.setOverflow(1);
            var size = labelSegment.getContentSize();
            labelSegment.setContentSize(size.width, this.lineHeight);
        }

        return labelSegment;
    },

    _updateRichTextWithMaxWidth: function (labelString, labelWidth, styleIndex) {
        var fragmentWidth = labelWidth;
        var labelSegment;

        if (this._lineOffsetX > 0 && fragmentWidth + this._lineOffsetX > this.maxWidth) {
            //concat previous line
            var checkStartIndex = 0;
            while (this._lineOffsetX <= this.maxWidth) {
                var checkEndIndex = this._getFirstWordLen(labelString,
                                                          checkStartIndex,
                                                          labelString.length);
                var checkString = labelString.substr(checkStartIndex, checkEndIndex);
                var checkStringWidth = this._measureText(styleIndex, checkString);

                if(this._lineOffsetX + checkStringWidth <= this.maxWidth) {
                    this._lineOffsetX += checkStringWidth;
                    checkStartIndex += checkEndIndex;
                } else {

                    if(checkStartIndex > 0) {
                        var remainingString = labelString.substr(0, checkStartIndex);

                        this._addLabelSegment(remainingString, styleIndex);

                        labelString = labelString.substr(checkStartIndex, labelString.length);
                        fragmentWidth = this._measureText(styleIndex, labelString);
                    }
                    this._updateLineInfo();
                    break;
                }
            }
        }
        if(fragmentWidth > this.maxWidth) {
            var fragments = cc.TextUtils.fragmentText(labelString,
                                                      fragmentWidth,
                                                      this.maxWidth,
                                                      this._measureText(styleIndex));
            for(var k = 0; k < fragments.length; ++k) {
                var splitString = fragments[k];

                labelSegment =  this._addLabelSegment(splitString, styleIndex);

                var labelSize = labelSegment.getContentSize();

                this._lineOffsetX += labelSize.width;

                if(fragments.length > 1 && k < fragments.length - 1) {
                    this._updateLineInfo();
                }
            }
        } else {
            this._lineOffsetX += fragmentWidth;

            this._addLabelSegment(labelString, styleIndex);
        }

    },

    _isLastComponentCR: function(stringToken) {
        return stringToken.length -1 === stringToken.lastIndexOf("\n");
    },

    _updateLineInfo: function () {
        this._linesWidth.push(this._lineOffsetX);
        this._lineOffsetX = 0;
        this._lineCount++;
    },

    _needsUpdateTextLayout: function (newTextArray) {
        if(this._layoutDirty || !this._textArray || !newTextArray) {
            return true;
        }

        if(this._textArray.length !== newTextArray.length) {
            return true;
        }

        for(var i = 0; i < this._textArray.length; ++i) {
            var oldItem = this._textArray[i];
            var newItem = newTextArray[i];
            if(oldItem.text != newItem.text) {
                return true;
            } else {
                if (oldItem.style) {
                    if (newItem.style) {
                        if(oldItem.style.size != newItem.style.size
                           || oldItem.style.italic !== newItem.style.italic) {
                            return true;
                        }
                    } else {
                        if(oldItem.style.size || oldItem.style.italic) {
                            return true;
                        }
                    }
                } else {
                    if (newItem.style) {
                        if(newItem.style.size || newItem.style.italic) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    },

    _updateRichText: function () {
        if (!this.enabled) return;

        var newTextArray = cc.htmlTextParser.parse(this.string);
        if(!this._needsUpdateTextLayout(newTextArray)) {
            this._textArray = newTextArray;
            this._updateLabelSegmentTextAttributes();
            return;
        }

        this._textArray = newTextArray;
        var sgNode = this._sgNode;
        this._resetState();

        var lastEmptyLine = false;
        var label;
        var labelSize;

        for (var i = 0; i < this._textArray.length; ++i) {
            var richTextElement = this._textArray[i];
            var text = richTextElement.text;
            //handle <br/> <img /> tag
            if(text === "") {
                if(richTextElement.style && richTextElement.style.newline) {
                    this._updateLineInfo();
                    continue;
                }
            }
            var multilineTexts = text.split("\n");

            for (var j = 0; j < multilineTexts.length; ++j) {
                var labelString = multilineTexts[j];
                if(labelString === "") {
                    //for continues \n
                    if(this._isLastComponentCR(text)
                       && j == multilineTexts.length - 1) {
                        continue;
                    }
                    this._updateLineInfo();
                    lastEmptyLine = true;
                    continue;
                }
                lastEmptyLine = false;

                if(this.maxWidth > 0) {
                    var labelWidth = this._measureText(i, labelString);
                    this._updateRichTextWithMaxWidth(labelString, labelWidth, i);

                    if(multilineTexts.length > 1 && j < multilineTexts.length - 1) {
                        this._updateLineInfo();
                    }
                } else {
                    label = this._addLabelSegment(labelString, i);
                    labelSize = label.getContentSize();

                    this._lineOffsetX += labelSize.width;
                    if(this._lineOffsetX > this._labelWidth) {
                        this._labelWidth = this._lineOffsetX;
                    }

                    if(multilineTexts.length > 1 && j < multilineTexts.length - 1) {
                        this._updateLineInfo();
                    }
                }
            }
        }
        if(!lastEmptyLine) {
            this._linesWidth.push(this._lineOffsetX);
        }

        if(this.maxWidth > 0) {
            this._labelWidth = this.maxWidth;
        }
        this._labelHeight =this._lineCount * this.lineHeight;

        sgNode._setContentSize(cc.size(this._labelWidth, this._labelHeight));

        this._updateRichTextPosition();
        this._layoutDirty = false;
    },


    _getFirstWordLen: function(text, startIndex, textLen) {
        var character = text.charAt(startIndex);
        if (cc.TextUtils.isUnicodeCJK(character)
            || cc.TextUtils.isUnicodeSpace(character)) {
            return 1;
        }

        var len = 1;
        for (var index = startIndex + 1; index < textLen; ++index) {
            character = text.charAt(index);
            if (cc.TextUtils.isUnicodeSpace(character)
                || cc.TextUtils.isUnicodeCJK(character)) {
                break;
            }
            len++;
        }

        return len;
    },

    _updateRichTextPosition: function () {

        var nextTokenX = 0;
        var nextLineIndex = 1;
        var totalLineCount = this._lineCount;
        for(var i = 0; i < this._labelSegments.length; ++i) {
            var label = this._labelSegments[i];
            var lineCount = label._lineCount;
            if (lineCount > nextLineIndex) {
                nextTokenX = 0;
                nextLineIndex = lineCount;
            }
            var lineOffsetX = 0;
            switch (this.horizontalAlign) {
              case cc.TextAlignment.LEFT:
                  lineOffsetX = 0;
                  break;
              case cc.TextAlignment.CENTER:
                  lineOffsetX = (this._labelWidth - this._linesWidth[lineCount - 1]) / 2;
                  break;
              case cc.TextAlignment.RIGHT:
                  lineOffsetX = this._labelWidth - this._linesWidth[lineCount - 1];
                  break;
              default:
                  break;
            }
            label.setPositionX(nextTokenX + lineOffsetX);

            var labelSize = label.getContentSize();

            var positionY = (totalLineCount - lineCount) * this.lineHeight;

            label.setPositionY(positionY);

            if (lineCount === nextLineIndex) {
                nextTokenX += labelSize.width;
            }

        }
    },

    _applyTextAttribute: function (label) {
        var index = label._styleIndex;
        label.setLineHeight(this.lineHeight);
        label.setVerticalAlign(VerticalAlign.CENTER);
        label.enableBold(false);
        label.enableItalics(false);
        label.enableUnderline(false);

        var textStyle = null;
        if(this._textArray[index]) {
            textStyle = this._textArray[index].style;
        }
        if(textStyle && textStyle.color) {
            var colorValue = textStyle.color.toUpperCase();
            if(cc.Color[colorValue]) {
                label.setColor(cc.Color[colorValue]);
            } else {
                label.setColor(cc.hexToColor(textStyle.color));
            }
        } else {
            label.setColor(this.node.color);
        }

        if(textStyle && textStyle.bold) {
            label.enableBold(true);
        }

        if(textStyle && textStyle.italic) {
            label.enableItalics(true);
        }

        if(textStyle && textStyle.underline) {
            label.enableUnderline(true);
        }

        if(textStyle && textStyle.size) {
            label.setFontSize(textStyle.size);
        } else {
            label.setFontSize(this.fontSize);
        }

        if(textStyle && textStyle.event) {
            if(textStyle.event.click) {
                label._clickHandler = textStyle.event.click;
            }
        }
    }

 });

 cc.RichText = module.exports = RichText;