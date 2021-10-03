import { AbstractExperience } from '@soundworks/core/client';
import { render, html, nothing } from 'lit-html';
import renderInitializationScreens from '@soundworks/template-helpers/client/render-initialization-screens.js';

import { Scheduler } from 'waves-masters';
import { transportedMixin } from '../../lib/transportedMixin.js';

import '@ircam/simple-components/sc-text.js';
import '@ircam/simple-components/sc-button.js';
import '@ircam/simple-components/sc-number.js';
import '@ircam/simple-components/sc-toggle.js';
import '@ircam/simple-components/sc-bang.js';
import '../lib/sc-clock.js';

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
    this.clock = transportedMixin({});
    this.scheduler.add(this.clock);

    this.preRoll = transportedMixin({});
    this.scheduler.add(this.preRoll);

    this.transport = await this.client.stateManager.attach('transport');
    this.transport.subscribe(updates => {
      this.render();
      this.updateEngine();
    });
    this.updateEngine();

    window.addEventListener('resize', () => this.render());
    this.render();
  }

  updateEngine(updates) {
    const { clockEvent, preRollEvents } = this.transport.getValues();

    if (clockEvent !== null) {
      this.clock.addTransportEvent(clockEvent);

      if (clockEvent.type === 'start' && preRollEvents !== null) {
        preRollEvents.forEach(e => this.preRoll.addTransportEvent(e));
      }
    }
  }

  render() {
    const width = Math.min(window.innerWidth - 40, 614); // padding

    render(html`
      <div style="padding: 20px">
        <div>
          <sc-clock
            style="margin: 4px auto; display: block; width: ${width}px; /* this is needed for centering */"
            .getTimeFunction="${() => {
              const now = this.sync.getSyncTime();
              const preRollPosition = this.preRoll.getPositionAtTime(now);
              const preRollDuration = this.transport.get('preRollDuration');
              return (preRollPosition !== 0 && preRollPosition !== Infinity) ?
                -(preRollDuration - preRollPosition + 1) : 0
            }}"
            font-size="20"
            twinkle="[0, 0.5]"
            width="${width}"
          ></sc-clock>
          <sc-clock
            style="margin: 4px auto; display: block; width: ${width}px; /* this is needed for centering */"
            .getTimeFunction="${() => {
              const now = this.sync.getSyncTime();
              return this.clock.getPositionAtTime(now);
            }}"
            font-size="20"
            twinkle="[0.5, 1]"
            width="${width}"
          ></sc-clock>
        </div>

        ${this.hasControls ?
          html`
            <div style="width: ${width}px; margin: 50px auto 0;">
              <div style="padding: 4px 0;">
                <sc-button
                  style="margin-bottom: 4px"
                  value="start"
                  @input="${e => this.transport.set({ command: 'start' })}"
                ></sc-button>
                <sc-button
                  style="margin-bottom: 4px"
                  value="pause"
                  @input="${e => this.transport.set({ command: 'pause' })}"
                ></sc-button>
                <sc-button
                  style="margin-bottom: 4px"
                  value="stop"
                  @input="${e => this.transport.set({ command: 'stop' })}"
                ></sc-button>
              </div>
              <!-- <hr /> -->
              <div style="padding: 4px 0;">
                <sc-text
                  readonly
                  value="seek"
                ></sc-text>
                <sc-number
                  value="${this.transport.get('seekPosition')}"
                  @change="${e => this.transport.set({
                    command: 'seek',
                    seekPosition: e.detail.value,
                  })}"
                ></sc-number>
                <sc-bang
                  @input="${e => this.transport.set({ command: 'seek' })}"
                ></sc-bang>
              </div>
              <!-- <hr /> -->
              <div style="padding-top: 4px 0;">
                <sc-text
                  readonly
                  value="pre-roll"
                ></sc-text>
                <sc-toggle
                  .value="${this.transport.get('enablePreRoll')}"
                  @change="${e => this.transport.set({ enablePreRoll: e.detail.value })}"
                ></sc-toggle>
                <sc-number
                  value="${this.transport.get('preRollDuration')}"
                  @change="${e => this.transport.set({ preRollDuration: e.detail.value })}"
                ></sc-number>
              </div>
            </div>
          ` : nothing
        }
      </div>
    `, this.$container);
  }
}

export default PlayerExperience;
