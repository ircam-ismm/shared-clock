/**
 * note on terminology
 * - call `time` the timeline of the master
 * - call `position` the timeline of the engine
 */

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
    _transportEventQueue: [], // event { type, time, position, speed }
    _currentTransportEvent: { // init with reasonnable values
      type: 'init',
      position: 0,
      time: 0,
      speed: 0,
    },
    _lastTransportEvent: null, // to properly compute position

    start(time, position = 0, duration = Infinity) {
      const event = {
        type: 'start',
        time: round(time),
        position: position,
        speed: 1,
      };

      this.enqueueTransportEvent(event);

      if (Number.isFinite(duration) && duration > 0) {
        this.stop(time + duration);
      }
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

      this.enqueueTransportEvent(event);
    },

    stop(time) {
      const event = {
        type: 'stop',
        time: round(time),
        speed: 0,
        // position is defined by previous event
      };

      this.enqueueTransportEvent(event);
    },

    seek(position, time) {
      const event = {
        type: 'seek',
        time: round(time),
        position: position,
        // speed is defined by previous event
      }

      this.enqueueTransportEvent(event);
    },

    // allow sharing raw events on the network
    enqueueTransportEvent(event) {
      const lastRegisteredEvent = this._transportEventQueue[this._transportEventQueue.lengt - 1];

      // ******************************************************************
      // @todo
      // This is probably not the right way to do that:
      // we should rather parse the sorted queue and filter consecutive event
      // according to the following rules (without considering seek events)
      // - if start -> allow pause, stop, seek
      // - if pause -> allow start, stop, seek
      // - if stop -> allow start, seek (but maybe allowing pause with current behavior is interesting too)
      //
      // @see - note in getPositionAtTime
      // ******************************************************************

      if (event.type !== 'seek') {
        if (lastRegisteredEvent && lastRegisteredEvent.type === event.type) {
          console.log('discard enqueue event', event);
          return;
        }

        // if nothing in queue, check _currentTransport event
        if (!lastRegisteredEvent && this._currentTransportEvent && this._currentTransportEvent.type === event.type) {
          console.log('discard enqueue event', event);
          return;
        }
      }

      this._transportEventQueue.push(event);
      this._transportEventQueue.sort((a, b) => a.time <= b.time ? -1 : 1);

      const nextEvent = this._transportEventQueue[0];

      if (!this.queueTime || nextEvent.time < this.queueTime) {
        this.master.resetEngineTime(this, nextEvent.time);
      }
    },

    _dequeueTransportEvent() {
      const nextTransportEvent = this._transportEventQueue.shift();
      this._lastTransportEvent = this._currentTransportEvent;
      this._currentTransportEvent = nextTransportEvent;
    },

    getSpeedAtTime(time) {

    },

    // @todo - should take event queue into account
    getPositionAtTime(time, _internal = false) {
      // @note - don't allow that for now, let's see if we need it...
      // if (time === null) {
      //   time = this.master.currentTime;
      // }

      let event = null;

      // we may have no `_currentTransportEvent` before first start
      if (this._currentTransportEvent) {
        if (time >= this._currentTransportEvent.time) {
          event = this._currentTransportEvent;
        } else {
          // getPositionAtTime is called from outside, in the scheduler lookhead
          event = this._lastTransportEvent;
        }
      }

      // @note  we don't want any Infinity values internally
      // e.g. if pause if called after stop, we retrieve the last known position
      if (!_internal) {
        if (!event || event.type === 'init' || event.type === 'stop') {
          return Infinity;
        }
      }

      // console.log(event, round(event.position + (time - event.time) * event.speed));
      // @todo - return Infinity if stopped
      return round(event.position + (time - event.time) * event.speed);
    },

    // @note - maybe should be private
    getTimeAtPosition(position) {
      // return NaN if event speed equals 0
      if (position === Infinity) {
        return Infinity;
      }

      let event = null;

      if (position >= this._currentTransportEvent.position) {
        event = this._currentTransportEvent;
      } else {
        event = this._lastTransportEvent;
      }

      // handle pause stuff
      return round(event.time + (position - event.position) * event.speed);
    },

    advanceTime(currentTime, audioTime, dt) {
      // handle start event
      const nextTransportEvent = this._transportEventQueue[0];

      // handle case where the engine as been added to scheduler with default
      // values and starts before any start event as been registered
      if (this._currentTransportEvent.type === 'init') {
        // we don't want to call this twice as event if we are in "real" event
        // time, nothing has been unqueued yet
        this._currentTransportEvent.type === 'inited';

        if (!nextTransportEvent) {
          return Infinity;
        } else if (currentTime < nextTransportEvent.time) {
          return nextTransportEvent.time;
        }
      }

      // if start event, we need to queue first to make sure `getPositionAtTime`
      // works properly
      if (nextTransportEvent && currentTime === nextTransportEvent.time) {
        const event = nextTransportEvent;

        switch (event.type) {
          case 'start':
            this._dequeueTransportEvent();

            // if after a pause or seek event, override event position with the last recorded one
            if (
              this._lastTransportEvent && (
                this._lastTransportEvent.type === 'pause' ||
                this._lastTransportEvent.type === 'seek'
              )
            ) {
              event.position = this._lastTransportEvent.position;
            }
            break;
          case 'seek':
            this._dequeueTransportEvent();
            // @note - this is not robust enough for real-world use cases
            // @todo - improve that
            event.speed = this._lastTransportEvent ?
              this._lastTransportEvent.speed : 0;
            break;
          // case 'pause':
          // case 'stop':
          //   // if no event have been trigerred before pause or stop
          //   // we create a fake one to not crash
          //   // @todo - clean that, this is ugly
          //   if (!this._currentTransportEvent) {
          //     this._currentTransportEvent = ;
          //   }
        }
      }
      // we need to compute position from the last know event position
      // at this point, if we have an 'pause' or a 'event we can't define
      // the position
      const currentPosition = this.getPositionAtTime(currentTime, true);

      // we are in a transport event here
      // dispatch event and return early if needed
      if (nextTransportEvent && currentTime === nextTransportEvent.time) {
        const event = nextTransportEvent;

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
            this._dequeueTransportEvent();
            // retrieve last known position
            event.position = currentPosition;

            if (this.onPause) {
              this.onPause(currentPosition, audioTime, dt);
            }

            if (this._transportEventQueue[0]) {
              return this._transportEventQueue[0].time;
            } else {
              return Infinity;
            }
            break;
          case 'stop':
            this._dequeueTransportEvent();
           // retrieve last known position
            event.position = currentPosition;

            if (this.onStop) {
              this.onStop(currentPosition, audioTime, dt);
            }

            // if we have some event in queue, reschedule at next event time
            if (this._transportEventQueue[0]) {
              return this._transportEventQueue[0].time;
            } else {
              // console.log('return infinity');
              return Infinity;
            }
            break;
          default:
            throw new TypeError(`Unknow event type: ${event.type}`)
            break;
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

      let nextEvent;

      // if next queued event is before the next to advanceTime
      if (this._transportEventQueue.length > 0) {
        nextEvent = this._transportEventQueue[0];
      }

      if (nextEvent && nextEvent.time <= nextTime) {
        return nextEvent.time;
      } else {
        return nextTime;
      }
    },
  };

  // @todo - test every possible syntax to keep `this` safe
  return Object.assign(obj, mixin);
};

export default transportedMixin;
