import { assert } from 'chai';
import { TransportEventQueue } from '../src/lib/transportedMixin.js';

// @todo - review, things changed in between...

describe('TransportEventQueue.enqeueEvent(event)', () => {
  it.only(`test weirdness`, () => {
    const queue = new TransportEventQueue();
    const events = [
      {
        type: 'start',
        time: 0,
        speed: 1,
      }, {
        type: 'stop',
        time: 2,
        speed: 1,
      }
    ];

    const result = events.map(e => preRollEventQueue.add(e));
    console.log(result);
  })

  it('should filter similar consecutive events', () => {
    const queue = new TransportEventQueue();
    const events = ['start', 'start', 'seek', 'seek', 'pause', 'stop', 'stop', 'seek', 'pause', 'pause', 'start', 'stop', 'stop'];
    const expected = ['start', 'seek', 'seek', 'pause', 'stop', 'seek', 'pause', 'start', 'stop'];

    events.forEach((type, i) => {
      queue.add({
        type,
        time: i,
      });
    });

    console.log(queue._queue.map(e => e.type));
    assert.deepEqual(queue._queue.map(e => e.type), expected);
  });

  it('should recompute positions and speeds', () => {
    const queue = new TransportEventQueue();

    queue.add({
      type: 'start',
      time: 0,
      position: 0,
      speed: 1,
    });

    queue.add({
      type: 'stop',
      time: 2,
      speed: 0, // should have position set to 1
    });

    queue.add({
      type: 'pause',
      time: 4,
      speed: 0, // should have position set to 1
    });

    assert.deepEqual(queue._queue[1], {
      type: 'stop',
      time: 2,
      speed: 0, // should have position set to 1
      position: 2,
    });

    assert.deepEqual(queue._queue[2], {
      type: 'pause',
      time: 4,
      speed: 0,
      position: 2,
    });

    // --------------------------------------------------------
    // insert a seek to 2 at 1 sec
    // --------------------------------------------------------
    queue.add({
      type: 'seek',
      time: 1,
      position: 2,
    });

    console.log(queue._queue);

    assert.deepEqual(queue._queue[1], { // should be seek
      type: 'seek',
      time: 1,
      speed: 1, // should have position set to 1
      position: 2,
    });

    assert.deepEqual(queue._queue[2], { // should be stop
      type: 'stop',
      time: 2,
      speed: 0,
      position: 3,
    });

    assert.deepEqual(queue._queue[3], { // should be pause
      type: 'pause',
      time: 4,
      speed: 0,
      position: 3,
    });

    // --------------------------------------------------------
    // insert a seek to 42 at 3 sec
    // --------------------------------------------------------
    queue.add({
      type: 'seek',
      time: 3,
      position: 42,
    });

    console.log(queue._queue);

    assert.deepEqual(queue._queue[1], { // should be seek
      type: 'seek',
      time: 1,
      speed: 1, // should have position set to 1
      position: 2,
    });

    assert.deepEqual(queue._queue[2], { // should be stop
      type: 'stop',
      time: 2,
      speed: 0,
      position: 3,
    });

    assert.deepEqual(queue._queue[3], { // should be stop
      type: 'seek',
      time: 3,
      speed: 0,
      position: 42,
    });

    assert.deepEqual(queue._queue[4], { // should be pause
      type: 'pause',
      time: 4,
      speed: 0,
      position: 42,
    });
  });

  it('should return event with proper estimation or null if discarded', () => {
    const queue = new TransportEventQueue();

    queue.add({
      type: 'start',
      time: 0,
      position: 0,
      speed: 1,
    });

    const res1 = queue.add({
      type: 'stop',
      time: 2,
      speed: 0, // should have position set to 1
    });

    // console.log(res1);
    assert.deepEqual(res1, { // should be stop
      type: 'stop',
      time: 2,
      speed: 0,
      position: 2,
    });

    const res2 = queue.add({
      type: 'stop',
      time: 4,
      speed: 0, // should have position set to 1
    });

    // console.log(res2);
    assert.equal(res2, null);
  });
});
