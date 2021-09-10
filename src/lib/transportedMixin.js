/**
 * note on terminology
 * - call `time` the timeline of the master
 * - call `position` the timeline of the engine
 */

/**
 * todos
 * -> review proper queue system
 * - 0 is last Event
 * - 1 is current event
 * - 2 is next Event
 *
 * -> should filter added events according to follofinw rules
 * - if start -> allow pause, stop, seek
 * - if pause -> allow start, stop, seek
 * - if stop -> allow start, seek (but maybe allowing pause with current behavior is interesting too)
 */


// @note - allow user defined events to be inserted in the cue
// use-case - update some metronome bpm
// --> maybe not the right to do that... to be tested with a real implementation
export class TransportEventQueue {
  constructor() {
    this._queue = [null, null]; // init last and current to null
  }

  get last() {
    return this._queue[0];
  }

  get current() {
    return this._queue[1];
  }

  get next() {
    return this._queue[2];
  }

  /**
   * @param {Object} event
   * @return {Object|null} event or null if discarded
   */
  add(event) {
    const current = this.current;

    // cannot schedule event in the past
    if (current && current.time > event.time) {
      console.error(`[transportMixin] cannot schedule event in the past, aborting...`);
      return null;
    }

    this._queue.push(event);
    this._queue.sort((a, b) => {
      if (a === null) {
        return -1;
      } if (b === null & a !== null) {
        return 1;
      } else {
        return a.time <= b.time ? -1 : 1;
      }
    });

    // remove consecutive events of same type (except seek)
    let eventType = null;

    if (this.current) {
      eventType = current.type;
    }

    this._queue = this._queue.filter((event, i) => {
      if (i < 2) { // never filter last and current
        return true;
      }

      if (event.type === 'seek') {
        return true;
      } else if (event.type !== eventType) {
        eventType = event.type
        return true;
      } else {
        return false;
      }
    });

    let origin;

    // @note - if this is the first element added (this.next) we use it as
    // reference instead of default values, allows to share computed events on
    // the network and keep the timeline consistency at any point
    if (this.current) {
      origin = this.current;
    } else if (this.next) {
      origin = this.next;
    }
    // recompute positions, and speeds of every next events in the queue
    let time = (origin && origin.time)|| 0;
    let position = (origin && origin.position) || 0;
    let speed = (origin && origin.speed) || 0;

    this._queue.forEach((event, i) => {
      if (i < 2) { // never override last and current positions
        return;
      }

      switch (event.type) {
        case 'start':
          if (event !== origin) {
            event.position = position + (event.time - time) * speed;
          } else if (event === origin && !origin.hasOwnProperty('position')) {
            event.position = 0;
          }

          event.speed = 1;
          break;
        case 'pause':
          if (event !== origin) {
            event.position = position + (event.time - time) * speed;
          } else if (event === origin && !origin.hasOwnProperty('position')) {
            event.position = 0;
          }

          event.speed = 0;
          break;
        case 'stop':
          event.position = 0;
          event.speed = 0;
          break;
        case 'seek':
          if (event !== origin) {
            event.speed = speed;
          } else if (event === origin && !origin.hasOwnProperty('speed')) {
            event.speed = 0;
          }
          break;
      }

      time = event.time;
      position = event.position;
      speed = event.speed;
    });

    // return event with best estimated values (position and speed) according
    // to current queued events or return null if event has been discarded
    // (i.e. scheduled in the past or filtered as duplicate)
    return this._queue.indexOf(event) !== -1 ? event : null;
  }

  dequeue() {
    this._queue.shift();
    // console.log('dequeue', this._queue);
    return this.current;
  }

  getSpeedAtTime(time) {
    let targetEvent = null;
    let firstEventIndex = 0;

    for (let i = 0; i < this._queue.length; i++) {
      if (this._queue[i] === null) { // bypass default last and current
         firstEventIndex = i + 1;
         continue;
      }

      // ignore default last and current events
      if (i === firstEventIndex && time < this._queue[i].time) { // first "real" event in queue
        return Infinity;
      } else if (i === this._queue.length - 1) {
        targetEvent = this._queue[i];
        break;
      } else if (time >= this._queue[i].time && time < this._queue[i + 1].time) {
        targetEvent = this._queue[i];
        break;
      }
    }

    if (targetEvent === null) {
      return Infinity;
    } else {
      return targetEvent.speed;
    }
  }

  getPositionAtTime(time) {
    let targetEvent = null;
    let firstEventIndex = 0;

    for (let i = 0; i < this._queue.length; i++) {
      if (this._queue[i] === null) { // bypass default last and current
         firstEventIndex = i + 1;
         continue;
      }

      // ignore default last and current events
      if (i === firstEventIndex && time < this._queue[i].time) { // only 1 "real" event in queue
        return Infinity;
      } else if (i === this._queue.length - 1) {
        targetEvent = this._queue[i];
        break;
      } else if (time >= this._queue[i].time && time < this._queue[i + 1].time) {
        targetEvent = this._queue[i];
        break;
      }
    }

    if (targetEvent === null) {
      return Infinity;
    } else {
      return targetEvent.position + (time - targetEvent.time) * targetEvent.speed;
    }
  }

  getTimeAtPosition(position) {
    let targetEvent = null;
    let firstEventIndex = 0;

    for (let i = 0; i < this._queue.length; i++) {
      if (this._queue[i] === null) { // bypass default last and current
         firstEventIndex = i + 1;
         continue;
      }

      // ignore default last and current events
      if (i === firstEventIndex && position < this._queue[i].position) { // first "real" event in queue
        return Infinity;
      } else if (i === this._queue.length - 1) {
        targetEvent = this._queue[i];
        break;
      } else if (position >= this._queue[i].position && position < this._queue[i + 1].position) {
        targetEvent = this._queue[i];
        break;
      }
    }

    if (targetEvent === null) {
      return Infinity;
    } else {
      // @note - this should be " / speed " if we allowed fractionnal speeds
      // but consider we don't need that for now
      return targetEvent.time + (position - targetEvent.position) * targetEvent.speed;
    }
  }
}

export const transportedMixin = obj => {
  // allow applying mixin on class definitions
  if (obj.prototype) {
    obj = obj.prototype;
  }

  const oldAdvanceTime = obj.advanceTime;

  // quantify at 1e-9 (this is very subsample accurante...)
  // minimize floating point weirdness
  function round(val) {
    val = Math.round(val * 1e9) * 1e-9;
    return parseFloat(val.toFixed(9));
  }

  const mixin = {
    _eventQueue: new TransportEventQueue(),

    start(time) {
      const event = {
        type: 'start',
        time: round(time),
        speed: 1,
      };

      return this.addTransportEvent(event);
    },

    // for `pause` and `stop` events, we must define `position` as late as
    // possible to be sure to get the lastest availalble timing informations`
    pause(time) {
      const event = {
        type: 'pause',
        time: round(time),
        speed: 0,
        // position is defined dynamically by queue
      };

      return this.addTransportEvent(event); // return computed event or null
    },

    stop(time) {
      const event = {
        type: 'stop',
        time: round(time),
        speed: 0,
        position: 0, // this is actually the difference with a pause event, let's assume that
      };

      return this.addTransportEvent(event); // return computed event or null
    },

    seek(time, position) {
      const event = {
        type: 'seek',
        time: round(time),
        position: position,
        // speed is defined dynamically by queue
      }

      return this.addTransportEvent(event); // return computed event or null
    },

    // expose to enable sharing of raw events on the network
    addTransportEvent(event) {
      this._eventQueue.add(event);

      const nextEvent = this._eventQueue.next;

      if (
        (!this.queueTime && nextEvent) ||
        (nextEvent && nextEvent.time < this.queueTime)
      ) {
        this.master.resetEngineTime(this, nextEvent.time);
      }
    },

    getSpeedAtTime(time) {
      return round(this._eventQueue.getSpeedAtTime(time));
    },

    getPositionAtTime(time, _internal = false) {
      return round(this._eventQueue.getPositionAtTime(time));
    },

    // @note - maybe should be private
    getTimeAtPosition(position) {
      return round(this._eventQueue.getTimeAtPosition(position));
    },

    advanceTime(currentTime, audioTime, dt) {
      // handle case where the engine as been added to scheduler with default
      // values and starts before any start event as been registered
      if (!this._eventQueue.current) {
        if (!this._eventQueue.next) {
          return Infinity;
        } else if (currentTime < this._eventQueue.next.time) {
          return this._eventQueue.next.time;
        }
      }

      const currentPosition = this.getPositionAtTime(currentTime, true);
      let nextPosition;

      // we are in a transport event: dispatch event and return early if needed
      if (this._eventQueue.next && currentTime === this._eventQueue.next.time) {
        const event = this._eventQueue.dequeue();

        if (this.onTransportEvent) {
          // allow engine to override it's next position
          nextPosition = this.onTransportEvent(event, currentPosition, audioTime, dt);
        }

        if (event.speed === 0) {
          if (this._eventQueue.next) {
            console.log(this._eventQueue.next.type, this._eventQueue.next.time)
            return this._eventQueue.next.time;
          } else {
            return Infinity;
          }
        }
      }

      // - if the `onTransportEvent` has already returned a nextPosition, we bypass this step
      // - engines that dont implement advanceTime (i.e. simple audioBuffer wrapper) is allowed
      if (!Number.isFinite(nextPosition) && oldAdvanceTime) {
        nextPosition = oldAdvanceTime(currentPosition, audioTime, dt);
      }

      // we want to make sure the engine stays in the scheduler for as long as
      // it is transported
      // @note - make sure this behavior doesn't have any weird side effects
      if (!Number.isFinite(nextPosition)) {
        nextPosition = Infinity;
      }

      const nextTime = this.getTimeAtPosition(nextPosition);

      if (this._eventQueue.next && this._eventQueue.next.time <= nextTime) {
        return this._eventQueue.next.time;
      } else {
        return nextTime;
      }
    },
  };

  // @todo - test every possible syntax to keep `this` safe
  return Object.assign(obj, mixin);
};
