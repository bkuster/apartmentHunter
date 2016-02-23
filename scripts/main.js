// ---------------------------------------------------------------------------
// Copyright (c) Ben Kuster 2016, all rights reserved.
//
// Created: 	2016-02-6
// Version: 	0.1
// Purpose: 	The Aparment Hunter Web App should be a simple application
//              to help people find theire apartment.
//              This is the 'main' (as known from compiled languages) class. Using
//              browserify, compile and bundle this to run it as a single script.
//
// This software is provided under the GNU GPLv2
// WITHOUT ANY WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
// If no license was provided, see <http://www.gnu.org/licenses/>
//
// For more information read the README.md
// ----------------------------------------------------------------------------

jQuery = $ = require('jquery');
var bootstrap = require('bootstrap');
window.proj4 = require('proj4');
window.Cookies = require('cookies-js');
var requestConfig = $.getJSON('./config.json');

$(function(){
    $.when(requestConfig).then(function(config){
        $('.modal').modal({ show: false});

        proj4.defs("EPSG:25833","+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs");
        proj4.defs("EPSG:3068", "+proj=cass +lat_0=52.41864827777778 +lon_0=13.62720366666667 +x_0=40000 +y_0=10000 +ellps=bessel +datum=potsdam +units=m +no_defs");

        var cookieSetup = require('./safeHouse/cookieSetup.js');
        cookieSetup();

        // ESSENTIALS ----------------------------------------------------------
        var makeMenu = require('./menu/menu.js');
        var makeMap = require('./map/map.js');
        var makeSearch = require('./menu/search.js');
        var makeSafehouse = require('./safeHouse/safeHouse.js');

        var theMap = makeMap();
        window.theMenu = makeMenu(theMap, config.metaData);
        window.theSearch = makeSearch(theMap);
        window.theSafehouse = makeSafehouse(theMap);

        // STYLE ---------------------------------------------------------------
        var makeStylist = require('./style/style.js');
        window.theStylist = makeStylist(theMap, config.style);
        theSearch.initialize();
        theSafehouse.initialize();

        // LAYERS --------------------------------------------------------------
        var features = require('./map/featureLayers.js');
        features(theMap);
        var thematics = require('./map/thematicLayers.js');
        thematics(theMap);
        var additionals = require('./map/additionalSources.js');
        additionals(theMap);

        // INTERACTIONS --------------------------------------------------------
        var makeOverlay = require('./map/overlay.js');
        window.theOverlay= makeOverlay(theMap, config.overlay);
        theOverlay.initialize();

        // FILTER --------------------------------------------------------------
        var makeFilterIO = require('./filter/filterInterface.js');
        window.filterIO = makeFilterIO(theMap, config.filter);
        var makeFilter = require('./filter/filter.js');
        window.theFilter = makeFilter(theMap, config);
    });
});
