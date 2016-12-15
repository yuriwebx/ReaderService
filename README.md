Readme
=====

Run app
==========

Both [server](#server) and [agent](#agent) must be running.
Place book data in `data` folder

Server
------
* create `config/local.config.json` 
* for the first run: `node server/init -v`
* `node server/index -v`

Agent
-----
* create `server/agent/config.json` based on `server/agent/config-example.json`
* `node server/agent/index`





Build
=====

Build application server
------------------------
* `cd build`
* `grunt` (might take up to 5-10 minutes)
* `mv out/* ./` 

Build docker containers
-----------------------
* `docker-compose build`

Run production environment
--------------------------
* `NODE_ENV=production  node server/index -v`

