import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import launcher from '@soundworks/helpers/launcher.js';
import { html, nothing } from 'lit';

import { Scheduler, Transport } from '@ircam/sc-scheduling';
import pluginSync from '@soundworks/plugin-sync/client.js';

import createLayout from './layout.js';

import '@ircam/sc-components/sc-bang.js';
import '@ircam/sc-components/sc-button.js';
import '@ircam/sc-components/sc-clock.js';
import '@ircam/sc-components/sc-number.js';
import '@ircam/sc-components/sc-text.js';
import '@ircam/sc-components/sc-toggle.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const config = window.SOUNDWORKS_CONFIG;
let showControls = window.location.hash === '#controller';

async function main($container) {
  const client = new Client(config);

  client.pluginManager.register('sync', pluginSync);

  launcher.register(client, {
    initScreensContainer: $container,
    reloadOnVisibilityChange: true,
    // if the server crashes during a concert we want the clients to continue to live
    reloadOnSocketError: config.env.type === 'production' ? false : true,
  });

  await client.start();

  const sync = await client.pluginManager.get('sync');
  const transportState = await client.stateManager.attach('transport');

  const scheduler = new Scheduler(() => sync.getSyncTime());
  const clock = new Transport(scheduler);
  // init with the current transport state
  clock.setState(transportState.get('transportState'));

  const preRoll = new Transport(scheduler);

  transportState.onUpdate(updates => {
    for (let [key, value] of Object.entries(updates)) {
      switch (key) {
        case 'clockEvents': {
          if (value === null) {
            break;
          }

          clock.addEvents(updates.clockEvents);

          if (updates.preRollEvents) {
            preRoll.addEvents(updates.preRollEvents);
          }
          break;
        }
        case 'loopStart': {
          clock.loopStart = value;
          break;
        }
        case 'loopEnd': {
          clock.loopEnd = value;
          break;
        }
      }
    }

  }, true);

  const $layout = createLayout(client, $container);

  $layout.addComponent({
    render() {
      return html`
        <div>
          <sc-clock
            .getTimeFunction=${() => preRoll.getPositionAtTime(sync.getSyncTime())}
            format="hh:mm:ss"
            ?twinkle=${false}
          ></sc-clock>
          <sc-clock
            .getTimeFunction=${() => clock.getPositionAtTime(sync.getSyncTime())}
            format="hh:mm:ss"
            ?twinkle=${false}
          ></sc-clock>
        </div>

        <div class="controls">
          <sc-text readonly>show controls</sc-text>
          <sc-toggle
            ?active=${showControls}
            @change=${e => {
              showControls = !showControls;
              $layout.requestUpdate();
            }}
          ></sc-toggle>
        </div>

        ${showControls ?
          html`
            <div class="controls">
              <div class="play-stop-controls">
                <sc-button @input=${e => transportState.set({ command: 'start' })}>start</sc-button>
                <sc-button @input=${e => transportState.set({ command: 'pause' })}>pause</sc-button>
                <sc-button @input=${e => transportState.set({ command: 'stop' })}>stop</sc-button>
              </div>
              <!-- <hr /> -->
              <div>
                <sc-text readonly>seek</sc-text>
                <sc-number
                  value=${transportState.get('seekPosition')}
                  @change=${e => transportState.set({
                    command: 'seek',
                    seekPosition: e.detail.value,
                  })}
                ></sc-number>
                <sc-bang
                  @input=${e => transportState.set({ command: 'seek' })}
                ></sc-bang>
              </div>
              <!-- <hr /> -->
              <div>
                <sc-text readonly>pre-roll</sc-text>
                <sc-toggle
                  .value=${transportState.get('enablePreRoll')}
                  @change=${e => transportState.set({ enablePreRoll: e.detail.value })}
                ></sc-toggle>
                <sc-number
                  value=${transportState.get('preRollDuration')}
                  @change=${e => transportState.set({ preRollDuration: e.detail.value })}
                ></sc-number>
              </div>
              <div>
                <sc-text readonly>loop start</sc-text>
                <sc-number
                  value=${transportState.get('loopStart')}
                  @change=${e => transportState.set({ loopStart: e.detail.value })}
                ></sc-number>
              </div>
              <div>
                <sc-text readonly>loop end</sc-text>
                <sc-number
                  value=${transportState.get('loopEnd')}
                  @change=${e => transportState.set({ loopEnd: e.detail.value })}
                ></sc-number>
              </div>
              <div>
                <sc-text readonly>loop</sc-text>
                <sc-toggle
                  ?value="${transportState.get('loop')}"
                  @change="${e => transportState.set({
                    command: 'loop',
                    loop: e.detail.value
                  })}"
                ></sc-toggle>
              </div>
            </div>
          ` : nothing
        }
      `;
    }
  });
}

launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
  width: '50%',
});
