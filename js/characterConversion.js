// Load characters tables
let defaultCharacterTable
let request1 = new XMLHttpRequest()
request1.open('GET', '{{ site.baseurl }}/../assets/font/default.json')
request1.responseType = 'text'
request1.send()
request1.onload = function () {
    defaultCharacterTable = JSON.parse(request1.response)
}

let altCharacterTable
let request2 = new XMLHttpRequest()
request2.open('GET', '{{ site.baseurl }}/../assets/font/alt.json')
request2.responseType = 'text'
request2.send()
request2.onload = function () {
    altCharacterTable = JSON.parse(request2.response)
}

async function getImageFromText(text, renderParams) {
    let characters = []
    let textWidth = 0

    let isBold = !!renderParams.bold
    let isItalic = !!(renderParams.italic || renderParams.italics)
    let isUnderlined = !!renderParams.underlined
    let isStrikethrough = !!renderParams.strikethrough

    for (let i = 0; i < text.length; i++) {
        let character = text[i]
        let nextChar = text[i + 1]

        if (character === '\r') continue

        // Toggle bold using Markdown (**)
        if (character === '*' && nextChar === '*') {
            isBold = !isBold
            i++
            continue
        }

        // Toggle italic using Markdown (__)
        if (character === '_' && nextChar === '_') {
            isItalic = !isItalic
            i++
            continue
        }

        // Toggle strikethrough using Markdown (~~)
        if (character === '~' && nextChar === '~') {
            isStrikethrough = !isStrikethrough
            i++
            continue
        }

        // Toggle underline using Markdown (::)
        if (character === ':' && nextChar === ':') {
            isUnderlined = !isUnderlined
            i++
            continue
        }

        if (character === '\n') {
            characters.push({ isNewline: true, isSpace: false })
            continue
        }

        let isSpace = (character === ' ')
        let charBold = isBold
        let { file, row, col, characterSize } = getCharacterPosition(character, renderParams.font, charBold)
        let charParams = Object.assign({}, renderParams, { bold: charBold })
        let { canvas, characterPara } = await getCharacterImage(file, row, col, characterSize, charParams)

        characters.push({
            canvas,
            characterPara,
            isNewline: false,
            isSpace: isSpace,
            bold: charBold,
            italic: isItalic,
            underlined: isUnderlined,
            strikethrough: isStrikethrough
        })
        textWidth += characterPara.width * characterPara.scaleRatio
    }
    return { characters, textWidth }
}

function getCharacterPosition(character, font, bold) {
    const codePoint = character.codePointAt(0)
    const unicodeNumber = codePoint.toString(16).padStart(6, "0")
    let row, col, characterTable

    if (font == 1) return getCharacterPositionUnicode(unicodeNumber)
    else if (font == 2) characterTable = altCharacterTable
    else characterTable = defaultCharacterTable

    if (unicodeNumber == "000020") {
        if (bold) return { file: "space", row: 0, col: 0, characterSize: { width: 10, height: 1 } }
        else return { file: "space", row: 0, col: 0, characterSize: { width: 8, height: 1 } }
    }


    for (provider of characterTable.providers) {
        row = -1
        for (let line of provider.chars) {
            col = -1
            row++
            for (glyph of line) {
                col++
                if (glyph.codePointAt(0).toString(16).padStart(6, "0") == unicodeNumber) {
                    let file = provider.file.replace(/minecraft:/, "{{ site.baseurl }}/../assets/")
                    let characterSize = provider.characterSize
                    return { file, row, col, characterSize }
                }
            }
        }
    }
    return getCharacterPositionUnicode(unicodeNumber)
}

function getCharacterPositionUnicode(unicodeNumber) {
    if (unicodeNumber == "000020") return { file: "space", row: 0, col: 0, characterSize: { width: 8, height: 1 } }
    let file = `{{ site.baseurl }}/../assets/font/unicode_page_${unicodeNumber.substr(0, 2)}.png`
    let row = parseInt(unicodeNumber[2], 16)
    let col = parseInt(unicodeNumber[3], 16)
    let characterSize = { width: 16, height: 16, ascent: 11, unicode: true }
    return { file, row, col, characterSize }
}

async function getCharacterImage(file, row, col, characterSize, renderParams) {
    var canvas = document.createElement("canvas")
    var ctx = canvas.getContext('2d')
    canvas.width = characterSize.width + 1 + 1
    canvas.height = characterSize.height + 1

    if (file == "space") return { canvas, characterPara: { width: characterSize.width, scaleRatio: 1, ascent: 0 } }

    let img = new Image()
    await new Promise((resolve) => {
        img.onload = () => resolve()
        img.src = file
    })

    let characterStart = 1000
    let characterEnd = -1000

    let rgbColor = renderParams.color.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
        , (m, r, g, b) => '#' + r + r + g + g + b + b)
        .substring(1).match(/.{2}/g)
        .map(x => parseInt(x, 16))

    ctx.drawImage(img, col * characterSize.width, row * characterSize.height, characterSize.width, characterSize.height, 1, 0, characterSize.width, characterSize.height)

    let srcData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let srcPixels = srcData.data

    let isGlyphPixel = new Uint8Array(canvas.width * canvas.height)
    for (let x = 1; x <= characterSize.width; x++) {
        for (let y = 0; y < characterSize.height; y++) {
            let idx = (y * canvas.width + x) * 4
            // Render the pixel in the specified color
            if (srcPixels[idx + 3] > 0 && srcPixels[idx] > 128) {
                isGlyphPixel[y * canvas.width + x] = 1
            }
        }
    }

    // Render bold
    if (renderParams.bold) {
        for (let y = 0; y < characterSize.height; y++) {
            for (let x = characterSize.width; x >= 1; x--) {
                if (isGlyphPixel[y * canvas.width + x] === 1) {
                    isGlyphPixel[y * canvas.width + (x + 1)] = 1
                }
            }
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let outData = ctx.createImageData(canvas.width, canvas.height)
    let outPixels = outData.data

    let shadowR = (rgbColor[0] & 0xfc) >> 2
    let shadowG = (rgbColor[1] & 0xfc) >> 2
    let shadowB = (rgbColor[2] & 0xfc) >> 2

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            let pos = y * canvas.width + x
            let idx = pos * 4

            if (isGlyphPixel[pos] === 1) {
                if (x > characterEnd) characterEnd = x
                if (x < characterStart) characterStart = x
                outPixels[idx] = rgbColor[0]
                outPixels[idx + 1] = rgbColor[1]
                outPixels[idx + 2] = rgbColor[2]
                outPixels[idx + 3] = 255
            } else if (renderParams.shadow && y > 0 && x > 0 && isGlyphPixel[(y - 1) * canvas.width + (x - 1)] === 1) {
                // Render the shadow
                outPixels[idx] = shadowR
                outPixels[idx + 1] = shadowG
                outPixels[idx + 2] = shadowB
                outPixels[idx + 3] = 255
            }
        }
    }
    ctx.putImageData(outData, 0, 0)

    // ctx.drawImage(img, col*characterSize.width, row*characterSize.height, characterSize.width, characterSize.height, 0, 0, characterSize.width, characterSize.height)
    let characterPara = { width: characterEnd - characterStart, scaleRatio: Math.ceil(16 / characterSize.width), ascent: characterSize.ascent }

    // Remove characterStart pixels on the left
    if (Math.abs(characterStart) < 999) {
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(tempCanvas, characterStart, 0, canvas.width - characterStart, canvas.height, 0, 0, canvas.width - characterStart, canvas.height)
        if (characterStart > 1) characterPara.width -= 1
    }

    if (characterSize.unicode) characterPara.width += 3
    else characterPara.width += 2 // At least one pixel + shadow

    return { canvas, characterPara }
}