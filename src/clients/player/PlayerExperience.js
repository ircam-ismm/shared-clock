import { AbstractExperience } from '@soundworks/core/client';
import { render, html, nothing } from 'lit-html';
import renderInitializationScreens from '@soundworks/template-helpers/client/render-initialization-screens.js';

import { Scheduler } from 'waves-masters';
import { transportedMixin } from '../../lib/transportedMixin.js';

import '@ircam/simple-components/sc-text.js';
import '@ircam/simple-components/sc-button.js';
import '@ircam/simple-components/sc-number.js';

class PlayerExperience extends AbstractExperience {
  constructor(client, config, $container) {
    super(client);

    this.config = config;
    this.$container = $container;
    this.rafId = null;

    this.hasControls = window.location.hash.replace(/^#/, '') === 'controller';

    this.sync = this.require('sync');

    renderInitializationScreens(client, config, $container);
  }

  async start() {
    super.start();

    this.scheduler = new Scheduler(() => this.sync.getSyncTime());
    this.engine = transportedMixin({
      onStart(currentTime) { console.log('onStart', currentTime); },
      onPause(currentTime) { console.log('onPause', currentTime); },
      onStop(currentTime) { console.log('onStop', currentTime); },
      onSeek(currentTime) { console.log('onSeek', currentTime); },
    });
    this.scheduler.add(this.engine);

    this.transport = await this.client.stateManager.attach('transport');
    this.transport.subscribe(updates => {
      if ('command' in updates) {
        this.updateEngine();
      }
    });
    this.updateEngine();

    window.addEventListener('resize', () => this.render());
    this.render();
  }

  updateEngine(updates) {
    const { transportEvent } = this.transport.getValues();

    if (transportEvent !== null) {
      this.engine.addTransportEvent(transportEvent);
    }
  }

  render() {
    // debounce with requestAnimationFrame
    window.cancelAnimationFrame(this.rafId);

    this.rafId = window.requestAnimationFrame(() => {
      const now = this.sync.getSyncTime();
      const position = this.engine.getPositionAtTime(now);

      render(html`
        <div style="padding: 20px">
          <sc-text
            readonly
            value="${position}"
          ></sc-text>

          ${this.hasControls ?
            html`
              <div style="padding-top: 4px;">
                <sc-button
                  value="start"
                  @input="${e => this.transport.set({ command: 'start' })}"
                ></sc-button>
                <sc-button
                  value="pause"
                  @input="${e => this.transport.set({ command: 'pause' })}"
                ></sc-button>
                <sc-button
                  value="stop"
                  @input="${e => this.transport.set({ command: 'stop' })}"
                ></sc-button>
              </div>
              <div style="padding-top: 4px;">
                <sc-number
                  value="${this.transport.get('seekPosition')}"
                ></sc-number>
                <sc-button
                  value="seek"
                  @input="${e => {
                    console.log(e);
                    const seekPosition= e.target.previousElementSibling.value;
                    this.transport.set({
                      command: 'seek',
                      seekPosition: seekPosition,
                    });
                  }}"
                ></sc-button>
              </div>
              <!--
              <div style="padding-top: 4px;">
                <sc-text
                  readonly
                  value="start pre-roll (this is ignored for now, need to handle that properly)"
                ></sc-text>
                <sc-number
                  value="${this.transport.get('startPreRoll')}"
                  @input="${e => this.transport.set({ startPreRoll: e.detail.value })}"
                ></sc-number>
              </div>
              -->
            ` : nothing
          }
        </div>
      `, this.$container);

      this.render();
    });
  }
}

export default PlayerExperience;
