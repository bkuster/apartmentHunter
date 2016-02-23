/**
* @author Ben Kuster
* loads additional resources that are NOT displayed in the map
* but used for filtering
*/

var $ = require('jquery');
var ol = require('openlayers/dist/ol-debug');

/**
* @param ol.Map theMap
*/
module.exports = function(theMap){
    var wfsDistrict = new ol.format.WFS({
        featureNS: 'http://www.berlin.de/broker',
        featureType: 're_bezirke'
    });

    var districtSource = new ol.source.Vector({
        projection: 'EPSG:3857',
        format: new ol.format.GeoJSON(),
        url: './data/bezirke.geojson'
    });

    var districtLayer = new ol.layer.Vector({
        source: districtSource,
        name: 'Districts',
        type: 'additional',
        visible: false
    });
    theMap.addLayer(districtLayer);
}
