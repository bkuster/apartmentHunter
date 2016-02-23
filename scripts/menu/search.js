/**
 * @author Ben Kuster
 */
var $ = require('jquery');

/**
 * @param {ol.Map} theMap
 */
module.exports = function(theMap){
    var search = new function(){
        this.theMap = theMap;

        // MAP UTILITY ---------------------------------------------------------
        this.initialize = function(){
            this.featureFormat = new ol.format.GeoJSON({});
            this.featureLayer = new ol.layer.Vector({
                type: 'search',
                name: 'Search Results',
                visible: false
            });
            this.theMap.addLayer(this.featureLayer);
            theStylist.setStyle('Search Results');
            var panAnim = new ol.animation.pan({
                source: this.theMap.getView().getCenter()
            });
            this.theMap.beforeRender(panAnim);

            var zoom = ol.animation.zoom({
                resolution: this.theMap.getView().getResolution()
            });
            this.theMap.beforeRender(zoom);
        }

        /**
         * @param {Array<geoJSON>} features
         */
        this.makeLayer = function(features){
            var source = new ol.source.Vector({
                attributions :[
                    new ol.Attribution({
                        html: '<div>Search by <a href="http://photon.komoot.de/">Photon </a></div>'
                    })
                ]
            });
            var features = this.featureFormat.readFeatures(features,
            {dataProjection: 'EPSG:4326',featureProjection:'EPSG:3857'});
            $.map(features, function(feat){
                feat.setId(feat.get('osm_id'));
            });
            source.addFeatures(features);
            this.featureLayer.setSource(source);
        }

        /**
         * @param {Event} evt - from menu-item search
         */
        this.panTo = function(evt){
            var osmId = $(evt).attr('osm_id');
            var source = this.featureLayer.getSource();
            var feature = source.getFeatureById(osmId);
            var position = feature.getGeometry().getCoordinates();
            this.theMap.getView().setCenter(position);
            this.theMap.getView().setZoom(16);
        }

        // DISPLAY handling ----------------------------------------------------
        this.openSearch = function(){
            var domObj = $('#menu .menu-item[type="search"]');
            domObj.find('.menu-icon').addClass('ui_hide');
            domObj.find('.input-group-btn').removeClass('ui_hide');
            domObj.addClass('opened');
        }

        this.clearSearch = function(){
            var domObj = $('#menu .menu-item[type="search"]');
            domObj.find('.input-group-btn').addClass('ui_hide');
            domObj.find('.menu-icon').removeClass('ui_hide');
            domObj.find('.search-field').val('');
            $('.menu-search').remove();
            domObj.removeClass('opened');
            this.featureLayer.setVisible(false);
        }

        // SEARCH --------------------------------------------------------------
        /**
         * Photon search implementation
         * @param {Event} evt - search-field submit
         */
        this.search = function(evt){
            $('.menu-search').remove();
            var val = $(evt).find('.search-field').val();
            var searchReq = $.ajax({
                type:'GET',
                url:'http://photon.komoot.de/api/?'+
                'q='+val+'&limit=5&lat=52.3879&lon=13.0582'
            });
            this.handleSearch(searchReq);
        }

        /**
         * @param {Defferd} defferd - AJAX request object from this.search
         */
        this.handleSearch = function(deffered){
            var addItem = $.proxy(this.addItem, this);
            var makeLayer = $.proxy(this.makeLayer, this);
            $.when(deffered).done(function(featureCollection){
                makeLayer(featureCollection);
                $.map(featureCollection.features, function(feature){
                    addItem(feature.properties);
                })
            });
        }

        /**
         * Adds the results as menu-items menu-search
         * @param {Object} itemObj - geoJSON properties from result
         */
        this.addItem = function(itemObj){
            // HACK there should be a nicer way for this...
            var display = itemObj.name ?
                itemObj.name :
                itemObj.street + ' ' + itemObj.housenumber;

            var amenity = itemObj.osm_value ?
                itemObj.osm_value:
                '';

            amenity = amenity.replace(/\w\S*/g, function(txt){
                return txt.charAt(0).toUpperCase() +
                txt.substr(1).toLowerCase();
            });

            display = display + ' - ' + amenity;
            var address = itemObj.street ?
                itemObj.street : '';

            address = itemObj.housenumber ?
                address + ' ' + itemObj.housenumber:
                address;
            address = itemObj.postcode ?
                address + ' - ' + itemObj.postcode + ' '+ itemObj.city :
                address;

            address = address.replace(/^ - /, '');

            var domObj = $('#menu .menu-item[type="search"]');
            $('<li class="menu-search clearfix">' +
                '<div class="layer-name" onclick="theSearch.panTo(this)" '+
                'osm_id="'+itemObj.osm_id+'">' +
                display+'<div class="additional">'+address+'</div>' +
                '</div></li>').insertAfter(domObj);
        }
    }
    return search;
}
