// Cache UI element images to prevent reloading on every tick
const uiImageCache = {}

function getCachedUIImage(src) {
    if (uiImageCache[src]) return Promise.resolve(uiImageCache[src])
    return new Promise((resolve) => {
        let img = new Image()
        img.onload = () => {
            uiImageCache[src] = img
            resolve(img)
        }
        img.src = `{{ site.baseurl }}/../assets/UIElements/${src}`
    })
}

// Shared scratchpad canvases for italic transformation to eliminate garbage collection
const italicCharCanvas = document.createElement("canvas")
const italicCharCtx = italicCharCanvas.getContext('2d')
italicCharCtx.imageSmoothingEnabled = false

const italicShearedCanvas = document.createElement("canvas")
const italicShearedCtx = italicShearedCanvas.getContext('2d')
italicShearedCtx.imageSmoothingEnabled = false

// Generate image
async function generateImage(stringTest) {
    let UIElement = Object.create(UIElementsTypes[UIElementType])
    UIElement.width *= 2
    UIElement.height *= 2

    const mainCanvas = document.getElementById('canvas')
    if (!mainCanvas) return
    const ctx = mainCanvas.getContext('2d')
    
    mainCanvas.width = UIElement.width + 50
    mainCanvas.height = UIElement.height

    // Load UI element
    let UIImage = await getCachedUIImage(UIElement.src)

    // Convert characters to images
    let renderParams = {
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

    // Place UI element
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height)
    
    let bgXGui = Math.floor((mainCanvas.width - UIElement.width) / 4)
    let bgYGui = Math.floor((mainCanvas.height - UIElement.height) / 4)
    let bgX = bgXGui * 2
    let bgY = bgYGui * 2

    ctx.drawImage(UIImage, bgX, bgY, UIElement.width, UIElement.height)

    // Multi-line text support
    const shouldWrap = !!UIElement.wrap
    const maxPixelWidth = shouldWrap && UIElement.maxWidth ? UIElement.maxWidth * 2 : Infinity

    let lines = []
    let currentLine = []
    let currentLineWidth = 0

    if (!shouldWrap) {
        for (let i = 0; i < characters.length; i++) {
            let charObj = characters[i]
            // New lines
            if (charObj.isNewline) {
                lines.push({ chars: currentLine, width: currentLineWidth })
                currentLine = []
                currentLineWidth = 0
            } else {
                currentLine.push(charObj)
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
                words.push({ chars: [charObj], width: w, isSpace: true })
            } else {
                currentWord.push(charObj)
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
                        let cw = c.characterPara.width * c.characterPara.scaleRatio
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
    let widgetWidthGui = UIElement.width / 2
    let startY = Math.ceil((UIElement.originY) / 2) * 2 - 1
    const firstLineExtra = (UIElement.firstLineSpacing || 0) * 2
    const standardLineHeight = (UIElement.lineSpacing !== undefined ? UIElement.lineSpacing : 10) * 2

    for (let r = 0; r < lines.length; r++) {
        let line = lines[r]
        let stringWidthGui = Math.floor((line.width > 0 ? line.width - 2 : 0) / 2)
        let isFirstLineRecolor = (r === 0 && UIElement.firstLineColor && UIElement.firstLineColor !== renderParams.color)
        let lineColor = isFirstLineRecolor ? UIElement.firstLineColor : UIElement.color

        let cursor = {
            x: (UIElement.align == "center" 
                ? ((bgXGui + Math.floor((widgetWidthGui - stringWidthGui) / 2)) * 2) 
                : (UIElement.originX + 25)),
            y: startY
        }

        // Fetch character instances for this line
        let renderCharList = []
        for (let baseChar of line.chars) {
            if (isFirstLineRecolor) {
                let charParams = Object.assign({}, renderParams, { color: UIElement.firstLineColor, bold: baseChar.bold })
                let glyph = await getCharacterImage(baseChar.file, baseChar.row, baseChar.col, baseChar.characterSize, charParams)
                renderCharList.push(Object.assign({}, baseChar, { canvas: glyph.canvas, characterPara: glyph.characterPara }))
            } else {
                renderCharList.push(baseChar)
            }
        }

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
                let reqWidth = character.canvas.width * character.characterPara.scaleRatio + leftPad + 24
                let reqHeight = character.canvas.height * character.characterPara.scaleRatio + 8

                if (italicCharCanvas.width < reqWidth || italicCharCanvas.height < reqHeight) {
                    italicCharCanvas.width = reqWidth
                    italicCharCanvas.height = reqHeight
                    italicCharCtx.imageSmoothingEnabled = false
                }
                if (italicShearedCanvas.width < reqWidth || italicShearedCanvas.height < reqHeight) {
                    italicShearedCanvas.width = reqWidth
                    italicShearedCanvas.height = reqHeight
                    italicShearedCtx.imageSmoothingEnabled = false
                }

                italicCharCtx.clearRect(0, 0, reqWidth, reqHeight)
                italicCharCtx.drawImage(
                    character.canvas,
                    leftPad,
                    4,
                    character.canvas.width * character.characterPara.scaleRatio,
                    character.canvas.height * character.characterPara.scaleRatio
                )

                italicShearedCtx.clearRect(0, 0, reqWidth, reqHeight)
                let baselineCanvasY = 4 + 14
                for (let y = 0; y < reqHeight; y += 2) {
                    let blockIndex = Math.floor((baselineCanvasY - y) / 4)
                    let drawX = blockIndex * 1
                    italicShearedCtx.drawImage(italicCharCanvas, 0, y, reqWidth, 2, drawX, y, reqWidth, 2)
                }

                ctx.drawImage(italicShearedCanvas, 0, 0, reqWidth, reqHeight, charX - leftPad, drawY - 4, reqWidth, reqHeight)
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
}

async function copyImageToClipboard() {
    let sourceCanvas = document.getElementById('canvas')
    if (!sourceCanvas) return

    let UIElement = UIElementsTypes[UIElementType]
    let targetW = UIElement.width * 2
    let targetH = UIElement.height * 2
    let bgX = Math.floor((sourceCanvas.width - targetW) / 4) * 2
    let bgY = Math.floor((sourceCanvas.height - targetH) / 4) * 2

    let cropCanvas = document.createElement('canvas')
    cropCanvas.width = targetW
    cropCanvas.height = targetH
    let cropCtx = cropCanvas.getContext('2d')
    cropCtx.drawImage(sourceCanvas, bgX, bgY, targetW, targetH, 0, 0, targetW, targetH)

    cropCanvas.toBlob(async (blob) => {
        if (!blob) return
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ])
            let copyBtn = document.getElementById('copy_button')
            if (copyBtn) {
                let originalText = copyBtn.innerText
                copyBtn.innerText = "Copied!"
                setTimeout(() => { copyBtn.innerText = originalText; }, 1500)
            }
        } catch (err) {
            console.error("Clipboard copy failed:", err)
        }
    }, 'image/png')
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

    let newInput
    if (isWrap && !isCurrentlyTextarea) {
        newInput = document.createElement("textarea")
        newInput.id = "input_text"
        newInput.className = "input_box"
        newInput.placeholder = "Input Text..."
        newInput.rows = 6
        newInput.value = currentInput.value
        currentInput.parentNode.replaceChild(newInput, currentInput)
        newInput.addEventListener("input", generateInit)
    } else if (!isWrap && isCurrentlyTextarea) {
        newInput = document.createElement("input")
        newInput.type = "text"
        newInput.id = "input_text"
        newInput.className = "input_box"
        newInput.placeholder = "Input Text..."
        newInput.value = currentInput.value.replace(/[\r\n]+/g, " ")
        currentInput.parentNode.replaceChild(newInput, currentInput)
        newInput.addEventListener("input", generateInit)
    }
}

function selectUIElement(index) {
    // Remove selected class
    let prevSelected = document.querySelector(".selected")
    if (prevSelected) prevSelected.classList.remove("selected")

    // Add selected class
    let targetCard = document.getElementById(`${index}`)
    if (targetCard && targetCard.firstElementChild) {
        targetCard.firstElementChild.classList.add("selected")
    }

    UIElementType = index
    let currentType = UIElementsTypes[UIElementType]

    // Update input field
    updateInputField(!!currentType.wrap)

    let inputEl = document.getElementById("input_text")
    inputedText = inputEl ? inputEl.value : ""
    inputedText = (inputedText == "") ? "Input Text..." : inputedText
    generateImage(inputedText)
}

function loadUIElement() {
    UIElementLoaded++
    if (UIElementLoaded < 2) return

    let container = document.querySelector("#container")
    if (!container) return

    let id = 0
    for (let UIElement of UIElementsTypes) {
        let node = document.createElement("uielement-card")
        node.setAttribute("name", UIElement.name)
        node.setAttribute("type", UIElement.type)
        node.setAttribute("icon", `{{ site.baseurl }}/../assets/UIElements/${UIElement.src}`)
        node.setAttribute("id", id)
        node.setAttribute("onclick", "selectUIElement(this.getAttribute('id'))")
        container.appendChild(node)
        if (id == UIElementType && node.firstElementChild) {
            node.firstElementChild.classList.add("selected")
        }
        id++
    }
    selectUIElement(0)
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
    
    let inputEl = document.getElementById("input_text")
    if (inputEl) {
        inputEl.addEventListener("input", generateInit)
    }
    
    generateImage("Input Text...")
}

window.onload = function () {
    const element = document.querySelector("#container")
    if (element) {
        element.addEventListener('wheel', (event) => {
            event.preventDefault()
            element.scrollBy({
                left: event.deltaY < 0 ? -70 : 70,
            })
        })
    }
    loadUIElement()
}

let inputedText = ""
var font = 0
var UIElementType = 0
var UIElementLoaded = 0