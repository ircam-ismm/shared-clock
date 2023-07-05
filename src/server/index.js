import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';

import { Scheduler, Transport } from '@ircam/sc-scheduling';
import pluginSync from '@soundworks/plugin-sync/server.js';

import { loadConfig } from '../utils/load-config.js';
import '../utils/catch-unhandled-errors.js';
import transportSchema from './schemas/transport.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const config = loadConfig(process.env.ENV, import.meta.url);

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
- [pid: ${process.pid}]
--------------------------------------------------------
`);

/**
 * Create the soundworks server
 */
const server = new Server(config);
// configure the server for usage within this application template
server.useDefaultApplicationTemplate();

/**
 * Register plugins and schemas
 */
server.pluginManager.register('sync', pluginSync);

server.stateManager.registerSchema('transport', transportSchema);

/**
 * Launch application (init plugins, http server, etc.)
 */
await server.start();

const sync = await server.pluginManager.get('sync');
const getTimeFunction = () => sync.getSyncTime();
const scheduler = new Scheduler(getTimeFunction);
const transport = new Transport(scheduler);

const transportState = await server.stateManager.create('transport', {
  transportState: transport.getState(),
});

const engine = {
  onTransportEvent(event, position, currentTime, dt) {
    const state = transport.getState();
    transportState.set({ transportState: state });

    return event.speed > 0 ? position : Infinity;
  },
  advanceTime(position, currentTime, dt) {
  //   console.log(position, currentTime, dt);
     return position + 0.25;
  }
};

transport.add(engine);

// apply events on
transportState.onUpdate(updates => {
  if (updates.clockEvents) {
    updates.clockEvents.map(event => transport.addEvent(event));
  }
});

server.stateManager.registerUpdateHook('transport', (updates, currentValues) => {
  if (updates.command) {
    const { command, mtcApplyAt } = updates;
    const { enablePreRoll, preRollDuration } = currentValues;

    let applyAt;

    // console.log(mtcApplyAt);
    if (mtcApplyAt === undefined) {
      applyAt = sync.getSyncTime() + 0.1;
    } else {
      applyAt = mtcApplyAt;
    }

    const clockEvents = [
      {
        type: 'cancel',
        time: applyAt,
      },
    ];

    switch (command) {
      case 'start':
        clockEvents.push({
          type: 'play',
          time: enablePreRoll ? applyAt + preRollDuration : applyAt,
        });
        break;
      case 'stop':
        clockEvents.push({
          type: 'pause',
          time: applyAt,
        });
        clockEvents.push({
          type: 'seek',
          time: applyAt,
          position: 0,
        });
        break;
      case 'pause':
        clockEvents.push({
          type: 'pause',
          time: applyAt,
        });
        break;
      case 'seek':
        clockEvents.push({
          type: 'seek',
          time: applyAt,
          position: updates.seekPosition || currentValues.seekPosition,
        });
        break;
      case 'loop':
        clockEvents.push({
          type: 'loop',
          time: applyAt,
          loop: updates.loop,
        });
        break;
    }

    const preRollEvents = [{
      type: 'cancel',
      time: applyAt,
    }];

    if (enablePreRoll && clockEvents.length > 0) {
      if (command === 'start') {
        preRollEvents.push({
          type: 'seek',
          time: applyAt,
          position: -1 * (preRollDuration + 1),
        })
        preRollEvents.push({
          type: 'play',
          time: applyAt,
        });
        preRollEvents.push({
          type: 'pause',
          time: applyAt + preRollDuration,
        });
        preRollEvents.push({
          type: 'seek',
          time: applyAt + preRollDuration,
          position: 0,
        });
      } else {
        // for seek, pause and stop, we want to stop the playroll now
        preRollEvents.push({
          type: 'pause',
          time: applyAt,
        });
        preRollEvents.push({
          type: 'seek',
          time: applyAt,
          position: 0,
        });
      }
    }

    return {
      ...updates,
      clockEvents,
      preRollEvents,
    };
  }
});
