import 'source-map-support/register';
import { Server } from '@soundworks/core/server';
import path from 'path';
import serveStatic from 'serve-static';
import compile from 'template-literal';

import pluginSyncFactory from '@soundworks/plugin-sync/server';

import PlayerExperience from './PlayerExperience.js';
import ControllerExperience from './ControllerExperience.js';

import { TransportEventQueue } from '../lib/transportedMixin.js';

import transport from './schemas/transport.js';

import getConfig from '../utils/getConfig.js';
const ENV = process.env.ENV || 'default';
const config = getConfig(ENV);
const server = new Server();

// html template and static files (in most case, this should not be modified)
server.templateEngine = { compile };
server.templateDirectory = path.join('.build', 'server', 'tmpl');
server.router.use(serveStatic('public'));
server.router.use('build', serveStatic(path.join('.build', 'public')));
server.router.use('vendors', serveStatic(path.join('.vendors', 'public')));

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${ENV}" environment
- [pid: ${process.pid}]
--------------------------------------------------------
`);

// -------------------------------------------------------------------
// register plugins
// -------------------------------------------------------------------
server.pluginManager.register('sync', pluginSyncFactory, {}, []);

// -------------------------------------------------------------------
// register schemas
// -------------------------------------------------------------------
server.stateManager.registerSchema('transport', transport);


(async function launch() {
  try {
    await server.init(config, (clientType, config, httpRequest) => {
      return {
        clientType: clientType,
        app: {
          name: config.app.name,
          author: config.app.author,
        },
        env: {
          type: config.env.type,
          websockets: config.env.websockets,
          subpath: config.env.subpath,
        }
      };
    });

    const transport = await server.stateManager.create('transport');
    const sync = server.pluginManager.get('sync');
    const clockEventQueue = new TransportEventQueue();
    const preRollEventQueue = new TransportEventQueue();

    server.stateManager.registerUpdateHook('transport', (updates, currentValues) => {
      if (updates.command) {
        const { command } = updates;
        const { enablePreRoll, preRollDuration } = currentValues;
        const applyAt = sync.getSyncTime() + 0.1;

        const event = {
          type: command,
          time: applyAt,
        };

        if (command === 'start') {
          if (enablePreRoll) {
            event.time += preRollDuration;
          }
        } else if (command === 'seek') {
          event.position = updates.seekPosition || currentValues.seekPosition;
        }

        const computedEvent = clockEventQueue.add(event);
        // we really don't want to store null events as it breaks clients on reload
        if (computedEvent !== null) {
          updates.clockEvent = computedEvent;
        }

        if (computedEvent !== null && enablePreRoll && command === 'start') {
          const events = [
            {
              type: 'start',
              time: applyAt,
            }, {
              type: 'stop',
              time: applyAt + preRollDuration,
            }
          ];

          updates.preRollEvents = events.map(e => preRollEventQueue.add(e));
        } else {
          updates.preRollEvents = null;
        }

      }

      return updates;
    });


    const playerExperience = new PlayerExperience(server, 'player');
    const controllerExperience = new ControllerExperience(server, 'controller');

    // start all the things
    await server.start();
    playerExperience.start();
    controllerExperience.start();

  } catch (err) {
    console.error(err.stack);
  }
})();

process.on('unhandledRejection', (reason, p) => {
  console.log('> Unhandled Promise Rejection');
  console.log(reason);
});
