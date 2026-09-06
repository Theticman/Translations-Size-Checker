// Generate image
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
        // Shadow (defaults to true)
        shadow: "shadow" in UIElement ? UIElement.shadow : true,
        // Bold (defaults to false)
        bold: !!UIElement.bold,
        // Italic (defaults to false)
        italic: !!(UIElement.italic || UIElement.italics),
        // Text color (defaults to white)
        color: "color" in UIElement ? UIElement.color : "#FFFFFF"
    }
    let { characters } = await getImageFromText(stringTest, renderParams)

    // Place UI element
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(UIImage, canvas.width / 2 - UIElement.width / 2, canvas.height / 2 - UIElement.height / 2, UIElement.width, UIElement.height)

    // Multi-line text support
    const shouldWrap = !!UIElement.wrap
    const maxPixelWidth = shouldWrap && UIElement.maxWidth ? UIElement.maxWidth * 2 : Infinity

    let lines = []
    let currentLine = []
    let currentLineWidth = 0

    for (let i = 0; i < characters.length; i++) {
        let charObj = characters[i]

        // New lines
        if (charObj.isNewline) {
            lines.push({ chars: currentLine, width: currentLineWidth })
            currentLine = []
            currentLineWidth = 0
            continue
        }

        let charW = charObj.characterPara.width * charObj.characterPara.scaleRatio

        // Text wrapping
        if (shouldWrap && currentLineWidth + charW > maxPixelWidth && currentLine.length > 0) {
            lines.push({ chars: currentLine, width: currentLineWidth })
            currentLine = [charObj]
            currentLineWidth = charW
        } else {
            currentLine.push(charObj)
            currentLineWidth += charW
        }
    }
    lines.push({ chars: currentLine, width: currentLineWidth })

    // Setup origin point
    let centerX = Math.floor(canvas.width / 2)
    let startY = Math.ceil((UIElement.originY) / 2) * 2 - 1
    const firstLineExtra = (UIElement.firstLineSpacing || 0) * 2
    const standardLineHeight = 20

    for (let r = 0; r < lines.length; r++) {
        let line = lines[r]
        let textWidthGui = Math.floor(line.width / 2)

        let cursor = {
            x: (UIElement.align == "center" 
                ? (centerX - Math.floor(textWidthGui / 2) * 2) 
                : (UIElement.originX + 25)),
            y: startY
        }

        let lineStartX = cursor.x

        // Strikethrough shadow (behind text)
        if (!!UIElement.strikethrough && renderParams.shadow) {
            ctx.fillStyle = "#3E3E3E"
            ctx.fillRect(lineStartX, cursor.y + 2, line.width + 2, 2)
        }

        if (renderParams.italic) {
            let leftPad = 8
            let lineCanvas = document.createElement("canvas")
            lineCanvas.width = line.width + leftPad + 24
            lineCanvas.height = 40
            let lineCtx = lineCanvas.getContext('2d')
            lineCtx.imageSmoothingEnabled = false

            let charOffset = leftPad
            for (let character of line.chars) {
                lineCtx.drawImage(
                    character.canvas, 
                    charOffset, 
                    20 - character.characterPara.ascent + 4, 
                    character.canvas.width * character.characterPara.scaleRatio, 
                    character.canvas.height * character.characterPara.scaleRatio
                )
                charOffset += character.characterPara.width * character.characterPara.scaleRatio
            }

            let shearedCanvas = document.createElement("canvas")
            shearedCanvas.width = lineCanvas.width
            shearedCanvas.height = lineCanvas.height
            let shearedCtx = shearedCanvas.getContext('2d')
            shearedCtx.imageSmoothingEnabled = false

            let baseRowGui = 11

            for (let y = 0; y < lineCanvas.height; y += 2) {
                let rowGui = y / 2
                let shift = Math.floor((baseRowGui - rowGui) / 2)
                let drawX = shift + 1
                shearedCtx.drawImage(lineCanvas, 0, y, lineCanvas.width, 2, drawX, y, lineCanvas.width, 2)
            }

            ctx.drawImage(shearedCanvas, lineStartX - leftPad, cursor.y - 20)
        } else {
            // Place character
            for (let character of line.chars) {
                ctx.drawImage(
                    character.canvas, 
                    cursor.x, 
                    cursor.y - character.characterPara.ascent + 3, 
                    character.canvas.width * character.characterPara.scaleRatio, 
                    character.canvas.height * character.characterPara.scaleRatio
                )
                cursor.x += character.characterPara.width * character.characterPara.scaleRatio
            }
        }

        // Underlined (defaults to false)
        if (!!UIElement.underlined) {
            ctx.fillStyle = UIElement.color
            ctx.fillRect(lineStartX - 2, cursor.y + 9, line.width + 2, 2)
            ctx.fillStyle = "#3E3E3E"
            ctx.fillRect(lineStartX, cursor.y + 11, line.width + 2, 2)
        }

        // Strikethrough line (in front of text)
        if (!!UIElement.strikethrough) {
            ctx.fillStyle = UIElement.color
            ctx.fillRect(lineStartX - 2, cursor.y, line.width + 2, 2)
        }

        // Vertical increase for next line
        startY += standardLineHeight + (r === 0 ? firstLineExtra : 0)
    }

    // Copy to real canvas
    applyToCanvas()
}

function applyToCanvas() {
    var myCanvas = document.getElementById('canvas');

    myCanvas.width = canvas.width
    myCanvas.height = canvas.height

    // Draw temp canvas back into myCanvas, scaled as needed
    myCanvas.getContext('2d').drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, myCanvas.width, myCanvas.height);
}

function generateInit() {
    let inputEl = document.getElementById("input_text")
    if (!inputEl) return
    let newInputedText = inputEl.value
    if (newInputedText == "") newInputedText = "Input Text..."
    if (inputedText != newInputedText) {
        inputedText = newInputedText
        generateImage(newInputedText)
    }
}

// Field conversion
function updateInputField(isWrap) {
    let currentInput = document.getElementById("input_text")
    if (!currentInput) return
    let isCurrentlyTextarea = currentInput.tagName.toLowerCase() === "textarea"

    if (isWrap && !isCurrentlyTextarea) {
        let textarea = document.createElement("textarea")
        textarea.id = "input_text"
        textarea.className = "input_box"
        textarea.placeholder = "Input Text..."
        textarea.rows = 6
        textarea.value = currentInput.value
        currentInput.parentNode.replaceChild(textarea, currentInput)
    } else if (!isWrap && isCurrentlyTextarea) {
        let input = document.createElement("input")
        input.type = "text"
        input.id = "input_text"
        input.className = "input_box"
        input.placeholder = "Input Text..."
        input.value = currentInput.value.replace(/[\r\n]+/g, " ")
        currentInput.parentNode.replaceChild(input, currentInput)
    }
}

function selectUIElement(index) {
    // Remove selected class
    document.querySelector(".selected").classList.remove("selected")

    // Add selected class
    document.getElementById(`${index}`).firstElementChild.classList.add("selected");

    UIElementType = index
    let currentType = UIElementsTypes[UIElementType]

    // Update input field
    updateInputField(!!currentType.wrap)

    let inputEl = document.getElementById("input_text")
    inputedText = inputEl.value
    inputedText = (inputedText == "") ? "Input Text..." : inputedText
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
//                               Events
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
    updateInputField(!!UIElementsTypes[UIElementType].wrap)
    loadUIElement()
    generateImage("Input Text...")
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