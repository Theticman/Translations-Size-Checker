// Load characters tables
let defaultCharacterTable
let request1 = new XMLHttpRequest()
request1.open('GET', '../assets/font/default.json')
request1.responseType = 'text'
request1.send()
request1.onload = function() {
    defaultCharacterTable = JSON.parse(request1.response)
    console.log("Loaded succesfully",defaultCharacterTable)
}

let altCharacterTable
let request2 = new XMLHttpRequest()
request2.open('GET', '../assets/font/alt.json')
request2.responseType = 'text'
request2.send()
request2.onload = function() {
    altCharacterTable = JSON.parse(request2.response)
    console.log("Loaded succesfully",altCharacterTable)
}

async function getImageFromText(text,characterType) {
    let characters = []
    let textWidth = 0
    for (let character of text) {
        let {file, row, col, characterSize} = getCharacterPosition(character,characterType)
        let {canvas, characterWidth} = await getCharacterImage(file,row,col,characterSize)
        characters.push({canvas, characterWidth})
        textWidth += characterWidth
    }
    return {characters, textWidth}
}

function getCharacterPosition(character,characterType) {
    let unicodeNumber = character.charCodeAt(0).toString(16).padStart(4,"0")
    let row,col,characterTable
    
    if (characterType == 1) return getCharacterPositionUnicode(unicodeNumber)
    else if (characterType == 2) characterTable = altCharacterTable
    else characterTable = defaultCharacterTable

    for (provider of characterTable.providers) {
        row=-1
        for (let line of provider.chars) {
            col=-1
            row++
            for (character of line) {
                col++
                if (character.charCodeAt(0).toString(16).padStart(4,"0") == unicodeNumber) {
                    let file = provider.file.replace(/minecraft:/, "../assets/")
                    let characterSize = 8
                    return {file,row,col,characterSize}
                }
            }
        }
    }
    return getCharacterPositionUnicode(unicodeNumber)
}

function getCharacterPositionUnicode(unicodeNumber) {
    let file = `../assets/font/unicode_page_${unicodeNumber.substr(0, 2)}.png`
    let row = parseInt(unicodeNumber[2], 16)
    let col = parseInt(unicodeNumber[3], 16)
    let characterSize = 16
    return {file,row,col,characterSize}
}

async function getCharacterImage(file,row,col,characterSize) {
    var canvas = document.createElement("canvas");
    canvas.width = characterSize+1
    canvas.height = characterSize+1
    var ctx = canvas.getContext('2d')

    let img = new Image()
    await new Promise((resolve) => {
        img.onload = () => resolve()
        img.src = file
    })
    ctx.drawImage(img, col*characterSize, row*characterSize, characterSize, characterSize, 0, 0, characterSize, characterSize)

    let characterWidth = -1000
    for (let i = 0; i<characterSize; i++) {
        for (let j = 0; j<characterSize; j++) {
            if (ctx.getImageData(i,j,1,1).data[0] == 255) {
                if (i > characterWidth) characterWidth = i
                if (ctx.getImageData(i+1,j+1,1,1).data[3] == 0) {
                    let imageData = ctx.getImageData(i,j,1,1)
                    imageData.data[0] = 62
                    imageData.data[1] = 62
                    imageData.data[2] = 62
                    imageData.data[3] = 255
                    ctx.putImageData(imageData,i+1,j+1)
                }
            }                
        }
    }

    ctx.drawImage(img, col*characterSize, row*characterSize, characterSize, characterSize, 0, 0, characterSize, characterSize)
    
    if (characterWidth == -1000) characterWidth = 3
    else characterWidth++

    return {canvas, characterWidth}

}