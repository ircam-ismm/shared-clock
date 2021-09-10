export default {
  command: {
    type: 'string', // 'start', 'stop', 'pause'
    default: 'stop',
    filterChange: false, // we want to be able to seek as many time as we want
  },
  seekPosition: {
    type: 'float',
    default: 0,
    filterChange: false,
  },
  clockEvent: {
    type: 'any',
    default: null,
    nullable: true,
  },
  enablePreRoll: {
    type: 'boolean',
    default: false,
  },
  preRollDuration: {
    type: 'float',
    default: 10,
    min: 0,
  },
  preRollEvents: {
    type: 'any',
    default: null,
    nullable: true,
  },
};
