/**
* @author Ben Kuster
*/
var $ = require('jquery');
var ol = require('openlayers/dist/ol-debug');

/**
* @param ol.Map theMap
*/
module.exports = function(theMap){
    var layers = [];

    var schoolFormat = new ol.format.WFS({
        featureNS: 'http://www.berlin.de/broker',
        featureType: 're_schulstand'
    });

    var schoolSource = new ol.source.Vector({
        projection: 'EPSG:3857',
        loader: function(extent, resolution, projection) {
            var epsg4326Extent = ol.proj.transformExtent(extent, projection, 'EPSG:4326');
                // lat/lon messed up!
            epsg4326Extent = [epsg4326Extent[1], epsg4326Extent[0], epsg4326Extent[3], epsg4326Extent[2]];
            var url = '/re_schulstand?' +
                'service=WFS&request=GetFeature&version=1.1.0&'+
                'srsname=EPSG:25833&typename=fsi:re_schulstand';
            $.ajax({url:url, dataTpye:'application/xml'}).done(function(response) {
                var features = schoolFormat.readFeatures(response,
                {
                    dataProjection: 'EPSG:25833',
                    featureProjection: 'EPSG:3857'
                });
                schoolSource.addFeatures(features);
            });
        }
    });

    var schoolLayer = new ol.layer.Vector({
        source: schoolSource,
        name:'Public Schools',
        type: 'feature',
        visible: false // HACK all layers are invisible until they are styled once!
    });
    layers.push(schoolLayer);

    // EMISSIONS
    var emissionFormat = new ol.format.WFS({
        featureNS: 'http://www.berlin.de/broker',
        featureType: 're_emiss_alle_1989_2009',
        gmlFormat: ol.format.GML3
    });

    var emissionSource = new ol.source.Vector({
        projection: 'EPSG:3857',
        format: new ol.format.GeoJSON(),
        url: './data/emiss.geojson'
    });

    var emissionLayer = new ol.layer.Vector({
        source: emissionSource,
        name: 'Emissions',
        type: 'feature',
        visible: false
    });
    layers.push(emissionLayer);

    $.map(layers, function(layer){
        theMap.addLayer(layer);
        theStylist.setStyle(layer.get('name'));
    })

    // IDEA maybe hook it to the stylist to have an 'init' function once everything is loaded?
}
