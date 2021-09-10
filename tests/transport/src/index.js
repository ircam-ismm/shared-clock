import "core-js/stable";
import "regenerator-runtime/runtime";

import { Scheduler } from 'waves-masters';
import { render, html } from 'lit-html';

import '@ircam/simple-components/sc-toggle.js';
import '@ircam/simple-components/sc-button.js';
import '@ircam/simple-components/sc-text.js';
import '@ircam/simple-components/sc-number.js';

import { transportedMixin, TransportEventQueue } from '../../../src/lib/transportedMixin.js';

// const startTime = new Date().getTime();
// const getTimeFunction = () => (new Date().getTime() - startTime) / 1000;
// const scheduler = new Scheduler(getTimeFunction, {
//   currentTimeToAudioTimeFunction: currentTime => currentTime - 4,
// });

// class Engine {
//   onStart(currentTime, audioTime, dt) {
//     console.log('onStart (currentTime is equal to offset)', currentTime);
//   }
//   onPause(currentTime, audioTime, dt) {
//     console.log('onPause', currentTime);
//   }
//   onStop(currentTime, audioTime, dt) {
//     console.log('onStop', currentTime);
//   }
//   onSeek(currentTime, audioTime, dt) {
//     console.log('onSeek', currentTime);
//   }
//   // advanceTime(currentTime, audioTime, dt) {
//   //   // console.log('engine', currentTime, audioTime, dt);
//   //   return currentTime + 0.1;
//   // }
//   // resetTime(currentTime, audioTime, dt) {
//   //   console.log(currentTime, audioTime);
//   // }
// }

// transportedMixin(Engine);

const queue = new TransportEventQueue();
const events = [
  {
    type: 'start',
    time: 0,
  }, {
    type: 'stop',
    time: 2,
  }
];

const result = events.map(e => queue.add(e));

// we want to stop early
const res2 = queue.add({
  type: 'stop',
  time: 1,
})
// setTimeout(() => {

// }, 1000);
console.log(res2);

// // const engine = new Engine();

// const engine = transportedMixin({
//   // move to EventListener API
//   onTransportEvent(event, currentTime, audioTime, dt) {
//     console.log(event.type, currentTime);
//     // pause and stop will be bypassed anyway
//     return Math.ceil(currentTime);
//   },
//   advanceTime(currentTime, audioTime, dt) {
//     console.log('advanceTime', currentTime);
//     return currentTime + 1;
//   },
// });

// // scheduler.add(engine, Infinity);
// scheduler.add(engine);

// const now = getTimeFunction();

// // engine.seek(now, 1);
// // engine.start(now + 1); // start at 0
// // engine.seek(now + 2, 2);// jump at 2
// // engine.pause(now + 3); // pause at 3
// // engine.seek(now + 4, 2);// jump at 2
// // engine.start(now + 5); // restart at 2
// // engine.stop(now + 6); // stop at 3
// // // // engine.start(now + 3);        // restart at 0
// // // // // for now let concentrate on the "interactive" thing

// // // engine.stopAtPosition(3);

// // // parent.startEngine(engine, parentTime)
// // // parent.stopEngine(engine, parentTime)



// const $body = document.querySelector('body');
// let i = 0;

// (function renderGui() {
//   render(html`
//     <sc-button
//       value="start"
//       @input="${e => {
//         const now = getTimeFunction();
//         const startAt = now + 1;
//         engine.start(startAt);
//       }}"
//     ></sc-button>
//     <sc-button
//       value="pause"
//       @input="${e => {
//         const now = getTimeFunction();
//         const pauseAt = now + 1;
//         engine.pause(pauseAt);
//       }}"
//     ></sc-button>
//     <sc-button
//       value="stop"
//       @input="${e => {
//         const now = getTimeFunction();
//         const stopAt = now + 1;
//         engine.stop(stopAt);
//       }}"
//     ></sc-button>
//     <sc-number
//       @change="${e => {
//         const now = getTimeFunction();
//         const seekAt = now + 1;
//         engine.seek(seekAt, e.detail.value);
//       }}"
//     ></sc-number>
//     <sc-text
//       .value="${engine.getPositionAtTime(getTimeFunction())}"
//     ></sc-text>
//   `, $body);

//   i++;
//   requestAnimationFrame(renderGui);
// }());


