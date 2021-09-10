// @note - to be integrated in sc-components when nice

import { LitElement, css, html, svg } from 'lit-element';


function padLeft(value, char, length) {
  value = value + ''; // cast to string

  while (value.length < length)
    value = char + value;

  return value;
}

function getFormattedTimeInfos(time) {   // [-][hh:]mm:ss
    let sign;
    let timeInSeconds;

    if (time >= 0) {
      sign = '';
      timeInSeconds = Math.abs(Math.floor(time));
    } else {
      sign = '-';
      timeInSeconds = Math.abs(Math.ceil(time));
    }

    const hours = padLeft(Math.floor(timeInSeconds / 3600), '0', 2);
    const minutes = padLeft(Math.floor((timeInSeconds - (hours * 3600)) / 60), '0', 2);
    const seconds = padLeft(timeInSeconds - (hours * 3600) - (minutes * 60), '0', 2);
    const secFrac = Math.abs(time) - timeInSeconds; // fractional seconds (not used)
    const milliseconds = padLeft(Math.floor(secFrac * 1000), '0', 3);

    return { hours, minutes, seconds, milliseconds };
}

class ScClock extends LitElement {
  static get properties() {
    return {
      getTimeFunction: {},
      fontSize: { type: Number, attribute: 'font-size' },
      width: { type: Number },
      height: { type: Number },
      twinkle: { type: Array },
    }
  }
  static get styles() {
    return css`
      :host {
        vertical-align: top;
        display: inline-block;
        box-sizing: border-box;
        vertical-align: top;
        font-size: 0;
      }

      div {
        vertical-align: middle;
        text-align: center;
        box-sizing: border-box;
        background-color: rgb(106, 106, 105);
        border: 1px solid rgb(106, 106, 105);
        color: white;
        font-family: Consolas, monaco, monospace;
        border-radius: 2px;
        line-height: 16px;
        resize: none;
      }
    `;
  }

  constructor() {
    super();

    this.getTimeFunction = () => Date.now() / 1000;
    this.width = 400;
    this.height = 50;
    this.fontSize = 13;
    this.twinkle = null;
  }

  render() {
    const now = this.getTimeFunction();
    const time = Number.isFinite(now) ? now : 0;
    const { hours, minutes, seconds, milliseconds } = getFormattedTimeInfos(time);

    const millis = parseInt(milliseconds);

    let visibility = 'visible';
    if (this.twinkle && millis >= this.twinkle[0] && millis < this.twinkle[1]) {
      visibility = 'hidden';
    }
    // 0 is always visible (weird on stop)
    if (millis === 0) {
      visibility = 'visible';
    }

    const opacity = time === 0 ? 0.3 : 1;

    // the html comments are weird, but prevent the browser to display spaces
    // between the <span>
    return html`
      <div style="
        width: ${this.width}px;
        height: ${this.height}px;
        line-height: ${this.height}px;
        font-size: ${this.fontSize}px;
        opacity: ${opacity};
      ">
           <span>${hours}</span><!--
        --><span style="visibility: ${visibility};">:</span><!--
        --><span>${minutes}</span><!--
        --><span style="visibility: ${visibility};">:</span><!--
        --><span>${seconds}</span><!--
        --><span style="visibility: ${visibility};">:</span><!--
        --><span>${milliseconds}</span>
      </div>
    `
  }

  _render() {
    this.requestUpdate();
    this._rafId = requestAnimationFrame(() => this._render());
  }

  connectedCallback() {
    console.log(this.twinkle);
    super.connectedCallback();
    this._render();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._timeoutInterval);
    super.disconnectedCallback();
  }

}

customElements.define('sc-clock', ScClock);

