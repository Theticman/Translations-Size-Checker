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
        // Underlined (defaults to false)
        underlined: !!UIElement.underlined,
        // Strikethrough (defaults to false)
        strikethrough: !!UIElement.strikethrough,
        // Text color (defaults to white)
        color: "color" in UIElement ? UIElement.color : "#FFFFFF"
    }
    let { characters } = await getImageFromText(stringTest, renderParams)

    let firstLineCharacters = null
    if (UIElement.firstLineColor && UIElement.firstLineColor !== renderParams.color) {
        let firstLineParams = Object.assign({}, renderParams, { color: UIElement.firstLineColor })
        let res = await getImageFromText(stringTest, firstLineParams)
        firstLineCharacters = res.characters
    }

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

    if (!shouldWrap) {
        for (let i = 0; i < characters.length; i++) {
            let charObj = characters[i]
            let charSource = { default: charObj, firstLine: firstLineCharacters ? firstLineCharacters[i] : charObj }
            // New lines
            if (charObj.isNewline) {
                lines.push({ chars: currentLine, width: currentLineWidth })
                currentLine = []
                currentLineWidth = 0
            } else {
                currentLine.push(charSource)
                currentLineWidth += charObj.characterPara.width * charObj.characterPara.scaleRatio
            }
        }
        lines.push({ chars: currentLine, width: currentLineWidth })
    } else {
        let words = []
        let currentWord = []
        let currentWordWidth = 0

        for (let i = 0; i < characters.length; i++) {
            let charObj = characters[i]
            let charSource = { default: charObj, firstLine: firstLineCharacters ? firstLineCharacters[i] : charObj }

            // New lines
            if (charObj.isNewline) {
                if (currentWord.length > 0) {
                    words.push({ chars: currentWord, width: currentWordWidth, isSpace: false })
                    currentWord = []
                    currentWordWidth = 0
                }
                words.push({ isNewline: true })
                continue
            }

            let w = charObj.characterPara.width * charObj.characterPara.scaleRatio

            if (charObj.isSpace) {
                if (currentWord.length > 0) {
                    words.push({ chars: currentWord, width: currentWordWidth, isSpace: false })
                    currentWord = []
                    currentWordWidth = 0
                }
                words.push({ chars: [charSource], width: w, isSpace: true })
            } else {
                currentWord.push(charSource)
                currentWordWidth += w
            }
        }
        if (currentWord.length > 0) {
            words.push({ chars: currentWord, width: currentWordWidth, isSpace: false })
        }

        for (let item of words) {
            if (item.isNewline) {
                lines.push({ chars: currentLine, width: currentLineWidth })
                currentLine = []
                currentLineWidth = 0
                continue
            }

            if (item.isSpace) {
                if (currentLine.length === 0) continue
                if (currentLineWidth + item.width <= maxPixelWidth) {
                    currentLine.push(item.chars[0])
                    currentLineWidth += item.width
                } else {
                    lines.push({ chars: currentLine, width: currentLineWidth })
                    currentLine = []
                    currentLineWidth = 0
                }
                continue
            }

            if (currentLineWidth + item.width <= maxPixelWidth) {
                for (let c of item.chars) currentLine.push(c)
                currentLineWidth += item.width
            } else {
                // Text wrapping
                if (currentLine.length > 0) {
                    lines.push({ chars: currentLine, width: currentLineWidth })
                    currentLine = []
                    currentLineWidth = 0
                }

                if (item.width <= maxPixelWidth) {
                    for (let c of item.chars) currentLine.push(c)
                    currentLineWidth += item.width
                } else {
                    for (let c of item.chars) {
                        let cw = c.default.characterPara.width * c.default.characterPara.scaleRatio
                        if (currentLineWidth + cw > maxPixelWidth && currentLine.length > 0) {
                            lines.push({ chars: currentLine, width: currentLineWidth })
                            currentLine = [c]
                            currentLineWidth = cw
                        } else {
                            currentLine.push(c)
                            currentLineWidth += cw
                        }
                    }
                }
            }
        }
        lines.push({ chars: currentLine, width: currentLineWidth })
    }

    // Setup origin point
    let centerX = Math.floor(canvas.width / 2)
    let startY = Math.ceil((UIElement.originY) / 2) * 2 - 1
    const firstLineExtra = (UIElement.firstLineSpacing || 0) * 2
    const standardLineHeight = (UIElement.lineSpacing !== undefined ? UIElement.lineSpacing : 10) * 2

    for (let r = 0; r < lines.length; r++) {
        let line = lines[r]
        let textWidthGui = Math.floor(line.width / 2)
        let lineColor = (r === 0 && UIElement.firstLineColor) ? UIElement.firstLineColor : UIElement.color

        let cursor = {
            x: (UIElement.align == "center" 
                ? (centerX - Math.floor(textWidthGui / 2) * 2) 
                : (UIElement.originX + 25)),
            y: startY
        }

        let renderCharList = line.chars.map(c => (r === 0 && firstLineCharacters ? c.firstLine : c.default))

        // Strikethrough shadow (behind text)
        if (renderParams.shadow) {
            let segStart = null
            let curX = cursor.x
            for (let character of renderCharList) {
                let charW = character.characterPara.width * character.characterPara.scaleRatio
                if (character.strikethrough) {
                    if (segStart === null) segStart = curX
                } else {
                    if (segStart !== null) {
                        ctx.fillStyle = "#3E3E3E"
                        ctx.fillRect(segStart, cursor.y + 2, (curX - segStart) + 2, 2)
                        segStart = null
                    }
                }
                curX += charW
            }
            if (segStart !== null) {
                ctx.fillStyle = "#3E3E3E"
                ctx.fillRect(segStart, cursor.y + 2, (curX - segStart) + 2, 2)
            }
        }

        // Place character
        let charX = cursor.x
        for (let character of renderCharList) {
            let charW = character.characterPara.width * character.characterPara.scaleRatio
            let drawY = cursor.y - character.characterPara.ascent + 3

            if (character.italic) {
                let leftPad = 8
                let charCanvas = document.createElement("canvas")
                charCanvas.width = character.canvas.width * character.characterPara.scaleRatio + leftPad + 24
                charCanvas.height = character.canvas.height * character.characterPara.scaleRatio + 8
                let charCtx = charCanvas.getContext('2d')
                charCtx.imageSmoothingEnabled = false

                charCtx.drawImage(
                    character.canvas,
                    leftPad,
                    4,
                    character.canvas.width * character.characterPara.scaleRatio,
                    character.canvas.height * character.characterPara.scaleRatio
                )

                let shearedCanvas = document.createElement("canvas")
                shearedCanvas.width = charCanvas.width
                shearedCanvas.height = charCanvas.height
                let shearedCtx = shearedCanvas.getContext('2d')
                shearedCtx.imageSmoothingEnabled = false

                let baselineCanvasY = 4 + 14
                for (let y = 0; y < charCanvas.height; y += 2) {
                    let blockIndex = Math.floor((baselineCanvasY - y) / 4)
                    let drawX = blockIndex * 1
                    shearedCtx.drawImage(charCanvas, 0, y, charCanvas.width, 2, drawX, y, charCanvas.width, 2)
                }

                ctx.drawImage(shearedCanvas, charX - leftPad, drawY - 4)
            } else {
                ctx.drawImage(
                    character.canvas,
                    charX,
                    drawY,
                    character.canvas.width * character.characterPara.scaleRatio,
                    character.canvas.height * character.characterPara.scaleRatio
                )
            }
            charX += charW
        }

        // Underlined (defaults to false)
        let segStartUnder = null
        let curUnderX = cursor.x
        for (let character of renderCharList) {
            let charW = character.characterPara.width * character.characterPara.scaleRatio
            if (character.underlined) {
                if (segStartUnder === null) segStartUnder = curUnderX
            } else {
                if (segStartUnder !== null) {
                    ctx.fillStyle = lineColor
                    ctx.fillRect(segStartUnder - 2, cursor.y + 9, (curUnderX - segStartUnder) + 2, 2)
                    if (renderParams.shadow) {
                        ctx.fillStyle = "#3E3E3E"
                        ctx.fillRect(segStartUnder, cursor.y + 11, (curUnderX - segStartUnder) + 2, 2)
                    }
                    segStartUnder = null
                }
            }
            curUnderX += charW
        }
        if (segStartUnder !== null) {
            ctx.fillStyle = lineColor
            ctx.fillRect(segStartUnder - 2, cursor.y + 9, (curUnderX - segStartUnder) + 2, 2)
            if (renderParams.shadow) {
                ctx.fillStyle = "#3E3E3E"
                ctx.fillRect(segStartUnder, cursor.y + 11, (curUnderX - segStartUnder) + 2, 2)
            }
        }

        // Strikethrough line (in front of text)
        let segStartStrike = null
        let curStrikeX = cursor.x
        for (let character of renderCharList) {
            let charW = character.characterPara.width * character.characterPara.scaleRatio
            if (character.strikethrough) {
                if (segStartStrike === null) segStartStrike = curStrikeX
            } else {
                if (segStartStrike !== null) {
                    ctx.fillStyle = lineColor
                    ctx.fillRect(segStartStrike - 2, cursor.y, (curStrikeX - segStartStrike) + 2, 2)
                    segStartStrike = null
                }
            }
            curStrikeX += charW
        }
        if (segStartStrike !== null) {
            ctx.fillStyle = lineColor
            ctx.fillRect(segStartStrike - 2, cursor.y, (curStrikeX - segStartStrike) + 2, 2)
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

async function copyImageToClipboard() {
    let sourceCanvas = document.getElementById('canvas') || canvas;
    sourceCanvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            let copyBtn = document.getElementById('copy_button');
            if (copyBtn) {
                let originalText = copyBtn.innerText;
                copyBtn.innerText = "Copied!";
                setTimeout(() => { copyBtn.innerText = originalText; }, 1500);
            }
        } catch (err) {
            console.error("Clipboard copy failed:", err);
        }
    });
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