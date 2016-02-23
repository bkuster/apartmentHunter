/**
 * @author Ben Kuster
 * TODO     -   layer opacity
 *          -   this.handleMenu for all types and add the specific stuff as methods...
 *              reduces redundancy
 */
var $ = require('jquery');

/**
 * @param {ol.Map} theMap
 * @param {Object} metaData
 * @return {module} Menu
 */
module.exports = function(theMap, metaData){
    var menu = new function(){
        this.metaData = metaData;
        this.theMap = theMap;

        /**
         * @param {Event} evt - event from a menu-layer DOM objects visibility
         * togles layer visibility
         */
        this.layerVisibility = function(evt){
            var parent = evt.parentNode;

            var type = parent.type;
            var name = parent.getAttribute('name');
            var domObj = $('.menu-layer[name="'+name+'"]');

            if(type === 'base'){ // base layers are exclusive
                var layers = this.theMap.getLayers();
                layers.forEach(function(layer){
                    if(layer.get('type') === type & layer.get('name') === name){
                        layer.setVisible(true);
                    } else if (layer.get('type') === type) {
                        layer.setVisible(false);
                    }
                });

                $('.menu-layer[type="'+type+'"] .menu-visibility span').removeClass('glyphicon-ok');
                $('.menu-layer[type="'+type+'"] .menu-visibility span').addClass('glyphicon-none');
                domObj.children(".menu-visibility").children("span").removeClass('glyphicon-none');
                domObj.children(".menu-visibility").children("span").addClass('glyphicon-ok');
            } else {
                var layers = this.theMap.getLayers();
                layers.forEach(function(layer){
                    if(layer.get('type') === type & layer.get('name') === name){
                        if(layer.getVisible()){
                            domObj.children(".menu-visibility").children("span").removeClass('glyphicon-ok');
                            domObj.children(".menu-visibility").children("span").addClass('glyphicon-eye-close');
                        } else {
                            domObj.children(".menu-visibility").children("span").removeClass('glyphicon-eye-close');
                            domObj.children(".menu-visibility").children("span").addClass('glyphicon-eye-open');
                        }

                        layer.setVisible(!layer.getVisible());
                    }
                });
            }
        }

        /**
         * @param {Event} evt - called from clicking a menu-layer DOM object
         * displays the metaData for that layer OR customization
         */
        this.layerMeta = function(evt){
            var parent = evt.parentNode;

            var type = parent.type;
            var name = parent.getAttribute('name');
            var domObj = $('.menu-layer[name="'+name+'"]');

            domObj.toggleClass('opened');
            if(domObj.hasClass('opened')){

                if(type !== 'thematic'){
                    var display = this.makeDisplay(name, type, evt.style['background-color']);
                    if(display){$(display).insertAfter(domObj)};
                }

                var dataString = String();
                $.each(this.metaData, function(k,v){
                        if(k.replace('_', ' ') === name){
                            dataString = v;
                        }
                });
                // HACK this needs a better way to handle
                var opacity;
                var layers = this.theMap.getLayers();
                layers.forEach(function(layer){
                    if(layer.get('name') === name){
                        opacity = layer.getOpacity();
                    }
                });

                $('<li class="menu-meta menu-opacity clearfix form-inline" type="'+type+'"' +
                'name="'+name+'"'+
                'style="background:'+evt.style['background-color']+'">'+
                    '<div class="pull-left"><span class="glyphicon glyphicon-adjust"></span></div>'+
                    '<div class="pull-right"><input name="'+name+'-slider" type="range" min="0" max="1" step="0.02" value="'+opacity+'"/>'+
                    '<div>'+opacity+'</div></div>'+
                    '</li>').insertAfter(domObj);
                var theMap = this.theMap;
                $('input[name="'+name+'-slider"]').bind('input', function(){
                    $(this).siblings('div').html($(this).val());
                    var layers = theMap.getLayers();
                    layers.forEach(function(layer){
                        if(layer.get('name') === name){
                            layer.setOpacity($(this).val());
                        }
                    }, this);
                });

                if(name === 'My Locations'){
                    $('<li class="menu-meta clearfix" type="'+type+'"' +
                    'name="'+name+'"'+
                    'style="background:'+evt.style['background-color']+'">'+
                        '<span class="glyphicon glyphicon-cog"></span>'+
                        '<button class="btn btn-default"'+
                        ' onclick="event.preventDefault();theSafehouse.show()">Edit My Locations</button></li>').insertAfter(domObj);
                } else if(dataString !== 'undefined'){ // HACK no meta means filter...
                    $('<li class="menu-meta clearfix" type="'+type+'"' +
                    'name="'+name+'"'+
                    'style="background:'+evt.style['background-color']+'">'+
                        '<span class="glyphicon glyphicon-info-sign"></span>'+
                        dataString +
                        '</li>').insertAfter(domObj);
                }
            } else {
                $('.menu-meta[name="'+name+'"]').remove();
            }
        }

        /**
         * Adds a legend to the meta data field
         * @param {String} layerName
         * @param {String} layerType
         * @param {String} backColor
         * @return {String} div - $(div) -> DOM
         * UX make it look prettier
         */
        this.makeDisplay = function(layerName, layerType, backColor){
            var legend;
            var config;
            var layers = this.theMap.getLayers();

            layers.forEach(function(layer){
                if(layer.get('name') === layerName){
                    legend = layer.get('styleLegend');
                    config = layer.get('styleConfig');
                }
            });

            var div = '<li class="menu-meta menu-legend clearfix" type="'+layerType+'" name="'+layerName+'" '+
            'style="background:'+backColor+'">'+
            '<span class="glyphicon glyphicon-tags"></span>'+
            'Legend</li>';

            var firstOption = config.display !== '_all' ?
                '<option value="'+config.display+'">'+config.display+'</option>' :
                '';

            div = div + '<li class="menu-meta menu-legend clearfix form-inline" type="'+layerType+'" name="'+layerName+'" '+
            'style="background:'+backColor+'">' +
            '<span class="glyphicon glyphicon-none"></span>' +
            '<select class="form-control" onchange="theMenu.changeLegend(this);theStylist.handleThemeSelect(this);" name="'+layerName+'">'+
            firstOption +
            '<option value="_all">All</option>';

            $.map(config.themes, function(theme){
                if(theme.alias !== config.display){
                    div = div + '<option value="'+theme.alias+'">'+theme.alias+'</option>';
                }
            });
            div = div + '</select>';

            if(typeof legend !== 'undefined'){
                $.map(legend, function(color, aClass){
                    div = div + '<li class="menu-meta menu-legend clearfix" type="'+layerType+'" name="'+layerName+'" '+
                    'style="background:'+backColor+'">'+
                    '<span class="glyphicon glyphicon-none" '+
                    'style="background:'+ color +
                    '"></span>' + aClass + '</li>';
                });
            }
            return(div);
        }

        /**
         * @param {Event} evt - On user selecting other property to display
         */
        this.changeLegend = function(evt){
            var parent = $(evt.parentElement);
            var name = evt.name;
            var theLayer;
            var layers = this.theMap.getLayers();
            layers.forEach(function(layer){
                if(layer.get('name') === name){
                    theLayer = layer;
                }
            });
            theLayer.once('change:style', function(){
                parent.siblings('.menu-legend').remove();
                parent.after(this.makeDisplay(name, theLayer.get('type'), parent.css('background-color')));
                parent.remove();
            }, this)

        }

        /**
         * @param {Event} evt - initial call from clicking a layer
         */
        this.menuLayer = function(evt){
            var type = evt.type;
            var domObj = $('#menu .menu-item[type="'+type+'"]');
            domObj.toggleClass('opened');

            if(domObj.hasClass('opened')){
                var layers = this.theMap.getLayers();
                layers.forEach(function(layer){
                    if(layer.get('type') === type){
                        var name = layer.get('name');

                        var visible;
                        if(type === 'base'){
                            visible = layer.getVisible() ?
                                '<span class="glyphicon glyphicon-ok"></span>' :
                                '<span class="glyphicon glyphicon-none"></span>';
                        } else {
                            visible = layer.getVisible() ?
                                '<span class="glyphicon glyphicon-eye-open"></span>' :
                                '<span class="glyphicon glyphicon-eye-close"></span>';
                        }

                        $('<li class="menu-layer clearfix" type="'+type+'"'+
                            'name="'+layer.get('name')+'">'+
                            '<div class="menu-visibility pull-left" onclick="theMenu.layerVisibility(this)" '+
                            'style="background:'+evt.style['background-color']+'">' +
                            visible + '</div><div class="layer-name" onclick="theMenu.layerMeta(this)" '+
                            'style="background:'+evt.style['background-color']+'">' +
                            layer.get('name')+'</div></li>').insertAfter(domObj);
                    }
                });
            }else{
                $('.menu-layer[type="'+type+'"]').remove();
                $('.menu-meta[type="'+type+'"]').remove();
            }
        }
        /**
         * @param {Event} evt - initial call from clicking menu-filter object
         * IDEA could be easier using menuLayer and a case/type/caller and drop this method
         */
        this.menuFilter = function(evt){
            var type = evt.type;
            var domObj = $('#menu .menu-item[type="'+type+'"]');
            domObj.toggleClass('opened');

            // did we open or close?
            if(domObj.hasClass('opened')){
                // since this is a filter, we need to add the +filter
                $('<li class="menu-layer clearfix" type="filter">'+
                    '<div class="menu-visibility pull-left"'+
                    'style="background:'+evt.style['background-color']+'" onclick="filterIO.new(true)">' +
                    '<span class="glyphicon glyphicon-plus"></span></div>'+
                    '<div class="layer-name" onclick="filterIO.new(true)" '+
                    'style="background:'+evt.style['background-color']+'">' +
                    'Add A Filter</div></li>').insertAfter(domObj);

                // get all the layers
                var layers = this.theMap.getLayers();
                layers.forEach(function(layer){
                    if(layer.get('type') === type){
                        var name = layer.get('name');

                        var visible;
                        // get visible glyphicon basemaps are different
                        if(type === 'base'){
                            visible = layer.getVisible() ?
                                '<span class="glyphicon glyphicon-ok"></span>' :
                                '<span class="glyphicon glyphicon-none"></span>';
                        } else {
                            visible = layer.getVisible() ?
                                '<span class="glyphicon glyphicon-eye-open"></span>' :
                                '<span class="glyphicon glyphicon-eye-close"></span>';
                        }
                        $('<li class="menu-layer clearfix" type="'+type+'"'+
                            'name="'+layer.get('name')+'">'+ // now the eye first
                            '<div class="menu-visibility pull-left" onclick="theMenu.layerVisibility(this)" '+
                            'style="background:'+evt.style['background-color']+'">' +
                            visible + '</div><div class="layer-name" onclick="theMenu.layerMeta(this)" '+
                            'style="background:'+evt.style['background-color']+'">' +
                            layer.get('name')+'</div></li>').insertAfter(domObj);
                    }
                });

                // TODO add the clickEvent
                // $('.menu-layer[type="'+type+'"]').click(layerVisibility(this));
            }else{
                // remove all the layers
                $('.menu-layer[type="'+type+'"]').remove();
                $('.menu-meta[type="'+type+'"]').remove();
            }
        }

        /**
         * @param {Event} evt - intial call from clicking My Locations
         * IDEA @see this.menuFilter
         */
        this.menuHouse = function(evt){
            var type = evt.type;
            var domObj = $('#menu .menu-item[type="'+type+'"]');
            domObj.toggleClass('opened');

            if(domObj.hasClass('opened')){
                var layers = this.theMap.getLayers();
                layers.forEach(function(layer){
                    if(layer.get('name') === 'My Locations'){
                        visible = layer.getVisible() ?
                            '<span class="glyphicon glyphicon-eye-open"></span>' :
                            '<span class="glyphicon glyphicon-eye-close"></span>';
                        $('<li class="menu-layer clearfix" type="'+type+'"'+
                            'name="'+layer.get('name')+'">'+
                            '<div class="menu-visibility pull-left" onclick="theMenu.layerVisibility(this)" '+
                            'style="background:'+evt.style['background-color']+'">' +
                            visible + '</div><div class="layer-name" onclick="theMenu.layerMeta(this)" '+
                            'style="background:'+evt.style['background-color']+'">' +
                            layer.get('name')+'</div></li>').insertAfter(domObj);
                    }
                });
            }else{
                $('.menu-layer[type="'+type+'"]').remove();
                $('.menu-meta[type="'+type+'"]').remove();
            }
        }
    }
    return menu;
}
