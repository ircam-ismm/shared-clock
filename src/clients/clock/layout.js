import { LitElement, html, render, css } from 'lit';

import '../components/sw-audit.js';

/**
 * This layout is provided for convenience, feel free to edit or even
 * remove it if you want to use you own logic.
 *
 * @example
 * const $layout = createLayout(client, $container);
 * const myComponent = {
 *   render() {
 *     return html`<h1>${Math.random()}</h1>`
 *   },
 * };
 * $layout.addComponent(myComponent);
 * setInterval(() => $layout.requestUpdate(), 1000);
 */
class ControllerLayout extends LitElement {
  constructor() {
    super();

    this.client = null;
    this._components = new Set();
  }

  // no shadow DOM
  createRenderRoot() {
    return this;
  }

  // comp can be either a string or is anything that have a `render` method
  addComponent(comp) {
    this._components.add(comp);
    this.requestUpdate();
  }

  deleteComponent(comp) {
    this._components.delete(comp);
    this.requestUpdate();
  }

  render() {
    return html`
      <header>
        <h1>${this.client.config.app.name} | ${this.client.role}</h1>
        <sw-audit .client="${this.client}"></sw-audit>
      </header>
      <div>
        ${Array.from(this._components).map(comp => comp.render ? comp.render() : comp)}
      </div>
    `;
  }
}

customElements.define('controller-layout', ControllerLayout);

export default function createLayout(client, $container) {
  const layoutId = `${client.role}-${client.id}`;

  render(html`
    <controller-layout
      .client=${client}
      id="${layoutId}"
    ></controller-layout>
  `, $container);

  const $layout = document.querySelector(`#${layoutId}`);

  return $layout;
}


