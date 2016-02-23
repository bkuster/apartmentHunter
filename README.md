Apartment Hunter
===============
This project is a homework assignment for the
Geodesy and Geominformation Master program at the TU Berlin. The idea is
to allow a user to find Apartments given some additional information on
a map. This is a *rough* prototype and only demo features are enabled. It is meant
to work for buildings in Berlin. Since this is just a fast prototype, its adapted to
work in Firefox and you need to serve it through a web server, such as an **Apache**.

### Features
The following map features are implemented
* Two base maps are implemented. For this purpose only the **OSM** base map gives a reasonable resolution.
* One thematic WMS layer representing population density.
* Two WFS feature layers:
    * One point layer displaying public schools.
    * One polygon layer of emissions.
* Address search using the [Photon](http://photon.komoot.de/) API.

Houses are found by applying filters, since the data of pulling all addresses in Berlin would overload the system and not be informative. Filters can be applied using the following tools:
* Creating a specific filter where buildings:
    * Have a distance to a certain point feature with a certain property.
    * Have a certain type of value (not implemented).
    * Are in a certain district or other polygon with a certain type (not implemented).
* Clicking a feature and selecting to search around or in it.
* Double clicking anywhere on the map.

The user can decide to *store* data in the form of cookies. Additionally,
the locations stored can be exported as a **GeoJSON**.

>This is not an optimal
solution and a *NoSQL* implementation of sorts would be a more elegant
approach. But the parameters of the task state **minimal** server configuration and a full *CouchDB* implementation (or the like) would exceed the scope.

### Requirements & Installation
To run and install the package you will need [NodeJS](https://nodejs.org/en/) installed on your computer. Once you have cloned the repo, run:
```
npm install
```
This will install all the dependencies. To build the uglified bundle run:
```
npm run release
```
> I had some issues with npm and browserify/uglify. If the command does not run, install those two globally `npm install -g browserify`

If you care to do some development, you can use the grunt file provided:
```
grunt dev
grunt watch
```
Since the **CORS** from the main data source ([Berlin Geoportal](http://www.stadtentwicklung.berlin.de/geoinformation/geodateninfrastruktur/de/geodienste/wfs.shtml)) is not set properly, you will have to setup a proxy for it. Using an **Apache**, this looks something like this:
```
<VirtualHost *:80>
    ServerAdmin {yourAdmin}
    DocumentRoot {yourDocumentRoot}
    ServerName {yourServerName}

    ProxyPass /wfs http://fbinter.stadt-berlin.de/fb/wfs/geometry/senstadt/
    ProxyPassReverse /wfs http://fbinter.stadt-berlin.de/fb/wfs/geometry/senstadt/
</VirtualHost>
```
Place or symlink the repo inside your document root and you are ready to launch the application from `your_host/apartmentHunter`
 > Make sure you load your `proxy_module` and the `proxy_http_module` for your **Apache**. And don't forget to restart your
 Apache after adding the VH.
