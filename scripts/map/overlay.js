/**
 * @author Ben Kuster
 */
var ol = require('openlayers/dist/ol-debug');
var $ = require('jquery');


/**
 * module - map overlays
 *
 * @param  {ol.Map} theMap
 * @param  {<Object>} config
 * @return {module} Overlay
 */
module.exports = function(theMap, config){
    var overlay = new function(){
        this.theMap = theMap,
        this.config = config,

        // INITIALIZE ----------------------------------------------------------
        this.initialize = function(){
            var addPopup = $.proxy(this.addPopup, this);
            $.map(this.config, function(value, layer){
                addPopup(layer.replace(/_/, ' '));
            });

            this.dblClickInit();

            this.theMap.on('singleclick', function(evt){
                this.handleClick(evt);
            }, this);
            this.theMap.on('dblclick', function(evt){
                this.handleDblClick(evt);
            }, this);
        }

        /**
         * @param {String} layerName
         */
        this.addPopup = function(layerName){
            var popup = this.makePopup(layerName);
            this.theMap.addOverlay(popup);
        }

        /**
         * @param {String} layerName
         * @return {ol.Overlay} popup
         */
        this.makePopup = function(layerName){
            var popup = new ol.Overlay({
                id: layerName,
                positioning: 'top-center',
                // stopEvent: false, // IDEA can do some css with overlay conainter
                autoPan: true
            });
            return(popup);
        }

        // INTERACTIONS --------------------------------------------------------
        /**
         * @param {ol.MapEvent} evt
         * HACK this should be packed into more methods...
         */
        this.handleClick = function(evt){
            this.dblClickRemove();
            $('.map-popover').remove();

            var features = {};
            this.theMap.forEachFeatureAtPixel(evt.pixel,
                function(feature, layer) {
                    var layerName = layer.get('name');
                    features[layerName] = feature;
                },
                function(layer){
                    switch (layer.get('type')) {
                        case 'filter':
                            return true;
                        case 'feature':
                            return true;
                        default:
                            return false;
                    }
                }
            );

            if(Object.keys(features).length > 0){
                var conf = this.config;
                $.map(features, function(feat, layerName){
                    var element;
                    var table = '<table class="table table-condensed">';
                    var title;
                    var filterName;
                    if(layerName.replace(/ /g, '_') in conf){//HACK for 'standard' layer AKA not a filter or My Locations
                        element = '<div class="popover top map-popover" style="display:inline-block"'+
                            ' name="'+layerName+'" onclick="this.remove()"><div class="arrow"></div>';
                        var layerConfig = conf[layerName.replace(/ /g, '_')]
                        var title = feat.get('spatial_alias') ?
                            feat.get('spatial_alias'):
                            feat.get('name');

                        title = layerConfig.title && title ?
                                '<h3 class="popover-title">'+title+'</h3>':
                                '';

                        if('exclude' in layerConfig){
                            $.map(feat.getProperties(), function(value, key){
                                if($.inArray(key, layerConfig.exclude) > -1){
                                    return;
                                }
                                if(key.search(new RegExp(/spatial_/)) !== -1){
                                    return;
                                }
                                // to upper from http://stackoverflow.com/questions/4878756/javascript-how-to-capitalize-first-letter-of-each-word-like-a-2-word-city
                                key = key.replace(/\w\S*/g, function(txt){
                                    return txt.charAt(0).toUpperCase() +
                                    txt.substr(1).toLowerCase();
                                });
                                table = table + '<tr><td>' + key + '</td>' +
                                    '<td>' + value + '</td></tr>';
                            });

                        } else {
                            $.map(layerConfig.include, function(prop){
                                var value = feat.get(prop.key);
                                table = table + '<tr><td>' + prop.alias + '</td>' +
                                    '<td>' + value + '</td></tr>';
                            });
                        }
                    } else {
                        filterName = layerName; // HACK... this entire thing needs rework
                        layerName = 'filterType';
                        element = '<div class="popover top map-popover" style="display:inline-block"'+
                            ' name="'+layerName+'" onclick="this.remove()"><div class="arrow"></div>';
                        title = '<h3 class="popover-title">'+feat.get('STRASSE')+', '+
                        feat.get('ADR').replace(/^0+/, '')+'</h3>';
                        table = '<div>'+feat.get('STRASSE')+', '+
                        feat.get('ADR').replace(/^0+/, '')+'<br>'+
                        feat.get('PLZ')+' - '+
                        'Berlin-'+feat.get('BEZNAME')+'</p>' + table;

                        table = feat.get('WOL') ? table + '<tr><td>Living Situation</td>' +
                            '<td>' + feat.get('WOL') + '</td></tr>' :
                            table;
                        table = feat.get('LAERM') ? table + '<tr><td>Noise</td>' +
                            '<td>' + feat.get('LAERM') + '</td></tr>' :
                            table;
                    }
                    element = element + title;
                    table = table + '</table>';
                    element = element + '<div class="popover-content">'+table;
                    var position;
                    var specialBtn;
                    if(feat.getGeometry().getType() === 'Polygon'){
                        position = feat.getGeometry().getInteriorPoint().getFlatCoordinates();
                        specialBtn = '<input class="btn btn-default" value="Find Within" onclick="event.preventDefault();filterIO.makeSpecial(this)" '+
                        ' filter="within:'+feat.getId()+'">';
                    } else {
                        position = feat.getGeometry().getCoordinates();
                        // XXX HACK just awefull
                        if(filterName === 'My Locations'){
                            specialBtn = '<input class="btn btn-danger" value="Remove From My Locations" onclick="event.preventDefault();theSafehouse.removeHouse(this)" ' +
                                ' location="'+feat.getId()+'">'
                        } else if(layerName === 'filterType'){
                            specialBtn = '<input class="btn btn-success" value="Add To My Locations" onclick="event.preventDefault();theSafehouse.addHouse(this)" ' +
                                ' location="'+filterName+':'+feat.getId()+'">'
                        }  else {
                            specialBtn = '<input class="btn btn-default" value="Find Around" onclick="event.preventDefault();filterIO.makeSpecial(this)" '+
                                ' filter="distanceTo:'+feat.getId()+'">';
                        }
                    }
                    element = element + specialBtn + '</div></div>';
                    $('#map').append(element);

                    var thePop = theMap.getOverlayById(layerName);
                    thePop.setElement($('.popover[name="'+layerName+'"]')[0]);
                    thePop.setPosition(position);
                    thePop.setOffset(
                        [-$('.popover[name="'+layerName+'"]').innerWidth()/2,
                        -($('.popover[name="'+layerName+'"]').innerHeight()+20)]
                    );
                });
            } else {
                $('.map-popover').remove();
                this.dblClickRemove();
            }
        }

        // DBLCLICK ------------------------------------------------------------
        // XXX this should be submodule
        this.dblClickInit = function(){
            this.featureFormat = new ol.format.GeoJSON();
            this.featureSource = new ol.source.Vector();
            this.featureLayer = new ol.layer.Vector({
                source: this.featureSource,
                type: 'search',
                name: 'DblClick',
                visible: false
            });
            this.theMap.addLayer(this.featureLayer);
            theStylist.setStyle('DblClick');
        }

        this.dblClickRemove = function(){
            $('.map-popover-dblClick').remove();
            this.featureSource.clear();
        }

        /**
         * @param {Array<Number, Number>} coords
         */
        this.dblClickAdd = function(coords){
            // HACK not a true random number... not needed here though
            // IDEA needed at all?
            var id = Math.round(Math.random()*1000)
            var geoJson = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": coords
                },
                "properties": {
                    "name":"Custom Map Point"
                },
                "id": id
            }
            this.featureSource.addFeature(this.featureFormat.readFeature(geoJson));
            return id;
        }

        /**
         * @param {ol.MapEvent} evt - true double click event
         */
        this.handleDblClick = function(evt){
            this.dblClickRemove();
            var element = '<div class="popover top map-popover-dblClick" style="display:inline-block"'+
                ' name="DblClick" onclick="this.remove()"><div class="arrow"></div>';
            var title = '<h3 class="popover-title">Custom Map Location</h3>'
            var id = this.dblClickAdd(evt.coordinate);
            var specialBtn = '<input class="btn btn-default" value="Find Around" onclick="event.preventDefault();filterIO.makeSpecial(this)" '+
                ' filter="distanceTo:'+id+'">';
            element = element + title +
                '<div class="popover-content">'+ specialBtn + '</div></div>';

            $('#map').append(element);
            var thePop = theMap.getOverlayById('DblClick');
            thePop.setElement($('.popover[name="DblClick"]')[0]);
            thePop.setPosition(evt.coordinate);
            thePop.setOffset(
                [-$('.popover[name="DblClick"]').innerWidth()/2,
                -($('.popover[name="DblClick"]').innerHeight()+40)]
            );
        }
    }
    return overlay;
}
