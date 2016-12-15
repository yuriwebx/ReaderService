"use strict";

// require('./lib/log.js');

const Agent = require('./lib/agent');
const agent = new Agent();

startAgent();

function startAgent(){
    // TODO start in separate process
    return agent.start()
        .catch(e=>{
            console.error(e);
            console.error(e.stack);
        });
}


