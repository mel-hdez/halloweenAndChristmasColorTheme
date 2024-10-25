import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Función para obtener el mes actual
function getCurrentMonth() {
    const date = new Date();
    return date.getMonth();
}

// Función que genera un efecto de lluvia de íconos de forma secuencial
function rainIcons(editor: vscode.TextEditor, icon: string) {
    const text = editor.document.getText();
    const positions: vscode.DecorationOptions[] = [];
    
    // Generamos un conjunto de posiciones aleatorias donde caerán los íconos
    for (let i = 0; i < 100; i++) {
        const position = editor.document.positionAt(Math.floor(Math.random() * text.length));
        positions.push({
            range: new vscode.Range(position, position),
            renderOptions: {
                before: {
                    contentText: icon,
                    color: 'rgba(255, 255, 255, 0.8)', // Ajusta el color aquí
                    fontWeight: 'bold',
                }
            }
        });
    }

    // Decoración tipo (sin opciones especiales)
    const decorationType = vscode.window.createTextEditorDecorationType({});

    // Función para mostrar los íconos secuencialmente
    let currentPosition = 0;
    function showNextIcon() {
        if (currentPosition >= positions.length) {
            editor.setDecorations(decorationType, []);  // Limpiamos decoraciones al final
            return;
        }
        
        // Mostramos el ícono en la posición actual
        editor.setDecorations(decorationType, [positions[currentPosition]]);
        currentPosition++;

        // Hacemos que el siguiente ícono caiga después de un corto intervalo
        setTimeout(showNextIcon, 100);  // Ajusta la velocidad de caída aquí
    }

    showNextIcon();  // Inicia la secuencia de caída
}

// Función para aplicar el efecto de lluvia dependiendo del mes
function applyRainEffect(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {return;}

    const currentMonth = getCurrentMonth();

    if (currentMonth === 9) { // Octubre (Halloween)
        vscode.window.showInformationMessage('🎃 Lluvia de íconos de Halloween');
        rainIcons(editor, '🎃');
    } else if (currentMonth === 10 || currentMonth === 11) { // Diciembre
        vscode.window.showInformationMessage('🎄 Lluvia de íconos de Navidad');
        rainIcons(editor, '🎄');
    }
}


function loadColorsFromFile(context: vscode.ExtensionContext, fileName: string) {
    try {
        const filePath = path.join(context.extensionPath, 'themes', fileName);  
        console.log(`Cargando archivo de colores desde: ${filePath}`);
        const colors = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return colors;
    } catch (error) {
        vscode.window.showErrorMessage(`Error al cargar el archivo: ${fileName}. Verifica la ruta o el formato.`);
        console.error(`Error cargando archivo: ${fileName}`, error);
        return null;
    }
}

function mergeThemeColors(defaultColors: any, customColors: any) {
    if (!customColors) {
        console.log("Usando colores predeterminados.");
        return defaultColors;
    }
    const mergedColors = {
        colors: { ...defaultColors.colors }, 
        tokenColors: customColors.tokenColors 
    };
    
    console.log("Colores combinados:", mergedColors);
    return mergedColors;
}

function applyThemeColorsForMonth(context: vscode.ExtensionContext) {
    const currentMonth = getCurrentMonth();

    // Cargar los colores por defecto
    const defaultColors = loadColorsFromFile(context, '../themes/default-colors.json');
    let customColors;

    if (currentMonth === 9) {  // Octubre (Halloween)
        customColors = loadColorsFromFile(context, '../themes/halloween-colors.json'); 
        vscode.window.showInformationMessage('Muajaja, this is halloween, halloween 🎃');
    } else if (currentMonth === 10 || currentMonth === 11) { 
        customColors = loadColorsFromFile(context, '../themes/holiday-colors.json');  
        vscode.window.showInformationMessage('Hohoho, Merry Christmas🎄');
    } else {
        vscode.window.showInformationMessage('Pretty Colors 🌷');
    }

    // Fusionar los colores: mantén los "colors" y sobrescribe solo "tokenColors"
    const finalColors = mergeThemeColors(defaultColors, customColors);

    try {
        // Aplicar los colores de fondo (colors)
        const colorSettings = JSON.parse(JSON.stringify(finalColors.colors)); 
        vscode.workspace.getConfiguration('workbench').update('colorCustomizations', { colors: colorSettings }, vscode.ConfigurationTarget.Global)
            .then(() => {
                console.log('Colores de fondo aplicados correctamente');
            }, (error) => {
                vscode.window.showErrorMessage('Error al aplicar los colores de fondo al editor.');
                console.error('Error al aplicar los colores:', error);
            });

        const tokenColorSettings = customColors ? customColors.tokenColors : defaultColors.tokenColors;
        vscode.workspace.getConfiguration('editor').update('tokenColorCustomizations', { textMateRules: tokenColorSettings }, vscode.ConfigurationTarget.Global)
            .then(() => {
                console.log('Colores de token aplicados correctamente');
            }, (error) => {
                vscode.window.showErrorMessage('Error al aplicar los colores de token al editor.');
                console.error('Error al aplicar los colores de token:', error);
            });
    } catch (error) {
        vscode.window.showErrorMessage('Error al aplicar los colores. Puede haber una estructura circular.');
        console.error('Error al aplicar los colores:', error);
    }
}

export function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('editor');
    config.update('fontFamily', 'Space Mono', vscode.ConfigurationTarget.Global)
        .then(() => {
            vscode.window.showInformationMessage('Tipografía cambiada a Space Mono');
        }, (error) => {
            vscode.window.showErrorMessage('Error al cambiar la tipografía: ' + error);
        });

    applyThemeColorsForMonth(context);

    applyRainEffect(context);

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            applyRainEffect(context);
            applyDecorations(editor);
        }
    });

    if (vscode.window.activeTextEditor) {
        applyDecorations(vscode.window.activeTextEditor);
    }

}

function applyDecorations(editor: vscode.TextEditor) {
    const regEx = /\/\/.*/g;  
    const text = editor.document.getText();
    const decorations: vscode.DecorationOptions[] = [];
    let match;

    while ((match = regEx.exec(text)) !== null) {
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + match[0].length);
        const decoration = { range: new vscode.Range(startPos, endPos) };
        decorations.push(decoration);
    }

    const decorationType = getDecorationForMonth();
    if (decorationType) {
        editor.setDecorations(decorationType, decorations);
    }
}

// Función para determinar la decoración según el mes
function getDecorationForMonth() {
    const currentMonth = getCurrentMonth();
    if (currentMonth === 9) {  // Octubre
        return vscode.window.createTextEditorDecorationType({
            before: { contentText: '🎃 ', color: '#FFA500' }  
        });
    } else if (currentMonth === 10 || currentMonth === 11) {  
        return vscode.window.createTextEditorDecorationType({
            before: { contentText: '🎄 ', color: '#FF0000' }
        });
    }
    return null;
}

export function deactivate() {}