window.onload=function(){
    const element = document.querySelector("#container");

    element.addEventListener('wheel', (event) => {
        event.preventDefault();

        element.scrollBy({
            left: event.deltaY < 0 ? -70 : 70,
        
        });
    });
    for (let UIElement of UIElementsTypes) {
        var node = document.createElement("uielement-card")
        node.setAttribute("name", UIElement.name)
        node.setAttribute("type", UIElement.type)
        node.setAttribute("icon", `{{ site.baseurl }}/../assets/UIElements/${UIElement.src}`)
        node.setAttribute("id", UIElement.id)
        node.setAttribute("onclick", "selectUIElement(this.getAttribute('id'))")
        element.appendChild(node)
        if (UIElement.id == UIElementType) node.firstElementChild.classList.add("selected")
    }
    selectUIElement(0);
}

function selectUIElement(index) {
    // remove selected class
    document.querySelector(".selected").classList.remove("selected")

    // add selected class
    document.getElementById(`${index}`).firstElementChild.classList.add("selected");

    UIElementType = index
    inputedText = document.getElementById("input_text").value
    inputedText = (inputedText == "") ? "Input text..." : inputedText
    generateImage(inputedText)
}