# uniroster-server
Node based server to deliver rostering information using multiple protocols (e.g., OneRoster, Ed-Fi, etc.)  Written to supply data for clients
and unit/acceptance tests, currently OneRoster v1.0 is supported, with OneRoster v1.1 and Ed-Fi on-deck.

**Getting started**

Install the project's dependencies:

`npm install`

Edit config.js to set the database connection and server settings.

~~~~
db.host = 'localhost';
db.user = 'uniroster';
db.password = 'password';
db.database = 'uniroster'

config.httpActive = true;
config.httpPort = 3000;

config.httpsActive = false;
config.httpsPort = 3443;
config.httpsCert = './bin/cert.pem';
config.httpsPrivateKey = './bin/key.pem';
~~~~

Configure your datasets (see below).

Start the server:

`node uniroster-server`

  
**Data sets**
The rostering data is stored in one or more MySQL databases along with a database called _uniroster_ that maps OAuth credentials to a dataset 
(database). To add additional datasets, add rows to _uniroster_ that specifies the dataset name, client_id, client_password, and name of the database to be used. 

A list of datasets can be viewed by navigating to the server's root address (http://localhost:3000/). 

**For real-world uses of the server, this endpoint should be disabled as it enumerates the datasets along with the client_id and client-password needed to access the data.**

**OneRoster**

OneRoster CSV files can be imported into a MySQL database using a tool like SQLYog (database->import->import external data). If you use SQLYog. all of the tables will be created and populated from the OneRoster files. Any metadata fields will be imported and will be returned when queried.

OneRoster v.1 endpoint: 

`http:/localhost:3000/learningdata/v1`

The OneRoster v1.0 specification can be found here:

https://www.imsglobal.org/lis/imsOneRosterv1p0/imsOneRosterCSV-v1p0.html
