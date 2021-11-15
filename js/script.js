// Load UIElements types
let UIElementsTypes
let request = new XMLHttpRequest()
request.open('GET', '../assets/UIElements/types.json')
request.responseType = 'text'
request.send()
request.onload = function() {
    UIElementsTypes = JSON.parse(request.response)
    generateImage("Hello world !")
}

const canvas = document.createElement('canvas')

// Generate Image
async function generateImage(stringTest) {

    const characterType = 2
    const UIElementType = 0
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
        UIImage.src = `../assets/UIElements/${UIElement.name}.png`
    })
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(UIImage, canvas.width/2 - UIElement.width/2, canvas.height/2 - UIElement.height/2, UIElement.width, UIElement.height)

    // Convert characters to images
    let {characters, textWidth} = await getImageFromText(stringTest,characterType)
    let cursor = Math.floor(canvas.width/2 - textWidth/2)

    // Place character
    for (let character of characters) {
        ctx.drawImage(character.canvas, cursor, Math.floor(canvas.height/2 - character.characterPara.ascent+3),character.canvas.width*character.characterPara.scaleRatio,character.canvas.height*character.characterPara.scaleRatio)
        cursor += character.characterPara.width*character.characterPara.scaleRatio
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
    if (inputedText != newInputedText) {
        if(newInputedText == "") newInputedText = " "
        inputedText = newInputedText
        generateImage(newInputedText)
    }
}

// Ticking (loop to check for update every 100ms)
let inputedText = ""
setInterval(generateInit, 100)

window.onload=function(){
    const element = document.querySelector("#container");

    element.addEventListener('wheel', (event) => {
    event.preventDefault();

    element.scrollBy({
        left: event.deltaY < 0 ? -50 : 50,
        
    });
    });
}
