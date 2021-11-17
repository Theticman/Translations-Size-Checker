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
        <div class="UIElement_card">
          <h1 class="card_name">${this.name}</h1>
          <h3 class="card_type">${this.type}</h3>
          <img src="${this.icon}" class="card_img">
        </div>
        `;
    }
  }
  
  customElements.define("uielement-card", UIElementCard);