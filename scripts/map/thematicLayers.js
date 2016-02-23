/**
 * @author Ben Kuster
 * thematic layers are IMAGES - AKA maps without interaction
 * TODO     -   make it possible to simply add new layers by using the config...
 */
var ol = require('openlayers/dist/ol-debug');
/**
 * @param {ol.Map} theMap
 */
module.exports = function(theMap){
    var layers = [];
    var densitySource = new ol.source.TileWMS({
        url: 'http://fbinter.stadt-berlin.de/fb/wms/senstadt/k06_06ewdichte2014',
        params: {
         'LAYERS':'0',
         'VERSION':'1.3.0',
         'STYLES':'gdi_default',
         'CRS': 'EPSG:25833',
         'FORMAT':'image/png'
        },
        projection: 'EPSG:25833'
    });

    var densityLayer = new ol.layer.Tile({
        source: densitySource,
        name: 'Population Density',
        type: 'thematic',
        visible: false
    });
    densityLayer.setOpacity(0.6);
    layers.push(densityLayer);

    $.map(layers, function(layer){
        theMap.addLayer(layer);
    })
}
