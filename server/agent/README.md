
Agent
=========


Installation
------------

`npm install`

Edit `config-development(production).json` - based on NODE_ENV system variable

or

`cp config-development.json config.json` and override required properties


Setup listener
--------------

Set 
`db.url` URL for CouchDB/Cloudant where will be stored all data, 

`db.name` - copied from `local.config.json` file values `database_name`, `environment_name` (see below)
`task_generator.dump.path` path on the FS to the dump file. 
Should be the same as `agent.dumpPath` parameter in `agent.config.json` (see below)

`task_generator.source_db_urls` - app server db url(s)
`db.local_url` - URL for local CouchDB, that will be used for storing the agent information


To be sure hat all duplicated properties are valid please issue `node init`. 
It sets 
`db.name` (parent_app_config->agent/config) in `agent/config.json` file.
`agent.url` and `agent.dumpPath` in `./rootfolder/config/agent.config.json`
(agent/config->parent_app_config.agent) properties.


Clearing databases and related content (development phase only!)
--------------------------------------

To clean up all agent-related content please create a document in `_ext_task` DB
```
{
   "_id": "clean_123",
   "type": "external",
   "data": {
       "type": "dev-clean"
   }
}
```

Run
----
`node index`