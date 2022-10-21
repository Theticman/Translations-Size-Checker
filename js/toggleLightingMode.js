let root = document.documentElement;
var mode = 0




function toggleLightingMode() {
    mode++
    if (mode > 1) mode = 0
    console.log(mode)
    switch (mode) {
        case 0:
            root.style.setProperty('--background', "#121212");
            root.style.setProperty('--surface', "#1E1E1E");
            root.style.setProperty('--primary', "#BB86FC");
            root.style.setProperty('--secondary', "#03DAC6");
            root.style.setProperty('--on_background', "#D5D5D5");
            root.style.setProperty('--on_surface', "#DCDCDC");
            root.style.setProperty('--on_primary', "#120D18");
            root.style.setProperty('--on_secondary', "#000A09");
            break

        case 1:
            root.style.setProperty('--background', "#FFFFFF");
            root.style.setProperty('--surface', "#DDDDDD");
            root.style.setProperty('--primary', "#03DAC6");
            root.style.setProperty('--secondary', "#BB86FC");
            root.style.setProperty('--on_background', "#000000");
            root.style.setProperty('--on_surface', "#000000");
            root.style.setProperty('--on_primary', "#120D18");
            root.style.setProperty('--on_secondary', "#000A09");
            break
    }
}