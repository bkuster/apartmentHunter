/**
* @author Ben Kuster
* TODO s    -   use the config for more things.
*               a lot of methods could be replaced by clever config
*           -   trigger modal dismissal with emptying it...
*           -   read a filter discription so to EDIT a layer!
*           -   make the up / down arrows do something
*           -   create a style tab in the modal for the user to specify the look
*           -   make the has property where the property is not discrete
*/
jQuery = $ = require('jquery');
var bootstrap = require('bootstrap');

/**
* @param ol.Map theMap
* @param <Object> config
* @return module
*/
module.exports = function(theMap, config){
    var filterInterface = new function(){
        this.theMap = theMap;
        // GENERAL BANTER ------------------------------------------------------
        // set primary and secondary filter types
        // FIXME get from config
        this.primaryTypes = ['Distance To', 'Within', 'Has Type'];
        this.secondaryTypes = ['Has Type'];
        this.modalForm = $('#filterModal .form-group');

        this.hasTypeConfig = config.hasType;
        // PRIMARY FILTER ------------------------------------------------------
        /**
        * @param@optional Event evt - event that triggered the new cretion
        * HACK the way the optional is handled is not pretty
        */
        this.new = function(evt){
            if(evt){
                if($('#filterModal .form-group').children('li').length === 0){ // HACK not pretty!
                    var firstEntry = '<li class="clearfix form-inline"><h4>Buildings which are:</h4>'+
                        '<div class="pull-right">'+
                            'Filter Name: <input type="text" class="filterName form-control" placeholder="Filter Name"></input>'+
                        '</div></li>' +
                    '<li class="current clearfix form-inline filterDef">'+
                    '<span class="glyphicon glyphicon-none"></span>'+
                    '<select class="primaryFilter form-control" onchange="filterIO.handlePrimary(this)"'+
                    'autofocus></select></li>';

                    this.modalForm.append(firstEntry);
                    this.addPrimary();
                }
            }else{
                var firstEntry = '<li class="current clearfix form-inline filterDef">'+
                '<span class="glyphicon glyphicon-none"></span>'+
                '<select class="primaryFilter form-control" onchange="filterIO.handlePrimary(this)"'+
                'autofocus></select></li>';

                this.modalForm.append(firstEntry);
                this.addPrimary();
            }
            $('#filterModal').modal('show');
        }

        /**
        * sets the select option of the primary filter
        */
        this.addPrimary = function(){
            var currentFilter = this.modalForm.children('.current');
            var primary = currentFilter.children('.primaryFilter');
            var innerStr = '<option value disabled selected>Select a Filter</option>';
            $.map(this.primaryTypes, function(typeStr){
                innerStr = innerStr + '<option value="'+
                    typeStr+'">' + typeStr + '</option>'
            })

            primary.html(innerStr);
        }

        /**
        * @param Event evt - selected primary filter
        */
        this.handlePrimary = function(evt){
            switch (evt.value) {
                case 'Distance To':
                    this.distanceTo(evt);
                    break;
                case 'Within':
                    this.within(evt);
                    break;
                case 'Has Type':
                    this.hasType(evt);
                    break;

            }
        }

        // FILTER TYPES --------------------------------------------------------
        /**
        * all three filter types and their layouts
        * @param Event evt - calling event
        * TODO a lot of code is used multiply, better class modeling needed
        */
        this.distanceTo = function(evt){
            var parent = $(evt.parentElement);
            if(parent.children('.distancTo').length === 0){
                parent.children().not('.glyphicon, .primaryFilter').remove();

                var glyph = parent.children('.glyphicon-none');
                glyph.removeClass('glyphicon-none');
                glyph.addClass('glyphicon-remove');
                glyph.attr('onclick', 'filterIO.delete(this)');

                var layerSelect = '<select class="layerSelect form-control">'+
                '<option selected disabled>Layer</option>';
                $.map(this.getFeatureLayers('Point'), function(layerName){
                    layerSelect = layerSelect + '<option value="' + layerName +
                        '">'+layerName+'</option>';
                });
                layerSelect = layerSelect + '</select>';
                parent.append(layerSelect);

                var distField = '<div> of no more than: <input class="distanceTo form-control" type="text" name="distance"></input> meters</div>';
                parent.append(distField);
            }
            this.endOfFilter(parent, true);
            if(parent.hasClass('current')){
                parent.removeClass('current');
                this.new();
            }
        }

        this.within = function(evt){
            var parent = $(evt.parentElement);
            if(parent.children('.hasTypeValue').length === 0){ // HACK checking in this fashion is messy
                parent.children().not('.glyphicon, .primaryFilter').remove();

                var glyph = parent.children('.glyphicon-none');
                glyph.removeClass('glyphicon-none');
                glyph.addClass('glyphicon-remove');
                glyph.attr('onclick', 'filterIO.delete(this)');

                var layerSelect = '<select class="layerSelect form-control"' +
                    ' onchange="filterIO.appendHasType(this)">';
                layerSelect = layerSelect + '<option selected disabled> Layer </option>';
                $.map(this.getFeatureLayers('Polygon'), function(layerName){
                    layerSelect = layerSelect + '<option value="' + layerName +
                        '">'+layerName+'</option>';
                });
                layerSelect = layerSelect + '</select>';

                parent.append(layerSelect);
            }
            this.endOfFilter(parent, false);

            if(parent.hasClass('current')){
                parent.removeClass('current');
                this.new();
            }
        }

        // TODO finish this properly
        this.hasType = function(evt){
            var parent = $(evt.parentElement);

            if(parent.children('.hasTypeValue').length === 0){
                parent.children().not('.glyphicon, .primaryFilter').remove();

                var glyph = parent.children('.glyphicon-none');
                glyph.removeClass('glyphicon-none');
                glyph.addClass('glyphicon-remove');
                glyph.attr('onclick', 'filterIO.delete(this)');

                // TODO add the selected layers name
                this.appendHasType(evt);
            }
            this.endOfFilter(parent,false);

            if(parent.hasClass('current')){
                parent.removeClass('current');
                this.new();
            }
        }

        /**
        * appends the has type to the within, subquery and hasType filters
        */
        this.appendHasType = function(evt){
            var jevt = $(evt);
            // XXX this here is bad checks for within call, subquery call or original primaryFilter
            if(jevt.hasClass('layerSelect')){
                var layerName = jevt.val();
            } else if(jevt.hasClass('subQuery-btn')){
                var layerName = jevt.parent().parent().children('.layerSelect').val();
            } else {
                return // TODO get building config for primaryFilter
            }
            var conf = this.hasTypeConfig[layerName.replace(/ /g, '_')];

            var select = '<div> with </div><select class="propertySelect form-control" onchange="filterIO.handleHasType(this)">' +
            '<option selected disabled>Property</option>';
            $.map(conf, function(prop){
                select = select + '<option value="'+
                layerName + ':' + prop.key + '">'+ prop.alias + '</option>';
            });
            select = select + '</select>';

            if(jevt.hasClass('subQuery-btn')){
                jevt = jevt.parent().prev().append(select)
            } else {
                jevt.parent().children('.endOfFilter').before(select);
            }
        }

        /**
        * hanldes the options to be displayed
        */
        this.handleHasType = function(evt){
            var jevt = $(evt);
            var layerName = jevt.val().split(':')[0];
            var key = jevt.val().split(':')[1];
            var exact;

            $.map(this.hasTypeConfig[layerName.replace(/ /g, '_')], function(prop){
                if(prop.key === key){
                    exact = prop.exact;
                }
            });

            if(exact){
                var choices = [];
                var layers = this.theMap.getLayers();
                layers.forEach(function(layer){
                    if(layer.get('name') === layerName){
                        var source = layer.getSource();
                        var feats = source.getFeatures();
                        if(feats.length > 0){
                            $.map(feats, function(feat){
                                var val = feat.get(key);
                                if($.inArray(val, choices)<0){
                                    choices.push(val);
                                }
                            });
                        } else {
                            source.loadFeatures();
                            source.once('change',function(e){
                                source.forEachFeature(function(feat){
                                    var val = feat.get(key);
                                    if($.inArray(val, choices)<0){
                                        choices.push(val);
                                    }
                                });
                            });
                        }
                    }
                });

                if(jevt.parent().children('.valueSelect, .valueOperator').length > 0){
                    jevt.parent().children('.valueSelect, .valueOperator').remove();
                }
                var select = '<div class="valueOperator"> equal to </div><select class="valueSelect form-control" onchange="filterIO.handleHasType(this)">' +
                '<option selected disabled>Value</option>';
                $.map(choices, function(choice){
                    select = select + '<option value="'+
                    choice + '">'+ choice + '</option>';
                });
                select = select + '</select>';

                if(jevt.parent().hasClass('subQuery')){
                    jevt.parent().append(select);
                } else {
                    jevt.parent().children('.endOfFilter').before(select);
                }
            } // TODO else, greater smaller equal and field!
        }

        // UTILS ---------------------------------------------------------------
        /**
        * @return [Array<String>] options - array of layer names
        * IDEA pass the possible layers from the config file...
        * outlineing the filter possibilites as well
        */
        this.getFeatureLayers = function(type){
            var layers = this.theMap.getLayers();
            var options = [];
            layers.forEach(function(layer){
                if(layer.get('type') === 'feature' | layer.get('type') === 'additional'){
                    var source = layer.getSource();
                    var feats = source.getFeatures()[0];
                    if(feats){
                        if(feats.getGeometry().getType() === type){
                            options.push(layer.get('name'));
                        }
                    } else {
                        source.loadFeatures();
                        source.once('change',function(e){
                            if (source.getState() === 'ready') {
                                feats = source.getFeatures()[0];
                                if(feats.getGeometry().getType() === type){
                                    options.push(layer.get('name'));
                                }
                            }
                        });
                    }
                }
            });
            return options;
        }

        /**
        * @param Event evt
        * only removes the UI of a filter.... not the layer
        */
        this.delete = function(evt){
            var parent = $(evt.parentElement);
            parent.remove();

            // check if this was the only filter
            if($('#filterModal .form-group').children('li').length === 1){
                this.new();
            }
        }

        /**
        * @param <Object DOM> parent - parent to append end of filter to
        * @param boolean canSub - wether to add a subquery option
        * declares the end of a filter definition and how to logically combine it
        */
        this.endOfFilter = function(parent, canSub){
            if(parent.children('.endOfFilter').length > 0){
                parent.children('.endOfFilter').remove();
            }
            if(!canSub){
                parent.children('.subQuery').remove();
            }

            var sub = canSub ? '<div class="pull-right"><span class="glyphicon glyphicon-menu-down"'+
            ' onclick="filterOI.moveDown(this)"></span>'+
            '<span class="glyphicon glyphicon-menu-up" onclick="filterOI.moveUp(this)"></span></div>'+
            '<button class="subQuery-btn btn pull-right" '+
            ' onclick="event.preventDefault();filterIO.addSub(this)">Add Sub-Query</button>':
            '<div class="pull-right"><span class="glyphicon glyphicon-menu-down" onclick="filterOI.moveDown(this)"></span>'+
            '<span class="glyphicon glyphicon-menu-up" onclick="filterOI.moveUp(this)"></span></div>';

            var endLine = '<li class="endOfFilter clearfix form-inline">'+
            '<select class="logicalCombo form-control">'+
            '<option value="AND">And</option>' +
            '<option value="OR">Or</option>'+
            '</select>'+sub+
            '</li><hr>';

            parent.append(endLine);
        }

        /**
        * @param Event evt
        */
        this.addSub = function(evt){
            var parent = $(evt.parentElement);

            if(parent.parent().children('.subQuery').length > 0){
                var last = parent.prev();
                var logic = '<select class="logicalCombo form-control pull-right">'+
                    '<option value="AND">And</option>' +
                    '<option value="OR">Or</option>'+
                    '</select>';
                last.append(logic);
            }

            var str = '<li class="subQuery clearfix form-inline">'+
            '<span class="glyphicon glyphicon-remove" onclick="filterIO.delete(this)"></span>' +
            '<div>Where '+ parent.parent().children('.layerSelect').val() +
            ' are </div></li>';
            parent.before(str);
            this.appendHasType(evt);
        }

        this.clearAll = function(){
            this.modalForm.empty();
            this.new({id:'dummy'}); // HACK this needs better flow
        }

        // SPECIAL FILTER ---- -------------------------------------------------
        // Special filters are the ones made interactively from the map
        /**
        * @param Event evt - special format! needs a filter definition as a string
        *                   and the calling feature layer and id
        * XXX bad naming, this actually just shows the modal
        */
        this.makeSpecial = function(evt){
            var specModal = $('#specialModal');
            evt = $(evt);
            var filter = evt.attr('filter').split(':')[0];
            if(filter === 'distanceTo'){
                var dist = '<li class="form-inline"><div> With distance of no more than: <input class="distanceTo form-control" type="text" name="distance"></input> meters</div></li>';
                specModal.find('.modal-body').append(dist);
            }
            $('#specialModal .btn-success').attr('feature', evt.attr('filter').split(':')[1]);
            $('#specialModal .btn-success').attr('layer', evt.parent().parent().attr('name'));
            specModal.modal('show');
        }

        /**
        * @param Event evt - @see this.makeSpecial
        * applied after the modal is filled out
        */
        this.submitSpecial = function(evt){
            evt = $(evt);
            var filterName = $('#specialModal .filterName').val();
            var def;
            if(!filterName){
                alert("Please enter a filter name");
                return;
            }
            var distance = $('#specialModal .distanceTo').val();
            if(typeof distance !== 'undefined'){
                def = {
                    "type":"Distance To",
                    "def":{
                        "distance":distance,
                        "layer":evt.attr('layer'),
                        "id":evt.attr('feature')
                    }
                };
            } else {
                def = {
                    "type":"Within",
                    "def":{
                        "layer":evt.attr('layer'),
                        "id":evt.attr('feature')
                    }
                };
            }
            this.addDefCookie([def], filterName);
            theFilter.runDefinition(filterName);
            $('#specialModal').modal('hide');
            this.clearSpecial();
        }

        this.clearSpecial = function(){
            $('#specialModal .filterName').val('');
            $('#specialModal li:has(.distanceTo)').remove();
        }

        // DEFINITION CREATION -------------------------------------------------
        // creates a JSON object defining the user input and passing it on to filter

        this.submit = function(){
            var layerName = this.createDefinition();
            theFilter.runDefinition(layerName);
            $('#filterModal').modal('hide');
            this.clearAll();
        }

        /**
        * Defines the filters by itterating though the modal
        * @param <Object DOM> filterDef - the <li> obecjt describing a single filter
        */
        this.createDefinition = function(){
            var filterName = $('#filterModal .filterName').val();
            if(!filterName){
                alert("Please enter a filter name");
                return;
            }
            var filters = [];
            // map all defined filters
            $.map($('#filterModal .form-group').children('.filterDef'), function(filterList){
                var filter = {};
                filterList = $(filterList);
                filter.type = filterList.children('.primaryFilter').val();
                switch (filter.type) {
                    case 'Distance To':
                        filter.def=filterIO.defineDistanceTo(filterList);
                        break;
                    case 'Within':
                        filter.def=filterIO.defineWithin(filterList);
                        break;
                    case 'Has Type':
                        filter.def=filterIO.defineHasType(filterList);
                        break;
                    default:
                        break;

                }
                filter.logic = filterList.children('.endOfFilter .logicalCombo').val();
                if(filter.type){
                    filters.push(filter);
                }
            });
            this.addDefCookie(filters, filterName)
            return filterName;
        }

        this.defineDistanceTo = function(filterDef){
            var def = {}
            def.layer = filterDef.children('.layerSelect').val();
            def.distance = filterDef.children('div').children('.distanceTo').val(); // distance to is packed... TODO make better

            // check for subqueries
            if(filterDef.children('.subQuery').length > 0){
                var subs = [];
                $.map(filterDef.children('.subQuery'), function(subQuery){
                    subQuery = $(subQuery);
                    var def = filterIO.defineHasType(subQuery);
                    def.logic = subQuery.children('.logicalCombo').val() ?
                        subQuery.children('.logicalCombo').val() :
                        '';
                    subs.push(def);
                });
                def.subqueries = subs;
            }
            return def;
        }

        this.defineWithin = function(filterDef){
            var def = {}
            def.layer = filterDef.children('.layerSelect').val();
            $.extend(def, this.defineHasType(filterDef));
            return def;
        }

        this.defineHasType = function(filterDef){
            var def = {};
            def.property = filterDef.children('.propertySelect').val();
            def.operator = filterDef.children('.valueOperator').val() ? filterDef.children('.valueOperator').val() : "eq";
            def.val = filterDef.children('.valueSelect').val();
            return def;
        }

        /**
        * @param <Object> filters - JSON definition
        * @param String filterName
        */
        this.addDefCookie = function(filters, filterName){
            // TODO do some checking here for reserved names etc...
            var definedFilters = $.parseJSON(Cookies.get('filterList'));

            if($.inArray(filterName, definedFilters) === -1){
                // TODO warn of overwrite
                definedFilters.push(filterName);
                Cookies.set('filterList', JSON.stringify(definedFilters));
            }
            Cookies.set(filterName+'-def', JSON.stringify(filters));
        }
    }
    return filterInterface;
}
