/**
 * @author Ben Kuster
 * IDEA     -   wait for user confirmation?
 */
jQuery = $ = require('jquery');
var bootstrap = require('bootstrap');

/**
 * Setup the global Cookies object
 */
module.exports = function(){
    Cookies.defaults = {
        expires: 30
    }

    if(!Cookies.enabled){
        alert("To work properly, this site needs cookies!");
    }

    var seen = Cookies.get('seen');
    if(typeof seen === 'undefined'){
        var alert = '<div class="alert alert-info alert-over">'+
            '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'+
            '<strong>Cookies!</strong> This site uses cookies.</div>';
        $('#map').after(alert);
        Cookies.set('seen', true);

        Cookies.set('filterList', JSON.stringify([]));
        Cookies.set('houseList', JSON.stringify([]));
    }
}
