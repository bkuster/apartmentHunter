/**
 * @author Ben Kuster
 */
var $ = require('jquery');
var ol = require('openlayers/dist/ol-debug');
var cb = require('colorbrewer');
var d3 = require('d3');

/**
 * The Stylist takes care of feature styling
 * @param {ol.Map} theMap
 * @param {Object} config
 */
module.exports = function(theMap, config){
    var styling = new function(){
        this.theMap = theMap;
        this.config = config;
        this.iconBase = './mapIcons'; // HACK this should be icon specific

        // ROUTINE -------------------------------------------------------------
        /**
         * @param {String} layerName
         */
        this.setStyle = function(layerName){
            var layers = this.theMap.getLayers();
            var theLayer;
            layers.forEach(function(layer){
                if(layer.get('name') === layerName){
                    theLayer = layer;
                }
            });

            var visible = theLayer.getVisible();
            var config = theLayer.get('styleConfig');
            var functionPromise;

            // TODO this is messy, too much code reused... more methods
            if(typeof config !== 'undefined'){
                functionPromise = this.readConfig(config);
                $.when(functionPromise).done(function(Style){
                    theLayer.setStyle($.proxy(Style.styleFunction, Style));
                    theLayer.set('styleConfig', config);
                    theLayer.setVisible(true);
                    var legend = {};
                    switch (typeof Style.classes) {
                        case 'undefined':
                            legend['All'] = '#FFFFFF';
                            break;
                        case 'function':
                            for(i in Style.classes.range()){
                                var key;
                                if(i == 0){
                                    key = '&lt; '+ Style.classes.quantiles()[i].toFixed(2);
                                } else if(i == Style.classes.range().length-1){
                                    key = '&gt; ' + Style.classes.quantiles()[i-1].toFixed(2);
                                } else {
                                    key = Style.classes.quantiles()[i-1].toFixed(2) + ' - ' +
                                        Style.classes.quantiles()[i].toFixed(2);
                                }
                                legend[key] = Style.classes.range()[i];
                            }
                            break;
                        default:
                            for(i in Style.classes){
                                legend[Style.classes[i]] = Style.colors[i];
                            }

                    }
                    theLayer.set('styleLegend', legend);
                    theLayer.dispatchEvent('change:style');
                    theLayer.setVisible(visible);
                    theMap.render();
                });
            } else {
                var layerConfig = this.config[layerName.replace(/ /g, '_')];
                functionPromise = this.readConfig(layerConfig);
                $.when(functionPromise).done(function(Style){
                    theLayer.setStyle($.proxy(Style.styleFunction, Style));
                    theLayer.set('styleConfig', layerConfig);
                    theLayer.setVisible(true);
                    var legend = {};
                    switch (typeof Style.classes) {
                        case 'undefined':
                            legend['All'] = '#FFFFFF';
                            break;
                        case 'function':
                            for(i in Style.classes.range()){
                                var key;
                                if(i == 0){
                                    key = '&lt; '+ Style.classes.quantiles()[i].toFixed(2);
                                } else if(i == Style.classes.range().length-1){
                                    key = '&gt; ' + Style.classes.quantiles()[i-1].toFixed(2);
                                } else {
                                    key = Style.classes.quantiles()[i-1].toFixed(2) + ' - ' +
                                        Style.classes.quantiles()[i].toFixed(2);
                                }
                                legend[key] = Style.classes.range()[i];
                            }
                            break;
                        default:
                            for(i in Style.classes){
                                legend[Style.classes[i]] = Style.colors[i];
                            }

                    }
                    theLayer.set('styleLegend', legend);
                    theLayer.setVisible(layerConfig.visible);
                    theMap.render();
                });
            }
        }

        /**
         * @param {Event} evt - called from the menu-meta display select
         */
        this.handleThemeSelect = function(evt){
            var layerName = evt.name;
            var selectedTheme = evt.value;
            var layers = this.theMap.getLayers();
            var setStyle = $.proxy(this.setStyle, this);

            layers.forEach(function(layer){
                if(layer.get('name') === layerName){
                    var config = layer.get('styleConfig');
                    config.display = selectedTheme;
                    layer.set('styleConfig', config);
                    setStyle(layerName);
                }
            });
        }
        // CONFIGS -------------------------------------------------------------
        // FIXME both classifiers should be split to when the features are loaded or not
        // make three methods out of the two..
        /**
         * Super method for handling configs for points or polygons
         * XXX bad naming what about lines?
         * @param {Object} layerConfig - a style config
         */
        this.readConfig = function(layerConfig){
            if("icon" in layerConfig){ // HACK should be a better way to check. add a type to the config?
                return this.makePoint(layerConfig);
            } else {
                return this.makePoly(layerConfig);
            }
        }

        /**
         * Classifier for discrete data
         * @param {String} layerName
         * @param {String} key - the property to classify
         * @return {Defferd} classPromise -> resolves to
         * @return {Array<String>} choices - class names
         */
        this.getKeys = function(layerName, key){
            var getClass = new $.Deferred();
            var choices = [];
            var layers = this.theMap.getLayers();
            layers.forEach(function(layer){
                if(layer.get('name') === layerName){
                    var source = layer.getSource();
                    var feats = source.getFeatures();
                    if(feats.length > 0){
                        $.map(feats, function(feat){
                            var val = feat.get(key);
                            if($.inArray(val, choices)<0){
                                choices.push(val);
                            }
                        });
                        getClass.resolve(choices);
                    } else {
                        // HACK setting visibility here will load the features for the first time...
                        layer.setVisible(true);
                        source.once('change',function(e){
                            source.forEachFeature(function(feat){
                                var val = feat.get(key);
                                if($.inArray(val, choices)<0){
                                    choices.push(val);
                                }
                            });
                            getClass.resolve(choices);
                        });
                    }
                }
            });
            return getClass.promise();
        }

        /**
         * Classifier for continous data
         * @param {String} layerName
         * @param {Object} theTheme - child object of the layers style config
         * @return {Deffered} classPromise -> resolves to
         * @return {d3.scale.quantile} scale
         */
        this.makeBreaks = function(layerName, theTheme){
            var key = theTheme.key;
            var getClass = new $.Deferred();
            var vals = [];

            var layers = this.theMap.getLayers();
            layers.forEach(function(layer){
                if(layer.get('name') === layerName){
                    var source = layer.getSource();
                    var feats = source.getFeatures();
                    if(feats.length > 0){
                        $.map(feats, function(feat){
                            vals.push(feat.get(key));
                        });
                        var scale = d3.scale.quantile()
                            .domain(vals)
                            .range(cb[theTheme.set]['5']);
                        getClass.resolve(scale);
                    } else {
                        layer.setVisible(true);
                        source.once('change',function(e){
                            source.forEachFeature(function(feat){
                                vals.push(feat.get(key));
                            });
                            var scale = d3.scale.quantile()
                                .domain(vals)
                                .range(cb[theTheme.set]['5']);
                            getClass.resolve(scale);
                        });
                    }
                }
            });
            return getClass.promise();
        }

        /**
         * hex to rgba from http://jsfiddle.net/subodhghulaxe/t568u/
         * @param {String} hex - a hex representation of a color
         * @param {Number} opacity - form 0 - 1
         * @return {String} rgba representation of input color
         */
        this.hex2rgba = function(hex,opacity){
            hex = hex.replace('#','');
            r = parseInt(hex.substring(0,2), 16);
            g = parseInt(hex.substring(2,4), 16);
            b = parseInt(hex.substring(4,6), 16);

            result = 'rgba('+r+','+g+','+b+','+opacity+')';
            return result;
        }

        // STYLES --------------------------------------------------------------
        /**
         * creates the style for a point feature
         * FIXME for both styles, too much code reused, split the methods
         * @param {Obejct} layerConfig
         * @return {Deffered} stylePromise -> resolves to
         * @return {Function} styleFunction
         */
        this.makePoint = function(layerConfig){
            var stylePromise = new $.Deferred();
            var themeName = layerConfig.display;
            var icon = layerConfig.icon;
            var iconBase = this.iconBase;

            if(themeName === '_all'){

                /**
                 * @param {Object} icon - child of config
                 * @param {String} iconBase - base URL for the icons
                 * @return {Object} theStyle definition
                 */
                var theStyle = function(icon,iconBase){
                    this.icon = icon;
                    this.iconBase = iconBase;

                    /**
                     * the actual style function
                     * @param {ol.feature.Vector} feature
                     * @return {ol.style.Style} style
                     */
                    this.styleFunction = function(feature){
                        var style = new ol.style.Style({
                            image: new ol.style.Icon(({
                                  color: '#FFFFFF',
                                  anchor: ("anchor" in this.icon) ? this.icon.anchor : [0.5, 0.5],
                                  src: this.iconBase + '/' + this.icon.url,
                                  scale: ("scale" in this.icon) ? this.icon.scale : 1.0
                            }))
                        });
                        return style;
                    }
                }
                stylePromise.resolve(new theStyle(icon, iconBase));
            } else {
                var theTheme;
                $.map(layerConfig.themes, function(theme){
                    if(theme.alias === themeName){
                        theTheme = theme;
                    }
                });
                var classPromise = theTheme.exact ?
                    this.getKeys(layerConfig.name, theTheme.key):
                    this.makeBreaks(layerConfig.name, theTheme);

                // make the colors...
                var colors = theTheme.exact ?
                    [].concat.apply([], [cb[theTheme.set+'1']['8'], cb[theTheme.set+'2']['8']]):
                    cb[theTheme.set]['5'];

                $.when(classPromise).done(function(classes){

                    /**
                     * theStyle object for classified properties
                     * @param {Object} theTheme - child of layer style config
                     * @param {Object} icon - child of layer style config
                     * @param {Array<String>} classes OR {d3.scale.quantiles}
                     * @param {Array<String>} colors - hex color representation
                     * @param {String} iconBase
                     */
                    var theStyle = function(theTheme, icon, classes, colors, iconBase){
                        this.theme = theTheme;
                        this.icon = icon;
                        this.classes = classes;
                        this.colors = colors;
                        this.iconBase = iconBase;

                        /**
                         * the actual style function
                         * @param {ol.feature.Vector} feature
                         * @return {ol.style.Style} style
                         */
                        this.styleFunction = function(feature){
                            var val = feature.getProperties()[this.theme.key];
                            var color = this.makeColors(val);
                            var style = new ol.style.Style({
                                image: new ol.style.Icon(({
                                      color: color,
                                      anchor: ("anchor" in this.icon) ? this.icon.anchor : [0.5, 0.5],
                                      src: this.iconBase + '/' + this.icon.url,
                                      scale: ("scale" in this.icon) ? this.icon.scale : 1.0
                                }))
                            });
                            return style;
                        }

                        /**
                         * trys making a color for discrete and continous data
                         * @param {String}{Number} val
                         * @return {String} color in hex
                         */
                        this.makeColors = function(val){
                            if(theTheme.exact){
                                var index = $.inArray(val, this.classes);
                                return this.colors[index];
                            } else {
                                return this.classes(val);
                            }
                        }
                    }
                    stylePromise.resolve(new theStyle(theTheme, icon, classes, colors, iconBase));
                })
            }
            return stylePromise.promise();
        }

        // HACK this entire class is badly mapped -> time. too much code copied form makePoint
        this.makePoly = function(layerConfig){
            var stylePromise = new $.Deferred();
            var themeName = layerConfig.display;
            var hex2rgba = $.proxy(this.hex2rgba, this);
            if(themeName === '_all'){
                var theStyle = function(){
                    this.styleFunction = function(feature){
                        var style = new ol.style.Style({
                            stroke: new ol.style.Stroke({
                              color: '#CCC',
                              width: 3
                            }),
                            fill: new ol.style.Fill({
                              color: 'rgba(60, 60, 60, 0.3)'
                            })
                        });
                        return style;
                    }
                }
                stylePromise.resolve(new theStyle());
            } else {
                var theTheme;
                $.map(layerConfig.themes, function(theme){
                    if(theme.alias === themeName){
                        theTheme = theme;
                    }
                });
                var classPromise = theTheme.exact ?
                    this.getKeys(layerConfig.name, theTheme.key):
                    this.makeBreaks(layerConfig.name, theTheme);

                var colors = theTheme.exact ?
                    [].concat.apply([], [cb[theTheme.set+'1']['8'], cb[theTheme.set+'2']['8']]):
                    cb[theTheme.set]['5'];

                $.when(classPromise).done(function(classes){

                    /**
                     * @param {Object} theTheme - child of layer style config
                     * @param {Array<String>}{d3.scale.qunatile} classes
                     * @param {Array<string>} colors
                     */
                    var theStyle = function(theTheme, classes, colors){
                        this.theme = theTheme;
                        this.classes = classes;
                        this.colors = colors;

                        /**
                         * @param {ol.feature.Vector} feature
                         * @return {ol.style.Style} style
                         */
                        this.styleFunction = function(feature){
                            var val = feature.getProperties()[this.theme.key];
                            var color = this.makeColors(val);
                            var style = new ol.style.Style({
                                stroke: new ol.style.Stroke({
                                  color: color,
                                  width: 3
                                }),
                                fill: new ol.style.Fill({
                                  color: hex2rgba(color, 0.4)
                                })
                            });
                            return style;
                        }

                        /**
                         * @param {String}{Number} val
                         * @return {String} color in hex
                         */
                        this.makeColors = function(val){
                            if(theTheme.exact){
                                var index = $.inArray(val, this.classes);
                                return this.colors[index];
                            } else {
                                return this.classes(val);
                            }
                        }
                    }
                    stylePromise.resolve(new theStyle(theTheme, classes, colors));
                })
            }
            return stylePromise.promise();
        }
    }
    return styling;
}
