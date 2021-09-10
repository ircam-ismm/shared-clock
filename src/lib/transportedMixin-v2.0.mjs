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

export class TransportEventQueue {
  constructor() {
    this._queue = [];
    this._last = null;
    this._current = null;
  }

  get last() {
    return this._last;
  }

  get current() {
    return this._current;
  }

  get next() {
    return this._queue[0];
  }

  /**
   * @param {Object} event
   * @return {Object|null} event or null if discarded
   */
  add(event) {
    const current = this.current;

    // cannot schedule event in the past
    if (current && current.time >= event.time) {
      console.error(`[transportMixin] cannot schedule event in the past, aborting...`);
      return null;
    }

    // @note - disallow stop and pause if first in queue

    this._queue.push(event);
    this._queue.sort((a, b) => a.time <= b.time ? -1 : 1);

    // filter added events according to follofinw rules
    // - if start -> allow pause, stop, seek
    // - if pause -> allow start, stop, seek
    // - if stop -> allow start, seek (but maybe allowing pause with current behavior is interesting too)
    let eventType = null;

    if (this.current) {
      eventType = current.type;
    }

    this._queue = this._queue.filter((event, i) => {
      if (event.type === 'seek') {
        return true;
      } else if (event.type !== eventType) {
        eventType = event.type
        return true;
      } else {
        return false;
      }
    });

    // recompute positions, and speeds of every events in the queue
    let time = (this.current && this.current.time) || 0;
    let position = (this.current && this.current.position) || 0;
    let speed = (this.current && this.current.speed) || 0;

    this._queue.forEach((event, i) => {
      switch (event.type) {
        case 'start':
        case 'pause':
        // case 'stop':
          event.position = position + (event.time - time) * speed;
          break;
        case 'seek':
          event.speed = speed;
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
    const current = this._queue.shift();
    this._last = this._current;
    this._current = current;
    console.log('dequeue', this.last, this.current, this._queue);
    return this.current;
  }

  getSpeedAtTime(time) {
    const events = [this.last, this.current, ...this._queue].filter(e => e !== null);
    let targetEvent;

    if (events.length === 0) {
      return Infinity;
    }

    for (let i = 0; i < events.length; i++) {
      if (i === 0 && time < events[i].time) {
        return Infinity;
      } else if (i === events.length - 1) {
        targetEvent = events[i];
        break;
      } else if (time >= events[i].time && time < events[i + 1].time) {
        targetEvent = events[i];
        break;
      }
    }

    return targetEvent.speed;
  }

  getPositionAtTime(time) {
    const events = [this.last, this.current, ...this._queue].filter(e => e !== null);
    let targetEvent;

    if (events.length === 0) {
      return Infinity;
    }

    for (let i = 0; i < events.length; i++) {
      if (i === 0 && time < events[i].time) {
        return Infinity;
      } else if (i === events.length - 1) {
        targetEvent = events[i];
        break;
      } else if (time >= events[i].time && time < events[i + 1].time) {
        targetEvent = events[i];
        break;
      }
    }

    return targetEvent.position + (time - targetEvent.time) * targetEvent.speed;
  }

  getTimeAtPosition(position) {
    const events = [this.last, this.current, ...this._queue].filter(e => e !== null);
    let targetEvent;

    if (events.length === 0) {
      return Infinity;
    }

    for (let i = 0; i < events.length; i++) {
      if (i === 0 && position < events[i].position) {
        return Infinity;
      } else if (i === events.length - 1) {
        targetEvent = events[i];
        break;
      } else if (position >= events[i].position && position < events[i + 1].position) {
        targetEvent = events[i];
        break;
      }
    }

    return targetEvent.time + (position - targetEvent.position) * targetEvent.speed;
  }
}



const transportedMixin = obj => {
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

      const res = this.addTransportEvent(event);
      return res;
    },

    // for `pause` and `stop` events, we must define `position` as late as
    // possible to be sure to get the lastest availalble timing informations`
    pause(time) {
      const event = {
        type: 'pause',
        time: round(time),
        speed: 0,
        // position is defined by previous event
      };

      return this.addTransportEvent(event);
    },

    stop(time) {
      const event = {
        type: 'stop',
        time: round(time),
        speed: 0,
        position: 0, // this is actually the difference with pause, let's assume it
        // position is defined by previous event
      };

      return this.addTransportEvent(event);
    },

    seek(time, position) {
      const event = {
        type: 'seek',
        time: round(time),
        position: position,
        // speed is defined by previous event
      }

      return this.addTransportEvent(event);
    },

    // expose to enable sharing of raw events on the network
    addTransportEvent(event) {
      this._eventQueue.add(event);

      const nextEvent = this._eventQueue.next;
      console.log(nextEvent, this._queue);

      if (
        (!this.queueTime && nextEvent) ||
        (nextEvent && nextEvent.time < this.queueTime)
      ) {
        console.log(this.master, nextEvent);
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
      // // handle case where the engine as been added to scheduler with default
      // // values and starts before any start event as been registered
      if (!this._eventQueue.current) {
        if (!this._eventQueue.next) {
          return Infinity;
        } else if (currentTime < this._eventQueue.next.time) {
          return this._eventQueue.next.time;
        }
      }


      // we need to compute position from the last know event position
      // at this point, if we have a 'pause' or a 'stop' event we can't define
      // the position
      const currentPosition = this.getPositionAtTime(currentTime, true);

      // we are in a transport event here
      // dispatch event and return early if needed
      if (this._eventQueue.next && currentTime === this._eventQueue.next.time) {
        const event = this._eventQueue.dequeue();

        switch (event.type) {
          // 'start' and 'seek have been dequeued before'
          case 'start':
            if (this.onStart) {
              this.onStart(currentPosition, audioTime, dt);
            }
            break;
          case 'seek':
            if (this.onSeek) {
              this.onSeek(currentPosition, audioTime, dt);
            }

            break;
          case 'pause':
            if (this.onPause) {
              this.onPause(currentPosition, audioTime, dt);
            }
            break;
          case 'stop':
            if (this.onStop) {
              this.onStop(currentPosition, audioTime, dt);
            }
            break;
        }

        if (event.speed === 0) {
          if (this._eventQueue.next) {
            return this._eventQueue.next.time;
          } else {
            return Infinity;
          }
        }
      }

      let nextPosition = null;

      // allow engines that dont implement advanceTime (i.e. simple audioBuffer wrapper)
      if (oldAdvanceTime) {
        nextPosition = oldAdvanceTime(currentPosition, audioTime, dt);
      }

      // we want to make sure the engine stays in the scheduler
      // for as long as it is transported
      // @note - test and make sure this is the desired behavior
      if (!Number.isFinite(nextPosition)) {
        nextPosition = Infinity;
      }

      const nextTime = this.getTimeAtPosition(nextPosition);

      // prevent Infinite loops
      if (currentTime === nextTime) {
        console.log(`nextTime ${nexttime} is equal to currentTime ${currentTime}, aborting`);
        return Infinity;
      }

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

export default transportedMixin;
