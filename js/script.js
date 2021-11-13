// Load UIElements types
let UIElementsTypes
let request = new XMLHttpRequest()
request.open('GET', '../assets/UIElements/types.json')
request.responseType = 'text'
request.send()
request.onload = function() {
    UIElementsTypes = JSON.parse(request.response)
    console.log("Loaded succesfully",UIElementsTypes)
}

// Generate Image
async function generateImage() {
    console.log("NEW GENERATION")
    const stringTest = document.getElementById("input_text").value
    const characterType = 1
    const UIElementType = 0
    let UIElement = Object.create(UIElementsTypes[UIElementType])
    UIElement.width *= 2
    UIElement.height *= 2

    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = UIElement.width + 50
    canvas.height = UIElement.height

    // Load UI element
    let UIImage = new Image()
    UIImage.src = `../assets/UIElements/${UIElement.name}.png`
    UIImage.onload = function() {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(UIImage, canvas.width/2 - UIElement.width/2, canvas.height/2 - UIElement.height/2, UIElement.width, UIElement.height)
    }

    // Convert characters to images
    let {characters, textWidth} = await getImageFromText(stringTest,characterType)
    let cursor = Math.floor(canvas.width/2 - textWidth/2)

    // Place character
    for (let character of characters) {
        ctx.drawImage(character.canvas, cursor, Math.floor(canvas.height/2 - character.characterPara.ascent+3),character.canvas.width*character.characterPara.scaleRatio,character.canvas.height*character.characterPara.scaleRatio)
        cursor += character.characterPara.width*character.characterPara.scaleRatio
    }
    //resizeCanvas()
}

function resizeCanvas() {
    var myCanvas = document.getElementById('canvas');
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = myCanvas.width;
    tempCanvas.height = myCanvas.height;

    // save your canvas into temp canvas
    tempCanvas.getContext('2d').drawImage(myCanvas, 0, 0);

    // resize my canvas as needed, probably in response to mouse events
    myCanvas.width *= 5
    myCanvas.height *= 5

    // draw temp canvas back into myCanvas, scaled as needed
    myCanvas.getContext('2d').imageSmoothingEnabled = false;
    myCanvas.getContext('2d').drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, myCanvas.width, myCanvas.height);
}
