/**
* @author Ben Kuster
*/
var _ = require('underscore');

/**
* @param <Object> config
* @return module
*/
module.exports = function(config){
    var templates = {};
    $.map(config, function(value, key){
        templates[key] = _.template(value);
    })
    return templates;
}
