// Generate Image
async function generateImage(stringTest) {
    let UIElement = Object.create(UIElementsTypes[UIElementType])
    UIElement.width *= 2
    UIElement.height *= 2

    const ctx = canvas.getContext('2d')
    canvas.width = UIElement.width + 50
    canvas.height = UIElement.height

    // Load UI element
    let UIImage = new Image()
    await new Promise((resolve) => {
        UIImage.onload = () => resolve()
        UIImage.src = `{{ site.baseurl }}/../assets/UIElements/${UIElement.src}`
    })

    // Convert characters to images
    renderParams = {
        font: font,
        // Bold (defaults to false)
        bold: !!UIElement.bold,
        // Shadow (defaults to true)
        shadow: "shadow" in UIElement ? UIElement.shadow : true,
        // Text color (defaults to white)
        color: "color" in UIElement ? UIElement.color : "#FFFFFF"
    }
    let { characters, textWidth } = await getImageFromText(stringTest, renderParams)

    // Place UI element
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(UIImage, canvas.width / 2 - UIElement.width / 2, canvas.height / 2 - UIElement.height / 2, UIElement.width, UIElement.height)

    // Setup origin point
    let cursor = { x: UIElement.originX + 25, y: UIElement.originY }
    if (UIElement.align == "center") cursor.x -= Math.floor(textWidth / 2)

    // Place character
    for (let character of characters) {
        ctx.drawImage(character.canvas, cursor.x, cursor.y - character.characterPara.ascent + 3, character.canvas.width * character.characterPara.scaleRatio, character.canvas.height * character.characterPara.scaleRatio)
        cursor.x += character.characterPara.width * character.characterPara.scaleRatio
    }

    // Underlined (defaults to false)
    if (!!UIElement.underlined) {
        ctx.fillStyle = UIElement.color
        ctx.fillRect(UIElement.originX + 25 - 2, cursor.y + 9, textWidth + 2, 2)
        ctx.fillStyle = "#3E3E3E"
        ctx.fillRect(UIElement.originX + 25, cursor.y + 11, textWidth + 2, 2)
    }

    // Copy to real canvas
    applyToCanvas()
}

function applyToCanvas() {
    var myCanvas = document.getElementById('canvas');

    myCanvas.width = canvas.width
    myCanvas.height = canvas.height

    // draw temp canvas back into myCanvas, scaled as needed
    myCanvas.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, myCanvas.width, myCanvas.height);
}

function generateInit() {
    let newInputedText = document.getElementById("input_text").value
    if (newInputedText == "") newInputedText = "Input text..."
    if (inputedText != newInputedText) {
        inputedText = newInputedText
        generateImage(newInputedText)
    }
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

function loadUIElement() {
    UIElementLoaded++
    if (UIElementLoaded < 2) return

    let id = 0;
    for (let UIElement of UIElementsTypes) {
        var node = document.createElement("uielement-card")
        node.setAttribute("name", UIElement.name)
        node.setAttribute("type", UIElement.type)
        node.setAttribute("icon", `{{ site.baseurl }}/../assets/UIElements/${UIElement.src}`)
        node.setAttribute("id", id)
        node.setAttribute("onclick", "selectUIElement(this.getAttribute('id'))")
        document.querySelector("#container").appendChild(node)
        if (id == UIElementType) node.firstElementChild.classList.add("selected")
        id++;
    }
    selectUIElement(0);
}
// =====================================================================
//                                Events
// =====================================================================

/*
Load UI Elements
*/
let UIElementsTypes
let request = new XMLHttpRequest()
request.open('GET', '{{ site.baseurl }}/../assets/UIElements/types.json')
request.responseType = 'text'
request.send()
request.onload = function () {
    UIElementsTypes = JSON.parse(request.response)
    loadUIElement()
    generateImage("Input text...")
}

window.onload = function () {
    const element = document.querySelector("#container");
    element.addEventListener('wheel', (event) => {
        event.preventDefault();
        element.scrollBy({
            left: event.deltaY < 0 ? -70 : 70,
        });
    });
    loadUIElement()
}

// Ticking (loop to check for update every 100ms)
let inputedText = ""
setInterval(generateInit, 100)

const canvas = document.createElement('canvas')
var font = 0
var UIElementType = 0
var UIElementLoaded = 0