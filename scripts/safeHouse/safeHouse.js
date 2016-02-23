/**
 * @author Ben Kuster
 */
var $ = require('jquery');

/**
 * The Safe House is a Cookie implementation of storing a users picked houses
 * @param {ol.Map} theMap
 * @return {module} safeHouse
 */
module.exports = function(theMap){
    var safeHouse = new function(){
        this.theMap = theMap;

        /**
         * Initializes the safeHouse and restores previously saved Cookies
         */
        this.initialize = function(){
            this.featureFormat = new ol.format.GeoJSON({});
            this.featureSource = new ol.source.Vector({});
            this.featureLayer = new ol.layer.Vector({
                type: 'house',
                name: 'My Locations',
                visible: false,
                source: this.featureSource
            });

            var houseList = $.parseJSON(Cookies.get('houseList'));
            var format = this.featureFormat;
            var source = this.featureSource;
            $.map(houseList, function(house){
                source.addFeature(format.readFeature($.parseJSON(house)));
            });

            this.theMap.addLayer(this.featureLayer);
            theStylist.setStyle('My Locations');

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
         * @param {Event} evt - caller from an overlay popup Needs to be from a filter layer
         */
        this.addHouse = function(evt){
            evt = $(evt);
            var layerName = evt.attr('location').split(':')[0];
            var featId = evt.attr('location').split(':')[1];
            var feature;

            var layers = this.theMap.getLayers();
            layers.forEach(function(layer){
                if(layer.get('name') === layerName){
                    feature = layer.getSource().getFeatureById(featId);
                    layer.getSource().removeFeature(feature);
                }
            });

            this.featureSource.addFeature(feature);
            this.writeCookie(feature);
        }

        /**
         * @param {Event} evt - call from My Locations overlay
         */
        this.removeHouse = function(evt){
            evt = $(evt);
            var featId = evt.attr('location');

            var feature = this.featureSource.getFeatureById(featId);
            this.featureSource.removeFeature(feature);
            this.removeCookie(feature);
            $('body').hasClass('modal-open') ? this.show() : null;
        }

        /**
         * @param {ol.Feature} feature
         */
        this.removeCookie = function(feature){
            var houseList = $.parseJSON(Cookies.get('houseList'));
            var newList = [];
            $.map(houseList, function(house){
                var house = $.parseJSON(house);
                if(house.id !== feature.getId()){
                    newList.push(JSON.stringify(house));
                }
            });
            Cookies.set('houseList', JSON.stringify(newList));
        }

        /**
         * @param {ol.Feature} feature
         */
        this.writeCookie = function(feature){
            var houseList = $.parseJSON(Cookies.get('houseList'));
            var newList = [];

            $.map(houseList, function(house){
                var house = $.parseJSON(house);
                if(house.id !== feature.getId()){
                    newList.push(JSON.stringify(house));
                }
            });
            var geoJSON = this.featureFormat.writeFeature(feature);
            newList.push(geoJSON);
            Cookies.set('houseList', JSON.stringify(newList));
        }

        /**
         * Shows the Safe House modal
         * XXX bad method name
         */
        this.show = function(){
            var table = '<table class="table">'+
                '<tr><th>Address</th><th>Situation</th><th>Noise</th><th>Zoom-To</th><th>Delete</th></tr>';

            this.featureSource.forEachFeature(function(house){
                table = table + '<tr><td>'+
                    house.get('STRASSE')+' '+
                    house.get('ADR').replace(/^0+/, '')+'<br>'+
                    house.get('PLZ')+' - '+
                    'Berlin-'+house.get('BEZNAME')+'</td>';

                var wohn = house.get('WOL') ?
                    house.get('WOL'):
                    '';
                var larm = house.get('LAERM') ?
                    house.get('LAERM'):
                    '';

                table = table + '<td>'+ wohn +'</td><td>'+
                    larm + '</td><td><button class="btn btn-default" onclick="theSafehouse.pan(this)" '+
                    'location="'+house.getId()+'"><span class="glyphicon glyphicon-zoom-in"></span></button></td><td>'+
                    '<td><button class="btn btn-danger" onclick="theSafehouse.removeHouse(this)" '+
                    'location="'+house.getId()+'"><span class="glyphicon glyphicon-trash"></span></button></td></tr>';
            });

            table = table + '</table>';
            var modal = $('#houseModal');
            modal.find('.modal-body').empty();
            modal.find('.modal-body').append(table);

            // https://jsfiddle.net/cowboy/hHZa9/
            var geoJSON = this.featureFormat.writeFeatures(this.featureSource.getFeatures());
            geoJSON = $.parseJSON(geoJSON);
            geoJSON.crs = {
                "type":"name",
                "properties": {
                    "name": "EPSG:3857"
                }
            };

            var data = "text/geojson;charset=utf-8," + encodeURIComponent(JSON.stringify(geoJSON));
            modal.find('#exportJson').attr('href', 'data:'+data);
            modal.find('#exportJson').attr('download', 'data.geojson');
            modal.modal('show');
        }

        /**
         * @param {Event} evt - from the Safe House modal
         */
        this.pan = function(evt){
            $('#houseModal').modal('hide');
            var  featId = $(evt).attr('location');
            var feature = this.featureSource.getFeatureById( featId);;
            var position = feature.getGeometry().getCoordinates();
            this.theMap.getView().setCenter(position);
            this.theMap.getView().setZoom(18);
        }

    }
    return safeHouse;
}
