class UIElementCard extends HTMLElement {
    constructor() {
      super();
  
      this.name = "";
      this.type = "";
      this.icon = "";
    }
  
    connectedCallback() {
      this.name = this.getAttribute("name");
      this.type = this.getAttribute("type");
      this.icon = this.getAttribute("icon");

      this.render();
    }
  
    render() {
      this.innerHTML = `
        <div class="UIElement-card">
          <h1>${this.name}</h1>
          <p>${this.type}</p>
          <img src="${this.icon}">
        </div>
        `;
    }
  }
  
  customElements.define("uielement-card", UIElementCard);