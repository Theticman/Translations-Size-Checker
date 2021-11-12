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
    const stringTest = document.getElementById("input_text").value
    const characterType = 0
    const UIElementType = 0
    const scaleRatio = ((characterType == 1) ? 2 : 1)
    console.log(UIElementsTypes[UIElementType])
    let UIElement = Object.create(UIElementsTypes[UIElementType])
    console.log(UIElement)
    UIElement.width *= scaleRatio
    UIElement.height *= scaleRatio
    console.log(UIElement)

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
    let cursor = Math.floor(canvas.width/2 - textWidth/2 - characters.length/2)

    // Place character
    for (let character of characters) {
        ctx.drawImage(character.canvas, cursor, Math.ceil(canvas.height/2 - character.characterPara.ascent+3),character.canvas.width,character.canvas.height)
        cursor += character.characterPara.width + 1
    }
    resizeCanvas()
}

function resizeCanvas() {
    var myCanvas = document.getElementById('canvas');
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = myCanvas.width;
    tempCanvas.height = myCanvas.height;

    // save your canvas into temp canvas
    tempCanvas.getContext('2d').drawImage(myCanvas, 0, 0);

    // resize my canvas as needed, probably in response to mouse events
    myCanvas.width *= 5.2333
    myCanvas.height *= 5.2333

    // draw temp canvas back into myCanvas, scaled as needed
    myCanvas.getContext('2d').imageSmoothingEnabled = false;
    myCanvas.getContext('2d').drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, myCanvas.width, myCanvas.height);
}
