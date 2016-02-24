/**-----------------------------------------------------------------------------
* @author Ben Kuster
* TODO s :     -    Make the Make functions return geometries for internal filtering
*                   thus making the GMLs after...on the FINAL term.
*              -    load all cookie filters on start?
*              -    split this up into submodules for each filter
*              -    with a superclass FILTER
*-----------------------------------------------------------------------------*/

var $ = require('jquery');
var turf = require('turf');
var ol = require('openlayers/dist/ol-debug');
var getTamplates = require('./filterTemplates.js');

/**
* @param ol.Map theMap
* @param <Obect> config
*/
module.exports = function(theMap, config){
    var filter = new function(){
        this.theMap = theMap;
        this.template = getTamplates(config.templates);
        this.styleConfig = config.style.typeFilter;

        // ROUTINE -------------------------------------------------------------
        /**
        * runs the filter definition stored in the cookies
        * @param String layerName
        */
        this.runDefinition = function(layerName){
            var defs = $.parseJSON(Cookies.get(layerName+'-def'));
            var filterBodies;
            if(defs.length === 1){
                var def = defs[0];
                var query = {}
                switch (def.type) {
                    case "Distance To":
                        query.body = this.makeDistanceTo(def.def);
                        break;
                    case "Within":
                        query.body = this.makeWithin(def.def);
                        break;
                    case "Has Type":
                        query.body = this.makeHasType(def.def);
                        break;
                    default:
                        alert('filter: '+layerName+' failed');
                    }
                filterBodies = query.body;
            } else {
                // TODO multiple filter definitions
                // this needs logic and ordering to reduce amount of requests
                // and the processing time
            }
            var requests = [];
            for(i in filterBodies){
                requests.push(this.template.request({'filterBody':filterBodies[i]}));
            }
            this.makeLayer(requests, layerName);
        }

        /**
        * @param [Array<Strings>] requests
        * @param String layerName
        */
        this.makeLayer = function(requests, layerName){
            // TODO check for duplicate!
            // if a duplicate, just change the source of the layer
            var wfsFormat = new ol.format.WFS({
                featureNS: 'http://www.berlin.de/broker',
                featureType: 're_wohnlagenadr2015Type'
            });

            var filterSource = new ol.source.Vector();

            for(var i in requests){
                this.requestAddrs(requests[i], wfsFormat, filterSource);
            }

            var styleConfig = this.styleConfig;
            styleConfig.name = layerName;

            var filterLayer = new ol.layer.Vector({
                source: filterSource,
                name:layerName,
                type: 'filter',
                visible: true,
                styleConfig: styleConfig
            });

            theMap.addLayer(filterLayer);
            theStylist.setStyle(layerName);
            // TODO add the new layer to the menu without moving anything
        }

        /**
        * @param String request
        * @param ol.format.WFS format
        * @param ol.source.Vector source
        * IDEA this function could return successfull loads and provide a progress bar
        */
        this.requestAddrs = function(request, format, source){
            $.ajax({
                url: '/re_wohnlagenadr2015',
                type: 'POST',
                contentType: "text/xml",
                dataType: "text",
                data: request
            }).done(function(response) {
                var features = format.readFeatures(response,
                {
                    dataProjection: 'EPSG:25833',
                    featureProjection: 'EPSG:3857'
                });
                source.addFeatures(features);
            });
        }

        // TYPES ---------------------------------------------------------------
        /**
        * these functions run the filters returning GEOMETRIES
        * @param <Object> def - definition of a filter
        * @return [Array<String>] filterBodies - string representation of the within statement
        * IDEA these should not return the within statements yet, but the geometries so multiple
        * filters can be broken down further BEFORE sending requests
        */
        this.makeDistanceTo = function(def){ // HACK think about passing options instead of a def from multiple sources
            var ids;
            var geoms;
            if('id' in def){
                ids = [def.id];
            }else{
                if(def.subqueries.length === 1){
                        ids = this.withProperty(def.subqueries[0]);
                } else if (def.subqueries.length > 0){
                    // TODO same as with multiple filter definitions
                }
            }

            if(ids.length > 0){
                geoms = this.createPointBuffer(def.layer, def.distance, ids);
            } else{
                this.createPointBuffer(def.layer, def.distance);
            }

            var gmlGeom = this.toGML(geoms);

            var filterBodies = [];
            for(i in gmlGeom){
                filterBodies.push(this.template.within({'geom':gmlGeom[i]}));
            }
            return filterBodies;
        }

        this.makeWithin = function(def, ids){
            // TODO make within
        }

        this.makeHasType = function(def){
            // TODO property query for BUILDINGS

        }

        // INTERNAL FILTERS ----------------------------------------------------
        /**
        * @param <Object> query - the definition of one filter query
        * @return [Array<String>] ids - returns a list of ids associated with the picked geometries
        * opposed to the above filters, these filters only run on geometries in the map
        */
        this.withProperty = function(query){
            var ids = [];
            var layerName;
            var key;
            if("layer" in query){ // HACK for finding a within
                layerName = query.layerName
                key = query.property
            } else {
                layerName = query.property.split(':')[0]
                key = query.property.split(':')[1]
            }
            var layers = this.theMap.getLayers();
            layers.forEach(function(layer){
                if(layer.get('name') === layerName){
                    var source = layer.getSource();
                    source.forEachFeature(function(feat){
                        var prop = feat.getProperties()
                        if(prop[key] === query.val){
                            ids.push(feat.getId());
                        }
                    });
                }
            });
            return ids;
        }

        // TODO internal within & union & intersects
        // IDEA internal distance is not needed, is that correct?

        // UTILITY -------------------------------------------------------------
        /**
        * @param ol.layer.Vector layerObj
        */
        this.addLayer = function(layerObj){
            this.theMap.addLayer(layerObj);
        }

        /**
        * @param [Array<Object>] geoms - array of geoJSON geometries
        * @return [Array<String>] gmlGeoms - array of input as GML
        */
        this.toGML = function(geoms){
            var geoJsonFormat = new ol.format.GeoJSON();
            var gmlFormat = new ol.format.GML({
                multiSurface: false
            });

            var gmlGeoms = [];

            // HACK there is a bug here when only inputing a single buffer
            if(geoms.length === 1){
                var olFeat = geoJsonFormat.readFeatures(geoms[0], {dataProjection:'EPSG:4326', featureProjection:'EPSG:25833'});
                var gmlGeom = gmlFormat.writeGeometry(olFeat[0].getGeometry());
                gmlGeoms.push(gmlGeom);
            } else {
                var geom = turf.merge(turf.featurecollection(geoms));
                $.map(geom.geometry.coordinates, function(coords){
                    var feat = turf.polygon(coords);
                    var olFeat = geoJsonFormat.readFeature(feat, {dataProjection:'EPSG:4326', featureProjection:'EPSG:25833'});
                    var gmlGeom = gmlFormat.writeGeometry(olFeat.getGeometry());
                    gmlGeoms.push(gmlGeom);
                });
            }
            return gmlGeoms;
        }

        // GEOMETRY ------------------------------------------------------------
        /**
        * @param String layerName
        * @param Number distance
        * @param [Array<String>] ids - the ids of the objects to buffer
        * @return [Array<Object>] buffers - array of GeoJSON buffer rings
        */
        this.createPointBuffer = function(layerName, distance, ids){
            var layers = this.theMap.getLayers();
            var buffers = [];
            layers.forEach(function(layer){
                if(layer.get('name') === layerName){
                    var source = layer.getSource();
                    if(ids){
                        $.map(ids, function(id){
                            var point = source.getFeatureById(id);
                            var geom = point.getGeometry().clone();
                            var feat = {
                                "type":"Feature",
                                "properties":{},
                                "geometry":{
                                    "type":"Point",
                                    "coordinates": geom.transform('EPSG:3857','EPSG:4326').flatCoordinates.slice(0,2)
                                }
                            };
                            var buffer = turf.buffer(feat, distance, 'meters');
                            buffers.push(buffer.features[0]);
                        })
                    } else {
                        source.forEachFeature(function(point){
                            var geom = point.getGeometry().clone();
                            var feat = {
                                "type":"Feature",
                                "properties":{},
                                "geometry":{
                                    "type":"Point",
                                    "coordinates": geom.transform('EPSG:3857','EPSG:4326').flatCoordinates.slice(0,2)
                                }
                            };
                            var buffer = turf.buffer(feat, distance, 'meters');
                            buffers.push(buffer.features[0]);
                        });
                    }
                }
            });
            return buffers;
        }
    }
    return filter;
}
