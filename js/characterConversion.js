// Load characters tables
let defaultCharacterMap = new Map()
let altCharacterMap = new Map()

function buildCharacterMap(table) {
    let map = new Map()
    if (!table || !table.providers) return map
    for (let provider of table.providers) {
        let row = -1
        for (let line of provider.chars) {
            row++
            let col = -1
            for (let glyph of line) {
                col++
                let unicodeNumber = glyph.codePointAt(0).toString(16).padStart(6, "0")
                let file = provider.file.replace(/minecraft:/, "{{ site.baseurl }}/../assets/")
                let characterSize = provider.characterSize
                map.set(unicodeNumber, { file, row, col, characterSize })
            }
        }
    }
    return map
}

const fontReadyPromise = Promise.all([
    new Promise((resolve) => {
        let req = new XMLHttpRequest()
        req.open('GET', '{{ site.baseurl }}/../assets/font/default.json')
        req.responseType = 'text'
        req.onload = () => {
            defaultCharacterMap = buildCharacterMap(JSON.parse(req.response))
            resolve()
        }
        req.send()
    }),
    new Promise((resolve) => {
        let req = new XMLHttpRequest()
        req.open('GET', '{{ site.baseurl }}/../assets/font/alt.json')
        req.responseType = 'text'
        req.onload = () => {
            altCharacterMap = buildCharacterMap(JSON.parse(req.response))
            resolve()
        }
        req.send()
    })
])

// Global caches for font sheet images and generated character canvases
const fontImageCache = new Map()
const glyphCache = new Map()

function getCachedFontImage(file) {
    if (fontImageCache.has(file)) {
        return Promise.resolve(fontImageCache.get(file))
    }
    return new Promise((resolve) => {
        let img = new Image()
        img.onload = () => {
            fontImageCache.set(file, img)
            resolve(img)
        }
        img.src = file
    })
}

async function getImageFromText(text, renderParams) {
    await fontReadyPromise
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
            character,
            file,
            row,
            col,
            characterSize,
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

    if (font == 1) return getCharacterPositionUnicode(unicodeNumber)

    if (unicodeNumber == "000020") {
        if (bold) return { file: "space", row: 0, col: 0, characterSize: { width: 10, height: 1 } }
        else return { file: "space", row: 0, col: 0, characterSize: { width: 8, height: 1 } }
    }

    let characterMap = (font == 2) ? altCharacterMap : defaultCharacterMap
    if (characterMap.has(unicodeNumber)) {
        return characterMap.get(unicodeNumber)
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
    if (file == "space") {
        let canvas = document.createElement("canvas")
        canvas.width = characterSize.width + 2
        canvas.height = characterSize.height + 1
        return { canvas, characterPara: { width: characterSize.width, scaleRatio: 1, ascent: 0 } }
    }

    // Cache lookup for rendered glyphs
    const cacheKey = `${file}:${col}:${row}:${renderParams.color}:${!!renderParams.bold}:${!!renderParams.shadow}`
    if (glyphCache.has(cacheKey)) {
        return glyphCache.get(cacheKey)
    }

    let rawCanvas = document.createElement("canvas")
    let rawCtx = rawCanvas.getContext('2d')
    rawCanvas.width = characterSize.width + 2
    rawCanvas.height = characterSize.height + 1

    let img = await getCachedFontImage(file)

    let rgbColor = renderParams.color.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
        , (m, r, g, b) => '#' + r + r + g + g + b + b)
        .substring(1).match(/.{2}/g)
        .map(x => parseInt(x, 16))

    rawCtx.drawImage(img, col * characterSize.width, row * characterSize.height, characterSize.width, characterSize.height, 1, 0, characterSize.width, characterSize.height)

    let srcData = rawCtx.getImageData(0, 0, rawCanvas.width, rawCanvas.height)
    let srcPixels = srcData.data

    let isGlyphPixel = new Uint8Array(rawCanvas.width * rawCanvas.height)
    for (let x = 1; x <= characterSize.width; x++) {
        for (let y = 0; y < characterSize.height; y++) {
            let idx = (y * rawCanvas.width + x) * 4
            if (srcPixels[idx + 3] > 0 && srcPixels[idx] > 128) {
                isGlyphPixel[y * rawCanvas.width + x] = 1
            }
        }
    }

    // Render bold
    if (renderParams.bold) {
        for (let y = 0; y < characterSize.height; y++) {
            for (let x = characterSize.width; x >= 1; x--) {
                if (isGlyphPixel[y * rawCanvas.width + x] === 1) {
                    isGlyphPixel[y * rawCanvas.width + (x + 1)] = 1
                }
            }
        }
    }

    let characterStart = 1000
    let characterEnd = -1000

    let outData = rawCtx.createImageData(rawCanvas.width, rawCanvas.height)
    let outPixels = outData.data

    let shadowR = (rgbColor[0] & 0xfc) >> 2
    let shadowG = (rgbColor[1] & 0xfc) >> 2
    let shadowB = (rgbColor[2] & 0xfc) >> 2

    for (let y = 0; y < rawCanvas.height; y++) {
        for (let x = 0; x < rawCanvas.width; x++) {
            let pos = y * rawCanvas.width + x
            let idx = pos * 4

            if (isGlyphPixel[pos] === 1) {
                if (x > characterEnd) characterEnd = x
                if (x < characterStart) characterStart = x
                outPixels[idx] = rgbColor[0]
                outPixels[idx + 1] = rgbColor[1]
                outPixels[idx + 2] = rgbColor[2]
                outPixels[idx + 3] = 255
            } else if (renderParams.shadow && y > 0 && x > 0 && isGlyphPixel[(y - 1) * rawCanvas.width + (x - 1)] === 1) {
                outPixels[idx] = shadowR
                outPixels[idx + 1] = shadowG
                outPixels[idx + 2] = shadowB
                outPixels[idx + 3] = 255
            }
        }
    }
    rawCtx.putImageData(outData, 0, 0)

    let characterPara = { 
        width: characterEnd - characterStart, 
        scaleRatio: Math.ceil(16 / characterSize.width), 
        ascent: characterSize.ascent 
    }

    let finalCanvas = document.createElement('canvas')
    finalCanvas.width = rawCanvas.width
    finalCanvas.height = rawCanvas.height
    let finalCtx = finalCanvas.getContext('2d')
    finalCtx.imageSmoothingEnabled = false

    if (Math.abs(characterStart) < 999) {
        finalCtx.drawImage(rawCanvas, characterStart, 0, rawCanvas.width - characterStart, rawCanvas.height, 0, 0, rawCanvas.width - characterStart, rawCanvas.height)
        if (characterStart > 1) characterPara.width -= 1
    } else {
        finalCtx.drawImage(rawCanvas, 0, 0)
    }

    if (characterSize.unicode) characterPara.width += 3
    else characterPara.width += 2

    let result = { canvas: finalCanvas, characterPara }
    glyphCache.set(cacheKey, result)
    return result
}