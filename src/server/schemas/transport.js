export default {
  command: {
    type: 'string', // 'start', 'stop', 'pause'
    default: 'stop',
    filterChange: false, // we want to be able to seek as many time as we want
  },
  startPreRoll: {
    type: 'float',
    default: -10,
  },
  seekPosition: {
    type: 'float',
    default: 0,
    filterChange: false,
  },
  transportEvent: {
    type: 'any',
    default: null,
    nullable: true,
  },
};
