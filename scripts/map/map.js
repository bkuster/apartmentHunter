/**
 * @author Ben Kuster
 */
var ol = require('openlayers/dist/ol-debug');


/**
 * @return ol.Map theMap
 */
module.exports = function(){
    var mapQuestLayer = new ol.layer.Tile({
        source: new ol.source.MapQuest({layer: 'sat'}),
        name: 'mapQuestLayer',
        type: 'base',
        visible:false
    });

    var osmLayer = new ol.layer.Tile({
      source: new ol.source.OSM({
          attributions:[
              new ol.Attribution({
                  html: '<div>Icons made by <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>'
              }),
              new ol.Attribution({
                  html: '<div> Feature data by the City of Berlin:<a href=\"http://www.stadtentwicklung.berlin.de/geoinformation/geodateninfrastruktur/de/geodienste/wms_titel.shtml\">Berlin Geoportal</a></div>'
              }),
              ol.source.OSM.ATTRIBUTION
          ]
      }),
      name: 'osmLayer',
      type: 'base'
    });

    var theMap = new ol.Map({
        renderer: 'canvas',
        target: 'map',
        layers: [osmLayer, mapQuestLayer],
        interactions : ol.interaction.defaults({doubleClickZoom :false}),
        view: new ol.View({
          center: ol.proj.fromLonLat([13.408333,52.518611]),
          zoom: 12
        })
    });
    return theMap;
}
