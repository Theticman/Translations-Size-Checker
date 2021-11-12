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

    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    const UIElement = UIElementsTypes[UIElementType]
    const canvasWidth = UIElement.width + 50
    const canvasHeight = UIElement.height + 50
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    // Load UI element
    let UIImage = new Image()
    UIImage.src = `../assets/UIElements/${UIElement.name}.png`
    UIImage.onload = function() {
        ctx.drawImage(UIImage, 25, 25)
    }

    // Convert characters to images
    let {characters, textWidth} = await getImageFromText(stringTest,characterType)
    let cursor = Math.floor(canvasWidth/2 - textWidth/2 - characters.length/2)

    // Place character
    for (let character of characters) {
        ctx.drawImage(character.canvas, cursor, canvasHeight/2 - 4)
        cursor += character.characterWidth + 1
    }
}
